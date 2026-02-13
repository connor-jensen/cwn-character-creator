import { useMemo } from "react";
import {
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
} from "../../../../cwn-engine.js";
import { ALL_SKILLS, ATTR_NAMES } from "../../constants.js";
import { normalizeWeapon, fileHash, attrPercent } from "./CharacterDossier.helpers.js";
import SectionHeader from "./SectionHeader.jsx";
import DossierContact from "./DossierContact.jsx";
import "./CharacterDossier.css";

export default function CharacterDossier({ char }) {
  const bgObj = char.background && allBackgrounds.find((b) => b.name === char.background);
  const edgeObjs = char.edges.map((name) => allEdges.find((e) => e.name === name)).filter(Boolean);

  const dexMod = char.attributes.dexterity.mod;
  let effectiveMeleeAC = 10;
  let effectiveRangedAC = 10;
  let armorSoak = 0;
  let effectiveTraumaTarget = char.traumaTarget;

  for (const item of char.inventory) {
    if (item.category === "armor") {
      if (item.specialty) {
        if (item.stats.meleeAC) effectiveMeleeAC = Math.max(effectiveMeleeAC, item.stats.meleeAC);
        if (item.stats.rangedAC) effectiveRangedAC = Math.max(effectiveRangedAC, item.stats.rangedAC);
        if (item.stats.meleeACBonus) effectiveMeleeAC += item.stats.meleeACBonus;
        if (item.stats.rangedACBonus) effectiveRangedAC += item.stats.rangedACBonus;
        if (item.stats.soak) armorSoak += item.stats.soak;
        if (item.stats.traumaTargetMod) effectiveTraumaTarget += item.stats.traumaTargetMod;
      } else {
        if (item.meleeAC) effectiveMeleeAC = Math.max(effectiveMeleeAC, item.meleeAC);
        if (item.rangedAC) effectiveRangedAC = Math.max(effectiveRangedAC, item.rangedAC);
        if (item.soak) armorSoak += item.soak;
        if (item.traumaMod) effectiveTraumaTarget += item.traumaMod;
      }
    }
  }

  effectiveMeleeAC += dexMod;
  effectiveRangedAC += dexMod;
  const totalSoak = char.damageSoak + armorSoak;

  let systemStrainUsed = char.cyberwarePackage?.totalSystemStrain || 0;
  for (const item of char.inventory) {
    if (item.specialty && item.category === "cyberware" && item.stats.strain) {
      systemStrainUsed += item.stats.strain;
    }
  }
  const systemStrainMax = char.attributes.constitution.score;

  const armorItems = char.inventory.filter((i) => i.category === "armor");
  const armorName = armorItems.map((a) => a.name).join(" + ") || "Unarmored";

  const weapons = char.inventory.filter((i) => i.category === "weapon");
  const hackingItems = char.inventory.filter((i) => i.specialty && i.category === "hacking");
  const vehicleDroneItems = char.inventory.filter((i) => i.specialty && (i.category === "vehicle" || i.category === "drone"));
  const cyberwareSpecialty = char.inventory.filter((i) => i.specialty && i.category === "cyberware");
  const techItems = char.inventory.filter((i) => i.specialty && i.category === "tech");

  const fid = useMemo(() => fileHash(char.name), [char.name]);

  return (
    <div className="dos">
      <div className="dos-corner dos-corner-tl" />
      <div className="dos-corner dos-corner-tr" />
      <div className="dos-corner dos-corner-bl" />
      <div className="dos-corner dos-corner-br" />

      {/* Classification bar */}
      <div className="dos-class-bar">
        <span className="dos-class-mark">&#9650;</span>
        <span className="dos-class-text">CLASSIFIED</span>
        <span className="dos-class-sep">//</span>
        <span className="dos-class-text">OPERATIVE FILE</span>
        <div className="dos-class-rule" />
        <span className="dos-class-id">
          {(char.name || "XXX").slice(0, 3).toUpperCase()}-{fid}
        </span>
      </div>

      {/* Identity */}
      <div className="dos-identity">
        <h2 className="dos-name">{char.name}</h2>
        {bgObj && (
          <div className="dos-bg-row">
            <span className="dos-bg-tag">{bgObj.name}</span>
            <span className="dos-lvl-tag">LVL 1</span>
          </div>
        )}
        {bgObj && <p className="dos-bg-desc">{bgObj.description}</p>}
      </div>

      <div className="dos-grid">
        {/* ===== LEFT COLUMN ===== */}
        <div className="dos-col">
          <section className="dos-section">
            <SectionHeader num="01" label="Attributes" />
            <div className="dos-attr-list">
              {ATTR_NAMES.map((a) => {
                const { score, mod } = char.attributes[a];
                const pct = attrPercent(score);
                const cls = mod >= 2 ? "high" : mod > 0 ? "pos" : mod < 0 ? "neg" : "zero";
                return (
                  <div key={a} className="dos-attr">
                    <span className="dos-attr-abbr">{a.slice(0, 3)}</span>
                    <div className="dos-attr-track">
                      <div className={`dos-attr-fill ${cls}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="dos-attr-score">{score}</span>
                    <span className={`dos-attr-mod ${cls}`}>
                      {mod >= 0 ? "+" : ""}{mod}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="dos-section">
            <SectionHeader num="02" label="Skills" />
            <div className="dos-skill-grid">
              {ALL_SKILLS.map((name) => {
                const lvl = char.skills[name];
                const trained = lvl !== undefined;
                return (
                  <div key={name} className={`dos-skill${trained ? "" : " dos-skill-untrained"}`}>
                    <span className="dos-skill-name">{name}</span>
                    {trained ? (
                      <span className="dos-skill-dots">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={`dos-skill-dot${i <= lvl ? " filled" : ""}`} />
                        ))}
                      </span>
                    ) : (
                      <span className="dos-skill-neg">-1</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {edgeObjs.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="03" label="Edges" />
              <div className="dos-list">
                {edgeObjs.map((e) => (
                  <div key={e.name} className="dos-list-item">
                    <div className="dos-list-name">{e.name}</div>
                    <div className="dos-list-desc">{e.description}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {char.foci.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="04" label="Foci" />
              <div className="dos-list">
                {char.foci.map((f) => {
                  const data = allFoci.find((d) => d.name === f.name);
                  return (
                    <div key={f.name} className="dos-list-item">
                      <div className="dos-list-name">
                        {f.name}
                        <span className="dos-focus-lvl">L{f.level}</span>
                      </div>
                      {data && <div className="dos-list-desc">{data.level_1}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {char.contacts.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="05" label="Contacts" />
              <div className="dos-contacts">
                {char.contacts.map((c, i) => (
                  <DossierContact key={i} contact={c} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div className="dos-col">
          <section className="dos-section">
            <SectionHeader num="06" label="Combat Readiness" />
            <div className="dos-combat">
              <div className="dos-combat-hp">
                <span className="dos-combat-hp-label">HP</span>
                <span className="dos-combat-hp-value">{char.hp}</span>
              </div>
              <div className="dos-combat-stats">
                <div className="dos-combat-stat">
                  <span className="dos-combat-stat-label">BAB</span>
                  <span className="dos-combat-stat-value">+{char.bab}</span>
                </div>
                <div className="dos-combat-stat">
                  <span className="dos-combat-stat-label">INIT</span>
                  <span className="dos-combat-stat-value">
                    {char.initiative >= 0 ? "+" : ""}{char.initiative}
                  </span>
                </div>
                <div className="dos-combat-stat">
                  <span className="dos-combat-stat-label">SYS STRAIN</span>
                  <span className="dos-combat-stat-value">{systemStrainUsed}/{systemStrainMax}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="dos-section">
            <SectionHeader num="07" label="Saving Throws" />
            <div className="dos-saves">
              {[
                { name: "Physical", val: char.savingThrows.physical },
                { name: "Evasion", val: char.savingThrows.evasion },
                { name: "Mental", val: char.savingThrows.mental },
                { name: "Luck", val: char.savingThrows.luck },
              ].map((s) => (
                <div key={s.name} className="dos-save">
                  <span className="dos-save-val">{s.val}+</span>
                  <span className="dos-save-label">{s.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dos-section">
            <SectionHeader num="08" label="Defenses" />
            <div className="dos-armor-name">{armorName}</div>
            <div className="dos-defense-row">
              <div className="dos-defense-stat">
                <span className="dos-defense-val">{effectiveMeleeAC}</span>
                <span className="dos-defense-label">Melee AC</span>
              </div>
              <div className="dos-defense-stat">
                <span className="dos-defense-val">{effectiveRangedAC}</span>
                <span className="dos-defense-label">Ranged AC</span>
              </div>
              <div className="dos-defense-stat">
                <span className="dos-defense-val">{totalSoak}</span>
                <span className="dos-defense-label">Soak</span>
              </div>
              <div className="dos-defense-stat">
                <span className="dos-defense-val">{effectiveTraumaTarget}</span>
                <span className="dos-defense-label">Trauma Tgt</span>
              </div>
            </div>
          </section>

          {weapons.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="09" label="Armaments" />
              <div className="dos-weapons">
                {weapons.map((w) => {
                  const nw = normalizeWeapon(w, char);
                  return (
                    <div key={nw.name} className="dos-weapon-card">
                      <div className="dos-weapon-top">
                        <span className="dos-weapon-name">{nw.name}</span>
                        <span className="dos-weapon-hit">
                          {nw.hit >= 0 ? `+${nw.hit}` : nw.hit}
                        </span>
                      </div>
                      <div className="dos-weapon-stats">
                        <div className="dos-weapon-stat">
                          <span className="dos-weapon-stat-label">DMG</span>
                          <span className="dos-weapon-stat-value">{nw.damage}</span>
                        </div>
                        <div className="dos-weapon-stat">
                          <span className="dos-weapon-stat-label">SHOCK</span>
                          <span className="dos-weapon-stat-value">{nw.shock}</span>
                        </div>
                        <div className="dos-weapon-stat">
                          <span className="dos-weapon-stat-label">RNG</span>
                          <span className="dos-weapon-stat-value">{nw.range}</span>
                        </div>
                        <div className="dos-weapon-stat">
                          <span className="dos-weapon-stat-label">MAG</span>
                          <span className="dos-weapon-stat-value">{nw.mag}</span>
                        </div>
                        {(nw.traumaDie || nw.traumaMult) && (
                          <div className="dos-weapon-stat dos-weapon-stat-trauma">
                            <span className="dos-weapon-stat-label">TRAUMA</span>
                            <span className="dos-weapon-stat-value">
                              {nw.traumaDie}{nw.traumaMult ? ` ${nw.traumaMult}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {(char.cyberwarePackage || cyberwareSpecialty.length > 0) && (
            <section className="dos-section">
              <SectionHeader num="10" label="Augmentations" />
              {char.cyberwarePackage && (
                <div className="dos-cyber-pkg">
                  <div className="dos-cyber-pkg-header">
                    <span className="dos-bg-tag">{char.cyberwarePackage.name}</span>
                    <span className="dos-cyber-meta">
                      SS {char.cyberwarePackage.totalSystemStrain} &middot; ${char.cyberwarePackage.monthlyMaintenance.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="dos-list">
                    {char.cyberwarePackage.items.map((item) => (
                      <div key={item.name} className="dos-list-item">
                        <div className="dos-list-name">{item.name}</div>
                        <div className="dos-list-desc">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {cyberwareSpecialty.map((item) => (
                <div key={item.name} className="dos-gear-block">
                  <div className="dos-gear-name">{item.name}</div>
                  <p className="dos-gear-desc">{item.description}</p>
                  <div className="dos-gear-pills">
                    {item.stats.strain !== undefined && <span className="dos-gear-pill">Strain {item.stats.strain}</span>}
                    {item.stats.concealment && <span className="dos-gear-pill">Conceal {item.stats.concealment}</span>}
                    {item.stats.effect && <span className="dos-gear-pill">{item.stats.effect}</span>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {hackingItems.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="11" label="Cyberdeck" />
              {hackingItems.map((item) => (
                <div key={item.name} className="dos-gear-block">
                  <div className="dos-gear-name">{item.name}</div>
                  <p className="dos-gear-desc">{item.description}</p>
                  <div className="dos-gear-pills">
                    {item.stats.memory && <span className="dos-gear-pill">MEM {item.stats.memory}</span>}
                    {item.stats.shielding && <span className="dos-gear-pill">Shield {item.stats.shielding}</span>}
                    {item.stats.cpu && <span className="dos-gear-pill">CPU {item.stats.cpu}</span>}
                    {item.stats.bonusAccess && <span className="dos-gear-pill">Access +{item.stats.bonusAccess}</span>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {vehicleDroneItems.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="12" label="Vehicles & Drones" />
              {vehicleDroneItems.map((item) => (
                <div key={item.name} className="dos-gear-block">
                  <div className="dos-gear-name">
                    {item.name}
                    <span className="dos-gear-type">{item.category}</span>
                  </div>
                  <p className="dos-gear-desc">{item.description}</p>
                  <div className="dos-gear-pills">
                    {item.stats.hp && <span className="dos-gear-pill">HP {item.stats.hp}</span>}
                    {item.stats.ac && <span className="dos-gear-pill">AC {item.stats.ac}</span>}
                    {item.stats.speed !== undefined && <span className="dos-gear-pill">Speed {item.stats.speed}</span>}
                    {item.stats.move && <span className="dos-gear-pill">Move {item.stats.move}</span>}
                    {item.stats.traumaTarget && <span className="dos-gear-pill">Trauma Tgt {item.stats.traumaTarget}</span>}
                    {item.stats.crew && <span className="dos-gear-pill">Crew {item.stats.crew}</span>}
                    {item.stats.fittings !== undefined && <span className="dos-gear-pill">Fittings {item.stats.fittings}</span>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {techItems.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="13" label="Tech" />
              {techItems.map((item) => (
                <div key={item.name} className="dos-gear-block">
                  <div className="dos-gear-name">{item.name}</div>
                  <p className="dos-gear-desc">{item.description}</p>
                  <div className="dos-gear-pills">
                    {item.stats.effect && <span className="dos-gear-pill">{item.stats.effect}</span>}
                    {item.stats.enc && <span className="dos-gear-pill">ENC {item.stats.enc}</span>}
                    {item.stats.special && <span className="dos-gear-pill">{item.stats.special}</span>}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
