import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, doc, updateDoc, deleteField, getDoc, setDoc } from 'firebase/firestore';
import { MessageSquare, Send, X, MessageCircle, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { twMerge } from 'tailwind-merge';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: any;
}

interface VoiceMember {
  uid: string;
  name: string;
  joined: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  lastSeen: number;
}

export function CollabChat() {
  const { user, activeCollaborationId } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Position coordinates state for custom pointer-based dragging
  const [position, setPosition] = useState({ 
    y: typeof window !== "undefined" ? window.innerHeight - 520 : 400,
    x: typeof window !== "undefined" ? window.innerWidth - 340 : 600
  });
  
  const dragRef = useRef({ 
    isDragging: false, 
    startX: 0, 
    startY: 0, 
    startPos: { x: 0, y: 0 },
    hasMoved: false
  });

  // Voice Chat States
  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0); // 0 to 100 representing raw volume level
  const [voiceMembers, setVoiceMembers] = useState<Record<string, VoiceMember>>({});
  const activeVoiceMembers = (Object.values(voiceMembers) as VoiceMember[]).filter(m => m && m.joined);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Handle pointer down (touch or mouse press)
  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...position },
      hasMoved: false
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Handle pointer move (touch swipe or mouse drag)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.hasMoved = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 340, dragRef.current.startPos.x + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 520, dragRef.current.startPos.y + dy));
    
    setPosition({ x: newX, y: newY });
  };

  // Handle pointer up (touch release or mouse release)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const hasMoved = dragRef.current.hasMoved;
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Toggle only if it was a distinct tap (very little movement)
    if (!hasMoved) {
      setIsOpen(!isOpen);
    }
  };

  // Update voice state in Firebase Document
  const updateVoiceStateInFirebase = async (joined: boolean, muted: boolean, speaking: boolean) => {
    if (!activeCollaborationId || !user) return;
    try {
      const collabDocRef = doc(db, "collaborations", activeCollaborationId);
      if (joined) {
        await updateDoc(collabDocRef, {
          [`voiceStates.${user.uid}`]: {
            uid: user.uid,
            name: user.displayName || "Colaborador",
            joined: true,
            isMuted: muted,
            isSpeaking: speaking,
            lastSeen: Date.now()
          }
        });
      } else {
        await updateDoc(collabDocRef, {
          [`voiceStates.${user.uid}`]: deleteField()
        });
      }
    } catch (e) {
      console.error("Erro ao atualizar estado de voz no Firestore:", e);
    }
  };

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!activeCollaborationId || !user) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    const chatCollectionRef = collection(db, `collaborations/${activeCollaborationId}/chat_messages`);
    const q = query(chatCollectionRef, orderBy('createdAt', 'asc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          createdAt: data.createdAt,
        });
      });

      setMessages(msgs);

      // Manage unread message badge count
      if (!isOpen && msgs.length > 0) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => unsubscribe();
  }, [activeCollaborationId, user, isOpen]);

  // Subscribe to real-time Collaboration metadata (for live Voice States!)
  useEffect(() => {
    if (!activeCollaborationId || !user) {
      setVoiceMembers({});
      return;
    }

    const collabDocRef = doc(db, "collaborations", activeCollaborationId);
    const unsubscribe = onSnapshot(collabDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setVoiceMembers(data.voiceStates || {});
      }
    }, (err) => {
      console.error("Erro ao sincronizar estados de voz do canal:", err);
    });

    return () => {
      unsubscribe();
    };
  }, [activeCollaborationId, user]);

  // Clean up voice connection on unmount or collaboration leave
  useEffect(() => {
    return () => {
      if (inVoice) {
        stopAudio();
        updateVoiceStateInFirebase(false, false, false);
      }
    };
  }, [inVoice, activeCollaborationId]);

  // WebRTC PeerConnection Management
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (!inVoice || !user || !activeCollaborationId) {
      // Clean up all peer connections if we leave voice
      Object.keys(pcsRef.current).forEach(peerUid => {
        try {
          pcsRef.current[peerUid].close();
        } catch (e) {}
        delete pcsRef.current[peerUid];
      });
      Object.keys(audioElementsRef.current).forEach(peerUid => {
        try {
          audioElementsRef.current[peerUid].pause();
          audioElementsRef.current[peerUid].remove();
        } catch (e) {}
        delete audioElementsRef.current[peerUid];
      });
      return;
    }

    // Find other members who are currently in voice
    const peers = activeVoiceMembers.filter(m => m.uid !== user.uid);

    peers.forEach(async (peer) => {
      const peerUid = peer.uid;
      if (pcsRef.current[peerUid]) return; // Already connecting/connected

      console.log("Iniciando WebRTC com parceiro de voz:", peerUid);

      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        pcsRef.current[peerUid] = pc;

        // Add local stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, streamRef.current!);
          });
        }

        // Handle incoming remote audio stream
        pc.ontrack = (event) => {
          console.log("Recebida faixa de áudio remota do peer:", peerUid);
          const [remoteStream] = event.streams;
          if (remoteStream) {
            let audioEl = audioElementsRef.current[peerUid];
            if (!audioEl) {
              audioEl = document.createElement('audio');
              audioEl.autoplay = true;
              audioEl.playsInline = true;
              audioElementsRef.current[peerUid] = audioEl;
              document.body.appendChild(audioEl);
            }
            audioEl.srcObject = remoteStream;
            audioEl.play().catch(e => console.error("Erro ao reproduzir áudio do peer:", e));
          }
        };

        // Handle signaling channel
        const isAlice = user.uid < peerUid;
        const channelId = isAlice ? `${user.uid}_${peerUid}` : `${peerUid}_${user.uid}`;
        const signalingDocRef = doc(db, `collaborations/${activeCollaborationId}/webrtc_signaling`, channelId);

        // ICE candidates buffering/sending
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            const candJson = JSON.stringify(event.candidate.toJSON());
            try {
              const snap = await getDoc(signalingDocRef);
              let currentData = snap.exists() ? snap.data() : {};
              const key = isAlice ? 'candidatesAlice' : 'candidatesBob';
              const existingList = currentData[key] || [];
              if (!existingList.includes(candJson)) {
                await setDoc(signalingDocRef, {
                  [key]: [...existingList, candJson]
                }, { merge: true });
              }
            } catch (e) {
              console.error("Erro ao salvar candidato ICE:", e);
            }
          }
        };

        if (isAlice) {
          // Alice creates the offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          await setDoc(signalingDocRef, {
            offer: JSON.stringify(offer),
            candidatesAlice: []
          }, { merge: true });

          // Listen for Bob's answer and ICE candidates
          const unsub = onSnapshot(signalingDocRef, async (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (data.answer && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
            }
            if (data.candidatesBob && data.candidatesBob.length > 0) {
              for (const candStr of data.candidatesBob) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
                } catch (e) {
                  console.error("Erro ao adicionar candidato de Bob:", e);
                }
              }
            }
          });

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
              unsub();
            }
          };
        } else {
          // Bob listens for Alice's offer
          const unsub = onSnapshot(signalingDocRef, async (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (data.offer && pc.signalingState === 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await setDoc(signalingDocRef, {
                answer: JSON.stringify(answer),
                candidatesBob: []
              }, { merge: true });
            }
            if (data.candidatesAlice && data.candidatesAlice.length > 0) {
              for (const candStr of data.candidatesAlice) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
                } catch (e) {
                  console.error("Erro ao adicionar candidato de Alice:", e);
                }
              }
            }
          });

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
              unsub();
            }
          };
        }
      } catch (e) {
        console.error("Erro ao configurar conexão WebRTC:", e);
      }
    });

    // Handle peer leaving
    Object.keys(pcsRef.current).forEach(peerUid => {
      const isStillInVoice = peers.some(p => p.uid === peerUid);
      if (!isStillInVoice) {
        try {
          pcsRef.current[peerUid].close();
        } catch (e) {}
        delete pcsRef.current[peerUid];
        if (audioElementsRef.current[peerUid]) {
          try {
            audioElementsRef.current[peerUid].pause();
            audioElementsRef.current[peerUid].remove();
          } catch (e) {}
          delete audioElementsRef.current[peerUid];
        }
      }
    });

  }, [inVoice, activeVoiceMembers, user, activeCollaborationId]);

  // Audio activation controller
  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingDebounce = 0;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const volPercent = Math.min(100, Math.round((avg / 128) * 100));
        setVolume(volPercent);

        const speaking = volPercent > 12; // Speak threshold
        if (speaking) {
          speakingDebounce = 15; // Hold state for ~250ms to avoid flickering
        } else if (speakingDebounce > 0) {
          speakingDebounce--;
        }

        const isCurrentlySpeaking = speaking || speakingDebounce > 0;

        setIsSpeaking((prev) => {
          if (prev !== isCurrentlySpeaking) {
            updateVoiceStateInFirebase(true, isMuted, isCurrentlySpeaking);
          }
          return isCurrentlySpeaking;
        });

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
      setInVoice(true);
      setIsMuted(false);
      updateVoiceStateInFirebase(true, false, false);
    } catch (err) {
      console.error("Erro ao obter acesso ao microfone:", err);
      alert("Permissão de microfone negada ou indisponível.");
      setInVoice(false);
    }
  };

  const stopAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setVolume(0);
    setIsSpeaking(false);
  };

  const toggleMute = () => {
    if (!streamRef.current) return;
    const newMuteState = !isMuted;
    streamRef.current.getAudioTracks().forEach(t => t.enabled = !newMuteState);
    setIsMuted(newMuteState);
    updateVoiceStateInFirebase(true, newMuteState, false);
    if (newMuteState) {
      setVolume(0);
    }
  };

  const handleLeaveVoice = () => {
    stopAudio();
    setInVoice(false);
    updateVoiceStateInFirebase(false, false, false);
  };

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!activeCollaborationId || !user) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const chatCollectionRef = collection(db, `collaborations/${activeCollaborationId}/chat_messages`);
      await addDoc(chatCollectionRef, {
        senderId: user.uid,
        senderName: user.displayName || "Colaborador",
        content: inputText.trim(),
        createdAt: serverTimestamp(),
      });
      setInputText('');
    } catch (e) {
      console.error("Error sending chat message:", e);
    }
  };

  // Filter voice members currently active
  // Declared at the top to prevent hoisting errors

  return (
    <div 
      className="fixed z-[1000] flex flex-col items-end pointer-events-none select-none"
      style={{
        left: isOpen ? position.x : position.x,
        top: isOpen ? position.y : position.y,
        width: isOpen ? 320 : 48,
        height: isOpen ? 480 : 48,
      }}
    >
      {/* Floating Chat Widget Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 h-[420px] bg-[#121214]/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden mb-3 pointer-events-auto"
          >
            {/* Header */}
            <div className="h-12 bg-[#18181b] border-b border-zinc-800/80 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-[#4c4cff] animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-100">Colaboração Ao Vivo</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Voice Chat Control Bar */}
            <div className="bg-[#1a1a1e] border-b border-zinc-800/60 p-2.5 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={twMerge(
                      "w-2 h-2 rounded-full",
                      inVoice ? "bg-emerald-500" : "bg-zinc-600"
                    )} />
                    {inVoice && isSpeaking && (
                      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
                    {inVoice ? "Conectado à Voz" : "Chat de Voz Desconectado"}
                  </span>
                </div>

                {!inVoice ? (
                  <button
                    onClick={startAudio}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Mic size={10} /> Conectar
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleMute}
                      className={twMerge(
                        "p-1.5 rounded transition-colors cursor-pointer",
                        isMuted 
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      )}
                      title={isMuted ? "Desmutar" : "Mutar"}
                    >
                      {isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                    </button>
                    <button
                      onClick={handleLeaveVoice}
                      className="p-1.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors cursor-pointer"
                      title="Sair do Canal"
                    >
                      <PhoneOff size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Live Wave and Speakers List */}
              {inVoice && (
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2 flex flex-col gap-2">
                  {/* CSS Live Waveform Meter */}
                  <div className="h-5 flex items-center justify-center gap-0.5">
                    {[...Array(15)].map((_, i) => {
                      // Generate height factor based on volume state
                      const randomFactor = Math.sin(i * 0.5) * 0.4 + 0.6;
                      const dynamicHeight = isMuted ? 2 : Math.max(2, Math.round((volume * randomFactor * 0.18)));
                      return (
                        <div 
                          key={i} 
                          className={twMerge(
                            "w-1 rounded-full transition-all duration-75",
                            isSpeaking ? "bg-emerald-400" : "bg-zinc-700"
                          )}
                          style={{ height: `${dynamicHeight}px` }}
                        />
                      );
                    })}
                  </div>

                  {/* Active Speaker Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {activeVoiceMembers.map((m) => (
                      <div 
                        key={m.uid}
                        className={twMerge(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                          m.isSpeaking && !m.isMuted
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800"
                        )}
                      >
                        {m.isMuted ? (
                          <VolumeX size={8} className="text-zinc-500" />
                        ) : (
                          <Volume2 size={8} className={twMerge(m.isSpeaking && "animate-bounce text-emerald-400")} />
                        )}
                        <span className="truncate max-w-[80px]">{m.name}</span>
                        {m.isSpeaking && !m.isMuted && (
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <MessageSquare size={24} className="text-zinc-600 mb-2" />
                  <p className="text-[10px] text-zinc-500 font-medium">Nenhuma mensagem enviada. Comece a conversar com seu parceiro de desenho!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={twMerge(
                        "flex flex-col max-w-[80%] rounded-2xl px-3.5 py-2 text-xs",
                        isMe 
                          ? "bg-[#4c4cff] text-white ml-auto rounded-tr-none" 
                          : "bg-zinc-800 text-zinc-100 mr-auto rounded-tl-none"
                      )}
                    >
                      {!isMe && (
                        <span className="text-[9px] font-black text-[#8a8aff] mb-1 truncate">
                          {msg.senderName}
                        </span>
                      )}
                      <p className="leading-relaxed break-words font-medium">{msg.content}</p>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#0a0a0c] border-t border-zinc-800 flex gap-2 shrink-0">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escreva uma mensagem..."
                className="flex-1 bg-[#121214] border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#4c4cff] transition-all"
              />
              <button 
                type="submit"
                className="w-8 h-8 rounded-xl bg-[#4c4cff] hover:bg-[#3939e6] text-white flex items-center justify-center transition-colors shadow-lg shadow-[#4c4cff]/20 shrink-0 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Badge button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={twMerge(
          "w-12 h-12 rounded-full text-white flex items-center justify-center transition-all shadow-2xl pointer-events-auto select-none scale-100 active:scale-95 group relative border cursor-grab active:cursor-grabbing",
          inVoice && isSpeaking && !isMuted
            ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30 shadow-emerald-600/30"
            : "bg-[#4c4cff] hover:bg-[#3939e6] border-white/10 shadow-[#4c4cff]/30"
        )}
        title="Chat & Voz de Colaboração"
        style={{ touchAction: 'none' }}
      >
        {isOpen ? <X size={20} /> : (
          inVoice ? <Mic size={20} className={twMerge(isSpeaking && "animate-pulse")} /> : <MessageSquare size={20} />
        )}
        
        {/* Unread indicator */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full border border-zinc-900 animate-bounce">
            {unreadCount}
          </span>
        )}

        {/* Live Audio activity halo */}
        {inVoice && isSpeaking && !isMuted && (
          <span className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-60 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
