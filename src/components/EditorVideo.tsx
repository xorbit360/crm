import React, { useState, useRef, useEffect } from 'react';
import {
  MonitorPlay, Upload, Wand2, Type, Layout, Subtitles, Sparkles,
  Play, Pause, Video as VideoIcon, Save, Download, Plus, Trash2,
  ArrowUp, ArrowDown, CheckCircle2, Music, Loader2, X, Film,
  Check, Settings, Scissors, RefreshCw, Volume2, VolumeX, Maximize
} from 'lucide-react';

interface VideoSegment {
  id: string;
  file: File;
  name: string;
  size: string;
  url: string;
  uploadProgress: number;
  duration: number; // in seconds (simulated or real)
}

export default function EditorVideo() {
  const [videos, setVideos] = useState<VideoSegment[]>([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLog, setProcessingLog] = useState('');

  const [step, setStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Custom video styles & subtitles
  const [effects, setEffects] = useState({
    subtitles: true,
    brolls: true,
    colorGrading: true,
  });

  const [subtitleStyle, setSubtitleStyle] = useState<'hormozi' | 'cyberpunk' | 'minimal'>('hormozi');
  const [colorFilter, setColorFilter] = useState<'moody' | 'gold' | 'neon' | 'bnw' | 'none'>('moody');
  const [backgroundMusic, setBackgroundMusic] = useState<string>('inspiring');

  // Export & Draft dialogs
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  const [showDraftToast, setShowDraftToast] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with HTML5 video player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration || 15);
    };

    const handleVideoEnded = () => {
      // Automatic seamless playback of the next clip in the sequence
      if (activeVideoIndex < videos.length - 1) {
        setActiveVideoIndex(prev => prev + 1);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleVideoEnded);
    };
  }, [activeVideoIndex, videos]);

  // Sync play/pause with React state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, activeVideoIndex]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle uploading multiple files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isAppending = false) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const newSegments: VideoSegment[] = filesArray.map((file) => {
        const id = Math.random().toString(36).substring(2, 9);
        return {
          id,
          file,
          name: file.name,
          size: formatSize(file.size),
          url: URL.createObjectURL(file),
          uploadProgress: 0,
          duration: 15, // default simulated duration
        };
      });

      // Append or replace
      if (isAppending) {
        setVideos(prev => [...prev, ...newSegments]);
        // Simulate uploading for new segments
        newSegments.forEach(seg => simulateUpload(seg.id));
      } else {
        setVideos(newSegments);
        setActiveVideoIndex(0);
        // Simulate uploading for all
        newSegments.forEach(seg => simulateUpload(seg.id));
      }
    }
  };

  // Simulate uploading progress with percentage (%)
  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setVideos(prev =>
        prev.map(v => (v.id === id ? { ...v, uploadProgress: progress } : v))
      );
    }, 150);
  };

  // Drag and drop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('video/'));
      if (filesArray.length === 0) return;

      const newSegments: VideoSegment[] = filesArray.map(file => {
        const id = Math.random().toString(36).substring(2, 9);
        return {
          id,
          file,
          name: file.name,
          size: formatSize(file.size),
          url: URL.createObjectURL(file),
          uploadProgress: 0,
          duration: 15,
        };
      });

      setVideos(prev => [...prev, ...newSegments]);
      newSegments.forEach(seg => simulateUpload(seg.id));
    }
  };

  // Video arrangement controls
  const moveVideo = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= videos.length) return;

    const updated = [...videos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setVideos(updated);
    if (activeVideoIndex === index) {
      setActiveVideoIndex(targetIndex);
    } else if (activeVideoIndex === targetIndex) {
      setActiveVideoIndex(index);
    }
  };

  const removeVideo = (id: string) => {
    const filter = videos.filter(v => v.id !== id);
    setVideos(filter);
    if (activeVideoIndex >= filter.length) {
      setActiveVideoIndex(Math.max(0, filter.length - 1));
    }
  };

  // Master processing with % progress bar and custom text log sequence
  const startMasterProcessing = () => {
    if (videos.length === 0) return;
    setIsProcessing(true);
    setProcessingProgress(0);

    const logs = [
      'Analizando pistas de audio y video de los clips adjuntos...',
      'Generando transcripción de subtítulos automáticos...',
      'Uniendo múltiples clips en una sola secuencia de video continua...',
      'Renderizando subtítulos dinámicos de alto impacto...',
      'Aplicando filtro LUT de grado cinematográfico profesional...',
      'Compilando previsualización del video unificado...'
    ];

    let currentLogIndex = 0;
    setProcessingLog(logs[0]);

    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        const next = prev + Math.floor(Math.random() * 8) + 4;

        // Update logs based on progress ranges
        const logIdx = Math.min(
          Math.floor((next / 100) * logs.length),
          logs.length - 1
        );
        if (logIdx !== currentLogIndex) {
          currentLogIndex = logIdx;
          setProcessingLog(logs[logIdx]);
        }

        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            setStep(2);
          }, 500);
          return 100;
        }
        return next;
      });
    }, 200);
  };

  // Scrubber control
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Simulated active subtitle transcription generator based on playback time
  const getSubtitlesForTime = (time: number) => {
    if (time < 3) return { text: '¡ESTA ES LA CLAVE PARA', highlight: 'LA CLAVE' };
    if (time < 6) return { text: 'CREAR CONTENIDOS QUE VENDAN', highlight: 'QUE VENDAN' };
    if (time < 9) return { text: 'SI NO TIENES ESTOS SUBTÍTULOS', highlight: 'SUBTÍTULOS' };
    if (time < 12) return { text: 'ESTÁS PERDIENDO MILES DE CLIENTES', highlight: 'MILES DE CLIENTES' };
    if (time < 15) return { text: '¡APLICA ESTE EDIT EN SEGUNDOS!', highlight: 'ESTE EDIT' };
    return { text: 'EMPIEZA HOY MISMO CON NUESTRA IA', highlight: 'NUESTRA IA' };
  };

  // Video CSS Color Grade application
  const getColorGradeFilterClass = () => {
    if (!effects.colorGrading) return '';
    switch (colorFilter) {
      case 'moody':
        return 'contrast-[1.18] saturate-[1.3] brightness-95 sepia-[0.05] hue-rotate-[-2deg]';
      case 'gold':
        return 'contrast-[1.08] saturate-[1.45] brightness-100 sepia-[0.25] hue-rotate-[4deg]';
      case 'neon':
        return 'contrast-[1.25] saturate-[1.8] brightness-95 hue-rotate-[18deg]';
      case 'bnw':
        return 'grayscale-[1] contrast-[1.25] brightness-90';
      default:
        return '';
    }
  };

  // Run video export rendering simulation with % progress bar
  const runExportRender = () => {
    setShowExportModal(true);
    setExportProgress(0);
    setExportSuccess(false);

    const stages = [
      `Concatenando ${videos.length} clips de video en secuencia final...`,
      'Imprimiendo subtítulos estilizados con fuentes dinámicas...',
      `Inyectando banda de sonido de fondo: "${backgroundMusic.toUpperCase()}"...`,
      `Renderizando corrección de color profesional (${colorFilter.toUpperCase()})...`,
      'Optimizando tasa de bits y compresión MP4 (Web Optimized)...',
      'Finalizando codificación de video en alta definición...'
    ];

    let stageIdx = 0;
    setExportStage(stages[0]);

    const interval = setInterval(() => {
      setExportProgress(prev => {
        const next = prev + Math.floor(Math.random() * 6) + 3;

        const currentStageIdx = Math.min(
          Math.floor((next / 100) * stages.length),
          stages.length - 1
        );
        if (currentStageIdx !== stageIdx) {
          stageIdx = currentStageIdx;
          setExportStage(stages[currentStageIdx]);
        }

        if (next >= 100) {
          clearInterval(interval);
          setExportSuccess(true);
          // Auto trigger file download
          triggerVideoDownload();
          return 100;
        }
        return next;
      });
    }, 150);
  };

  // Real browser file download trigger for output video
  const triggerVideoDownload = () => {
    try {
      const dummyContent = 'Simulated Rendered High-Quality MP4 Video Content';
      const blob = new Blob([dummyContent], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_unificado_ia_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  // Draft save action
  const saveDraft = () => {
    setDraftSaving(true);
    setTimeout(() => {
      setDraftSaving(false);
      setShowDraftToast(true);
      setTimeout(() => setShowDraftToast(false), 3500);
    }, 1200);
  };

  const allUploaded = videos.length > 0 && videos.every(v => v.uploadProgress === 100);

  return (
    <div className="space-y-6 animate-fade-in text-gray-200">

      {/* Draft Saving Toast Notification */}
      {showDraftToast && (
        <div className="fixed top-24 right-6 z-50 flex items-center gap-3 bg-green-500 text-white font-bold py-3 px-5 rounded-2xl shadow-[0_4px_20px_rgba(34,197,94,0.4)] border border-green-400 animate-slide-in">
          <CheckCircle2 size={18} />
          <div>
            <p className="text-sm">¡Borrador Guardado!</p>
            <p className="text-[10px] font-normal opacity-90">Los cambios se guardaron en la nube con éxito.</p>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MonitorPlay className="text-blue-500" />
            Editor de Video IA Pro (Multiclip)
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Sube múltiples videos, ordénalos para unirlos en uno solo, aplica subtítulos dinámicos y color de película en segundos.
          </p>
        </div>
      </div>

      {step === 1 ? (
        /* STEP 1: Upload and Organize Multiple Videos */
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="panel p-8 md:p-12 rounded-2xl border border-gray-800 bg-[#0a0a0a] flex flex-col items-center justify-center min-h-[300px] border-dashed hover:border-blue-500/50 transition-colors relative"
          >
            {isProcessing ? (
              /* Processing Animation & Master Progress Bar with % */
              <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md animate-fade-in text-center">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-blue-900/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse animate-bounce" size={24} />
                </div>
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-xs text-blue-400 font-bold px-1">
                    <span className="truncate max-w-[80%]">{processingLog}</span>
                    <span className="shrink-0 text-white text-sm bg-blue-950 px-2 py-0.5 rounded-md border border-blue-500/30">{processingProgress}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-500 transition-all duration-200"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Procesando y Combinando con IA...</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Ajustando transiciones y alineando pistas para crear tu video final.
                  </p>
                </div>
              </div>
            ) : (
              /* File Drop & Selector Interface */
              <>
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                  <Upload size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Sube uno o varios videos raw / UGC</h3>
                <p className="text-sm text-gray-400 mb-6 text-center max-w-sm">
                  Arrastra tus clips o selecciónalos desde tu dispositivo. Los uniremos en un solo video editado de alto impacto.
                </p>

                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  id="video-upload-multiple"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e, false)}
                />

                <label
                  htmlFor="video-upload-multiple"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02]"
                >
                  <VideoIcon size={16} /> Seleccionar Videos
                </label>
              </>
            )}
          </div>

          {/* Uploaded Video Files Queue & Reordering list with individual % bars */}
          {!isProcessing && videos.length > 0 && (
            <div className="panel p-6 bg-[#0d0d0d] border border-gray-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Film className="text-blue-400" size={18} />
                  <h3 className="font-bold text-white">Secuencia de Videos a Combinar ({videos.length})</h3>
                </div>

                {/* Append more clips button */}
                <button
                  type="button"
                  onClick={() => appendFileInputRef.current?.click()}
                  className="text-xs flex items-center gap-1.5 bg-gray-900 border border-gray-800 hover:border-blue-500 hover:text-white text-gray-400 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus size={14} /> Adjuntar más videos
                </button>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  ref={appendFileInputRef}
                  onChange={(e) => handleFileChange(e, true)}
                />
              </div>

              <div className="space-y-3">
                {videos.map((vid, idx) => {
                  const isUploading = vid.uploadProgress < 100;
                  return (
                    <div
                      key={vid.id}
                      className={`flex flex-col md:flex-row items-stretch md:items-center justify-between p-3.5 bg-black/40 border rounded-xl gap-4 ${
                        idx === 0 ? 'border-blue-500/30' : 'border-gray-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                          <Film size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-blue-400">Clip #{idx + 1}</span>
                            <h4 className="text-sm font-semibold text-white truncate">{vid.name}</h4>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{vid.size}</p>

                          {/* Individual upload progress percentage and bar */}
                          {isUploading && (
                            <div className="w-full mt-2 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-blue-400 font-bold">
                                <span>Cargando archivo...</span>
                                <span>{vid.uploadProgress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all duration-200"
                                  style={{ width: `${vid.uploadProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controls: reorder and delete */}
                      <div className="flex items-center gap-2 shrink-0 justify-end md:justify-start">
                        <button
                          type="button"
                          onClick={() => moveVideo(idx, 'up')}
                          disabled={idx === 0 || isUploading}
                          className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Mover arriba"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveVideo(idx, 'down')}
                          disabled={idx === videos.length - 1 || isUploading}
                          className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Mover abajo"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeVideo(vid.id)}
                          className="p-1.5 bg-red-950 hover:bg-red-900/60 border border-red-900/30 text-red-400 rounded-lg transition"
                          title="Eliminar de secuencia"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Apply master processor button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={startMasterProcessing}
                  disabled={!allUploaded}
                  className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:scale-[1.02] ${
                    !allUploaded ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Wand2 size={18} className="animate-pulse" /> Combinar y Procesar Clips con IA
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: Unified Video Editor & Preview Canvas */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Main Preview Player with dynamic filter overlays */}
          <div className="xl:col-span-2 space-y-4">

            {/* The Video Container Frame */}
            <div className="relative aspect-[9/16] max-w-[340px] md:max-w-md mx-auto xl:max-w-none xl:aspect-video bg-black rounded-2xl border border-gray-800 overflow-hidden flex items-center justify-center group shadow-2xl">

              <video
                ref={videoRef}
                src={videos[activeVideoIndex]?.url}
                className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ${getColorGradeFilterClass()}`}
                playsInline
              />

              {/* Simulated Ambient Background for vertical clips played in landscape video containers */}
              <div
                className="absolute inset-0 -z-10 blur-2xl opacity-20 bg-cover bg-center scale-110"
                style={{ backgroundImage: `url(${videos[activeVideoIndex]?.url})` }}
              ></div>

              {/* Overlay active subtitles if toggled */}
              {effects.subtitles && (
                <div className="absolute bottom-16 left-0 right-0 text-center z-10 px-6 pointer-events-none select-none">
                  {subtitleStyle === 'hormozi' && (
                    <p className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)] uppercase tracking-tight transform -rotate-1">
                      {getSubtitlesForTime(currentTime).text.split(' ').map((word, i) => {
                        const isHigh = getSubtitlesForTime(currentTime).highlight.includes(word);
                        return (
                          <span key={i} className={isHigh ? 'text-yellow-400 underline decoration-yellow-400 decoration-2' : ''}>
                            {word}{' '}
                          </span>
                        );
                      })}
                    </p>
                  )}
                  {subtitleStyle === 'cyberpunk' && (
                    <p className="text-xl md:text-2xl font-mono font-bold text-cyan-400 bg-black/75 border border-cyan-500 px-4 py-1.5 rounded-md inline-block uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                      {getSubtitlesForTime(currentTime).text}
                    </p>
                  )}
                  {subtitleStyle === 'minimal' && (
                    <p className="text-lg md:text-xl font-medium text-white bg-black/40 px-3 py-1 rounded-md inline-block">
                      {getSubtitlesForTime(currentTime).text}
                    </p>
                  )}
                </div>
              )}

              {/* Play / Pause overlay overlay indicator on hover */}
              <div
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center scale-90 group-hover:scale-100 transition-transform shadow-[0_0_35px_rgba(168,85,247,0.6)]">
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </div>
              </div>

              {/* Subtitle Indicator Tag */}
              {effects.subtitles && (
                <div className="absolute top-4 left-4 z-10 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Type size={10} /> Subtítulos Estilo {subtitleStyle.toUpperCase()}
                </div>
              )}
            </div>

            {/* Custom Interactive Video Control Bar */}
            <div className="panel p-4 rounded-xl border border-gray-800 bg-[#0a0a0a] flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 text-gray-300 hover:text-white hover:scale-110 transition shrink-0"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <span className="text-xs font-mono text-gray-500 shrink-0">
                  {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Scrubbing slider */}
              <div className="h-1 flex-1 bg-gray-800 rounded-full relative cursor-pointer w-full md:mx-4 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.05"
                  value={currentTime}
                  onChange={handleScrub}
                  className="w-full accent-blue-500 h-1 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Mute button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (videoRef.current) videoRef.current.muted = !isMuted;
                  }}
                  className="p-1.5 text-gray-300 hover:text-white hover:scale-110 transition"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <span className="text-[10px] font-bold text-gray-500 uppercase border border-gray-800 px-2 py-0.5 rounded-md bg-black/20">
                  Clip {activeVideoIndex + 1}/{videos.length}
                </span>
              </div>
            </div>

            {/* Combined Segment Timeline Track representation */}
            <div className="panel p-4 rounded-xl border border-gray-800 bg-[#0a0a0a] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors size={12} className="text-blue-400" /> Línea de Tiempo del Video Combinado
                </h4>
                <div className="flex items-center gap-2">
                  {/* Append directly from editor */}
                  <button
                    type="button"
                    onClick={() => appendFileInputRef.current?.click()}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/20 px-2 py-1 rounded border border-blue-500/20"
                  >
                    <Plus size={10} /> Añadir Clip
                  </button>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                {videos.map((vid, idx) => {
                  const isActive = idx === activeVideoIndex;
                  return (
                    <div
                      key={vid.id}
                      onClick={() => {
                        setActiveVideoIndex(idx);
                        setIsPlaying(false);
                      }}
                      className={`flex-1 min-w-[140px] max-w-[200px] p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isActive
                          ? 'bg-blue-950/20 border-blue-500 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                          : 'bg-black/30 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                        <span>#{(idx + 1).toString().padStart(2, '0')}</span>
                        <span className={isActive ? 'text-blue-400' : ''}>{isActive ? 'ACTIVO' : 'SECUENCIA'}</span>
                      </div>
                      <h5 className="text-xs font-semibold text-white mt-1 truncate">{vid.name}</h5>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2">
                        <span>{vid.size}</span>
                        <span className="bg-gray-900 px-1 py-0.5 rounded border border-gray-800">15s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Tools Panel & Presets */}
          <div className="space-y-4">

            {/* 1. Quick Effects Panel */}
            <div className="panel p-5 rounded-2xl border border-gray-800 bg-[#0d0d0d] space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-gray-800">
                <Sparkles size={16} className="text-blue-400" /> Auto-Efectos Activos
              </h3>

              <div className="space-y-4">

                {/* Subtitles toggle and style customization */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Subtitles size={16} /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-200">Subtítulos Dinámicos</p>
                        <p className="text-[10px] text-gray-500">Transcripción inteligente de voz</p>
                      </div>
                    </div>
                    <div
                      onClick={() => setEffects({...effects, subtitles: !effects.subtitles})}
                      className={`w-10 h-5 ${effects.subtitles ? 'bg-blue-600' : 'bg-gray-700'} rounded-full relative cursor-pointer transition-colors`}
                    >
                      <div className={`absolute top-1 bottom-1 aspect-square bg-white rounded-full transition-all ${effects.subtitles ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>

                  {effects.subtitles && (
                    <div className="pl-11 grid grid-cols-3 gap-1.5">
                      {(['hormozi', 'cyberpunk', 'minimal'] as const).map(style => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setSubtitleStyle(style)}
                          className={`px-2 py-1 text-[9px] font-bold uppercase rounded border transition ${
                            subtitleStyle === style
                              ? 'bg-blue-950 border-blue-500 text-blue-400'
                              : 'bg-black/30 border-gray-800 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Auto B-rolls Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg"><Layout size={16} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-200">Auto B-Rolls</p>
                      <p className="text-[10px] text-gray-500">Insertos de stock contextuales</p>
                    </div>
                  </div>
                  <div
                    onClick={() => setEffects({...effects, brolls: !effects.brolls})}
                    className={`w-10 h-5 ${effects.brolls ? 'bg-blue-600' : 'bg-gray-700'} rounded-full relative cursor-pointer transition-colors`}
                  >
                    <div className={`absolute top-1 bottom-1 aspect-square bg-white rounded-full transition-all ${effects.brolls ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>

                {/* Color grading custom filters selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Wand2 size={16} /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-200">Color Grading (Filmmaker)</p>
                        <p className="text-[10px] text-gray-500">LUTs y calibración cromática</p>
                      </div>
                    </div>
                    <div
                      onClick={() => setEffects({...effects, colorGrading: !effects.colorGrading})}
                      className={`w-10 h-5 ${effects.colorGrading ? 'bg-blue-600' : 'bg-gray-700'} rounded-full relative cursor-pointer transition-colors`}
                    >
                      <div className={`absolute top-1 bottom-1 aspect-square bg-white rounded-full transition-all ${effects.colorGrading ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>

                  {effects.colorGrading && (
                    <div className="pl-11 grid grid-cols-2 gap-1.5">
                      {[
                        { key: 'moody', name: 'Moody Moody' },
                        { key: 'gold', name: 'Warm Gold' },
                        { key: 'neon', name: 'Neon Synth' },
                        { key: 'bnw', name: 'Noir Film' },
                        { key: 'none', name: 'Original' }
                      ].map(lut => (
                        <button
                          key={lut.key}
                          type="button"
                          onClick={() => setColorFilter(lut.key as any)}
                          className={`px-2 py-1 text-[10px] font-bold rounded border text-left truncate transition ${
                            colorFilter === lut.key
                              ? 'bg-blue-950 border-blue-500 text-blue-400'
                              : 'bg-black/30 border-gray-800 text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {lut.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audio soundtrack backing selection */}
                <div className="space-y-2 pt-2 border-t border-gray-800/60">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Music size={12} className="text-blue-400" /> Soundtrack de Fondo
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'inspiring', name: 'Inspiring Tech' },
                      { key: 'lofi', name: 'Lofi Ambient' },
                      { key: 'epic', name: 'Cinematic Epic' },
                      { key: 'none', name: 'Sin Música' }
                    ].map(track => (
                      <button
                        key={track.key}
                        type="button"
                        onClick={() => setBackgroundMusic(track.key)}
                        className={`px-2.5 py-1.5 text-left rounded text-xs font-medium border transition truncate ${
                          backgroundMusic === track.key
                            ? 'bg-blue-950/40 border-blue-500/80 text-blue-300'
                            : 'bg-black/20 border-gray-800/80 text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        🎵 {track.name}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Functional Actions */}
              <div className="pt-4 border-t border-gray-800 space-y-3">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={draftSaving}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {draftSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {draftSaving ? 'Guardando Borrador...' : 'Guardar Borrador'}
                </button>
                <button
                  type="button"
                  onClick={runExportRender}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer hover:scale-[1.01]"
                >
                  <Download size={14} /> Renderizar y Exportar Video Unificado
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setIsPlaying(false);
                  }}
                  className="w-full py-2 text-[10px] uppercase font-bold text-gray-500 hover:text-gray-300 transition"
                >
                  Volver a Organizar Secuencia
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* RENDER & EXPORT MODAL DIALOG WITH % PROGRESS BAR AND AUTOMATIC DOWNLOAD */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0c0c0c] border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative">

            {/* Close modal */}
            {exportSuccess && (
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="absolute top-5 right-5 text-gray-500 hover:text-white transition"
              >
                <X size={20} />
              </button>
            )}

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                {exportSuccess ? (
                  <CheckCircle2 size={32} className="text-green-400 animate-bounce" />
                ) : (
                  <RefreshCw size={28} className="animate-spin" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white">
                {exportSuccess ? '¡Video Renderizado Exitosamente!' : 'Procesando y Exportando Video Final'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {exportSuccess
                  ? 'Hemos compilado tus múltiples clips y el archivo ya se está descargando en tu dispositivo.'
                  : 'Compilando clips, integrando audio, filtros y quemando subtítulos de manera permanente.'}
              </p>
            </div>

            {/* Rendering Progress Bar & Percent Indicator */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs px-1 font-bold">
                <span className={exportSuccess ? 'text-green-400' : 'text-blue-400'}>
                  {exportSuccess ? '✓ Renderizado Completo' : exportStage}
                </span>
                <span className={`text-sm px-2 py-0.5 rounded-md ${
                  exportSuccess ? 'bg-green-950 text-green-400 border border-green-500/20' : 'bg-blue-950 text-blue-400 border border-blue-500/20'
                }`}>
                  {exportProgress}%
                </span>
              </div>

              <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    exportSuccess
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-500'
                  }`}
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Success checklist summary */}
            {exportSuccess && (
              <div className="bg-black/50 border border-gray-800/80 rounded-2xl p-4 space-y-2 text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Resumen de la Producción</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Check size={14} className="text-green-400 shrink-0" />
                    <span>{videos.length} Clips Combinados</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Check size={14} className="text-green-400 shrink-0" />
                    <span className="capitalize">LUT: {colorFilter}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Check size={14} className="text-green-400 shrink-0" />
                    <span className="capitalize">Subtítulos: {subtitleStyle}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Check size={14} className="text-green-400 shrink-0" />
                    <span>Resolución: 1080p FHD</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons inside Modal */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {exportSuccess ? (
                <>
                  <button
                    type="button"
                    onClick={triggerVideoDownload}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  >
                    <Download size={16} /> Descargar Archivo Otra Vez
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="py-3 px-5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-xl text-sm font-bold transition cursor-pointer"
                  >
                    Cerrar Ventana
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-gray-900 border border-gray-800 text-gray-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Loader2 size={16} className="animate-spin text-blue-500" /> Generando archivo final...
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
