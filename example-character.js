import { writeFileSync } from "node:fs";
import {
  createCharacter,
  rollAttributes,
  setStatToFourteen,
  applyBackground,
  resolveGrowthRoll,
  resolveLearningPick,
  addBonusSkill,
  calculateDerivedStats,
  getRandomEdge,
  getRandomFocus,
  getWeaponHitBonus,
  calculateAC,
} from "./cwn-engine.js";

// 1. Create a fresh character
let char = createCharacter();
char.name = "Kai Nakamura";

// 2. Roll attributes
char = rollAttributes(char);

// 3. Bump one stat to 14 (player's choice)
setStatToFourteen(char, "dexterity");

// 4. Roll two random edges and pick them
const rolledEdges = getRandomEdge();
char.edges.push(rolledEdges[0].name, rolledEdges[1].name);

// 5. Roll a random focus
const rolledFocus = getRandomFocus();
char.foci.push({ name: rolledFocus.name, level: 1 });

// 6. Apply background — Criminal
const { pendingChoices } = applyBackground(char, "Criminal");
// Free skill: Sneak-0 (already applied)

// 7. Resolve 1 growth pick: "+2 Physical" split into STR+1 / CON+1
resolveGrowthRoll(char, pendingChoices.growth[2], {
  split: { stat1: "strength", stat2: "constitution" },
});

// 8. Resolve 2 learning picks from the Criminal learning table
resolveLearningPick(char, "Notice");
resolveLearningPick(char, "Connect");

// 9. Final bonus skill pick
addBonusSkill(char, "Talk");

// 10. Calculate derived stats (HP, BAB, saves)
calculateDerivedStats(char);

// 11. Add some starting gear
char.inventory.push(
  { name: "Light Pistol", damage: "1d6", range: "30/100m", mag: 12 },
  { name: "Knife", damage: "1d4", shock: "1/AC15" },
  { name: "Armored Undersuit", type: "light" }
);

// 12. Add a contact
char.contacts.push({
  name: "Razor",
  relationship: "Friend",
  description: "Old fence from the neighborhood",
});

// 13. Compute some combat info for reference
const ac = calculateAC("light");
const shootBonus = getWeaponHitBonus(char, "Shoot", "dexterity");
const fightBonus = getWeaponHitBonus(char, "Fight", "strength");

const output = {
  ...char,
  computed: {
    ac,
    weaponBonuses: {
      "Light Pistol (Shoot/Dex)": shootBonus,
      "Knife (Fight/Str, untrained)": fightBonus,
    },
  },
};

writeFileSync("example-character.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
