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
  onAllocate,
}) {
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

  if (resolveInfo.type === "growth_compound_stat") {
    return (
      <CompoundStatAllocator
        growthEntry={growthEntry}
        workingChar={workingChar}
        onAllocate={onAllocate}
      />
    );
  }

  /* growth_stat — parse "+N Category" */
  return (
    <StatAllocator
      growthEntry={growthEntry}
      workingChar={workingChar}
      onAllocate={onAllocate}
    />
  );
}

const PHYSICAL_STATS = ["strength", "dexterity", "constitution"];
const MENTAL_STATS = ["intelligence", "wisdom", "charisma"];

function CompoundStatAllocator({ growthEntry, workingChar, onAllocate }) {
  const [physicalStat, setPhysicalStat] = useState(null);
  const [mentalStat, setMentalStat] = useState(null);

  const handleConfirm = () => {
    onAllocate({ [physicalStat]: 1, [mentalStat]: 1 });
  };

  return (
    <>
      <p className="step-desc">
        Rolled: <strong className="growth-result">{growthEntry}</strong>
      </p>
      <div className="alloc-compound">
        <AllocGroup
          label="+1 Physical"
          stats={PHYSICAL_STATS}
          workingChar={workingChar}
          selected={physicalStat}
          onSelect={setPhysicalStat}
        />
        <AllocGroup
          label="+1 Mental"
          stats={MENTAL_STATS}
          workingChar={workingChar}
          selected={mentalStat}
          onSelect={setMentalStat}
        />
      </div>
      <button
        className="btn-action"
        disabled={!physicalStat || !mentalStat}
        onClick={handleConfirm}
      >
        <span className="btn-prompt">&gt;_</span> Apply
      </button>
    </>
  );
}

function AllocGroup({ label, stats, workingChar, selected, onSelect }) {
  return (
    <div className="alloc-group">
      <div className="alloc-group-label">{label}</div>
      <div className="alloc-grid">
        {stats.map((stat) => {
          const base = workingChar.attributes[stat].score;
          const isSelected = selected === stat;
          const atCap = base >= 18;
          return (
            <button
              key={stat}
              className={`alloc-row alloc-row-btn${isSelected ? " alloc-row-selected" : ""}`}
              disabled={atCap}
              onClick={() => onSelect(isSelected ? null : stat)}
            >
              <span className="alloc-stat-name">{stat.slice(0, 3).toUpperCase()}</span>
              <span className="alloc-stat-score">{base}</span>
              <span className={`alloc-added${isSelected ? " alloc-added-active" : ""}`}>
                {isSelected ? "+1" : "+0"}
              </span>
              {isSelected && (
                <span className="alloc-preview">&rarr; {base + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatAllocator({ growthEntry, workingChar, onAllocate }) {
  const match = growthEntry.match(/^\+(\d)\s+(.+)$/);
  if (!match) return null;
  const total = parseInt(match[1]);
  const category = match[2];
  const validStats =
    category === "Physical" ? ["strength", "dexterity", "constitution"] :
    category === "Mental" ? ["intelligence", "wisdom", "charisma"] :
    ATTR_NAMES;

  const [alloc, setAlloc] = useState(() =>
    Object.fromEntries(validStats.map((s) => [s, 0]))
  );

  const spent = Object.values(alloc).reduce((a, b) => a + b, 0);
  const remaining = total - spent;

  const increment = (stat) => {
    if (remaining <= 0) return;
    const newScore = workingChar.attributes[stat].score + alloc[stat] + 1;
    if (newScore > 18) return;
    setAlloc((prev) => ({ ...prev, [stat]: prev[stat] + 1 }));
  };

  const decrement = (stat) => {
    if (alloc[stat] <= 0) return;
    setAlloc((prev) => ({ ...prev, [stat]: prev[stat] - 1 }));
  };

  const handleConfirm = () => {
    const distribution = Object.fromEntries(
      Object.entries(alloc).filter(([, v]) => v > 0)
    );
    onAllocate(distribution);
  };

  return (
    <>
      <p className="step-desc">
        Rolled: <strong className="growth-result">{growthEntry}</strong>
        <span className="alloc-remaining">
          {remaining} point{remaining !== 1 ? "s" : ""} to spend
        </span>
      </p>
      <div className="alloc-grid">
        {validStats.map((stat) => {
          const base = workingChar.attributes[stat].score;
          const added = alloc[stat];
          const atCap = base + added >= 18;
          return (
            <div key={stat} className="alloc-row">
              <span className="alloc-stat-name">{stat.slice(0, 3).toUpperCase()}</span>
              <span className="alloc-stat-score">{base}</span>
              <button
                className="alloc-btn"
                disabled={added <= 0}
                onClick={() => decrement(stat)}
              >
                &minus;
              </button>
              <span className={`alloc-added${added > 0 ? " alloc-added-active" : ""}`}>
                +{added}
              </span>
              <button
                className="alloc-btn"
                disabled={remaining <= 0 || atCap}
                onClick={() => increment(stat)}
              >
                +
              </button>
              {added > 0 && (
                <span className="alloc-preview">&rarr; {base + added}</span>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="btn-action"
        disabled={remaining > 0}
        onClick={handleConfirm}
      >
        <span className="btn-prompt">&gt;_</span> Apply
      </button>
    </>
  );
}
