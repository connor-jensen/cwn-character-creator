import {
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
} from "../../../../cwn-engine.js";
import { ATTR_NAMES, STEPS } from "../../constants.js";

function ReviewAttributes({ char }) {
  return (
    <div className="step-review-section">
      <div className="attr-grid">
        {ATTR_NAMES.map((a) => (
          <div key={a} className="attr-row">
            <span className="attr-name">{a.slice(0, 3).toUpperCase()}</span>
            <span className="attr-score">{char.attributes[a].score}</span>
            <span
              className={`attr-mod ${char.attributes[a].mod > 0 ? "positive" : char.attributes[a].mod < 0 ? "negative" : "neutral"}`}
            >
              {char.attributes[a].mod >= 0 ? "+" : ""}
              {char.attributes[a].mod}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewBackground({ char }) {
  const bgObj = char.background && allBackgrounds.find((b) => b.name === char.background);
  if (!bgObj) return <p className="step-review-empty">No background selected.</p>;
  return (
    <div className="step-review-section">
      <span className="sheet-bg-tag">{bgObj.name}</span>
      <p className="step-review-detail">{bgObj.description}</p>
      {bgObj.free_skill && (
        <p className="step-review-meta">Free skill: {bgObj.free_skill.replace(/-0$/, "")}</p>
      )}
    </div>
  );
}

function ReviewEdge({ char, edgeIndex }) {
  const edgeName = char.edges[edgeIndex];
  if (!edgeName) return <p className="step-review-empty">No edge selected.</p>;
  const edgeObj = allEdges.find((e) => e.name === edgeName);
  return (
    <div className="step-review-section">
      <h3 className="step-review-name">{edgeName}</h3>
      {edgeObj && <p className="step-review-detail">{edgeObj.description}</p>}
    </div>
  );
}

function ReviewFocus({ char }) {
  const focus = char.foci[0];
  if (!focus) return <p className="step-review-empty">No focus selected.</p>;
  const focusObj = allFoci.find((f) => f.name === focus.name);
  return (
    <div className="step-review-section">
      <h3 className="step-review-name">
        {focus.name} <span style={{ color: "var(--amber)" }}>L{focus.level}</span>
      </h3>
      {focusObj && <p className="step-review-detail">{focusObj.level_1_full || focusObj.level_1}</p>}
    </div>
  );
}

function ReviewBonusSkill({ bonusSkillPick }) {
  if (!bonusSkillPick) return <p className="step-review-empty">No bonus skill selected.</p>;
  return (
    <div className="step-review-section">
      <h3 className="step-review-name">{bonusSkillPick}</h3>
    </div>
  );
}

function ReviewGear({ char }) {
  if (char.inventory.length === 0) return <p className="step-review-empty">No gear equipped.</p>;
  const weapons = char.inventory.filter((i) => i.category === "weapon" && !i.specialty);
  const armor = char.inventory.filter((i) => i.category === "armor" && !i.specialty);
  const specialty = char.inventory.filter((i) => i.specialty);
  return (
    <div className="step-review-section">
      {weapons.map((w) => (
        <div key={w.name} className="step-review-gear-item">
          <strong>{w.name}</strong>
          <span className="step-review-meta">
            {w.type} &middot; DMG {w.damage} &middot; RNG {w.range}
          </span>
        </div>
      ))}
      {armor.map((a) => (
        <div key={a.name} className="step-review-gear-item">
          <strong>{a.name}</strong>
          <span className="step-review-meta">
            Melee AC {a.meleeAC} &middot; Ranged AC {a.rangedAC}
          </span>
        </div>
      ))}
      {specialty.map((item) => (
        <div key={item.name} className="step-review-gear-item">
          <strong>{item.name}</strong>
          <span className="step-review-meta">{item.category}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewContacts({ char }) {
  if (char.contacts.length === 0) return <p className="step-review-empty">No contacts generated.</p>;
  return (
    <div className="step-review-section">
      {char.contacts.map((c, i) => (
        <div key={i} className="step-review-contact">
          <strong>{c.name || "Unnamed"}</strong>
          <span className="step-review-meta">{c.relationship}</span>
        </div>
      ))}
    </div>
  );
}

const STEP_NUMBERS = {
  roll_attributes: "01",
  pick_background: "02",
  pick_edge_1: "03",
  pick_edge_2: "04",
  pick_focus: "05",
  bonus_skill: "06",
  choose_gear: "07",
  generate_contacts: "08",
};

const STEP_TITLES = {
  roll_attributes: "Roll Attributes",
  pick_background: "Background Assignment",
  pick_edge_1: "Choose Edge (1 of 2)",
  pick_edge_2: "Choose Edge (2 of 2)",
  pick_focus: "Choose Focus",
  bonus_skill: "Bonus Skill",
  choose_gear: "Starting Gear",
  generate_contacts: "Starting Contacts",
};

export default function StepReview({ stepName, char, bonusSkillPick, maxStepReached, onReturnToCurrent }) {
  const renderContent = () => {
    switch (stepName) {
      case "roll_attributes":
        return <ReviewAttributes char={char} />;
      case "pick_background":
        return <ReviewBackground char={char} />;
      case "pick_edge_1":
        return <ReviewEdge char={char} edgeIndex={0} />;
      case "pick_edge_2":
        return <ReviewEdge char={char} edgeIndex={1} />;
      case "pick_focus":
        return <ReviewFocus char={char} />;
      case "bonus_skill":
        return <ReviewBonusSkill bonusSkillPick={bonusSkillPick} />;
      case "choose_gear":
        return <ReviewGear char={char} />;
      case "generate_contacts":
        return <ReviewContacts char={char} />;
      default:
        return null;
    }
  };

  return (
    <div className="step-panel step-review">
      <div className="step-label">Step {STEP_NUMBERS[stepName]}</div>
      <h2 className="step-title">{STEP_TITLES[stepName]}</h2>
      <div className="step-review-note">Selections locked</div>
      {renderContent()}
      <button className="btn-action step-review-return" onClick={onReturnToCurrent}>
        <span className="btn-prompt">&gt;_</span> Return to current step
      </button>
    </div>
  );
}
