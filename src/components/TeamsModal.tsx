import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Shield, Search, Trash2, Check, Sparkles, UserCheck, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, setDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export function TeamsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useStore();
  const [teamName, setTeamName] = useState('Esquadrão Pixel Art');
  const [isEditingName, setIsEditingName] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  
  // Local active members
  const [members, setMembers] = useState<any[]>([]);

  // Firestore pending invitations
  const [firebaseInvites, setFirebaseInvites] = useState<any[]>([]);

  // Sincronizar equipe do usuário em tempo real
  useEffect(() => {
    if (!user || !isOpen) return;

    const teamRef = doc(db, 'teams', user.uid);
    const unsubscribe = onSnapshot(teamRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.name) setTeamName(data.name);
        if (data.members) setMembers(data.members);
      } else {
        // Se a equipe não existir, criamos a inicial com o próprio dono
        const initialMembers = [
          { uid: user.uid, name: user.displayName || 'Você', query: user.uid, role: 'Dono', status: 'Ativo' },
        ];
        setMembers(initialMembers);
        setDoc(teamRef, {
          id: user.uid,
          name: 'Esquadrão Pixel Art',
          ownerId: user.uid,
          members: initialMembers,
          updatedAt: serverTimestamp()
        }).catch(err => console.error("Erro ao registrar equipe inicial:", err));
      }
    }, (err) => {
      console.error("Erro ao sincronizar equipe:", err);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  // Sincronizar convites do time enviados
  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, "invites"),
      where("senderId", "==", user.uid),
      where("inviteType", "==", "team"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFirebaseInvites(list);
    }, (err) => {
      console.error("Erro ao sincronizar convites do time:", err);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteQuery.trim() || !user) return;
    
    try {
      const q = query(collection(db, 'users'));
      const querySnap = await getDocs(q);
      const matched = querySnap.docs
         .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
         .find(
           (u) =>
             u.displayName?.toLowerCase() === inviteQuery.trim().toLowerCase() ||
             u.uid === inviteQuery.trim() ||
             u.shortId === inviteQuery.trim(),
         );

      if (!matched) {
        alert("Nenhum artista encontrado com esse nome, ID ou Código Curto.");
        return;
      }

      if (matched.uid === user.uid) {
        alert("Você não pode convidar a si mesmo.");
        return;
      }

      // Check if already in local members or already invited in firebase
      const isAlreadyMember = members.some(m => m.query === matched.uid);
      const isAlreadyInvited = firebaseInvites.some(inv => inv.receiverId === matched.uid);

      if (isAlreadyMember || isAlreadyInvited) {
        alert("Este artista já faz parte da equipe ou possui um convite pendente.");
        return;
      }

      const roleLabel = inviteRole === 'editor' ? 'Editor' : 'Visualizador';
      
      const inviteId = doc(collection(db, "invites")).id;
      await setDoc(doc(db, "invites", inviteId), {
        id: inviteId,
        senderId: user.uid,
        senderName: user.displayName || "Dono",
        receiverId: matched.uid,
        receiverName: matched.displayName || "Artista",
        status: "pending",
        inviteType: "team",
        groupName: teamName,
        memberCount: members.length + firebaseInvites.length + 1,
        createdAt: serverTimestamp(),
      });
      
      setInviteQuery('');
      alert(`Convite enviado com sucesso para ${matched.displayName}!`);
    } catch (err) {
      console.error("Error searching/inviting user", err);
      alert("Erro ao enviar convite.");
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!user) return;
    if (uid === '1' || uid === user.uid) {
      alert('Você não pode se remover do próprio esquadrão!');
      return;
    }

    const invite = firebaseInvites.find(inv => inv.id === uid || inv.receiverId === uid);
    if (invite) {
      if (confirm(`Deseja cancelar o convite pendente para ${invite.receiverName || "este artista"}?`)) {
        try {
          await deleteDoc(doc(db, "invites", invite.id));
          alert("Convite cancelado com sucesso!");
        } catch (e) {
          console.error("Erro ao deletar convite:", e);
        }
      }
    } else {
      if (confirm("Tem certeza que deseja remover este artista de sua equipe?")) {
        try {
          const updatedMembers = members.filter(m => m.uid !== uid);
          setMembers(updatedMembers);
          await setDoc(doc(db, 'teams', user.uid), {
            id: user.uid,
            name: teamName,
            ownerId: user.uid,
            members: updatedMembers,
            updatedAt: serverTimestamp()
          }, { merge: true });
          alert("Membro removido da equipe com sucesso!");
        } catch (e) {
          console.error("Erro ao remover membro no Firestore:", e);
        }
      }
    }
  };

  // Combine local active members with dynamic firebase pending invites
  const allMembers = [
    ...members,
    ...firebaseInvites.map(inv => ({
      uid: inv.id,
      name: inv.receiverName || "Artista",
      query: inv.receiverId,
      role: inv.inviteType === 'team' ? 'Editor' : 'Visualizador',
      status: 'Pendente'
    }))
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="text-emerald-400" size={20} />
              Gerenciamento de Equipes
            </h3>
            <p className="text-xs text-zinc-400">Trabalhe em colaboração com outros artistas em tempo real</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Team Meta Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nome da Equipe</h4>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="bg-[#1a1a1a] text-zinc-200 text-sm h-8 rounded-lg px-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={async () => {
                      setIsEditingName(false);
                      if (user) {
                        try {
                          await setDoc(doc(db, 'teams', user.uid), {
                            id: user.uid,
                            name: teamName,
                            ownerId: user.uid,
                            members: members,
                            updatedAt: serverTimestamp()
                          }, { merge: true });
                        } catch (e) {
                          console.error("Erro ao salvar nome da equipe:", e);
                        }
                      }
                    }}
                    className="p-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-all"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {teamName}
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-xs font-normal text-indigo-400 hover:text-indigo-300 ml-1 hover:underline"
                  >
                    Editar
                  </button>
                </h3>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-400 text-[10px] font-bold uppercase">
              <UserCheck size={11} /> {allMembers.length} membros
            </div>
          </div>

          {/* Invite Form */}
          <form onSubmit={handleInvite} className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserPlus size={14} className="text-indigo-400" />
              Convidar Novo Artista
            </h4>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 text-zinc-600" size={16} />
                <input
                  type="text"
                  placeholder="Nome Exato, UID ou ShortID"
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-zinc-200 text-xs h-9 pl-10 pr-3 rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                className="bg-[#1a1a1a] text-zinc-300 text-xs h-9 px-3 rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="editor">Editor (Pode Desenhar)</option>
                <option value="viewer">Visualizador (Somente Vê)</option>
              </select>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 h-9 rounded-lg transition-all shadow-md shrink-0"
              >
                Enviar Convite
              </button>
            </div>
          </form>

          {/* Members List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Membros do Squad
            </h4>
            <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/10">
              <div className="divide-y divide-zinc-800/50">
                {allMembers.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between p-4 hover:bg-zinc-900/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold uppercase text-xs">
                        {member.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                          {member.name}
                          {member.role === 'Dono' && (
                            <span className="bg-indigo-500/10 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">Dono</span>
                          )}
                          {member.status === 'Pendente' && (
                            <span className="bg-amber-500/10 text-amber-400 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                              <Clock size={8} className="animate-spin" /> Pendente
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{member.query}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-zinc-400 font-medium bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800/40">
                        {member.role}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(member.uid)}
                        className="p-1.5 hover:bg-red-950/20 rounded text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                        title={member.status === 'Pendente' ? "Cancelar convite" : "Remover membro"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
