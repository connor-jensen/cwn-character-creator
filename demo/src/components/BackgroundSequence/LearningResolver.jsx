import { COMBAT_SKILLS } from "../../constants.js";
import { getAvailableSkills } from "../../helpers/get-available-skills.js";
import ChoiceGrid from "../ChoiceGrid";

export default function LearningResolver({
  resolveInfo,
  workingChar,
  availableSkills,
  selectedChoice,
  onSelect,
}) {
  if (!resolveInfo) return null;

  if (resolveInfo.type === "learning_redirect") {
    return (
      <ChoiceGrid
        prompt={
          <p className="step-desc">
            Rolled <strong className="growth-result">{resolveInfo.original}</strong>{" "}
            but it&apos;s already at cap. Pick any other skill:
          </p>
        }
        items={availableSkills}
        selectedChoice={selectedChoice}
        onSelect={onSelect}
      />
    );
  }

  const skills =
    resolveInfo.type === "learning_combat"
      ? getAvailableSkills(workingChar, COMBAT_SKILLS)
      : availableSkills;

  return (
    <ChoiceGrid
      prompt={
        <p className="step-desc">
          Rolled:{" "}
          <strong className="growth-result">
            {resolveInfo.type === "learning_combat" ? "Any Combat" : "Any Skill"}
          </strong>{" "}
          &mdash; pick a skill:
        </p>
      }
      items={skills}
      selectedChoice={selectedChoice}
      onSelect={onSelect}
    />
  );
}
