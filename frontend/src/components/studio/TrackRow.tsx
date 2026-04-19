"use client";

import type { AudioTrack } from "@/store/useStudioStore";
import RegionBlock from "./RegionBlock";

/**
 * TrackRow — a single horizontal track lane in the DAW timeline.
 * Renders RegionBlock components and a mute toggle button.
 */
interface TrackRowProps {
  track: AudioTrack;
  index: number;
}

export default function TrackRow({ track, index }: TrackRowProps) {
  return (
    <div
      className={`h-20 border-b border-gray-800/50 relative ${
        index % 2 === 0 ? "bg-gray-950" : "bg-gray-900/30"
      } ${track.isMuted ? "opacity-40" : ""}`}
    >
      {/* Mute indicator overlay */}
      {track.isMuted && (
        <div className="absolute top-1 right-2 z-20">
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded">
            Muted
          </span>
        </div>
      )}

      {/* Regions rendered as absolutely positioned blocks */}
      {track.regions.map((region) => (
        <RegionBlock key={region.sampleId} region={region} />
      ))}

      {/* Empty track indicator */}
      {track.regions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-700 italic">Drop audio here</span>
        </div>
      )}
    </div>
  );
}
