"use client";

import { useRef, useCallback } from "react";
import { usePlayheadSync } from "@/hooks/usePlayheadSync";
import { PIXELS_PER_SECOND } from "@/lib/constants/index";
import AudioEngine from "@/lib/audio/AudioEngine";

/**
 * Playhead — the vertical red scrubber line that moves across the timeline.
 * Uses requestAnimationFrame via usePlayheadSync for 60fps DOM updates
 * without triggering React re-renders (Agent.md §5 compliance).
 * The top handle is draggable — drag it to seek on the timeline.
 */
interface PlayheadProps {
  onSeekCommit?: (seconds: number) => void;
}

export default function Playhead({ onSeekCommit }: PlayheadProps) {
  const playheadRef = useRef<HTMLDivElement>(null);

  // Hook reads AudioEngine.getCurrentTime() at ~60fps and directly
  // mutates this DOM node's transform — React is never involved.
  usePlayheadSync(playheadRef, PIXELS_PER_SECOND);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parent = playheadRef.current?.parentElement;
    if (!parent) return;
    let latestTime = 0;

    const seekTo = (clientX: number) => {
      const rect = parent.getBoundingClientRect();
      const x = clientX - rect.left;
      const time = Math.max(0, x / PIXELS_PER_SECOND);
      latestTime = time;
      AudioEngine.getInstance().seek(time);
    };

    seekTo(e.clientX);

    const onMove = (me: MouseEvent) => seekTo(me.clientX);
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      onSeekCommit?.(latestTime);
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onSeekCommit]);

  return (
    <div
      ref={playheadRef}
      className="absolute top-0 left-0 w-[2px] h-full bg-red-500 z-50 pointer-events-none"
      style={{ willChange: "transform" }}
    >
      {/* Draggable playhead handle */}
      <div
        className="absolute -top-1 -left-[5px] w-3 h-3 bg-red-500 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-150 transition-transform"
        onMouseDown={handleDrag}
      />
    </div>
  );
}
