"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useStudioStore from "@/store/useStudioStore";
import { useAuthStore } from "@/store/useAuthStore";
import AudioEngine from "@/lib/audio/AudioEngine";
import { uploadAudioFile, getStreamUrl } from "@/lib/api/audioClient";
import { saveProject, loadProject } from "@/lib/api/projectClient";
import StudioSocketClient from "@/lib/api/socketClient";
import Playhead from "./Playhead";
import TrackRow from "./TrackRow";
import { PIXELS_PER_SECOND } from "@/lib/constants/index";

/**
 * StudioLayout — the main DAW workspace shell.
 * Enhanced with drag-and-drop, metronome, volume knobs, and a realistic DAW experience.
 */
export default function StudioLayout() {
  const { isPlaying, isRehydrating, bpm, tracks, currentProjectId, setPlaying, setBpm, addTrack, removeTrack, hydrateProject, setRehydrating, setCurrentProjectId, toggleTrackMute } =
    useStudioStore();
  const user = useAuthStore((state) => state.user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverTimeline, setDragOverTimeline] = useState(false);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [showMixer, setShowMixer] = useState(false);
  const [showInstruments, setShowInstruments] = useState(false);
  const [masterVolume, setMasterVolume] = useState(80);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyTrackMuteToEngine = useCallback((trackId: string) => {
    const track = useStudioStore.getState().tracks.find((t) => t.trackId === trackId);
    if (!track) return;

    const engine = AudioEngine.getInstance();
    for (const region of track.regions) {
      engine.setPlayerMute(region.sampleId, track.isMuted);
    }
  }, []);

  const broadcastStudioEvent = useCallback(
    (actionType: string, trackId: string = "", playheadPosition: number = 0, nextBpm?: number) => {
      if (!currentProjectId) return;
      StudioSocketClient.getInstance().sendSyncEvent(
        currentProjectId,
        actionType,
        trackId,
        playheadPosition,
        nextBpm
      );
    },
    [currentProjectId]
  );

  // Keep a stable project ID in local storage so Save, Load, and WebSocket use the same room.
  useEffect(() => {
    const storedProjectId = localStorage.getItem("musiclab_current_project_id");
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId);
      return;
    }

    const generatedProjectId = `project-${Date.now()}`;
    localStorage.setItem("musiclab_current_project_id", generatedProjectId);
    setCurrentProjectId(generatedProjectId);
  }, [setCurrentProjectId]);

  // Poll lightweight runtime status for demo-friendly visibility.
  useEffect(() => {
    const updateStatus = () => {
      const socket = StudioSocketClient.getInstance();
      const sameProjectRoom = !!currentProjectId && socket.getCurrentProjectId() === currentProjectId;
      setIsSocketConnected(socket.isConnected() && sameProjectRoom);
      setIsAudioUnlocked(AudioEngine.getInstance().isInitialized());
    };

    updateStatus();
    const intervalId = setInterval(updateStatus, 400);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentProjectId]);

  const handleUnlockAudio = useCallback(async () => {
    const engine = AudioEngine.getInstance();

    try {
      if (!engine.isInitialized()) {
        await engine.initialize();
      }

      setIsAudioUnlocked(true);
      setNeedsAudioUnlock(false);
    } catch {
      alert("Audio unlock failed. Try clicking the Unlock Audio button again.");
    }
  }, []);

  // Timer for elapsed playback time — reads from AudioEngine
  useEffect(() => {
    const update = () => {
      try {
        setElapsedTime(AudioEngine.getInstance().getCurrentTime());
      } catch { /* engine not ready */ }
    };
    timerRef.current = setInterval(update, isPlaying ? 100 : 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Metronome click using Web Audio API
  useEffect(() => {
    if (!metronomeOn || !isPlaying) return;
    const interval = (60 / bpm) * 1000;
    let audioCtx: AudioContext | null = null;
    
    const tick = () => {
      if (!audioCtx) audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.stop(audioCtx.currentTime + 0.08);
    };

    tick();
    const id = setInterval(tick, interval);
    return () => {
      clearInterval(id);
      audioCtx?.close();
    };
  }, [metronomeOn, isPlaying, bpm]);

  // WebSocket initialization + incoming remote event application
  useEffect(() => {
    const socket = StudioSocketClient.getInstance();

    if (!currentProjectId) {
      socket.disconnect();
      return;
    }

    socket.connect(currentProjectId, async (msg) => {
      const engine = AudioEngine.getInstance();
      const ensureEngineReady = async (): Promise<boolean> => {
        if (engine.isInitialized()) {
          setIsAudioUnlocked(true);
          return true;
        }

        try {
          await engine.initialize();
          setIsAudioUnlocked(true);
          setNeedsAudioUnlock(false);
          return true;
        } catch {
          setIsAudioUnlocked(false);
          setNeedsAudioUnlock(true);
          console.warn("[StudioSocket] Remote event ignored until audio is unlocked by user interaction.");
          return false;
        }
      };

      switch (msg.actionType) {
        case "TRACK_MUTE": {
          if (!msg.trackId) return;
          useStudioStore.getState().toggleTrackMute(msg.trackId, true);
          applyTrackMuteToEngine(msg.trackId);
          return;
        }

        case "PLAY": {
          if (!(await ensureEngineReady())) return;

          if (typeof msg.bpm === "number") {
            const clampedRemoteBpm = Math.max(20, Math.min(300, msg.bpm));
            setBpm(clampedRemoteBpm);
            engine.setBpm(clampedRemoteBpm);
          }

          if (typeof msg.playheadPosition === "number") {
            const targetSeconds = Math.max(0, msg.playheadPosition);
            engine.seek(targetSeconds);
            setElapsedTime(targetSeconds);
          }

          engine.play();
          setPlaying(true);
          return;
        }

        case "PAUSE": {
          if (!(await ensureEngineReady())) return;
          if (typeof msg.playheadPosition === "number") {
            const targetSeconds = Math.max(0, msg.playheadPosition);
            engine.seek(targetSeconds);
            setElapsedTime(targetSeconds);
          }
          engine.pause();
          setPlaying(false);
          return;
        }

        case "STOP": {
          if (!(await ensureEngineReady())) return;
          engine.stop();
          setPlaying(false);
          setElapsedTime(0);
          return;
        }

        case "SEEK": {
          if (!(await ensureEngineReady())) return;
          if (typeof msg.playheadPosition === "number") {
            const targetSeconds = Math.max(0, msg.playheadPosition);
            engine.seek(targetSeconds);
            setElapsedTime(targetSeconds);
          }
          return;
        }

        case "BPM_CHANGE": {
          if (typeof msg.bpm !== "number") return;
          const clampedRemoteBpm = Math.max(20, Math.min(300, msg.bpm));
          setBpm(clampedRemoteBpm);

          if (await ensureEngineReady()) {
            engine.setBpm(clampedRemoteBpm);
          }
          return;
        }

        default:
          return;
      }
    });
    return () => { socket.disconnect(); };
  }, [applyTrackMuteToEngine, currentProjectId, setBpm, setPlaying]);

  const handlePlayPause = useCallback(async () => {
    const engine = AudioEngine.getInstance();
    if (!engine.isInitialized()) {
      await engine.initialize();
      setIsAudioUnlocked(true);
      setNeedsAudioUnlock(false);
    }

    if (isPlaying) {
      const pauseAt = engine.getCurrentTime();
      engine.pause();
      setPlaying(false);
      broadcastStudioEvent("PAUSE", "", pauseAt, bpm);
      return;
    }

    const startAt = engine.getCurrentTime();
    engine.play();
    setPlaying(true);
    broadcastStudioEvent("PLAY", "", startAt, bpm);
  }, [bpm, broadcastStudioEvent, isPlaying, setPlaying]);

  const handleStop = useCallback(() => {
    const engine = AudioEngine.getInstance();
    engine.stop();
    setPlaying(false);
    setElapsedTime(0);
    broadcastStudioEvent("STOP", "", 0, bpm);
  }, [bpm, broadcastStudioEvent, setPlaying]);

  const handleBpmChange = useCallback(
    (newBpm: number) => {
      const clampedBpm = Math.max(20, Math.min(300, newBpm));
      setBpm(clampedBpm);
      const engine = AudioEngine.getInstance();
      engine.setBpm(clampedBpm);
      broadcastStudioEvent("BPM_CHANGE", "", engine.getCurrentTime(), clampedBpm);
    },
    [broadcastStudioEvent, setBpm]
  );

  // Unified file handler for both click-upload and drag-drop
  const processAudioFile = useCallback(
    async (file: File) => {
      try {
        const engine = AudioEngine.getInstance();
        if (!engine.isInitialized()) {
          await engine.initialize();
          setIsAudioUnlocked(true);
          setNeedsAudioUnlock(false);
        }

        const uploadResult = await uploadAudioFile(file);
        const streamUrl = getStreamUrl(uploadResult.streamUrl);
        const regionId = `region-${Date.now()}`;

        // Load into engine first to get actual audio duration
        const duration = await engine.loadRegion(regionId, streamUrl, 0);

        // Always create a NEW track for each imported file
        const targetTrackId = `track-${Date.now()}`;
        addTrack({
          trackId: targetTrackId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          volume: 0.8,
          isMuted: false,
          regions: [{ sampleId: regionId, startTime: 0, duration, audioFileUrl: streamUrl }],
        });
      } catch {
        alert("Upload failed. Ensure the backend is running.");
      }
    },
    [addTrack]
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await processAudioFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processAudioFile]
  );

  // Drag and drop handlers for timeline
  const handleTimelineDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTimeline(true);
  }, []);

  const handleTimelineDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTimeline(false);
  }, []);

  const handleTimelineDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverTimeline(false);
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith("audio/")) {
        await processAudioFile(files[0]);
      } else {
        alert("Please drop an audio file (MP3, WAV, etc.)");
      }
    },
    [processAudioFile]
  );

  const handleSaveProject = useCallback(async () => {
    const state = useStudioStore.getState();
    const activeProjectId = state.currentProjectId || `project-${Date.now()}`;
    const activeUserId = user?.id ? String(user.id) : "1";

    try {
      const result = await saveProject({
        projectId: activeProjectId,
        userId: activeUserId,
        projectName: "My Music Project",
        bpm: state.bpm,
        tracks: state.tracks.map((track) => ({
          trackId: track.trackId, name: track.name, volume: track.volume, isMuted: track.isMuted,
          regions: track.regions.map((r) => ({ sampleId: r.sampleId, startTime: r.startTime, duration: r.duration, audioFileUrl: r.audioFileUrl })),
        })),
      });

      setCurrentProjectId(result.projectId);
      localStorage.setItem("musiclab_current_project_id", result.projectId);

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(result.projectId);
        } catch {
          // Clipboard can fail on unsupported/non-secure contexts; save still succeeds.
        }
      }

      alert(`Project Saved!\nProject ID: ${result.projectId}\n(Also copied to clipboard)`);
    } catch { alert("Failed to save project."); }
  }, [setCurrentProjectId, user?.id]);

  const handleLoadProject = useCallback(async () => {
    const suggestedProjectId = localStorage.getItem("musiclab_current_project_id") ?? "";
    const projectIdInput = prompt("Enter Project ID to load:", suggestedProjectId);
    const projectId = projectIdInput?.trim() ?? "";
    if (!projectId) return;

    try {
      setRehydrating(true);
      const engine = AudioEngine.getInstance();
      if (!engine.isInitialized()) {
        await engine.initialize();
        setIsAudioUnlocked(true);
        setNeedsAudioUnlock(false);
      }
      engine.disposeAll();
      const data = await loadProject(projectId);
      const hydratedTracks = (data.tracks || []).map((t: { trackId: string; name: string; volume: number; isMuted: boolean; regions: { sampleId: string; startTime: number; duration: number; audioFileUrl: string; }[] }) => ({
        trackId: t.trackId, name: t.name, volume: t.volume, isMuted: t.isMuted,
        regions: (t.regions || []).map((r: { sampleId: string; startTime: number; duration: number; audioFileUrl: string }) => ({ sampleId: r.sampleId, startTime: r.startTime, duration: r.duration, audioFileUrl: r.audioFileUrl })),
      }));
      hydrateProject(data.bpm, hydratedTracks);
      engine.setBpm(data.bpm);
      for (const track of hydratedTracks) {
        for (const region of track.regions) {
          await engine.loadRegion(region.sampleId, region.audioFileUrl, region.startTime);
        }
      }

      setCurrentProjectId(projectId);
      localStorage.setItem("musiclab_current_project_id", projectId);
      alert("Project loaded!");
    } catch { alert("Failed to load project."); } finally { setRehydrating(false); }
  }, [hydrateProject, setCurrentProjectId, setRehydrating]);

  // Add new empty track
  const handleAddTrack = useCallback(() => {
    const id = `track-${Date.now()}`;
    const num = tracks.length + 1;
    addTrack({ trackId: id, name: `Track ${num}`, volume: 0.8, isMuted: false, regions: [] });
  }, [tracks.length, addTrack]);

  // Mute/unmute with AudioEngine sync
  const handleToggleMute = useCallback((trackId: string) => {
    toggleTrackMute(trackId, false);
    applyTrackMuteToEngine(trackId);
  }, [applyTrackMuteToEngine, toggleTrackMute]);

  // Click & drag on ruler to seek
  const handleRulerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rulerEl = e.currentTarget;
    let latestTime = 0;

    const seekTo = (clientX: number) => {
      const rect = rulerEl.getBoundingClientRect();
      const x = clientX - rect.left;
      const time = Math.max(0, x / PIXELS_PER_SECOND);
      latestTime = time;
      AudioEngine.getInstance().seek(time);
      setElapsedTime(time);
    };
    seekTo(e.clientX);
    const onMove = (me: MouseEvent) => seekTo(me.clientX);
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      broadcastStudioEvent("SEEK", "", latestTime);
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [broadcastStudioEvent]);

  const handlePlayheadSeekCommit = useCallback((seconds: number) => {
    const clamped = Math.max(0, seconds);
    setElapsedTime(clamped);
    broadcastStudioEvent("SEEK", "", clamped);
  }, [broadcastStudioEvent]);

  // Format time for display
  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] text-gray-900 font-sans">
      {/* ═══════ HEADER — Transport Controls ═══════ */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-200 shrink-0">
        {/* Left: Logo + project actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">M</div>
            <h1 className="text-base font-semibold tracking-tight text-gray-900">
              Music<span className="text-violet-600">Lab</span>
              <span className="text-gray-400 text-sm ml-1 font-normal">Studio</span>
            </h1>
          </div>

          {/* Project Actions */}
          <div className="flex items-center gap-1.5">
            <button onClick={handleSaveProject}
              className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 text-xs font-medium transition-colors"
              title="Save">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 16H3a2 2 0 01-2-2V2a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Save
            </button>
            <button onClick={handleLoadProject} disabled={isRehydrating}
              className="h-8 px-3 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 text-white flex items-center gap-1.5 text-xs font-medium transition-colors"
              title="Load">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 10V2M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isRehydrating ? "..." : "Load"}
            </button>
            <div className="h-8 px-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center text-[10px] text-gray-500">
              <span className="mr-1 font-semibold text-gray-600">ID:</span>
              <span className="font-mono text-[11px] text-gray-700">{currentProjectId || "N/A"}</span>
            </div>
            <div className={`h-8 px-2.5 rounded-lg border flex items-center text-[10px] ${
              isSocketConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              <span className="mr-1 font-semibold">Sync:</span>
              <span className="font-semibold">{isSocketConnected ? "Connected" : "Connecting"}</span>
            </div>
            <div className={`h-8 px-2.5 rounded-lg border flex items-center text-[10px] ${
              isAudioUnlocked
                ? "bg-cyan-50 border-cyan-200 text-cyan-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <span className="mr-1 font-semibold">Audio:</span>
              <span className="font-semibold">{isAudioUnlocked ? "Unlocked" : "Locked"}</span>
            </div>
            <button
              onClick={handleUnlockAudio}
              disabled={isAudioUnlocked}
              className="h-8 px-3 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white text-[10px] font-semibold transition-colors"
              title="Unlock browser audio context"
            >
              Unlock Audio
            </button>
            {needsAudioUnlock && (
              <div className="h-8 px-2 rounded-lg border border-rose-200 bg-rose-50 flex items-center text-[10px] text-rose-700 font-medium">
                Remote event pending user click
              </div>
            )}
          </div>
        </div>

        {/* Center: Transport */}
        <div className="flex items-center gap-2">
          {/* Time Display */}
          <div className="bg-gray-900 text-emerald-400 px-3 py-1.5 rounded-lg font-mono text-sm tracking-wider mr-2 min-w-[90px] text-center shadow-inner">
            {formatTime(elapsedTime)}
          </div>

          <button onClick={handleStop}
            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors border border-gray-200" title="Stop">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><rect width="14" height="14" rx="2" /></svg>
          </button>

          <button onClick={handlePlayPause}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isPlaying ? "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-200"
                : "bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white shadow-violet-200"
            }`}
            title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="1" width="4" height="14" rx="1" /><rect x="10" y="1" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="ml-0.5">
                <path d="M3 1.7v12.6a1 1 0 001.5.87l10-6.3a1 1 0 000-1.74l-10-6.3A1 1 0 003 1.7z" />
              </svg>
            )}
          </button>


        </div>

        {/* Right: BPM, Metronome, Upload, Mixer */}
        <div className="flex items-center gap-3">

          {/* Metronome Toggle */}
          <button onClick={() => setMetronomeOn(!metronomeOn)}
            className={`h-8 px-3 rounded-lg border text-xs font-bold transition-all ${
              metronomeOn ? "bg-violet-50 border-violet-300 text-violet-600" : "bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600"
            }`}
            title="Metronome">
            <span className="tracking-wider">♩</span> {metronomeOn ? "ON" : "OFF"}
          </button>

          {/* BPM Control */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">BPM</label>
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => handleBpmChange(bpm - 1)} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors text-sm">−</button>
              <input type="number" value={bpm}
                onChange={(e) => handleBpmChange(parseInt(e.target.value) || 120)}
                className="w-12 bg-transparent text-center text-xs font-mono text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={20} max={300} />
              <button onClick={() => handleBpmChange(bpm + 1)} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors text-sm">+</button>
            </div>
          </div>

          {/* Upload Audio */}
          <button onClick={() => fileInputRef.current?.click()}
            className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 flex items-center gap-1.5 text-xs transition-colors" title="Upload Audio">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v8M4 6l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Import
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />

          {/* Instruments Toggle */}
          <button onClick={() => setShowInstruments(!showInstruments)}
            className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all ${
              showInstruments ? "bg-amber-50 border-amber-300 text-amber-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700"
            }`}
            title="Instruments">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </button>

          {/* Mixer Toggle */}
          <button onClick={() => setShowMixer(!showMixer)}
            className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all ${
              showMixer ? "bg-violet-50 border-violet-300 text-violet-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700"
            }`}
            title="Mixer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ═══════ MAIN WORKSPACE ═══════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar: Track List ── */}
        <aside className="w-52 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
          <div className="p-3 text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100 font-bold flex items-center justify-between">
            Tracks
            <button
              onClick={handleAddTrack}
              className="w-5 h-5 rounded bg-violet-100 text-violet-600 flex items-center justify-center hover:bg-violet-200 transition-colors"
              title="Add Track"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
          {tracks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="text-xs font-medium mb-1">No tracks yet</p>
              <p className="text-[10px] text-gray-300 leading-relaxed">Drop audio files on the timeline or click Import</p>
            </div>
          ) : (
            <div className="flex-1">
              {tracks.map((track, i) => (
                <div key={track.trackId}
                  className="flex items-center gap-2 px-3 h-20 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                  <div className={`w-1.5 h-10 rounded-full ${track.isMuted ? "bg-gray-300" : ["bg-violet-400","bg-emerald-400","bg-amber-400","bg-rose-400","bg-sky-400"][i % 5]}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-800 truncate block">{track.name}</span>
                    <span className="text-[10px] text-gray-400">{track.regions.length} clip{track.regions.length !== 1 ? "s" : ""}</span>
                  </div>
                  {/* Mute */}
                  <button onClick={() => handleToggleMute(track.trackId)}
                    className={`w-6 h-5 rounded text-[9px] font-bold uppercase transition-colors ${
                      track.isMuted ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`} title={track.isMuted ? "Unmute" : "Mute"}>
                    M
                  </button>
                  {/* Solo (decorative) */}
                  <button className="w-6 h-5 rounded text-[9px] font-bold bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-500 transition-colors" title="Solo">S</button>
                  {/* Delete Track */}
                  <button onClick={() => removeTrack(track.trackId)}
                    className="w-6 h-5 rounded text-[9px] font-bold bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all"
                    title="Delete Track">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Master Volume */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Master</span>
              <span className="text-[10px] text-gray-500 font-mono">{masterVolume}%</span>
            </div>
            <input type="range" min="0" max="100" value={masterVolume} onChange={(e) => setMasterVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-violet-500
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-md" />
          </div>
        </aside>

        {/* ── Main Timeline Area ── */}
        <main
          className={`flex-1 relative overflow-x-auto overflow-y-auto transition-colors ${dragOverTimeline ? "bg-violet-50 ring-2 ring-inset ring-violet-300" : "bg-gray-50"}`}
          onDragOver={handleTimelineDragOver}
          onDragLeave={handleTimelineDragLeave}
          onDrop={handleTimelineDrop}
        >
          {/* Timeline ruler — click/drag to seek */}
          <div
            className="sticky top-0 z-40 h-8 bg-white/90 backdrop-blur border-b border-gray-200 flex items-end cursor-pointer select-none"
            onMouseDown={handleRulerMouseDown}
          >
            {Array.from({ length: 421 }, (_, i) => {
              const showLabel = i % 10 === 0;
              const mins = Math.floor(i / 60);
              const secs = i % 60;
              return (
                <div key={i} className={`shrink-0 h-full flex items-end ${showLabel ? 'border-l border-gray-300 px-1' : i % 5 === 0 ? 'border-l border-gray-200' : 'border-l border-gray-100'}`} style={{ width: 50 }}>
                  {showLabel && <span className="text-[10px] text-gray-400 font-mono mb-1 whitespace-nowrap">{mins}:{secs.toString().padStart(2, '0')}</span>}
                </div>
              );
            })}
          </div>

          {/* Track lanes + Playhead */}
          <div className="relative min-h-full" style={{ minWidth: 421 * 50 }}>
            <Playhead onSeekCommit={handlePlayheadSeekCommit} />

            {tracks.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-gray-400">
                <div className="text-center">
                  {dragOverTimeline ? (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-500"><path d="M12 2v20M2 12h20" /></svg>
                      </div>
                      <p className="text-sm font-bold text-violet-600 mb-1">Drop audio file here</p>
                      <p className="text-xs text-violet-400">MP3, WAV, OGG, FLAC supported</p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium mb-1">Drop audio files here</p>
                      <p className="text-xs text-gray-300 mb-4">or click Import to add your first audio file</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors shadow-md shadow-violet-200"
                      >
                        Browse Files
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              tracks.map((track, index) => (
                <TrackRow key={track.trackId} track={track} index={index} />
              ))
            )}
          </div>
        </main>

        {/* ── Mixer Panel (toggle) ── */}
        {showMixer && (
          <aside className="w-56 shrink-0 bg-white border-l border-gray-200 overflow-y-auto p-4">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-4">Mixer</div>
            {tracks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No tracks</p>
            ) : (
              <div className="space-y-4">
                {tracks.map((track, i) => (
                  <div key={track.trackId} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${["bg-violet-400","bg-emerald-400","bg-amber-400","bg-rose-400","bg-sky-400"][i % 5]}`} />
                      <span className="text-xs font-medium text-gray-800 truncate">{track.name}</span>
                    </div>
                    {/* Volume */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] text-gray-400 w-6">Vol</span>
                      <input type="range" min="0" max="100" defaultValue={track.volume * 100}
                        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-violet-500
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500" />
                    </div>
                    {/* Pan */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-400 w-6">Pan</span>
                      <input type="range" min="-100" max="100" defaultValue={0}
                        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-500
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-500" />
                      <span className="text-[9px] text-gray-400 w-4 text-right">C</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* ── Instruments Panel (toggle) ── */}
        {showInstruments && (
          <aside className="w-56 shrink-0 bg-white border-l border-gray-200 overflow-y-auto p-4">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-4">Instruments</div>
            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Click an instrument to add it as a new track.</p>
            <div className="space-y-2">
              {[
                { name: "Grand Piano", icon: "🎹", color: "bg-violet-100 text-violet-600 border-violet-200" },
                { name: "Acoustic Drums", icon: "🥁", color: "bg-amber-100 text-amber-600 border-amber-200" },
                { name: "Synth Bass", icon: "🎛️", color: "bg-emerald-100 text-emerald-600 border-emerald-200" },
                { name: "Strings Ensemble", icon: "🎻", color: "bg-rose-100 text-rose-600 border-rose-200" },
                { name: "Electric Guitar", icon: "🎸", color: "bg-sky-100 text-sky-600 border-sky-200" },
                { name: "Brass Section", icon: "🎺", color: "bg-orange-100 text-orange-600 border-orange-200" },
                { name: "Choir Pad", icon: "🎤", color: "bg-pink-100 text-pink-600 border-pink-200" },
                { name: "808 Sub Bass", icon: "💥", color: "bg-gray-100 text-gray-600 border-gray-200" },
              ].map((inst) => (
                <button
                  key={inst.name}
                  onClick={() => {
                    const id = `track-${Date.now()}`;
                    addTrack({ trackId: id, name: inst.name, volume: 0.8, isMuted: false, regions: [] });
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left hover:shadow-md hover:-translate-y-0.5 transition-all ${inst.color}`}
                >
                  <span className="text-lg">{inst.icon}</span>
                  <div>
                    <span className="text-xs font-bold block">{inst.name}</span>
                    <span className="text-[9px] opacity-60">Virtual Instrument</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ═══════ STATUS BAR ═══════ */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-gray-200 text-[11px] text-gray-400 shrink-0">
        <div className="flex items-center gap-4">
          <span>{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
          <span>{tracks.reduce((sum, t) => sum + t.regions.length, 0)} clip{tracks.reduce((sum, t) => sum + t.regions.length, 0) !== 1 ? "s" : ""}</span>
        </div>
        <span className={`flex items-center gap-1.5 ${isPlaying ? "text-emerald-500 font-medium" : "text-gray-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
          {isPlaying ? "Playing" : "Stopped"}
        </span>
        <div className="flex items-center gap-4">
          <span>{bpm} BPM</span>
          <span>Master: {masterVolume}%</span>
        </div>
      </footer>
    </div>
  );
}
