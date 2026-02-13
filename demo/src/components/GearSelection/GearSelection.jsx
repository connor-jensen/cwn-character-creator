// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import {
  STARTING_WEAPONS,
  STARTING_KNIFE,
  STARTING_ARMOR,
  getAvailableSpecialtyItems,
} from "../../../../cwn-engine.js";
import { getSpecialtyStatPills } from "./GearSelection.helpers.js";
import "./GearSelection.css";

function renderSpecialtyStats(item) {
  const pills = getSpecialtyStatPills(item);
  if (pills.length === 0) return null;
  return (
    <div className="gear-card-stats">
      {pills.map(([label, value, className]) => (
        <div key={label} className="gear-stat">
          <span className="gear-stat-label">{label}</span>
          <span className={`gear-stat-value${className ? ` ${className}` : ""}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function GearSelection({
  char,
  selectedWeapon,
  selectedArmor,
  selectedSpecialty,
  onWeaponSelect,
  onArmorSelect,
  onSpecialtySelect,
  onConfirm,
}) {
  const availableSpecialty = getAvailableSpecialtyItems(char);

  return (
    <>
      <p className="step-desc">
        Select one weapon and one armor loadout. A knife ({STARTING_KNIFE.damage}, shock {STARTING_KNIFE.shock}) is automatically included.
      </p>

      <div className="gear-columns">
        <div className="gear-column">
          <div className="gear-section-label">Choose Weapon</div>
          {STARTING_WEAPONS.map((w) => (
            <button
              key={w.name}
              className={`gear-card${selectedWeapon === w.name ? " gear-card-selected" : ""}`}
              onClick={() => onWeaponSelect(w.name)}
            >
              <span className="gear-card-type">{w.type}</span>
              <h3>{w.name}</h3>
              <p className="gear-card-hint">
                {w.name === "Light Pistol" && "Less damage, crits more often."}
                {w.name === "Heavy Pistol" && "More damage, crits less often."}
                {w.name === "Rifle" && "Long range, high damage, high crit rate, but can\u2019t be concealed."}
              </p>
              <div className="gear-card-stats">
                <div className="gear-stat">
                  <span className="gear-stat-label">DMG</span>
                  <span className="gear-stat-value">{w.damage}</span>
                </div>
                <div className="gear-stat">
                  <span className="gear-stat-label">RNG</span>
                  <span className="gear-stat-value">{w.range}</span>
                </div>
                <div className="gear-stat">
                  <span className="gear-stat-label">MAG</span>
                  <span className="gear-stat-value">{w.mag || "\u2014"}</span>
                </div>
                <div className="gear-stat">
                  <span className="gear-stat-label">ENC</span>
                  <span className="gear-stat-value">{w.enc}</span>
                </div>
              </div>
              <div className="gear-card-stats">
                <div className="gear-stat">
                  <span className="gear-stat-label">Trauma</span>
                  <span className="gear-stat-value">{w.trauma_die}</span>
                </div>
                <div className="gear-stat">
                  <span className="gear-stat-label">Rating</span>
                  <span className="gear-stat-value">{w.trauma_rating}</span>
                </div>
                <div className="gear-stat">
                  <span className="gear-stat-label">Conceal</span>
                  <span className={`gear-stat-value gear-stat-conceal-${w.conceal}`}>
                    {w.conceal.charAt(0).toUpperCase() + w.conceal.slice(1)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="gear-column">
          <div className="gear-section-label">Choose Armor</div>
          {STARTING_ARMOR.map((a) => (
            <button
              key={a.name}
              className={`gear-card${selectedArmor === a.name ? " gear-card-selected" : ""}`}
              onClick={() => onArmorSelect(a.name)}
            >
              <h3>{a.name}</h3>
              <div className="gear-card-stats">
                <div className="gear-stat">
                  <span className="gear-stat-label">Melee AC</span>
                  <span className="gear-stat-value">{a.meleeAC}</span>
                </div>
                <div className="gear-stat">
                  <span className="gear-stat-label">Ranged AC</span>
                  <span className="gear-stat-value">{a.rangedAC}</span>
                </div>
                {a.soak > 0 && (
                  <div className="gear-stat">
                    <span className="gear-stat-label">Soak</span>
                    <span className="gear-stat-value">{a.soak}</span>
                  </div>
                )}
                {a.traumaMod !== 0 && (
                  <div className="gear-stat">
                    <span className="gear-stat-label">Trauma Mod</span>
                    <span className="gear-stat-value">{a.traumaMod >= 0 ? "+" : ""}{a.traumaMod}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="gear-specialty-section">
        <div className="gear-section-label">Choose Specialty Item</div>
        {availableSpecialty.length === 0 ? (
          <p className="gear-specialty-empty">
            No specialty items available — your current skills and attributes don&apos;t meet any prerequisites.
          </p>
        ) : (
          <div className="gear-specialty-grid">
            {availableSpecialty.map((item) => (
              <button
                key={item.name}
                className={`gear-card${selectedSpecialty === item.name ? " gear-card-selected" : ""}`}
                onClick={() => onSpecialtySelect(item.name)}
              >
                <span className="gear-card-category">{item.category}</span>
                <h3>{item.name}</h3>
                <p className="gear-card-hint">{item.description}</p>
                {renderSpecialtyStats(item)}
                <div className="gear-prereq-pills">
                  {Object.entries(item.prereqs.attributes).map(([attr, mod]) => (
                    <span key={attr} className="gear-prereq-pill">
                      {attr.slice(0, 3).toUpperCase()} {mod >= 0 ? "+" : ""}{mod}
                    </span>
                  ))}
                  {item.prereqs.skills.map((skill) => (
                    <span key={skill} className="gear-prereq-pill">{skill}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedWeapon && selectedArmor && selectedSpecialty && (
          <motion.div
            className="gear-confirm-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <button className="btn-action" onClick={onConfirm}>
              <span className="btn-prompt">&gt;_</span> Confirm Loadout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
