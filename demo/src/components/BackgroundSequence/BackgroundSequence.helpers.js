export const PHASE_ORDER = [
  "eliminate", "pick", "free_skill_resolve",
  "growth_roll", "growth_resolve", "growth_done",
  "learn1_roll", "learn1_resolve", "learn1_done",
  "learn2_roll", "learn2_resolve", "learn2_done",
  "confirm",
];

export function phaseAtLeast(phase, target) {
  return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);
}

export function getActiveRollType(phase) {
  if (["growth_roll", "growth_resolve", "growth_done"].includes(phase)) return "growth";
  if (["learn1_roll", "learn1_resolve", "learn1_done"].includes(phase)) return "learn1";
  if (["learn2_roll", "learn2_resolve", "learn2_done"].includes(phase)) return "learn2";
  return null;
}

export function getRollDisplayState(phase, rollPhase, rollKey, spinValue, dieLocked, highlightedRow, preRolls) {
  if (phase === rollPhase) {
    return { dieValue: spinValue, locked: dieLocked, highlight: highlightedRow, isStatic: false };
  }
  return {
    dieValue: preRolls[rollKey],
    locked: true,
    highlight: preRolls[rollKey] - 1,
    isStatic: true,
  };
}

export function getRollLabel(activeRollType) {
  if (activeRollType === "growth") return "Growth Roll";
  if (activeRollType === "learn1") return "Learning Roll (1/2)";
  if (activeRollType === "learn2") return "Learning Roll (2/2)";
  return "";
}

export function getRollDieType(activeRollType) {
  return activeRollType === "growth" ? "d6" : "d8";
}

export function computeHighlightSets(phase, growthDisplay, learn1Display, learn2Display) {
  const growthHighlights = new Set();
  if (phaseAtLeast(phase, "growth_roll") && growthDisplay.highlight >= 0) {
    growthHighlights.add(growthDisplay.highlight);
  }
  const learningHighlights = new Set();
  if (phaseAtLeast(phase, "learn1_roll") && learn1Display.highlight >= 0) {
    learningHighlights.add(learn1Display.highlight);
  }
  if (phaseAtLeast(phase, "learn2_roll") && learn2Display.highlight >= 0) {
    learningHighlights.add(learn2Display.highlight);
  }
  return { growthHighlights, learningHighlights };
}
