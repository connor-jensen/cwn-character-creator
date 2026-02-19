import { useState, useCallback } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { CharacterCreationProvider, useCharCreation } from "../../context/CharacterCreationContext.jsx";
import useBackgroundMusic from "../../hooks/useBackgroundMusic.js";
import Header from "../Header";
import IntroSequence from "../IntroSequence";
import "../App/App.css";

function RootLayoutInner() {
  const { step, devMode, handleDevReset } = useCharCreation();
  const [introComplete, setIntroComplete] = useState(() => {
    try { return sessionStorage.getItem("cwn-intro-seen") === "true"; }
    catch { return false; }
  });
  const { muted, toggleMute, startMusic } = useBackgroundMusic({ autoStart: introComplete });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const view = pathname === "/roster" ? "manager" : "creator";

  const handleNavigate = useCallback(
    (v) => {
      if (v === "manager") {
        navigate({ to: "/roster" });
      } else {
        navigate({ to: "/create" });
      }
    },
    [navigate],
  );

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    try { sessionStorage.setItem("cwn-intro-seen", "true"); }
    catch { /* noop */ }
  }, []);

  return (
    <div className="app">
      {!introComplete && (
        <IntroSequence onComplete={handleIntroComplete} startMusic={startMusic} />
      )}
      <Header
        step={step}
        devMode={devMode}
        view={view}
        onNavigate={handleNavigate}
        muted={muted}
        onToggleMute={toggleMute}
      />
      <Outlet />
      {devMode && (
        <div className="dev-overlay">
          <div className="dev-toolbar">
            <span className="dev-toolbar-label">DEV MODE</span>
            <button className="dev-reset-btn" onClick={handleDevReset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RootLayout() {
  return (
    <CharacterCreationProvider>
      <RootLayoutInner />
    </CharacterCreationProvider>
  );
}
