"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useMarketStore } from "@/store/useMarketStore";
import { formatDuration } from "@/lib/api/marketClient";

export default function MarketAudioPlayer() {
  const {
    activePreviewTrack,
    isPreviewPlaying,
    pausePreview,
    resumePreview,
    stopPreview,
    playNext,
    playPrev,
  } = useMarketStore();

  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  // Check if we're on a page with the sidebar layout
  const hasSidebar = pathname === "/" || 
    pathname === "/marketplace" || 
    pathname === "/explore" || 
    pathname === "/wishlist" || 
    pathname === "/hooks-lab" ||
    pathname.startsWith("/market/upload");

  // Sync play/pause with audio element
  useEffect(() => {
    if (!audioRef.current || !activePreviewTrack?.previewUrl) return;

    if (isPreviewPlaying) {
      audioRef.current.play().catch((err) => {
        console.error("Autoplay prevented:", err);
        pausePreview();
      });
    } else {
      audioRef.current.pause();
    }
  }, [activePreviewTrack, isPreviewPlaying, pausePreview]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }, []);

  // Click-to-seek on progress bar
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioRef.current.currentTime = ratio * duration;
    },
    [duration]
  );

  if (!activePreviewTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`fixed bottom-0 right-0 z-50 glass border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-fade-in ${hasSidebar ? 'left-[240px]' : 'left-0'}`}>
      {/* Clickable progress bar — ABOVE the controls */}
      <div
        ref={progressRef}
        onClick={handleSeek}
        className="w-full h-1.5 bg-gray-200 cursor-pointer group hover:h-2.5 transition-all duration-200"
      >
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-r-full relative transition-all duration-75"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-violet-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="px-4 md:px-6 py-3 flex items-center gap-3 md:gap-6">
        {/* Track Info — left */}
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0 shadow-md">
            {activePreviewTrack.coverUrl ? (
              <img
                src={activePreviewTrack.coverUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-500" />
            )}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-sm font-bold text-gray-900 truncate">
              {activePreviewTrack.title}
            </span>
            <span className="text-xs text-gray-500 truncate">
              {activePreviewTrack.artistName}
            </span>
          </div>
        </div>

        {/* Controls — center */}
        <div className="flex items-center justify-center gap-3 md:gap-5 flex-1">
          <button
            onClick={playPrev}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1"
            title="Previous"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
            </svg>
          </button>

          <button
            onClick={() => (isPreviewPlaying ? pausePreview() : resumePreview())}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-violet-600 text-white hover:bg-violet-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-violet-200"
          >
            {isPreviewPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                <path d="M6 3.5L19 12L6 20.5V3.5Z" />
              </svg>
            )}
          </button>

          <button
            onClick={playNext}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1"
            title="Next"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z" />
            </svg>
          </button>
        </div>

        {/* Time & close — right */}
        <div className="w-1/3 flex items-center justify-end gap-3 min-w-0">
          <span className="text-xs text-gray-400 font-mono hidden md:block whitespace-nowrap">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
          <button
            onClick={stopPreview}
            className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
            title="Close player"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={activePreviewTrack.previewUrl}
        onEnded={playNext}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
}
