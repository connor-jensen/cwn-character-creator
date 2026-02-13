// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.aside)
import { motion } from "motion/react";
import {
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
} from "../../../../cwn-engine.js";
import { ALL_SKILLS, ATTR_NAMES } from "../../constants.js";
import CharacterDossier from "../CharacterDossier";
import SheetContact from "./SheetContact.jsx";
import "./Sidebar.css";

export default function Sidebar({ char, isFullWidth }) {
  const bgObj =
    char.background &&
    allBackgrounds.find((b) => b.name === char.background);
  const edgeObjs = char.edges
    .map((name) => allEdges.find((e) => e.name === name))
    .filter(Boolean);
  const fociObjs = char.foci
    .map((f) => allFoci.find((d) => d.name === f.name))
    .filter(Boolean);

  return (
    <motion.aside
      className={`sheet${isFullWidth ? " sheet-full" : ""}`}
      layout
      transition={{ layout: { duration: 0.5, ease: "easeInOut" } }}
    >
      <div className="sheet-header">
        <span className="sheet-header-label">Dossier</span>
        <div className="sheet-header-line" />
      </div>

      {isFullWidth ? (
        <CharacterDossier char={char} />
      ) : (
        <div className="sheet-body">
          <div className="sheet-name">{char.name || "Unregistered"}</div>

          {bgObj && (
            <div>
              <span className="sheet-bg-tag">{bgObj.name}</span>
              <p className="sheet-bg-desc">{bgObj.description}</p>
            </div>
          )}

          <div className="sheet-section">
            <div className="sheet-section-title">
              <span>Attributes</span>
            </div>
            <div className="attr-legend">
              <div className="attr-legend-label">
                <span>score</span>
                <span>mod</span>
              </div>
              {[
                { score: "3", mod: "-2" },
                { score: "4\u20137", mod: "-1" },
                { score: "8\u201313", mod: "+0" },
                { score: "14\u201317", mod: "+1" },
                { score: "18", mod: "+2" },
              ].map((b) => (
                <div key={b.score} className="attr-legend-col">
                  <span className="attr-legend-score">{b.score}</span>
                  <span className="attr-legend-mod">{b.mod}</span>
                </div>
              ))}
            </div>
            <div className="attr-grid">
              {ATTR_NAMES.map((a) => (
                <div key={a} className="attr-row">
                  <span className="attr-name">
                    {a.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="attr-score">
                    {char.attributes[a].score}
                  </span>
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

          {edgeObjs.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Edges</span>
              </div>
              <div className="sheet-list">
                {edgeObjs.map((e) => (
                  <div key={e.name} className="sheet-list-item">
                    <strong>{e.name}</strong>
                    <span className="sheet-item-desc">{e.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fociObjs.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Foci</span>
              </div>
              <div className="sheet-list">
                {char.foci.map((f) => {
                  const data = allFoci.find((d) => d.name === f.name);
                  return (
                    <div key={f.name} className="sheet-list-item">
                      <strong>
                        {f.name}{" "}
                        <span style={{ color: "var(--amber)" }}>
                          L{f.level}
                        </span>
                      </strong>
                      {data && (
                        <span className="sheet-item-desc">
                          {data.level_1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sheet-section">
            <div className="sheet-section-title">
              <span>Skills</span>
            </div>
            <div className="skill-grid">
              {ALL_SKILLS.map((name) => {
                const lvl = char.skills[name];
                const hasSkill = lvl !== undefined;
                return (
                  <span key={name} className={`skill-pill${hasSkill ? '' : ' skill-pill-untrained'}`}>
                    {name}
                    <span className="skill-level">{hasSkill ? lvl : '-1'}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {char.inventory.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Gear</span>
              </div>
              <div className="sheet-gear-list">
                {char.inventory
                  .filter((item) => item.category === "weapon" && !item.specialty)
                  .map((w) => (
                    <div key={w.name} className="sheet-gear-item">
                      <div className="sheet-gear-name">
                        {w.name}
                        <span className="sheet-gear-type-tag">{w.type}</span>
                      </div>
                      <div className="sheet-gear-stats">
                        <span className="sheet-gear-pill">DMG {w.damage}</span>
                        <span className="sheet-gear-pill">RNG {w.range}</span>
                        {w.mag && <span className="sheet-gear-pill">MAG {w.mag}</span>}
                        <span className="sheet-gear-pill">Trauma {w.trauma_die} {w.trauma_rating}</span>
                        {w.shock && <span className="sheet-gear-pill">Shock {w.shock}</span>}
                        {w.conceal && <span className={`sheet-gear-pill sheet-gear-pill-conceal-${w.conceal}`}>{w.conceal.charAt(0).toUpperCase() + w.conceal.slice(1)}</span>}
                      </div>
                    </div>
                  ))}
                {char.inventory
                  .filter((item) => item.category === "armor" && !item.specialty)
                  .map((a) => (
                    <div key={a.name} className="sheet-gear-item">
                      <div className="sheet-gear-name">{a.name}</div>
                      <div className="sheet-gear-stats">
                        <span className="sheet-gear-pill">Melee AC {a.meleeAC}</span>
                        <span className="sheet-gear-pill">Ranged AC {a.rangedAC}</span>
                        {a.soak > 0 && <span className="sheet-gear-pill">Soak {a.soak}</span>}
                        {a.traumaMod !== 0 && <span className="sheet-gear-pill">Trauma Mod {a.traumaMod >= 0 ? "+" : ""}{a.traumaMod}</span>}
                        {a.conceal && <span className={`sheet-gear-pill sheet-gear-pill-conceal-${a.conceal}`}>{a.conceal.charAt(0).toUpperCase() + a.conceal.slice(1)}</span>}
                      </div>
                    </div>
                  ))}
                {char.inventory
                  .filter((item) => item.specialty)
                  .map((item) => (
                    <div key={item.name} className="sheet-gear-item">
                      <div className="sheet-gear-name">
                        {item.name}
                        <span className="sheet-gear-type-tag">{item.category}</span>
                      </div>
                      <div className="sheet-gear-stats">
                        {item.stats.damage && <span className="sheet-gear-pill">DMG {item.stats.damage}</span>}
                        {item.stats.shock && <span className="sheet-gear-pill">Shock {item.stats.shock}</span>}
                        {item.stats.range && <span className="sheet-gear-pill">RNG {item.stats.range}</span>}
                        {item.stats.mag && <span className="sheet-gear-pill">MAG {item.stats.mag}</span>}
                        {item.stats.trauma && <span className="sheet-gear-pill">Trauma {item.stats.trauma}</span>}
                        {item.stats.meleeAC && <span className="sheet-gear-pill">Melee AC {item.stats.meleeAC}</span>}
                        {item.stats.rangedAC && <span className="sheet-gear-pill">Ranged AC {item.stats.rangedAC}</span>}
                        {item.stats.meleeACBonus && <span className="sheet-gear-pill">Melee AC +{item.stats.meleeACBonus}</span>}
                        {item.stats.rangedACBonus && <span className="sheet-gear-pill">Ranged AC +{item.stats.rangedACBonus}</span>}
                        {item.stats.soak > 0 && <span className="sheet-gear-pill">Soak {item.stats.soak}</span>}
                        {item.stats.traumaTargetMod > 0 && <span className="sheet-gear-pill">Trauma Mod +{item.stats.traumaTargetMod}</span>}
                        {item.stats.strain !== undefined && <span className="sheet-gear-pill">Strain {item.stats.strain}</span>}
                        {item.stats.memory && <span className="sheet-gear-pill">MEM {item.stats.memory}</span>}
                        {item.stats.shielding && <span className="sheet-gear-pill">Shield {item.stats.shielding}</span>}
                        {item.stats.cpu && <span className="sheet-gear-pill">CPU {item.stats.cpu}</span>}
                        {item.stats.bonusAccess && <span className="sheet-gear-pill">Access +{item.stats.bonusAccess}</span>}
                        {item.stats.hp && <span className="sheet-gear-pill">HP {item.stats.hp}</span>}
                        {item.stats.ac && <span className="sheet-gear-pill">AC {item.stats.ac}</span>}
                        {item.stats.speed !== undefined && <span className="sheet-gear-pill">Speed {item.stats.speed}</span>}
                        {item.stats.move && <span className="sheet-gear-pill">Move {item.stats.move}</span>}
                        {item.stats.fittings !== undefined && <span className="sheet-gear-pill">Fittings {item.stats.fittings}</span>}
                        {item.stats.effect && <span className="sheet-gear-pill">{item.stats.effect}</span>}
                        {item.stats.conceal && <span className={`sheet-gear-pill sheet-gear-pill-conceal-${item.stats.conceal}`}>{item.stats.conceal.charAt(0).toUpperCase() + item.stats.conceal.slice(1)}</span>}
                        {item.stats.special && <span className="sheet-gear-pill">{item.stats.special}</span>}
                        {item.stats.enc && <span className="sheet-gear-pill">ENC {item.stats.enc}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {char.cyberwarePackage && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Cyberware</span>
              </div>
              <div className="sheet-cyber-header">
                <span className="sheet-bg-tag">{char.cyberwarePackage.name}</span>
                <span className="sheet-cyber-meta">
                  SS {char.cyberwarePackage.totalSystemStrain} &middot; ${char.cyberwarePackage.monthlyMaintenance.toLocaleString()}/mo
                </span>
              </div>
              <div className="sheet-list">
                {char.cyberwarePackage.items.map((item) => (
                  <div key={item.name} className="sheet-list-item">
                    <strong>{item.name}</strong>
                    <span className="sheet-item-desc">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {char.contacts.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Contacts</span>
              </div>
              <div className="sheet-list">
                {char.contacts.map((c, i) => (
                  <SheetContact key={i} contact={c} />
                ))}
              </div>
            </div>
          )}

          {char.hp > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Combat</span>
              </div>
              <div className="combat-grid">
                <div className="combat-stat hp">
                  <span className="combat-stat-label">HP</span>
                  <span className="combat-stat-value">{char.hp}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Base Atk Bonus</span>
                  <span className="combat-stat-value">+{char.bab}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Phys</span>
                  <span className="combat-stat-value">
                    {char.savingThrows.physical}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Eva</span>
                  <span className="combat-stat-value">
                    {char.savingThrows.evasion}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Ment</span>
                  <span className="combat-stat-value">
                    {char.savingThrows.mental}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Init</span>
                  <span className="combat-stat-value">
                    {char.initiative >= 0 ? "+" : ""}{char.initiative}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Soak</span>
                  <span className="combat-stat-value">{char.damageSoak}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Trauma</span>
                  <span className="combat-stat-value">{char.traumaTarget}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Contacts</span>
                  <span className="combat-stat-value">
                    {char.startingContactBonus >= 0 ? "+" : ""}{char.startingContactBonus}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.aside>
  );
}
