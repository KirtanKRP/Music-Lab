"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import Portal from "@/components/Portal";
import { useMarketStore } from "@/store/useMarketStore";
import { getMarketTracks, MarketTrack } from "@/lib/api/marketClient";
import MarketTrackCard from "@/components/market/MarketTrackCard";
import TrackDetailsModal from "@/components/market/TrackDetailsModal";
import MarketAudioPlayer from "@/components/market/MarketAudioPlayer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function WishlistPage() {
  const { wishlist } = useMarketStore();
  const [allTracks, setAllTracks] = useState<MarketTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<MarketTrack | null>(null);

  useEffect(() => {
    getMarketTracks()
      .then(setAllTracks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const wishlistedTracks = allTracks.filter((t) => wishlist.includes(t.id));

  return (
    <SidebarLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-8 py-6 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pink-500">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            My Library
            {wishlistedTracks.length > 0 && (
              <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {wishlistedTracks.length} track{wishlistedTracks.length !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your liked and saved tracks</p>
        </header>

        {/* Content */}
        <main className="flex-1 px-8 py-8 pb-32">
          {loading ? (
            <LoadingSpinner text="Loading your library..." />
          ) : wishlistedTracks.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pink-400">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No liked tracks yet</h3>
              <p className="text-gray-500 mb-6">Click the heart icon on any track to save it here.</p>
              <a
                href="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-violet-200"
              >
                Explore Marketplace →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {wishlistedTracks.map((track) => (
                <MarketTrackCard
                  key={track.id}
                  track={track}
                  onClick={setSelectedTrack}
                />
              ))}
            </div>
          )}
        </main>

        <Portal>
          {selectedTrack && (
            <TrackDetailsModal
              track={selectedTrack}
              onClose={() => setSelectedTrack(null)}
            />
          )}
          <MarketAudioPlayer />
        </Portal>
      </div>
    </SidebarLayout>
  );
}
