import { useState, useEffect, useRef, useCallback } from "react";
import "./IntroSequence.css";

const BOOT_LINES = [
  { text: "> NEURAL_LINK v4.7.2", delay: 200 },
  { text: "> SCANNING BIOMETRICS...", delay: 700 },
  { text: "  OPERATOR MATCH ── CONFIRMED", delay: 1200, cls: "success" },
  { text: "> LOADING CWN://CHAR_MATRIX...", delay: 1800 },
  { text: "> GRID UPLINK ── ESTABLISHED", delay: 2400, cls: "success" },
  { text: "  ████████████████ 100%", delay: 3000 },
  { text: "> SYSTEM READY", delay: 3600, cls: "ready" },
];

const TITLE = "CITIES WITHOUT NUMBER";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

export default function IntroSequence({ onComplete, startMusic }) {
  const [phase, setPhase] = useState("boot"); // boot → ready → activating
  const [lineCount, setLineCount] = useState(0);
  const [titleText, setTitleText] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [flash, setFlash] = useState(false);
  const [sweep, setSweep] = useState(false);
  const [fading, setFading] = useState(false);
  const scrambleRef = useRef(null);
  const timersRef = useRef([]);

  const addTimer = useCallback((id) => { timersRef.current.push(id); }, []);

  // Phase 1: Boot text
  useEffect(() => {
    if (phase !== "boot") return;
    BOOT_LINES.forEach((line, i) => {
      addTimer(setTimeout(() => {
        setLineCount(i + 1);
        if (i === BOOT_LINES.length - 1) {
          addTimer(setTimeout(() => setPhase("ready"), 600));
        }
      }, line.delay));
    });
  }, [phase, addTimer]);

  // Title scramble effect
  const scramble = useCallback(() => {
    let frame = 0;
    const total = 80;
    scrambleRef.current = setInterval(() => {
      frame++;
      const p = frame / total;
      setTitleText(
        TITLE.split("").map((ch, i) => {
          if (ch === " ") return " ";
          const resolve = 0.15 + (i / TITLE.length) * 0.85;
          if (p >= resolve) return ch;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join("")
      );
      if (frame >= total) {
        clearInterval(scrambleRef.current);
        setTitleText(TITLE);
      }
    }, 35);
  }, []);

  // Handle activation
  const activate = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("activating");
    startMusic();

    setFlash(true);
    addTimer(setTimeout(() => setFlash(false), 300));
    addTimer(setTimeout(() => {
      setSweep(true);
      addTimer(setTimeout(() => setSweep(false), 1800));
    }, 200));
    addTimer(setTimeout(scramble, 700));
    addTimer(setTimeout(() => setShowSubtitle(true), 3600));
    addTimer(setTimeout(() => setFading(true), 5600));
    addTimer(setTimeout(onComplete, 7600));
  }, [phase, startMusic, scramble, onComplete, addTimer]);

  // Keyboard activation
  useEffect(() => {
    if (phase !== "ready") return;
    const fn = (e) => { if (e.key !== "Tab") activate(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [phase, activate]);

  // Cleanup
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    if (scrambleRef.current) clearInterval(scrambleRef.current);
  }, []);

  const cls = [
    "intro-overlay",
    phase === "activating" ? "is-activating" : "",
    fading ? "is-fading" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      {flash && <div className="intro-flash" />}
      {sweep && <div className="intro-sweep" />}

      {/* Boot & Ready phases */}
      {phase !== "activating" && (
        <div className={`intro-pre ${phase === "ready" ? "is-ready" : ""}`}>
          <div className="intro-terminal">
            {BOOT_LINES.slice(0, lineCount).map((l, i) => (
              <div key={i} className={`intro-ln ${l.cls || ""}`}>{l.text}</div>
            ))}
            {phase === "boot" && lineCount < BOOT_LINES.length && (
              <span className="intro-cursor">█</span>
            )}
          </div>

          {phase === "ready" && (
            <div className="intro-cta">
              <button className="intro-btn" onClick={activate} autoFocus>
                <span className="bracket">[</span>
                JACK IN
                <span className="bracket">]</span>
              </button>
              <span className="intro-hint">PRESS ANY KEY</span>
            </div>
          )}
        </div>
      )}

      {/* Title reveal */}
      {phase === "activating" && titleText && (
        <div className="intro-reveal">
          <h1 className="intro-title" data-text={titleText}>{titleText}</h1>
          {showSubtitle && <p className="intro-sub">CHARACTER CREATION SYSTEM</p>}
        </div>
      )}
    </div>
  );
}
