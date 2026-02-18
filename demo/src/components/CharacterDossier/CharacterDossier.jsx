import { useCallback, useMemo, useState } from "react";
import {
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
  hacking,
} from "../../../../cwn-engine.js";
import { ALL_SKILLS, ATTR_NAMES } from "../../constants.js";
import { normalizeWeapon, fileHash, attrPercent, computeDefenses, computeSystemStrain } from "./CharacterDossier.helpers.js";
import { saveCharacter } from "../../helpers/roster-storage.js";
import SectionHeader from "./SectionHeader.jsx";
import DossierContact from "./DossierContact.jsx";
import GearBlock from "./GearBlock.jsx";
import "./CharacterDossier.css";

export default function CharacterDossier({ char }) {
  const [loadedPrograms, setLoadedPrograms] = useState(() => new Set());
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const handleSaveToRoster = useCallback(() => {
    saveCharacter(char);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(null), 2000);
  }, [char]);
  const bgObj = char.background && allBackgrounds.find((b) => b.name === char.background);
  const edgeObjs = char.edges.map((name) => allEdges.find((e) => e.name === name)).filter(Boolean);

  const { meleeAC, rangedAC, totalSoak, traumaTarget, armorName } = computeDefenses(char);
  const systemStrain = computeSystemStrain(char);

  const weapons = char.inventory.filter((i) => i.category === "weapon");
  const hackingItems = char.inventory.filter((i) => (i.specialty || i.hackerGear) && i.category === "hacking");
  const hackerCyberware = char.inventory.filter((i) => i.hackerGear && i.category === "cyberware");
  const vehicleDroneItems = char.inventory.filter((i) => (i.specialty || i.focusGear) && (i.category === "vehicle" || i.category === "drone"));
  const cyberwareSpecialty = char.inventory.filter((i) => (i.specialty || i.focusGear) && i.category === "cyberware");
  const techItems = char.inventory.filter((i) => i.specialty && i.category === "tech");

  const fid = useMemo(() => fileHash(char.name), [char.name]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(char.name || "character").replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [char]);

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

          {(hackingItems.length > 0 || char.programs?.length > 0) && (() => {
                const verbLookup = Object.fromEntries(hacking.verbs.map((v) => [v.name, v]));
                const subjectLookup = Object.fromEntries(hacking.subjects.map((s) => [s.name, s]));
                const verbs = (char.programs || []).filter((p) => p.elementType === "verb");
                const subjects = (char.programs || []).filter((p) => p.elementType === "subject");
                const deckMemory = char.hackingStats?.deckMemory || 0;
                const loadedCount = loadedPrograms.size;
                const memoryFull = loadedCount >= deckMemory;

                const toggleLoaded = (name) => {
                  setLoadedPrograms((prev) => {
                    const next = new Set(prev);
                    if (next.has(name)) {
                      next.delete(name);
                    } else if (next.size < deckMemory) {
                      next.add(name);
                    }
                    return next;
                  });
                };

                return (
            <section className="dos-section">
              <SectionHeader num="11" label="Hacking" />

              {char.hackingStats && (
                <div className="dos-hacking-stats">
                  <div className="dos-defense-stat">
                    <span className="dos-defense-val">{char.hackingStats.accessPool}</span>
                    <span className="dos-defense-label">Access Pool</span>
                  </div>
                  <div className="dos-defense-stat">
                    <span className="dos-defense-val">+{char.hackingStats.baseHackingBonus}</span>
                    <span className="dos-defense-label">Hack Bonus</span>
                  </div>
                  <div className="dos-defense-stat">
                    <span className="dos-defense-val">
                      {char.hackingStats.interfacePenalty === 0 ? "Jack" : "VR -1"}
                    </span>
                    <span className="dos-defense-label">Interface</span>
                  </div>
                </div>
              )}

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

              {hackerCyberware.map((item) => (
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

              {char.programs?.length > 0 && (() => {
                const loadedVerbs = verbs.filter((p) => loadedPrograms.has(p.name));
                const loadedSubjects = subjects.filter((p) => loadedPrograms.has(p.name));

                return (
                <div className="dos-programs">
                  {/* ── Deck Memory: segmented bar ── */}
                  <div className="dos-programs-header">
                    <span className="dos-programs-label">Deck Memory</span>
                    <div className="dos-mem-track">
                      {Array.from({ length: deckMemory }, (_, i) => (
                        <div key={i} className={`dos-mem-seg${i < loadedCount ? " dos-mem-seg-filled" : ""}`} />
                      ))}
                      <span className={`dos-mem-count${memoryFull ? " dos-mem-count-full" : ""}`}>
                        {loadedCount}/{deckMemory}
                      </span>
                    </div>
                  </div>

                  {/* ── Loaded Programs: always-visible reference tables ── */}
                  {loadedVerbs.length > 0 && (
                    <>
                      <div className="dos-loaded-sublabel dos-loaded-sublabel-verb">Loaded Verbs</div>
                      <table className="dos-loaded-table dos-loaded-table-verb">
                        <thead>
                          <tr>
                            <th>Verb</th>
                            <th>Targets</th>
                            <th>Access</th>
                            <th>Mod</th>
                            <th>Effect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadedVerbs.map((p) => {
                            const data = verbLookup[p.name];
                            return (
                              <tr key={p.name}>
                                <td className="dos-loaded-name">{p.name}</td>
                                <td>{data?.targetsAllowed?.join("/") || "\u2014"}</td>
                                <td>{data?.accessCost ?? "\u2014"}{data?.selfTerminating ? "*" : ""}</td>
                                <td>{data?.skillCheckModifier != null ? (data.skillCheckModifier >= 0 ? `+${data.skillCheckModifier}` : data.skillCheckModifier) : "\u2014"}</td>
                                <td className="dos-loaded-use">{data?.use || "\u2014"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}

                  {loadedSubjects.length > 0 && (
                    <>
                      <div className="dos-loaded-sublabel dos-loaded-sublabel-subject">Loaded Subjects</div>
                      <table className="dos-loaded-table dos-loaded-table-subject">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Type</th>
                            <th>Effect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadedSubjects.map((p) => {
                            const data = subjectLookup[p.name];
                            return (
                              <tr key={p.name}>
                                <td className="dos-loaded-name">{p.name}</td>
                                <td>{data?.type || "\u2014"}</td>
                                <td className="dos-loaded-use">{data?.use || "\u2014"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}

                  {loadedCount === 0 && (
                    <div className="dos-loaded-empty">No programs loaded — open the library below to slot programs into deck memory.</div>
                  )}

                  {loadedVerbs.some((p) => verbLookup[p.name]?.selfTerminating) && (
                    <div className="dos-loaded-footnote">* Self-terminating (frees memory after use)</div>
                  )}

                  {/* ── Program Library: collapsible, verbose ── */}
                  <button
                    className={`dos-library-toggle${libraryOpen ? " dos-library-toggle-open" : ""}`}
                    onClick={() => setLibraryOpen((v) => !v)}
                  >
                    <span className="dos-library-toggle-icon">{libraryOpen ? "\u25BC" : "\u25B6"}</span>
                    <span>Program Library</span>
                    <span className="dos-library-toggle-count">{char.programs.length} programs</span>
                  </button>

                  {libraryOpen && (
                    <div className="dos-library">
                      {verbs.length > 0 && (
                        <div className="dos-library-section">
                          <div className="dos-library-divider dos-library-divider-verb">Verbs</div>
                          {verbs.map((p) => {
                            const data = verbLookup[p.name];
                            const isLoaded = loadedPrograms.has(p.name);
                            const disabled = !isLoaded && memoryFull;
                            return (
                              <div key={p.name} className={`dos-library-item${isLoaded ? " dos-library-item-loaded" : ""}`}>
                                <div className="dos-library-item-top">
                                  <span className="dos-library-item-name dos-library-item-name-verb">{p.name}</span>
                                  <div className="dos-library-item-stats">
                                    <span>{data?.targetsAllowed?.join(" / ")}</span>
                                    <span>A:{data?.accessCost ?? "\u2014"}{data?.selfTerminating ? " ST" : ""}</span>
                                    {data?.skillCheckModifier != null && (
                                      <span>{data.skillCheckModifier >= 0 ? `+${data.skillCheckModifier}` : data.skillCheckModifier}</span>
                                    )}
                                  </div>
                                  <button
                                    className={`dos-library-slot-btn${isLoaded ? " dos-library-slot-btn-loaded" : ""}`}
                                    disabled={disabled}
                                    onClick={() => toggleLoaded(p.name)}
                                  >
                                    {isLoaded ? "Unload" : "Load"}
                                  </button>
                                </div>
                                <div className="dos-library-item-desc">{data?.description || data?.use || "\u2014"}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {subjects.length > 0 && (
                        <div className="dos-library-section">
                          <div className="dos-library-divider dos-library-divider-subject">Subjects</div>
                          {subjects.map((p) => {
                            const data = subjectLookup[p.name];
                            const isLoaded = loadedPrograms.has(p.name);
                            const disabled = !isLoaded && memoryFull;
                            return (
                              <div key={p.name} className={`dos-library-item${isLoaded ? " dos-library-item-loaded" : ""}`}>
                                <div className="dos-library-item-top">
                                  <span className="dos-library-item-name dos-library-item-name-subject">{p.name}</span>
                                  <div className="dos-library-item-stats">
                                    <span>{data?.type || "\u2014"}</span>
                                  </div>
                                  <button
                                    className={`dos-library-slot-btn${isLoaded ? " dos-library-slot-btn-loaded" : ""}`}
                                    disabled={disabled}
                                    onClick={() => toggleLoaded(p.name)}
                                  >
                                    {isLoaded ? "Unload" : "Load"}
                                  </button>
                                </div>
                                <div className="dos-library-item-desc">{data?.description || data?.use || "\u2014"}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })()}
            </section>
                );
          })()}

          {vehicleDroneItems.length > 0 && (
            <section className="dos-section">
              <SectionHeader num="12" label="Vehicles & Drones" />
              {vehicleDroneItems.map((item, idx) => (
                <GearBlock
                  key={`${item.name}-${idx}`}
                  item={item}
                  typeLabel={item.category}
                  pills={[
                    item.stats.hp && ["HP", item.stats.hp],
                    item.stats.ac && ["AC", item.stats.ac],
                    item.stats.speed !== undefined && ["Speed", item.stats.speed],
                    item.stats.armor && ["Armor", item.stats.armor],
                    item.stats.move && ["Move", item.stats.move],
                    item.stats.traumaTarget && ["Trauma Tgt", item.stats.traumaTarget],
                    item.stats.crew && ["Crew", item.stats.crew],
                    item.stats.power && ["Power", item.stats.power],
                    item.stats.mass && ["Mass", item.stats.mass],
                    item.stats.hardpoints !== undefined && ["Hrdpt", item.stats.hardpoints],
                    item.stats.fittings !== undefined && ["Fittings", item.stats.fittings],
                    item.stats.hardpoints !== undefined && ["Hardpoints", item.stats.hardpoints],
                    item.stats.enc && ["ENC", item.stats.enc],
                  ].filter(Boolean)}
                  fittings={item.fittings}
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

      <div className="dos-download-row">
        <button className="btn-action" onClick={handleDownload}>
          <span className="btn-prompt">&gt;_</span> Download JSON
        </button>
        <button
          className={`btn-action${saveStatus === "saved" ? " btn-action-success" : ""}`}
          onClick={handleSaveToRoster}
        >
          <span className="btn-prompt">&gt;_</span>
          {saveStatus === "saved" ? "Saved!" : "Save to Roster"}
        </button>
      </div>
    </div>
  );
}
