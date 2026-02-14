import { rollDie } from "../../../../cwn-engine.js";
import { ROLL_STEP } from "../../constants.js";

export const ATTR_LABELS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export const ATTR_DESC = {
  strength: "Melee weapon attacks and damage. Bonus to damage soak \u2014 how much punishment you shrug off before it hurts.",
  dexterity: "Ranged weapons, finesse melee, and your armor class. Keeps you alive when bullets fly.",
  constitution: "Hit point totals and system strain capacity. Determines how much chrome and trauma your body can handle.",
  intelligence: "Hacking, technical skills, and program execution. Your edge in the digital layer of the city.",
  wisdom: "Initiative rolls and trauma target threshold. How fast you react, and how hard you are to break.",
  charisma: "Starting contact count and quality. Fuels the social skill rolls that move the city\u2019s power networks.",
};

export function scoreMod(score) {
  if (score <= 3) return -2;
  if (score <= 7) return -1;
  if (score <= 13) return 0;
  if (score <= 17) return 1;
  return 2;
}

export function fmtMod(m) { return m >= 0 ? `+${m}` : `${m}`; }

export const MAX_SCORE = 18;
export const BUMP_TARGET = 14;

// Standard timings (3 dice)
export const T_LOCK1 = ROLL_STEP + 500;
export const T_LOCK2 = T_LOCK1 + ROLL_STEP;
export const T_LOCK3 = T_LOCK2 + ROLL_STEP;
export const T_SETTLE = T_LOCK3 + ROLL_STEP;
export const T_NEXT = T_SETTLE + 500;

// High variance timings (2 dice)
export const T_HV_LOCK1 = ROLL_STEP + 500;
export const T_HV_LOCK2 = T_HV_LOCK1 + ROLL_STEP;
export const T_HV_SETTLE = T_HV_LOCK2 + ROLL_STEP;
export const T_HV_NEXT = T_HV_SETTLE + 500;

export function computeBonusRolls(mainRolls) {
  const scores = mainRolls.map((dice) => dice[0] + dice[1]);
  const bonuses = [];

  for (let i = 0; i < 3; i++) {
    if (scores.every((s) => s >= 18)) break;

    const attempts = [];
    let roll;
    do {
      roll = rollDie(6);
      attempts.push(roll);
    } while (scores[roll - 1] >= 18);

    scores[roll - 1] = Math.min(18, scores[roll - 1] + 1);
    bonuses.push({ attempts, finalRoll: roll, attrIdx: roll - 1 });
  }

  return { bonuses, finalScores: scores };
}

export function getRunningScore(rolls, attrIdx, locked) {
  const dice = rolls[attrIdx];
  let sum = 0;
  for (let i = 0; i < locked; i++) sum += dice[i];
  return sum;
}

export function getTotal(rolls, attrIdx, isHighVar, bonusData, appliedBonusCount) {
  const dice = rolls[attrIdx];
  let total = isHighVar ? dice[0] + dice[1] : dice[0] + dice[1] + dice[2];
  if (isHighVar && bonusData) {
    for (let j = 0; j < appliedBonusCount && j < bonusData.bonuses.length; j++) {
      if (bonusData.bonuses[j].attrIdx === attrIdx) {
        total = Math.min(18, total + 1);
      }
    }
  }
  return total;
}

export function getBonusCountForAttr(isHighVar, bonusData, appliedBonusCount, attrIdx) {
  if (!isHighVar || !bonusData) return 0;
  return bonusData.bonuses
    .slice(0, appliedBonusCount)
    .filter((b) => b.attrIdx === attrIdx).length;
}

export function getMeterColor(runningScore, locked) {
  if (locked === 0) return "var(--border)";
  if (runningScore >= 14) return "var(--green)";
  if (runningScore <= 7) return "var(--magenta)";
  return "var(--cyan)";
}
