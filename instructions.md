# Technical Specification: Cities Without Number Character Creation Engine

## 1. Objective
Create a headless JavaScript engine (`cwn-engine.js`) that manages the state and logic for creating a Level 1 character for the *Cities Without Number* TTRPG. This engine should focus entirely on data processing, calculations, and rule enforcement. 

**Note:** No UI/HTML/CSS should be produced. The logic must be testable via console and compatible with modern JS frameworks (React/Vue).

## 2. Data Ingestion
The engine must import and reference a JSON file (`cities_without_number_data.json`) containing the following structures:
- `edges`: Array of objects (name, description).
- `backgrounds`: Array of objects (name, description, free_skill, growth, learning).
- `foci`: Array of objects (name, description, level_1, level_2).

## 3. Character State Management
Maintain a central `character` object with the following schema:
```javascript
{
  name: "",
  level: 1,
  attributes: {
    strength: { score: 10, mod: 0 },
    dexterity: { score: 10, mod: 0 },
    constitution: { score: 10, mod: 0 },
    intelligence: { score: 10, mod: 0 },
    wisdom: { score: 10, mod: 0 },
    charisma: { score: 10, mod: 0 }
  },
  background: null,
  skills: {}, // e.g., { "Notice": 0, "Shoot": 1 }
  edges: [],
  foci: [],
  contacts: [], // Array of objects
  hp: 0,
  bab: 0,
  savingThrows: { physical: 0, evasion: 0, mental: 0 },
  inventory: []
}
```

## 4. Required Functions

### A. Attribute Logic
- `rollAttributes()`: Generates scores using 3d6 per stat.
- `updateModifiers()`: Re-calculates mods automatically whenever a score changes. 
  - (3: -2 | 4-7: -1 | 8-13: 0 | 14-17: +1 | 18: +2)
- `setStatToFourteen(statName)`: Allows the user to bump one chosen stat to 14.

### B. Background & Skill Rules
- `applyBackground(bgName)`: 
  1. Grants the `free_skill` at Level 0.
  2. Executes **one Growth roll** (or selection).
  3. Executes **two Learning rolls** (or selections).
- **Rule Enforcement (`validateSkill`):** No starting skill can exceed Level 1. 
  - If any effect would raise a skill to Level 2, the function must trigger a "Choose Any Other Skill" callback to grant that alternative skill at the next available level (0 or 1).
- `addBonusSkill(skillName)`: Adds one final free bonus skill pick (subject to the Level 1 cap).

### C. Attribute Growth Splits
- Provide logic for attribute bonuses gained during growth. If a `+2` bonus is rolled, allow it to be split into two `+1` increases for different stats, or a single `+2` for one stat (Max score 18).

### D. Derived Combat Stats
`calculateDerivedStats()` must be called whenever attributes, level, or edges change:
- **Hit Points (HP):** `1d6 + Con_Mod`. Minimum of 1.
  - If "Hard to Kill" edge exists: `(1d6 + 2) + Con_Mod`.
- **Base Attack Bonus (BAB):** 
  - Default: `Math.floor(level / 2)`.
  - If "On Target" edge exists: `level`.
- **Saving Throws (Target Numbers):**
  - Physical: `16 - Max(Str_Mod, Con_Mod) - level`
  - Evasion: `16 - Max(Dex_Mod, Int_Mod) - level`
  - Mental: `16 - Max(Wis_Mod, Cha_Mod) - level`

### E. Weapon & Armor Recording
- `getWeaponHitBonus(skillName, statName)`: Calculates total bonus: `BAB + Skill_Level + Stat_Mod`.
  - **Untrained Penalty:** If Skill Level is undefined/missing, apply a `-2` penalty to the total.
- `calculateAC(armorType)`: Returns AC based on armor profiles (Ranged/Melee/Balanced).

### F. Randomizers
- `getRandomEdge()`: Returns 2 random edges (1-14).
- `getRandomFocus()`: Returns 1 random focus (1-26).

## 5. Summary of Constraints
1. **Skill Cap:** All skills are capped at Level 1 during this creation process.
2. **BAB:** Level 1 characters start with BAB +0 normally, or +1 with "On Target".
3. **Stat Max:** No attribute score can exceed 18.
4. **Automation:** Modifiers and Saving Throws must update dynamically if a growth roll changes an attribute score.