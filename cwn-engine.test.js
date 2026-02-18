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
  MENTAL_SKILLS,
  PHYSICAL_SKILLS,
  hacking,
  equipHackerGear,
  getBonusProgramPending,
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
    assert.equal(backgrounds.length, 19);
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

  it("Hacker auto-grants Program, starter programs, and pick-2 pending", () => {
    const c = createCharacter();
    const { pending } = applyEdge(c, "Hacker");
    assert.equal(c.skills.Program, 0);
    // 6 starter programs auto-added
    assert.equal(c.programs.length, 6);
    const starterNames = c.programs.map((p) => p.name);
    assert.ok(starterNames.includes("Unlock"));
    assert.ok(starterNames.includes("Analyze"));
    assert.ok(starterNames.includes("Stun"));
    assert.ok(starterNames.includes("Glitch"));
    assert.ok(starterNames.includes("Avatar"));
    assert.ok(starterNames.includes("Machine"));
    // Pick-2 pending with options
    const prog = pending.find((p) => p.type === "pickProgramElements");
    assert.ok(prog);
    assert.equal(prog.budget, 2);
    assert.ok(Array.isArray(prog.options));
    assert.equal(prog.options.length, 16);
    // Hacker gear auto-equipped
    assert.ok(c.inventory.some((i) => i.name === "Cranial Jack" && i.hackerGear));
    assert.ok(c.inventory.some((i) => i.name === "Scrap Cyberdeck" && i.hackerGear));
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

  it("Roamer offers skill choice and grants Drive", () => {
    const c = createCharacter();
    const { pending } = applyFocus(c, "Roamer");
    assert.equal(c.skills.Drive, 0);
    // First pending is a choice between Exert, Notice, Know
    assert.ok(pending.length >= 1);
    assert.equal(pending[0].type, "pickSkill");
    assert.deepEqual(pending[0].options, ["Exert", "Notice", "Know"]);
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
  it("applies +1 Physical, +1 Mental compound entry", () => {
    const c = createCharacter();
    c.attributes.strength.score = 10;
    c.attributes.intelligence.score = 10;
    resolveGrowthRoll(c, "+1 Physical, +1 Mental", {
      physical: "strength",
      mental: "intelligence",
    });
    assert.equal(c.attributes.strength.score, 11);
    assert.equal(c.attributes.intelligence.score, 11);
  });

  it("rejects mental stat as physical in compound entry", () => {
    const c = createCharacter();
    assert.throws(
      () => resolveGrowthRoll(c, "+1 Physical, +1 Mental", {
        physical: "intelligence",
        mental: "wisdom",
      }),
      /not a physical stat/
    );
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
    }
  });
});

describe("getAvailableSpecialtyItems", () => {
  it("returns all items", () => {
    const available = getAvailableSpecialtyItems();
    assert.equal(available.length, SPECIALTY_ITEMS.length);
  });

  it("returns a copy, not the original array", () => {
    const available = getAvailableSpecialtyItems();
    assert.notEqual(available, SPECIALTY_ITEMS);
  });
});

describe("equipSpecialtyItem", () => {
  it("adds item to inventory", () => {
    const c = createCharacter();
    equipSpecialtyItem(c, "Rifle");
    assert.equal(c.inventory.length, 1);
    assert.equal(c.inventory[0].name, "Rifle");
    assert.equal(c.inventory[0].specialty, true);
  });

  it("throws on unknown item name", () => {
    const c = createCharacter();
    assert.throws(() => equipSpecialtyItem(c, "Plasma Sword"), /Unknown specialty item/);
  });

  it("is idempotent — replaces previous specialty item", () => {
    const c = createCharacter();
    equipSpecialtyItem(c, "Rifle");
    equipSpecialtyItem(c, "Shotgun");
    const specialties = c.inventory.filter((i) => i.specialty);
    assert.equal(specialties.length, 1);
    assert.equal(specialties[0].name, "Shotgun");
  });

  it("preserves non-specialty items", () => {
    const c = createCharacter();
    equipStartingGear(c, "Light Pistol", "Padded Jacket");
    equipSpecialtyItem(c, "Rifle");
    assert.equal(c.inventory.length, 4); // weapon + knife + armor + specialty
    assert.ok(c.inventory.find((i) => i.name === "Light Pistol"));
    assert.ok(c.inventory.find((i) => i.name === "Knife"));
    assert.ok(c.inventory.find((i) => i.name === "Padded Jacket"));
  });

  it("does not mutate SPECIALTY_ITEMS constant", () => {
    const c = createCharacter();
    equipSpecialtyItem(c, "Rifle");
    c.inventory.find((i) => i.name === "Rifle").name = "MUTATED";
    assert.equal(SPECIALTY_ITEMS.find((i) => i.stats.damage === "1d10+2").name, "Rifle");
  });

  it("returns char for chaining", () => {
    const c = createCharacter();
    const result = equipSpecialtyItem(c, "Rifle");
    assert.equal(result, c);
  });
});

describe("equipStartingGear preserves specialty items", () => {
  it("does not remove specialty items when re-equipping gear", () => {
    const c = createCharacter();
    equipSpecialtyItem(c, "Rifle");
    equipStartingGear(c, "Light Pistol", "Padded Jacket");
    const specialty = c.inventory.find((i) => i.specialty);
    assert.ok(specialty, "specialty item should still be in inventory");
    assert.equal(specialty.name, "Rifle");
  });
});

// --- Skill Category Constants ---

describe("MENTAL_SKILLS / PHYSICAL_SKILLS", () => {
  it("exports 7 mental and 5 physical skills", () => {
    assert.equal(MENTAL_SKILLS.length, 7);
    assert.equal(PHYSICAL_SKILLS.length, 5);
  });

  it("no overlap between categories", () => {
    for (const s of MENTAL_SKILLS) {
      assert.ok(!PHYSICAL_SKILLS.includes(s), `${s} in both lists`);
    }
  });
});

// --- resolvePending return shape ---

describe("resolvePending return shape", () => {
  it("returns { char, pending } for pickSkill", () => {
    const c = createCharacter();
    const result = resolvePending(c, { type: "pickSkill", category: "any" }, "Notice");
    assert.ok(result.char);
    assert.ok(Array.isArray(result.pending));
    assert.equal(result.pending.length, 0);
  });

  it("returns { char, pending } for pickFocus", () => {
    const c = createCharacter();
    const result = resolvePending(c, { type: "pickFocus" }, "Alert");
    assert.ok(result.char);
    assert.ok(Array.isArray(result.pending));
  });

  it("returns { char, pending } for addContact", () => {
    const c = createCharacter();
    const result = resolvePending(c, {
      type: "addContact",
      relationship: "Friend",
      context: "test",
    }, "DJ Spinz");
    assert.ok(result.char);
    assert.ok(Array.isArray(result.pending));
  });

  it("returns { char, pending } for pickAttribute", () => {
    const c = createCharacter();
    const result = resolvePending(c, { type: "pickAttribute", setTo: 14 }, "strength");
    assert.ok(result.char);
    assert.ok(Array.isArray(result.pending));
  });
});

// --- Skillplug Selection ---

describe("pickSkillplugs via resolvePending", () => {
  function makeTechieChar() {
    const c = createCharacter();
    resolvePending(c, { type: "pickCyberwarePackage" }, "Techie or Doc");
    return c;
  }

  it("Techie or Doc package chains a pickSkillplugs pending", () => {
    const c = createCharacter();
    const { pending } = resolvePending(c, { type: "pickCyberwarePackage" }, "Techie or Doc");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].type, "pickSkillplugs");
    assert.equal(pending[0].budget, 3);
  });

  it("Cutter package does NOT chain pickSkillplugs", () => {
    const c = createCharacter();
    const { pending } = resolvePending(c, { type: "pickCyberwarePackage" }, "Cutter");
    assert.equal(pending.length, 0);
  });

  it("adds skillplug items to cyberwarePackage", () => {
    const c = makeTechieChar();
    const item = { type: "pickSkillplugs", budget: 3 };
    resolvePending(c, item, ["Fix", "Know", "Talk"]);
    // 2 base items + 3 skillplugs = 5
    assert.equal(c.cyberwarePackage.items.length, 5);
    const plugs = c.cyberwarePackage.items.filter((i) => i.cost === 0 && i.name.endsWith("Skillplug"));
    assert.equal(plugs.length, 3);
    assert.equal(plugs[0].name, "Fix Skillplug");
    assert.equal(plugs[0].systemStrain, 0);
  });

  it("handles empty array (skip)", () => {
    const c = makeTechieChar();
    const item = { type: "pickSkillplugs", budget: 3 };
    resolvePending(c, item, []);
    // Original 2 items, no plugs added
    assert.equal(c.cyberwarePackage.items.length, 2);
  });

  it("throws on non-array choice", () => {
    const c = makeTechieChar();
    const item = { type: "pickSkillplugs", budget: 3 };
    assert.throws(() => resolvePending(c, item, "Fix"), /must be an array/);
  });

  it("throws on budget exceeded (3 physical = 6 > 3)", () => {
    const c = makeTechieChar();
    const item = { type: "pickSkillplugs", budget: 3 };
    assert.throws(
      () => resolvePending(c, item, ["Fight", "Shoot"]),
      /budget exceeded/i
    );
  });

  it("allows 1 physical + 1 mental within budget", () => {
    const c = makeTechieChar();
    const item = { type: "pickSkillplugs", budget: 3 };
    resolvePending(c, item, ["Drive", "Fix"]);
    // 2 base items + 2 skillplugs = 4
    assert.equal(c.cyberwarePackage.items.length, 4);
  });

  it("throws on invalid skill name", () => {
    const c = makeTechieChar();
    const item = { type: "pickSkillplugs", budget: 3 };
    assert.throws(
      () => resolvePending(c, item, ["Fly"]),
      /not a valid skillplug/
    );
  });
});

// --- Hacking Data ---

describe("Hacking data", () => {
  it("loads 12 subjects", () => {
    assert.ok(Array.isArray(hacking.subjects));
    assert.equal(hacking.subjects.length, 12);
  });

  it("loads 24 verbs", () => {
    assert.ok(Array.isArray(hacking.verbs));
    assert.equal(hacking.verbs.length, 24);
  });

  it("each subject has required fields", () => {
    for (const s of hacking.subjects) {
      assert.ok(s.name, "missing name");
      assert.ok(s.cost !== undefined, `${s.name} missing cost`);
      assert.ok(s.type, `${s.name} missing type`);
      assert.ok(s.description, `${s.name} missing description`);
    }
  });

  it("each verb has required fields", () => {
    for (const v of hacking.verbs) {
      assert.ok(v.name, "missing name");
      assert.ok(v.cost !== undefined, `${v.name} missing cost`);
      assert.ok(Array.isArray(v.targetsAllowed), `${v.name} missing targetsAllowed`);
      assert.ok(v.accessCost !== undefined, `${v.name} missing accessCost`);
      assert.ok(typeof v.selfTerminating === "boolean", `${v.name} missing selfTerminating`);
      assert.ok(v.description, `${v.name} missing description`);
    }
  });
});

// --- Hacker Edge Auto-Equip ---

describe("equipHackerGear", () => {
  it("adds Cranial Jack and Scrap Cyberdeck to inventory", () => {
    const c = createCharacter();
    equipHackerGear(c);
    assert.ok(c.inventory.find((i) => i.name === "Cranial Jack"));
    assert.ok(c.inventory.find((i) => i.name === "Scrap Cyberdeck"));
  });

  it("marks items as hackerGear and not specialty", () => {
    const c = createCharacter();
    equipHackerGear(c);
    for (const item of c.inventory) {
      assert.equal(item.hackerGear, true);
      assert.equal(item.specialty, false);
    }
  });

  it("hacker gear survives equipStartingGear", () => {
    const c = createCharacter();
    equipHackerGear(c);
    equipStartingGear(c, "Light Pistol", "Padded Jacket");
    assert.ok(c.inventory.find((i) => i.name === "Cranial Jack"), "Cranial Jack should survive");
    assert.ok(c.inventory.find((i) => i.name === "Scrap Cyberdeck"), "Deck should survive");
    assert.ok(c.inventory.find((i) => i.name === "Light Pistol"), "weapon should be added");
  });

  it("hacker gear survives equipSpecialtyItem", () => {
    const c = createCharacter();
    equipHackerGear(c);
    equipSpecialtyItem(c, "Rifle");
    assert.ok(c.inventory.find((i) => i.name === "Cranial Jack"), "Cranial Jack should survive");
    assert.ok(c.inventory.find((i) => i.name === "Scrap Cyberdeck"), "Deck should survive");
    assert.ok(c.inventory.find((i) => i.name === "Rifle"), "specialty should be added");
  });
});

// --- pickProgramElements ---

describe("pickProgramElements via resolvePending", () => {
  const OPTIONS = [
    "Blind", "Ghost", "Deactivate", "Sense", "Frisk", "Erase",
    "Lock", "Terminate", "Sabotage",
    "Camera", "Cyber", "Datafile", "Door", "Drone", "Turret", "Sensor",
  ];

  it("resolves valid 2-element selection from options", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2, options: OPTIONS };
    resolvePending(c, item, ["Blind", "Camera"]);
    assert.equal(c.programs.length, 2);
    assert.ok(c.programs.find((p) => p.name === "Blind" && p.elementType === "verb"));
    assert.ok(c.programs.find((p) => p.name === "Camera" && p.elementType === "subject"));
  });

  it("rejects wrong count", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2, options: OPTIONS };
    assert.throws(
      () => resolvePending(c, item, ["Blind"]),
      /exactly 2/
    );
  });

  it("rejects elements not in options list", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2, options: OPTIONS };
    assert.throws(
      () => resolvePending(c, item, ["Activate", "Camera"]),
      /not an available option/
    );
  });

  it("rejects invalid names", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2, options: OPTIONS };
    assert.throws(
      () => resolvePending(c, item, ["Blind", "FakeElement"]),
      /not an available option/
    );
  });

  it("rejects duplicates", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2, options: OPTIONS };
    assert.throws(
      () => resolvePending(c, item, ["Blind", "Blind"]),
      /Duplicate/
    );
  });

  it("rejects non-array choice", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2, options: OPTIONS };
    assert.throws(
      () => resolvePending(c, item, "Blind"),
      /must be an array/
    );
  });

  it("works without options (unconstrained)", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2 };
    resolvePending(c, item, ["Kill", "Avatar"]);
    assert.equal(c.programs.length, 2);
  });
});

// --- Hacking Derived Stats ---

describe("calculateDerivedStats hacking", () => {
  function makeHacker() {
    const c = createCharacter();
    c.edges.push("Hacker");
    c.skills.Program = 1;
    c.attributes.intelligence.score = 14; // mod +1
    updateModifiers(c);
    equipHackerGear(c);
    return c;
  }

  it("computes hacking stats for Hackers", () => {
    const c = makeHacker();
    calculateDerivedStats(c);
    assert.ok(c.hackingStats);
    // accessPool = INT mod(1) + Program(1) + bonusAccess(1) = 3
    assert.equal(c.hackingStats.accessPool, 3);
    // baseHackingBonus = INT mod(1) + Program(1) = 2
    assert.equal(c.hackingStats.baseHackingBonus, 2);
    // Has Cranial Jack, so no penalty
    assert.equal(c.hackingStats.interfacePenalty, 0);
    assert.equal(c.hackingStats.deckMemory, 8);
    assert.equal(c.hackingStats.deckShielding, 5);
    assert.equal(c.hackingStats.deckCPU, 2);
  });

  it("skips hacking stats for non-Hackers", () => {
    const c = createCharacter();
    calculateDerivedStats(c);
    assert.equal(c.hackingStats, null);
  });

  it("shows -1 interface penalty without Cranial Jack", () => {
    const c = makeHacker();
    // Remove Cranial Jack
    c.inventory = c.inventory.filter((i) => i.name !== "Cranial Jack");
    calculateDerivedStats(c);
    assert.equal(c.hackingStats.interfacePenalty, -1);
  });

  it("computes hacking stats for non-Hacker with Program-1 + cyberdeck", () => {
    const c = createCharacter();
    c.skills.Program = 1;
    c.attributes.intelligence.score = 14; // mod +1
    updateModifiers(c);
    // Add a cyberdeck (VR Crown specialty item)
    equipSpecialtyItem(c, "Scrap Cyberdeck + VR Crown");
    calculateDerivedStats(c);
    assert.ok(c.hackingStats, "should have hacking stats");
    // accessPool = INT mod(1) + Program(1) + bonusAccess(1) = 3
    assert.equal(c.hackingStats.accessPool, 3);
    assert.equal(c.hackingStats.baseHackingBonus, 2);
    // No Cranial Jack → -1 penalty
    assert.equal(c.hackingStats.interfacePenalty, -1);
    assert.equal(c.hackingStats.deckMemory, 8);
  });

  it("skips hacking stats for non-Hacker without cyberdeck even with Program skill", () => {
    const c = createCharacter();
    c.skills.Program = 1;
    calculateDerivedStats(c);
    assert.equal(c.hackingStats, null);
  });
});

// --- Bonus Program Pending ---

describe("getBonusProgramPending", () => {
  function makeEligible() {
    const c = createCharacter();
    c.skills.Program = 1;
    equipSpecialtyItem(c, "Scrap Cyberdeck + VR Crown");
    return c;
  }

  it("returns empty array without Program skill", () => {
    const c = createCharacter();
    equipSpecialtyItem(c, "Scrap Cyberdeck + VR Crown");
    assert.deepEqual(getBonusProgramPending(c), []);
  });

  it("returns empty array without cyberdeck", () => {
    const c = createCharacter();
    c.skills.Program = 1;
    assert.deepEqual(getBonusProgramPending(c), []);
  });

  it("returns budget 2 for Program-1 + cyberdeck", () => {
    const c = makeEligible();
    const result = getBonusProgramPending(c);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, "pickProgramElements");
    assert.equal(result[0].budget, 2);
    assert.equal(result[0].bonusPick, true);
  });

  it("returns budget 5 with Expert Programmer focus", () => {
    const c = makeEligible();
    c.foci.push({ name: "Expert Programmer", level: 1 });
    const result = getBonusProgramPending(c);
    assert.equal(result[0].budget, 5);
  });

  it("excludes existing programs from options", () => {
    const c = makeEligible();
    c.programs.push({ name: "Blind", elementType: "verb" });
    c.programs.push({ name: "Camera", elementType: "subject" });
    const result = getBonusProgramPending(c);
    assert.ok(!result[0].options.includes("Blind"));
    assert.ok(!result[0].options.includes("Camera"));
    // Others from the curated pool still present
    assert.ok(result[0].options.includes("Ghost"));
    assert.ok(result[0].options.includes("Drone"));
  });

  it("includes starter elements in options for non-Hacker characters", () => {
    const c = makeEligible();
    const result = getBonusProgramPending(c);
    assert.ok(result[0].options.includes("Unlock"));
    assert.ok(result[0].options.includes("Avatar"));
    assert.ok(result[0].options.includes("Blind"));
  });

  it("includes suggestedStarters for non-Hacker characters", () => {
    const c = makeEligible();
    const result = getBonusProgramPending(c);
    assert.ok(result[0].suggestedStarters.length > 0);
    assert.ok(result[0].suggestedStarters.includes("Unlock"));
    assert.ok(result[0].suggestedStarters.includes("Avatar"));
  });

  it("excludes starter elements from options for Hacker characters", () => {
    const c = makeEligible();
    c.edges.push("Hacker");
    const result = getBonusProgramPending(c);
    assert.ok(!result[0].options.includes("Unlock"));
    assert.ok(!result[0].options.includes("Avatar"));
    assert.deepEqual(result[0].suggestedStarters, []);
  });

  it("Hacker + Expert Programmer returns budget 5", () => {
    const c = makeEligible();
    c.edges.push("Hacker");
    c.foci.push({ name: "Expert Programmer", level: 1 });
    const result = getBonusProgramPending(c);
    assert.equal(result[0].budget, 5);
  });

  it("filters suggestedStarters to exclude already-owned programs", () => {
    const c = makeEligible();
    c.programs.push({ name: "Unlock", elementType: "verb" });
    c.programs.push({ name: "Analyze", elementType: "verb" });
    const result = getBonusProgramPending(c);
    assert.ok(!result[0].suggestedStarters.includes("Unlock"));
    assert.ok(!result[0].suggestedStarters.includes("Analyze"));
    assert.ok(result[0].suggestedStarters.includes("Stun"));
  });
});

// --- Bonus Pick Tagging ---

describe("resolvePending tags bonus picks", () => {
  it("adds bonusPick flag when pendingItem.bonusPick is true", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2, bonusPick: true };
    resolvePending(c, item, ["Unlock", "Avatar"]);
    assert.equal(c.programs.length, 2);
    assert.equal(c.programs[0].bonusPick, true);
    assert.equal(c.programs[1].bonusPick, true);
  });

  it("does not add bonusPick flag when not set", () => {
    const c = createCharacter();
    const item = { type: "pickProgramElements", budget: 2 };
    resolvePending(c, item, ["Unlock", "Avatar"]);
    assert.equal(c.programs[0].bonusPick, undefined);
    assert.equal(c.programs[1].bonusPick, undefined);
  });
});
