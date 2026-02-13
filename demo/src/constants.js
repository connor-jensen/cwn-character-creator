export const STEPS = [
  "roll_attributes",
  "pick_background",
  "pick_edge_1",
  "pick_edge_2",
  "pick_focus",
  "bonus_skill",
  "choose_gear",
  "generate_contacts",
  "done",
];

export const STEP_LABELS = [
  "ATTRIBUTES", "BACKGROUND", "EDGE 1", "EDGE 2", "FOCUS", "BONUS", "GEAR", "CONTACTS", "DONE",
];

export const ALL_SKILLS = [
  "Connect", "Drive", "Exert", "Fight", "Fix", "Heal",
  "Know", "Notice", "Program", "Shoot", "Sneak", "Talk",
];

export const COMBAT_SKILLS = ["Shoot", "Fight"];

export const ATTR_NAMES = [
  "strength", "dexterity", "constitution",
  "intelligence", "wisdom", "charisma",
];

// ms between each die lock — controls pacing of all roll animations app-wide
export const ROLL_STEP = 1000;
