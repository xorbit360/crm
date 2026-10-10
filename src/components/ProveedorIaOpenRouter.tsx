import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, Trash2, Save, RefreshCw, Cpu } from 'lucide-react';

interface OpenRouterKeyInfo {
  configured: boolean;
  source: 'env' | 'db' | null;
  masked: string | null;
  routeActive: boolean;
  classifierModel: string;
  responseModel: string;
  classifierMaxTokens: number;
  responseMaxTokens: number;
  encryptionEnabled: boolean;
}

/**
 * Proveedor IA (solo super admin): la clave de OpenRouter se pega aqui,
 * viaja una sola vez al servidor y queda guardada cifrada (AES-256-GCM).
 * Este panel nunca recibe la clave de vuelta: solo si existe y su mascara.
 */
export default function ProveedorIaOpenRouter() {
  const [info, setInfo] = useState<OpenRouterKeyInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-provider');
      const data = await res.json().catch(() => null);
      if (res.ok && data?.openrouter) {
        setInfo(data.openrouter);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const value = apiKey.trim();
    if (!value) {
      setError('Pega primero tu clave de OpenRouter.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ai-provider/openrouter-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la clave.');
      setInfo(data.openrouter || null);
      setApiKey('');
      setMessage('Clave guardada cifrada. La ruta economica de IA queda activa sin recargar el bot.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar la clave.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ai-provider/openrouter-key', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar la clave.');
      setInfo(data.openrouter || null);
      setMessage('Clave eliminada de la configuracion.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar la clave.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-6 rounded-2xl border border-gray-800 space-y-5 md:col-span-2">
      <div className="flex items-center gap-3 border-b border-gray-800/80 pb-4">
        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <KeyRound size={20} />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">Proveedor IA · OpenRouter</h3>
          <p className="text-xs text-gray-400">
            Ruta economica de IA del CRM (solo super admin). La clave se guarda cifrada con AES-256-GCM y nunca se muestra ni se devuelve.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="ml-auto p-2 rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
          title="Actualizar estado"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs">
          No se pudo leer el estado del proveedor IA. Revisa que tu sesion sea de super admin.
        </div>
      )}

      {info && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {info.configured ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
                <ShieldCheck size={12} />
                Clave guardada {info.masked || ''}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700 text-[11px] font-bold">
                Sin clave configurada
              </span>
            )}
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${info.routeActive ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              Ruta OpenRouter: {info.routeActive ? 'ACTIVA' : 'inactiva (fallback del panel)'}
            </span>
            {info.source === 'env' && (
              <span className="text-[11px] text-gray-400">
                La clave activa viene de la variable de entorno del servidor y tiene prioridad sobre la del panel.
              </span>
            )}
            {!info.encryptionEnabled && (
              <span className="text-[11px] text-amber-300">
                El cifrado no esta disponible en el servidor (falta SETTINGS_ENCRYPTION_KEY); no guardes la clave todavia.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3.5">
              <div className="flex items-center gap-2 text-gray-300 font-semibold mb-1">
                <Cpu size={13} className="text-violet-300" />
                Modelo clasificador (filtro)
              </div>
              <p className="text-gray-400 font-mono text-[11px] break-all">{info.classifierModel}</p>
              <p className="text-gray-500 mt-1">Salida maxima: {info.classifierMaxTokens} tokens · se ajusta por entorno del servidor</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3.5">
              <div className="flex items-center gap-2 text-gray-300 font-semibold mb-1">
                <Cpu size={13} className="text-violet-300" />
                Modelo de respuesta
              </div>
              <p className="text-gray-400 font-mono text-[11px] break-all">{info.responseModel}</p>
              <p className="text-gray-500 mt-1">Salida maxima: {info.responseMaxTokens} tokens · se ajusta por entorno del servidor</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest block">
              OpenRouter API Key {info.configured && info.source === 'db' ? '(escribe solo si quieres reemplazarla)' : ''}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-..."
                autoComplete="new-password"
                className="flex-1 rounded-xl border border-gray-800 bg-gray-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-violet-500/60"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={busy || !apiKey.trim() || !info.encryptionEnabled}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-violet-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save size={15} />
                {info.configured && info.source === 'db' ? 'Reemplazar' : 'Guardar'} clave
              </button>
              {info.configured && info.source === 'db' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 size={15} />
                  Eliminar
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Al guardar, la clave viaja una sola vez, queda cifrada en la base de datos y este campo vuelve a quedar vacio. Sin clave, el bot sigue con el proveedor del panel (fallback).
            </p>
          </div>

          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs">{message}</div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs">{error}</div>
          )}
        </>
      )}
    </div>
  );
}
