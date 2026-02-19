import { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL;
const TRACKS = [
  `${BASE}audio/cwn-background-music-1.mp3`,
  `${BASE}audio/cwn-background-music-2.mp3`,
];
const FADE_DURATION = 10; // seconds
const FADE_INTERVAL = 50; // ms between volume steps

export default function useBackgroundMusic({ autoStart = true } = {}) {
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("cwn-music-muted") === "true"; }
    catch { return false; }
  });

  const mutedRef = useRef(muted);
  const audioRef = useRef(null);
  const trackIdxRef = useRef(0);
  const fadeTimer = useRef(null);
  const pollTimer = useRef(null);
  const started = useRef(false);

  // Keep ref in sync with state
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Persist mute preference and apply to live audio
  useEffect(() => {
    try { localStorage.setItem("cwn-music-muted", String(muted)); }
    catch { /* noop */ }
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : (fadeTimer.current ? audioRef.current.volume : 1);
    }
  }, [muted]);

  const cleanup = useCallback(() => {
    clearInterval(fadeTimer.current);
    clearTimeout(pollTimer.current);
    fadeTimer.current = null;
    pollTimer.current = null;
  }, []);

  // Core: play a track, poll for fade-out point, fade, then switch
  const playTrack = useCallback((idx) => {
    cleanup();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(TRACKS[idx]);
    audio.volume = mutedRef.current ? 0 : 1;
    audioRef.current = audio;
    trackIdxRef.current = idx;

    const startFadePoll = () => {
      const poll = () => {
        if (!audioRef.current || audioRef.current !== audio) return;
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= FADE_DURATION) {
          beginFade(audio, remaining, idx);
        } else {
          pollTimer.current = setTimeout(poll, 500);
        }
      };
      poll();
    };

    const onCanPlay = () => {
      audio.play().then(() => {
        if (audio.duration && isFinite(audio.duration)) {
          startFadePoll();
        } else {
          audio.addEventListener("durationchange", startFadePoll, { once: true });
        }
      }).catch(() => { /* autoplay blocked, handled elsewhere */ });
    };

    if (audio.readyState >= 3) {
      onCanPlay();
    } else {
      audio.addEventListener("canplay", onCanPlay, { once: true });
    }
  }, [cleanup]); // eslint-disable-line react-hooks/exhaustive-deps

  const beginFade = useCallback((audio, remainingSec, idx) => {
    clearInterval(fadeTimer.current);
    clearTimeout(pollTimer.current);
    fadeTimer.current = null;

    const totalSteps = Math.max(1, Math.floor((remainingSec * 1000) / FADE_INTERVAL));
    let step = 0;
    const startVolume = mutedRef.current ? 0 : audio.volume;

    fadeTimer.current = setInterval(() => {
      step++;
      const progress = Math.min(step / totalSteps, 1);

      if (!mutedRef.current) {
        audio.volume = Math.max(0, startVolume * (1 - progress));
      }

      if (progress >= 1) {
        clearInterval(fadeTimer.current);
        fadeTimer.current = null;
        const next = (idx + 1) % TRACKS.length;
        playTrack(next);
      }
    }, FADE_INTERVAL);
  }, [playTrack]);

  // Manually start music (called by intro sequence)
  const startMusic = useCallback(() => {
    if (started.current) return;
    started.current = true;
    playTrack(0);
  }, [playTrack]);

  // Bootstrap: try autoplay, fall back to first interaction
  useEffect(() => {
    if (!autoStart) return;
    if (started.current) return;

    const boot = () => {
      if (started.current) return;
      started.current = true;
      playTrack(0);
      document.removeEventListener("click", boot);
      document.removeEventListener("keydown", boot);
    };

    // Try autoplay
    const probe = new Audio(TRACKS[0]);
    probe.volume = mutedRef.current ? 0 : 1;
    audioRef.current = probe;

    probe.play().then(() => {
      started.current = true;
      // Probe succeeded — set up fade poll
      const startFadePoll = () => {
        const poll = () => {
          if (audioRef.current !== probe) return;
          const remaining = probe.duration - probe.currentTime;
          if (remaining <= FADE_DURATION) {
            beginFade(probe, remaining, 0);
          } else {
            pollTimer.current = setTimeout(poll, 500);
          }
        };
        poll();
      };
      if (probe.duration && isFinite(probe.duration)) {
        startFadePoll();
      } else {
        probe.addEventListener("durationchange", startFadePoll, { once: true });
      }
    }).catch(() => {
      probe.pause();
      audioRef.current = null;
      document.addEventListener("click", boot);
      document.addEventListener("keydown", boot);
    });

    return () => {
      document.removeEventListener("click", boot);
      document.removeEventListener("keydown", boot);
    };
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [cleanup]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return { muted, toggleMute, startMusic };
}
