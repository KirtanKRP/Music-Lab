"use client";

import { useState, useEffect, useMemo } from "react";
import { getMarketTracks, type MarketTrack } from "@/lib/api/marketClient";
import { useMarketStore } from "@/store/useMarketStore";
import Portal from "@/components/Portal";
import MarketTrackCard from "./MarketTrackCard";
import TrackDetailsModal from "./TrackDetailsModal";
import CartDrawer from "./CartDrawer";
import MarketAudioPlayer from "./MarketAudioPlayer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function MarketplaceView() {
  const [tracks, setTracks] = useState<MarketTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<MarketTrack | null>(null);
  const [backendStatus, setBackendStatus] = useState<'loading' | 'connected' | 'offline'>('loading');

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "popular">("popular");

  const { cart, wishlist, toggleCart, setAllTracks } = useMarketStore();

  useEffect(() => {
    getMarketTracks()
      .then((data) => {
        setTracks(data);
        setAllTracks(data);
        // Track IDs 101-112 are mock fallback data defined in marketClient.ts
        // If all IDs are in that range, backend was offline
        const hasRealData = data.some(t => t.id < 101 || t.id > 112);
        setBackendStatus(hasRealData ? 'connected' : 'offline');
      })
      .catch(() => {
        setBackendStatus('offline');
      })
      .finally(() => setLoading(false));
  }, [setAllTracks]);

  // Filter & Sort Logic
  const filteredAndSortedTracks = useMemo(() => {
    let result = [...tracks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t => t.title.toLowerCase().includes(q) || 
             t.artistName?.toLowerCase().includes(q) ||
             (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    if (selectedGenre !== "All") {
      result = result.filter(t => t.genre === selectedGenre);
    }

    // Sort
    if (sortBy === "price_asc") result.sort((a, b) => a.basePrice - b.basePrice);
    else if (sortBy === "price_desc") result.sort((a, b) => b.basePrice - a.basePrice);
    else if (sortBy === "popular") result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    // newest is default fetched order for mock

    return result;
  }, [tracks, searchQuery, selectedGenre, sortBy]);

  const allGenres = ["All", ...Array.from(new Set(tracks.map(t => t.genre).filter(Boolean)))];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fc] text-gray-900 font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-md z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black tracking-tight text-gray-900">
            Music<span className="text-violet-600">Lab</span>
            <span className="text-gray-400 font-medium text-sm ml-2.5">Marketplace</span>
          </h1>
        </div>

        {/* Backend Status Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${
          backendStatus === 'connected'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : backendStatus === 'offline'
            ? 'bg-amber-50 border-amber-200 text-amber-600'
            : 'bg-gray-50 border-gray-200 text-gray-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            backendStatus === 'connected' ? 'bg-emerald-500'
            : backendStatus === 'offline' ? 'bg-amber-500 animate-pulse'
            : 'bg-gray-300 animate-pulse'}`}
          />
          {backendStatus === 'connected' ? 'Live DB'
           : backendStatus === 'offline' ? 'Demo Mode'
           : 'Connecting...'}
        </div>

        {/* Global Toolbar (Upload, Wishlist, Cart) */}
        <div className="flex items-center gap-4">
          <a href="/market/upload" className="text-sm font-bold text-gray-500 hover:text-violet-600 transition hidden md:block mr-2">
            Sell Tracks
          </a>
          
          <a href="/wishlist" className="relative p-2 text-gray-400 hover:text-pink-500 transition" title="Wishlist">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            {wishlist.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">{wishlist.length}</span>}
          </a>
          
          <button onClick={toggleCart} className="relative p-2 text-gray-400 hover:text-violet-600 transition" title="Cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            {cart.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-md">{cart.length}</span>}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-32">
        {/* Banner Section */}
        <div className="relative pt-16 pb-20 px-8 text-center bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1598368195835-915049a4645d?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center'}}></div>
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
               <span className="px-3 py-1 bg-white/20 text-white font-bold uppercase tracking-wider text-xs rounded-full border border-white/30 mb-6 backdrop-blur-md">Royalty-Free & Exclusive</span>
               <h2 className="text-5xl font-black mb-6 leading-tight tracking-tight text-white drop-shadow-lg">
                 Find the Perfect Beat.
               </h2>
               <div className="w-full flex items-center justify-center relative">
                  <div className="relative w-full max-w-xl">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input 
                      type="text" 
                      placeholder="Search by artist, title, or tags..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/95 border border-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-gray-900 text-lg shadow-2xl shadow-black/20 placeholder:text-gray-400 backdrop-blur-md"
                    />
                  </div>
               </div>
            </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="px-8 mt-8 mb-6 max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar max-w-full">
            {allGenres.map(g => (
              <button 
                key={g as string} 
                onClick={() => setSelectedGenre(g as string)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedGenre === g ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"}`}
              >
                {g as React.ReactNode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
             <span className="text-sm font-bold text-gray-400">SORT BY</span>
             <select 
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
               className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:border-violet-500 cursor-pointer appearance-none pr-8 shadow-sm"
               style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%236b7280" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
             >
               <option value="popular">Most Popular</option>
               <option value="newest">Newest First</option>
               <option value="price_asc">Price: Low to High</option>
               <option value="price_desc">Price: High to Low</option>
             </select>
          </div>
        </div>

        {/* Track Grid */}
        <div className="px-8 max-w-[1600px] mx-auto pb-12">
          {loading ? (
             <LoadingSpinner text="Loading Premium Tracks..." />
          ) : filteredAndSortedTracks.length === 0 ? (
             <div className="text-center py-20">
                <span className="text-6xl mb-4 block">🎧</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No tracks found</h3>
                <p className="text-gray-500">Try adjusting your filters or search term.</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredAndSortedTracks.map(track => (
                 <MarketTrackCard 
                   key={track.id} 
                   track={track} 
                   onClick={setSelectedTrack}
                 />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Global State Modals / Drawers — rendered via Portal to escape overflow stacking */}
      <Portal>
        {selectedTrack && (
          <TrackDetailsModal 
            track={selectedTrack} 
            onClose={() => setSelectedTrack(null)} 
          />
        )}
        <CartDrawer />
        <MarketAudioPlayer />
      </Portal>
      
    </div>
  );
}
