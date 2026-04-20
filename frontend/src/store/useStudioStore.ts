import { create } from "zustand";
import StudioSocketClient from "@/lib/api/socketClient";

// ─── Types matching backend DTOs ───────────────────────────────────────────

export interface AudioRegion {
  sampleId: string;
  startTime: number;
  duration: number;
  audioFileUrl: string;
}

export interface AudioTrack {
  trackId: string;
  name: string;
  volume: number;
  isMuted: boolean;
  regions: AudioRegion[];
}

// ─── Store State ────────────────────────────────────────────────────────────
//
// CRITICAL (Agent.md §5): playheadPosition is intentionally EXCLUDED.
// Fast-moving playhead is read directly from AudioEngine.getCurrentTime()
// via a requestAnimationFrame loop in usePlayheadSync.
// Putting it here would cause catastrophic React re-renders (~60/sec).
//

interface StudioState {
  isPlaying: boolean;
  isRehydrating: boolean;
  bpm: number;
  tracks: AudioTrack[];
  currentProjectId: string;
}

interface StudioActions {
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setRehydrating: (rehydrating: boolean) => void;
  setBpm: (bpm: number) => void;
  setTracks: (tracks: AudioTrack[]) => void;
  addTrack: (track: AudioTrack) => void;
  updateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  addRegionToTrack: (trackId: string, region: AudioRegion) => void;
  removeTrack: (trackId: string) => void;
  hydrateProject: (bpm: number, tracks: AudioTrack[]) => void;
  setCurrentProjectId: (id: string) => void;
  toggleTrackMute: (trackId: string, isRemoteEvent: boolean) => void;
}

type StudioStore = StudioState & StudioActions;

const useStudioStore = create<StudioStore>((set) => ({
  // ── Initial State ──
  isPlaying: false,
  isRehydrating: false,
  bpm: 120,
  tracks: [],
  currentProjectId: "",

  // ── Actions ──
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setRehydrating: (rehydrating) => set({ isRehydrating: rehydrating }),

  setBpm: (bpm) => set({ bpm }),

  setTracks: (tracks) => set({ tracks }),

  addTrack: (track) =>
    set((state) => ({ tracks: [...state.tracks, track] })),

  updateTrack: (trackId, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.trackId === trackId ? { ...t, ...updates } : t
      ),
    })),

  addRegionToTrack: (trackId, region) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.trackId === trackId
          ? { ...t, regions: [...t.regions, region] }
          : t
      ),
    })),

  removeTrack: (trackId) =>
    set((state) => ({
      tracks: state.tracks.filter((t) => t.trackId !== trackId),
    })),

  hydrateProject: (bpm, tracks) =>
    set({ bpm, tracks, isPlaying: false }),

  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  /**
   * Toggles a track's mute state.
   *
   * CRITICAL ECHO PREVENTION:
   * - isRemoteEvent = false → local user action → toggle + send STOMP event
   * - isRemoteEvent = true  → remote socket event → toggle ONLY (no re-send)
   *
   * Without this flag, muting would loop infinitely:
   *   Local mute → send event → server broadcast → receive own event → mute again → send...
   */
  toggleTrackMute: (trackId, isRemoteEvent) =>
    set((state) => {
      const newTracks = state.tracks.map((t) =>
        t.trackId === trackId ? { ...t, isMuted: !t.isMuted } : t
      );

      // Only broadcast over WebSocket if this is a LOCAL action
      if (!isRemoteEvent) {
        StudioSocketClient.getInstance().sendSyncEvent(
          state.currentProjectId,
          "TRACK_MUTE",
          trackId
        );
      }

      return { tracks: newTracks };
    }),
}));

export default useStudioStore;
