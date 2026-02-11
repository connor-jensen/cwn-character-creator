import data from "./cities_without_number_data.json" with { type: "json" };

export const { edges, backgrounds, foci } = data;

// --- Dice Utilities ---

export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return total;
}

// --- Modifier Lookup ---

function scoreMod(score) {
  if (score <= 3) return -2;
  if (score <= 7) return -1;
  if (score <= 13) return 0;
  if (score <= 17) return 1;
  return 2;
}

// --- Character Factory ---

export function createCharacter() {
  return {
    name: "",
    level: 1,
    attributes: {
      strength: { score: 10, mod: 0 },
      dexterity: { score: 10, mod: 0 },
      constitution: { score: 10, mod: 0 },
      intelligence: { score: 10, mod: 0 },
      wisdom: { score: 10, mod: 0 },
      charisma: { score: 10, mod: 0 },
    },
    background: null,
    skills: {},
    edges: [],
    foci: [],
    contacts: [],
    hp: 0,
    bab: 0,
    savingThrows: { physical: 0, evasion: 0, mental: 0 },
    // House rule derived stats (computed in calculateDerivedStats)
    damageSoak: 0,
    initiative: 0,
    traumaTarget: 0,
    startingContactBonus: 0,
    inventory: [],
  };
}

// --- Attribute Logic ---

export function rollAttributes(char) {
  const attrs = Object.keys(char.attributes);
  for (const attr of attrs) {
    char.attributes[attr].score = rollDice(3, 6);
  }
  return updateModifiers(char);
}

export function updateModifiers(char) {
  for (const attr of Object.values(char.attributes)) {
    attr.mod = scoreMod(attr.score);
  }
  return char;
}

export function setStatToFourteen(char, statName) {
  const key = statName.toLowerCase();
  if (!char.attributes[key]) {
    throw new Error(`Unknown attribute: ${statName}`);
  }
  char.attributes[key].score = 14;
  return updateModifiers(char);
}

// --- Skill Logic ---

export function validateSkill(char, skillName) {
  const current = char.skills[skillName];
  if (current === undefined || current < 1) {
    return { valid: true, needsRedirect: false };
  }
  return { valid: false, needsRedirect: true };
}

export function addSkill(char, skillName) {
  const current = char.skills[skillName];
  if (current === undefined) {
    char.skills[skillName] = 0;
    return { char, needsRedirect: false };
  }
  if (current === 0) {
    char.skills[skillName] = 1;
    return { char, needsRedirect: false };
  }
  // Already at 1 — cap hit
  return { char, needsRedirect: true };
}

export function addBonusSkill(char, skillName) {
  const result = addSkill(char, skillName);
  if (result.needsRedirect) {
    throw new Error(
      `Skill "${skillName}" is already at Level 1. Choose a different skill.`
    );
  }
  return result.char;
}

// --- Edge Application ---

const COMBAT_SKILLS = ["Shoot", "Fight"];

export function applyEdge(char, edgeName) {
  const edge = edges.find((e) => e.name === edgeName);
  if (!edge) throw new Error(`Unknown edge: ${edgeName}`);

  char.edges.push(edgeName);
  const pending = [];

  switch (edgeName) {
    case "Educated":
      pending.push({ type: "pickSkill", category: "any" });
      break;
    case "Face": {
      const result = addSkill(char, "Connect");
      if (result.needsRedirect) {
        pending.push({
          type: "pickSkill",
          category: "any",
          reason: "Connect already at cap",
        });
      }
      break;
    }
    case "Focused":
      pending.push({ type: "pickFocus" });
      break;
    case "Ghost": {
      const result = addSkill(char, "Sneak");
      if (result.needsRedirect) {
        pending.push({
          type: "pickSkill",
          category: "any",
          reason: "Sneak already at cap",
        });
      }
      break;
    }
    case "Hacker": {
      const result = addSkill(char, "Program");
      if (result.needsRedirect) {
        pending.push({
          type: "pickSkill",
          category: "any",
          reason: "Program already at cap",
        });
      }
      break;
    }
    case "Killing Blow":
      pending.push({ type: "pickSkill", category: "combat" });
      break;
    case "On Target":
      pending.push({ type: "pickSkill", category: "combat" });
      break;
    case "Prodigy":
      pending.push({
        type: "pickAttribute",
        exclude: ["constitution"],
        setTo: 18,
      });
      break;
    case "Voice of the People":
      char.foci.push({ name: "Pop Idol", level: 2 });
      pending.push({
        type: "addContact",
        relationship: "Friend",
        context: "related to your art",
      });
      break;
    // Hard To Kill, Masterful Expertise, Operator's Fortune,
    // Veteran's Luck, Wired — passive or no creation-time effect
  }

  return { char, pending };
}

export function resolvePending(char, pendingItem, choice) {
  switch (pendingItem.type) {
    case "pickSkill": {
      if (pendingItem.category === "combat" && !COMBAT_SKILLS.includes(choice)) {
        throw new Error(
          `"${choice}" is not a combat skill. Choose from: ${COMBAT_SKILLS.join(", ")}`
        );
      }
      if (pendingItem.category === "non-combat" && COMBAT_SKILLS.includes(choice)) {
        throw new Error(
          `"${choice}" is a combat skill. Choose a non-combat skill.`
        );
      }
      if (pendingItem.options && !pendingItem.options.includes(choice)) {
        throw new Error(
          `"${choice}" is not a valid option. Choose from: ${pendingItem.options.join(", ")}`
        );
      }
      const result = addSkill(char, choice);
      if (result.needsRedirect) {
        throw new Error(
          `Skill "${choice}" already at cap. Choose a different skill.`
        );
      }
      break;
    }
    case "pickFocus": {
      if (char.foci.find((f) => f.name === choice)) {
        throw new Error(`Focus "${choice}" already selected.`);
      }
      char.foci.push({ name: choice, level: 1 });
      break;
    }
    case "pickAttribute": {
      const key = choice.toLowerCase();
      if (pendingItem.exclude && pendingItem.exclude.includes(key)) {
        throw new Error(`Cannot pick ${choice} for this effect.`);
      }
      if (!char.attributes[key]) {
        throw new Error(`Unknown attribute: ${choice}`);
      }
      char.attributes[key].score = pendingItem.setTo;
      updateModifiers(char);
      break;
    }
    case "addContact": {
      char.contacts.push({
        name: choice,
        relationship: pendingItem.relationship,
        description: pendingItem.context,
      });
      break;
    }
    default:
      throw new Error(`Unknown pending type: ${pendingItem.type}`);
  }
  return char;
}

// Keep backward-compatible alias
export const resolveEdgePending = resolvePending;

// --- Focus Application ---

function grantSkill(char, skillName, pending) {
  const result = addSkill(char, skillName);
  if (result.needsRedirect) {
    pending.push({
      type: "pickSkill",
      category: "any",
      reason: `${skillName} already at cap`,
    });
  }
}

export function applyFocus(char, focusName, level = 1) {
  const focus = foci.find((f) => f.name === focusName);
  if (!focus) throw new Error(`Unknown focus: ${focusName}`);

  if (char.foci.find((f) => f.name === focusName)) {
    throw new Error(`Focus "${focusName}" already selected.`);
  }

  char.foci.push({ name: focusName, level });
  const pending = [];

  switch (focusName) {
    case "Ace Driver":
      grantSkill(char, "Drive", pending);
      break;
    case "Alert":
      grantSkill(char, "Notice", pending);
      break;
    case "All Natural":
      pending.push({ type: "pickSkill", category: "any" });
      break;
    case "Armsmaster":
      grantSkill(char, "Fight", pending);
      break;
    case "Assassin":
      grantSkill(char, "Sneak", pending);
      break;
    case "Authority":
      grantSkill(char, "Talk", pending);
      break;
    case "Close Combatant":
      pending.push({ type: "pickSkill", category: "combat" });
      break;
    case "Cyberdoc":
      grantSkill(char, "Fix", pending);
      grantSkill(char, "Heal", pending);
      break;
    case "Deadeye":
      grantSkill(char, "Shoot", pending);
      break;
    case "Diplomat":
      grantSkill(char, "Talk", pending);
      break;
    case "Drone Pilot":
      grantSkill(char, "Drive", pending);
      grantSkill(char, "Fix", pending);
      break;
    case "Expert Programmer":
      grantSkill(char, "Program", pending);
      break;
    case "Healer":
      grantSkill(char, "Heal", pending);
      break;
    case "Henchkeeper":
      grantSkill(char, "Talk", pending);
      break;
    case "Many Faces":
      grantSkill(char, "Sneak", pending);
      break;
    case "Pop Idol":
      grantSkill(char, "Talk", pending);
      break;
    case "Roamer":
      grantSkill(char, "Exert", pending);
      grantSkill(char, "Drive", pending);
      break;
    case "Safe Haven":
      grantSkill(char, "Sneak", pending);
      break;
    case "Shocking Assault":
      grantSkill(char, "Fight", pending);
      break;
    case "Sniper\u2019s Eye":
      grantSkill(char, "Shoot", pending);
      break;
    case "Specialist":
      pending.push({ type: "pickSkill", category: "non-combat" });
      break;
    case "Tinker":
      grantSkill(char, "Fix", pending);
      break;
    case "Unarmed Combatant":
      grantSkill(char, "Fight", pending);
      break;
    case "Whirlwind Assault":
      grantSkill(char, "Fight", pending);
      break;
    // Unique Gift, Unregistered — no skill grants
  }

  return { char, pending };
}

// --- Background & Growth ---

export function applyBackground(char, bgName) {
  const bg = backgrounds.find(
    (b) => b.name.toLowerCase() === bgName.toLowerCase()
  );
  if (!bg) throw new Error(`Unknown background: ${bgName}`);

  char.background = bg.name;
  const pending = [];

  // Grant free skill
  const freeSkill = bg.free_skill.replace(/-0$/, "");
  if (freeSkill === "Any Combat") {
    pending.push({ type: "pickSkill", category: "combat" });
  } else {
    const result = addSkill(char, freeSkill);
    if (result.needsRedirect) {
      pending.push({
        type: "pickSkill",
        category: "any",
        reason: `${freeSkill} already at cap`,
      });
    }
  }

  return {
    char,
    pending,
    pendingChoices: {
      growth: bg.growth,
      learning: bg.learning,
      growthPicks: 1,
      learningPicks: 2,
    },
  };
}

const PHYSICAL_STATS = ["strength", "dexterity", "constitution"];
const MENTAL_STATS = ["intelligence", "wisdom", "charisma"];
const ALL_STATS = [...PHYSICAL_STATS, ...MENTAL_STATS];

export function resolveGrowthRoll(char, growthEntry, choices) {
  if (growthEntry.startsWith("+")) {
    // Attribute bonus
    const match = growthEntry.match(/^\+(\d)\s+(.+)$/);
    if (!match) throw new Error(`Cannot parse growth entry: ${growthEntry}`);
    const bonus = parseInt(match[1]);
    const category = match[2];

    if (bonus === 2 && choices && choices.split) {
      // Split +2 into two +1s
      const { stat1, stat2 } = choices.split;
      applyStatBonus(char, stat1, 1, category);
      applyStatBonus(char, stat2, 1, category);
    } else if (choices && choices.stat) {
      applyStatBonus(char, choices.stat, bonus, category);
    } else {
      throw new Error(
        `Growth entry "${growthEntry}" requires choices.stat or choices.split`
      );
    }
  } else {
    // Skill entry
    const skillName = choices && choices.skill ? choices.skill : growthEntry;
    const result = addSkill(char, skillName);
    if (result.needsRedirect) {
      throw new Error(
        `Skill "${skillName}" already at cap. Choose a different skill.`
      );
    }
  }
  return char;
}

function applyStatBonus(char, statName, bonus, category) {
  const key = statName.toLowerCase();
  if (!char.attributes[key]) {
    throw new Error(`Unknown attribute: ${statName}`);
  }

  // Validate stat belongs to category
  if (category === "Physical" && !PHYSICAL_STATS.includes(key)) {
    throw new Error(`${statName} is not a physical stat`);
  }
  if (category === "Mental" && !MENTAL_STATS.includes(key)) {
    throw new Error(`${statName} is not a mental stat`);
  }

  char.attributes[key].score = Math.min(
    18,
    char.attributes[key].score + bonus
  );
  updateModifiers(char);
}

export function resolveLearningPick(char, skillName) {
  const result = addSkill(char, skillName);
  if (result.needsRedirect) {
    throw new Error(
      `Skill "${skillName}" already at cap. Choose a different skill.`
    );
  }
  return result.char;
}

// --- Derived Combat Stats ---
//
// ========================== HOUSE RULES ==========================
//
// 1. STR → Damage Soak (positive only)
//    Subtract STR mod from incoming damage (min 0 soak).
//
// 2. WIS → Initiative (replaces DEX)
//    Use WIS mod for initiative instead of DEX.
//
// 3. CHA → Starting Contacts (positive AND negative)
//    CHA mod adjusts number/quality of starting contacts.
//
// 4. WIS → Trauma Target (positive AND negative, base 6)
//    Enemies must meet or beat this to inflict trauma on crits.
//    Higher = harder to trauma. Like AC for critical damage.
//
// =================================================================

export function calculateDerivedStats(char) {
  const strMod = char.attributes.strength.mod;
  const conMod = char.attributes.constitution.mod;
  const dexMod = char.attributes.dexterity.mod;
  const intMod = char.attributes.intelligence.mod;
  const wisMod = char.attributes.wisdom.mod;
  const chaMod = char.attributes.charisma.mod;

  const hasHardToKill = char.edges.includes("Hard To Kill");
  const hasOnTarget = char.edges.includes("On Target");

  // HP
  const hpRoll = hasHardToKill ? rollDice(1, 6) + 2 : rollDice(1, 6);
  char.hp = Math.max(1, hpRoll + conMod);

  // BAB
  char.bab = hasOnTarget ? char.level : Math.floor(char.level / 2);

  // Saving Throws (target numbers — lower is better)
  char.savingThrows.physical =
    16 - Math.max(strMod, conMod) - char.level;
  char.savingThrows.evasion =
    16 - Math.max(dexMod, intMod) - char.level;
  char.savingThrows.mental =
    16 - Math.max(wisMod, chaMod) - char.level;

  // HOUSE RULE: STR mod → damage soak (only positive applies)
  char.damageSoak = Math.max(0, strMod);

  // HOUSE RULE: WIS mod → initiative (replaces DEX)
  char.initiative = wisMod;

  // HOUSE RULE: WIS mod → trauma target (base 6, higher = better)
  char.traumaTarget = 6 + wisMod;

  // HOUSE RULE: CHA mod → starting contact adjustment
  char.startingContactBonus = chaMod;

  return char;
}

// --- Weapon & Armor ---

export function getWeaponHitBonus(char, skillName, statName) {
  const key = statName.toLowerCase();
  if (!char.attributes[key]) {
    throw new Error(`Unknown attribute: ${statName}`);
  }
  const statMod = char.attributes[key].mod;
  const skillLevel = char.skills[skillName];
  const skillBonus = skillLevel !== undefined ? skillLevel : -2;
  return char.bab + skillBonus + statMod;
}

const ARMOR_TABLE = {
  none: { melee: 10, ranged: 10 },
  light: { melee: 13, ranged: 12 },
  medium: { melee: 15, ranged: 13 },
  heavy: { melee: 17, ranged: 15 },
};

export function calculateAC(armorType, hasShield = false) {
  const key = armorType.toLowerCase();
  const base = ARMOR_TABLE[key];
  if (!base) throw new Error(`Unknown armor type: ${armorType}`);
  return {
    melee: base.melee + (hasShield ? 1 : 0),
    ranged: base.ranged + (hasShield ? 1 : 0),
  };
}

// --- Draft / Offer System ---

function sampleWithout(pool, excludeNames, count) {
  const available = pool.filter((item) => !excludeNames.includes(item.name));
  const result = [];
  const indices = new Set();
  const maxPicks = Math.min(count, available.length);
  while (result.length < maxPicks) {
    const idx = Math.floor(Math.random() * available.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      result.push(available[idx]);
    }
  }
  return result;
}

export function offerBackgrounds(char, count = 3) {
  const exclude = char.background ? [char.background] : [];
  return sampleWithout(backgrounds, exclude, count);
}

export function offerEdges(char, count = 3) {
  const exclude = char.edges.map((e) => (typeof e === "string" ? e : e.name));
  return sampleWithout(edges, exclude, count);
}

export function offerFoci(char, count = 3) {
  const exclude = char.foci.map((f) => f.name);
  return sampleWithout(foci, exclude, count);
}

