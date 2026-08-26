import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "../store/useStore";
import { getTranslation } from "../lib/translations";
import { getAllLocalDrafts } from "../lib/localDb";
import { GameModal } from "./GameModal";
import {
  Home,
  Layers,
  Brush,
  Bell,
  UserCircle,
  Settings,
  LayoutGrid,
  Search,
  Cloud,
  Folder,
  Heart,
  ThumbsDown,
  Flag,
  Star,
  Layout,
  ChevronRight,
  Plus,
  LogOut,
  Mail as MailIcon,
  Lock,
  User as UserIcon,
  Trash2,
  AlertCircle,
  Video,
  Smartphone,
  Monitor,
  BookOpen,
  MoreVertical,
  CheckSquare,
  HelpCircle,
  ChevronDown,
  Download,
  Upload,
  X,
  Pencil,
  Wallet,
  Users,
  Swords,
  Trophy,
  Sparkles,
  Gamepad2,
  Play,
  UserCheck,
  UserPlus,
  Eye,
  EyeOff,
  Clock,
  Image as ImageIcon,
  Package,
  RefreshCw,
  Check,
  Baby,
  KeyRound,
  Maximize,
  Minimize,
  Info,
  Hash,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { NavButton } from "./NavButton";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  writeBatch,
  increment,
  serverTimestamp,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

import { NewProjectModal } from "./NewProjectModal";
import { EditProfileModal } from "./EditProfileModal";

import { ProjectSettingsModal } from "./ProjectSettingsModal";
import { PublishModal } from "./PublishModal";
import { MessagesModal } from "./MessagesModal";
import { PointsWalletModal } from "./PointsWalletModal";
import { PlansModal } from "./PlansModal";
import { CreativeHoursModal } from "./CreativeHoursModal";
import { TeamsModal } from "./TeamsModal";
import { MyPublicationsModal } from "./MyPublicationsModal";
import { compressImage } from "../lib/imageUtils";

function BrushCanvas({
  texture,
  color,
  size,
}: {
  texture: any;
  color: string;
  size: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushImage, setBrushImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (typeof texture === "string" && texture.startsWith("http")) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = texture;
      img.onload = () => setBrushImage(img);
    } else {
      setBrushImage(null);
    }
  }, [texture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initial clear
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (brushImage) {
      // Texture Brush (Stamp style)
      // Save context state
      ctx.save();

      // Draw image as alpha mask first
      ctx.drawImage(brushImage, x - size / 2, y - size / 2, size, size);

      // Apply color mask
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = color;

      // Stamp the image masked with color
      ctx.fillRect(x - size / 2, y - size / 2, size, size);

      ctx.restore();
    } else if (texture === "spray") {
      ctx.fillStyle = color;
      for (let i = 0; i < 10; i++) {
        const offset = Math.random() * size - size / 2;
        const offset2 = Math.random() * size - size / 2;
        ctx.fillRect(x + offset, y + offset2, 1, 1);
      }
    } else {
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      const rect = canvas?.getBoundingClientRect();
      const x =
        ("touches" in e ? e.touches[0].clientX : e.clientX) - (rect?.left || 0);
      const y =
        ("touches" in e ? e.touches[0].clientY : e.clientY) - (rect?.top || 0);
      ctx.moveTo(x, y);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full h-full cursor-crosshair touch-none"
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={() => setIsDrawing(false)}
      onMouseLeave={() => setIsDrawing(false)}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={() => setIsDrawing(false)}
    />
  );
}

type SubView =
  | "projects"
  | "account"
  | "login"
  | "register"
  | "forgot"
  | "force_reset"
  | "password_check"
  | "feed"
  | "notices"
  | "multiplayer";

export function StartScreen() {
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string;
    type: "project" | "folder";
  } | null>(null);

  const handleConfirmDelete = async (mode: "all" | "app" | "cloud") => {
    if (!showDeleteModal) return;
    if (showDeleteModal.type === "project") {
      await deleteProjectFromFirestore(showDeleteModal.id, mode);
    } else {
      await deleteFolderFromFirestore(showDeleteModal.id, mode);
    }
    setShowDeleteModal(null);
  };
  // ... (logic remains same)
  const {
    setAppView,
    user,
    setUser,
    userProfile,
    firebaseProjects,
    setFirebaseProjects,
    firebaseFolders,
    setFirebaseFolders,
    loadProjectFromFirestore,
    deleteProjectFromFirestore,
    deleteFolderFromFirestore,
    renameFolder,
    moveProjectToFolder,
    createNewProject,
    createFromVideo,
    setWidthHeight,
    setTotalFrames,
    setFps,
    language,
    tutorialCompleted,
    customBrushes,
    addCustomBrush,
    showProjectSettings,
    setShowProjectSettings,
    hasSavedState,
    restoreFromLocalStorage,
    loadLocalProject,
    deleteLocalProject,
    setShowAccountModal,
    isKidsMode,
    setIsKidsMode,
    kidsModePin,
    setKidsModePin,
  } = useStore();

  const t = (key: string, defaultValue?: string) => getTranslation(key, language || "pt") || defaultValue || key;

  const [subView, setSubView] = useState<SubView>("feed");
  const [challengeSearchQuery, setChallengeSearchQuery] = useState("");
  const [publishedArtworks, setPublishedArtworks] = useState<any[]>([]);
  const [publishedBrushes, setPublishedBrushes] = useState<any[]>([]);
  const [publishedMaterials, setPublishedMaterials] = useState<any[]>([]);
  const [feedTab, setFeedTab] = useState<'artworks' | 'brushes' | 'materials'>('artworks');
  const [selectedArtPreview, setSelectedArtPreview] = useState<any | null>(null);
  const [previewComments, setPreviewComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const [showShareBrushModal, setShowShareBrushModal] = useState(false);
  const [selectedLocalBrushId, setSelectedLocalBrushId] = useState("");
  const [brushShareName, setBrushShareName] = useState("");
  const [brushShareDesc, setBrushShareDesc] = useState("");

  const [localDraftsList, setLocalDraftsList] = useState<any[]>([]);

  const handlePinSubmit = () => {
    if (pinAction === 'disable') {
      if (inputPin === kidsModePin) {
        setIsKidsMode(false);
        setShowPinModal(false);
        setInputPin('');
        setPinError('');
      } else {
        setPinError('Senha incorreta!');
      }
    } else if (pinAction === 'change_pin') {
      if (inputPin === kidsModePin) {
        if (newPin.length >= 4) {
          setKidsModePin(newPin);
          setShowPinModal(false);
          setInputPin('');
          setNewPin('');
          setPinError('');
          alert('Senha alterada com sucesso!');
        } else {
          setPinError('A nova senha deve ter pelo menos 4 dígitos');
        }
      } else {
        setPinError('Senha atual incorreta!');
      }
    }
  };

  const refreshLocalDrafts = async () => {
    try {
      const dbDrafts = await getAllLocalDrafts();
      const localListStr = localStorage.getItem("local_projects_drafts");
      const localList = localListStr ? JSON.parse(localListStr) : [];
      
      const map = new Map<string, any>();
      localList.forEach((item: any) => { if (item.id) map.set(item.id, item); });
      dbDrafts.forEach((item: any) => { if (item.id) map.set(item.id, { ...map.get(item.id), ...item }); });
      
      const combined = Array.from(map.values()).sort((a, b) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
      setLocalDraftsList(combined);
    } catch (e) {
      console.warn("Error refreshing local drafts:", e);
    }
  };

  useEffect(() => {
    refreshLocalDrafts();
  }, [subView]);

  useEffect(() => {
    const q = query(
      collection(db, "published_brushes"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setPublishedBrushes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Erro ao carregar brushes:", err);
      handleFirestoreError(err, OperationType.LIST, "published_brushes");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "published_materials"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setPublishedMaterials(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Erro ao carregar materiais:", err);
      handleFirestoreError(err, OperationType.LIST, "published_materials");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (tutorialCompleted) {
      const hasSeen = localStorage.getItem("seen_whats_new_v3.2.7");
      if (!hasSeen) {
        setTimeout(() => {
          setShowNoticeModal({
            title: `Novidades da Versão 3.2.7 ✨🚀`,
            content: `Olá, artista!\n\nAtualizamos o Cloud Studio Paint para a versão 3.2.7. Aproveite os novos pincéis realistas (óleo, spray, pastel) com texturas customizadas e nossa nova tela de "Sobre o Aplicativo" no menu de configurações.\n\nContinue criando! 🎨`
          });
          localStorage.setItem("seen_whats_new_v3.2.7", "true");
        }, 800);
      }
    }
  }, [tutorialCompleted]);

  useEffect(() => {
    if (!selectedArtPreview?.id) {
      setPreviewComments([]);
      return;
    }
    const q = query(
      collection(db, "published", selectedArtPreview.id, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setPreviewComments(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Erro ao carregar comentários:", err);
      handleFirestoreError(err, OperationType.LIST, `published/${selectedArtPreview.id}/comments`);
    });
    return () => unsubscribe();
  }, [selectedArtPreview?.id]);

  useEffect(() => {
    const q = query(
      collection(db, "published"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const artworks = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPublishedArtworks(artworks);
    }, (err) => {
      console.error("Erro ao carregar obras publicadas:", err);
    });
    return () => unsubscribe();
  }, []);

  const [users, setUsers] = useState<any[]>([]);
  const [invitesSent, setInvitesSent] = useState<Record<string, boolean>>({});
  const [selectedChatUser, setSelectedChatUser] = useState<any | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>(
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      const qReceiver = query(
        collection(db, "messages"),
        where("receiverId", "==", user.uid),
        where("isRead", "==", false),
      );
      const unsubscribeReceiver = onSnapshot(qReceiver, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as any[];
        const counts: Record<string, number> = {};
        msgs.forEach((m) => {
          counts[m.senderId] = (counts[m.senderId] || 0) + 1;
        });
        setUnreadMessages(counts);
      });
      return () => unsubscribeReceiver();
    }
  }, [user]);

  const [invites, setInvites] = useState<any[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchError, setFriendSearchError] = useState("");
  const [friendSearchSuccess, setFriendSearchSuccess] = useState("");

  // Sincronizar convites de amizade em tempo real
  useEffect(() => {
    if (!user) return;
    const q1 = query(
      collection(db, "invites"),
      where("senderId", "==", user.uid),
    );
    const q2 = query(
      collection(db, "invites"),
      where("receiverId", "==", user.uid),
    );

    const unsub1 = onSnapshot(
      q1,
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setInvites((prev) => {
          const otherList = prev.filter((x) => x.senderId !== user.uid);
          return [...list, ...otherList];
        });
      },
      (err) => console.error("Erro ao sincronizar convites enviados:", err),
    );

    const unsub2 = onSnapshot(
      q2,
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setInvites((prev) => {
          const otherList = prev.filter((x) => x.receiverId !== user.uid);
          return [...otherList, ...list];
        });
      },
      (err) => console.error("Erro ao sincronizar convites recebidos:", err),
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const sendFriendRequest = async (
    targetUserId: string,
    targetUserName?: string,
    groupName?: string,
    memberCount?: number,
    inviteType?: string
  ) => {
    if (!user) return;
    try {
      const id = doc(collection(db, "invites")).id;
      const payload: any = {
        id,
        senderId: user.uid,
        receiverId: targetUserId,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      if (user.displayName) payload.senderName = user.displayName;
      if (targetUserName) payload.receiverName = targetUserName;
      if (groupName) payload.groupName = groupName;
      if (memberCount !== undefined) payload.memberCount = memberCount;
      if (inviteType) payload.inviteType = inviteType;

      await setDoc(doc(db, "invites", id), payload);
    } catch (err) {
      console.error("Erro ao enviar solicitação de amizade:", err);
    }
  };

  const acceptFriendRequest = async (inviteId: string) => {
    try {
      const invite = invites.find((inv) => inv.id === inviteId);
      if (invite && invite.inviteType === 'team') {
        const senderId = invite.senderId;
        const receiverId = invite.receiverId;
        const receiverName = invite.receiverName || user?.displayName || 'Membro';
        
        const teamRef = doc(db, 'teams', senderId);
        const teamSnap = await getDoc(teamRef);
        
        let teamData = {
          id: senderId,
          name: invite.groupName || 'Esquadrão Pixel Art',
          ownerId: senderId,
          members: [
            { uid: senderId, name: invite.senderName || 'Dono', query: senderId, role: 'Dono', status: 'Ativo' }
          ]
        };

        if (teamSnap.exists()) {
          teamData = teamSnap.data() as any;
        }

        const alreadyIn = teamData.members.some((m: any) => m.query === receiverId);
        if (!alreadyIn) {
          teamData.members.push({
            uid: receiverId,
            name: receiverName,
            query: receiverId,
            role: 'Editor',
            status: 'Ativo'
          });
        }

        await setDoc(teamRef, {
          ...teamData,
          updatedAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, "invites", inviteId), {
        status: "accepted",
      });
    } catch (err) {
      console.error("Erro ao aceitar amizade:", err);
    }
  };

  const rejectFriendRequest = async (inviteId: string) => {
    try {
      await updateDoc(doc(db, "invites", inviteId), {
        status: "rejected",
      });
    } catch (err) {
      console.error("Erro ao recusar amizade:", err);
    }
  };

  const cancelFriendRequest = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, "invites", inviteId));
    } catch (err) {
      console.error("Erro ao cancelar amizade:", err);
    }
  };

  const handleAddFriendBySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendSearchError("");
    setFriendSearchSuccess("");
    if (!friendSearchQuery.trim()) return;

    try {
      const q = query(collection(db, "users"));
      const querySnap = await getDocs(q);
      const matched = querySnap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .find(
          (u) =>
            u.displayName?.toLowerCase() ===
              friendSearchQuery.trim().toLowerCase() ||
            u.uid === friendSearchQuery.trim() ||
            u.shortId === friendSearchQuery.trim(),
        );

      if (!matched) {
        setFriendSearchError(
          "Nenhum artista encontrado com esse nome, ID ou Código Curto.",
        );
        return;
      }

      if (matched.uid === user?.uid) {
        setFriendSearchError("Você não pode adicionar a si mesmo.");
        return;
      }

      const existingInvite = invites.find(
        (i) =>
          (i.senderId === user?.uid && i.receiverId === matched.uid) ||
          (i.receiverId === user?.uid && i.senderId === matched.uid),
      );

      if (existingInvite) {
        if (existingInvite.status === "accepted") {
          setFriendSearchError("Vocês já são amigos!");
        } else if (existingInvite.status === "pending") {
          setFriendSearchError("Já existe uma solicitação pendente.");
        } else {
          await sendFriendRequest(matched.uid, matched.displayName, "Esquadrão Pixel Art", 4, "team");
          setFriendSearchSuccess(
            `Solicitação de amizade enviada para ${matched.displayName}!`,
          );
          setFriendSearchQuery("");
        }
        return;
      }

      await sendFriendRequest(matched.uid, matched.displayName, "Esquadrão Pixel Art", 4, "team");
      setFriendSearchSuccess(
        `Solicitação de amizade enviada para ${matched.displayName}!`,
      );
      setFriendSearchQuery("");
    } catch (err) {
      console.error(err);
      setFriendSearchError("Erro ao buscar artista.");
    }
  };

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUsers(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      }, (err) => {
        console.error("Erro ao escutar usuários:", err);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Batalha de Desenhos States
  const [battles, setBattles] = useState<any[]>([]);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [showBattleArtModal, setShowBattleArtModal] = useState(false);
  const [battleArtSelectionTarget, setBattleArtSelectionTarget] = useState<
    any | null
  >(null);
  const [selectedMultiplayerTab, setSelectedMultiplayerTab] = useState<
    "opponents" | "friends" | "battles"
  >("opponents");

  // Bot Battle and live simulation states
  const [botBattle, setBotBattle] = useState<any | null>(null);
  const [isSimulatingBattle, setIsSimulatingBattle] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [myHP, setMyHP] = useState(100);
  const [opponentHP, setOpponentHP] = useState(100);
  const [battleResult, setBattleResult] = useState<
    "victory" | "defeat" | "tie" | null
  >(null);
  const [currentTurnOwner, setCurrentTurnOwner] = useState<string | null>(null);
  const [shouldAutoStartBattle, setShouldAutoStartBattle] = useState(false);

  // Subscriptions to Realtime Battles
  useEffect(() => {
    if (user) {
      const qChallenger = query(
        collection(db, "battles"),
        where("challengerId", "==", user.uid),
      );
      const unsubscribeChallenger = onSnapshot(
        qChallenger,
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));
          setBattles((prev) => {
            const otherList = prev.filter(
              (b: any) => !list.some((x) => x.id === b.id),
            );
            return [...list, ...otherList].sort(
              (a: any, b: any) =>
                (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0),
            );
          });
        },
        (error) => console.error("Error loading challenger battles:", error),
      );

      const qOpponent = query(
        collection(db, "battles"),
        where("opponentId", "==", user.uid),
      );
      const unsubscribeOpponent = onSnapshot(
        qOpponent,
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));
          setBattles((prev) => {
            const otherList = prev.filter(
              (b: any) => !list.some((x) => x.id === b.id),
            );
            return [...otherList, ...list].sort(
              (a: any, b: any) =>
                (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0),
            );
          });
        },
        (error) => console.error("Error loading opponent battles:", error),
      );

      return () => {
        unsubscribeChallenger();
        unsubscribeOpponent();
      };
    }
  }, [user]);

  // Handle active real battle synchronization
  const currentRealBattle = activeBattleId
    ? battles.find((b) => b.id === activeBattleId)
    : null;

  useEffect(() => {
    if (currentRealBattle) {
      if (currentRealBattle.status === "finished") {
        if (currentRealBattle.winnerId === user?.uid) {
          setBattleResult("victory");
        } else if (currentRealBattle.winnerId === "tie") {
          setBattleResult("tie");
        } else {
          setBattleResult("defeat");
        }
        if (currentRealBattle.battleLog) {
          setBattleLog(currentRealBattle.battleLog);
        }
      } else if (
        currentRealBattle.status === "fighting" &&
        battleLog.length === 0
      ) {
        setMyHP(100);
        setOpponentHP(100);
        setBattleLog([
          "🔥 A batalha de desenhos foi iniciada! Ambos os competidores enviaram suas artes!",
          `A batalha de "${currentRealBattle.challengerArtName}" contra "${currentRealBattle.opponentArtName}" está pronta para simulação!`,
        ]);
        setBattleResult(null);
        setShouldAutoStartBattle(true);
      }
    }
  }, [currentRealBattle]);

  const calculateDrawingStats = (project: any) => {
    const strSeed = project.id || "seed";
    let charCodeSum = 0;
    for (let i = 0; i < strSeed.length; i++)
      charCodeSum += strSeed.charCodeAt(i);

    const layerCount = project.layersData ? 2 : 1;
    const frameCount = project.totalFrames || 1;

    const technique = Math.min(
      99,
      Math.max(25, 45 + layerCount * 8 + (charCodeSum % 15)),
    );
    const creativity = Math.min(
      99,
      Math.max(20, 40 + frameCount * 5 + (charCodeSum % 20)),
    );
    const wFactor = Math.floor((project.width || 800) / 100);
    const power = Math.min(99, Math.max(20, 35 + wFactor + (charCodeSum % 25)));
    const style = Math.min(99, Math.max(30, 50 + (charCodeSum % 30)));

    return { technique, creativity, power, style };
  };

  const startRealBattle = async (opponentUser: any) => {
    if (!user) {
      alert("Faça login para batalhar!");
      return;
    }
    if (firebaseProjects.length === 0) {
      alert(
        "Você não possui nenhum desenho no aplicativo ou na nuvem para mandar batalhar! Crie um desenho primeiro.",
      );
      return;
    }
    setBattleArtSelectionTarget({
      type: "create_real",
      opponent: opponentUser,
    });
    setShowBattleArtModal(true);
  };

  const startBotBattle = () => {
    if (!user) {
      alert("Faça login para batalhar!");
      return;
    }
    if (firebaseProjects.length === 0) {
      alert(
        "Você não possui nenhum desenho no aplicativo ou na nuvem para mandar batalhar! Crie um desenho primeiro.",
      );
      return;
    }
    setBattleArtSelectionTarget({ type: "bot" });
    setShowBattleArtModal(true);
  };

  const acceptBattleInvitation = async (battle: any) => {
    if (firebaseProjects.length === 0) {
      alert("Você precisa de pelo menos um desenho para aceitar a batalha!");
      return;
    }
    setBattleArtSelectionTarget({ type: "accept_real", battleId: battle.id });
    setShowBattleArtModal(true);
  };

  const rejectBattleInvitation = async (battle: any) => {
    try {
      await setDoc(
        doc(db, "battles", battle.id),
        {
          status: "rejected",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error("Erro ao recusar batalha:", err);
    }
  };

  const submitProjectForBattle = async (project: any) => {
    if (!user || !battleArtSelectionTarget) return;

    const stats = calculateDrawingStats(project);
    const thumbnail = project.thumbnail || "https://picsum.photos/seed/art/200";
    const artName = project.name || "Desenho sem Nome";

    if (battleArtSelectionTarget.type === "bot") {
      setBotBattle({
        challengerId: user.uid,
        challengerName: user.displayName || "Artista",
        challengerArtName: artName,
        challengerArtUrl: thumbnail,
        challengerStats: stats,
        opponentId: "bot",
        opponentName: "DesenhoBot CPU",
        opponentArtName: "Esboço Cibernético",
        opponentArtUrl: "https://picsum.photos/seed/botart/200",
        opponentStats: {
          technique: Math.floor(40 + Math.random() * 35),
          creativity: Math.floor(40 + Math.random() * 35),
          power: Math.floor(40 + Math.random() * 35),
          style: Math.floor(40 + Math.random() * 35),
        },
      });
      setMyHP(100);
      setOpponentHP(100);
      setBattleLog([
        `⚔️ Seu campeão "${artName}" entrou na arena de treino contra o DesenhoBot!`,
      ]);
      setBattleResult(null);
      setShowBattleArtModal(false);
    } else if (battleArtSelectionTarget.type === "create_real") {
      try {
        const battleRef = doc(collection(db, "battles"));
        await setDoc(battleRef, {
          id: battleRef.id,
          challengerId: user.uid,
          challengerName: user.displayName || "Artista",
          challengerArtName: artName,
          challengerArtUrl: thumbnail,
          challengerStats: stats,
          opponentId: battleArtSelectionTarget.opponent.uid,
          opponentName:
            battleArtSelectionTarget.opponent.displayName || "Artista",
          opponentArtName: "",
          opponentArtUrl: "",
          opponentStats: null,
          status: "pending_accept",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        alert(
          `Desafio de batalha enviado com sucesso para ${battleArtSelectionTarget.opponent.displayName || "Artista"}!`,
        );
        setShowBattleArtModal(false);
      } catch (err) {
        console.error("Erro ao iniciar batalha oficial:", err);
        alert("Erro ao iniciar a batalha.");
      }
    } else if (battleArtSelectionTarget.type === "accept_real") {
      try {
        await setDoc(
          doc(db, "battles", battleArtSelectionTarget.battleId),
          {
            opponentArtName: artName,
            opponentArtUrl: thumbnail,
            opponentStats: stats,
            status: "fighting",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        setShowBattleArtModal(false);
        setBattleLog([]);
        setActiveBattleId(battleArtSelectionTarget.battleId);
      } catch (err) {
        console.error("Erro ao aceitar batalha:", err);
        alert("Erro ao aceitar o desafio.");
      }
    }
  };

  const playTurnAction = (actionType: "brush" | "eraser" | "effect") => {
    if (isSimulatingBattle) return;

    const activeStats = botBattle
      ? botBattle.challengerStats
      : currentRealBattle?.challengerId === user?.uid
        ? currentRealBattle?.challengerStats
        : currentRealBattle?.opponentStats;
    const oppStats = botBattle
      ? botBattle.opponentStats
      : currentRealBattle?.challengerId === user?.uid
        ? currentRealBattle?.opponentStats
        : currentRealBattle?.challengerStats;

    if (!activeStats || !oppStats) return;

    let damage = 0;
    let logMsg = "";

    if (actionType === "brush") {
      damage = Math.floor(
        10 +
          activeStats.technique * 0.15 +
          activeStats.power * 0.1 +
          Math.random() * 8,
      );
      logMsg = `🖌️ Seu desenho usou *Golpe de Pincel* e causou ${damage} de dano de técnica!`;
    } else if (actionType === "effect") {
      damage = Math.floor(
        12 +
          activeStats.style * 0.2 +
          activeStats.creativity * 0.1 +
          Math.random() * 10,
      );
      logMsg = `✨ Seu desenho usou *Filtro Neon Especial* e desferiu um incrível combo de ${damage} de dano!`;
    } else if (actionType === "eraser") {
      const heal = Math.floor(
        10 + activeStats.creativity * 0.15 + Math.random() * 6,
      );
      setMyHP((prev) => Math.min(100, prev + heal));
      setBattleLog((prev) => [
        ...prev,
        `🧽 Seu desenho usou *Escudo de Borracha* e apagou marcas, recuperando ${heal} de HP!`,
      ]);

      setTimeout(() => {
        triggerBotResponse(oppStats);
      }, 1000);
      return;
    }

    const nextOppHP = Math.max(0, opponentHP - damage);
    setOpponentHP(nextOppHP);
    setBattleLog((prev) => [...prev, logMsg]);

    if (nextOppHP <= 0) {
      finishBattleSimulation("victory");
    } else {
      setCurrentTurnOwner("opponent");
      setTimeout(() => {
        triggerBotResponse(oppStats);
      }, 1200);
    }
  };

  const triggerBotResponse = (oppStats: any) => {
    if (opponentHP <= 0 || myHP <= 0) return;

    const botMoves = [
      { name: "Ataque de Balde de Tinta", type: "attack" },
      { name: "Corte de Linha Vetorial", type: "attack" },
      { name: "Camada Oculta Defensiva", type: "heal" },
    ];
    const move = botMoves[Math.floor(Math.random() * botMoves.length)];

    if (move.type === "attack") {
      const damage = Math.floor(
        8 +
          oppStats.power * 0.15 +
          oppStats.technique * 0.1 +
          Math.random() * 8,
      );
      const nextMyHP = Math.max(0, myHP - damage);
      setMyHP(nextMyHP);
      setBattleLog((prev) => [
        ...prev,
        `🤖 O desenho do ArtBot usou *${move.name}* e tirou ${damage} do seu HP!`,
      ]);

      if (nextMyHP <= 0) {
        finishBattleSimulation("defeat");
      } else {
        setCurrentTurnOwner("player");
      }
    } else {
      const heal = Math.floor(12 + oppStats.style * 0.1 + Math.random() * 6);
      setOpponentHP((prev) => Math.min(100, prev + heal));
      setBattleLog((prev) => [
        ...prev,
        `🛡️ O desenho do ArtBot usou *${move.name}* e recuperou ${heal} de HP!`,
      ]);
      setCurrentTurnOwner("player");
    }
  };

  const finishBattleSimulation = (result: "victory" | "defeat" | "tie") => {
    setBattleResult(result);
    setIsSimulatingBattle(false);

    if (result === "victory") {
      const { addGamePoints } = useStore.getState();
      addGamePoints(100);
      setBattleLog((prev) => [
        ...prev,
        `🎉 PARABÉNS! Você venceu a Batalha de Desenhos e ganhou 100 Pontos de Jogo! 🏆`,
      ]);
    } else {
      setBattleLog((prev) => [
        ...prev,
        `💀 Fim de Combate! Seu desenho lutou bravamente, mas foi superado. Vá ao editor para aprimorá-lo!`,
      ]);
    }
  };

  const runAutoSimulation = async () => {
    if (isSimulatingBattle) return;

    setIsSimulatingBattle(true);
    setMyHP(100);
    setOpponentHP(100);
    setBattleResult(null);
    setBattleLog(["⚔️ Iniciando simulação de combate automático acelerado..."]);

    const isBot = !!botBattle;
    const combatant1 = isBot ? botBattle : currentRealBattle;

    if (!combatant1) return;

    const myStats = isBot
      ? combatant1.challengerStats
      : combatant1.challengerId === user?.uid
        ? combatant1.challengerStats
        : combatant1.opponentStats;
    const oppStats = isBot
      ? combatant1.opponentStats
      : combatant1.challengerId === user?.uid
        ? combatant1.opponentStats
        : combatant1.challengerStats;
    const mName = isBot
      ? combatant1.challengerArtName
      : combatant1.challengerId === user?.uid
        ? combatant1.challengerArtName
        : combatant1.opponentArtName;
    const oName = isBot
      ? combatant1.opponentArtName
      : combatant1.challengerId === user?.uid
        ? combatant1.opponentArtName
        : combatant1.challengerArtName;

    if (!myStats || !oppStats) return;

    let tempMyHP = 100;
    let tempOppHP = 100;
    const tempLogs = [
      `🎨 O combate épico entre "${mName}" e "${oName}" começou!`,
    ];

    const roundMoves = [
      "Rabisco Supersônico",
      "Super Caneta de Feltro",
      "Borracha Galáctica",
      "Pincel de Fogo",
      "Camadas Infinitas",
      "Estilo Aquarela Crítico",
      "Desfoque de Movimento",
      "Traço de Esboço Rápido",
    ];

    let round = 1;
    while (tempMyHP > 0 && tempOppHP > 0 && round <= 15) {
      tempLogs.push(`\n[Rodada ${round}]`);

      const playerDmg = Math.floor(
        10 +
          myStats.technique * 0.15 +
          myStats.power * 0.1 +
          Math.random() * 10,
      );
      const move1 = roundMoves[Math.floor(Math.random() * roundMoves.length)];
      tempOppHP = Math.max(0, tempOppHP - playerDmg);
      tempLogs.push(
        `💥 "${mName}" usou *${move1}*! Causou ${playerDmg} de dano.`,
      );

      if (tempOppHP <= 0) break;

      const oppDmg = Math.floor(
        10 +
          oppStats.technique * 0.15 +
          oppStats.power * 0.1 +
          Math.random() * 10,
      );
      const move2 = roundMoves[Math.floor(Math.random() * roundMoves.length)];
      tempMyHP = Math.max(0, tempMyHP - oppDmg);
      tempLogs.push(`⚡ "${oName}" usou *${move2}*! Causou ${oppDmg} de dano.`);

      round++;
    }

    let finalResult: "victory" | "defeat" | "tie" = "tie";
    if (tempMyHP <= 0 && tempOppHP <= 0) {
      finalResult = "tie";
      tempLogs.push(
        `🤝 Empate! Ambos os desenhos desintegraram em tinta ao mesmo tempo!`,
      );
    } else if (tempOppHP <= 0) {
      finalResult = "victory";
      tempLogs.push(
        `🏆 Vitória para "${mName}"! A obra-prima resistiu aos ataques.`,
      );
    } else {
      finalResult = "defeat";
      tempLogs.push(
        `💔 Derrota! "${oName}" provou ter mais impacto artístico desta vez.`,
      );
    }

    let logIndex = 0;
    setMyHP(100);
    setOpponentHP(100);

    const interval = setInterval(() => {
      if (logIndex < tempLogs.length) {
        const nextLine = tempLogs[logIndex];
        setBattleLog((prev) => [...prev, nextLine]);

        if (
          nextLine.includes("Vitória") ||
          nextLine.includes("Derrota") ||
          nextLine.includes("Empate")
        ) {
          if (finalResult === "victory") {
            setOpponentHP(0);
          } else if (finalResult === "defeat") {
            setMyHP(0);
          } else {
            setMyHP(0);
            setOpponentHP(0);
          }
        } else if (nextLine.includes("💥")) {
          setOpponentHP((prev) => Math.max(10, prev - 15));
        } else if (nextLine.includes("⚡")) {
          setMyHP((prev) => Math.max(10, prev - 15));
        }

        logIndex++;
      } else {
        clearInterval(interval);
        setMyHP(tempMyHP);
        setOpponentHP(tempOppHP);
        finishBattleSimulation(finalResult);

        if (!isBot && currentRealBattle) {
          setDoc(
            doc(db, "battles", currentRealBattle.id),
            {
              status: "finished",
              winnerId:
                finalResult === "victory"
                  ? user?.uid
                  : finalResult === "defeat"
                    ? currentRealBattle.opponentId
                    : "tie",
              battleLog: tempLogs,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ).catch((err) => console.error("Error writing battle result:", err));
        }
      }
    }, 250);
  };

  useEffect(() => {
    if (shouldAutoStartBattle && !isSimulatingBattle && activeBattleId) {
      setShouldAutoStartBattle(false);
      runAutoSimulation();
    }
  }, [shouldAutoStartBattle, isSimulatingBattle, activeBattleId]);

  const [activeTab, setActiveTab] = useState<
    "ilustracao" | "webtoon" | "quadrinho" | "animacao" | "predefinicoes"
  >("ilustracao");
  const [feedFilter, setFeedFilter] = useState<
    "popular" | "novo" | "horas" | "minutos"
  >("popular");
  const [projectSource, setProjectSource] = useState<"app" | "cloud">("app");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryGuess, setRecoveryGuess] = useState("");
  const [recoveryMethod, setRecoveryMethod] = useState<"email" | "guess">("email");
  const [registeredPassword, setRegisteredPassword] = useState("bobo");

  useEffect(() => {
    if (subView === "forgot" && recoveryMethod === "guess" && email) {
      const emailLower = email.toLowerCase().trim();
      // Check local storage first
      const localPwd = localStorage.getItem("registered_password_" + emailLower);
      if (localPwd) {
        setRegisteredPassword(localPwd);
      } else {
        setRegisteredPassword("bobo");
      }

      // Query Firestore only if email seems complete (contains @ and .)
      if (emailLower.includes("@") && emailLower.includes(".")) {
        const q = query(collection(db, "users"), where("email", "==", emailLower));
        getDocs(q).then((snap) => {
          if (!snap.empty) {
            const userData = snap.docs[0].data();
            if (userData && userData.registeredPassword) {
              setRegisteredPassword(userData.registeredPassword);
              localStorage.setItem("registered_password_" + emailLower, userData.registeredPassword);
            }
          }
        }).catch((err) => console.error("Error retrieving user password:", err));
      }
    }
  }, [subView, recoveryMethod, email]);

  const [displayName, setDisplayName] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showMyPublicationsModal, setShowMyPublicationsModal] = useState(false);
  const [showPointsWallet, setShowPointsWallet] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showCreativeHoursModal, setShowCreativeHoursModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAppInfoMenu, setShowAppInfoMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const appInfoMenuRef = useRef<HTMLDivElement>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [inputPin, setInputPin] = useState("");
  const [pinAction, setPinAction] = useState<"disable" | "change_pin" | null>(null);
  const [pinError, setPinError] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showNoticeModal, setShowNoticeModal] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState<{
    title: string;
    author: string;
    img: string;
  } | null>(null);
  const [showBrushTesterModal, setShowBrushTesterModal] = useState<{
    title: string;
    texture: string;
    img: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localProjects, setLocalProjects] = useState<any[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("local_projects_drafts");
      if (saved) {
        setLocalProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading local projects:", e);
    }
  }, [hasSavedState]);

  const handleLikeOrDislike = async (artId: string, type: "like" | "dislike", currentArtData: any, collectionName: string = "published") => {
    if (!user) {
      alert("Você precisa estar logado para avaliar as obras!");
      return;
    }
    if (currentArtData.userId === user.uid) {
      alert("Você não pode curtir ou dar não curtir na sua própria obra!");
      return;
    }

    const likedBy = Array.isArray(currentArtData.likedBy) ? currentArtData.likedBy : [];
    const dislikedBy = Array.isArray(currentArtData.dislikedBy) ? currentArtData.dislikedBy : [];
    const likes = typeof currentArtData.likes === "number" ? currentArtData.likes : 0;
    const dislikes = typeof currentArtData.dislikes === "number" ? currentArtData.dislikes : 0;

    let newLikes = likes;
    let newDislikes = dislikes;
    let newLikedBy = [...likedBy];
    let newDislikedBy = [...dislikedBy];

    const hasLiked = likedBy.includes(user.uid);
    const hasDisliked = dislikedBy.includes(user.uid);

    if (type === "like") {
      if (hasLiked) {
        // Unlike
        newLikes = Math.max(0, likes - 1);
        newLikedBy = newLikedBy.filter((id) => id !== user.uid);
      } else {
        // Like
        newLikes = likes + 1;
        newLikedBy.push(user.uid);
        if (hasDisliked) {
          // Remove dislike
          newDislikes = Math.max(0, dislikes - 1);
          newDislikedBy = newDislikedBy.filter((id) => id !== user.uid);
        }
      }
    } else if (type === "dislike") {
      if (hasDisliked) {
        // Undislike
        newDislikes = Math.max(0, dislikes - 1);
        newDislikedBy = newDislikedBy.filter((id) => id !== user.uid);
      } else {
        // Dislike
        newDislikes = dislikes + 1;
        newDislikedBy.push(user.uid);
        if (hasLiked) {
          // Remove like
          newLikes = Math.max(0, likes - 1);
          newLikedBy = newLikedBy.filter((id) => id !== user.uid);
        }
      }
    }

    const updatePayload = {
      likes: newLikes,
      dislikes: newDislikes,
      likedBy: newLikedBy,
      dislikedBy: newDislikedBy,
    };

    try {
      await updateDoc(doc(db, collectionName, artId), updatePayload);

      // Update appropriate state lists
      if (collectionName === "published") {
        setPublishedArtworks((prevList) =>
          prevList.map((item) => (item.id === artId ? { ...item, ...updatePayload } : item))
        );
      } else if (collectionName === "published_brushes") {
        setPublishedBrushes((prevList) =>
          prevList.map((item) => (item.id === artId ? { ...item, ...updatePayload } : item))
        );
      } else if (collectionName === "published_materials") {
        setPublishedMaterials((prevList) =>
          prevList.map((item) => (item.id === artId ? { ...item, ...updatePayload } : item))
        );
      }

      // Update selected art preview state if open
      if (selectedArtPreview && selectedArtPreview.id === artId) {
        setSelectedArtPreview((prev: any) => (prev ? { ...prev, ...updatePayload } : null));
      }
    } catch (e) {
      console.error("Erro ao atualizar curtida/não curtida:", e);
      handleFirestoreError(e, OperationType.UPDATE, `${collectionName}/${artId}`);
    }
  };

  const handleShareBrush = async () => {
    if (!user) {
      alert("Você precisa estar logado para publicar!");
      return;
    }
    const localBrush = customBrushes.find((b: any) => b.id === selectedLocalBrushId);
    if (!localBrush) {
      alert("Selecione um pincel para compartilhar!");
      return;
    }
    const nameToPublish = brushShareName.trim() || localBrush.name;
    try {
      await addDoc(collection(db, "published_brushes"), {
        userId: user.uid,
        userDisplayName: user.displayName || "Anônimo",
        userPhotoURL: user.photoURL || "",
        name: nameToPublish,
        description: brushShareDesc || "",
        dataUrl: localBrush.dataUrl,
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: [],
        downloads: 0,
        createdAt: serverTimestamp(),
      });
      alert("Pincel compartilhado com sucesso!");
      setShowShareBrushModal(false);
      setSelectedLocalBrushId("");
      setBrushShareName("");
      setBrushShareDesc("");
    } catch (e) {
      console.error("Erro ao publicar pincel:", e);
      handleFirestoreError(e, OperationType.CREATE, "published_brushes");
      alert("Erro ao publicar pincel.");
    }
  };

  const handleDownloadBrush = async (brush: any) => {
    addCustomBrush(brush.name, brush.dataUrl);

    try {
      await updateDoc(doc(db, "published_brushes", brush.id), {
        downloads: (brush.downloads || 0) + 1,
      });
    } catch (e) {
      console.error("Erro ao incrementar downloads do pincel:", e);
      handleFirestoreError(e, OperationType.UPDATE, `published_brushes/${brush.id}`);
    }

    alert(`Pincel "${brush.name}" importado com sucesso! Agora você pode selecioná-lo no menu de pincéis.`);
  };

  const handleDownloadMaterial = async (material: any) => {
    const { addLayerWithImage, setAppView, createNewProject } = useStore.getState();

    createNewProject();

    setTimeout(() => {
      addLayerWithImage(material.title, material.thumbnail);
      setAppView("editor");
    }, 150);

    try {
      await updateDoc(doc(db, "published_materials", material.id), {
        downloads: (material.downloads || 0) + 1,
      });
    } catch (e) {
      console.error("Erro ao incrementar downloads do material:", e);
      handleFirestoreError(e, OperationType.UPDATE, `published_materials/${material.id}`);
    }

    alert(`Material "${material.title}" importado como uma nova camada no editor!`);
  };

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const longPressTimerRef = useRef<Record<string, any>>({});
  const isLongPressActiveRef = useRef<Set<string>>(new Set());

  const handlePressStart = (id: string) => {
    if (longPressTimerRef.current[id]) {
      clearTimeout(longPressTimerRef.current[id]);
    }
    longPressTimerRef.current[id] = setTimeout(() => {
      isLongPressActiveRef.current.add(id);
      setSelectedProjects((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(60);
      }
    }, 450);
  };

  const handlePressEnd = (id: string) => {
    if (longPressTimerRef.current[id]) {
      clearTimeout(longPressTimerRef.current[id]);
      delete longPressTimerRef.current[id];
    }
  };

  const handleItemClick = (id: string, onNormalClick: () => void) => {
    if (isLongPressActiveRef.current.has(id)) {
      isLongPressActiveRef.current.delete(id);
      return;
    }
    if (selectedProjects.size > 0) {
      toggleSelectProject(id);
    } else {
      onNormalClick();
    }
  };

  const toggleSelectProject = (projectId: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const createFolder = async () => {
    const folderName = prompt("Digite o nome da nova pasta:", "Minha Pasta");
    if (folderName && folderName.trim()) {
      if (user) {
        const { createFolderInFirestore } = useStore.getState();
        await createFolderInFirestore(folderName.trim());
      } else {
        const newFolder = {
          id: uuidv4(),
          name: folderName.trim(),
          createdAt: new Date().toISOString()
        };
        const currentFolders = JSON.parse(localStorage.getItem("offline_folders") || "[]");
        currentFolders.push(newFolder);
        localStorage.setItem("offline_folders", JSON.stringify(currentFolders));
        useStore.setState({
          firebaseFolders: [...useStore.getState().firebaseFolders, newFolder]
        });
        useStore.getState().setNotification({
          message: `Pasta "${folderName.trim()}" criada com sucesso!`,
          type: "success"
        });
      }
    }
  };

  const handleRenameFolder = async (id: string, currentName: string) => {
    const newName = prompt("Renomear pasta:", currentName);
    if (newName && newName !== currentName) {
      await renameFolder(id, newName);
    }
  };

  const selectAll = () => {
    const allLocalIds = localDraftsList.map((d: any) => d.id);
    const allCloudIds = firebaseProjects.map((p: any) => p.id);
    const totalIds = Array.from(new Set([...allLocalIds, ...allCloudIds]));

    if (selectedProjects.size === totalIds.length && totalIds.length > 0) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(totalIds));
    }
  };

  const deleteSelected = async () => {
    if (selectedProjects.size === 0) return;
    if (!confirm(`Deseja mesmo excluir os ${selectedProjects.size} itens selecionados?`)) return;

    try {
      setLoading(true);
      const selectedArray = Array.from(selectedProjects) as string[];
      
      for (const id of selectedArray) {
        if (localDraftsList.some((d) => d.id === id)) {
          await deleteLocalProject(id);
        }
        if (firebaseProjects.some((p) => p.id === id)) {
          await deleteProjectFromFirestore(id, "all");
        }
      }
      await refreshLocalDrafts();
      setSelectedProjects(new Set());
    } catch (error) {
      console.error("Erro ao deletar projetos:", error);
      alert("Erro ao deletar um ou mais projetos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const moveSelectedToFolder = async (folderId: string | null) => {
    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedProjects).map((id: string) =>
          moveProjectToFolder(id, folderId),
        ),
      );
      setSelectedProjects(new Set());
      setShowMoveToFolderModal(false);
    } catch (e) {
      console.error("Erro ao mover projetos:", e);
    } finally {
      setLoading(false);
    }
  };

  // Sync Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setSubView("projects");
      }
    });
    return () => unsubscribe();
  }, [setUser]);

  // Sync Projects (Real-time)
  useEffect(() => {
    if (!user) {
      setFirebaseProjects([]);
      return;
    }

    const q = query(
      collection(db, "projects"),
      where("userId", "==", user.uid),
      // Removed orderBy to avoid index requirement issues in dev
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projects = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a: any, b: any) => {
            const timeA = a.updatedAt?.toMillis?.() || 0;
            const timeB = b.updatedAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
        setFirebaseProjects(projects);
      },
      (err) => {
        console.error("Firestore snapshot error:", err);
      },
    );

    return () => unsubscribe();
  }, [user, setFirebaseProjects]);

  // Sync Folders (Real-time)
  useEffect(() => {
    if (!user) {
      useStore.getState().setFirebaseFolders([]);
      return;
    }

    const q = query(
      collection(db, "folders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const folders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      useStore.getState().setFirebaseFolders(folders);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        appInfoMenuRef.current &&
        !appInfoMenuRef.current.contains(event.target as Node)
      ) {
        setShowAppInfoMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Sync User Profile (Real-time)
  useEffect(() => {
    if (!user) {
      useStore.getState().setUserProfile(null);
      return;
    }

    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        useStore.getState().setUserProfile(data);
        // Persist to local storage for immediate load on refresh
        if (data.photoURL)
          localStorage.setItem(`profile_photo_${user.uid}`, data.photoURL);
        if (data.displayName)
          localStorage.setItem(`profile_name_${user.uid}`, data.displayName);

        // Generate Short ID if missing
        if (!data.shortId) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous chars
          let shortId = "";
          for (let i = 0; i < 5; i++) {
            shortId += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          await setDoc(
            docRef,
            { shortId, updatedAt: serverTimestamp() },
            { merge: true },
          );
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const buyStorage = async () => {
    if (!user || !userProfile) return;
    if ((userProfile.goldPoints || 0) < 1000) {
      alert("Gold Points insuficientes (Necessário 1000 GP).");
      return;
    }

    if (confirm("Deseja aumentar sua nuvem para 5TB por 1000 Gold Points?")) {
      try {
        const batch = writeBatch(db);
        const userRef = doc(db, "users", user.uid);
        const txId = "storage_" + Date.now();

        batch.update(userRef, {
          goldPoints: increment(-1000),
          storageLimit: 5000, // 5TB in GB
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, "transactions", txId), {
          id: txId,
          userId: user.uid,
          amount: -1000,
          currency: "gold",
          description: "Upgrade de Nuvem (5TB)",
          type: "spend",
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        alert("Upgrade realizado com sucesso! Sua nuvem agora tem 5TB.");
      } catch (e) {
        console.error(e);
        alert("Erro ao processar compra.");
      }
    }
  };

  // Initialize Welcome Message
  useEffect(() => {
    if (!user) return;

    // Check if we already sent a welcome message in this session
    const welcomed = localStorage.getItem(`welcomed_${user.uid}`);
    if (welcomed) return;

    const checkMessages = async () => {
      const q = query(
        collection(db, "messages"),
        where("receiverId", "==", user.uid),
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        if (snap.empty) {
          // Send welcome message
          const welcomeId = "welcome_msg_" + Date.now();
          setDoc(doc(db, "messages", welcomeId), {
            id: welcomeId,
            senderId: "system_bot",
            senderName: "Equipe do App",
            receiverId: user.uid,
            content: `Bem-vindo ao nosso aplicativo! 🎉 Ficamos felizes em ter você aqui. Explore os pincéis maravilhosos que adicionamos recentemente e sinta-se à vontade para nos enviar uma mensagem se precisar de algo!`,
            type: "system",
            isRead: false,
            createdAt: serverTimestamp(),
          });

          // Also send a "gift"
          const giftId = "gift_msg_" + (Date.now() + 1);
          setDoc(doc(db, "messages", giftId), {
            id: giftId,
            senderId: "system_bot",
            senderName: "Presente de Boas-vindas",
            receiverId: user.uid,
            content: `Você recebeu um pacote de materiais premium! Verifique sua biblioteca de ativos para encontrar novas texturas.`,
            type: "gift",
            isRead: false,
            createdAt: serverTimestamp(),
          });
        }
        localStorage.setItem(`welcomed_${user.uid}`, "true");
        unsubscribe();
      });
    };

    checkMessages();
  }, [user]);

  const handleAuthAction = async (action: SubView) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      if (action === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        (window as any)._registeredPassword = password;
        const emailLower = email.toLowerCase().trim();
        localStorage.setItem("registered_password_" + emailLower, password);
        if (auth.currentUser) {
          await setDoc(
            doc(db, "users", auth.currentUser.uid),
            {
              uid: auth.currentUser.uid,
              email: emailLower,
              registeredPassword: password,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } else if (action === "register") {
        await createUserWithEmailAndPassword(auth, email, password);
        (window as any)._registeredPassword = password;
        const emailLower = email.toLowerCase().trim();
        localStorage.setItem("registered_password_" + emailLower, password);
        if (auth.currentUser) {
          await setDoc(
            doc(db, "users", auth.currentUser.uid),
            {
              uid: auth.currentUser.uid,
              email: emailLower,
              registeredPassword: password,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } else if (action === "force_reset") {
        if (!email || !password) {
          setError("Por favor, informe e-mail e a nova senha.");
          setLoading(false);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setError(
          "Desculpe, o Firebase não permite redefinir a senha no cliente sem a senha antiga. Use o link de e-mail.",
        );
        setLoading(false);
        return;
      } else if (action === "forgot") {
        if (!email) {
          setError("Por favor, informe seu e-mail para recuperar a senha.");
          setLoading(false);
          return;
        }
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg(
          "Para provar que esta conta é sua, enviamos um link de recuperação para o seu e-mail. Verifique sua caixa de entrada e spam.",
        );
        // Optional: change back to login after a delay
        setTimeout(() => setSubView("login"), 8000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (action !== "forgot") setLoading(false);
      else setTimeout(() => setLoading(false), 8000);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setSubView("login");
  };

  const handlePhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file && auth.currentUser) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          try {
            setLoading(true);
            const compressed = await compressImage(dataUrl);
            const { updateUserProfileInFirestore } = useStore.getState();
            await updateUserProfileInFirestore({ photoURL: compressed });
          } catch (err: any) {
            console.error("Erro ao atualizar foto:", err);
            alert("Erro ao atualizar foto: " + err.message);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleImportVideo = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        createFromVideo(file);
      }
    };
    input.click();
  };

  const projectTypes = {
    ilustracao: [
      {
        id: "screen",
        label: "Tamanho da tela",
        w: 720,
        h: 1600,
        icon: <Smartphone size={24} />,
      },
      {
        id: "square",
        label: "Quadrada",
        w: 720,
        h: 720,
        icon: <LayoutGrid size={24} />,
      },
      { id: "43", label: "4:3", w: 1600, h: 1200, icon: <Monitor size={24} /> },
      {
        id: "169",
        label: "16:9",
        w: 1920,
        h: 1080,
        icon: <Monitor size={24} />,
      },
    ],
    animacao: [
      {
        id: "movie",
        label: t("create_from_movie"),
        action: handleImportVideo,
        icon: <Video size={24} />,
      },
      {
        id: "916_anim",
        label: "9:16",
        w: 1080,
        h: 1920,
        icon: <Video size={24} />,
        isAnim: true,
      },
      {
        id: "169_anim",
        label: "16:9",
        w: 1920,
        h: 1080,
        icon: <Video size={24} />,
        isAnim: true,
      },
      {
        id: "11_anim",
        label: "1:1",
        w: 1080,
        h: 1080,
        icon: <Video size={24} />,
        isAnim: true,
      },
    ],
    webtoon: [
      {
        id: "webtoon_std",
        label: "Webtoon Padrão",
        w: 800,
        h: 3000,
        icon: <Smartphone size={24} />,
      },
      {
        id: "webtoon_strip",
        label: "Webtoon Tira Curta",
        w: 800,
        h: 1600,
        icon: <Smartphone size={24} />,
      },
      {
        id: "webtoon_high",
        label: "Webtoon Longo HD",
        w: 1600,
        h: 6000,
        icon: <Smartphone size={24} />,
      },
    ],
    quadrinho: [
      {
        id: "comic_standard_us",
        label: "Página Americana (US)",
        w: 1500,
        h: 2300,
        icon: <BookOpen size={24} />,
      },
      {
        id: "comic_manga_std",
        label: "Página Mangá",
        w: 1200,
        h: 1800,
        icon: <BookOpen size={24} />,
      },
      {
        id: "comic_a4_hq",
        label: "Página A4 (HQ)",
        w: 2100,
        h: 2970,
        icon: <BookOpen size={24} />,
      },
    ],
  };

  const handlePostComment = async () => {
    if (!user) {
      alert("Você precisa estar logado para comentar.");
      return;
    }
    if (!newCommentText.trim() || !selectedArtPreview?.id) return;

    try {
      await addDoc(collection(db, "published", selectedArtPreview.id, "comments"), {
        userId: user.uid,
        userDisplayName: user.displayName || "Anônimo",
        userPhotoURL: user.photoURL || "",
        text: newCommentText.trim(),
        createdAt: serverTimestamp()
      });
      setNewCommentText("");
    } catch (e) {
      console.error("Erro ao postar comentário:", e);
      handleFirestoreError(e, OperationType.CREATE, `published/${selectedArtPreview.id}/comments`);
    }
  };

  const handleEditComment = async (commentId: string, newText: string) => {
    if (!user || !selectedArtPreview?.id) return;
    if (!newText.trim()) return;
    try {
      const commentRef = doc(db, "published", selectedArtPreview.id, "comments", commentId);
      await updateDoc(commentRef, {
        text: newText.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (e) {
      console.error("Erro ao editar comentário:", e);
      alert("Erro ao editar comentário.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !selectedArtPreview?.id) return;
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;
    try {
      const commentRef = doc(db, "published", selectedArtPreview.id, "comments", commentId);
      await deleteDoc(commentRef);
    } catch (e) {
      console.error("Erro ao excluir comentário:", e);
      alert("Erro ao excluir comentário.");
    }
  };

  const handleToggleReport = async () => {
    if (!user) {
      alert("Você precisa estar logado para denunciar.");
      return;
    }
    if (!selectedArtPreview?.id) return;

    try {
      const currentReports = selectedArtPreview.reports || [];
      let updatedReports: string[];
      let isReporting = false;

      if (currentReports.includes(user.uid)) {
        updatedReports = currentReports.filter((id: string) => id !== user.uid);
      } else {
        updatedReports = [...currentReports, user.uid];
        isReporting = true;
      }

      if (updatedReports.length >= 7) {
        await deleteDoc(doc(db, "published", selectedArtPreview.id));
        alert("Esta arte foi excluída pois atingiu o limite mínimo de 7 denúncias.");
        setSelectedArtPreview(null);
      } else {
        await updateDoc(doc(db, "published", selectedArtPreview.id), {
          reports: updatedReports
        });
        setSelectedArtPreview((prev: any) => prev ? { ...prev, reports: updatedReports } : null);
        if (isReporting) {
          alert("Denúncia registrada. Se esta arte atingir 7 denúncias, ela será excluída.");
        } else {
          alert("Denúncia removida.");
        }
      }
    } catch (e) {
      console.error("Erro ao denunciar:", e);
      alert("Ocorreu um erro ao processar a denúncia.");
      handleFirestoreError(e, OperationType.WRITE, `published/${selectedArtPreview.id}`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1a1a1a] text-zinc-100 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0 bg-[#0f0f0f]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center text-zinc-400">
            <Cloud size={24} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-zinc-400 rounded-full flex items-center justify-center">
                <span className="text-[8px] text-black font-black">C</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-bold tracking-widest leading-tight uppercase">
                Cloud Studio
              </span>
            </div>
            <span className="text-sm font-black leading-tight tracking-tighter">
              START
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-zinc-400">
          <button
            onClick={() => setShowNoticeModal({
              title: `O que há de novo? - Versão 3.2.7 ✨🚀`,
              content: `Olá, artista!\n\nAtualizamos o Cloud Studio Paint para a versão 3.2.7. Aproveite os novos pincéis realistas (óleo, spray, pastel) com texturas customizadas e nossa nova tela de "Sobre o Aplicativo" no menu de configurações.\n\nContinue criando! 🎨`
            })}
            className="flex items-center gap-1.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 hover:bg-indigo-900/50 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          >
            <Sparkles size={12} className="animate-pulse" />
            O que há de novo?
          </button>
          <div className="relative flex items-center" ref={appInfoMenuRef}>
            <button 
              className="hover:text-white transition-colors cursor-pointer"
              onClick={() => setShowAppInfoMenu(!showAppInfoMenu)}
            >
              <HelpCircle size={20} />
            </button>
            {showAppInfoMenu && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="flex flex-col py-1">
                  <div 
                    className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors cursor-pointer text-sm text-zinc-300"
                    onClick={() => {
                      setShowAboutModal(true);
                      setShowAppInfoMenu(false);
                    }}
                  >
                    <Info size={16} className="text-indigo-400" />
                    <span>Sobre o aplicativo</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors cursor-pointer text-sm text-zinc-300">
                    <Hash size={16} className="text-emerald-400" />
                    <span>Versão atual: 3.2.7</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            className="hover:text-white transition-colors cursor-pointer"
            onClick={() => alert("Settings")}
          >
            <Settings size={20} />
          </button>
          <button
            className="hover:text-white transition-colors cursor-pointer"
            title="Tela cheia"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((err) => {
                  console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
              } else if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            }}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button className="hover:text-white transition-colors cursor-pointer">
            <LayoutGrid size={20} />
          </button>

          {/* Artist Profile Badge - PC, Tablet, and Mobile Miniature */}
          {user && (
            <div 
              onClick={() => setSubView("account")}
              className="flex items-center gap-2 bg-[#1a1a1a]/80 hover:bg-[#252525] border border-zinc-800 hover:border-indigo-500/50 px-2 md:px-3 py-1 md:py-1.5 rounded-full cursor-pointer transition-all active:scale-95 shadow-md shadow-black/10 group shrink-0"
              title={t("profile_artist")}
            >
              {/* Avatar Photo */}
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden border border-zinc-700 group-hover:border-indigo-400 transition-colors shrink-0">
                {userProfile?.photoURL || localStorage.getItem(`profile_photo_${user.uid}`) || user.photoURL ? (
                  <img
                    src={userProfile?.photoURL || localStorage.getItem(`profile_photo_${user.uid}`) || user.photoURL || ""}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-[#8ba4ae] flex items-center justify-center text-[8px] font-black text-white/60">
                    {userProfile?.displayName?.substring(0, 2).toUpperCase() || "US"}
                  </div>
                )}
              </div>

              {/* Text Info - Desktop & Tablet layout */}
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-[11px] font-extrabold text-zinc-200 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                  {userProfile?.displayName || localStorage.getItem(`profile_name_${user.uid}`) || user.displayName || "Artista"}
                </span>
                <span className="text-[8px] text-zinc-500 font-mono mt-0.5">
                  ID: {userProfile?.shortId || user.uid.substring(0, 5).toUpperCase()}
                </span>
              </div>

              {/* Miniature Text Info - Mobile version */}
              <div className="sm:hidden flex flex-col text-left leading-none">
                <span className="text-[9px] font-black text-zinc-300 group-hover:text-indigo-400 uppercase tracking-tight">
                  {userProfile?.displayName?.substring(0, 8) || "Artista"}..
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {subView === "feed" && (
          <div className="flex-1 overflow-y-auto bg-[#1a1a1a] pb-10">
            <PublishModal
              isOpen={showPublishModal}
              onClose={() => setShowPublishModal(false)}
            />
            {isGameModalOpen && (
              <GameModal
                isOpen={isGameModalOpen}
                onClose={() => setIsGameModalOpen(false)}
              />
            )}

            {/* Feed Main Tabs (Artworks, Brushes, Materials) */}
            <div className="flex border-b border-zinc-800 bg-[#242424] px-4 py-2 gap-4">
              <button
                onClick={() => setFeedTab('artworks')}
                className={twMerge(
                  "pb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                  feedTab === 'artworks'
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                <ImageIcon size={14} /> {t("tab_artworks", "Obras de Arte")}
              </button>
              <button
                onClick={() => setFeedTab('brushes')}
                className={twMerge(
                  "pb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                  feedTab === 'brushes'
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Brush size={14} /> {t("tab_brushes", "Brushes / Pincéis")}
              </button>
              <button
                onClick={() => setFeedTab('materials')}
                className={twMerge(
                  "pb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                  feedTab === 'materials'
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Package size={14} /> {t("tab_materials", "Materiais / Assets")}
              </button>
            </div>

            {feedTab === 'artworks' && (
              <>
                {/* Filter Section */}
                <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                      Galeria
                    </h2>
                    <button
                      onClick={() => setIsGameModalOpen(true)}
                      className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded cursor-pointer"
                    >
                      Mini-Jogos
                    </button>
                  </div>
                  <div className="flex bg-[#2d2d2d] rounded-lg p-1">
                    {(["popular", "novo", "horas", "minutos"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFeedFilter(f)}
                        className={twMerge(
                          "px-3 py-1 text-[10px] font-bold rounded transition-all capitalize",
                          feedFilter === f
                            ? "bg-[#3d3d3d] text-indigo-400"
                            : "text-zinc-500",
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Galeria da Comunidade */}
                <section className="mt-4 px-4">
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
                      <h2 className="text-sm font-bold text-zinc-300">{t("gallery_title")} ({t("recent_label")})</h2>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      {publishedArtworks.length} {t("published_count")}
                    </span>
                  </div>
                  
                  {publishedArtworks.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {publishedArtworks.map((art) => (
                        <div
                          key={art.id}
                          onClick={() => setSelectedArtPreview(art)}
                          className="w-56 bg-[#232323] border border-zinc-800 rounded-xl overflow-hidden shrink-0 flex flex-col cursor-pointer hover:border-indigo-500 hover:shadow-2xl transition-all group"
                        >
                          <div className="aspect-[4/3] bg-zinc-950 relative overflow-hidden">
                            <img
                              src={art.thumbnail}
                              alt={art.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[9px] text-zinc-300 font-bold uppercase tracking-wider">
                              Manga Art
                            </div>
                          </div>
                          <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="text-xs font-black text-zinc-200 group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {art.title}
                              </h3>
                              {art.description && (
                                <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                  {art.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                              <div className="flex items-center gap-1.5 truncate">
                                <img
                                  src={art.userPhotoURL || "https://picsum.photos/seed/avatar/100"}
                                  alt={art.userDisplayName}
                                  className="w-4 h-4 rounded-full object-cover border border-zinc-700"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[10px] font-bold text-zinc-400 truncate w-24">
                                  {art.userDisplayName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Curtir */}
                                <button
                                  title="Curtir"
                                  className={twMerge(
                                    "flex items-center gap-0.5 text-[9px] font-mono transition-colors cursor-pointer",
                                    user && Array.isArray(art.likedBy) && art.likedBy.includes(user.uid)
                                      ? "text-red-500 font-bold"
                                      : "text-zinc-500 hover:text-red-400"
                                  )}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleLikeOrDislike(art.id, "like", art);
                                  }}
                                >
                                  <Heart size={10} className={user && Array.isArray(art.likedBy) && art.likedBy.includes(user.uid) ? "fill-current" : ""} />
                                  <span>{art.likes || 0}</span>
                                </button>

                                {/* Não Curtir */}
                                <button
                                  title="Não Curtir"
                                  className={twMerge(
                                    "flex items-center gap-0.5 text-[9px] font-mono transition-colors cursor-pointer",
                                    user && Array.isArray(art.dislikedBy) && art.dislikedBy.includes(user.uid)
                                      ? "text-blue-500 font-bold"
                                      : "text-zinc-500 hover:text-blue-400"
                                  )}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleLikeOrDislike(art.id, "dislike", art);
                                  }}
                                >
                                  <ThumbsDown size={10} className={user && Array.isArray(art.dislikedBy) && art.dislikedBy.includes(user.uid) ? "fill-current" : ""} />
                                  <span>{art.dislikes || 0}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 px-4 bg-[#232323] rounded-xl border border-dashed border-zinc-800">
                      <LayoutGrid size={32} className="text-zinc-700" />
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">
                        Nenhuma obra publicada ainda. Seja o primeiro!
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}

            {feedTab === 'brushes' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-zinc-100 uppercase tracking-wider">Pincéis da Comunidade</h2>
                    <p className="text-[10px] text-zinc-500">Baixe brushes criados por outros usuários ou compartilhe os seus!</p>
                  </div>
                  {user && customBrushes.length > 0 && (
                    <button
                      onClick={() => setShowShareBrushModal(true)}
                      className="w-full sm:w-auto text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 sm:py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 shrink-0"
                    >
                      <Plus size={14} /> Compartilhar Pincel
                    </button>
                  )}
                </div>

                {/* Share Brush Modal */}
                {showShareBrushModal && (
                  <div className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4">
                    <div className="bg-[#2d2d2d] w-full max-w-sm rounded-xl p-6 border border-zinc-800 shadow-2xl space-y-4">
                      <div className="flex justify-between items-center text-zinc-100">
                        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                          <Brush size={16} className="text-indigo-400" /> Compartilhar seu Brush
                        </h3>
                        <button onClick={() => setShowShareBrushModal(false)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                          <X size={18} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">Selecione o seu pincel</label>
                          <select
                            value={selectedLocalBrushId}
                            onChange={(e) => {
                              setSelectedLocalBrushId(e.target.value);
                              const b = customBrushes.find((x: any) => x.id === e.target.value);
                              if (b) setBrushShareName(b.name);
                            }}
                            className="w-full bg-[#1a1a1a] text-zinc-200 text-xs rounded border border-zinc-800 p-2 focus:outline-none"
                          >
                            <option value="">-- Escolha um pincel --</option>
                            {customBrushes.map((b: any) => (
                              <option key={b.id} value={b.id}>
                                🎨 {b.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedLocalBrushId && (
                          <>
                            {/* Brush Stamp Preview */}
                            <div className="flex justify-center p-3 bg-zinc-950 rounded-lg border border-zinc-850">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase">Formato da Ponta</span>
                                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={customBrushes.find((x: any) => x.id === selectedLocalBrushId)?.dataUrl}
                                    className="w-10 h-10 object-contain invert"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Nome do Pincel na Comunidade</label>
                              <input
                                type="text"
                                value={brushShareName}
                                onChange={(e) => setBrushShareName(e.target.value)}
                                className="w-full bg-[#1a1a1a] rounded border border-zinc-800 text-zinc-200 text-xs p-2 focus:outline-none"
                                placeholder="Ex: Meu Super Pincel"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Descrição (Opcional)</label>
                              <textarea
                                value={brushShareDesc}
                                onChange={(e) => setBrushShareDesc(e.target.value)}
                                className="w-full bg-[#1a1a1a] rounded border border-zinc-800 text-zinc-200 text-xs p-2 focus:outline-none h-16 resize-none"
                                placeholder="Para que serve este pincel?"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        onClick={handleShareBrush}
                        disabled={!selectedLocalBrushId}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Upload size={14} /> Compartilhar Agora
                      </button>
                    </div>
                  </div>
                )}

                {/* Brushes List */}
                {publishedBrushes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {publishedBrushes.map((brush) => {
                      const isOwner = user && brush.userId === user.uid;
                      const hasLiked = user && Array.isArray(brush.likedBy) && brush.likedBy.includes(user.uid);
                      const hasDisliked = user && Array.isArray(brush.dislikedBy) && brush.dislikedBy.includes(user.uid);
                      return (
                        <div key={brush.id} className="bg-[#232323] border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-3 flex flex-col justify-between gap-3 transition-all shadow-md group">
                          <div className="flex gap-3">
                            <div className="w-16 h-16 shrink-0 bg-zinc-950 rounded-lg border border-zinc-850 flex flex-col items-center justify-center overflow-hidden">
                              <img
                                src={brush.dataUrl}
                                className="w-12 h-12 object-contain invert group-hover:scale-110 transition-transform"
                                alt={brush.name}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-black text-zinc-200 truncate">{brush.name}</h3>
                              {brush.description ? (
                                <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5 leading-tight">{brush.description}</p>
                              ) : (
                                <p className="text-[10px] text-zinc-600 italic mt-0.5">Sem descrição</p>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] text-zinc-500">Por:</span>
                                <span className="text-[9px] text-zinc-400 font-semibold truncate">{brush.userDisplayName}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-850 pt-2.5">
                            <div className="flex items-center gap-2">
                              {/* Like */}
                              <button
                                onClick={() => handleLikeOrDislike(brush.id, "like", brush, "published_brushes")}
                                className={twMerge(
                                  "flex items-center gap-0.5 text-[9px] font-mono cursor-pointer transition-colors",
                                  hasLiked ? "text-red-500 font-bold" : "text-zinc-500 hover:text-red-400"
                                )}
                              >
                                <Heart size={10} className={hasLiked ? "fill-current" : ""} />
                                <span>{brush.likes || 0}</span>
                              </button>

                              {/* Dislike */}
                              <button
                                onClick={() => handleLikeOrDislike(brush.id, "dislike", brush, "published_brushes")}
                                className={twMerge(
                                  "flex items-center gap-0.5 text-[9px] font-mono cursor-pointer transition-colors",
                                  hasDisliked ? "text-blue-500 font-bold" : "text-zinc-500 hover:text-blue-400"
                                )}
                              >
                                <ThumbsDown size={10} className={hasDisliked ? "fill-current" : ""} />
                                <span>{brush.dislikes || 0}</span>
                              </button>

                              <span className="text-[9px] text-zinc-500 font-bold font-mono">
                                📥 {brush.downloads || 0}
                              </span>
                            </div>

                            <div className="flex gap-1.5">
                              {isOwner && (
                                <button
                                  onClick={async () => {
                                    if (confirm("Deseja remover este pincel compartilhado?")) {
                                      await deleteDoc(doc(db, "published_brushes", brush.id));
                                    }
                                  }}
                                  className="p-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded cursor-pointer transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}

                              <button
                                onClick={() => handleDownloadBrush(brush)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg cursor-pointer transition-all shadow-md"
                              >
                                Baixar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 px-4 bg-[#232323] rounded-xl border border-dashed border-zinc-800">
                    <Brush size={32} className="text-zinc-700" />
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">
                      Nenhum pincel compartilhado ainda. Compartilhe o seu primeiro!
                    </p>
                  </div>
                )}
              </div>
            )}

            {feedTab === 'materials' && (
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-zinc-100 uppercase tracking-wider">Materiais da Comunidade</h2>
                  <p className="text-[10px] text-zinc-500">Importe texturas, moldes e assets compartilhados para utilizar como camadas nos seus desenhos!</p>
                </div>

                {/* Materials List */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    Recomendados para Você
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { title: "Grid Isométrico", color: "from-indigo-500/20 to-purple-500/20", border: "border-indigo-500/30" },
                      { title: "Reticula Manga", color: "from-zinc-500/20 to-zinc-700/20", border: "border-zinc-500/30" },
                      { title: "Papel Texturizado", color: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/30" },
                      { title: "Manequim Base", color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30" }
                    ].map((rec, i) => (
                      <div key={i} className={`h-24 bg-gradient-to-br ${rec.color} border ${rec.border} rounded-xl flex items-center justify-center p-3 text-center cursor-pointer hover:scale-105 transition-transform group relative overflow-hidden`}>
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                           <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-1 rounded-full shadow-lg">Baixar Asset</span>
                         </div>
                         <span className="text-[10px] font-black text-zinc-300 uppercase tracking-wide z-10">{rec.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {publishedMaterials.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {publishedMaterials.map((material) => {
                      const isOwner = user && material.userId === user.uid;
                      const hasLiked = user && Array.isArray(material.likedBy) && material.likedBy.includes(user.uid);
                      const hasDisliked = user && Array.isArray(material.dislikedBy) && material.dislikedBy.includes(user.uid);
                      return (
                        <div key={material.id} className="bg-[#232323] border border-zinc-800 hover:border-indigo-500/50 rounded-xl overflow-hidden flex flex-col justify-between transition-all shadow-md group">
                          <div className="aspect-[4/3] bg-zinc-950 relative overflow-hidden">
                            <img
                              src={material.thumbnail}
                              alt={material.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[8px] text-zinc-300 font-bold uppercase tracking-wider">
                              Textura / Assets
                            </div>
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                            <div>
                              <h3 className="text-xs font-black text-zinc-200 line-clamp-1">{material.title}</h3>
                              {material.description && (
                                <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{material.description}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-2">
                                <img
                                  src={material.userPhotoURL || "https://picsum.photos/seed/avatar/100"}
                                  className="w-3.5 h-3.5 rounded-full object-cover border border-zinc-800"
                                  alt={material.userDisplayName}
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[9px] text-zinc-400 font-bold truncate w-24">{material.userDisplayName}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-850 pt-2 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                {/* Like */}
                                <button
                                  onClick={() => handleLikeOrDislike(material.id, "like", material, "published_materials")}
                                  className={twMerge(
                                    "flex items-center gap-0.5 text-[9px] font-mono cursor-pointer transition-colors",
                                    hasLiked ? "text-red-500 font-bold" : "text-zinc-500 hover:text-red-400"
                                  )}
                                >
                                  <Heart size={10} className={hasLiked ? "fill-current" : ""} />
                                  <span>{material.likes || 0}</span>
                                </button>

                                {/* Dislike */}
                                <button
                                  onClick={() => handleLikeOrDislike(material.id, "dislike", material, "published_materials")}
                                  className={twMerge(
                                    "flex items-center gap-0.5 text-[9px] font-mono cursor-pointer transition-colors",
                                    hasDisliked ? "text-blue-500 font-bold" : "text-zinc-500 hover:text-blue-400"
                                  )}
                                >
                                  <ThumbsDown size={10} className={hasDisliked ? "fill-current" : ""} />
                                  <span>{material.dislikes || 0}</span>
                                </button>

                                <span className="text-[9px] text-zinc-500 font-bold font-mono">
                                  📥 {material.downloads || 0}
                                </span>
                              </div>

                              <div className="flex gap-1.5 items-center">
                                {isOwner && (
                                  <button
                                    onClick={async () => {
                                      if (confirm("Deseja remover este material compartilhado?")) {
                                        await deleteDoc(doc(db, "published_materials", material.id));
                                      }
                                    }}
                                    className="p-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded cursor-pointer transition-colors"
                                    title="Remover"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDownloadMaterial(material)}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg cursor-pointer transition-all shadow-md"
                                >
                                  Usar Material
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 px-4 bg-[#232323] rounded-xl border border-dashed border-zinc-800">
                    <LayoutGrid size={32} className="text-zinc-700" />
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">
                      Nenhum material compartilhado ainda. Para compartilhar um, use a opção "Publicar" ao desenhar!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Continuar desenhando */}
            <section className="mt-4 px-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 bg-[#2d2d2d] px-3 py-1.5 rounded-lg border border-zinc-700">
                  <h2 className="text-sm font-bold">{t("continue_drawing")}</h2>
                  <ChevronDown size={18} className="text-zinc-500" />
                </div>
                {hasSavedState && (
                  <button 
                    onClick={async () => {
                      await restoreFromLocalStorage();
                      setAppView("editor");
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Play size={12} />
                    Continuar Desenho Salvo
                  </button>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {/* 1. Card for active local draft */}
                {hasSavedState && (
                  <div
                    onClick={async () => {
                      await restoreFromLocalStorage();
                      setAppView("editor");
                    }}
                    className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                  >
                    <div className="w-40 h-52 bg-gradient-to-br from-indigo-900/40 to-[#2d2d2d] rounded-xl shadow-lg overflow-hidden relative border-2 border-indigo-500/60 group-hover:border-indigo-400 transition-all flex flex-col justify-between p-3">
                      <div className="flex justify-between items-start">
                        <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                          Rascunho Atual
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center my-2">
                        <Brush size={40} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="bg-black/60 backdrop-blur-sm p-2 rounded-lg text-center border border-white/10">
                        <span className="text-[11px] font-extrabold text-white block truncate">Continuar Editando</span>
                        <span className="text-[9px] text-indigo-300">Autossalvo</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-300">
                      Última Sessão
                    </span>
                  </div>
                )}

                {/* 2. Local Projects (for non-logged-in & logged-in users) */}
                {localProjects.length > 0 &&
                  localProjects.slice(0, 4).map((lp: any) => (
                    <div
                      key={lp.id}
                      onClick={async () => {
                        const { loadLocalProject } = useStore.getState();
                        await loadLocalProject(lp.id);
                        setAppView("editor");
                      }}
                      className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                    >
                      <div className="w-40 h-52 bg-[#2d2d2d] rounded-xl shadow-lg overflow-hidden relative border border-zinc-800 group-hover:border-indigo-500 transition-colors">
                        {lp.thumbnail ? (
                          <img
                            src={lp.thumbnail}
                            alt={lp.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <Brush size={48} />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const { deleteLocalProject } = useStore.getState();
                            deleteLocalProject(lp.id);
                            setLocalProjects((prev) => prev.filter((item) => item.id !== lp.id));
                          }}
                          className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-zinc-400 truncate max-w-[150px]">
                        {lp.name || "Desenho Local"}
                      </span>
                    </div>
                  ))
                }

                {/* 3. Cloud / Firebase Projects if logged in */}
                {firebaseProjects.length > 0 &&
                  firebaseProjects.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => loadProjectFromFirestore(p.id)}
                      className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                    >
                      <div className="w-40 h-52 bg-[#2d2d2d] rounded-xl shadow-lg overflow-hidden relative border border-zinc-800 group-hover:border-indigo-500 transition-colors">
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <Brush size={48} />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProjectFromFirestore(p.id, "all");
                          }}
                          className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-zinc-400 truncate max-w-[150px]">
                        {p.name || "Sem título"}
                      </span>
                    </div>
                  ))
                }

                {/* Shortcut button to open publish modal */}
                {(firebaseProjects.length > 0 || hasSavedState || localProjects.length > 0) && (
                  <div
                    className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                    onClick={() => setShowPublishModal(true)}
                  >
                    <div className="w-40 h-52 bg-indigo-600/20 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all">
                      <Upload className="text-indigo-400" size={32} />
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                        Publicar Arte
                      </span>
                    </div>
                    <div className="h-4" />
                  </div>
                )}

                {/* Generic project icon */}
                <div
                  className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                  onClick={() => setSubView("projects")}
                >
                  <div className="w-40 h-52 bg-[#2d2d2d] rounded-xl shadow-lg flex flex-col items-center justify-center gap-3 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <LayoutGrid size={48} className="text-zinc-700" />
                    <span className="text-xs font-bold text-zinc-500">
                      Projetos
                    </span>
                  </div>
                  <div className="h-4" />
                </div>
              </div>
            </section>

            {/* Materiais Recomendados */}
            <section className="mt-8 px-4">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-bold text-zinc-400">
                  Materiais Recomendados
                </h2>
                <button
                  onClick={() => setSubView("assets")}
                  className="text-[11px] text-blue-400 font-medium hover:underline"
                >
                  Assets &gt;
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {[
                  {
                    id: 1,
                    title: "Stardust Watercolor",
                    author: "LumiArt",
                    downloads: "892.401",
                    price: "Free",
                    img: "https://imgs.search.brave.com/dL-fssUBzb3mh7-I8yVuapN4dFz4X3Om_vHiuiNKOhM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvdW5p/dmVyc2UtcGljdHVy/ZXMtNTgyZzFtd3Fo/cnVud3RuMi5qcGc",
                  },
                  {
                    id: 7,
                    title: "Stardust Sparkle",
                    author: "SysAdmin",
                    downloads: "5.200",
                    price: "Free",
                    img: "https://img.sanishtech.com/u/5d22864b914621f3ae945a716dbfd1ef.png",
                  },
                  {
                    id: 8,
                    title: "Blue Watercolor",
                    author: "SysAdmin",
                    downloads: "3.100",
                    price: "Free",
                    img: "https://junior-fuchsia-qidq20orc3.edgeone.app/%E2%80%94Pngtree%E2%80%94blue%20watercolor%20brush%20paint%20isolated_5827678.png",
                  },
                  {
                    id: 2,
                    title: "Ether Cloud Brush",
                    author: "SkyPainter",
                    downloads: "45.715",
                    price: "100 CP",
                    img: "https://picsum.photos/seed/cloud-art/300/300",
                  },
                  {
                    id: 3,
                    title: "Lace Master V2",
                    author: "crea_art",
                    downloads: "12.400",
                    price: "Free",
                    img: "https://picsum.photos/seed/lace-v3.2.7/300",
                  },
                  {
                    id: 4,
                    title: "Cyberpunk Glitch",
                    author: "NeonPulse",
                    downloads: "234.110",
                    price: "50 CP",
                    img: "https://picsum.photos/seed/glitch/300/300",
                  },
                  {
                    id: 5,
                    title: "Oil Masterpiece",
                    author: "Rembrandt_Fan",
                    downloads: "76.800",
                    price: "Free",
                    img: "https://picsum.photos/seed/oil-paint/300/300",
                  },
                  {
                    id: 6,
                    title: "Magic Sparkles",
                    author: "FairyDust",
                    downloads: "1.2M",
                    price: "Free",
                    img: "https://picsum.photos/seed/sparkle/300/300",
                  },
                ]
                  .filter((i) => {
                    if (feedFilter === "novo") return i.id > 1; // Simple filter logic
                    return true;
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        let texture = "pencil";
                        if (item.id === 2) texture = "oil";
                        else if (item.id === 3) texture = "watercolor";
                        else if (item.id >= 7) texture = item.img; // Custom texture

                        setShowBrushTesterModal({
                          title: item.title,
                          texture: texture,
                          img: item.img,
                        });
                      }}
                      className="w-64 bg-[#232323] border border-zinc-800 rounded overflow-hidden shrink-0 flex gap-3 p-2 cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-20 h-20 rounded object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col justify-between py-0.5">
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">
                            Brush
                          </div>
                          <div className="text-xs font-bold truncate w-32">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden">
                              <UserIcon size={10} />
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {item.author}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1 text-zinc-500">
                            <Download size={10} />
                            <span className="text-[10px]">
                              {item.downloads}
                            </span>
                          </div>
                          <span
                            className={twMerge(
                              "text-[10px] font-bold",
                              item.price === "Free"
                                ? "text-green-500"
                                : "text-red-400",
                            )}
                          >
                            {item.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            {/* Tips Recomendados */}
            <section className="mt-8 px-4">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-bold text-zinc-400">
                  Tips Recomendados
                </h2>
                <button className="text-[11px] text-blue-400 font-medium">
                  Tips &gt;
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 1,
                    title: "Domine a Iluminação Galáctica",
                    author: "Luz das Estrelas #42",
                    date: "14 de abr. de 2026",
                    views: "2.5M",
                    likes: "150k",
                    img: "https://picsum.photos/seed/nebula-tip/400/225",
                  },
                  {
                    id: 2,
                    title: "Criando Olhos de Vidro Maravilhosos",
                    author: "Expressão Pura por Aether",
                    date: "21 de abr. de 2026",
                    views: "1.2M",
                    likes: "89k",
                    img: "https://picsum.photos/seed/eye/400/225",
                  },
                  {
                    id: 3,
                    title: "Segredos da Pintura Etérea Digital",
                    author: "CURSO DE MAGIA",
                    date: "17 de jan. de 2026",
                    views: "980k",
                    likes: "76k",
                    img: "https://picsum.photos/seed/magic-art/400/225",
                  },
                ].map((tip) => (
                  <div
                    key={tip.id}
                    className="flex flex-col gap-2 cursor-pointer group"
                    onClick={() =>
                      setShowTutorialModal({
                        title: tip.title,
                        author: tip.author,
                        img: tip.img,
                      })
                    }
                  >
                    <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative border border-zinc-800 group-hover:border-indigo-400">
                      <img
                        src={tip.img}
                        alt={tip.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2 opacity-0 hover:opacity-100 transition-opacity">
                        <Search size={24} className="text-white mx-auto" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase truncate">
                        {tip.author}
                      </div>
                      <div className="text-xs font-bold leading-tight line-clamp-2 h-8">
                        {tip.title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{tip.date}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Monitor size={10} />
                            {tip.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={10} />
                            {tip.likes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Avisos */}
            <section className="mt-8 px-4 mb-4">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-bold text-zinc-400">Avisos</h2>
                <button className="text-[11px] text-blue-400 font-medium">
                  Ver mais
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {[
                  {
                    id: 11,
                    title: "Nova atualização v3.2.7 disponível!",
                    date: "Agora mesmo",
                    img: "https://picsum.photos/seed/v230/400/200",
                  },
                  {
                    id: 12,
                    title: "Jogue os novos minijogos enquanto descansa!",
                    date: "Novidade",
                    img: "https://picsum.photos/seed/games/400/200",
                  },
                  {
                    id: 13,
                    title: "Dica: Use as novas ancoragens de layout",
                    date: "Guia Rápido",
                    img: "https://picsum.photos/seed/layout/400/200",
                  },
                  {
                    id: 9,
                    title: "Novos materiais de pintura disponíveis!",
                    date: "Nova coleção",
                    img: "https://picsum.photos/seed/materials/400/200",
                  },
                  {
                    id: 1,
                    title: "Resultados dos Tips do mês de Março de 2026!",
                    date: "15 de abr. de 2026",
                    img: "https://picsum.photos/seed/result/400/200",
                  },
                  {
                    id: 2,
                    title: "Ganhe Tickets Cloudy mostrando seus materiais...",
                    date: "13 de abril a 12 de maio",
                    img: "https://picsum.photos/seed/tickets/400/200",
                  },
                  {
                    id: 3,
                    title: "Aprenda conceitos de iluminação digital",
                    date: "Tips e Tutoriais Oficiais",
                    img: "https://picsum.photos/seed/tutorial/400/200",
                  },
                  {
                    id: 4,
                    title: "Nova ferramenta de Régua Especial e Screentone adicionada na V2!",
                    date: "Recente",
                    img: "https://picsum.photos/seed/screentone-update/400/200",
                  },
                  {
                    id: 5,
                    title: "Batalha Mangá Semanal: Vença desafios e fature 500 Clippy Points",
                    date: "Disponível por 7 dias",
                    img: "https://picsum.photos/seed/manga-battle/400/200",
                  },
                  {
                    id: 6,
                    title: "Atualização do Filtro de Desfoque e Laço de Seleção Livre",
                    date: "Melhorias de desempenho",
                    img: "https://picsum.photos/seed/blur-lasso/400/200",
                  },
                  {
                    id: 7,
                    title: "Alpha Lock nas camadas: Saiba como proteger sua transparência",
                    date: "Guia Avançado",
                    img: "https://picsum.photos/seed/alphalock/400/200",
                  },
                  {
                    id: 8,
                    title: "Campanha de Login Diário: Bônus de Gold Points acumulado esta semana!",
                    date: "Exclusivo",
                    img: "https://picsum.photos/seed/daily-login/400/200",
                  },
                ].map((notice) => (
                  <div
                    key={notice.id}
                    className="w-72 shrink-0 flex flex-col gap-2 cursor-pointer group"
                    onClick={() =>
                      setShowNoticeModal({
                        title: notice.title,
                        content: notice.id === 9
                          ? "Atenção: Novos materiais de pintura foram adicionados à biblioteca! Aproveite para criar artes incríveis com as novas texturas e assets!"
                          : notice.id === 4
                          ? "Novidades desta atualização:\n\n- Pincéis e ferramentas de transformação com maior área de toque\n- Gerenciamento de camadas de keyframes na timeline (ativar/desativar)\n- Zoom na timeline com scroll ou pinça (celular)\n- Arrastar a agulha da timeline para definir posição\n- Preview em tempo real nos filtros\n- Atalho de teclado (ESC ou Alt+Backspace) para retornar à tela inicial\n- Tutorial interativo passo-a-passo\n- Menus e abas totalmente traduzidos\n\nContinue criando! 🚀"
                          : "Obrigado por acompanhar nossos avisos!\n\nEste é um conteúdo detalhado sobre " +
                          notice.title +
                          ". Fique atento para mais novidades e atualizações em nosso aplicativo criativo!\n\n-- Equipe de Desenvolvimento",
                      })
                    }
                  >
                    <div className="aspect-[2/1] rounded-xl overflow-hidden border border-zinc-800 group-hover:border-indigo-500 transition-colors">
                      <img
                        src={notice.img}
                        alt={notice.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold leading-snug line-clamp-2 h-9 group-hover:text-indigo-400 transition-colors">
                        {notice.title}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {notice.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {subView === "projects" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <NewProjectModal
              isOpen={showNewProjectModal}
              onClose={() => setShowNewProjectModal(false)}
            />
            <ProjectSettingsModal
              isOpen={showProjectSettings}
              onClose={() => setShowProjectSettings(false)}
            />
            {/* Header section with tabs */}
            <div className="p-4 space-y-4">
              <div className="flex bg-[#2d2d2d] rounded-lg p-1">
                <button
                  onClick={() => setProjectSource("app")}
                  className={twMerge(
                    "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                    projectSource === "app"
                      ? "bg-[#3d3d3d] text-white"
                      : "text-zinc-500",
                  )}
                >
                  {t("source_app", "Neste aplicativo")}
                </button>
                <button
                  onClick={() => setProjectSource("cloud")}
                  className={twMerge(
                    "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                    projectSource === "cloud"
                      ? "bg-[#3d3d3d] text-white"
                      : "text-zinc-500",
                  )}
                >
                  {t("source_cloud", "Nuvem")}
                </button>
              </div>

              <div className="flex items-center justify-between text-zinc-400 py-2 border-b border-zinc-800 relative">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    className={twMerge(
                      "p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold",
                      selectedProjects.size > 0 ? "text-indigo-400 bg-indigo-950/40" : "text-zinc-400"
                    )}
                    title="Selecionar Todos"
                  >
                    <CheckSquare size={18} />
                    {selectedProjects.size > 0 && <span>{selectedProjects.size} selecionado(s)</span>}
                  </button>
                  <button
                    onClick={createFolder}
                    className="p-1 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                    title={t("create_new_folder", "Criar nova pasta")}
                  >
                    <Folder size={18} />
                  </button>
                  {selectedFolderId && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "Deseja mesmo excluir esta pasta? Os projetos dentro dela serão mantidos e movidos para a raiz.",
                          )
                        ) {
                          const folderId = selectedFolderId;
                          setSelectedFolderId(null);
                          await deleteFolderFromFirestore(folderId, "all");
                        }
                      }}
                      title="Excluir pasta atual"
                      className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-[11px] font-bold ml-2 cursor-pointer"
                    >
                      <Trash2 size={16} />
                      <span>Excluir Pasta</span>
                    </button>
                  )}
                  {selectedProjects.size > 0 && (
                    <button
                      onClick={deleteSelected}
                      className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-xs font-bold p-1 rounded hover:bg-red-950/40 cursor-pointer"
                      title="Excluir projetos selecionados"
                    >
                      <Trash2 size={16} />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSearchInput(!showSearchInput)}
                    className={twMerge(
                      "p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer",
                      showSearchInput && "text-indigo-400 bg-zinc-800",
                    )}
                    title="Pesquisar projetos"
                  >
                    <Search size={18} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className={twMerge(
                        "p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer",
                        showMoreMenu && "text-indigo-400 bg-zinc-800",
                      )}
                      title="Mais opções"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {showMoreMenu && (
                      <div className="absolute right-0 top-9 z-[250] bg-[#222225] border border-zinc-700/80 shadow-2xl rounded-xl p-1.5 w-56 flex flex-col gap-1 text-xs text-zinc-200 animate-in fade-in-50 zoom-in-95">
                        <button
                          onClick={() => {
                            selectAll();
                            setShowMoreMenu(false);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left font-medium transition-colors cursor-pointer"
                        >
                          <CheckSquare size={16} className="text-indigo-400" />
                          <span>{selectedProjects.size > 0 ? "Desmarcar Todos" : "Selecionar Todos"}</span>
                        </button>
                        <button
                          onClick={() => {
                            createFolder();
                            setShowMoreMenu(false);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left font-medium transition-colors cursor-pointer"
                        >
                          <Folder size={16} className="text-amber-400" />
                          <span>Criar Nova Pasta</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowSearchInput(!showSearchInput);
                            setShowMoreMenu(false);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left font-medium transition-colors cursor-pointer"
                        >
                          <Search size={16} className="text-emerald-400" />
                          <span>{showSearchInput ? "Ocultar Pesquisa" : "Pesquisar Projetos"}</span>
                        </button>
                        <button
                          onClick={async () => {
                            await refreshLocalDrafts();
                            setShowMoreMenu(false);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left font-medium transition-colors cursor-pointer"
                        >
                          <RefreshCw size={16} className="text-blue-400" />
                          <span>Atualizar Lista</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showSearchInput && (
                <div className="px-4 pb-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-2.5 text-zinc-500"
                      size={14}
                    />
                    <input
                      autoFocus
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Pesquisar projetos..."
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-full py-2 pl-9 pr-4 text-xs focus:border-indigo-600 focus:outline-none transition-colors"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">{t("new_canvas")}</h1>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="bg-[#2d2d2d] border border-zinc-700 px-4 py-1 rounded-full text-xs font-bold hover:bg-zinc-700 transition-colors"
                >
                  Configurações avançadas
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-6 border-b border-zinc-800 overflow-x-auto scrollbar-hide shrink-0 pb-1">
                {[
                  { id: "ilustracao", label: t("tab_illustration", "Ilustração") },
                  { id: "webtoon", label: t("tab_webtoon", "Webtoon") },
                  { id: "quadrinho", label: t("tab_comic", "Quadrinho") },
                  { id: "animacao", label: t("tab_animation", "Animação") },
                  { id: "predefinicoes", label: t("tab_presets", "Minhas predefinições") },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={twMerge(
                      "text-[11px] font-bold whitespace-nowrap pb-1 border-b-2 transition-all",
                      activeTab === tab.id
                        ? "text-indigo-400 border-indigo-400"
                        : "text-zinc-500 border-transparent",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Templates */}
              <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2">
                {activeTab === "ilustracao" &&
                  projectTypes.ilustracao.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setWidthHeight(p.w, p.h);
                        createNewProject();
                      }}
                      className="flex flex-col items-center gap-2 group cursor-pointer shrink-0"
                    >
                      <div className="w-24 h-24 bg-[#2d2d2d] rounded-lg border border-zinc-700 flex items-center justify-center group-hover:bg-zinc-700 group-active:scale-95 transition-all text-zinc-400">
                        {p.icon}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold">{p.label}</span>
                        <span className="text-[9px] text-zinc-500">
                          {p.w} x {p.h}px
                        </span>
                      </div>
                    </div>
                  ))}
                {activeTab === "animacao" &&
                  projectTypes.animacao.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (p.action) p.action();
                        else {
                          setWidthHeight(p.w!, p.h!);
                          if (p.isAnim)
                            useStore.getState().setAnimationEnabled(true);
                          createNewProject();
                        }
                      }}
                      className="flex flex-col items-center gap-2 group cursor-pointer shrink-0"
                    >
                      <div className="w-24 h-24 bg-[#2d2d2d] rounded-lg border border-zinc-700 flex items-center justify-center group-hover:bg-zinc-700 group-active:scale-95 transition-all text-zinc-400">
                        {p.icon}
                      </div>
                      <div className="flex flex-col items-center text-center max-w-[96px]">
                        <span className="text-[10px] font-bold leading-tight">
                          {p.label}
                        </span>
                        {p.w && (
                          <span className="text-[9px] text-zinc-500">
                            {p.w} x {p.h}px
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                {activeTab === "webtoon" &&
                  projectTypes.webtoon.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setWidthHeight(p.w, p.h);
                        createNewProject();
                      }}
                      className="flex flex-col items-center gap-2 group cursor-pointer shrink-0"
                    >
                      <div className="w-24 h-24 bg-[#2d2d2d] rounded-lg border border-zinc-700 flex items-center justify-center group-hover:bg-zinc-700 group-active:scale-95 transition-all text-zinc-400">
                        {p.icon}
                      </div>
                      <div className="flex flex-col items-center text-center max-w-[96px]">
                        <span className="text-[10px] font-bold leading-tight">
                          {p.label}
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          {p.w} x {p.h}px
                        </span>
                      </div>
                    </div>
                  ))}
                {activeTab === "quadrinho" &&
                  projectTypes.quadrinho.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setWidthHeight(p.w, p.h);
                        createNewProject();
                      }}
                      className="flex flex-col items-center gap-2 group cursor-pointer shrink-0"
                    >
                      <div className="w-24 h-24 bg-[#2d2d2d] rounded-lg border border-zinc-700 flex items-center justify-center group-hover:bg-zinc-700 group-active:scale-95 transition-all text-zinc-400">
                        {p.icon}
                      </div>
                      <div className="flex flex-col items-center text-center max-w-[96px]">
                        <span className="text-[10px] font-bold leading-tight">
                          {p.label}
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          {p.w} x {p.h}px
                        </span>
                      </div>
                    </div>
                  ))}
                {activeTab === "predefinicoes" && (
                  <div className="flex flex-col items-center justify-center w-full h-24 text-zinc-500 italic text-[11px]">
                    Não há itens disponíveis no momento.
                  </div>
                )}
              </div>
            </div>

            {/* Continue section */}
            <div className="flex-1 bg-[#121212] overflow-hidden flex flex-col">
              <div className="px-4 py-2 flex items-center justify-between">
                <h2 className="text-xl font-bold">{t("continue_drawing")}</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-12">
                <div className="flex flex-col gap-6">
                  {!user && (
                    <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                          <Cloud className="text-indigo-400" size={22} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">Sincronização na Nuvem</div>
                          <div className="text-xs text-zinc-300">Faça login para salvar na nuvem, publicar na comunidade e acessar em qualquer lugar.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSubView("login")}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs shrink-0 transition-all shadow-md cursor-pointer"
                      >
                        Entrar / Registrar
                      </button>
                    </div>
                  )}

                  {/* Local drafts / browser saved projects */}
                  {localDraftsList.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                          <Clock size={16} className="text-indigo-400" />
                          Desenhos Salvos Neste Navegador ({localDraftsList.length})
                        </h3>
                        {selectedProjects.size === 0 && (
                          <span className="text-[10px] text-zinc-500 italic hidden sm:inline">
                            (Pressione e segure em um item para selecionar)
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {localDraftsList
                          .filter((draft) => (draft.name || "Desenho Recente").toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((draft) => {
                            const isSelected = selectedProjects.has(draft.id);
                            return (
                              <div
                                key={draft.id}
                                className="relative group flex flex-col gap-1.5 select-none"
                                onMouseDown={() => handlePressStart(draft.id)}
                                onMouseUp={() => handlePressEnd(draft.id)}
                                onMouseLeave={() => handlePressEnd(draft.id)}
                                onTouchStart={() => handlePressStart(draft.id)}
                                onTouchEnd={() => handlePressEnd(draft.id)}
                                onTouchCancel={() => handlePressEnd(draft.id)}
                                onClick={() => handleItemClick(draft.id, () => loadLocalProject(draft.id))}
                              >
                                <div
                                  className={twMerge(
                                    "aspect-square bg-[#2d2d2d] rounded-lg border-2 overflow-hidden relative shadow-lg cursor-pointer transition-all",
                                    isSelected
                                      ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/30"
                                      : "border-zinc-700 hover:border-indigo-500"
                                  )}
                                >
                                  {draft.thumbnail ? (
                                    <img
                                      src={draft.thumbnail}
                                      alt={draft.name || "Desenho Recente"}
                                      className={twMerge(
                                        "w-full h-full object-contain transition-transform",
                                        !isSelected && "group-hover:scale-105"
                                      )}
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900/50">
                                      <Brush size={32} />
                                    </div>
                                  )}

                                  {/* Selection Checkbox */}
                                  {(selectedProjects.size > 0 || isSelected) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelectProject(draft.id);
                                      }}
                                      className={twMerge(
                                        "absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all z-20 cursor-pointer shadow-md",
                                        isSelected
                                          ? "bg-indigo-600 text-white"
                                          : "bg-black/70 border border-zinc-400 text-transparent hover:border-indigo-400"
                                      )}
                                    >
                                      <CheckSquare size={14} />
                                    </button>
                                  )}

                                  {/* Action Buttons when not in multi-select mode */}
                                  {selectedProjects.size === 0 && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm("Deseja excluir este rascunho local?")) {
                                          deleteLocalProject(draft.id);
                                          await refreshLocalDrafts();
                                        }
                                      }}
                                      className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg z-10 cursor-pointer"
                                      title="Excluir rascunho local"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                  {selectedProjects.size === 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        loadLocalProject(draft.id);
                                      }}
                                      className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-500 p-2 rounded-full text-white shadow-lg cursor-pointer transition-all"
                                      title="Continuar Desenhando"
                                    >
                                      <ChevronRight size={16} />
                                    </button>
                                  )}
                                </div>
                                <span className={twMerge(
                                  "text-[11px] font-bold text-center truncate px-1",
                                  isSelected ? "text-indigo-400 font-extrabold" : "text-zinc-200"
                                )}>
                                  {draft.name || "Desenho Recente"}
                                </span>
                                {draft.updatedAt && (
                                  <span className="text-[9px] text-zinc-500 text-center">
                                    {new Date(draft.updatedAt).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {!user && localDraftsList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-[#1e1e1e]/50 border border-zinc-800 rounded-2xl">
                      <div className="w-14 h-14 bg-zinc-800/80 rounded-full flex items-center justify-center text-zinc-500">
                        <Brush size={28} />
                      </div>
                      <h3 className="font-bold text-sm text-zinc-300">
                        Nenhum desenho salvo neste navegador ainda
                      </h3>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        Crie um novo desenho ou escolha um modelo acima. Seus desenhos serão salvos automaticamente no seu navegador.
                      </p>
                    </div>
                  )}

                  {user && (
                    <div className="flex flex-col gap-4">
                    {selectedProjects.size > 0 && (
                      <div className="flex items-center gap-2 bg-[#2d2d2d] p-2 rounded-lg">
                        <button
                          onClick={selectAll}
                          className="text-[10px] font-bold text-zinc-300"
                        >
                          Selecionar Todos
                        </button>
                        <button
                          onClick={deleteSelected}
                          className="text-[10px] font-bold text-red-400"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setShowMoveToFolderModal(true)}
                          className="text-[10px] font-bold text-indigo-400"
                        >
                          Mover
                        </button>
                        <button
                          onClick={createFolder}
                          className="text-[10px] font-bold text-zinc-300"
                        >
                          Pasta +
                        </button>
                      </div>
                    )}

                    {/* Move to Folder Modal */}
                    {showMoveToFolderModal && (
                      <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-[#2d2d2d] w-full max-w-sm rounded-xl p-6 space-y-4">
                          <h3 className="font-bold">Mover para...</h3>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            <button
                              onClick={() => moveSelectedToFolder(null)}
                              className="w-full p-3 rounded bg-zinc-800 text-left text-sm hover:bg-zinc-700 transition-colors flex items-center gap-2"
                            >
                              <Home size={16} className="text-zinc-500" />
                              Raiz (Sem pasta)
                            </button>
                            {firebaseFolders.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => moveSelectedToFolder(f.id)}
                                className="w-full p-3 rounded bg-zinc-800 text-left text-sm hover:bg-zinc-700 transition-colors flex items-center gap-2"
                              >
                                <Folder size={16} className="text-indigo-400" />
                                {f.name}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowMoveToFolderModal(false)}
                            className="w-full py-2 text-zinc-500 font-bold text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {/* Back button if in folder */}
                      {selectedFolderId && (
                        <div
                          onClick={() => setSelectedFolderId(null)}
                          className="aspect-square bg-[#2d2d2d] rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-zinc-800 transition-all text-zinc-500"
                        >
                          <ChevronRight className="rotate-180" size={24} />
                          <span className="text-[10px] font-bold uppercase">
                            Voltar
                          </span>
                        </div>
                      )}

                      {/* Folders (only show if at root or inside another folder if nested folders supported, but here it's flat) */}
                      {!selectedFolderId &&
                        firebaseFolders.map((folder) => (
                          <div
                            key={folder.id}
                            className="relative group flex flex-col gap-1.5"
                            onClick={() => setSelectedFolderId(folder.id)}
                          >
                            <div className="aspect-square bg-indigo-900/10 rounded-lg border-2 border-indigo-500/20 flex items-center justify-center relative shadow-lg cursor-pointer hover:bg-indigo-900/20 transition-all">
                              <Folder className="text-indigo-400" size={48} />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteFolderFromFirestore(folder.id, "all");
                                }}
                                className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg z-10"
                              >
                                <Trash2 size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameFolder(folder.id, folder.name);
                                }}
                                className="absolute top-2 left-2 bg-black/60 p-1.5 rounded-full text-white md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-indigo-600 shadow-lg z-10"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                            <span className="text-[11px] font-bold text-zinc-300 truncate px-1 text-center">
                              {folder.name}
                            </span>
                          </div>
                        ))}

                      {/* Projects */}
                      {firebaseProjects
                        .filter(
                          (p) => (p.folderId || null) === selectedFolderId,
                        )
                        .filter((p) =>
                          p.name
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase()),
                        )
                        .map((project) => {
                          const isSelected = selectedProjects.has(project.id);
                          return (
                            <div
                              key={project.id}
                              className="relative group flex flex-col gap-1.5 select-none"
                              onMouseDown={() => handlePressStart(project.id)}
                              onMouseUp={() => handlePressEnd(project.id)}
                              onMouseLeave={() => handlePressEnd(project.id)}
                              onTouchStart={() => handlePressStart(project.id)}
                              onTouchEnd={() => handlePressEnd(project.id)}
                              onTouchCancel={() => handlePressEnd(project.id)}
                              onClick={() => handleItemClick(project.id, () => loadProjectFromFirestore(project.id))}
                            >
                              <div
                                className={twMerge(
                                  "aspect-square bg-[#2d2d2d] rounded-lg border-2 overflow-hidden relative shadow-lg cursor-pointer transition-all",
                                  isSelected
                                    ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/30"
                                    : "border-zinc-800 hover:border-indigo-500",
                                )}
                              >
                                {project.thumbnail ? (
                                  <img
                                    src={project.thumbnail}
                                    alt={project.name}
                                    className={twMerge(
                                      "w-full h-full object-contain transition-transform",
                                      !isSelected && "group-hover:scale-105"
                                    )}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900/50">
                                    <Brush size={32} />
                                  </div>
                                )}

                                {/* Selection Checkbox */}
                                {(selectedProjects.size > 0 || isSelected) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSelectProject(project.id);
                                    }}
                                    className={twMerge(
                                      "absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all z-20 cursor-pointer shadow-md",
                                      isSelected
                                        ? "bg-indigo-600 text-white"
                                        : "bg-black/70 border border-zinc-400 text-transparent hover:border-indigo-400"
                                    )}
                                  >
                                    <CheckSquare size={14} />
                                  </button>
                                )}

                                {selectedProjects.size === 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm("Deseja excluir este projeto na nuvem?")) {
                                        deleteProjectFromFirestore(
                                          project.id,
                                          "all",
                                        );
                                      }
                                    }}
                                    className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg z-10 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                {selectedProjects.size === 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadProjectFromFirestore(project.id);
                                    }}
                                    className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-500 p-2 rounded-full text-white shadow-lg cursor-pointer transition-all"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                )}
                              </div>
                              <span className={twMerge(
                                "text-[10px] font-bold text-center truncate px-1",
                                isSelected ? "text-indigo-400 font-extrabold" : "text-zinc-200"
                              )}>
                                {project.name}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                </div>
              </div>

              {selectedProjects.size > 0 && (
                <div className="p-4 flex justify-center sticky bottom-0 bg-[#121212] gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <button 
                    onClick={selectAll}
                    className="bg-zinc-800 border border-zinc-700 px-6 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    <CheckSquare size={16} />
                    {selectedProjects.size === new Set([...localDraftsList.map(d=>d.id), ...firebaseProjects.map(p=>p.id)]).size && selectedProjects.size > 0 ? "Desmarcar Tudo" : "Selecionar Tudo"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(subView === "login" ||
          subView === "register" ||
          subView === "forgot" ||
          subView === "force_reset") && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#121212]">
            <div className="w-full max-w-sm space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {subView === "login"
                    ? t("welcome_back")
                    : subView === "register"
                      ? t("create_account")
                      : subView === "force_reset"
                        ? "Forçar Redefinição"
                        : "Recuperar senha"}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {subView === "login"
                    ? "Acesse seus projetos em qualquer lugar"
                    : subView === "register"
                      ? t("start_creative_journey")
                      : t("send_recovery_link")}
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="bg-green-500/10 border border-green-500/50 p-3 rounded flex items-center gap-2 text-green-400 text-xs">
                  <CheckSquare size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                {subView === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">
                      Nome
                    </label>
                    <div className="relative">
                      <UserIcon
                        className="absolute left-3 top-3 text-zinc-600"
                        size={16}
                      />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-600 focus:outline-none text-sm transition-colors"
                      />
                    </div>
                  </div>
                )}

                {subView === "forgot" && (
                  <div className="flex gap-2 p-1 bg-[#1a1a1a] rounded-lg border border-zinc-800 mb-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryMethod("email")}
                      className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                        recoveryMethod === "email"
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Via E-mail
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecoveryMethod("guess")}
                      className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                        recoveryMethod === "guess"
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Adivinhar Senha (✔️/❌)
                    </button>
                  </div>
                )}

                {subView === "forgot" && recoveryMethod === "guess" ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">
                        E-mail da Conta
                      </label>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-3 text-zinc-600" size={16} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-600 focus:outline-none text-sm transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">
                        Palpite da Senha (ex: bobo)
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 text-zinc-600" size={16} />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={recoveryGuess}
                          onChange={(e) => setRecoveryGuess(e.target.value)}
                          placeholder="Digite o palpite..."
                          className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg py-2.5 pl-10 pr-10 focus:border-indigo-600 focus:outline-none text-sm transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-zinc-600 hover:text-zinc-400"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Real-time Indicator (✔️/❌) directly below the password input and highly visible */}
                      <div className="pt-2 flex items-center gap-2 text-xs font-bold transition-all">
                        {recoveryGuess === "" ? (
                          <span className="text-zinc-500">Aguardando palpite...</span>
                        ) : recoveryGuess === registeredPassword ? (
                          <span className="text-green-500 flex items-center gap-1 bg-green-500/10 px-2.5 py-1 rounded border border-green-500/30">
                            ✔️ Senha Correta!
                          </span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/30">
                            ❌ Senha Incorreta!
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading || recoveryGuess !== registeredPassword}
                      onClick={async () => {
                        setLoading(true);
                        setError(null);
                        try {
                          await signInWithEmailAndPassword(auth, email || "bobo@illustration.cloud", recoveryGuess);
                          setSuccessMsg("Sucesso! Você acertou a senha e fez login.");
                        } catch (err: any) {
                          setError("Erro ao fazer login: " + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-500 transition-all text-white disabled:opacity-50"
                    >
                      {loading ? "Entrando..." : "Entrar com essa senha"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">
                        E-mail
                      </label>
                      <div className="relative">
                        <MailIcon
                          className="absolute left-3 top-3 text-zinc-600"
                          size={16}
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 focus:border-indigo-600 focus:outline-none text-sm transition-colors"
                        />
                      </div>
                    </div>

                    {subView !== "forgot" && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">
                          Senha
                        </label>
                        <div className="relative">
                          <Lock
                            className="absolute left-3 top-3 text-zinc-600"
                            size={16}
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg py-2.5 pl-10 pr-10 focus:border-indigo-600 focus:outline-none text-sm transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-zinc-600 hover:text-zinc-400"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      disabled={loading}
                      onClick={() => handleAuthAction(subView)}
                      className="w-full bg-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-500 transition-all disabled:opacity-50"
                    >
                      {loading
                        ? "Processando..."
                        : subView === "login"
                          ? "Entrar"
                          : subView === "register"
                            ? "Registrar"
                            : subView === "force_reset"
                              ? "Redefinir Senha"
                              : "Enviar Link"}
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2 text-center text-xs text-zinc-400">
                {subView === "login" ? (
                  <>
                    <button
                      onClick={() => setSubView("forgot")}
                      className="hover:text-indigo-400"
                    >
                      Esqueceu a senha?
                    </button>

                    <p>
                      Não tem uma conta?{" "}
                      <button
                        onClick={() => setSubView("register")}
                        className="text-indigo-400 font-bold"
                      >
                        Registre-se
                      </button>
                    </p>
                  </>
                ) : subView === "register" ? (
                  <p>
                    Já tem uma conta?{" "}
                    <button
                      onClick={() => setSubView("login")}
                      className="text-indigo-400 font-bold"
                    >
                      Login
                    </button>
                  </p>
                ) : (
                  <button
                    onClick={() => setSubView("login")}
                    className="text-indigo-400 font-bold"
                  >
                    Voltar para Login
                  </button>
                )}
                <div className="pt-4 border-t border-zinc-800 mt-2">
                  <button
                    onClick={() => setSubView("projects")}
                    className="text-zinc-500 hover:text-white"
                  >
                    Continuar sem conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {subView === "notices" && (
          <div className="flex-1 overflow-y-auto bg-[#1a1a1a] p-4 space-y-6">
            <h2 className="text-xl font-bold border-b border-zinc-800 pb-2">
              Avisos
            </h2>
            {[
              {
                id: 4,
                title: "Atualização Oficial: Novos Recursos!",
                date: "Disponível Agora",
                img: "https://picsum.photos/seed/update/400/200",
              },
              {
                id: 1,
                title: "Grande Evento: Festival Estelar de Desenho 2026!",
                date: "Aberto até 30 de abr.",
                img: "https://picsum.photos/seed/festival/400/200",
              },
              {
                id: 2,
                title: "Nova Integração com IA para Materiais Mágicos",
                date: "Disponível Agora",
                img: "https://picsum.photos/seed/ai-art/400/200",
              },
              {
                id: 3,
                title: "Resultados do Concurso de Arte Etérea",
                date: "Anunciado em 20 de abr.",
                img: "https://picsum.photos/seed/winner/400/200",
              },
            ].map((notice) => (
              <div
                key={notice.id}
                className="flex gap-4 items-start border-b border-zinc-900 pb-4 cursor-pointer hover:bg-zinc-800/20 p-2 rounded-lg transition-colors group"
                onClick={() =>
                  setShowNoticeModal({
                    title: notice.title,
                    content: notice.id === 4 
                      ? "Novidades desta atualização:\n\n- Pincéis e ferramentas de transformação com maior área de toque\n- Gerenciamento de camadas de keyframes na timeline (ativar/desativar)\n- Zoom na timeline com scroll ou pinça (celular)\n- Arrastar a agulha da timeline para definir posição\n- Preview em tempo real nos filtros\n- Atalho de teclado (ESC ou Ctrl+Backspace) para retornar à tela inicial\n- Tutorial interativo passo-a-passo\n- Menus e abas totalmente traduzidos\n\nContinue criando! 🚀"
                      : "Confira todos os detalhes do aviso oficial!\n\nEstamos felizes em compartilhar: " +
                        notice.title +
                        ".\n\nContinue criando e explorando as novas ferramentas e materiais disponíveis na nuvem.\n\nData do Aviso: " +
                        notice.date,
                  })
                }
              >
                <img
                  src={notice.img}
                  className="w-24 h-16 rounded object-cover border border-zinc-800 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-sm leading-snug group-hover:text-indigo-400 transition-colors">
                    {notice.title}
                  </h4>
                  <span className="text-[10px] text-zinc-500">
                    {notice.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {subView === "multiplayer" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#121212]">
            {/* CHECK IF IN COMBAT ARENA */}
            {activeBattleId || botBattle ? (
              <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 bg-[#0e0e0e] text-white">
                {/* ARENA HEADER */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Swords className="text-red-500 animate-pulse" size={20} />
                    <h2 className="text-sm font-black uppercase tracking-wider text-zinc-200">
                      {botBattle
                        ? "Arena de Treino contra Bot"
                        : "Arena de Batalha Oficial"}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setActiveBattleId(null);
                      setBotBattle(null);
                      setBattleLog([]);
                      setBattleResult(null);
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
                  >
                    Sair da Arena
                  </button>
                </div>

                {/* COMBATANTS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* MY CHAMPION CARD */}
                  <div className="bg-[#1b1b1b] border-2 border-indigo-500/40 rounded-xl p-4 flex flex-col space-y-4 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 bg-indigo-600/20 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                      Seu Campeão
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-24 h-24 rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden shrink-0 relative">
                        {botBattle ? (
                          <img
                            src={botBattle.challengerArtUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={
                              currentRealBattle?.challengerId === user?.uid
                                ? currentRealBattle?.challengerArtUrl
                                : currentRealBattle?.opponentArtUrl
                            }
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-base text-zinc-100 truncate text-left">
                          {botBattle
                            ? botBattle.challengerArtName
                            : currentRealBattle?.challengerId === user?.uid
                              ? currentRealBattle?.challengerArtName
                              : currentRealBattle?.opponentArtName}
                        </h3>
                        <p className="text-xs text-zinc-400 font-medium text-left">
                          Artista:{" "}
                          {botBattle
                            ? botBattle.challengerName
                            : currentRealBattle?.challengerId === user?.uid
                              ? currentRealBattle?.challengerName
                              : currentRealBattle?.opponentName}
                        </p>

                        {/* HP BAR */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-green-400">HP</span>
                            <span>{myHP}/100</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-300"
                              style={{ width: `${myHP}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* STATS OVERVIEW */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-xs text-left">
                      {Object.entries(
                        botBattle
                          ? botBattle.challengerStats
                          : (currentRealBattle?.challengerId === user?.uid
                              ? currentRealBattle?.challengerStats
                              : currentRealBattle?.opponentStats) || {},
                      ).map(([key, val]: any) => (
                        <div
                          key={key}
                          className="bg-black/30 p-2 rounded flex justify-between items-center font-mono border border-zinc-800/40"
                        >
                          <span className="text-zinc-500 uppercase text-[9px] font-bold">
                            {key === "technique"
                              ? "Técnica"
                              : key === "creativity"
                                ? "Criat."
                                : key === "power"
                                  ? "Força"
                                  : "Estilo"}
                          </span>
                          <span className="text-zinc-200 font-bold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OPPONENT CHAMPION CARD */}
                  <div className="bg-[#1b1b1b] border-2 border-red-500/40 rounded-xl p-4 flex flex-col space-y-4 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 bg-red-600/20 text-red-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                      Oponente
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-24 h-24 rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden shrink-0 relative">
                        {botBattle ? (
                          <img
                            src={botBattle.opponentArtUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={
                              currentRealBattle?.challengerId === user?.uid
                                ? currentRealBattle?.opponentArtUrl
                                : currentRealBattle?.challengerArtUrl
                            }
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-base text-zinc-100 truncate text-left">
                          {botBattle
                            ? botBattle.opponentArtName
                            : currentRealBattle?.challengerId === user?.uid
                              ? currentRealBattle?.opponentArtName
                              : currentRealBattle?.challengerArtName}
                        </h3>
                        <p className="text-xs text-zinc-400 font-medium text-left">
                          Artista:{" "}
                          {botBattle
                            ? botBattle.opponentName
                            : currentRealBattle?.challengerId === user?.uid
                              ? currentRealBattle?.opponentName
                              : currentRealBattle?.challengerName}
                        </p>

                        {/* HP BAR */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-red-400">HP</span>
                            <span>{opponentHP}/100</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-red-500 to-orange-400 h-full transition-all duration-300"
                              style={{ width: `${opponentHP}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* STATS OVERVIEW */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-xs text-left">
                      {Object.entries(
                        botBattle
                          ? botBattle.opponentStats
                          : (currentRealBattle?.challengerId === user?.uid
                              ? currentRealBattle?.opponentStats
                              : currentRealBattle?.challengerStats) || {},
                      ).map(([key, val]: any) => (
                        <div
                          key={key}
                          className="bg-black/30 p-2 rounded flex justify-between items-center font-mono border border-zinc-800/40"
                        >
                          <span className="text-zinc-500 uppercase text-[9px] font-bold">
                            {key === "technique"
                              ? "Técnica"
                              : key === "creativity"
                                ? "Criat."
                                : key === "power"
                                  ? "Força"
                                  : "Estilo"}
                          </span>
                          <span className="text-zinc-200 font-bold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ACTION PANEL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
                  {/* COMMAND BUTTONS */}
                  <div className="lg:col-span-1 bg-[#151515] p-4 rounded-xl border border-zinc-800 flex flex-col justify-center space-y-3">
                    <span className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider">
                      Ações de Desenho
                    </span>

                    {battleResult ? (
                      <div className="text-center p-4 space-y-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <Trophy
                          className={twMerge(
                            "mx-auto",
                            battleResult === "victory"
                              ? "text-yellow-400 animate-bounce"
                              : "text-zinc-500",
                          )}
                          size={32}
                        />
                        <h4 className="font-black text-lg">
                          {battleResult === "victory"
                            ? "VITÓRIA!"
                            : battleResult === "defeat"
                              ? "DERROTA!"
                              : "EMPATE!"}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          {battleResult === "victory"
                            ? "Seu desenho dominou o canvas!"
                            : "Seu desenho precisa de mais acabamento."}
                        </p>
                        <button
                          onClick={() => {
                            setActiveBattleId(null);
                            setBotBattle(null);
                            setBattleLog([]);
                            setBattleResult(null);
                          }}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition-all cursor-pointer"
                        >
                          Voltar ao Lobby
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <button
                          onClick={() => playTurnAction("brush")}
                          disabled={
                            isSimulatingBattle ||
                            currentTurnOwner === "opponent"
                          }
                          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 text-white font-extrabold text-xs rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Brush size={14} />
                          ATAQUE DE PINCEL (Dano Físico)
                        </button>

                        <button
                          onClick={() => playTurnAction("effect")}
                          disabled={
                            isSimulatingBattle ||
                            currentTurnOwner === "opponent"
                          }
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-40 text-white font-extrabold text-xs rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Sparkles size={14} />
                          COMBO NEON (Dano de Estilo)
                        </button>

                        <button
                          onClick={() => playTurnAction("eraser")}
                          disabled={
                            isSimulatingBattle ||
                            currentTurnOwner === "opponent"
                          }
                          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-lg border border-zinc-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <X size={14} />
                          BORRACHA CURATIVA (+HP)
                        </button>

                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-zinc-800"></div>
                          <span className="flex-shrink mx-4 text-zinc-500 text-[10px] font-bold uppercase font-mono">
                            Ou use
                          </span>
                          <div className="flex-grow border-t border-zinc-800"></div>
                        </div>

                        <button
                          onClick={runAutoSimulation}
                          disabled={isSimulatingBattle}
                          className="w-full py-3 bg-[#c71585] hover:bg-pink-600 disabled:opacity-40 text-white font-extrabold text-xs rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
                        >
                          <Gamepad2 size={14} />
                          Auto-Simular Combate Rápido
                        </button>
                      </div>
                    )}
                  </div>

                  {/* COMBAT LOG */}
                  <div className="lg:col-span-2 bg-[#151515] p-4 rounded-xl border border-zinc-800 flex flex-col h-72">
                    <span className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider mb-2 block text-left">
                      Histórico de Combate
                    </span>
                    <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1.5 p-2 bg-black/40 rounded-lg border border-zinc-900 scrollbar-hide text-left text-zinc-300">
                      {battleLog.map((log, i) => (
                        <div
                          key={i}
                          className={twMerge(
                            "py-1 border-b border-zinc-900/30",
                            log.includes("🏆") || log.includes("Vitória")
                              ? "text-yellow-400 font-bold"
                              : "",
                            log.includes("💥") ? "text-indigo-300" : "",
                            log.includes("⚡") ? "text-red-300" : "",
                            log.includes("🧽") ? "text-teal-300" : "",
                          )}
                        >
                          {log}
                        </div>
                      ))}
                      {battleLog.length === 0 && (
                        <p className="text-zinc-500 italic">
                          Nenhuma ação realizada ainda. Lance um ataque!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MULTIPLAYER LOBBY */
              <div className="flex-1 flex flex-col overflow-hidden text-white">
                {/* HERO CARD BATTLE BOT */}
                <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-indigo-900/30 to-purple-950/20 border-b border-zinc-800 shrink-0">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-black/40 p-4 rounded-xl border border-indigo-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/30 text-indigo-400 animate-pulse">
                        <Swords size={28} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-black text-sm uppercase tracking-wider text-zinc-100">
                          Batalhas de Desenhos
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Desafie o DesenhoBot ou outros artistas reais para um
                          combate RPG de arte!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={startBotBattle}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-600/20 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={14} />
                      Treino Contra Bot (Instante!)
                    </button>
                  </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex border-b border-zinc-800 bg-[#161616] shrink-0 p-1">
                  <button
                    onClick={() => setSelectedMultiplayerTab("opponents")}
                    className={twMerge(
                      "flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                      selectedMultiplayerTab === "opponents"
                        ? "text-indigo-400 border-b-2 border-indigo-400"
                        : "text-zinc-500",
                    )}
                  >
                    Desafiar Usuários ({users.length})
                  </button>
                  <button
                    onClick={() => setSelectedMultiplayerTab("friends")}
                    className={twMerge(
                      "flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer",
                      selectedMultiplayerTab === "friends"
                        ? "text-indigo-400 border-b-2 border-indigo-400"
                        : "text-zinc-500",
                    )}
                  >
                    Amigos (
                    {
                      users.filter((u) => {
                        if (u.uid === user?.uid) return false;
                        const inv = invites.find(
                          (i) =>
                            i.status === "accepted" &&
                            ((i.senderId === user?.uid &&
                              i.receiverId === u.uid) ||
                              (i.receiverId === user?.uid &&
                                i.senderId === u.uid)),
                        );
                        return !!inv;
                      }).length
                    }
                    )
                    {invites.filter(
                      (i) =>
                        i.receiverId === user?.uid && i.status === "pending",
                    ).length > 0 && (
                      <span className="absolute top-2 right-4 w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedMultiplayerTab("battles")}
                    className={twMerge(
                      "flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer",
                      selectedMultiplayerTab === "battles"
                        ? "text-indigo-400 border-b-2 border-indigo-400"
                        : "text-zinc-500",
                    )}
                  >
                    Minhas Batalhas (
                    {battles.filter((b) => b.status !== "rejected").length})
                    {battles.filter(
                      (b) =>
                        b.status === "pending_accept" &&
                        b.opponentId === user?.uid,
                    ).length > 0 && (
                      <span className="absolute top-2 right-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                    )}
                  </button>
                </div>

                {/* MULTIPLAYER TAB CONTENT */}
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedMultiplayerTab === "opponents" ? (
                    <div className="space-y-4">
                      <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                        <input
                          type="text"
                          placeholder="Buscar desafiante ou amigo..."
                          value={challengeSearchQuery}
                          onChange={(e) => setChallengeSearchQuery(e.target.value)}
                          className="w-full bg-[#1e1e1e] border border-zinc-800 focus:border-indigo-500 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-200 outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {users
                          .filter(u => {
                             if (!challengeSearchQuery.trim()) return true;
                             const q = challengeSearchQuery.toLowerCase();
                             return (u.displayName?.toLowerCase().includes(q) || u.uid?.toLowerCase().includes(q) || u.shortId?.toLowerCase().includes(q));
                          })
                          .map((u) => {
                          const rel = invites.find(
                            (i) =>
                              (i.senderId === user?.uid &&
                                i.receiverId === u.uid) ||
                              (i.receiverId === user?.uid &&
                                i.senderId === u.uid),
                          );
                        return (
                          <div
                            key={u.uid}
                            className="bg-[#1e1e1e] p-4 rounded-xl flex flex-col items-center text-center gap-3 border border-zinc-800 hover:border-zinc-700 hover:shadow-xl transition-all relative group"
                          >
                            <img
                              src={u.photoURL || ""}
                              alt={u.displayName}
                              className="w-16 h-16 rounded-full object-cover bg-zinc-800 border-2 border-zinc-700 group-hover:border-indigo-500 transition-colors"
                            />
                            <div className="text-center">
                              <span className="font-extrabold text-sm block text-zinc-200">
                                {u.displayName || "Usuário"}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">
                                ID: {u.uid?.substring(0, 8)}...
                              </span>
                            </div>

                            {/* Relacionamento de Amizade */}
                            {u.uid !== user?.uid && (
                              <div className="w-full mb-1">
                                {rel ? (
                                  rel.status === "accepted" ? (
                                    <div className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1">
                                      <UserCheck size={10} /> Amigo Oficial
                                    </div>
                                  ) : rel.status === "pending" ? (
                                    rel.senderId === user?.uid ? (
                                      <div className="flex gap-1 w-full">
                                        <div className="flex-1 text-[10px] font-bold text-amber-500 bg-amber-500/5 border border-dashed border-amber-500/20 py-1.5 px-2 rounded-lg flex items-center justify-center">
                                          Pendente
                                        </div>
                                        <button
                                          onClick={() =>
                                            cancelFriendRequest(rel.id)
                                          }
                                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] py-1 px-1.5 rounded transition-all cursor-pointer"
                                          title="Cancelar"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-1 w-full">
                                        <button
                                          onClick={() =>
                                            acceptFriendRequest(rel.id)
                                          }
                                          className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] py-1 px-1.5 rounded transition-all cursor-pointer"
                                        >
                                          {t("accept")}
                                        </button>
                                        <button
                                          onClick={() =>
                                            rejectFriendRequest(rel.id)
                                          }
                                          className="bg-[#242424] hover:bg-zinc-800 text-zinc-400 font-bold text-[10px] py-1 px-1.5 rounded transition-all border border-zinc-700 cursor-pointer"
                                        >
                                          {t("reject")}
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    <button
                                      onClick={() => sendFriendRequest(u.uid, u.displayName, "Esquadrão Pixel Art", 4, "team")}
                                      className="w-full bg-[#242424] hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <UserPlus size={10} /> {t("add_friend")}
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={() => sendFriendRequest(u.uid, u.displayName, "Esquadrão Pixel Art", 4, "team")}
                                    className="w-full bg-[#242424] hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <UserPlus size={10} /> Adicionar Amigo
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 w-full pt-1.5 border-t border-zinc-800/60 justify-center">
                              <button
                                onClick={() => startRealBattle(u)}
                                disabled={u.uid === user?.uid}
                                className={twMerge(
                                  "flex-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                                  u.uid === user?.uid && "hidden",
                                )}
                                title="Desafiar para Batalha"
                              >
                                <Swords size={12} />
                                Batalhar
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedChatUser(u);
                                  setShowMessagesModal(true);
                                }}
                                className={twMerge(
                                  "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg font-bold transition-all relative flex items-center justify-center cursor-pointer",
                                  u.uid === user?.uid && "hidden",
                                )}
                                title="Conversar"
                              >
                                <MailIcon size={14} />
                                {unreadMessages[u.uid] > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-indigo-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
                                    {unreadMessages[u.uid]}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {users.length === 0 && (
                        <p className="text-zinc-500 italic col-span-full text-center py-8">
                          Nenhum artista registrado encontrado no momento.
                        </p>
                      )}
                      </div>
                    </div>
                  ) : selectedMultiplayerTab === "friends" ? (
                    <div className="space-y-6 text-white text-left animate-in fade-in duration-200">
                      {/* CAIXA DE BUSCA PARA ADICIONAR AMIGO */}
                      <div className="bg-[#1e1e1e] p-5 rounded-xl border border-zinc-800 text-left max-w-xl">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <UserPlus size={16} className="text-indigo-400" />
                          Adicionar Amigo por ID ou Nome
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">
                          Adicione seus amigos buscando pelo Nome Exato, UID ou
                          Código Curto (ShortID) do artista.
                        </p>
                        <form
                          onSubmit={handleAddFriendBySearch}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            placeholder="Ex: belepuff, BTTEE, etc..."
                            value={friendSearchQuery}
                            onChange={(e) =>
                              setFriendSearchQuery(e.target.value)
                            }
                            className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none transition-all"
                          />
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-2 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            Solicitar Amizade
                          </button>
                        </form>
                        {friendSearchError && (
                          <p className="text-red-500 text-xs font-semibold mt-2">
                            {friendSearchError}
                          </p>
                        )}
                        {friendSearchSuccess && (
                          <p className="text-green-500 text-xs font-semibold mt-2">
                            {friendSearchSuccess}
                          </p>
                        )}
                      </div>

                      {/* SOLICITAÇÕES RECEBIDAS */}
                      {(() => {
                        const pendingReceived = invites
                          .filter(
                            (i) =>
                              i.receiverId === user?.uid &&
                              i.status === "pending",
                          )
                          .map((inv) => {
                            const sender = users.find(
                              (u) => u.uid === inv.senderId,
                            ) || {
                              displayName: "Artista",
                              uid: inv.senderId,
                              photoURL: "",
                            };
                            return { inviteId: inv.id, ...sender };
                          });

                        if (pendingReceived.length === 0) return null;

                        return (
                          <div className="space-y-3">
                            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                              Solicitações Recebidas ({pendingReceived.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {pendingReceived.map((req) => (
                                <div
                                  key={req.inviteId}
                                  className="bg-[#1e1e1e] p-4 rounded-xl border border-zinc-800 flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={
                                        req.photoURL ||
                                        "https://picsum.photos/seed/user/100"
                                      }
                                      alt={req.displayName}
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 rounded-full object-cover bg-zinc-800 border-zinc-700"
                                    />
                                    <div className="text-left">
                                      <span className="font-extrabold text-xs block text-zinc-200">
                                        {req.displayName}
                                      </span>
                                      <span className="text-[9px] font-mono text-zinc-500 uppercase">
                                        Quer ser seu amigo!
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      onClick={() =>
                                        acceptFriendRequest(req.inviteId)
                                      }
                                      className="bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                    >
                                      Aceitar
                                    </button>
                                    <button
                                      onClick={() =>
                                        rejectFriendRequest(req.inviteId)
                                      }
                                      className="bg-[#242424] hover:bg-zinc-800 text-zinc-400 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all border border-zinc-700 cursor-pointer"
                                    >
                                      Recusar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* SEUS AMIGOS */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                          Seus Amigos (
                          {
                            users.filter((u) => {
                              if (u.uid === user?.uid) return false;
                              const inv = invites.find(
                                (i) =>
                                  i.status === "accepted" &&
                                  ((i.senderId === user?.uid &&
                                    i.receiverId === u.uid) ||
                                    (i.receiverId === user?.uid &&
                                      i.senderId === u.uid)),
                              );
                              return !!inv;
                            }).length
                          }
                          )
                        </h3>
                        {(() => {
                          const friendsList = users.filter((u) => {
                            if (u.uid === user?.uid) return false;
                            const inv = invites.find(
                              (i) =>
                                i.status === "accepted" &&
                                ((i.senderId === user?.uid &&
                                  i.receiverId === u.uid) ||
                                  (i.receiverId === user?.uid &&
                                    i.senderId === u.uid)),
                            );
                            return !!inv;
                          });

                          if (friendsList.length === 0) {
                            return (
                              <div className="bg-zinc-900/40 border border-dashed border-zinc-800/80 rounded-xl p-8 text-center text-zinc-500 italic text-xs">
                                Nenhum amigo oficial adicionado ainda. Adicione
                                outros artistas para bater papo em tempo real e
                                batalhar!
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {friendsList.map((f) => (
                                <div
                                  key={f.uid}
                                  className="bg-[#1e1e1e] p-4 rounded-xl flex flex-col items-center text-center gap-3 border border-zinc-800 hover:border-zinc-700 transition-all group relative"
                                >
                                  <span className="absolute top-2 right-2 bg-green-500/10 text-green-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-green-500/20 uppercase">
                                    Amigo
                                  </span>
                                  <img
                                    src={
                                      f.photoURL ||
                                      "https://picsum.photos/seed/user/100"
                                    }
                                    alt={f.displayName}
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 rounded-full object-cover bg-zinc-800 border-2 border-zinc-700 group-hover:border-indigo-500 transition-colors"
                                  />
                                  <div className="text-center">
                                    <span className="font-extrabold text-sm block text-zinc-200 truncate max-w-[120px]">
                                      {f.displayName || "Artista"}
                                    </span>
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase">
                                      ID: {f.uid?.substring(0, 8)}...
                                    </span>
                                  </div>
                                  <div className="flex gap-1.5 w-full pt-2 border-t border-zinc-800/60 justify-center">
                                    <button
                                      onClick={() => startRealBattle(f)}
                                      className="flex-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-[10px] py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                      title="Desafiar"
                                    >
                                      <Swords size={10} />
                                      Batalhar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedChatUser(f);
                                        setShowMessagesModal(true);
                                      }}
                                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all relative flex items-center justify-center cursor-pointer"
                                      title="Conversar"
                                    >
                                      <MailIcon size={12} />
                                      {unreadMessages[f.uid] > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-indigo-500 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] text-white font-bold animate-pulse">
                                          {unreadMessages[f.uid]}
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* CONVITES ENVIADOS PENDENTES */}
                      {(() => {
                        const pendingSent = invites
                          .filter(
                            (i) =>
                              i.senderId === user?.uid &&
                              i.status === "pending",
                          )
                          .map((inv) => {
                            const receiver = users.find(
                              (u) => u.uid === inv.receiverId,
                            ) || {
                              displayName: "Artista",
                              uid: inv.receiverId,
                              photoURL: "",
                            };
                            return {
                              inviteId: inv.id,
                              ...receiver,
                              displayName: inv.receiverName || receiver.displayName || "Artista",
                              groupName: inv.groupName || "Esquadrão Pixel Art",
                              memberCount: inv.memberCount || 4,
                            };
                          });

                        if (pendingSent.length === 0) return null;

                        return (
                          <div className="space-y-3">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                              Solicitações Enviadas ({pendingSent.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {pendingSent.map((req) => (
                                <div
                                  key={req.inviteId}
                                  className="bg-[#1e1e1e]/80 p-4 rounded-xl border border-amber-500/30 flex flex-col gap-3 shadow-lg relative overflow-hidden group"
                                >
                                  {/* User details */}
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={
                                        req.photoURL ||
                                        "https://picsum.photos/seed/user/100"
                                      }
                                      alt={req.displayName}
                                      referrerPolicy="no-referrer"
                                      className="w-9 h-9 rounded-full object-cover bg-zinc-800 border-2 border-amber-500/40"
                                    />
                                    <div className="text-left">
                                      <span className="font-bold text-xs block text-zinc-200">
                                        {req.displayName}
                                      </span>
                                      <span className="text-[9px] text-zinc-500 font-mono">
                                        ID: {req.uid?.substring(0, 8)}...
                                      </span>
                                    </div>
                                  </div>

                                  {/* Squad / Group details */}
                                  <div className="bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/80 flex flex-col gap-1 text-left text-[10px]">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Grupo:</span>
                                      <span className="font-semibold text-zinc-300">{req.groupName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Pessoas:</span>
                                      <span className="font-black text-amber-500">{req.memberCount} pessoas</span>
                                    </div>
                                  </div>

                                  {/* Functional Pending Button */}
                                  <button
                                    onClick={() => {
                                      if (confirm(`Deseja cancelar o convite de ${req.displayName} para o grupo ${req.groupName} (${req.memberCount} pessoas)?`)) {
                                        cancelFriendRequest(req.inviteId);
                                      }
                                    }}
                                    className="w-full bg-amber-500/10 hover:bg-red-500/20 text-amber-400 hover:text-red-400 border border-amber-500/20 hover:border-red-500/30 py-2 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                                  >
                                    <Clock size={11} className="animate-pulse" />
                                    Pendente (Clique p/ Cancelar)
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* MY BATTLES TAB LIST */
                    <div className="space-y-3 text-white">
                      {battles
                        .filter((b) => b.status !== "rejected")
                        .map((b) => {
                          const isChallenger = b.challengerId === user?.uid;
                          const oppName = isChallenger
                            ? b.opponentName
                            : b.challengerName;

                          return (
                            <div
                              key={b.id}
                              className="bg-[#1e1e1e] p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                                  <Swords size={18} />
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-zinc-100">
                                      Batalha contra {oppName}
                                    </span>
                                    {b.status === "pending_accept" && (
                                      <span className="bg-amber-500/10 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                                        Pendente
                                      </span>
                                    )}
                                    {b.status === "fighting" && (
                                      <span className="bg-green-500/10 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-green-500/20 uppercase animate-pulse">
                                        Ativa
                                      </span>
                                    )}
                                    {b.status === "finished" && (
                                      <span className="bg-zinc-500/15 text-zinc-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-700/50 uppercase">
                                        Concluída
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500 font-medium text-left">
                                    {b.status === "pending_accept" &&
                                      (isChallenger
                                        ? "Aguardando o oponente aceitar o desafio e enviar arte..."
                                        : "Você foi desafiado! Aceite para entrar na arena.")}
                                    {b.status === "fighting" &&
                                      "Ambos enviaram suas artes! Entre na arena e simule o combate."}
                                    {b.status === "finished" &&
                                      (b.winnerId === user?.uid
                                        ? "Você venceu esta batalha! 🏆"
                                        : b.winnerId === "tie"
                                          ? "Empate técnico!"
                                          : "Oponente levou a melhor.")}
                                  </p>
                                </div>
                              </div>

                              {/* BATTLE ITEM ACTIONS */}
                              <div className="flex gap-2 items-center self-end md:self-center">
                                {b.status === "pending_accept" &&
                                  !isChallenger && (
                                    <>
                                      <button
                                        onClick={() =>
                                          acceptBattleInvitation(b)
                                        }
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                                      >
                                        Aceitar & Enviar Arte
                                      </button>
                                      <button
                                        onClick={() =>
                                          rejectBattleInvitation(b)
                                        }
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs px-3 py-2 rounded-lg border border-zinc-700 transition-all cursor-pointer"
                                      >
                                        Recusar
                                      </button>
                                    </>
                                  )}
                                {b.status === "pending_accept" &&
                                  isChallenger && (
                                    <div className="flex gap-2 items-center">
                                      <span className="text-xs text-zinc-500 italic mr-2">
                                        Aguardando...
                                      </span>
                                      <button
                                        onClick={() =>
                                          rejectBattleInvitation(b)
                                        }
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs px-3 py-2 rounded-lg transition-all cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                                {b.status === "fighting" && (
                                  <button
                                    onClick={() => {
                                      setBattleLog([]);
                                      setActiveBattleId(b.id);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-2 rounded-lg transition-all flex items-center gap-1 animate-pulse cursor-pointer"
                                  >
                                    <Play size={10} />
                                    ENTRAR NA ARENA
                                  </button>
                                )}
                                {b.status === "finished" && (
                                  <button
                                    onClick={() => {
                                      setActiveBattleId(b.id);
                                    }}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs px-4 py-2 rounded-lg border border-zinc-700 transition-all cursor-pointer"
                                  >
                                    Ver Resultados
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {battles.filter((b) => b.status !== "rejected").length ===
                        0 && (
                        <p className="text-zinc-500 italic text-center py-8">
                          Nenhuma batalha registrada.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHAMPION ART SELECTION MODAL */}
            {showBattleArtModal && (
              <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#1e1e1e] border border-zinc-800 w-full max-w-xl rounded-xl p-5 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Swords
                        size={18}
                        className="text-indigo-400 animate-pulse"
                      />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-200">
                        Escolha seu Campeão
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowBattleArtModal(false)}
                      className="text-zinc-500 hover:text-white cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400 shrink-0 text-left">
                    Selecione uma de suas artes para representá-lo na batalha.
                    Os atributos do campeão são calculados automaticamente com
                    base na complexidade e detalhes de seu desenho!
                  </p>

                  <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {firebaseProjects.map((project) => {
                      const stats = calculateDrawingStats(project);
                      return (
                        <div
                          key={project.id}
                          onClick={() => submitProjectForBattle(project)}
                          className="bg-[#2a2a2a] rounded-lg border-2 border-zinc-800 hover:border-indigo-500 cursor-pointer overflow-hidden flex flex-col transition-all group"
                        >
                          <div className="aspect-square bg-zinc-950 relative overflow-hidden flex items-center justify-center border-b border-zinc-800">
                            {project.thumbnail ? (
                              <img
                                src={project.thumbnail}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Brush size={24} className="text-zinc-700" />
                            )}

                            {/* STATS OVERLAY ON HOVER */}
                            <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-center space-y-1.5 text-[10px] font-mono text-zinc-300 text-left">
                              <div className="flex justify-between border-b border-zinc-800/50 pb-0.5">
                                <span className="text-zinc-500">TÉCNICA</span>
                                <span className="text-zinc-100 font-bold">
                                  {stats.technique}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-zinc-800/50 pb-0.5">
                                <span className="text-zinc-500">CRIATIV.</span>
                                <span className="text-zinc-100 font-bold">
                                  {stats.creativity}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-zinc-800/50 pb-0.5">
                                <span className="text-zinc-500">FORÇA</span>
                                <span className="text-zinc-100 font-bold">
                                  {stats.power}
                                </span>
                              </div>
                              <div className="flex justify-between pb-0.5">
                                <span className="text-zinc-500">ESTILO</span>
                                <span className="text-zinc-100 font-bold">
                                  {stats.style}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 text-left">
                            <span className="text-[11px] font-bold truncate block text-zinc-300">
                              {project.name || "Sem Nome"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-zinc-800 shrink-0">
                    <button
                      onClick={() => setShowBattleArtModal(false)}
                      className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs font-bold px-4 py-2 rounded transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {subView === "account" && user && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#121212] space-y-8">
            {/* Profile Card Section */}
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="relative">
                <div
                  onClick={handlePhotoUpload}
                  className="w-24 h-24 bg-[#8ba4ae] rounded-full flex items-center justify-center border-4 border-zinc-800 shadow-xl overflow-hidden cursor-pointer hover:brightness-110 active:scale-95 transition-all group relative"
                >
                  {userProfile?.photoURL ||
                  localStorage.getItem(`profile_photo_${user.uid}`) ||
                  user.photoURL ? (
                    <img
                      src={
                        userProfile?.photoURL ||
                        localStorage.getItem(`profile_photo_${user.uid}`) ||
                        user.photoURL ||
                        ""
                      }
                      alt="Profile"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-xs font-black text-white/50">
                        NO
                      </span>
                      <span className="text-xs font-black text-white/50">
                        image
                      </span>
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={24} className="text-white" />
                  </div>
                </div>
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="absolute -bottom-1 -right-1 bg-[#2d2d2d] p-1.5 rounded-full border border-zinc-700 shadow-lg hover:bg-zinc-700 transition-colors"
                >
                  <Settings size={14} className="text-zinc-400" />
                </button>
              </div>
              <div
                className="text-center group cursor-pointer"
                onClick={() => setShowEditProfile(true)}
              >
                <div className="flex items-center gap-1 justify-center">
                  <h3 className="text-lg font-bold hover:text-indigo-400 transition-colors uppercase tracking-tight">
                    {userProfile?.displayName ||
                      localStorage.getItem(`profile_name_${user.uid}`) ||
                      user.displayName ||
                      "Usuário"}
                  </h3>
                  <Settings size={16} className="text-zinc-500" />
                </div>
                <div className="mt-1 flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="text-[11px] text-zinc-100 font-mono font-black tracking-widest uppercase flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 rounded-lg border border-indigo-500/30 shadow-lg shadow-indigo-600/10"
                      title="ID da sua conta"
                    >
                      <UserIcon size={10} className="text-indigo-400" />
                      <span>ID: {userProfile?.shortId || "....."}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (userProfile?.shortId) {
                          navigator.clipboard.writeText(userProfile.shortId);
                  alert(t("id_copied"));
                        }
                      }}
                      className="p-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all active:scale-90"
                      title="Copiar ID"
                    >
                      <Plus size={14} className="rotate-45" />{" "}
                      {/* Using x-like icon for copy or just Plus if user wants copy button */}
                      {/* Let's use Check or Copy icon if I had one, adding copy-like icon */}
                      <Wallet size={12} />
                    </button>
                  </div>
                  <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">
                    Clique no ID para gerenciar
                  </p>
                </div>
              </div>
            </div>



            {/* Cloud Progress */}
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-bold uppercase">
                <div className="flex items-center gap-2">
                  <Cloud size={14} className="text-blue-400" />
                  <span className="text-zinc-300 tracking-wider">
                    {t("source_cloud", "Nuvem")} Cloudy
                  </span>
                </div>
                <button
                  onClick={buyStorage}
                  className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] font-black text-amber-400 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1 uppercase italic shadow-lg shadow-amber-500/5"
                >
                  🚀 Upgrade 5TB
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-black mb-1.5 uppercase tabular-nums">
                    <span className="text-white/40">
                      1.61 MB /{" "}
                      <span className="text-blue-400">
                        {userProfile?.storageLimit >= 1000
                          ? (userProfile.storageLimit / 1000).toFixed(0) + "TB"
                          : (userProfile?.storageLimit || 10) + "GB"}
                      </span>
                    </span>
                    <span className="text-blue-400">
                      {(
                        (1.61 / ((userProfile?.storageLimit || 10) * 1024)) *
                        100
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                  <div className="h-2.5 bg-black rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.max(1, (1.61 / ((userProfile?.storageLimit || 10) * 1024)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-zinc-600 font-bold uppercase leading-tight italic">
                * Ganhe mais espaço comprando com Gold Points. 1TB a 5TB por
                apenas 1000 GP.
              </p>
            </div>

            {/* Points Section */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">
                  Pontos
                </div>
                <p className="text-[10px] text-zinc-600">
                  Você pode verificar seu saldo de Cloudy/GOLD na sua carteira
                  de pontos.
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white transition-colors cursor-pointer whitespace-nowrap">
                <span onClick={() => setShowPointsWallet(true)}>
                  {t("points_wallet")}
                </span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Groups */}
            {[
              {
                titleKey: "user_settings",
                items: [
                  { key: "account_info", icon: <UserIcon size={18} /> },
                  { key: "my_profile", icon: <UserCircle size={18} /> },
                  { key: "manage_plans", icon: <Smartphone size={18} /> },
                ],
              },
              {
                titleKey: "activity",
                items: [
                  { key: "private_messages", icon: <MailIcon size={18} /> },
                  { key: "my_publications", icon: <Layers size={18} /> },
                  { key: "my_creative_hours", icon: <Clock size={18} /> },
                ],
              },
              {
                titleKey: "teamwork",
                items: [
                  { key: "manage_teams", icon: <Folder size={18} /> },
                ],
              },
              {
                titleKey: "assets",
                items: [
                  { key: "simple_mode", icon: <Layout size={18} /> },
                  { key: "kids_mode", icon: <Baby size={18} /> },
                  { key: "change_password", icon: <KeyRound size={18} /> },
                ],
              },
            ].map((group, idx) => (
              <div key={idx} className="space-y-1">
                <h4 className="text-[11px] text-zinc-400 font-bold mb-2">
                  {t(group.titleKey)}
                </h4>
                <div className="space-y-px">
                  {group.items.map((itemObj, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (itemObj.key === "account_info" || itemObj.key === "my_profile")
                          setShowEditProfile(true);
                        if (itemObj.key === "manage_plans")
                          setShowPlansModal(true);
                        if (itemObj.key === "private_messages")
                          setShowMessagesModal(true);
                        if (itemObj.key === "my_publications")
                          setShowMyPublicationsModal(true);
                        if (itemObj.key === "my_creative_hours")
                          setShowCreativeHoursModal(true);
                        if (itemObj.key === "manage_teams")
                          setShowTeamsModal(true);
                        if (itemObj.key === "simple_mode")
                          useStore.getState().setSimpleMode(!useStore.getState().simpleMode);
                        if (itemObj.key === "kids_mode") {
                          if (isKidsMode) {
                            setPinAction("disable");
                            setInputPin("");
                            setPinError("");
                            setShowPinModal(true);
                          } else {
                            setIsKidsMode(true);
                          }
                        }
                        if (itemObj.key === "change_password") {
                          setPinAction("change_pin");
                          setInputPin("");
                          setNewPin("");
                          setPinError("");
                          setShowPinModal(true);
                        }
                      }}
                      className="w-full flex items-center justify-between py-3.5 border-t border-zinc-800/80 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover:text-white transition-colors">
                          {itemObj.icon}
                        </div>
                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors flex items-center gap-2">
                          {t(itemObj.key)}
                          {itemObj.key === "simple_mode" && useStore.getState().simpleMode && (
                            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Ativo</span>
                          )}
                          {itemObj.key === "kids_mode" && isKidsMode && (
                            <span className="text-[9px] bg-pink-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Ativo</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {itemObj.key === "simple_mode" && (
                          <div className={`w-7 h-4 rounded-full transition-colors relative ${useStore.getState().simpleMode ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${useStore.getState().simpleMode ? 'left-3.5' : 'left-0.5'}`} />
                          </div>
                        )}
                        {itemObj.key === "kids_mode" && (
                          <div className={`w-7 h-4 rounded-full transition-colors relative ${isKidsMode ? 'bg-pink-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isKidsMode ? 'translate-x-3.5' : 'left-0.5'}`} />
                          </div>
                        )}
                        {itemObj.key === "change_password" && (
                          <span className="text-[10px] bg-zinc-700 text-white px-2 py-1 rounded font-bold">Alterar</span>
                        )}
                        <ChevronRight size={16} className="text-zinc-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleLogout}
              className="w-full py-4 text-sm font-bold bg-zinc-800/50 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-all border border-zinc-800"
            >
              Sair da conta
            </button>
            <EditProfileModal
              isOpen={showEditProfile}
              onClose={() => setShowEditProfile(false)}
            />
            <MessagesModal
              isOpen={showMessagesModal}
              onClose={() => setShowMessagesModal(false)}
              targetUserId={selectedChatUser?.uid}
            />
            <MyPublicationsModal
              isOpen={showMyPublicationsModal}
              onClose={() => setShowMyPublicationsModal(false)}
            />
            <PointsWalletModal
              isOpen={showPointsWallet}
              onClose={() => setShowPointsWallet(false)}
            />
            <PlansModal
              isOpen={showPlansModal}
              onClose={() => setShowPlansModal(false)}
            />
            <CreativeHoursModal
              isOpen={showCreativeHoursModal}
              onClose={() => setShowCreativeHoursModal(false)}
            />
            <TeamsModal
              isOpen={showTeamsModal}
              onClose={() => setShowTeamsModal(false)}
            />
            {showAboutModal && (
              <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Info size={20} className="text-indigo-400" />
                      Sobre o aplicativo
                    </h2>
                    <button
                      onClick={() => setShowAboutModal(false)}
                      className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 flex flex-col gap-4 text-sm text-zinc-300">
                    <div className="flex flex-col items-center gap-2 mb-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Brush size={40} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mt-2">Cloud Studio Paint</h3>
                      <p className="text-xs text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded">Versão 3.2.7</p>
                    </div>
                    <div className="space-y-3 leading-relaxed">
                      <p>
                        <strong>Cloud Studio Paint</strong> é um aplicativo web completo focado em ilustração digital e animação.
                        Ele foi criado com React, Tailwind CSS e as tecnologias web mais modernas, permitindo desenho nativo pelo canvas do HTML5 com suporte a modos de mesclagem e máscaras de corte.
                      </p>
                      <p>
                        Acesse as incríveis funcionalidades colaborativas, armazenamento de projetos em nuvem e a integração nativa com seu espaço de criatividade online!
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-center text-zinc-500">
                      © {new Date().getFullYear()} Cloud Studio Paint.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Community Art Preview Modal */}
      {selectedArtPreview && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2d2d2d] w-full max-w-4xl rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            {/* Left Image Column */}
            <div className="flex-[1.2] bg-zinc-950 flex items-center justify-center min-h-[300px] max-h-[45vh] md:max-h-none overflow-hidden relative group">
              {selectedArtPreview.isAnimation && selectedArtPreview.animationData ? (
                <video
                  src={selectedArtPreview.animationData}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain max-h-[45vh] md:max-h-[80vh]"
                />
              ) : (
                <img
                  src={selectedArtPreview.thumbnail}
                  alt={selectedArtPreview.title}
                  className="w-full h-full object-contain max-h-[45vh] md:max-h-[80vh]"
                  referrerPolicy="no-referrer"
                />
              )}
              <button 
                onClick={() => {
                  const link = document.createElement("a");
                  if (selectedArtPreview.isAnimation && selectedArtPreview.animationData) {
                    link.href = selectedArtPreview.animationData;
                    link.download = `${selectedArtPreview.title}.webm`;
                  } else {
                    link.href = selectedArtPreview.thumbnail;
                    link.download = `${selectedArtPreview.title}.webp`;
                  }
                  link.click();
                }}
                className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download size={12} /> Baixar
              </button>
            </div>
            {/* Right Details & Interaction Column */}
            <div className="w-full md:w-[380px] p-6 flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 bg-[#242424] overflow-y-auto scrollbar-thin">
              <div className="space-y-4 flex flex-col flex-none">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-black text-zinc-100 line-clamp-1">{selectedArtPreview.title}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t("digital_art")}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedArtPreview(null)}
                    className="text-zinc-400 hover:text-white bg-[#1e1e1e] hover:bg-zinc-800 p-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-3 bg-[#1e1e1e] p-3 rounded-xl border border-zinc-800/60">
                  {(() => {
                    const authorProfile = users.find((u) => u.uid === selectedArtPreview.userId);
                    const userPhoto = authorProfile?.photoURL || selectedArtPreview.userPhotoURL || "https://picsum.photos/seed/avatar/100";
                    const displayName = authorProfile?.displayName || selectedArtPreview.userDisplayName || "Anônimo";
                    return (
                      <>
                        <img
                          src={userPhoto}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-xs font-black text-zinc-200">{displayName}</p>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">{t("published_artist")}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{t("description_label")}</label>
                  <p className="text-xs text-zinc-300 leading-relaxed max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                    {selectedArtPreview.description || t("no_description")}
                  </p>
                </div>

                {/* Comments List Section */}
                <div className="flex-none flex flex-col space-y-2 border-t border-zinc-800 pt-3">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                    {t("comments_label")} ({previewComments.length})
                  </span>
                  <div className="flex-none space-y-3 pb-4">
                    {previewComments.length > 0 ? (
                      previewComments.map((comment) => {
                        const commenterProfile = users.find((u) => u.uid === comment.userId);
                        const commenterPhoto = commenterProfile?.photoURL || comment.userPhotoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${comment.userId}`;
                        const commenterName = commenterProfile?.displayName || comment.userDisplayName || "Anônimo";
                        const isAuthor = user && user.uid === comment.userId;
                        const isPostOwner = user && selectedArtPreview && user.uid === selectedArtPreview.userId;
                        const canDelete = isAuthor || isPostOwner;

                        return (
                          <div key={comment.id} className="bg-[#1e1e1e] p-2 rounded-lg border border-zinc-800/60 flex items-start gap-2 text-xs">
                            <img
                              src={commenterPhoto}
                              alt={commenterName}
                              className="w-6 h-6 rounded-full object-cover border border-zinc-700"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-300 text-[10px] truncate">{commenterName}</span>
                                {comment.createdAt && (
                                  <span className="text-[8px] text-zinc-500 shrink-0">
                                    {comment.isEdited && "(editado) "}
                                    {new Date(comment.createdAt.seconds * 1000).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="flex flex-col gap-1 mt-1">
                                  <input
                                    type="text"
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-indigo-600"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleEditComment(comment.id, editingCommentText);
                                      }
                                    }}
                                  />
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentText("");
                                      }}
                                      className="text-[9px] font-bold text-zinc-400 hover:text-zinc-350 px-2 py-1 cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => handleEditComment(comment.id, editingCommentText)}
                                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer"
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-zinc-400 mt-0.5 break-words text-[11px]">{comment.text}</p>
                                  <div className="flex items-center gap-3 mt-1.5 border-t border-zinc-800/40 pt-1">
                                    {isAuthor && (
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditingCommentText(comment.text);
                                        }}
                                        className="text-[9px] text-zinc-500 hover:text-zinc-300 font-bold transition-colors cursor-pointer"
                                      >
                                        Editar
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-[9px] text-zinc-500 hover:text-red-400 font-bold transition-colors cursor-pointer"
                                      >
                                        Excluir
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-zinc-500 text-center py-4">{t("no_comments")}</p>
                    )}
                  </div>
                  {/* Comment Input */}
                  {user ? (
                    <div className="flex gap-1 pt-1">
                      <input
                        type="text"
                        placeholder={t("comment_input_placeholder")}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePostComment();
                          }
                        }}
                        className="flex-1 bg-[#1e1e1e] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        onClick={handlePostComment}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded"
                      >
                        {t("comment_send")}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-500 text-center">{t("comment_login_warning")}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Likes, Dislikes, Reports */}
              <div className="pt-4 border-t border-zinc-800 space-y-3 mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-3 font-semibold text-[10px] uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Heart size={14} className="text-red-500 fill-current" /> {selectedArtPreview.likes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown size={14} className="text-blue-500 fill-current" /> {selectedArtPreview.dislikes || 0}
                    </span>
                  </span>
                  {selectedArtPreview.reports && selectedArtPreview.reports.length > 0 && (
                    <span className="text-[9px] text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40 flex items-center gap-1">
                      <Flag size={10} /> {selectedArtPreview.reports.length}/7 {t("report_button")}s
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500">
                    {selectedArtPreview.createdAt ? new Date(selectedArtPreview.createdAt.seconds * 1000).toLocaleDateString() : t("recent_label")}
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* Like Button */}
                  <button 
                    onClick={async () => {
                      await handleLikeOrDislike(selectedArtPreview.id, "like", selectedArtPreview);
                    }}
                    className={twMerge(
                      "flex-1 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-md",
                      user && Array.isArray(selectedArtPreview.likedBy) && selectedArtPreview.likedBy.includes(user.uid)
                        ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/15"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15"
                    )}
                  >
                    <Heart size={14} className={user && Array.isArray(selectedArtPreview.likedBy) && selectedArtPreview.likedBy.includes(user.uid) ? "fill-current" : ""} />
                    {user && Array.isArray(selectedArtPreview.likedBy) && selectedArtPreview.likedBy.includes(user.uid) ? "Curtido" : t("like_button")}
                  </button>

                  {/* Dislike Button */}
                  <button 
                    onClick={async () => {
                      await handleLikeOrDislike(selectedArtPreview.id, "dislike", selectedArtPreview);
                    }}
                    className={twMerge(
                      "flex-1 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-md",
                      user && Array.isArray(selectedArtPreview.dislikedBy) && selectedArtPreview.dislikedBy.includes(user.uid)
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/15"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shadow-zinc-800/15"
                    )}
                  >
                    <ThumbsDown size={14} className={user && Array.isArray(selectedArtPreview.dislikedBy) && selectedArtPreview.dislikedBy.includes(user.uid) ? "fill-current" : ""} />
                    {user && Array.isArray(selectedArtPreview.dislikedBy) && selectedArtPreview.dislikedBy.includes(user.uid) ? "Não Curtido" : "Não Curtir"}
                  </button>

                  {/* Report Button */}
                  <button 
                    onClick={handleToggleReport}
                    className={twMerge(
                      "px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                      selectedArtPreview.reports?.includes(user?.uid)
                        ? "bg-red-950/20 text-red-400 border-red-500/40 hover:bg-red-900/30"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                    )}
                    title="Se atingir 7 denúncias, o desenho será excluído."
                  >
                    <Flag size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notice Modal Overlay */}
      {showNoticeModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowNoticeModal(null)}
        >
          <div
            className="bg-[#2d2d2d] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-[#1a1a1a]">
              <h3 className="font-bold text-[9px] text-zinc-400 uppercase tracking-widest">
                Aviso Oficial
              </h3>
              <button
                onClick={() => setShowNoticeModal(null)}
                className="bg-zinc-800 p-1.5 rounded-full hover:bg-zinc-700 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h2 className="text-lg font-bold leading-tight">
                {showNoticeModal.title}
              </h2>
              <div className="aspect-video w-full bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                <img
                  src={`https://picsum.photos/seed/${showNoticeModal.title}/800/450`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {showNoticeModal.content}
              </div>
            </div>
            <div className="p-3 bg-[#1a1a1a] flex justify-end">
              <button
                onClick={() => setShowNoticeModal(null)}
                className="px-6 py-1.5 bg-indigo-600 rounded-full font-bold text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] w-full max-w-2xl h-[90vh] rounded-2xl overflow-hidden flex flex-col border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-[#0f0f0f] border-b border-zinc-800 flex justify-between items-center text-zinc-400">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Tutorial de Arte
                </span>
              </div>
              <button
                onClick={() => setShowTutorialModal(null)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
              <img
                src={showTutorialModal.img}
                className="w-full aspect-video object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black leading-tight text-white">
                    {showTutorialModal.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                      <UserIcon size={14} />
                    </div>
                    <span className="text-sm text-zinc-400 font-bold">
                      {showTutorialModal.author}
                    </span>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none text-zinc-400 text-sm leading-relaxed space-y-4">
                  <p>
                    Em vez de apenas ler, que tal aprender na prática? Este tutorial foi atualizado para ser interativo!
                  </p>
                  <p>
                    Vamos te guiar diretamente no seu workspace de criação. Aprenda a usar os pincéis, camadas, filtros e ferramentas de animação através do nosso guia passo-a-passo interativo.
                  </p>
                  <div className="bg-zinc-900/50 p-4 border-l-4 border-blue-600 rounded-r-lg">
                    <p className="font-bold text-white mb-1">Dica Pro:</p>
                    <p className="italic">
                      Clique em "Começar Tour Interativo" abaixo para iniciar a experiência no app!
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#0f0f0f] border-t border-zinc-800 flex justify-end gap-3">
              <button className="px-6 py-2 bg-zinc-800 rounded-full text-xs font-bold hover:bg-zinc-700 transition-all border border-zinc-700">
                Favoritar
              </button>
              <button
                onClick={() => {
                  setShowTutorialModal(null);
                  useStore.getState().resetTutorial();
                  useStore.getState().createNewProject();
                }}
                className="px-8 py-2 bg-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-500 transition-all"
              >
                Começar Tour Interativo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brush Tester Modal */}
      {showBrushTesterModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  {showBrushTesterModal.title}
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">
                  Testar Material & Brush
                </p>
              </div>
              <button
                onClick={() => setShowBrushTesterModal(null)}
                className="p-2 hover:bg-zinc-800 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[4/3] bg-white rounded-lg overflow-hidden relative shadow-inner group border border-zinc-300">
                <BrushCanvas
                  texture={showBrushTesterModal.texture as any}
                  color="#000000"
                  size={15}
                />
                <div className="absolute top-2 right-2 bg-zinc-900/10 text-[9px] text-zinc-800 font-bold px-2 py-1 rounded-full uppercase">
                  Área de pintura
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <img
                  src={showBrushTesterModal.img}
                  className="w-16 h-16 rounded object-cover border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] text-zinc-400 font-medium">
                    Textura selecionada:{" "}
                    <span className="text-white font-bold">
                      {showBrushTesterModal.texture}
                    </span>
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Experimente a pressão e a textura deste brush na área acima
                    antes de adicionar à sua biblioteca.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#0f0f0f] border-t border-zinc-800 flex gap-4">
              <button
                onClick={() => setShowBrushTesterModal(null)}
                className="flex-1 py-3 bg-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { addBrushPreset } = useStore.getState();
                  addBrushPreset({
                    id: "", // handle in store or here
                    name: showBrushTesterModal.title,
                    size: 20,
                    opacity: 100,
                    color: "#000000",
                    texture: showBrushTesterModal.texture as any,
                  });
                  alert(t("add_brush"));
                  setShowBrushTesterModal(null);
                }}
                className="flex-1 py-3 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
              >
                Adicionar Brush
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete/Options Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f1f1f] border border-zinc-700 w-full max-w-sm rounded-xl p-6 text-white">
            <h2 className="text-xl font-bold mb-4">
              Escolha o modo de exclusão
            </h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleConfirmDelete("all")}
                className="py-3 bg-red-600 rounded-lg hover:bg-red-500"
              >
                Excluir tudo ({t("source_cloud", "Nuvem")} + App)
              </button>
              <button
                onClick={() => handleConfirmDelete("app")}
                className="py-3 bg-zinc-700 rounded-lg hover:bg-zinc-600"
              >
                Somente no aplicativo
              </button>
              <button
                onClick={() => handleConfirmDelete("cloud")}
                className="py-3 bg-zinc-700 rounded-lg hover:bg-zinc-600"
              >
                Somente na nuvem
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="py-3 bg-transparent rounded-lg border border-zinc-700 hover:border-zinc-500 mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-16 bg-[#2d2d2d] flex items-center justify-around border-t border-zinc-800 shrink-0 pb-safe z-50">
        <NavButton
          icon={<Home size={22} />}
          label={t("nav_home")}
          onClick={() => {
            setSubView("feed");
          }}
          active={subView === "feed"}
        />
        <NavButton
          icon={<Layers size={22} />}
          label={t("nav_projects")}
          onClick={() => {
            setSubView("projects");
          }}
          active={subView === "projects"}
        />
        <NavButton
          icon={<Users size={22} />}
          label={t("nav_multiplayer")}
          onClick={() => {
            setSubView("multiplayer");
          }}
          active={subView === "multiplayer"}
        />

        {/* Main Action Button */}
        <button
          onClick={() => createNewProject()}
          className="relative -top-3 flex flex-col items-center group"
        >
          <div className="w-14 h-14 bg-[#3daef2] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 group-active:scale-95 transition-all">
            <Brush size={28} className="text-white" />
          </div>
          <span className="text-[10px] font-bold mt-1 text-[#3daef2]">
            {t("nav_draw")}
          </span>
        </button>

        <NavButton
          icon={
            <div className="relative">
              <Bell size={22} />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#2d2d2d]" />
            </div>
          }
          label={t("nav_notices")}
          onClick={() => setSubView("notices")}
          active={subView === "notices"}
        />
        <NavButton
          icon={
            user ? (
              <div
                className="w-6 h-6 bg-[#8ba4ae] rounded-full flex items-center justify-center overflow-hidden border border-zinc-600 cursor-pointer"
                onClick={() => setSubView("account")}
              >
                {userProfile?.photoURL ||
                localStorage.getItem(`profile_photo_${user.uid}`) ||
                user.photoURL ? (
                  <img
                    src={
                      userProfile?.photoURL ||
                      localStorage.getItem(`profile_photo_${user.uid}`) ||
                      user.photoURL ||
                      ""
                    }
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[6px] font-black text-white/50">
                      NO
                    </span>
                    <span className="text-[6px] font-black text-white/50">
                      image
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <UserCircle size={22} />
            )
          }
          label={t("nav_account")}
          onClick={() => {
            if (user) setSubView("account");
            else setSubView("login");
          }}
          active={
            subView === "account" ||
            subView === "login" ||
            subView === "register" ||
            subView === "forgot"
          }
        />
      </div>

      {/* Pin Modal for Kids Mode */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2000] p-6 animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95">
            <button 
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-amber-400 border border-zinc-700">
                <Lock size={28} />
              </div>
              <h2 className="text-xl font-bold text-white">
                {pinAction === 'disable' ? 'Desativar Modo Infantil' : 'Alterar Senha'}
              </h2>
              <p className="text-sm text-zinc-400 mt-2">
                {pinAction === 'disable' 
                  ? 'Digite a senha dos responsáveis para sair do modo infantil.' 
                  : 'Digite a senha atual e a nova senha.'}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                  Senha Atual
                </label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={inputPin}
                  onChange={e => setInputPin(e.target.value)}
                  placeholder="****"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-indigo-500 outline-none transition-colors text-white"
                />
              </div>

              {pinAction === 'change_pin' && (
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                    Nova Senha (4 dígitos)
                  </label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="****"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-indigo-500 outline-none transition-colors text-white"
                  />
                </div>
              )}

              {pinError && <p className="text-red-400 text-xs text-center font-medium">{pinError}</p>}

              <button 
                onClick={handlePinSubmit}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
