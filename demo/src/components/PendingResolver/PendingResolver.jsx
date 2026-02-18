import { useState } from "react";
import { ALL_SKILLS, COMBAT_SKILLS, ATTR_NAMES } from "../../constants.js";
import {
  offerFoci,
  cyberwarePackages,
  SPECIALTY_ITEMS,
} from "../../../../cwn-engine.js";
import { getAvailableSkills } from "../../helpers/get-available-skills.js";
import { getSpecialtyStatPills } from "../GearSelection/GearSelection.helpers.js";
import ChoiceGrid from "../ChoiceGrid";
import ConfirmButton from "../ConfirmButton";
import SkillplugPicker from "./SkillplugPicker.jsx";
import ProgramElementPicker from "./ProgramElementPicker.jsx";
import "./PendingResolver.css";

function VehiclePicker({ onResolve }) {
  const vehicles = SPECIALTY_ITEMS.filter((i) => i.category === "vehicle");
  return (
    <div>
      <p className="step-desc">Ace Driver — choose your vehicle:</p>
      <div className="offer-grid">
        {vehicles.map((v, i) => {
          const pills = getSpecialtyStatPills(v);
          return (
            <button
              key={v.name}
              className="offer-card"
              style={{ animationDelay: `${i * 0.1}s` }}
              onClick={() => onResolve(v.name)}
            >
              <span className="offer-card-id">{v.stats.size}</span>
              <h3>{v.name}</h3>
              <p className="offer-card-desc">{v.description}</p>
              <div className="dos-gear-pills" style={{ marginTop: "0.75rem" }}>
                {pills.map(([label, value]) => (
                  <span key={label || value} className="dos-gear-pill">
                    {label ? `${label} ${value}` : value}
                  </span>
                ))}
              </div>
              {v.name === "Motorcycle" && (
                <span className="offer-card-detail">+ Ghost Driver fitting</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CyberwarePackagePicker({ onResolve }) {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <p className="step-desc">Choose a cyberware package:</p>
      <div className="cyber-package-grid">
        {cyberwarePackages.map((pkg) => (
          <button
            key={pkg.name}
            className={`cyber-package-card${selected === pkg.name ? " cyber-package-selected" : ""}`}
            onClick={() => setSelected(pkg.name)}
          >
            <h3>{pkg.name}</h3>
            <p className="cyber-package-desc">{pkg.description}</p>
            <div className="cyber-package-items">
              {pkg.items.map((ci) => (
                <div key={ci.name} className="cyber-item">
                  <span className="cyber-item-name">{ci.name}</span>
                  <span className="cyber-item-desc">{ci.description}</span>
                  <span className="cyber-item-stats">
                    ${(ci.cost / 1000).toFixed(0)}K &middot; SS {ci.systemStrain}
                  </span>
                </div>
              ))}
            </div>
            <div className="cyber-package-totals">
              <span>Total: ${(pkg.totalCost / 1000).toFixed(0)}K</span>
              <span>SS: {pkg.totalSystemStrain}</span>
              <span>Maint: ${pkg.monthlyMaintenance.toLocaleString()}/mo</span>
            </div>
          </button>
        ))}
      </div>
      <ConfirmButton
        isVisible={!!selected}
        label={`Install ${selected}`}
        onClick={() => onResolve(selected)}
      />
    </div>
  );
}

export default function PendingResolver({ item, char, onResolve }) {
  const skills = item.options
    ? item.options
    : item.category === "combat"
      ? COMBAT_SKILLS
      : item.category === "non-combat"
        ? ALL_SKILLS.filter((s) => !COMBAT_SKILLS.includes(s))
        : ALL_SKILLS;

  const available = getAvailableSkills(char, skills);

  if (item.type === "pickAttribute") {
    const attrs = ATTR_NAMES.filter(
      (a) => !item.exclude || !item.exclude.includes(a)
    );
    return (
      <div>
        <ChoiceGrid
          prompt={
            <p className="step-desc">
              Pick an attribute to set to {item.setTo}:
            </p>
          }
          items={attrs}
          onSelect={onResolve}
          renderSubText={(a) => `currently ${char.attributes[a].score}`}
        />
      </div>
    );
  }

  if (item.type === "pickFocus") {
    return (
      <div>
        <p className="step-desc">Pick an additional focus:</p>
        <div className="offer-grid">
          {offerFoci(char, 3).map((f, i) => (
            <button
              key={f.name}
              className="offer-card"
              style={{ animationDelay: `${i * 0.1}s` }}
              onClick={() => onResolve(f.name)}
            >
              <span className="offer-card-id">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <h3>{f.name}</h3>
              <p className="offer-card-desc">{f.description}</p>
              <span className="offer-card-detail">{f.level_1}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === "pickVehicle") {
    return <VehiclePicker onResolve={onResolve} />;
  }

  if (item.type === "pickCyberwarePackage") {
    return <CyberwarePackagePicker onResolve={onResolve} />;
  }

  if (item.type === "pickSkillplugs") {
    return (
      <div>
        <SkillplugPicker budget={item.budget} onResolve={onResolve} />
      </div>
    );
  }

  if (item.type === "pickProgramElements") {
    return (
      <div>
        <ProgramElementPicker budget={item.budget} options={item.options} char={char} suggestedStarters={item.suggestedStarters || []} onResolve={onResolve} />
      </div>
    );
  }

  if (item.type === "addContact") {
    return (
      <div>
        <p className="step-desc">
          Name a contact ({item.relationship}, {item.context}):
        </p>
        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault();
            onResolve(e.target.elements.contactName.value);
          }}
        >
          <input name="contactName" placeholder="Contact name" required />
          <button type="submit" className="btn-action">
            Add Contact
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <ChoiceGrid
        prompt={
          <p className="step-desc">
            Pick a skill{item.reason ? ` (${item.reason})` : ""}:
          </p>
        }
        items={available}
        onSelect={onResolve}
      />
    </div>
  );
}
