"use client";

import { useCallback, useRef } from "react";

/**
 * Riproduzione al passaggio del mouse per le anteprime video delle card.
 *
 * `stop` attende la promise di `play()` prima di mettere in pausa, e la salta
 * se nel frattempo il mouse e' rientrato.
 */
export function useHoverVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const starting = useRef<Promise<void>>(Promise.resolve());
  const wanted = useRef(false);

  const play = useCallback(() => {
    wanted.current = true;
    const video = videoRef.current;
    if (!video) return;
    starting.current = video.play().catch(() => { /* autoplay negato */ });
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    const video = videoRef.current;
    if (!video) return;
    starting.current.then(() => {
      if (wanted.current || !videoRef.current) return;
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    });
  }, []);

  return { videoRef, play, stop };
}
