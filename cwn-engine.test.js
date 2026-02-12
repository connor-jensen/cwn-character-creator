import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  rollAttributes,
  rollAttributesHighVariance,
  updateModifiers,
  setStatToFourteen,
  applyBackground,
  resolveGrowthRoll,
  resolveLearningPick,
  addBonusSkill,
  addSkill,
  validateSkill,
  calculateDerivedStats,
  getWeaponHitBonus,
  calculateAC,
  applyEdge,
  resolveEdgePending,
  resolvePending,
  applyFocus,
  offerBackgrounds,
  offerEdges,
  offerFoci,
  rollDice,
  STARTING_WEAPONS,
  STARTING_KNIFE,
  STARTING_ARMOR,
  equipStartingGear,
  SPECIALTY_ITEMS,
  getAvailableSpecialtyItems,
  equipSpecialtyItem,
  edges,
  backgrounds,
  foci,
  contactTables,
  generateContact,
  getContactAllotment,
  addGeneratedContact,
  cyberwarePackages,
} from "./cwn-engine.js";

// --- Data Loading ---

describe("Data loading", () => {
  it("loads edges from JSON", () => {
    assert.ok(Array.isArray(edges));
    assert.equal(edges.length, 13);
    assert.ok(edges[0].name);
  });

  it("loads backgrounds from JSON", () => {
    assert.ok(Array.isArray(backgrounds));
    assert.equal(backgrounds.length, 20);
    assert.ok(backgrounds[0].free_skill);
  });

  it("loads foci from JSON", () => {
    assert.ok(Array.isArray(foci));
    assert.equal(foci.length, 26);
    assert.ok(foci[0].level_1);
  });
});

// --- Character Factory ---

describe("createCharacter", () => {
  it("returns a valid character object", () => {
    const c = createCharacter();
    assert.equal(c.name, "");
    assert.equal(c.level, 1);
    assert.equal(c.hp, 0);
    assert.equal(c.bab, 0);
    assert.deepEqual(c.skills, {});
    assert.deepEqual(c.edges, []);
    assert.deepEqual(c.foci, []);
    assert.deepEqual(c.contacts, []);
    assert.deepEqual(c.inventory, []);
    assert.ok(c.attributes.strength);
    assert.ok(c.attributes.charisma);
  });

  it("has all six attributes with default scores", () => {
    const c = createCharacter();
    const attrs = Object.keys(c.attributes);
    assert.equal(attrs.length, 6);
    for (const attr of attrs) {
      assert.equal(c.attributes[attr].score, 10);
      assert.equal(c.attributes[attr].mod, 0);
    }
  });
});

// --- Dice ---

describe("rollDice", () => {
  it("returns a number within expected range", () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDice(3, 6);
      assert.ok(result >= 3 && result <= 18, `3d6 out of range: ${result}`);
    }
  });

  it("1d6 is between 1 and 6", () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDice(1, 6);
      assert.ok(result >= 1 && result <= 6);
    }
  });
});

// --- Attributes ---

describe("rollAttributes", () => {
  it("assigns scores between 3 and 18 for all attributes", () => {
    const c = rollAttributes(createCharacter());
    for (const attr of Object.values(c.attributes)) {
      assert.ok(attr.score >= 3 && attr.score <= 18);
    }
  });

  it("auto-updates modifiers", () => {
    const c = rollAttributes(createCharacter());
    for (const attr of Object.values(c.attributes)) {
      if (attr.score <= 3) assert.equal(attr.mod, -2);
      else if (attr.score <= 7) assert.equal(attr.mod, -1);
      else if (attr.score <= 13) assert.equal(attr.mod, 0);
      else if (attr.score <= 17) assert.equal(attr.mod, 1);
      else assert.equal(attr.mod, 2);
    }
  });
});

describe("rollAttributesHighVariance", () => {
  it("assigns scores between 2 and 18 for all attributes", () => {
    for (let i = 0; i < 100; i++) {
      const c = rollAttributesHighVariance(createCharacter());
      for (const attr of Object.values(c.attributes)) {
        assert.ok(
          attr.score >= 2 && attr.score <= 18,
          `Score out of range: ${attr.score}`
        );
      }
    }
  });

  it("auto-updates modifiers", () => {
    const c = rollAttributesHighVariance(createCharacter());
    for (const attr of Object.values(c.attributes)) {
      if (attr.score <= 3) assert.equal(attr.mod, -2);
      else if (attr.score <= 7) assert.equal(attr.mod, -1);
      else if (attr.score <= 13) assert.equal(attr.mod, 0);
      else if (attr.score <= 17) assert.equal(attr.mod, 1);
      else assert.equal(attr.mod, 2);
    }
  });

  it("never exceeds 18 after bonus rolls", () => {
    for (let i = 0; i < 200; i++) {
      const c = rollAttributesHighVariance(createCharacter());
      for (const attr of Object.values(c.attributes)) {
        assert.ok(attr.score <= 18, `Score exceeded 18: ${attr.score}`);
      }
    }
  });
});

describe("updateModifiers", () => {
  it("maps known scores to correct mods", () => {
    const c = createCharacter();
    const cases = [
      [3, -2],
      [4, -1],
      [7, -1],
      [8, 0],
      [10, 0],
      [13, 0],
      [14, 1],
      [17, 1],
      [18, 2],
    ];
    for (const [score, expectedMod] of cases) {
      c.attributes.strength.score = score;
      updateModifiers(c);
      assert.equal(
        c.attributes.strength.mod,
        expectedMod,
        `score ${score} should have mod ${expectedMod}`
      );
    }
  });
});

describe("setStatToFourteen", () => {
  it("sets the stat to 14 and updates mod to +1", () => {
    const c = createCharacter();
    setStatToFourteen(c, "strength");
    assert.equal(c.attributes.strength.score, 14);
    assert.equal(c.attributes.strength.mod, 1);
  });

  it("throws for unknown stat", () => {
    const c = createCharacter();
    assert.throws(() => setStatToFourteen(c, "luck"), /Unknown attribute/);
  });
});

// --- Skills ---

describe("addSkill", () => {
  it("adds a new skill at level 0", () => {
    const c = createCharacter();
    const result = addSkill(c, "Notice");
    assert.equal(result.needsRedirect, false);
    assert.equal(c.skills.Notice, 0);
  });

  it("increments skill from 0 to 1", () => {
    const c = createCharacter();
    addSkill(c, "Notice");
    const result = addSkill(c, "Notice");
    assert.equal(result.needsRedirect, false);
    assert.equal(c.skills.Notice, 1);
  });

  it("signals redirect when skill is already at 1", () => {
    const c = createCharacter();
    addSkill(c, "Notice");
    addSkill(c, "Notice");
    const result = addSkill(c, "Notice");
    assert.equal(result.needsRedirect, true);
    assert.equal(c.skills.Notice, 1); // unchanged
  });
});

describe("validateSkill", () => {
  it("returns valid for a new skill", () => {
    const c = createCharacter();
    assert.deepEqual(validateSkill(c, "Shoot"), {
      valid: true,
      needsRedirect: false,
    });
  });

  it("returns valid for a level 0 skill", () => {
    const c = createCharacter();
    c.skills.Shoot = 0;
    assert.deepEqual(validateSkill(c, "Shoot"), {
      valid: true,
      needsRedirect: false,
    });
  });

  it("returns needsRedirect for level 1 skill", () => {
    const c = createCharacter();
    c.skills.Shoot = 1;
    assert.deepEqual(validateSkill(c, "Shoot"), {
      valid: false,
      needsRedirect: true,
    });
  });
});

describe("addBonusSkill", () => {
  it("adds a new skill", () => {
    const c = createCharacter();
    addBonusSkill(c, "Fix");
    assert.equal(c.skills.Fix, 0);
  });

  it("throws if skill already at cap", () => {
    const c = createCharacter();
    c.skills.Fix = 1;
    assert.throws(() => addBonusSkill(c, "Fix"), /already at Level 1/);
  });
});

// --- Edge Application ---

describe("applyEdge", () => {
  it("adds edge to character", () => {
    const c = createCharacter();
    applyEdge(c, "Hard To Kill");
    assert.deepEqual(c.edges, ["Hard To Kill"]);
  });

  it("throws for unknown edge", () => {
    const c = createCharacter();
    assert.throws(() => applyEdge(c, "Made Up"), /Unknown edge/);
  });

  it("Educated returns a pickSkill pending", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Educated");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.equal(pending[0].category, "any");
  });

  it("Face auto-grants Connect", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Face");
    assert.equal(c.skills.Connect, 0);
    assert.equal(pending.length, 0);
  });

  it("Face redirects when Connect already at cap", () => {
    const c = createCharacter();
    c.skills.Connect = 1;
    const { pending } = applyEdge(c, "Face");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.ok(pending[0].reason.includes("Connect"));
  });

  it("Focused returns a pickFocus pending", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Focused");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickFocus");
  });

  it("Ghost auto-grants Sneak", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Ghost");
    assert.equal(c.skills.Sneak, 0);
    assert.equal(pending.length, 0);
  });

  it("Ghost redirects when Sneak at cap", () => {
    const c = createCharacter();
    c.skills.Sneak = 1;
    const { pending } = applyEdge(c, "Ghost");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
  });

  it("Hacker auto-grants Program", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Hacker");
    assert.equal(c.skills.Program, 0);
    assert.equal(pending.length, 0);
  });

  it("Killing Blow returns combat pickSkill", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Killing Blow");
    assert.equal(pending[0].type, "pickSkill");
    assert.equal(pending[0].category, "combat");
  });

  it("On Target returns combat pickSkill", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "On Target");
    assert.equal(pending[0].type, "pickSkill");
    assert.equal(pending[0].category, "combat");
  });

  it("Voice of the People auto-grants Pop Idol focus and requests contact", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Voice of the People");
    assert.deepEqual(c.foci, [{ name: "Pop Idol", level: 2 }]);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "addContact");
  });

  it("passive edges return no pending", () => {
    for (const name of [
      "Hard To Kill",
      "Masterful Expertise",
      "Operator\u2019s Fortune",
      "Veteran\u2019s Luck",
    ]) {
      const c = createCharacter();
      const { pending } = applyEdge(c, name);
      assert.equal(pending.length, 0, `${name} should have no pending`);
    }
  });

  it("Wired returns pickCyberwarePackage pending", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Wired");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickCyberwarePackage");
  });
});

describe("resolveEdgePending", () => {
  it("resolves pickSkill (any)", () => {
    const c = createCharacter();
    const item = { type: "pickSkill", category: "any" };
    resolveEdgePending(c, item, "Notice");
    assert.equal(c.skills.Notice, 0);
  });

  it("resolves pickSkill (combat) with valid skill", () => {
    const c = createCharacter();
    const item = { type: "pickSkill", category: "combat" };
    resolveEdgePending(c, item, "Shoot");
    assert.equal(c.skills.Shoot, 0);
  });

  it("rejects non-combat skill for combat pick", () => {
    const c = createCharacter();
    const item = { type: "pickSkill", category: "combat" };
    assert.throws(
      () => resolveEdgePending(c, item, "Talk"),
      /not a combat skill/
    );
  });

  it("rejects skill already at cap", () => {
    const c = createCharacter();
    c.skills.Shoot = 1;
    const item = { type: "pickSkill", category: "combat" };
    assert.throws(
      () => resolveEdgePending(c, item, "Shoot"),
      /already at cap/
    );
  });

  it("resolves pickFocus", () => {
    const c = createCharacter();
    const item = { type: "pickFocus" };
    resolveEdgePending(c, item, "Alert");
    assert.deepEqual(c.foci, [{ name: "Alert", level: 1 }]);
  });

  it("rejects duplicate focus", () => {
    const c = createCharacter();
    c.foci.push({ name: "Alert", level: 1 });
    const item = { type: "pickFocus" };
    assert.throws(
      () => resolveEdgePending(c, item, "Alert"),
      /already selected/
    );
  });

  it("resolves addContact", () => {
    const c = createCharacter();
    const item = {
      type: "addContact",
      relationship: "Friend",
      context: "related to your art",
    };
    resolveEdgePending(c, item, "DJ Spinz");
    assert.equal(c.contacts.length, 1);
    assert.equal(c.contacts[0].name, "DJ Spinz");
    assert.equal(c.contacts[0].relationship, "Friend");
  });

  it("resolves pickCyberwarePackage", () => {
    const c = createCharacter();
    const item = { type: "pickCyberwarePackage" };
    resolvePending(c, item, "Cutter");
    assert.equal(c.cyberwarePackage.name, "Cutter");
    assert.equal(c.cyberwarePackage.items.length, 2);
    assert.equal(c.cyberwarePackage.items[0].name, "Body Blades II");
  });

  it("throws for unknown cyberware package", () => {
    const c = createCharacter();
    const item = { type: "pickCyberwarePackage" };
    assert.throws(() => resolvePending(c, item, "Nonexistent"), /Unknown cyberware package/);
  });
});

// --- Focus Application ---

describe("applyFocus", () => {
  it("adds focus to character", () => {
    const c = createCharacter();
    applyFocus(c, "Alert");
    assert.deepEqual(c.foci, [{ name: "Alert", level: 1 }]);
  });

  it("throws for unknown focus", () => {
    const c = createCharacter();
    assert.throws(() => applyFocus(c, "Made Up"), /Unknown focus/);
  });

  it("throws for duplicate focus", () => {
    const c = createCharacter();
    applyFocus(c, "Alert");
    assert.throws(() => applyFocus(c, "Alert"), /already selected/);
  });

  it("auto-grants fixed skill (Ace Driver → Drive)", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Ace Driver");
    assert.equal(c.skills.Drive, 0);
    assert.equal(pending.length, 0);
  });

  it("redirects when auto-granted skill is at cap", () => {
    const c = createCharacter();
    c.skills.Drive = 1;
    const { pending } = applyFocus(c, "Ace Driver");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.ok(pending[0].reason.includes("Drive"));
  });

  it("grants two skills for Cyberdoc (Fix + Heal)", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Cyberdoc");
    assert.equal(c.skills.Fix, 0);
    assert.equal(c.skills.Heal, 0);
    assert.equal(pending.length, 0);
  });

  it("redirects both skills if both at cap (Cyberdoc)", () => {
    const c = createCharacter();
    c.skills.Fix = 1;
    c.skills.Heal = 1;
    const { pending } = applyFocus(c, "Cyberdoc");
    assert.equal(pending.length, 2);
    assert.ok(pending[0].reason.includes("Fix"));
    assert.ok(pending[1].reason.includes("Heal"));
  });

  it("grants two skills for Drone Pilot (Drive + Fix)", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Drone Pilot");
    assert.equal(c.skills.Drive, 0);
    assert.equal(c.skills.Fix, 0);
    assert.equal(pending.length, 0);
  });

  it("grants two skills for Roamer (Exert + Drive)", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Roamer");
    assert.equal(c.skills.Exert, 0);
    assert.equal(c.skills.Drive, 0);
    assert.equal(pending.length, 0);
  });

  it("All Natural returns pickSkill (any)", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "All Natural");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.equal(pending[0].category, "any");
  });

  it("Close Combatant returns pickSkill (combat)", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Close Combatant");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.equal(pending[0].category, "combat");
  });

  it("Shocking Assault auto-grants Fight", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Shocking Assault");
    assert.equal(c.skills.Fight, 0);
    assert.equal(pending.length, 0);
  });

  it("Whirlwind Assault auto-grants Fight", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Whirlwind Assault");
    assert.equal(c.skills.Fight, 0);
    assert.equal(pending.length, 0);
  });

  it("Specialist returns pickSkill (non-combat)", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Specialist");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].category, "non-combat");
  });

  it("Unique Gift and Unregistered have no pending", () => {
    for (const name of ["Unique Gift", "Unregistered"]) {
      const c = createCharacter();
      const { pending } = applyFocus(c, name);
      assert.equal(pending.length, 0, `${name} should have no pending`);
    }
  });
});

describe("resolvePending", () => {
  it("rejects combat skill for non-combat category", () => {
    const c = createCharacter();
    const item = { type: "pickSkill", category: "non-combat" };
    assert.throws(
      () => resolvePending(c, item, "Shoot"),
      /is a combat skill/
    );
  });

  it("accepts non-combat skill for non-combat category", () => {
    const c = createCharacter();
    const item = { type: "pickSkill", category: "non-combat" };
    resolvePending(c, item, "Notice");
    assert.equal(c.skills.Notice, 0);
  });

  it("rejects skill not in options list", () => {
    const c = createCharacter();
    const item = { type: "pickSkill", category: "any", options: ["Notice", "Talk"] };
    assert.throws(
      () => resolvePending(c, item, "Shoot"),
      /not a valid option/
    );
  });

  it("accepts skill in options list", () => {
    const c = createCharacter();
    const item = { type: "pickSkill", category: "any", options: ["Notice", "Talk"] };
    resolvePending(c, item, "Notice");
    assert.equal(c.skills.Notice, 0);
  });
});

// --- Background ---

describe("applyBackground", () => {
  it("sets background and grants free skill", () => {
    const c = createCharacter();
    const { char, pending, pendingChoices } = applyBackground(c, "Criminal");
    assert.equal(char.background, "Criminal");
    assert.equal(char.skills.Sneak, 0);
    assert.equal(pending.length, 0);
    assert.equal(pendingChoices.growthPicks, 1);
    assert.equal(pendingChoices.learningPicks, 2);
    assert.ok(pendingChoices.growth.length > 0);
    assert.ok(pendingChoices.learning.length > 0);
  });

  it("is case-insensitive", () => {
    const c = createCharacter();
    const { char } = applyBackground(c, "criminal");
    assert.equal(char.background, "Criminal");
  });

  it("throws for unknown background", () => {
    const c = createCharacter();
    assert.throws(() => applyBackground(c, "Wizard"), /Unknown background/);
  });

  it("returns combat pick pending for 'Any Combat' free skill backgrounds", () => {
    const c = createCharacter();
    const { pending } = applyBackground(c, "Corp Security");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.equal(pending[0].category, "combat");
  });

  it("redirects when free skill is already at cap", () => {
    const c = createCharacter();
    c.skills.Sneak = 1;
    const { pending } = applyBackground(c, "Criminal");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.equal(pending[0].category, "any");
    assert.ok(pending[0].reason.includes("Sneak"));
  });
});

// --- Growth Rolls ---

describe("resolveGrowthRoll", () => {
  it("applies +1 Any Stat", () => {
    const c = createCharacter();
    c.attributes.strength.score = 10;
    resolveGrowthRoll(c, "+1 Any Stat", { stat: "strength" });
    assert.equal(c.attributes.strength.score, 11);
  });

  it("applies +2 Physical to one stat", () => {
    const c = createCharacter();
    c.attributes.dexterity.score = 10;
    resolveGrowthRoll(c, "+2 Physical", { stat: "dexterity" });
    assert.equal(c.attributes.dexterity.score, 12);
  });

  it("rejects non-physical stat for +2 Physical", () => {
    const c = createCharacter();
    assert.throws(
      () => resolveGrowthRoll(c, "+2 Physical", { stat: "intelligence" }),
      /not a physical stat/
    );
  });

  it("splits +2 into two +1s", () => {
    const c = createCharacter();
    resolveGrowthRoll(c, "+2 Physical", {
      split: { stat1: "strength", stat2: "dexterity" },
    });
    assert.equal(c.attributes.strength.score, 11);
    assert.equal(c.attributes.dexterity.score, 11);
  });

  it("clamps stat at 18", () => {
    const c = createCharacter();
    c.attributes.strength.score = 17;
    resolveGrowthRoll(c, "+2 Physical", { stat: "strength" });
    assert.equal(c.attributes.strength.score, 18);
  });

  it("resolves a skill growth entry", () => {
    const c = createCharacter();
    resolveGrowthRoll(c, "Sneak", {});
    assert.equal(c.skills.Sneak, 0);
  });

  it("throws when skill already at cap", () => {
    const c = createCharacter();
    c.skills.Sneak = 1;
    assert.throws(() => resolveGrowthRoll(c, "Sneak", {}), /already at cap/);
  });
});

// --- Learning Picks ---

describe("resolveLearningPick", () => {
  it("adds a skill from learning table", () => {
    const c = createCharacter();
    resolveLearningPick(c, "Program");
    assert.equal(c.skills.Program, 0);
  });

  it("throws when skill at cap", () => {
    const c = createCharacter();
    c.skills.Program = 1;
    assert.throws(() => resolveLearningPick(c, "Program"), /already at cap/);
  });
});

// --- Derived Stats ---

describe("calculateDerivedStats", () => {
  it("sets HP >= 1", () => {
    const c = createCharacter();
    c.attributes.constitution.score = 3; // mod -2
    updateModifiers(c);
    calculateDerivedStats(c);
    assert.ok(c.hp >= 1, `HP should be >= 1, got ${c.hp}`);
  });

  it("BAB is 0 at level 1 by default", () => {
    const c = createCharacter();
    calculateDerivedStats(c);
    assert.equal(c.bab, 0);
  });

  it("BAB is 1 at level 1 with On Target", () => {
    const c = createCharacter();
    c.edges.push("On Target");
    calculateDerivedStats(c);
    assert.equal(c.bab, 1);
  });

  it("calculates saving throws correctly", () => {
    const c = createCharacter();
    // All mods 0 at score 10
    calculateDerivedStats(c);
    assert.equal(c.savingThrows.physical, 15); // 16 - 0 - 1
    assert.equal(c.savingThrows.evasion, 15);
    assert.equal(c.savingThrows.mental, 15);
  });

  it("saving throws reflect attribute mods", () => {
    const c = createCharacter();
    c.attributes.strength.score = 18; // mod +2
    updateModifiers(c);
    calculateDerivedStats(c);
    assert.equal(c.savingThrows.physical, 13); // 16 - 2 - 1
  });
});

// --- Weapon Hit Bonus ---

describe("getWeaponHitBonus", () => {
  it("calculates with trained skill", () => {
    const c = createCharacter();
    c.bab = 0;
    c.skills.Shoot = 1;
    c.attributes.dexterity.score = 14;
    updateModifiers(c);
    // BAB(0) + Skill(1) + Mod(1) = 2
    assert.equal(getWeaponHitBonus(c, "Shoot", "dexterity"), 2);
  });

  it("applies -2 penalty when untrained", () => {
    const c = createCharacter();
    c.bab = 0;
    c.attributes.dexterity.score = 10;
    updateModifiers(c);
    // BAB(0) + Untrained(-2) + Mod(0) = -2
    assert.equal(getWeaponHitBonus(c, "Shoot", "dexterity"), -2);
  });

  it("throws for unknown attribute", () => {
    const c = createCharacter();
    assert.throws(
      () => getWeaponHitBonus(c, "Shoot", "luck"),
      /Unknown attribute/
    );
  });
});

// --- Armor ---

describe("calculateAC", () => {
  it("returns correct AC for each armor type", () => {
    assert.deepEqual(calculateAC("none"), { melee: 10, ranged: 10 });
    assert.deepEqual(calculateAC("light"), { melee: 13, ranged: 12 });
    assert.deepEqual(calculateAC("medium"), { melee: 15, ranged: 13 });
    assert.deepEqual(calculateAC("heavy"), { melee: 17, ranged: 15 });
  });

  it("adds +1 for shield", () => {
    assert.deepEqual(calculateAC("light", true), { melee: 14, ranged: 13 });
  });

  it("is case-insensitive", () => {
    assert.deepEqual(calculateAC("Heavy"), { melee: 17, ranged: 15 });
  });

  it("throws for unknown armor", () => {
    assert.throws(() => calculateAC("power"), /Unknown armor type/);
  });
});

// --- Randomizers ---

// --- Draft / Offer System ---

describe("offerBackgrounds", () => {
  it("returns the requested number of choices", () => {
    const c = createCharacter();
    const offers = offerBackgrounds(c, 3);
    assert.equal(offers.length, 3);
  });

  it("returns unique entries", () => {
    const c = createCharacter();
    const offers = offerBackgrounds(c, 5);
    const names = offers.map((b) => b.name);
    assert.equal(new Set(names).size, names.length);
  });

  it("excludes the already-selected background", () => {
    const c = createCharacter();
    c.background = "Criminal";
    for (let i = 0; i < 50; i++) {
      const offers = offerBackgrounds(c, 3);
      assert.ok(
        !offers.find((b) => b.name === "Criminal"),
        "Should not offer already-selected background"
      );
    }
  });

  it("clamps to available pool size", () => {
    const c = createCharacter();
    const offers = offerBackgrounds(c, 100);
    assert.equal(offers.length, backgrounds.length);
  });
});

describe("offerEdges", () => {
  it("returns the requested number of choices", () => {
    const c = createCharacter();
    const offers = offerEdges(c, 3);
    assert.equal(offers.length, 3);
  });

  it("excludes already-selected edges", () => {
    const c = createCharacter();
    c.edges.push("Ghost", "Focused");
    for (let i = 0; i < 50; i++) {
      const offers = offerEdges(c, 3);
      for (const offer of offers) {
        assert.ok(
          offer.name !== "Ghost" && offer.name !== "Focused",
          `Should not offer ${offer.name}`
        );
      }
    }
  });

  it("returns unique entries", () => {
    const c = createCharacter();
    const offers = offerEdges(c, 5);
    const names = offers.map((e) => e.name);
    assert.equal(new Set(names).size, names.length);
  });
});

describe("offerFoci", () => {
  it("returns the requested number of choices", () => {
    const c = createCharacter();
    const offers = offerFoci(c, 3);
    assert.equal(offers.length, 3);
  });

  it("excludes already-selected foci", () => {
    const c = createCharacter();
    c.foci.push({ name: "Alert", level: 1 });
    for (let i = 0; i < 50; i++) {
      const offers = offerFoci(c, 3);
      assert.ok(
        !offers.find((f) => f.name === "Alert"),
        "Should not offer already-selected focus"
      );
    }
  });

  it("returns unique entries", () => {
    const c = createCharacter();
    const offers = offerFoci(c, 5);
    const names = offers.map((f) => f.name);
    assert.equal(new Set(names).size, names.length);
  });
});

// --- Starting Gear ---

describe("STARTING_WEAPONS", () => {
  it("has 2 weapons (knife is separate)", () => {
    assert.equal(STARTING_WEAPONS.length, 2);
  });

  it("each weapon has required fields", () => {
    for (const w of STARTING_WEAPONS) {
      assert.ok(w.name);
      assert.equal(w.category, "weapon");
      assert.ok(w.type);
      assert.ok(w.damage);
      assert.ok(w.attribute);
      assert.ok(w.range);
      assert.ok(w.enc !== undefined);
    }
  });
});

describe("STARTING_KNIFE", () => {
  it("is a knife with required fields", () => {
    assert.equal(STARTING_KNIFE.name, "Knife");
    assert.equal(STARTING_KNIFE.category, "weapon");
    assert.ok(STARTING_KNIFE.damage);
  });
});

describe("STARTING_ARMOR", () => {
  it("has 3 armor options", () => {
    assert.equal(STARTING_ARMOR.length, 3);
  });

  it("each armor has required fields", () => {
    for (const a of STARTING_ARMOR) {
      assert.ok(a.name);
      assert.equal(a.category, "armor");
      assert.ok(a.meleeAC !== undefined);
      assert.ok(a.rangedAC !== undefined);
      assert.ok(a.soak !== undefined);
      assert.ok(a.traumaMod !== undefined);
    }
  });
});

describe("equipStartingGear", () => {
  it("adds weapon, knife, and armor to inventory", () => {
    const c = createCharacter();
    equipStartingGear(c, "Light Pistol", "Padded Jacket");
    assert.equal(c.inventory.length, 3);
    assert.equal(c.inventory[0].name, "Light Pistol");
    assert.equal(c.inventory[0].category, "weapon");
    assert.equal(c.inventory[1].name, "Knife");
    assert.equal(c.inventory[1].category, "weapon");
    assert.equal(c.inventory[2].name, "Padded Jacket");
    assert.equal(c.inventory[2].category, "armor");
  });

  it("throws on unknown weapon name", () => {
    const c = createCharacter();
    assert.throws(
      () => equipStartingGear(c, "Plasma Cannon", "Padded Jacket"),
      /Unknown starting weapon/
    );
  });

  it("throws on unknown armor name", () => {
    const c = createCharacter();
    assert.throws(
      () => equipStartingGear(c, "Light Pistol", "Power Armor"),
      /Unknown starting armor/
    );
  });

  it("is idempotent — re-equip replaces, does not duplicate", () => {
    const c = createCharacter();
    equipStartingGear(c, "Light Pistol", "Padded Jacket");
    equipStartingGear(c, "Heavy Pistol", "Weave Vest");
    assert.equal(c.inventory.length, 3);
    assert.equal(c.inventory[0].name, "Heavy Pistol");
    assert.equal(c.inventory[1].name, "Knife");
    assert.equal(c.inventory[2].name, "Weave Vest");
  });

  it("does not mutate source constants", () => {
    const c = createCharacter();
    equipStartingGear(c, "Light Pistol", "Street Jacket");
    c.inventory[0].name = "MUTATED";
    assert.equal(STARTING_WEAPONS[0].name, "Light Pistol");
    assert.equal(STARTING_KNIFE.name, "Knife");
  });
});

// --- Contact Tables ---

describe("contactTables", () => {
  it("loads socialCircles with 6 entries", () => {
    assert.ok(Array.isArray(contactTables.socialCircles));
    assert.equal(contactTables.socialCircles.length, 6);
  });

  it("loads howWellKnown with 4 entries", () => {
    assert.ok(Array.isArray(contactTables.howWellKnown));
    assert.equal(contactTables.howWellKnown.length, 4);
  });

  it("loads howMet with 12 entries", () => {
    assert.ok(Array.isArray(contactTables.howMet));
    assert.equal(contactTables.howMet.length, 12);
  });

  it("loads lastInteraction with 8 entries", () => {
    assert.ok(Array.isArray(contactTables.lastInteraction));
    assert.equal(contactTables.lastInteraction.length, 8);
  });

  it("loads whatTheyGet with 10 entries", () => {
    assert.ok(Array.isArray(contactTables.whatTheyGet));
    assert.equal(contactTables.whatTheyGet.length, 10);
  });

  it("loads whatTheyCanDoForYou with 20 entries", () => {
    assert.ok(Array.isArray(contactTables.whatTheyCanDoForYou));
    assert.equal(contactTables.whatTheyCanDoForYou.length, 20);
  });
});

describe("generateContact", () => {
  it("returns 1 whatTheyCanDoForYou entry for acquaintance", () => {
    const c = generateContact("acquaintance");
    assert.equal(c.relationship, "acquaintance");
    assert.equal(c.whatTheyCanDoForYou.length, 1);
    assert.equal(c.rolls.whatTheyCanDoForYou.length, 1);
  });

  it("returns 2 whatTheyCanDoForYou entries for friend", () => {
    const c = generateContact("friend");
    assert.equal(c.relationship, "friend");
    assert.equal(c.whatTheyCanDoForYou.length, 2);
    assert.equal(c.rolls.whatTheyCanDoForYou.length, 2);
  });

  it("has all required fields", () => {
    const c = generateContact("friend");
    assert.equal(c.name, "");
    assert.ok(c.socialCircle);
    assert.ok(c.howWellKnown);
    assert.ok(c.howMet);
    assert.ok(c.lastInteraction);
    assert.ok(c.whatTheyGet);
    assert.ok(c.rolls.socialCircle);
    assert.ok(c.rolls.howWellKnown);
    assert.ok(c.rolls.howMet);
    assert.ok(c.rolls.lastInteraction);
    assert.ok(c.rolls.whatTheyGet);
  });

  it("produces roll values within valid ranges (50 runs)", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateContact("friend");
      assert.ok(c.rolls.socialCircle >= 1 && c.rolls.socialCircle <= 6);
      assert.ok(c.rolls.howWellKnown >= 1 && c.rolls.howWellKnown <= 4);
      assert.ok(c.rolls.howMet >= 1 && c.rolls.howMet <= 12);
      assert.ok(c.rolls.lastInteraction >= 1 && c.rolls.lastInteraction <= 8);
      assert.ok(c.rolls.whatTheyGet >= 1 && c.rolls.whatTheyGet <= 10);
      for (const r of c.rolls.whatTheyCanDoForYou) {
        assert.ok(r >= 1 && r <= 20, `d20 roll out of range: ${r}`);
      }
    }
  });
});

describe("getContactAllotment", () => {
  it("returns empty array for CHA mod -2", () => {
    assert.deepEqual(getContactAllotment(-2), []);
  });

  it("returns 1 acquaintance for CHA mod -1", () => {
    assert.deepEqual(getContactAllotment(-1), ["acquaintance"]);
  });

  it("returns 2 acquaintances or 1 friend for CHA mod 0", () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      const result = getContactAllotment(0);
      const key = result.join(",");
      seen.add(key);
      assert.ok(
        key === "acquaintance,acquaintance" || key === "friend",
        `Unexpected allotment for mod 0: ${key}`
      );
    }
    assert.equal(seen.size, 2, "Should see both outcomes for mod 0");
  });

  it("returns friend + acquaintance for CHA mod +1", () => {
    assert.deepEqual(getContactAllotment(1), ["friend", "acquaintance"]);
  });

  it("returns 2 friends for CHA mod +2", () => {
    assert.deepEqual(getContactAllotment(2), ["friend", "friend"]);
  });
});

describe("addGeneratedContact", () => {
  it("pushes contact to char.contacts", () => {
    const c = createCharacter();
    const contact = generateContact("friend");
    addGeneratedContact(c, contact);
    assert.equal(c.contacts.length, 1);
    assert.equal(c.contacts[0].relationship, "friend");
  });

  it("returns char for chaining", () => {
    const c = createCharacter();
    const contact = generateContact("acquaintance");
    const result = addGeneratedContact(c, contact);
    assert.equal(result, c);
  });
});

// --- Specialty Items ---

describe("SPECIALTY_ITEMS", () => {
  it("has 12 items", () => {
    assert.equal(SPECIALTY_ITEMS.length, 12);
  });

  it("each item has required fields", () => {
    for (const item of SPECIALTY_ITEMS) {
      assert.ok(item.name, "missing name");
      assert.ok(item.category, "missing category");
      assert.equal(item.specialty, true, `${item.name} missing specialty flag`);
      assert.ok(item.description, `${item.name} missing description`);
      assert.ok(item.stats && typeof item.stats === "object", `${item.name} missing stats`);
      assert.ok(item.prereqs, `${item.name} missing prereqs`);
      assert.ok(item.prereqs.attributes !== undefined, `${item.name} missing prereqs.attributes`);
      assert.ok(Array.isArray(item.prereqs.skills), `${item.name} prereqs.skills should be array`);
    }
  });

  it("uses valid attribute keys in prereqs", () => {
    const validAttrs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
    for (const item of SPECIALTY_ITEMS) {
      for (const attr of Object.keys(item.prereqs.attributes)) {
        assert.ok(validAttrs.includes(attr), `${item.name} has invalid prereq attr: ${attr}`);
      }
    }
  });
});

describe("getAvailableSpecialtyItems", () => {
  it("returns all items for a maxed-out character", () => {
    const c = createCharacter();
    for (const attr of Object.values(c.attributes)) {
      attr.score = 18;
    }
    updateModifiers(c);
    c.skills = { Fight: 1, Shoot: 1, Drive: 1, Program: 1, Heal: 1, Notice: 1 };
    const available = getAvailableSpecialtyItems(c);
    assert.equal(available.length, SPECIALTY_ITEMS.length);
  });

  it("returns empty for a character with all negative mods and no skills", () => {
    const c = createCharacter();
    for (const attr of Object.values(c.attributes)) {
      attr.score = 3;
    }
    updateModifiers(c);
    const available = getAvailableSpecialtyItems(c);
    assert.equal(available.length, 0);
  });

  it("filters by attribute prereqs", () => {
    const c = createCharacter();
    // All scores 10 → mod 0, all prereqs require mod >= 0 so attr alone won't exclude
    // But skill prereqs will — give all skills to isolate attribute filtering
    c.skills = { Fight: 1, Shoot: 1, Drive: 1, Program: 1, Heal: 1, Notice: 1 };
    const available = getAvailableSpecialtyItems(c);
    for (const item of available) {
      for (const [attr, reqMod] of Object.entries(item.prereqs.attributes)) {
        assert.ok(c.attributes[attr].mod >= reqMod, `${item.name} should not be available`);
      }
    }
    // All items require mod >= 0 and default mod is 0, so all should pass with skills present
    assert.equal(available.length, SPECIALTY_ITEMS.length);
  });

  it("filters by skill prereqs", () => {
    const c = createCharacter();
    // No skills at all, default mod 0
    const available = getAvailableSpecialtyItems(c);
    // Only items with empty skills prereqs should appear
    for (const item of available) {
      assert.equal(item.prereqs.skills.length, 0, `${item.name} has skill prereqs but char has none`);
    }
  });

  it("excludes items when attribute mod is negative", () => {
    const c = createCharacter();
    // Set all to 3 (mod -2) except intelligence
    for (const attr of Object.keys(c.attributes)) {
      c.attributes[attr].score = 3;
    }
    c.attributes.intelligence.score = 14; // mod +1
    updateModifiers(c);
    c.skills = { Heal: 0 };
    const available = getAvailableSpecialtyItems(c);
    // Kit, Cyberdoc requires int >= 0 and Heal — should be available
    assert.ok(available.find((i) => i.name === "Kit, Cyberdoc"));
    // Armored Clothing requires dex >= 0 — should NOT be available (dex mod is -2)
    assert.ok(!available.find((i) => i.name === "Armored Clothing"));
  });

  it("does not mutate char", () => {
    const c = createCharacter();
    c.skills = { Fight: 0 };
    const before = JSON.stringify(c);
    getAvailableSpecialtyItems(c);
    assert.equal(JSON.stringify(c), before);
  });
});

describe("equipSpecialtyItem", () => {
  it("adds item to inventory", () => {
    const c = createCharacter();
    c.skills = { Shoot: 0 };
    equipSpecialtyItem(c, "Rifle");
    assert.equal(c.inventory.length, 1);
    assert.equal(c.inventory[0].name, "Rifle");
    assert.equal(c.inventory[0].specialty, true);
  });

  it("throws on unknown item name", () => {
    const c = createCharacter();
    assert.throws(() => equipSpecialtyItem(c, "Plasma Sword"), /Unknown specialty item/);
  });

  it("throws when attribute prereqs not met", () => {
    const c = createCharacter();
    c.attributes.dexterity.score = 3;
    updateModifiers(c);
    c.skills = { Shoot: 0 };
    // Rifle requires dex mod >= 0, char has -2
    assert.throws(() => equipSpecialtyItem(c, "Rifle"), /Prerequisite not met/);
  });

  it("throws when skill prereqs not met", () => {
    const c = createCharacter();
    // Rifle requires Shoot skill
    assert.throws(() => equipSpecialtyItem(c, "Rifle"), /Prerequisite not met.*Shoot/);
  });

  it("is idempotent — replaces previous specialty item", () => {
    const c = createCharacter();
    c.skills = { Shoot: 0 };
    equipSpecialtyItem(c, "Rifle");
    equipSpecialtyItem(c, "Shotgun");
    const specialties = c.inventory.filter((i) => i.specialty);
    assert.equal(specialties.length, 1);
    assert.equal(specialties[0].name, "Shotgun");
  });

  it("preserves non-specialty items", () => {
    const c = createCharacter();
    equipStartingGear(c, "Light Pistol", "Padded Jacket");
    c.skills = { Shoot: 0 };
    equipSpecialtyItem(c, "Rifle");
    assert.equal(c.inventory.length, 4); // weapon + knife + armor + specialty
    assert.ok(c.inventory.find((i) => i.name === "Light Pistol"));
    assert.ok(c.inventory.find((i) => i.name === "Knife"));
    assert.ok(c.inventory.find((i) => i.name === "Padded Jacket"));
  });

  it("does not mutate SPECIALTY_ITEMS constant", () => {
    const c = createCharacter();
    c.skills = { Shoot: 0 };
    equipSpecialtyItem(c, "Rifle");
    c.inventory.find((i) => i.name === "Rifle").name = "MUTATED";
    assert.equal(SPECIALTY_ITEMS.find((i) => i.stats.damage === "1d10+2").name, "Rifle");
  });

  it("returns char for chaining", () => {
    const c = createCharacter();
    c.skills = { Shoot: 0 };
    const result = equipSpecialtyItem(c, "Rifle");
    assert.equal(result, c);
  });
});

describe("equipStartingGear preserves specialty items", () => {
  it("does not remove specialty items when re-equipping gear", () => {
    const c = createCharacter();
    c.skills = { Shoot: 0 };
    equipSpecialtyItem(c, "Rifle");
    equipStartingGear(c, "Light Pistol", "Padded Jacket");
    const specialty = c.inventory.find((i) => i.specialty);
    assert.ok(specialty, "specialty item should still be in inventory");
    assert.equal(specialty.name, "Rifle");
  });
});
