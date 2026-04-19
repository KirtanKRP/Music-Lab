"use client";

import type { AudioRegion } from "@/store/useStudioStore";
import { PIXELS_PER_SECOND } from "@/lib/constants/index";

/**
 * RegionBlock — visual representation of an audio clip on the timeline.
 * Positioned absolutely within its parent TrackRow.
 * left = startTime * PIXELS_PER_SECOND, width = duration * PIXELS_PER_SECOND.
 */
interface RegionBlockProps {
  region: AudioRegion;
}

// Color palette for visual variety
const REGION_COLORS = [
  { bg: "bg-violet-500/30", border: "border-violet-500/50", text: "text-violet-300" },
  { bg: "bg-cyan-500/30", border: "border-cyan-500/50", text: "text-cyan-300" },
  { bg: "bg-amber-500/30", border: "border-amber-500/50", text: "text-amber-300" },
  { bg: "bg-emerald-500/30", border: "border-emerald-500/50", text: "text-emerald-300" },
  { bg: "bg-rose-500/30", border: "border-rose-500/50", text: "text-rose-300" },
];

function getRegionColor(sampleId: string) {
  // Deterministic color from sampleId hash
  let hash = 0;
  for (let i = 0; i < sampleId.length; i++) {
    hash = (hash * 31 + sampleId.charCodeAt(i)) | 0;
  }
  return REGION_COLORS[Math.abs(hash) % REGION_COLORS.length];
}

export default function RegionBlock({ region }: RegionBlockProps) {
  const color = getRegionColor(region.sampleId);
  const left = region.startTime * PIXELS_PER_SECOND;
  const width = region.duration * PIXELS_PER_SECOND;

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md ${color.bg} border ${color.border} overflow-hidden cursor-pointer hover:brightness-110 transition-[filter]`}
      style={{ left, width }}
      title={`${region.sampleId} | ${region.startTime}s – ${(region.startTime + region.duration).toFixed(1)}s`}
    >
      {/* Waveform placeholder bar */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40%] mx-1 rounded-sm bg-white/10" />

      {/* Region label */}
      <span className={`relative z-10 text-[10px] ${color.text} px-1.5 pt-0.5 truncate block font-medium`}>
        {region.sampleId}
      </span>
    </div>
  );
}
