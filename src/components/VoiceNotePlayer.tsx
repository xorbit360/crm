import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Mic, Radio, AlertCircle } from 'lucide-react';

interface VoiceNotePlayerProps {
  src: string;
  duration?: number | string;
  isPtt?: boolean;
  title?: string;
  sender?: 'user' | 'agent' | 'bot' | 'ai';
  className?: string;
}

const DEFAULT_AUDIO_FALLBACK = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  src,
  duration: propDuration,
  isPtt = true,
  title = 'Nota de Voz PTT',
  sender = 'agent',
  className = ''
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(typeof propDuration === 'number' ? propDuration : 0);
  const [hasError, setHasError] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string>('');

  // Pseudo waveform amplitudes for visual rendering (resembles WhatsApp audio waves)
  const waveHeights = [20, 35, 60, 45, 80, 100, 75, 40, 90, 65, 30, 85, 95, 50, 70, 40, 60, 30, 80, 50, 90, 70, 35, 20];

  // Convert data URI or base64 to Blob URL for maximum browser compatibility (especially for ogg/opus)
  useEffect(() => {
    let createdBlobUrl: string | null = null;
    setHasError(false);

    if (!src || src.trim() === '' || src === 'undefined' || src === 'null' || src.includes('base64,undefined')) {
      setActiveSrc(DEFAULT_AUDIO_FALLBACK);
      return;
    }

    if (src.startsWith('data:')) {
      try {
        const parts = src.split(',');
        const header = parts[0] || '';
        const b64Data = parts[1] || '';

        if (b64Data && b64Data.length > 20) {
          let mimeMatch = header.match(/:(.*?);/);
          let mime = mimeMatch ? mimeMatch[1] : 'audio/ogg';

          const byteCharacters = atob(b64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          // If mime is audio/ogg or audio/opus, try creating Blob
          const blob = new Blob([byteArray], { type: mime });
          createdBlobUrl = URL.createObjectURL(blob);
          setActiveSrc(createdBlobUrl);
        } else {
          setActiveSrc(DEFAULT_AUDIO_FALLBACK);
        }
      } catch (e) {
        console.warn('VoiceNotePlayer Blob conversion warning:', e);
        setActiveSrc(src.length > 5 ? src : DEFAULT_AUDIO_FALLBACK);
      }
    } else {
      setActiveSrc(src);
    }

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.warn('Audio element source error, switching to safe audio source:', e);
      setHasError(true);
      if (activeSrc !== DEFAULT_AUDIO_FALLBACK) {
        setActiveSrc(DEFAULT_AUDIO_FALLBACK);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [activeSrc]);

  // Web Audio Synthesizer Fallback for when HTML5 audio cannot decode source
  const playWebAudioTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // Note A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);

      setIsPlaying(true);
      setCurrentTime(0);
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= 1.2) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } catch (err) {
      console.warn('Web Audio synthesis error:', err);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setHasError(false);
          })
          .catch(err => {
            console.warn('Audio playback primary attempt warning, trying fallback:', err);
            // If primary src fails, fallback to default audio or web audio tone
            if (activeSrc !== DEFAULT_AUDIO_FALLBACK) {
              setActiveSrc(DEFAULT_AUDIO_FALLBACK);
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => playWebAudioTone());
                } else {
                  playWebAudioTone();
                }
              }, 100);
            } else {
              playWebAudioTone();
            }
          });
      }
    }
  };

  const handleSeek = (index: number) => {
    if (!audioRef.current || !duration) return;
    const progressFraction = index / waveHeights.length;
    const newTime = progressFraction * duration;
    try {
      audioRef.current.currentTime = newTime;
    } catch (e) {
      // Ignore seek errors if metadata not fully loaded
    }
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) : 0;

  const isGreenTheme = sender === 'agent' || sender === 'user' || sender === 'bot' || sender === 'ai' || isPtt;

  return (
    <div className={`p-2.5 rounded-2xl border transition-all ${
      isGreenTheme
        ? 'bg-[#005c4b]/90 border-[#007a63] text-white shadow-md'
        : 'bg-[#1f2937] border-gray-700 text-gray-100'
    } ${className}`}>
      <audio ref={audioRef} src={activeSrc} preload="metadata" />

      <div className="flex items-center gap-3">
        {/* Profile / Mic Icon */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-md active:scale-95 ${
              isGreenTheme
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                : 'bg-blue-500 hover:bg-blue-400 text-white'
            }`}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
          </button>
          {isPtt && (
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 text-[9px] p-0.5 rounded-full border border-black" title="Nota de voz real PTT">
              <Mic size={10} />
            </span>
          )}
        </div>

        {/* Waveform & Time */}
        <div className="flex-1 min-w-0">
          {/* Waveform Bars */}
          <div className="flex items-center gap-[2.5px] h-7 cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            if (audioRef.current && duration) {
              try {
                audioRef.current.currentTime = fraction * duration;
              } catch (err) {}
              setCurrentTime(fraction * duration);
            }
          }}>
            {waveHeights.map((h, i) => {
              const barProgress = i / waveHeights.length;
              const isPlayed = barProgress <= (progressPercent || 0);
              return (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(i);
                  }}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPlayed
                      ? (isGreenTheme ? 'bg-emerald-300 scale-y-105' : 'bg-blue-400 scale-y-105')
                      : (isGreenTheme ? 'bg-white/45 hover:bg-white/70' : 'bg-gray-400/60 hover:bg-gray-300')
                  }`}
                  style={{ height: `${Math.max(15, h)}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-end mt-0.5">
            <span className="text-[10px] font-mono text-emerald-200/80">
              {isPlaying ? formatTime(currentTime) : formatTime(duration || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

