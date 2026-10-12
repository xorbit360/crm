import React, { useCallback, useEffect, useState } from 'react';
import { Mail, ShieldCheck, Trash2, Save, RefreshCw } from 'lucide-react';

interface EmailProviderInfo {
  emailFrom: string | null;
  emailApiKeySet: boolean;
  emailApiKeyMasked: string | null;
  emailReady: boolean;
  notifyEmail: string | null;
  encryptionEnabled: boolean;
}

/**
 * Proveedor de correo (solo super admin): la clave de Resend se pega aqui,
 * viaja una sola vez al servidor y queda guardada cifrada (AES-256-GCM).
 * Reutiliza el mismo almacenamiento que el tab Diagnostico
 * (app_settings -> diagnostic.settings -> emailApiKey).
 * Este panel nunca recibe la clave de vuelta: solo si existe y su mascara.
 */
export default function ProveedorCorreoResend() {
  const [info, setInfo] = useState<EmailProviderInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/diagnostic/settings');
      const data = await res.json().catch(() => null);
      if (res.ok && data?.settings) {
        const s = data.settings;
        setInfo({
          emailFrom: s.emailFrom ?? null,
          emailApiKeySet: !!s.emailApiKeySet,
          emailApiKeyMasked: s.emailApiKeyMasked ?? null,
          emailReady: !!s.emailReady,
          notifyEmail: s.notifyEmail ?? null,
          encryptionEnabled: s.encryptionEnabled !== false,
        });
        setEmailFrom(s.emailFrom || '');
        setNotifyEmail(s.notifyEmail || '');
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
    const payload: any = {
      emailFrom: emailFrom.trim(),
      notifyEmail: notifyEmail.trim(),
    };
    const key = apiKey.trim();
    if (key) payload.emailApiKey = key;
    if (!key && !info?.emailApiKeySet) {
      setError('Pega primero tu clave de Resend (re_...).');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/diagnostic/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la configuracion.');
      const s = data.settings;
      setInfo({
        emailFrom: s.emailFrom ?? null,
        emailApiKeySet: !!s.emailApiKeySet,
        emailApiKeyMasked: s.emailApiKeyMasked ?? null,
        emailReady: !!s.emailReady,
        notifyEmail: s.notifyEmail ?? null,
        encryptionEnabled: s.encryptionEnabled !== false,
      });
      setApiKey('');
      setMessage('Configuracion de correo guardada. Los correos del CRM salen desde tu dominio.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar la configuracion.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/diagnostic/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearEmailApiKey: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar la clave.');
      const s = data.settings;
      setInfo((prev) => prev ? { ...prev, emailApiKeySet: false, emailApiKeyMasked: null, emailReady: false } : prev);
      setMessage('Clave de Resend eliminada de la configuracion.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar la clave.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-6 rounded-2xl border border-gray-800 space-y-5 md:col-span-2">
      <div className="flex items-center gap-3 border-b border-gray-800/80 pb-4">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Mail size={20} />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">Proveedor de Correo · Resend</h3>
          <p className="text-xs text-gray-400">
            Correos transaccionales del CRM: registro, recuperar contraseña y diagnóstico. Salen desde tu dominio (@xorbit360.com). La clave se guarda cifrada y nunca se muestra.
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
          No se pudo leer la configuracion de correo. Revisa que tu sesion sea de super admin.
        </div>
      )}

      {info && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {info.emailApiKeySet ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
                <ShieldCheck size={12} />
                Clave guardada {info.emailApiKeyMasked || ''}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700 text-[11px] font-bold">
                Sin clave configurada
              </span>
            )}
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${info.emailReady ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              Correo transaccional: {info.emailReady ? 'LISTO' : 'pendiente (falta clave o correo destino)'}
            </span>
            {!info.encryptionEnabled && (
              <span className="text-[11px] text-amber-300">
                El cifrado no esta disponible en el servidor; no guardes la clave todavia.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest block">
                Remitente (nombre y correo)
              </label>
              <input
                type="text"
                value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)}
                placeholder="Xorbit 360 <noreply@xorbit360.com>"
                autoComplete="off"
                className="w-full rounded-xl border border-gray-800 bg-gray-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-amber-500/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest block">
                Correo de notificaciones (destino)
              </label>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="admin@xorbit360.com"
                autoComplete="off"
                className="w-full rounded-xl border border-gray-800 bg-gray-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest block">
              Resend API Key {info.emailApiKeySet ? '(escribe solo si quieres reemplazarla)' : ''}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={info.emailApiKeySet ? 'Clave guardada: pega otra solo si la vas a reemplazar' : 'Pega aqui tu clave de Resend (re_...)'}
                autoComplete="new-password"
                className="flex-1 rounded-xl border border-gray-800 bg-gray-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-amber-500/60"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={busy || !info.encryptionEnabled}
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save size={15} />
                Guardar correo
              </button>
              {info.emailApiKeySet && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 size={15} />
                  Eliminar clave
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Al guardar, la clave viaja una sola vez, queda cifrada en la base de datos y este campo vuelve a quedar vacio. El tab Diagnostico lee esta misma configuracion.
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
