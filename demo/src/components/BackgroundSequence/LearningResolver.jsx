import { ALL_SKILLS, COMBAT_SKILLS } from "../../constants.js";
import { getAvailableSkills } from "../../helpers/get-available-skills.js";

export default function LearningResolver({
  resolveInfo,
  workingChar,
  availableSkills,
  selectedChoice,
  onSelect,
}) {
  if (!resolveInfo) return null;

  let prompt;
  let eligible;

  if (resolveInfo.type === "learning_redirect") {
    prompt = (
      <p className="step-desc">
        Rolled <strong className="growth-result">{resolveInfo.original}</strong>{" "}
        but it&apos;s already at cap. Pick any other skill:
      </p>
    );
    eligible = new Set(availableSkills);
  } else {
    const skills =
      resolveInfo.type === "learning_combat"
        ? getAvailableSkills(workingChar, COMBAT_SKILLS)
        : availableSkills;
    prompt = (
      <p className="step-desc">
        Rolled:{" "}
        <strong className="growth-result">
          {resolveInfo.type === "learning_combat" ? "Any Combat" : "Any Skill"}
        </strong>{" "}
        &mdash; pick a skill:
      </p>
    );
    eligible = new Set(skills);
  }

  return (
    <>
      {prompt}
      <div className="skill-pick-grid">
        {ALL_SKILLS.map((skill) => {
          const isEligible = eligible.has(skill);
          const isSelected = selectedChoice === skill;
          return (
            <button
              key={skill}
              className={`btn-choice${isSelected ? " btn-choice-selected" : ""}${!isEligible ? " btn-choice-disabled" : ""}`}
              disabled={!isEligible}
              onClick={() => onSelect(skill)}
            >
              {skill}
            </button>
          );
        })}
      </div>
    </>
  );
}
