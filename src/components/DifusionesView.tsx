import React, { useEffect, useState } from 'react';
import { Megaphone, Send, Users, ShieldCheck, FlaskConical, BellRing, History, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Broadcast {
  id: string;
  title: string;
  body: string;
  url?: string | null;
  audience: string;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

const AUDIENCES = [
  { id: 'all', label: 'Todos los usuarios', icon: <Users size={16} /> },
  { id: 'superadmin', label: 'Solo Super Admin', icon: <ShieldCheck size={16} /> },
  { id: 'admin', label: 'Solo Admin', icon: <ShieldCheck size={16} /> },
  { id: 'tester', label: 'Solo Tester', icon: <FlaskConical size={16} /> },
];

export default function DifusionesView() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [stats, setStats] = useState<{ total: number; byRole: Record<string, number> } | null>(null);

  const loadData = async () => {
    try {
      const [h, s] = await Promise.all([
        fetch('/api/push/broadcasts', { credentials: 'same-origin' }).then(r => r.json()),
        fetch('/api/push/stats', { credentials: 'same-origin' }).then(r => r.json()),
      ]);
      if (h?.success) setHistory(h.broadcasts || []);
      if (s?.success) setStats({ total: s.total || 0, byRole: s.byRole || {} });
    } catch { /* silencioso */ }
  };

  useEffect(() => { loadData(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || sending) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim(), audience }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'No se pudo enviar');
      setResult({ sent: data.sent || 0, failed: data.failed || 0 });
      setTitle('');
      setBody('');
      setUrl('');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  const audienceLabel = (id: string) => AUDIENCES.find(a => a.id === id)?.label || id;

  return (
    <div className="p-6 bg-black/50 border border-gray-800 rounded-2xl animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
            <Megaphone size={20} />
          </div>
          Difusiones push
        </h2>
        {stats && (
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <BellRing size={14} className="text-gold-400" />
            {stats.total} dispositivo{stats.total === 1 ? '' : 's'} suscrito{stats.total === 1 ? '' : 's'}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-6">
        Envía una notificación a la app instalada en el celular de tus usuarios. Úsalo para avisar actualizaciones, noticias o lanzamientos.
      </p>

      <form onSubmit={handleSend} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Audiencia</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AUDIENCES.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAudience(a.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  audience === a.id
                    ? 'bg-gold-500/15 border-gold-500/50 text-amber-300'
                    : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                }`}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
          {stats && audience !== 'all' && (
            <p className="text-xs text-gray-500 mt-1.5">
              Alcance estimado: {stats.byRole[audience] || 0} dispositivo{(stats.byRole[audience] || 0) === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Título</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Ej: Nueva actualización disponible"
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Mensaje</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={240}
            rows={3}
            placeholder="Ej: Ya puedes ver el nuevo módulo de reportes en tu panel."
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold-500/50 resize-none"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{body.length}/240</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Enlace al abrir (opcional)</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/herramientas  o  https://xorbit360.com/novedades"
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <XCircle size={16} /> {error}
          </div>
        )}
        {result && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <CheckCircle2 size={16} /> Difusión enviada: {result.sent} entregada{result.sent === 1 ? '' : 's'}{result.failed > 0 ? `, ${result.failed} fallida${result.failed === 1 ? '' : 's'}` : ''}.
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !title.trim() || !body.trim()}
          className="w-full md:w-auto bg-gold-500 hover:bg-gold-400 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? 'Enviando…' : 'Enviar difusión'}
        </button>
      </form>

      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
          <History size={16} className="text-gray-500" /> Historial
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-600">Aún no has enviado difusiones.</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{h.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{h.body}</p>
                  </div>
                  <span className="shrink-0 text-[11px] px-2 py-1 rounded-lg bg-gray-800 text-gray-300">
                    {audienceLabel(h.audience)}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {h.sent_count}</span>
                  {h.failed_count > 0 && <span className="flex items-center gap-1"><XCircle size={12} className="text-red-500" /> {h.failed_count}</span>}
                  <span>{new Date(h.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
