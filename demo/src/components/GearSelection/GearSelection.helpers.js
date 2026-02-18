export function getSpecialtyStatPills(item) {
  const s = item.stats;
  const pills = [];
  // Weapon stats
  if (s.damage) pills.push(["DMG", s.damage]);
  if (s.shock) pills.push(["Shock", s.shock]);
  if (s.range) pills.push(["RNG", s.range]);
  if (s.mag) pills.push(["MAG", s.mag]);
  if (s.trauma) pills.push(["Trauma", s.trauma]);
  if (s.attribute) pills.push(["Attr", s.attribute]);
  // Armor stats
  if (s.meleeAC) pills.push(["Melee AC", s.meleeAC]);
  if (s.rangedAC) pills.push(["Ranged AC", s.rangedAC]);
  if (s.meleeACBonus) pills.push(["Melee AC", `+${s.meleeACBonus}`]);
  if (s.rangedACBonus) pills.push(["Ranged AC", `+${s.rangedACBonus}`]);
  if (s.soak) pills.push(["Soak", s.soak]);
  if (s.traumaTargetMod) pills.push(["Trauma Mod", `+${s.traumaTargetMod}`]);
  if (s.conceal) pills.push(["Conceal", s.conceal.charAt(0).toUpperCase() + s.conceal.slice(1), `gear-stat-conceal-${s.conceal}`]);
  // Cyberware
  if (s.strain !== undefined) pills.push(["Strain", s.strain]);
  if (s.concealment) pills.push(["Conceal", s.concealment]);
  // Hacking
  if (s.memory) pills.push(["MEM", s.memory]);
  if (s.shielding) pills.push(["Shield", s.shielding]);
  if (s.cpu) pills.push(["CPU", s.cpu]);
  if (s.bonusAccess) pills.push(["Access", `+${s.bonusAccess}`]);
  // Vehicle / drone
  if (s.hp) pills.push(["HP", s.hp]);
  if (s.ac) pills.push(["AC", s.ac]);
  if (s.speed !== undefined) pills.push(["Speed", s.speed]);
  if (s.move) pills.push(["Move", s.move]);
  if (s.traumaTarget) pills.push(["Trauma Tgt", s.traumaTarget]);
  if (s.crew) pills.push(["Crew", s.crew]);
  if (s.fittings !== undefined) pills.push(["Fittings", s.fittings]);
  // VR Crown
  if (s.vrCrown) pills.push(["VR Crown", s.vrCrown]);
  // Tech / generic
  if (s.effect) pills.push(["Effect", s.effect]);
  if (s.enc) pills.push(["ENC", s.enc]);
  if (s.special) pills.push(["Special", s.special]);
  return pills;
}
