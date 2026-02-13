import { ALL_SKILLS, COMBAT_SKILLS, ATTR_NAMES } from "../../constants.js";
import {
  offerFoci,
  cyberwarePackages,
} from "../../../../cwn-engine.js";
import "./PendingResolver.css";

export default function PendingResolver({ item, char, onResolve }) {
  const skills = item.options
    ? item.options
    : item.category === "combat"
      ? COMBAT_SKILLS
      : item.category === "non-combat"
        ? ALL_SKILLS.filter((s) => !COMBAT_SKILLS.includes(s))
        : ALL_SKILLS;

  const available = skills.filter(
    (s) => char.skills[s] === undefined || char.skills[s] < 1
  );

  if (item.type === "pickAttribute") {
    const attrs = ATTR_NAMES.filter(
      (a) => !item.exclude || !item.exclude.includes(a)
    );
    return (
      <div>
        <p className="step-desc">
          Pick an attribute to set to {item.setTo}:
        </p>
        <div className="choices">
          {attrs.map((a) => (
            <button
              key={a}
              className="btn-choice"
              onClick={() => onResolve(a)}
            >
              {a}
              <span className="btn-choice-sub">
                currently {char.attributes[a].score}
              </span>
            </button>
          ))}
        </div>
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

  if (item.type === "pickCyberwarePackage") {
    return (
      <div>
        <p className="step-desc">Choose a cyberware package:</p>
        <div className="cyber-package-grid">
          {cyberwarePackages.map((pkg) => (
            <button
              key={pkg.name}
              className="cyber-package-card"
              onClick={() => onResolve(pkg.name)}
            >
              <h3>{pkg.name}</h3>
              <p className="cyber-package-desc">{pkg.description}</p>
              <div className="cyber-package-items">
                {pkg.items.map((item) => (
                  <div key={item.name} className="cyber-item">
                    <span className="cyber-item-name">{item.name}</span>
                    <span className="cyber-item-desc">{item.description}</span>
                    <span className="cyber-item-stats">
                      ${(item.cost / 1000).toFixed(0)}K &middot; SS {item.systemStrain}
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
      <p className="step-desc">
        Pick a skill{item.reason ? ` (${item.reason})` : ""}:
      </p>
      <div className="choices">
        {available.map((s) => (
          <button
            key={s}
            className="btn-choice"
            onClick={() => onResolve(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
