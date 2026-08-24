import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Trash2, RefreshCw, CheckSquare, Square, Grid } from 'lucide-react';
import { useStore } from '../store/useStore';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export function MyPublicationsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useStore();
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && user) {
      loadPublications();
    }
  }, [isOpen, user]);

  const loadPublications = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "published"), where("userId", "==", user?.uid));
      const snapshot = await getDocs(q);
      const pubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client side since we might not have composite index
      pubs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPublications(pubs);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "published");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (selectedIds.size === publications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(publications.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} publicação(ões)?`)) return;

    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "published", id));
      }
      setSelectedIds(new Set());
      await loadPublications();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "published");
    }
  };

  const handleRepostSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deseja repostar ${selectedIds.size} publicação(ões)? Elas voltarão para o topo da galeria.`)) return;

    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, "published", id), {
          createdAt: serverTimestamp()
        });
      }
      setSelectedIds(new Set());
      await loadPublications();
      alert("Publicações repostadas com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "published");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Grid className="text-indigo-400" size={20} />
              Minhas Publicações
            </h3>
            <p className="text-xs text-zinc-400">Gerencie suas artes publicadas na galeria pública</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              {selectedIds.size > 0 && selectedIds.size === publications.length ? (
                <CheckSquare size={16} className="text-indigo-400" />
              ) : (
                <Square size={16} />
              )}
              {selectedIds.size > 0 && selectedIds.size === publications.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </button>
            <span className="text-[10px] text-zinc-500 font-medium">
              {selectedIds.size} selecionado(s) de {publications.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRepostSelected}
              disabled={selectedIds.size === 0}
              className="bg-indigo-600 disabled:bg-indigo-900/50 disabled:text-indigo-300/50 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <RefreshCw size={14} /> Repostar
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="bg-red-950/40 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 border border-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : publications.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {publications.map(pub => {
                const isSelected = selectedIds.has(pub.id);
                return (
                  <div
                    key={pub.id}
                    onClick={() => toggleSelect(pub.id)}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-indigo-500' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="aspect-square bg-zinc-950 flex items-center justify-center p-2">
                      {pub.thumbnail ? (
                        <img
                          src={pub.thumbnail}
                          alt={pub.title}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon size={32} className="text-zinc-800" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
                      <div className="bg-black/60 rounded p-1">
                        {isSelected ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} className="text-white" />}
                      </div>
                    </div>
                    <div className="bg-[#1e1e1e] p-2 border-t border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-200 truncate">{pub.title}</p>
                      <p className="text-[9px] text-zinc-500 truncate">
                        {pub.createdAt ? new Date(pub.createdAt.seconds * 1000).toLocaleDateString() : 'Desconhecido'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <ImageIcon size={48} className="opacity-20" />
              <p className="text-sm font-medium">Você ainda não publicou nenhuma arte.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
