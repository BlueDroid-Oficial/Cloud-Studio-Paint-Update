import React, { useState } from 'react';
import { X, Upload, Tag, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export function PublishModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishType, setPublishType] = useState<'artwork' | 'material' | 'animation'>('artwork');
  const [loading, setLoading] = useState(false);
  const { user, layers, width, height, canvasBackgroundColor, fps, _exportFrames } = useStore();
  
  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!user) {
      alert("Você precisa estar logado para publicar.");
      return;
    }
    if (!title.trim()) {
      alert("Por favor, adicione um título.");
      return;
    }

    setLoading(true);
    try {
      let thumbnail = '';
      let animationData = '';

      if (publishType === 'animation') {
        // Generate thumbnail from first frame or merged layers
        const frames = await _exportFrames();
        if (frames.length > 0) {
          thumbnail = frames[0];
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        const stream = canvas.captureStream(fps);
        
        let mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
        
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 500000 });
        const chunks: Blob[] = [];
        
        const recordingPromise = new Promise<void>((resolve, reject) => {
          recorder.ondataavailable = (e) => chunks.push(e.data);
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const reader = new FileReader();
            reader.onloadend = () => {
              animationData = reader.result as string;
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          };
        });

        recorder.start();
        
        for (const frame of frames) {
          await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0);
              resolve(null);
            };
            img.src = frame;
          });
          await new Promise(r => setTimeout(r, 1000 / fps));
        }
        
        recorder.stop();
        await recordingPromise;

      } else {
        // Generate static thumbnail from layers (merged)
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        
        // Fill with background color to avoid transparency issues
        ctx.fillStyle = canvasBackgroundColor || "#ffffff";
        ctx.fillRect(0, 0, width, height);
        
        const folderCanvases: Record<string, HTMLCanvasElement> = {};

        const renderLayerGroup = (groupLayers: any[], targetCtx: CanvasRenderingContext2D) => {
          const reversedGroup = [...groupLayers].reverse();
          let idx = 0;
          while (idx < reversedGroup.length) {
            const layer = reversedGroup[idx];
            if (!layer.visible) {
              idx++;
              continue;
            }

            let layerSrcCanvas: HTMLCanvasElement | null = null;
            if (layer.type === "folder") {
              layerSrcCanvas = folderCanvases[layer.id] || null;
            } else {
              layerSrcCanvas = layer.canvas;
            }

            if (!layerSrcCanvas) {
              idx++;
              continue;
            }

            const groupTempCanvas = document.createElement("canvas");
            groupTempCanvas.width = width;
            groupTempCanvas.height = height;
            const groupTempCtx = groupTempCanvas.getContext("2d")!;
            groupTempCtx.globalCompositeOperation = "source-over";
            groupTempCtx.globalAlpha = layer.opacity / 100;
            groupTempCtx.drawImage(layerSrcCanvas, 0, 0);

            targetCtx.globalAlpha = 1;
            targetCtx.globalCompositeOperation = layer.blendMode || "source-over";
            targetCtx.drawImage(groupTempCanvas, 0, 0);

            const baseCanvas = layerSrcCanvas;
            let j = idx + 1;
            while (j < reversedGroup.length && reversedGroup[j].clippingMask) {
              const clipLayer = reversedGroup[j];
              if (clipLayer.visible && clipLayer.canvas) {
                const clipTemp = document.createElement("canvas");
                clipTemp.width = width;
                clipTemp.height = height;
                const clipTempCtx = clipTemp.getContext("2d")!;

                clipTempCtx.globalCompositeOperation = "source-over";
                clipTempCtx.globalAlpha = clipLayer.opacity / 100;
                clipTempCtx.drawImage(clipLayer.canvas, 0, 0);

                clipTempCtx.globalCompositeOperation = "destination-in";
                clipTempCtx.drawImage(baseCanvas, 0, 0);

                targetCtx.globalAlpha = 1;
                targetCtx.globalCompositeOperation = clipLayer.blendMode || "source-over";
                targetCtx.drawImage(clipTemp, 0, 0);
              }
              j++;
            }
            idx = j;
          }
        };

        // 1. Pre-render Folder canvases
        const folders = layers.filter((l) => l.type === "folder");
        folders.forEach((folder) => {
          if (folder.visible) {
            const fCanvas = document.createElement("canvas");
            fCanvas.width = width;
            fCanvas.height = height;
            const fCtx = fCanvas.getContext("2d")!;
            
            const childLayers = layers.filter((l) => l.folderId === folder.id && l.type !== "folder");
            renderLayerGroup(childLayers, fCtx);
            folderCanvases[folder.id] = fCanvas;
          }
        });

        // 2. Render Top-level
        const topLevelLayers = layers.filter((l) => !l.folderId || !layers.some((parent) => parent.id === l.folderId));
        renderLayerGroup(topLevelLayers, ctx);

        thumbnail = canvas.toDataURL('image/webp', 0.5);
      }

      const isArtwork = publishType === 'artwork';
      const isAnimation = publishType === 'animation';
      const publishPayload: any = {
        userId: user.uid,
        userDisplayName: user.displayName || 'Anônimo',
        title,
        description: description || '',
        thumbnail,
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: [],
        reports: [],
        views: 0,
        createdAt: serverTimestamp(),
      };
      
      if (isAnimation) {
        publishPayload.animationData = animationData;
        publishPayload.isAnimation = true;
      }
      
      if (!isArtwork && !isAnimation) {
        publishPayload.downloads = 0;
      }
      if (user.photoURL) {
        publishPayload.userPhotoURL = user.photoURL;
      }

      const collectionName = publishType === 'material' ? 'published_materials' : 'published';
      await addDoc(collection(db, collectionName), publishPayload);

      alert(publishType === 'material' ? "Material compartilhado com sucesso!" : "Publicado com sucesso na galeria!");
      onClose();
    } catch (error) {
      console.error("Erro ao publicar:", error);
      handleFirestoreError(error, OperationType.CREATE, publishType === 'material' ? 'published_materials' : 'published');
      alert("Ocorreu um erro ao publicar sua arte/animação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#2d2d2d] w-full max-w-md rounded-xl p-6 space-y-4 shadow-2xl border border-zinc-700/50">
        <div className="flex justify-between items-center text-zinc-100">
           <h2 className="text-lg font-bold flex items-center gap-2"><Upload size={20}/> Publicar arte</h2>
           <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors cursor-pointer"><X size={20}/></button>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tipo de Publicação</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPublishType('artwork')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${publishType === 'artwork' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                🖼️ Obra
              </button>
              <button
                type="button"
                onClick={() => setPublishType('animation')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${publishType === 'animation' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                🎬 Animação
              </button>
              <button
                type="button"
                onClick={() => setPublishType('material')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${publishType === 'material' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                📦 Material
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Título</label>
            <input 
              type="text" 
              placeholder={publishType === 'artwork' ? "Ex: Minha Obra-Prima" : "Ex: Textura Grunge de Papel"}
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full bg-[#1a1a1a] rounded-lg p-2.5 text-sm border border-zinc-800 focus:border-indigo-600 focus:outline-none text-zinc-100 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Descrição</label>
            <textarea 
              placeholder="Conte-nos sobre sua arte..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full bg-[#1a1a1a] rounded-lg p-2.5 text-sm border border-zinc-800 focus:border-indigo-600 focus:outline-none h-24 resize-none text-zinc-100 transition-colors" 
            />
          </div>
        </div>

        <button 
          onClick={handlePublish}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {loading ? 'Publicando...' : 'Publicar Agora'}
        </button>
      </div>
    </div>
  );
}
