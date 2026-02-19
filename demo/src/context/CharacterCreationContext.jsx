/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useCallback } from "react";
import useCharacterCreation from "../components/App/useCharacterCreation.js";

const CharacterCreationContext = createContext(null);

export function CharacterCreationProvider({ children }) {
  // Step index — synced from the URL by CreatorView, defaults to 0 on /roster
  const [step, setStep] = useState(0);

  // navigateToStep is registered by CreatorView when it mounts;
  // defaults to no-op so the hook works even on /roster
  const navigateRef = useRef(() => {});

  const registerNavigate = useCallback((fn) => {
    navigateRef.current = fn;
  }, []);

  const navigateToStep = useCallback((stepName) => {
    navigateRef.current(stepName);
  }, []);

  const creation = useCharacterCreation({ step, navigateToStep });

  return (
    <CharacterCreationContext.Provider value={{ ...creation, registerNavigate, setStep }}>
      {children}
    </CharacterCreationContext.Provider>
  );
}

export function useCharCreation() {
  const ctx = useContext(CharacterCreationContext);
  if (!ctx) throw new Error("useCharCreation must be used within CharacterCreationProvider");
  return ctx;
}
