import { useState } from "react";
import { ATTR_NAMES } from "../../constants.js";
import ChoiceGrid from "../ChoiceGrid";

export default function GrowthResolver({
  resolveInfo,
  growthEntry,
  workingChar,
  availableSkills,
  selectedChoice,
  onSelect,
  onSplitApply,
}) {
  const [splitMode, setSplitMode] = useState(false);
  const [stat1, setStat1] = useState("");
  const [stat2, setStat2] = useState("");

  if (!resolveInfo) return null;

  if (resolveInfo.type === "growth_redirect") {
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

  if (resolveInfo.type === "growth_any_skill") {
    return (
      <ChoiceGrid
        prompt={
          <p className="step-desc">
            Rolled: <strong className="growth-result">Any Skill</strong> &mdash; pick one:
          </p>
        }
        items={availableSkills}
        selectedChoice={selectedChoice}
        onSelect={onSelect}
      />
    );
  }

  /* growth_stat — parse "+N Category" */
  const match = growthEntry.match(/^\+(\d)\s+(.+)$/);
  if (!match) return null;
  const bonus = parseInt(match[1]);
  const category = match[2];
  const validStats =
    category === "Physical" ? ["strength", "dexterity", "constitution"] :
    category === "Mental" ? ["intelligence", "wisdom", "charisma"] :
    ATTR_NAMES;

  const handleSplitToggle = () => {
    setSplitMode(!splitMode);
    onSelect(null);
  };

  const handleSplitApply = () => {
    onSplitApply(stat1, stat2);
  };

  return (
    <>
      <p className="step-desc">
        Rolled: <strong className="growth-result">{growthEntry}</strong>
      </p>
      {bonus === 2 && (
        <label className="bg-resolve-split-label">
          <input
            type="checkbox"
            checked={splitMode}
            onChange={handleSplitToggle}
          />
          Split into +1/+1
        </label>
      )}
      {splitMode ? (
        <div className="choices" style={{ alignItems: "flex-end" }}>
          <select value={stat1} onChange={(e) => setStat1(e.target.value)}>
            <option value="">Stat 1</option>
            {validStats.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={stat2} onChange={(e) => setStat2(e.target.value)}>
            <option value="">Stat 2</option>
            {validStats.filter((s) => s !== stat1).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            className="btn-action"
            disabled={!stat1 || !stat2}
            onClick={handleSplitApply}
          >
            Apply
          </button>
        </div>
      ) : (
        <ChoiceGrid
          items={validStats}
          selectedChoice={selectedChoice}
          onSelect={onSelect}
          renderSubText={(s) => workingChar.attributes[s].score}
        />
      )}
    </>
  );
}
