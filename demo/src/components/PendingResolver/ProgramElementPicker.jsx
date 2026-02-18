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
  const [expanded, setExpanded] = useState(null);

  const remaining = budget - selected.length;
  const optionSet = new Set(options || []);

  const toggle = (name) => {
    if (selected.includes(name)) {
      setSelected(selected.filter((s) => s !== name));
    } else if (remaining > 0) {
      setSelected([...selected, name]);
    }
  };

  const optionVerbs = hacking.verbs.filter((v) => optionSet.has(v.name));
  const optionSubjects = hacking.subjects.filter((s) => optionSet.has(s.name));

  const starterPrograms = char?.programs || [];
  const starterVerbs = starterPrograms.filter((p) => p.elementType === "verb");
  const starterSubjects = starterPrograms.filter((p) => p.elementType === "subject");

  const suggestedSet = new Set(suggestedStarters);

  return (
    <div className="pep">
      {/* Loaded programs — compact chip display */}
      {starterPrograms.length > 0 && (
        <div className="pep-loaded">
          <div className="pep-loaded-header">
            <span className="pep-loaded-icon">&#9632;</span>
            <span className="pep-loaded-title">Loaded Programs</span>
            <span className="pep-loaded-count">{starterPrograms.length}</span>
          </div>
          <div className="pep-chip-row">
            {starterVerbs.map((p) => (
              <span key={p.name} className="pep-chip pep-chip-verb">{p.name}</span>
            ))}
            {starterSubjects.map((p) => (
              <span key={p.name} className="pep-chip pep-chip-subject">{p.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested starters callout */}
      {suggestedStarters.length > 0 && (
        <div className="pep-suggest">
          <span className="pep-suggest-beacon" />
          <div className="pep-suggest-content">
            <span className="pep-suggest-label">Recommended starters</span>
            <div className="pep-suggest-chips">
              {suggestedStarters.map((name) => {
                const data = lookupElement(name);
                const isVerb = data?.targetsAllowed;
                return (
                  <span
                    key={name}
                    className={`pep-suggest-chip ${isVerb ? "pep-suggest-chip-verb" : "pep-suggest-chip-subject"}`}
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Budget tracker — memory slots */}
      <div className="pep-budget">
        <div className="pep-budget-label">
          <span className="pep-budget-prompt">&gt;_</span>
          Load {budget} program{budget !== 1 ? "s" : ""} into deck memory
        </div>
        <div className="pep-slots">
          {Array.from({ length: budget }, (_, i) => {
            const pick = selected[i];
            const pickData = pick ? lookupElement(pick) : null;
            const isVerb = pickData?.targetsAllowed;
            return (
              <div
                key={i}
                className={[
                  "pep-slot",
                  pick && "pep-slot-filled",
                  pick && (isVerb ? "pep-slot-verb" : "pep-slot-subject"),
                ].filter(Boolean).join(" ")}
              >
                {pick ? (
                  <span className="pep-slot-name">{pick}</span>
                ) : (
                  <span className="pep-slot-empty">{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Verbs section */}
      {optionVerbs.length > 0 && (
        <div className="pep-section">
          <div className="pep-divider pep-divider-verb">
            <span className="pep-divider-label">Verbs</span>
            <span className="pep-divider-sub">actions your deck can execute</span>
          </div>
          <div className="pep-grid">
            {optionVerbs.map((v) => {
              const isSelected = selected.includes(v.name);
              const isSuggested = suggestedSet.has(v.name);
              const disabled = !isSelected && remaining <= 0;
              const isExpanded = expanded === v.name;
              return (
                <button
                  key={v.name}
                  className={[
                    "pep-card pep-card-verb",
                    isSelected && "pep-card-active",
                    disabled && "pep-card-disabled",
                    isSuggested && !isSelected && "pep-card-suggested",
                  ].filter(Boolean).join(" ")}
                  disabled={disabled}
                  onClick={() => toggle(v.name)}
                  onMouseEnter={() => setExpanded(v.name)}
                  onMouseLeave={() => setExpanded(null)}
                >
                  {isSelected && <span className="pep-card-check">&#10003;</span>}
                  {isSuggested && !isSelected && <span className="pep-card-star">&#9733;</span>}
                  <span className="pep-card-name">{v.name}</span>
                  <span className="pep-card-meta">
                    {v.targetsAllowed.join(" / ")}
                    {v.selfTerminating ? " \u00b7 self-term" : ""}
                    {" \u00b7 A:"}{v.accessCost}
                  </span>
                  <span className="pep-card-use">{v.use}</span>
                  <p className={`pep-card-desc ${isExpanded ? "pep-card-desc-show" : ""}`}>
                    {v.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subjects section */}
      {optionSubjects.length > 0 && (
        <div className="pep-section">
          <div className="pep-divider pep-divider-subject">
            <span className="pep-divider-label">Subjects</span>
            <span className="pep-divider-sub">targets your programs can affect</span>
          </div>
          <div className="pep-grid">
            {optionSubjects.map((s) => {
              const isSelected = selected.includes(s.name);
              const isSuggested = suggestedSet.has(s.name);
              const disabled = !isSelected && remaining <= 0;
              const isExpanded = expanded === s.name;
              return (
                <button
                  key={s.name}
                  className={[
                    "pep-card pep-card-subject",
                    isSelected && "pep-card-active",
                    disabled && "pep-card-disabled",
                    isSuggested && !isSelected && "pep-card-suggested",
                  ].filter(Boolean).join(" ")}
                  disabled={disabled}
                  onClick={() => toggle(s.name)}
                  onMouseEnter={() => setExpanded(s.name)}
                  onMouseLeave={() => setExpanded(null)}
                >
                  {isSelected && <span className="pep-card-check">&#10003;</span>}
                  {isSuggested && !isSelected && <span className="pep-card-star">&#9733;</span>}
                  <span className="pep-card-name">{s.name}</span>
                  <span className="pep-card-meta">{s.type}</span>
                  <span className="pep-card-use">{s.use}</span>
                  <p className={`pep-card-desc ${isExpanded ? "pep-card-desc-show" : ""}`}>
                    {s.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmButton
        isVisible={selected.length === budget}
        label={`Load ${selected.length} Program${selected.length !== 1 ? "s" : ""}`}
        onClick={() => onResolve(selected)}
      />
    </div>
  );
}
