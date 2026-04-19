"use client";

import { useRef } from "react";
import { usePlayheadSync } from "@/hooks/usePlayheadSync";
import { PIXELS_PER_SECOND } from "@/lib/constants/index";

/**
 * Playhead — the vertical red scrubber line that moves across the timeline.
 * Uses requestAnimationFrame via usePlayheadSync for 60fps DOM updates
 * without triggering React re-renders (Agent.md §5 compliance).
 */
export default function Playhead() {
  const playheadRef = useRef<HTMLDivElement>(null);

  // Hook reads AudioEngine.getCurrentTime() at ~60fps and directly
  // mutates this DOM node's transform — React is never involved.
  usePlayheadSync(playheadRef, PIXELS_PER_SECOND);

  return (
    <div
      ref={playheadRef}
      className="absolute top-0 left-0 w-[2px] h-full bg-red-500 z-50 pointer-events-none"
      style={{ willChange: "transform" }}
    >
      {/* Playhead handle at the top */}
      <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-red-500 rounded-full" />
    </div>
  );
}
