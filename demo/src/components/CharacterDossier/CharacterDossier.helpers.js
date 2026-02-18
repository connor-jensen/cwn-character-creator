const ATTR_ABBREV = {
  str: "strength", strength: "strength",
  dex: "dexterity", dexterity: "dexterity",
  con: "constitution", constitution: "constitution",
  int: "intelligence", intelligence: "intelligence",
  wis: "wisdom", wisdom: "wisdom",
  cha: "charisma", charisma: "charisma",
};

export function resolveAttrMod(char, attrStr) {
  if (!attrStr) return 0;
  const parts = attrStr.split("/").map((s) => s.trim().toLowerCase());
  const mods = parts.map((p) => {
    const full = ATTR_ABBREV[p];
    return full ? char.attributes[full].mod : 0;
  });
  return Math.max(...mods);
}

export function getWeaponSkill(item) {
  if (item.specialty) {
    const attr = (item.stats.attribute || "").toLowerCase();
    if (attr === "str") return "Fight";
    return "Shoot";
  }
  if (item.type === "Firearm") return "Shoot";
  return "Fight";
}

export function formatDamage(baseDmg, mod) {
  if (!baseDmg || baseDmg === "\u2014" || mod === 0) return baseDmg;
  const match = baseDmg.match(/^(.+?)([+-]\d+)$/);
  if (match) {
    const dice = match[1];
    const total = parseInt(match[2]) + mod;
    if (total === 0) return dice;
    return `${dice}${total > 0 ? "+" : ""}${total}`;
  }
  return `${baseDmg}${mod > 0 ? "+" : ""}${mod}`;
}

export function formatShock(baseShock, mod) {
  if (!baseShock || baseShock === "\u2014" || mod === 0) return baseShock;
  const match = baseShock.match(/^(\d+)(\/AC\s*\d+)$/);
  if (!match) return baseShock;
  return `${parseInt(match[1]) + mod}${match[2]}`;
}

export function normalizeWeapon(item, char) {
  let name, baseDamage, range, traumaDie, traumaMult, mag, baseShock, attrStr;

  if (item.specialty) {
    const s = item.stats;
    name = item.name;
    baseDamage = s.damage || "\u2014";
    range = s.range || "\u2014";
    baseShock = s.shock || "\u2014";
    mag = s.mag != null ? s.mag : "\u2014";
    attrStr = s.attribute || "";
    if (s.trauma) {
      const parts = s.trauma.split("/");
      traumaDie = parts[0] || "";
      traumaMult = parts[1] || "";
    } else {
      traumaDie = "";
      traumaMult = "";
    }
  } else {
    name = item.name;
    baseDamage = item.damage || "\u2014";
    range = item.range || "\u2014";
    baseShock = item.shock || "\u2014";
    mag = item.mag != null ? item.mag : "\u2014";
    attrStr = item.attribute || "";
    traumaDie = item.trauma_die || "";
    traumaMult = item.trauma_rating || "";
  }

  const attrMod = resolveAttrMod(char, attrStr);
  const skill = getWeaponSkill(item);
  const skillLevel = char.skills[skill] !== undefined ? char.skills[skill] : -2;
  const hit = char.bab + skillLevel + attrMod;

  return {
    name,
    hit,
    damage: formatDamage(baseDamage, attrMod),
    range,
    traumaDie,
    traumaMult,
    mag,
    shock: formatShock(baseShock, attrMod),
  };
}

export function fileHash(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) {
    h = ((h << 5) - h) + name.charCodeAt(i);
    h |= 0;
  }
  return String(Math.abs(h) % 10000).padStart(4, "0");
}

export function attrPercent(score) {
  return Math.max(0, Math.min(100, ((score - 3) / 15) * 100));
}

export function computeDefenses(char) {
  const dexMod = char.attributes.dexterity.mod;
  let meleeAC = 10;
  let rangedAC = 10;
  let armorSoak = 0;
  let traumaTarget = char.traumaTarget;

  for (const item of char.inventory) {
    if (item.category === "armor") {
      if (item.specialty) {
        if (item.stats.meleeAC) meleeAC = Math.max(meleeAC, item.stats.meleeAC);
        if (item.stats.rangedAC) rangedAC = Math.max(rangedAC, item.stats.rangedAC);
        if (item.stats.meleeACBonus) meleeAC += item.stats.meleeACBonus;
        if (item.stats.rangedACBonus) rangedAC += item.stats.rangedACBonus;
        if (item.stats.soak) armorSoak += item.stats.soak;
        if (item.stats.traumaTargetMod) traumaTarget += item.stats.traumaTargetMod;
      } else {
        if (item.meleeAC) meleeAC = Math.max(meleeAC, item.meleeAC);
        if (item.rangedAC) rangedAC = Math.max(rangedAC, item.rangedAC);
        if (item.soak) armorSoak += item.soak;
        if (item.traumaMod) traumaTarget += item.traumaMod;
      }
    }
  }

  meleeAC += dexMod;
  rangedAC += dexMod;
  const totalSoak = char.damageSoak + armorSoak;
  const armorName = char.inventory.filter((i) => i.category === "armor").map((a) => a.name).join(" + ") || "Unarmored";

  return { meleeAC, rangedAC, totalSoak, traumaTarget, armorName };
}

export function computeSystemStrain(char) {
  let used = char.cyberwarePackage?.totalSystemStrain || 0;
  for (const item of char.inventory) {
    if ((item.specialty || item.hackerGear) && item.category === "cyberware" && item.stats?.strain) {
      used += item.stats.strain;
    }
  }
  return { used, max: char.attributes.constitution.score };
}
