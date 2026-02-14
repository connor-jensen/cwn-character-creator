import { useMemo } from "react";
import {
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
} from "../../../../cwn-engine.js";
import { ALL_SKILLS, ATTR_NAMES } from "../../constants.js";
import { normalizeWeapon, fileHash, attrPercent, computeDefenses, computeSystemStrain } from "./CharacterDossier.helpers.js";
import SectionHeader from "./SectionHeader.jsx";
import DossierContact from "./DossierContact.jsx";
import GearBlock from "./GearBlock.jsx";
import "./CharacterDossier.css";

export default function CharacterDossier({ char }) {
  const bgObj = char.background && allBackgrounds.find((b) => b.name === char.background);
  const edgeObjs = char.edges.map((name) => allEdges.find((e) => e.name === name)).filter(Boolean);

  const { meleeAC, rangedAC, totalSoak, traumaTarget, armorName } = computeDefenses(char);
  const systemStrain = computeSystemStrain(char);

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
                        {[1, 2, 3, 4].map((i) => (
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
                      {data && <div className="dos-list-desc">{data.level_1_full || data.level_1}</div>}
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
                  <span className="dos-combat-stat-value">{systemStrain.used}/{systemStrain.max}</span>
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
                <span className="dos-defense-val">{meleeAC}</span>
                <span className="dos-defense-label">Melee AC</span>
              </div>
              <div className="dos-defense-stat">
                <span className="dos-defense-val">{rangedAC}</span>
                <span className="dos-defense-label">Ranged AC</span>
              </div>
              <div className="dos-defense-stat">
                <span className="dos-defense-val">{totalSoak}</span>
                <span className="dos-defense-label">Soak</span>
              </div>
              <div className="dos-defense-stat">
                <span className="dos-defense-val">{traumaTarget}</span>
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
                <GearBlock
                  key={item.name}
                  item={item}
                  pills={[
                    item.stats.strain !== undefined && ["Strain", item.stats.strain],
                    item.stats.concealment && ["Conceal", item.stats.concealment],
                    item.stats.effect && ["", item.stats.effect],
                  ].filter(Boolean)}
                />
              ))}
            </section>
          )}

          {hackingItems.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="11" label="Cyberdeck" />
              {hackingItems.map((item) => (
                <GearBlock
                  key={item.name}
                  item={item}
                  pills={[
                    item.stats.memory && ["MEM", item.stats.memory],
                    item.stats.shielding && ["Shield", item.stats.shielding],
                    item.stats.cpu && ["CPU", item.stats.cpu],
                    item.stats.bonusAccess && ["Access", `+${item.stats.bonusAccess}`],
                  ].filter(Boolean)}
                />
              ))}
            </section>
          )}

          {vehicleDroneItems.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="12" label="Vehicles & Drones" />
              {vehicleDroneItems.map((item) => (
                <GearBlock
                  key={item.name}
                  item={item}
                  typeLabel={item.category}
                  pills={[
                    item.stats.hp && ["HP", item.stats.hp],
                    item.stats.ac && ["AC", item.stats.ac],
                    item.stats.speed !== undefined && ["Speed", item.stats.speed],
                    item.stats.move && ["Move", item.stats.move],
                    item.stats.traumaTarget && ["Trauma Tgt", item.stats.traumaTarget],
                    item.stats.crew && ["Crew", item.stats.crew],
                    item.stats.fittings !== undefined && ["Fittings", item.stats.fittings],
                  ].filter(Boolean)}
                />
              ))}
            </section>
          )}

          {techItems.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="13" label="Tech" />
              {techItems.map((item) => (
                <GearBlock
                  key={item.name}
                  item={item}
                  pills={[
                    item.stats.effect && ["", item.stats.effect],
                    item.stats.enc && ["ENC", item.stats.enc],
                    item.stats.special && ["", item.stats.special],
                  ].filter(Boolean)}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
