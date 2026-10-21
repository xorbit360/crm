import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Crown, CheckCircle2, AlertCircle, CreditCard, Radio } from 'lucide-react';

interface Niche {
  key: string;
  name: string;
  roles: { key: string; name: string }[];
}

interface TeamMember {
  userKey: string;
  name: string;
  email: string;
  role: string;
  roleName: string;
  addedAt: string;
}

interface ChannelStatus {
  channelsUsed: number;
  freeChannels: number;
  canAddMore: boolean;
  reason: string | null;
  pricePerAdditionalChannel: number;
  currency: string;
}

export default function TeamManagementView({ currentUser }: { currentUser?: any }) {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [myNiche, setMyNiche] = useState<string>('ecommerce');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ userKey: '', name: '', email: '', role: '' });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  const load = async () => {
    setLoading(true);
    try {
      const [nRes, mRes, cRes, nMyRes] = await Promise.all([
        fetch('/api/team/niches').then(r => r.json()),
        fetch('/api/team/members').then(r => r.json()),
        fetch('/api/channels/status').then(r => r.json()),
        fetch('/api/team/my-niche').then(r => r.json()),
      ]);
      if (nRes.success) setNiches(nRes.niches);
      if (mRes.success) setMembers(mRes.members);
      if (cRes.success) setChannelStatus(cRes);
      if (nMyRes.success) setMyNiche(nMyRes.niche);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeNiche = async (niche: string) => {
    const r = await fetch('/api/team/niche', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche })
    }).then(r => r.json());
    if (r.success) {
      setMyNiche(niche);
      setMsg({ type: 'ok', text: 'Nicho actualizado. Los roles disponibles se actualizaron.' });
    } else {
      setMsg({ type: 'err', text: r.error || 'Error al cambiar nicho' });
    }
  };

  const inviteMember = async () => {
    if (!inviteForm.userKey || !inviteForm.role) {
      setMsg({ type: 'err', text: 'Completa usuario y rol' });
      return;
    }
    const r = await fetch('/api/team/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm)
    }).then(r => r.json());
    if (r.success) {
      setMsg({ type: 'ok', text: 'Miembro agregado al equipo' });
      setShowInvite(false);
      setInviteForm({ userKey: '', name: '', email: '', role: '' });
      load();
    } else {
      setMsg({ type: 'err', text: r.error || 'Error al invitar' });
    }
  };

  const removeMember = async (userKey: string) => {
    if (!confirm('¿Eliminar este miembro del equipo?')) return;
    const r = await fetch(`/api/team/members/${encodeURIComponent(userKey)}`, { method: 'DELETE' }).then(r => r.json());
    if (r.success) {
      setMsg({ type: 'ok', text: 'Miembro eliminado' });
      load();
    }
  };

  const currentNiche = niches.find(n => n.key === myNiche);
  const availableRoles = currentNiche?.roles || [];

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando equipo...</div>;

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`}>
          {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Nicho del negocio */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-1">
          <Crown size={18} className="text-amber-400" /> Nicho de tu negocio
        </h3>
        <p className="text-sm text-gray-400 mb-4">Los roles disponibles para tu equipo dependen del nicho.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {niches.map(n => (
            <button
              key={n.key}
              onClick={() => isAdmin && changeNiche(n.key)}
              disabled={!isAdmin}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                myNiche === n.key
                  ? 'border-amber-400 bg-amber-400/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
              } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="font-semibold text-sm">{n.name}</div>
              <div className="text-xs text-gray-500 mt-1">{n.roles.length} roles</div>
            </button>
          ))}
        </div>
      </div>

      {/* Estado de canales */}
      {channelStatus && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-1">
            <Radio size={18} className="text-amber-400" /> Canales conectados
          </h3>
          <div className="flex items-center gap-4 mt-3">
            <div className="text-3xl font-bold text-white">{channelStatus.channelsUsed}</div>
            <div className="text-sm text-gray-400">
              <div>{channelStatus.freeChannels} gratis incluido</div>
              <div className="text-amber-300">${channelStatus.pricePerAdditionalChannel} USD/mes por adicional</div>
            </div>
          </div>
          {!channelStatus.canAddMore && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-200">
              <CreditCard size={16} className="mt-0.5 shrink-0" />
              <span>{channelStatus.reason}</span>
            </div>
          )}
        </div>
      )}

      {/* Miembros del equipo */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Users size={18} className="text-amber-400" /> Mi equipo ({members.length})
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-black hover:bg-amber-300"
            >
              <Plus size={14} /> Invitar
            </button>
          )}
        </div>

        {showInvite && isAdmin && (
          <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Usuario (ej: maria)"
                value={inviteForm.userKey}
                onChange={e => setInviteForm({ ...inviteForm, userKey: e.target.value })}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500"
              />
              <input
                placeholder="Nombre"
                value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500"
              />
              <input
                placeholder="Email (opcional)"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500"
              />
              <select
                value={inviteForm.role}
                onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              >
                <option value="">Seleccionar rol...</option>
                {availableRoles.filter(r => r.key !== 'admin').map(r => (
                  <option key={r.key} value={r.key}>{r.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={inviteMember}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300"
            >
              Agregar al equipo
            </button>
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No hay miembros en tu equipo. {isAdmin && 'Invita a tu equipo para que te ayuden.'}
          </p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.userKey} className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/30 px-4 py-3">
                <div>
                  <div className="font-semibold text-white text-sm">{m.name}</div>
                  <div className="text-xs text-gray-500">@{m.userKey} · {m.roleName}</div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => removeMember(m.userKey)}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles del nicho */}
      {currentNiche && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <h3 className="text-lg font-bold text-white mb-3">Roles de {currentNiche.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {currentNiche.roles.map(r => (
              <div key={r.key} className="rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-2 text-sm">
                <span className="font-semibold text-amber-300">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
