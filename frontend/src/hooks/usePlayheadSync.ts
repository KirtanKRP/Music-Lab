import { useEffect, useRef, type RefObject } from "react";
import AudioEngine from "@/lib/audio/AudioEngine";

/**
 * Custom hook that synchronizes the visual playhead to Tone.Transport
 * using a requestAnimationFrame loop with DIRECT DOM MUTATION.
 *
 * CRITICAL (Agent.md §5): This is "The Bridge" between Tone.js time and React.
 *
 * WHY requestAnimationFrame + direct DOM mutation?
 * ─────────────────────────────────────────────────
 * The playhead moves at ~60fps. If we stored the position in React state
 * (useState or Zustand), every frame would trigger:
 *   setState → reconciliation → virtual DOM diff → re-render
 *
 * For a complex DAW UI with potentially hundreds of regions, this would
 * cause catastrophic frame drops and audio glitches.
 *
 * Instead, we:
 * 1. Read the current time from AudioEngine (Tone.Transport.seconds)
 * 2. Directly mutate the playhead DOM node's style.transform
 * 3. React never knows the playhead moved → zero re-renders → 60fps
 *
 * @param playheadRef - React ref to the playhead <div> element
 * @param pixelsPerSecond - How many pixels represent one second on the timeline
 */
export function usePlayheadSync(
  playheadRef: RefObject<HTMLDivElement | null>,
  pixelsPerSecond: number = 50
): void {
  // Store the animation frame ID so we can cancel on unmount
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const engine = AudioEngine.getInstance();

    const tick = () => {
      if (playheadRef.current) {
        const currentTime = engine.getCurrentTime();
        const xPosition = currentTime * pixelsPerSecond;

        // DIRECT DOM MUTATION — bypasses React's render cycle entirely
        playheadRef.current.style.transform = `translateX(${xPosition}px)`;
      }

      // Schedule the next frame
      rafIdRef.current = requestAnimationFrame(tick);
    };

    // Start the animation loop
    rafIdRef.current = requestAnimationFrame(tick);

    // Cleanup: cancel the loop when the component unmounts
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [playheadRef, pixelsPerSecond]);
}

export default usePlayheadSync;
