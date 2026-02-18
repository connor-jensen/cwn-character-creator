import { useState } from "react";
import { MENTAL_SKILLS, PHYSICAL_SKILLS } from "../../../../cwn-engine.js";

const ALL_PLUG_SKILLS = [...MENTAL_SKILLS, ...PHYSICAL_SKILLS];

function costOf(skill) {
  return PHYSICAL_SKILLS.includes(skill) ? 2 : 1;
}

export default function SkillplugPicker({ budget, onResolve }) {
  const [selected, setSelected] = useState([]);

  const spent = selected.reduce((sum, s) => sum + costOf(s), 0);
  const remaining = budget - spent;

  const toggle = (skill) => {
    if (selected.includes(skill)) {
      setSelected(selected.filter((s) => s !== skill));
    } else {
      if (remaining >= costOf(skill)) {
        setSelected([...selected, skill]);
      }
    }
  };

  return (
    <div>
      <p className="step-desc">
        Choose skillplugs for your Skillplug Jack II ({remaining}/{budget} pts remaining):
      </p>
      <p className="skillplug-cost-legend">
        <span className="skillplug-mental-label">Mental = 1pt</span>
        <span className="skillplug-physical-label">Physical = 2pt</span>
      </p>
      <div className="skillplug-grid">
        {ALL_PLUG_SKILLS.map((skill) => {
          const cost = costOf(skill);
          const isSelected = selected.includes(skill);
          const isPhysical = PHYSICAL_SKILLS.includes(skill);
          const disabled = !isSelected && remaining < cost;

          return (
            <button
              key={skill}
              className={[
                "skillplug-btn",
                isPhysical ? "skillplug-physical" : "skillplug-mental",
                isSelected && "skillplug-selected",
                disabled && "skillplug-disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onClick={() => toggle(skill)}
            >
              <span className="skillplug-name">{skill}</span>
              <span className="skillplug-cost">{cost}pt</span>
            </button>
          );
        })}
      </div>
      <div className="skillplug-actions">
        <button
          className="btn-action"
          disabled={selected.length === 0}
          onClick={() => onResolve(selected)}
        >
          {`Confirm ${selected.length} Skillplug${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
