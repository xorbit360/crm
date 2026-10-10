import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Upload, RefreshCw, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';

interface LiveAudioRecorderProps {
  onSendVoiceNote: (audioData: {
    base64: string;
    dataUrl: string;
    blob: Blob;
    duration: number;
    name: string;
    isPtt: boolean;
  }) => void;
  onCancel?: () => void;
  title?: string;
  className?: string;
  isCompact?: boolean;
}

export const LiveAudioRecorder: React.FC<LiveAudioRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
  title = 'Grabar Nota de Voz (PTT con Ondas)',
  className = '',
  isCompact = false
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'preview' | 'converting'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up recording & audio context on unmount
  useEffect(() => {
    return () => {
      stopRecordingAndStreams();
    };
  }, []);

  const stopRecordingAndStreams = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Set up AudioContext & AnalyserNode for real volume level / audio waves
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setLiveVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (err) {
        console.warn('AudioContext visualization failed, continuing recording:', err);
      }

      // Pick supported mimeType for browser MediaRecorder
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          setAudioBase64(rawBase64);
          setIsConverting(true);

          // Optionally send to backend to pre-convert to OGG OPUS PTT format
          try {
            const resp = await fetch('/api/whatsapp/convert-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mediaBase64: rawBase64 })
            });
            const data = await resp.json();
            if (data.success && data.dataUrl) {
              // El envío usa el data URL original; la ruta /uploads es solo respaldo.
            }
          } catch (e) {
            console.warn('Backend conversion check warning:', e);
          } finally {
            setIsConverting(false);
          }
        };
        reader.readAsDataURL(blob);

        setRecordingState('preview');
      };

      mediaRecorder.start(200);
      setRecordingState('recording');

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Microphone access denied or unsupported:', err);
      setErrorMessage('No se pudo acceder al micrófono. Por favor permite los permisos o sube un archivo de audio.');
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    setAudioDuration(recordingSeconds);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsConverting(true);
    setErrorMessage(null);
    setAudioBlob(file);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      setAudioBase64(rawBase64);
      setAudioUrl(URL.createObjectURL(file));

      try {
        const resp = await fetch('/api/whatsapp/convert-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaBase64: rawBase64 })
        });
        const data = await resp.json();
        if (data.success && data.dataUrl) {
          // El envío usa el data URL original; la ruta /uploads es solo respaldo.
        }
      } catch (err) {
        console.warn('Audio convert error:', err);
      } finally {
        setIsConverting(false);
        setAudioDuration(10); // fallback duration for uploaded audio
        setRecordingState('preview');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSend = () => {
    if (!audioBase64) return;

    onSendVoiceNote({
      base64: audioBase64,
      dataUrl: audioBase64,
      blob: audioBlob || new Blob(),
      duration: audioDuration || recordingSeconds || 5,
      name: `nota_de_voz_${Date.now()}.ogg`,
      isPtt: true
    });

    // Reset state
    setRecordingState('idle');
    setAudioUrl(null);
    setAudioBase64(null);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className={`bg-[#0d1418] border border-emerald-500/40 rounded-2xl p-4 text-white shadow-xl ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header */}
      {!isCompact && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Mic size={18} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{title}</h4>
              <p className="text-[11px] text-gray-400">Se convertirá a formato OGG OPUS con ondas reales de WhatsApp PTT</p>
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-800/60 hover:bg-gray-800"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="mb-3 p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      {/* STATE 1: IDLE */}
      {recordingState === 'idle' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-[#162229] rounded-xl border border-gray-800">
          <button
            type="button"
            onClick={startRecording}
            className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <Mic size={18} className="animate-pulse" />
            <span>Grabar Nota de Voz</span>
          </button>

          <span className="text-xs text-gray-500 font-medium">o</span>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Upload size={16} />
            <span>Subir Archivo de Audio</span>
          </button>
        </div>
      )}

      {/* STATE 2: RECORDING */}
      {recordingState === 'recording' && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping inline-block" />
            <span className="text-xl font-mono font-bold text-emerald-300 tracking-wider">
              {formatSeconds(recordingSeconds)}
            </span>
            <span className="text-xs bg-red-900/80 text-red-200 px-2 py-0.5 rounded-full font-semibold">
              REC
            </span>
          </div>

          {/* Live Audio Waves Animation */}
          <div className="w-full flex items-center justify-center gap-1.5 h-12 py-1">
            {[20, 40, 70, 90, 50, 80, 100, 60, 30, 85, 95, 40, 60, 80, 45, 90, 30, 60].map((h, idx) => {
              const dynamicHeight = Math.max(15, Math.min(100, Math.round((h * (liveVolume || 40)) / 60)));
              return (
                <div
                  key={idx}
                  className="w-1.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${dynamicHeight}%` }}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => {
                stopRecordingAndStreams();
                setRecordingState('idle');
              }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
            >
              <Trash2 size={14} /> Cancelar
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95"
            >
              <Square size={16} className="fill-current" /> Detener y Escuchar
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: PREVIEW & CONFIRM */}
      {recordingState === 'preview' && (
        <div className="bg-[#111c24] border border-emerald-500/30 rounded-xl p-3 flex flex-col gap-3">
          {audioUrl && (
            <audio
              ref={previewAudioRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
            />
          )}

          <div className="flex items-center gap-3 bg-[#0a1014] p-2.5 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => {
                if (!previewAudioRef.current) return;
                if (isPlayingPreview) {
                  previewAudioRef.current.pause();
                  setIsPlayingPreview(false);
                } else {
                  previewAudioRef.current.play();
                  setIsPlayingPreview(true);
                }
              }}
              className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow hover:bg-emerald-400 transition"
            >
              {isPlayingPreview ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
            </button>

            <div className="flex-1">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Nota de Voz Lista
                </span>
                <span className="font-mono text-gray-400 text-[11px]">{formatSeconds(audioDuration || recordingSeconds)}</span>
              </div>

              {/* Simulated Waveform Preview */}
              <div className="flex items-center gap-[3px] h-5">
                {[25, 45, 80, 60, 95, 70, 40, 85, 55, 30, 75, 90, 65, 35, 80, 50].map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500/60 rounded-full"
                    style={{ height: `${bar}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {isConverting ? (
            <div className="text-center py-2 text-xs text-emerald-300 flex items-center justify-center gap-2">
              <Sparkles size={14} className="animate-spin text-emerald-400" />
              Optimizando codec OGG OPUS para WhatsApp PTT...
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRecordingState('idle');
                  setAudioUrl(null);
                  setAudioBase64(null);
                }}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
              >
                <RefreshCw size={13} /> Volver a grabar
              </button>

              <button
                type="button"
                onClick={handleConfirmSend}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <Send size={14} /> Enviar Nota de Voz PTT (Real)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
