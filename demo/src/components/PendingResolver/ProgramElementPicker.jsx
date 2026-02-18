import { useState } from "react";
import { hacking } from "../../../../cwn-engine.js";
import ConfirmButton from "../ConfirmButton";

function lookupElement(name) {
  return (
    hacking.verbs.find((v) => v.name === name) ||
    hacking.subjects.find((s) => s.name === name)
  );
}

export default function ProgramElementPicker({ budget, options, char, suggestedStarters = [], onResolve }) {
  const [selected, setSelected] = useState([]);

  const remaining = budget - selected.length;
  const optionSet = new Set(options || []);

  const toggle = (name) => {
    if (selected.includes(name)) {
      setSelected(selected.filter((s) => s !== name));
    } else if (remaining > 0) {
      setSelected([...selected, name]);
    }
  };

  // Split options into verbs and subjects
  const optionVerbs = hacking.verbs.filter((v) => optionSet.has(v.name));
  const optionSubjects = hacking.subjects.filter((s) => optionSet.has(s.name));

  // Starter programs already on the character
  const starterPrograms = char?.programs || [];

  return (
    <div>
      {starterPrograms.length > 0 && (
        <>
          <div className="program-section-label">Starter Package</div>
          <div className="program-card-grid">
            {starterPrograms.map((p) => {
              const data = lookupElement(p.name);
              return (
                <div
                  key={p.name}
                  className={`program-card program-card-starter program-card-${p.elementType}`}
                >
                  <div className="program-card-header">
                    <span className="program-card-name">{p.name}</span>
                    <span className={`program-card-type program-card-type-${p.elementType}`}>
                      {p.elementType}
                    </span>
                  </div>
                  {data && (
                    <>
                      {data.targetsAllowed && (
                        <span className="program-card-targets">
                          {data.targetsAllowed.join(" / ")}
                          {data.selfTerminating ? " \u00b7 Self-terminating" : ""}
                        </span>
                      )}
                      {data.type && !data.targetsAllowed && (
                        <span className="program-card-targets">{data.type}</span>
                      )}
                      <p className="program-card-desc">{data.description}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {suggestedStarters.length > 0 && (
        <div className="program-suggestions">
          <span className="program-suggestions-label">Recommended starters:</span>
          {suggestedStarters.map((name) => (
            <span key={name} className="program-suggestion-tag">{name}</span>
          ))}
        </div>
      )}

      <p className="step-desc">
        Choose {budget} additional program elements ({remaining}/{budget} remaining):
      </p>
      <p className="program-cost-legend">
        <span className="program-verb-label">Verbs</span>
        <span className="program-subject-label">Subjects</span>
      </p>

      {optionVerbs.length > 0 && (
        <>
          <div className="program-section-label">Verbs</div>
          <div className="program-card-grid">
            {optionVerbs.map((v) => {
              const isSelected = selected.includes(v.name);
              const disabled = !isSelected && remaining <= 0;
              return (
                <button
                  key={v.name}
                  className={[
                    "program-card",
                    "program-card-verb",
                    isSelected && "program-card-selected",
                    disabled && "program-card-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={disabled}
                  onClick={() => toggle(v.name)}
                >
                  <div className="program-card-header">
                    <span className="program-card-name">{v.name}</span>
                    <span className="program-card-type program-card-type-verb">verb</span>
                  </div>
                  <span className="program-card-targets">
                    {v.targetsAllowed.join(" / ")}
                    {v.selfTerminating ? " \u00b7 Self-terminating" : ""}
                  </span>
                  <p className="program-card-desc">{v.description}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {optionSubjects.length > 0 && (
        <>
          <div className="program-section-label">Subjects</div>
          <div className="program-card-grid">
            {optionSubjects.map((s) => {
              const isSelected = selected.includes(s.name);
              const disabled = !isSelected && remaining <= 0;
              return (
                <button
                  key={s.name}
                  className={[
                    "program-card",
                    "program-card-subject",
                    isSelected && "program-card-selected",
                    disabled && "program-card-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={disabled}
                  onClick={() => toggle(s.name)}
                >
                  <div className="program-card-header">
                    <span className="program-card-name">{s.name}</span>
                    <span className="program-card-type program-card-type-subject">{s.type}</span>
                  </div>
                  <p className="program-card-desc">{s.description}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      <ConfirmButton
        isVisible={selected.length === budget}
        label={`Load ${selected.length} Program Elements`}
        onClick={() => onResolve(selected)}
      />
    </div>
  );
}
