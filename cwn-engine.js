import data from "./cities_without_number_data.json" with { type: "json" };

export const { edges, backgrounds, foci, contactTables, cyberwarePackages } = data;

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
    savingThrows: { physical: 0, evasion: 0, mental: 0, luck: 0 },
    // House rule derived stats (computed in calculateDerivedStats)
    damageSoak: 0,
    initiative: 0,
    traumaTarget: 0,
    startingContactBonus: 0,
    inventory: [],
    cyberwarePackage: null,
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

export function rollAttributesHighVariance(char) {
  const attrs = Object.keys(char.attributes);

  // Roll 1d6 + 1d12 for each attribute
  for (const attr of attrs) {
    char.attributes[attr].score = rollDie(6) + rollDie(12);
  }

  // Roll 3 bonus d6s: 1=STR, 2=DEX, 3=CON, 4=INT, 5=WIS, 6=CHA
  for (let i = 0; i < 3; i++) {
    const allMaxed = attrs.every((a) => char.attributes[a].score >= 18);
    if (allMaxed) break;

    let roll;
    do {
      roll = rollDie(6);
    } while (char.attributes[attrs[roll - 1]].score >= 18);

    char.attributes[attrs[roll - 1]].score = Math.min(
      18,
      char.attributes[attrs[roll - 1]].score + 1
    );
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

export const MENTAL_SKILLS = ["Connect", "Fix", "Heal", "Know", "Notice", "Program", "Talk"];
export const PHYSICAL_SKILLS = ["Drive", "Exert", "Fight", "Shoot", "Sneak"];
const SKILLPLUG_BUDGET = 3;

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
    case "Voice of the People":
      char.foci.push({ name: "Pop Idol", level: 2 });
      pending.push({
        type: "addContact",
        relationship: "Friend",
        context: "related to your art",
      });
      break;
    case "Wired":
      pending.push({ type: "pickCyberwarePackage" });
      break;
    // Hard To Kill, Masterful Expertise, Operator's Fortune,
    // Veteran's Luck — passive or no creation-time effect
  }

  return { char, pending };
}

export function resolvePending(char, pendingItem, choice) {
  const pending = [];

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
    case "pickCyberwarePackage": {
      const pkg = cyberwarePackages.find((p) => p.name === choice);
      if (!pkg) throw new Error(`Unknown cyberware package: ${choice}`);
      char.cyberwarePackage = {
        name: pkg.name,
        totalCost: pkg.totalCost,
        totalSystemStrain: pkg.totalSystemStrain,
        monthlyMaintenance: pkg.monthlyMaintenance,
        items: pkg.items.map((item) => ({ ...item })),
      };
      if (choice === "Techie or Doc") {
        pending.push({
          type: "pickSkillplugs",
          budget: SKILLPLUG_BUDGET,
          reason: "Choose Skillplugs",
        });
      }
      break;
    }
    case "pickSkillplugs": {
      if (!Array.isArray(choice)) {
        throw new Error("Skillplug selection must be an array of skill names.");
      }
      const allValid = [...MENTAL_SKILLS, ...PHYSICAL_SKILLS];
      let cost = 0;
      for (const skill of choice) {
        if (!allValid.includes(skill)) {
          throw new Error(`"${skill}" is not a valid skillplug skill.`);
        }
        cost += PHYSICAL_SKILLS.includes(skill) ? 2 : 1;
      }
      if (cost > pendingItem.budget) {
        throw new Error(
          `Skillplug budget exceeded: ${cost} > ${pendingItem.budget}.`
        );
      }
      for (const skill of choice) {
        char.cyberwarePackage.items.push({
          name: `${skill} Skillplug`,
          description: `Level-1 ${skill} skillplug`,
          cost: 0,
          systemStrain: 0,
        });
      }
      break;
    }
    default:
      throw new Error(`Unknown pending type: ${pendingItem.type}`);
  }
  return { char, pending };
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
      pending.push({ type: "pickSkill", category: "any", options: ["Talk", "Exert"] });
      break;
    case "Roamer":
      pending.push({ type: "pickSkill", category: "any", options: ["Exert", "Notice", "Know"] });
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
  if (growthEntry === "+1 Physical, +1 Mental") {
    // Compound: one physical +1 and one mental +1
    if (!choices || !choices.physical || !choices.mental) {
      throw new Error(
        `Growth entry "${growthEntry}" requires choices.physical and choices.mental`
      );
    }
    applyStatBonus(char, choices.physical, 1, "Physical");
    applyStatBonus(char, choices.mental, 1, "Mental");
  } else if (growthEntry.startsWith("+")) {
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
  char.savingThrows.luck = 16 - char.level;

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

// --- Starting Gear ---

export const STARTING_WEAPONS = [
  { name: "Light Pistol", category: "weapon", type: "Firearm", damage: "1d6", trauma_die: "1d8", trauma_rating: "x2", attribute: "Dexterity", range: "10/80", mag: 15, enc: 1, conceal: "subtle" },
  { name: "Heavy Pistol", category: "weapon", type: "Firearm", damage: "1d8", trauma_die: "1d6", trauma_rating: "x3", attribute: "Dexterity", range: "10/100", mag: 8, enc: 1, conceal: "subtle" },
];

export const STARTING_KNIFE = { name: "Knife", category: "weapon", type: "Melee/Thrown", damage: "1d4", shock: "1/AC 15", trauma_die: "1d6", trauma_rating: "x3", attribute: "Str/Dex", range: "10/20", enc: 1, conceal: "hideable" };

export const STARTING_ARMOR = [
  { name: "Padded Jacket", category: "armor", meleeAC: 13, rangedAC: 10, soak: 2, traumaMod: 0, conceal: "subtle" },
  { name: "Weave Vest", category: "armor", meleeAC: 10, rangedAC: 13, soak: 0, traumaMod: 0, conceal: "subtle" },
  { name: "Street Jacket", category: "armor", meleeAC: 12, rangedAC: 11, soak: 0, traumaMod: 0, conceal: "subtle" },
];

export const SPECIALTY_ITEMS = [
  {
    name: "Reinforced Longcoat", category: "armor", specialty: true,
    description: "Subtle plates and weaves disguised as fashion. Best for high-Dex operators who want to look normal.",
    stats: { rangedAC: 15, meleeAC: 13, soak: 5, traumaTargetMod: 1, enc: 1, conceal: "subtle" },
  },
  {
    name: "Impact Jacket", category: "armor", specialty: true,
    description: "Built to absorb the impact of various contact sports, extreme athletics, vehicle races, they function as armor but are not subtle.",
    stats: { rangedAC: 12, meleeAC: 14, soak: 8, traumaTargetMod: 1, enc: 1, conceal: "obvious" },
  },
  {
    name: "Rifle", category: "weapon", specialty: true,
    description: "The standard high-powered firearm. Essential for long-range combat experts.",
    stats: { damage: "1d10+2", range: "200/400", mag: 6, trauma: "1d8/x3", attribute: "Dex", enc: 2, conceal: "obvious" },
  },
  {
    name: "Shotgun", category: "weapon", specialty: true,
    description: "Brutal close-quarters power. Multiple dice make damage more consistent.",
    stats: { damage: "3d4", range: "10/30", mag: 2, trauma: "1d10/x3", attribute: "Dex", enc: 2, conceal: "obvious" },
  },
  {
    name: "Advanced Sword", category: "weapon", specialty: true,
    description: "A high-tech blade with monomolecular edges. Deals high shock damage even on a miss.",
    stats: { damage: "1d10", shock: "3/AC 15", trauma: "1d8/x3", attribute: "Str", enc: 1, conceal: "obvious" },
  },
  {
    name: "Advanced Bow", category: "weapon", specialty: true,
    description: "Silent and huge crit potential, but requires your move action to reload unless you have Shoot-1",
    stats: { damage: "1d8", range: "30/200", mag: 1, trauma: "1d8+1/x3", attribute: "Dex", enc: 2, conceal: "obvious" },
  },
  {
    name: "Cranial Jack", category: "cyberware", specialty: true,
    description: "Essential for professional hackers. Allows you to plug directly into the net and vehicles.",
    stats: { strain: 0.25, concealment: "Touch", effect: "Direct neural link to decks/hardware" },
  },
  {
    name: "Scrap Cyberdeck + VR Crown", category: "hacking", specialty: true,
    description: "A basic hacking rig plus a VR Crown for wireless net access. The crown lets you hack without a Cranial Jack, but at a -1 penalty to all hacking checks.",
    stats: { memory: 8, shielding: 5, cpu: 2, bonusAccess: 1, enc: 1, vrCrown: "-1 hacking without Cranial Jack" },
  },
  {
    name: "Goggles, IR", category: "tech", specialty: true,
    description: "See heat signatures through smoke or darkness.",
    stats: { effect: "Thermal vision up to 50m", enc: 1 },
  },
  {
    name: "Motorcycle", category: "vehicle", specialty: true,
    description: "A fast, nimble bike for the street.",
    stats: { hp: 10, ac: 13, speed: 1, traumaTarget: 10, crew: 1, size: "S" },
  },
  {
    name: "BanTech Roach Drone", category: "drone", specialty: true,
    description: "Small wheeled drone for remote scouting.",
    stats: { hp: 8, ac: 13, move: "10m ground", fittings: 3, hardpoints: 0, enc: 3 },
  },
  {
    name: "Kit, Cyberdoc", category: "tech", specialty: true,
    description: "Specialized medical kit for repairing your team's chrome.",
    stats: { effect: "Maintenance/repair of cyberware", enc: 2 },
  },
];

export function getAvailableSpecialtyItems() {
  return [...SPECIALTY_ITEMS];
}

export function equipSpecialtyItem(char, itemName) {
  const item = SPECIALTY_ITEMS.find((i) => i.name === itemName);
  if (!item) throw new Error(`Unknown specialty item: ${itemName}`);

  // Idempotent: clear previous specialty item
  char.inventory = char.inventory.filter((i) => !i.specialty);
  char.inventory.push({ ...item });
  return char;
}

export function equipStartingGear(char, weaponName, armorName) {
  const weapon = STARTING_WEAPONS.find((w) => w.name === weaponName);
  if (!weapon) throw new Error(`Unknown starting weapon: ${weaponName}`);
  const armor = STARTING_ARMOR.find((a) => a.name === armorName);
  if (!armor) throw new Error(`Unknown starting armor: ${armorName}`);

  // Idempotent: clear any existing weapon/armor, but preserve specialty items
  char.inventory = char.inventory.filter(
    (item) => item.specialty || (item.category !== "weapon" && item.category !== "armor")
  );

  char.inventory.push({ ...weapon }, { ...STARTING_KNIFE }, { ...armor });
  return char;
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

// --- Contact Generation ---

export function generateContact(relationship) {
  const ct = contactTables;
  const socialCircleRoll = rollDie(6);
  const howWellKnownRoll = rollDie(4);
  const howMetRoll = rollDie(12);
  const lastInteractionRoll = rollDie(8);
  const whatTheyGetRoll = rollDie(10);

  const doCount = relationship === "friend" ? 2 : 1;
  const whatTheyCanDoForYouRolls = [];
  for (let i = 0; i < doCount; i++) {
    whatTheyCanDoForYouRolls.push(rollDie(20));
  }

  return {
    name: "",
    relationship,
    socialCircle: ct.socialCircles[socialCircleRoll - 1],
    howWellKnown: ct.howWellKnown[howWellKnownRoll - 1],
    howMet: ct.howMet[howMetRoll - 1],
    lastInteraction: ct.lastInteraction[lastInteractionRoll - 1],
    whatTheyGet: ct.whatTheyGet[whatTheyGetRoll - 1],
    whatTheyCanDoForYou: whatTheyCanDoForYouRolls.map((r) => ct.whatTheyCanDoForYou[r - 1]),
    rolls: {
      socialCircle: socialCircleRoll,
      howWellKnown: howWellKnownRoll,
      howMet: howMetRoll,
      lastInteraction: lastInteractionRoll,
      whatTheyGet: whatTheyGetRoll,
      whatTheyCanDoForYou: whatTheyCanDoForYouRolls,
    },
  };
}

export function getContactAllotment(chaMod) {
  switch (chaMod) {
    case -2: return [];
    case -1: return ["acquaintance"];
    case 0: return Math.random() < 0.5
      ? ["acquaintance", "acquaintance"]
      : ["friend"];
    case 1: return ["friend", "acquaintance"];
    case 2: return ["friend", "friend"];
    default: return [];
  }
}

export function addGeneratedContact(char, contact) {
  char.contacts.push(contact);
  return char;
}

