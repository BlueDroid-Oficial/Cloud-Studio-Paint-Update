import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  User,
  Bell,
  Gift,
  Check,
  CheckCheck,
  Mail as MailIcon,
  ArrowLeft,
  Image as ImageIcon,
  Gamepad2,
  Video,
  Trash,
  Pencil,
  CheckSquare,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  type: "text" | "system" | "gift" | "project";
  projectId?: string;
  projectName?: string;
  projectUrl?: string;
  isRead: boolean;
  createdAt: any;
  isEdited?: boolean;
}

export function MessagesModal({
  isOpen,
  onClose,
  targetUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string;
}) {
  const { user, firebaseProjects, hiddenMessages, hideMessage } = useStore();
  const [receiverMessages, setReceiverMessages] = useState<ChatMessage[]>([]);
  const [senderMessages, setSenderMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const messages = React.useMemo(() => {
    const merged = [...receiverMessages, ...senderMessages];
    return merged.filter(
      (m, i, self) => self.findIndex((x) => x.id === m.id) === i && !hiddenMessages.includes(m.id),
    );
  }, [receiverMessages, senderMessages, hiddenMessages]);

  const [contacts, setContacts] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<string>("system_bot");
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);
  const [typingContacts, setTypingContacts] = useState<Record<string, boolean>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const longPressTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const handlePressStart = (msgId: string, isMe: boolean) => {
    if (!isMe) return;
    if (longPressTimeoutRef.current[msgId]) {
      clearTimeout(longPressTimeoutRef.current[msgId]);
    }
    longPressTimeoutRef.current[msgId] = setTimeout(() => {
      const confirmDelete = window.confirm("Deseja deletar esta mensagem?");
      if (confirmDelete) {
        handleDeleteMessage(msgId);
      }
    }, 800);
  };

  const handlePressEnd = (msgId: string) => {
    if (longPressTimeoutRef.current[msgId]) {
      clearTimeout(longPressTimeoutRef.current[msgId]);
      delete longPressTimeoutRef.current[msgId];
    }
  };

  useEffect(() => {
    return () => {
      Object.values(longPressTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  // Listen to 'E' key down to delete hovered message
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingMessageId) return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      
      if (e.key.toLowerCase() === "e" && hoveredMessageId) {
        const msg = messages.find((m) => m.id === hoveredMessageId);
        if (msg && msg.senderId === user?.uid) {
          handleDeleteMessage(hoveredMessageId);
          setHoveredMessageId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hoveredMessageId, messages, user, editingMessageId]);

  const handleDeleteSelected = async () => {
    if (selectedMessageIds.length === 0) return;
    const confirmDelete = window.confirm(`Deseja realmente apagar as ${selectedMessageIds.length} mensagens selecionadas para você?`);
    if (!confirmDelete) return;
    try {
      selectedMessageIds.forEach((id) => {
        hideMessage(id);
      });
      setSelectedMessageIds([]);
      setIsMultiSelectMode(false);
    } catch (err) {
      console.error("Error hiding selected messages:", err);
    }
  };

  // Sync active contact when targetUserId prop changes
  useEffect(() => {
    if (targetUserId) {
      setActiveContactId(targetUserId);
      setShowMobileChat(true);
    } else {
      setActiveContactId("system_bot");
      setShowMobileChat(false);
    }
  }, [targetUserId, isOpen]);

  // Load all users to populate the contact list
  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          uid: doc.id,
          ...doc.data(),
        }));
        setContacts(fetched);
      },
      (err) => console.error("Error loading contacts:", err),
    );

    return () => unsubscribe();
  }, [isOpen]);

  // Fetch user's message history (real-time stream)
  useEffect(() => {
    if (!user || !isOpen) return;

    const qReceiver = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const qSender = query(
      collection(db, "messages"),
      where("senderId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribeReceiver = onSnapshot(qReceiver, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ChatMessage[];
      setReceiverMessages(msgs);
    });

    const unsubscribeSender = onSnapshot(qSender, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ChatMessage[];
      setSenderMessages(msgs);
    });

    return () => {
      unsubscribeReceiver();
      unsubscribeSender();
    };
  }, [user, isOpen]);

  // Mark unread messages from active contact as read in real-time
  useEffect(() => {
    if (!user || !activeContactId || !isOpen) return;
    const unreadFromActive = messages.filter(
      (m) =>
        m.senderId === activeContactId &&
        m.receiverId === user.uid &&
        !m.isRead,
    );
    unreadFromActive.forEach(async (msg) => {
      try {
        await updateDoc(doc(db, "messages", msg.id), { isRead: true });
      } catch (err) {
        console.error("Error auto-marking read:", err);
      }
    });
  }, [activeContactId, messages, user, isOpen]);

  // All contacts including default system bot
  const allContacts = [
    {
      id: "system_bot",
      uid: "system_bot",
      displayName: "DesenhoBot CPU",
      photoURL: "https://picsum.photos/seed/systembot/100",
      isBot: true,
    },
    ...contacts.filter((c) => c.uid !== user?.uid),
  ];

  const activeContact =
    allContacts.find((c) => c.uid === activeContactId) || allContacts[0];

  // Filter and sort messages for the active conversation
  const filteredMessages = messages
    .filter(
      (m) =>
        (m.senderId === activeContactId && m.receiverId === user?.uid) ||
        (m.senderId === user?.uid && m.receiverId === activeContactId),
    )
    .filter((m) => (filter === "all" ? true : !m.isRead))
    .sort((a, b) => {
      const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
      return timeA - timeB;
    });

  // Scroll to bottom whenever active conversation message array or typing status changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages, typingContacts]);

  // Helper function to trigger bot response immediately
  const triggerBotReply = (userMessageContent: string) => {
    if (activeContactId !== "system_bot" || !user) return;

    // Immediately show that the bot is typing
    setTypingContacts((prev) => ({ ...prev, system_bot: true }));

    // A fast, snappy delay (900ms) for realistic real-time feel
    setTimeout(async () => {
      try {
        const lowerContent = userMessageContent.toLowerCase();
        const triggers = ["gerar", "generate", "cria", "create", "imagem", "image", "desenha", "draw", "foto", "photo", "ilustra", "illustrate"];
        const isImageRequest = triggers.some(t => lowerContent.includes(t));

        let botResponse = "";
        if (isImageRequest) {
          let cleanedPrompt = userMessageContent;
          const wordsToRemove = ["gerar", "generate", "cria", "create", "imagem", "image", "desenha", "draw", "um", "uma", "de", "do", "da", "por", "favor", "please", "me", "a", "an", "the"];
          wordsToRemove.forEach(w => {
            const regex = new RegExp(`\\b${w}\\b`, "gi");
            cleanedPrompt = cleanedPrompt.replace(regex, "");
          });
          cleanedPrompt = cleanedPrompt.trim();
          if (!cleanedPrompt) {
            cleanedPrompt = "colorful abstract digital art masterpiece, high detail";
          }
          
          const encodedPrompt = encodeURIComponent(cleanedPrompt);
          const imageUrl = `https://image.pollinations.ai/p/${encodedPrompt}?width=512&height=512&nologo=true&private=true`;
          
          botResponse = `Com certeza! Aqui está a imagem que criei para você com base no pedido "${cleanedPrompt}":\n\n${imageUrl}`;
        } else {
          const replies = [
            "Olá! Eu sou o DesenhoBot. Adorei sua mensagem! Continue criando artes incríveis! 🎨",
            "Bip Bop! Como assistente oficial de desenho, estou aqui para registrar suas conquistas e enviar recompensas no Wallet! 💎",
            "Incrível! Sabia que se você batalhar na Arena de Multiplayer, você ganha pontos de Cloudy? Tente agora mesmo!",
            "Fascinante! Minhas redes neurais analisaram seu estilo e preveem que você se tornará um mestre do desenho!",
            "Bip! Lembre-se de personalizar seus atalhos de teclado clicando na engrenagem superior para desenhar muito mais rápido!",
          ];
          botResponse = replies[Math.floor(Math.random() * replies.length)];
        }

        const replyId = uuidv4();
        await setDoc(doc(db, "messages", replyId), {
          id: replyId,
          senderId: "system_bot",
          senderName: "DesenhoBot CPU",
          receiverId: user.uid,
          content: botResponse,
          type: "system",
          isRead: false,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error sending bot reply:", err);
      } finally {
        // Turn off typing indicator
        setTypingContacts((prev) => ({ ...prev, system_bot: false }));
      }
    }, 900);
  };

  const handleSendProject = async (project: any) => {
    if (!user) return;
    try {
      const id = uuidv4();
      await setDoc(doc(db, "messages", id), {
        id,
        senderId: user.uid,
        senderName: user.displayName || "Usuário",
        receiverId: activeContactId,
        content: "Olhe este projeto que eu fiz!",
        type: "project",
        projectId: project.id,
        projectName: project.name || "Sem título",
        projectUrl: project.thumbnail || "https://picsum.photos/seed/art/200",
        isRead: false,
        createdAt: serverTimestamp(),
      });
      setShowProjectPicker(false);

      if (activeContactId === "system_bot") {
        triggerBotReply("Olhe este projeto que eu fiz!");
      }
    } catch (e) {
      console.error("Error sending project:", e);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    const contentToSend = newMessage;
    setNewMessage("");

    try {
      const id = uuidv4();
      await setDoc(doc(db, "messages", id), {
        id,
        senderId: user.uid,
        senderName: user.displayName || "Usuário",
        receiverId: activeContactId,
        content: contentToSend,
        type: "text",
        isRead: false,
        createdAt: serverTimestamp(),
      });

      if (activeContactId === "system_bot") {
        triggerBotReply(contentToSend);
      }
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const getUnreadCount = (contactId: string) => {
    return messages.filter(
      (m) =>
        m.senderId === contactId && m.receiverId === user?.uid && !m.isRead,
    ).length;
  };

  const handleClearAllChats = async () => {
    if (!user) return;
    const confirmClear = window.confirm(
      "Deseja realmente limpar todas as suas conversas? Isso as ocultará da sua visualização."
    );
    if (!confirmClear) return;

    try {
      messages.forEach((msg) => hideMessage(msg.id));
    } catch (err) {
      console.error("Error clearing all conversations:", err);
    }
  };

  const handleClearActiveChat = async () => {
    if (!user || !activeContactId) return;
    const confirmClear = window.confirm(
      `Deseja limpar todas as mensagens com ${activeContact?.displayName || "este contato"}?`
    );
    if (!confirmClear) return;

    try {
      const msgsToDelete = messages.filter(
        (m) =>
          (m.senderId === user.uid && m.receiverId === activeContactId) ||
          (m.senderId === activeContactId && m.receiverId === user.uid)
      );

      msgsToDelete.forEach((msg) => hideMessage(msg.id));
    } catch (err) {
      console.error("Error clearing active conversation:", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    hideMessage(msgId);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await setDoc(
        doc(db, "messages", msgId),
        { content: editingText, isEdited: true },
        { merge: true }
      );
      setEditingMessageId(null);
      setEditingText("");
    } catch (err) {
      console.error("Error editing message:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] w-full max-w-4xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#242424] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-tight">
                Mensagens Privadas
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Contatos em Tempo Real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body: Dual Column */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Contacts Sidebar */}
          <div
            className={`${showMobileChat ? "hidden" : "flex"} md:flex flex-col w-full md:w-80 border-r border-zinc-800 bg-[#161616] shrink-0 overflow-y-auto`}
          >
            <div className="p-3 border-b border-zinc-800 bg-[#131313] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Conversas ({allContacts.length})
                </span>
                <button
                  onClick={handleClearAllChats}
                  className="p-1 hover:bg-zinc-800 rounded text-[#f43f5e] hover:text-[#f43f5e]/80 transition-colors"
                  title="Limpar Todas as Conversas (Para Mim)"
                >
                  <Trash size={12} />
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${filter === "all" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500"}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${filter === "unread" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500"}`}
                >
                  Não Lidas
                </button>
              </div>
            </div>
            <div className="divide-y divide-zinc-800/50 flex-1 overflow-y-auto">
              {allContacts.map((contact) => {
                const unread = getUnreadCount(contact.uid);
                const isActive = activeContactId === contact.uid;
                return (
                  <div
                    key={contact.uid}
                    onClick={() => {
                      setActiveContactId(contact.uid);
                      setShowMobileChat(true);
                    }}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                      isActive
                        ? "bg-indigo-600/10 border-l-4 border-indigo-500"
                        : "hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={
                          contact.photoURL ||
                          "https://picsum.photos/seed/user/100"
                        }
                        alt={contact.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-zinc-700 bg-zinc-800"
                      />
                      {contact.isBot ? (
                        <span className="absolute -bottom-1 -right-1 bg-indigo-500 text-[8px] font-black px-1 rounded text-white uppercase tracking-tighter scale-90 border border-zinc-900">
                          BOT
                        </span>
                      ) : (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#161616]"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-xs font-bold text-zinc-200 truncate">
                        {contact.displayName || "Artista"}
                      </h4>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {contact.isBot
                          ? "Assistente Inteligente"
                          : `UID: ${contact.uid.substring(0, 8)}...`}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="bg-indigo-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Conversation */}
          <div
            className={`${showMobileChat ? "flex" : "hidden"} md:flex flex-1 flex-col bg-[#121212] overflow-hidden`}
          >
            {/* Active Contact Header */}
            <div className="p-3 bg-[#181818] border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 md:hidden transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <img
                  src={
                    activeContact.photoURL ||
                    "https://picsum.photos/seed/user/100"
                  }
                  alt={activeContact.displayName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700 bg-zinc-800"
                />
                <div className="text-left">
                  <h3 className="text-xs font-black text-white">
                    {activeContact.displayName}
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
                    {activeContact.isBot
                      ? "Auto-Resposta Ativa"
                      : "Canal em Tempo Real"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearActiveChat}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-all flex items-center gap-1 text-xs font-bold"
                  title="Limpar Conversa"
                >
                  <Trash size={14} />
                  <span className="hidden sm:inline">Limpar Chat</span>
                </button>
                <button
                  onClick={() => alert("Voice chat implementation pending.")}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-1 text-xs font-bold"
                  title="Chat de Voz"
                >
                  <Video size={14} />
                  <span className="hidden sm:inline">Voz</span>
                </button>
                <button
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    setSelectedMessageIds([]);
                  }}
                  className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-all ${
                    isMultiSelectMode 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "hover:bg-zinc-800 text-indigo-400 hover:bg-indigo-500/10"
                  }`}
                  title="Multi-Seleção de Mensagens"
                >
                  <CheckSquare size={14} />
                  <span className="hidden sm:inline">Multi-Seleção</span>
                </button>
                {!activeContact.isBot && (
                  <button
                    onClick={() => {
                      useStore.getState().initiateCollaboration(activeContactId);
                      onClose();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-md shadow-indigo-600/20"
                  >
                    <User size={12} />
                    Desenhar Junto
                  </button>
                )}
              </div>
            </div>

            {/* Multi-Selection Controls Bar */}
            {isMultiSelectMode && (
              <div className="px-4 py-2 bg-[#1c1c1c] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-400">
                    {selectedMessageIds.length} selecionadas
                  </span>
                  <button
                    onClick={() => {
                      const myMsgs = filteredMessages.filter((m) => m.senderId === user?.uid).map((m) => m.id);
                      setSelectedMessageIds(myMsgs);
                    }}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-white transition-colors animate-pulse"
                  >
                    Selecionar Tudo (Minhas)
                  </button>
                  <button
                    onClick={() => setSelectedMessageIds([])}
                    className="px-2 py-1 rounded hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 transition-colors"
                  >
                    Limpar Seleção
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedMessageIds.length === 0}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-[11px] font-bold text-white transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <Trash size={12} />
                    Deletar ({selectedMessageIds.length})
                  </button>
                  <button
                    onClick={() => {
                      setIsMultiSelectMode(false);
                      setSelectedMessageIds([]);
                    }}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}

            {/* Message History Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e0e0e] flex flex-col">
              {filteredMessages.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center opacity-25 space-y-4">
                  <MailIcon className="w-12 h-12 text-zinc-400 animate-bounce" />
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Nenhuma mensagem neste canal
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isMe = msg.senderId === user?.uid;
                  const isSelected = selectedMessageIds.includes(msg.id);
                  return (
                    <div
                      key={msg.id}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      className={`flex gap-2 items-center max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start flex-row"}`}
                    >
                      {/* Selection Checkbox (Only shown in multi-select mode) */}
                      {isMultiSelectMode && (
                        <button
                          onClick={() => {
                            setSelectedMessageIds((prev) =>
                              prev.includes(msg.id)
                                ? prev.filter((id) => id !== msg.id)
                                : [...prev, msg.id]
                            );
                          }}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-500 text-white animate-scale-up"
                              : "border-zinc-700 hover:border-zinc-500 bg-black/20"
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </button>
                      )}

                      <div
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        onMouseDown={() => handlePressStart(msg.id, isMe)}
                        onMouseUp={() => handlePressEnd(msg.id)}
                        onMouseLeave={() => handlePressEnd(msg.id)}
                        onTouchStart={() => handlePressStart(msg.id, isMe)}
                        onTouchEnd={() => handlePressEnd(msg.id)}
                      >
                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-0.5 px-1">
                          {isMe ? "Você" : msg.senderName}
                        </span>
                        <div
                          className={`p-3 rounded-2xl relative group transition-all text-left ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10"
                            : msg.type === "system"
                              ? "bg-zinc-800/80 border border-indigo-500/20 text-zinc-100 rounded-tl-none"
                              : msg.type === "gift"
                                ? "bg-amber-950/20 border border-amber-500/30 text-amber-100 rounded-tl-none"
                                : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none"
                        }`}
                      >
                        {editingMessageId === msg.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full bg-zinc-950 text-white text-xs p-2 rounded-lg border border-indigo-500 outline-none focus:ring-1 focus:ring-indigo-500"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingText("");
                                }}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className="px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-400 text-[10px] text-white transition-colors font-bold"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-medium leading-relaxed break-words">
                              {msg.content}
                            </p>

                            {/* Render generated image if URL is present in message */}
                            {msg.content.includes("https://image.pollinations.ai") && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-w-xs bg-zinc-950">
                                <img
                                  src={msg.content.match(/https:\/\/image\.pollinations\.ai[^\s]*/)?.[0]}
                                  alt="Generated AI Art"
                                  className="w-full max-h-64 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {msg.type === "project" && msg.projectUrl && (
                              <div
                                onClick={() => {
                                  if (msg.projectId) {
                                    if (
                                      msg.projectName ===
                                      "Sessão Colaborativa (Ao Vivo)"
                                    ) {
                                      useStore
                                        .getState()
                                        .joinCollaboration(msg.projectId);
                                      onClose();
                                    } else {
                                      useStore
                                        .getState()
                                        .loadProjectFromFirestore(msg.projectId);
                                      useStore.getState().setAppView("editor");
                                      onClose();
                                    }
                                  }
                                }}
                                className="mt-2 bg-black/20 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/20 transition-all cursor-pointer"
                              >
                                <img
                                  src={msg.projectUrl}
                                  alt={msg.projectName}
                                  className="w-full h-24 object-cover"
                                />
                                <div className="p-2 bg-black/40 backdrop-blur-md text-[10px] font-bold truncate">
                                  {msg.projectName}
                                </div>
                              </div>
                            )}

                            {isMe && (
                              <div className="absolute -top-3 -right-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-[#1a1a1a] p-1 rounded-md border border-zinc-700 transition-opacity shadow-lg z-10">
                                <button
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingText(msg.content);
                                  }}
                                  className="p-1 hover:bg-zinc-800 text-indigo-400 rounded transition-colors"
                                  title="Editar Mensagem"
                                >
                                  <Pencil size={10} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 hover:bg-zinc-800 text-rose-400 rounded transition-colors"
                                  title="Deletar Mensagem"
                                >
                                  <Trash size={10} />
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1.5 opacity-50 text-[8px] font-mono select-none">
                          {msg.isEdited && (
                            <span className="text-zinc-400 italic mr-1">editada</span>
                          )}
                          <span>
                            {msg.createdAt?.toDate
                              ? msg.createdAt
                                  .toDate()
                                  .toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                              : "Agora"}
                          </span>
                          {isMe &&
                            (msg.isRead ? (
                              <CheckCheck size={10} className="text-zinc-200" />
                            ) : (
                              <Check size={10} className="text-zinc-400" />
                            ))}
                        </div>
                      </div>
                    </div>
                    </div>
                  );
                })
              )}
              {typingContacts[activeContactId] && (
                <div className="flex flex-col max-w-[75%] self-start items-start animate-pulse">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5 px-1">
                    {activeContact.displayName} está digitando
                  </span>
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-tl-none flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Sender Input Box */}
            <div className="p-3 bg-[#161616] border-t border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 bg-[#0e0e0e] rounded-xl px-3 py-1.5 border border-zinc-800 focus-within:border-indigo-600 transition-all shadow-inner">
                  <button
                    onClick={() => useStore.getState().sendToDM()}
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-600/10 rounded-lg transition-all"
                    title="Exportar e Enviar Animação"
                  >
                    <Video size={16} />
                  </button>
                  <button
                    onClick={() => setShowProjectPicker(true)}
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-600/10 rounded-lg transition-all"
                    title="Anexar Projeto"
                  >
                    <ImageIcon size={16} />
                  </button>
                <input
                  type="text"
                  placeholder={`Mande uma mensagem para ${activeContact.displayName}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-200 placeholder:text-zinc-700"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all disabled:opacity-20 disabled:grayscale cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Picker Modal */}
      {showProjectPicker && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1e1e1e] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-indigo-400" />
                Selecione um Projeto para Enviar
              </h3>
              <button
                onClick={() => setShowProjectPicker(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
              {firebaseProjects.length === 0 ? (
                <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
                  Nenhum projeto encontrado.
                </div>
              ) : (
                firebaseProjects.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => handleSendProject(p)}
                    className="group bg-[#2a2a2a] rounded-xl overflow-hidden border border-zinc-700 hover:border-indigo-500 cursor-pointer transition-all"
                  >
                    <img
                      src={p.thumbnail || "https://picsum.photos/seed/art/200"}
                      alt={p.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs font-bold text-white truncate">
                        {p.name || "Sem título"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
