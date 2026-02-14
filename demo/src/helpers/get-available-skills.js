import { ALL_SKILLS } from "../constants.js";

export function getAvailableSkills(char, skills = ALL_SKILLS) {
  return skills.filter((s) => char.skills[s] === undefined || char.skills[s] < 1);
}
