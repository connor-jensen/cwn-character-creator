import { useState } from "react";
import {
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
} from "../../cwn-engine.js";

const ATTR_NAMES = [
  "strength", "dexterity", "constitution",
  "intelligence", "wisdom", "charisma",
];

const ALL_SKILLS = [
  "Connect", "Drive", "Exert", "Fight", "Fix", "Heal",
  "Know", "Notice", "Program", "Shoot", "Sneak", "Talk",
];

const ATTR_ABBREV = {
  str: "strength", strength: "strength",
  dex: "dexterity", dexterity: "dexterity",
  con: "constitution", constitution: "constitution",
  int: "intelligence", intelligence: "intelligence",
  wis: "wisdom", wisdom: "wisdom",
  cha: "charisma", charisma: "charisma",
};

function resolveAttrMod(char, attrStr) {
  if (!attrStr) return 0;
  // "Str/Dex" → use whichever modifier is better
  const parts = attrStr.split("/").map((s) => s.trim().toLowerCase());
  const mods = parts.map((p) => {
    const full = ATTR_ABBREV[p];
    return full ? char.attributes[full].mod : 0;
  });
  return Math.max(...mods);
}

function getWeaponSkill(item) {
  if (item.specialty) {
    const attr = (item.stats.attribute || "").toLowerCase();
    // Str-only weapons are melee → Fight
    if (attr === "str") return "Fight";
    return "Shoot";
  }
  if (item.type === "Firearm") return "Shoot";
  return "Fight";
}

function formatDamage(baseDmg, mod) {
  if (!baseDmg || baseDmg === "\u2014" || mod === 0) return baseDmg;
  // Handle existing modifier in damage string, e.g. "1d10+2"
  const match = baseDmg.match(/^(.+?)([+-]\d+)$/);
  if (match) {
    const dice = match[1];
    const total = parseInt(match[2]) + mod;
    if (total === 0) return dice;
    return `${dice}${total > 0 ? "+" : ""}${total}`;
  }
  return `${baseDmg}${mod > 0 ? "+" : ""}${mod}`;
}

function formatShock(baseShock, mod) {
  if (!baseShock || baseShock === "\u2014" || mod === 0) return baseShock;
  const match = baseShock.match(/^(\d+)(\/AC\s*\d+)$/);
  if (!match) return baseShock;
  return `${parseInt(match[1]) + mod}${match[2]}`;
}

function normalizeWeapon(item, char) {
  let name, baseDamage, range, traumaDie, traumaMult, mag, baseShock, attrStr;

  if (item.specialty) {
    const s = item.stats;
    name = item.name;
    baseDamage = s.damage || "\u2014";
    range = s.range || "\u2014";
    baseShock = s.shock || "\u2014";
    mag = s.mag != null ? s.mag : "\u2014";
    attrStr = s.attribute || "";
    if (s.trauma) {
      const parts = s.trauma.split("/");
      traumaDie = parts[0] || "";
      traumaMult = parts[1] || "";
    } else {
      traumaDie = "";
      traumaMult = "";
    }
  } else {
    name = item.name;
    baseDamage = item.damage || "\u2014";
    range = item.range || "\u2014";
    baseShock = item.shock || "\u2014";
    mag = item.mag != null ? item.mag : "\u2014";
    attrStr = item.attribute || "";
    traumaDie = item.trauma_die || "";
    traumaMult = item.trauma_rating || "";
  }

  const attrMod = resolveAttrMod(char, attrStr);
  const skill = getWeaponSkill(item);
  const skillLevel = char.skills[skill] !== undefined ? char.skills[skill] : -2;
  const hit = char.bab + skillLevel + attrMod;

  return {
    name,
    hit,
    damage: formatDamage(baseDamage, attrMod),
    range,
    traumaDie,
    traumaMult,
    mag,
    shock: formatShock(baseShock, attrMod),
  };
}

function DossierContact({ contact }) {
  const [expanded, setExpanded] = useState(false);
  const c = contact;

  if (!c.whatTheyCanDoForYou) {
    return (
      <div className="sheet-list-item">
        <strong>
          {c.name || "Unnamed"}{" "}
          <span className="sheet-contact-rel">{c.relationship}</span>
        </strong>
        {c.description && <span className="sheet-item-desc">{c.description}</span>}
      </div>
    );
  }

  return (
    <div className="sheet-list-item sheet-contact">
      <div className="sheet-contact-header">
        <strong>
          {c.name || "Unnamed"}{" "}
          <span className="sheet-contact-rel">{c.relationship}</span>
        </strong>
        <button
          className="sheet-contact-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "\u25B4" : "\u25BE"}
        </button>
      </div>
      <ul className="sheet-contact-abilities">
        {c.whatTheyCanDoForYou.map((ability, i) => (
          <li key={i}>{ability}</li>
        ))}
      </ul>
      {expanded && (
        <div className="sheet-contact-details">
          <div className="sheet-contact-detail"><span>Circle:</span> {c.socialCircle}</div>
          <div className="sheet-contact-detail"><span>Known:</span> {c.howWellKnown}</div>
          <div className="sheet-contact-detail"><span>Met:</span> {c.howMet}</div>
          <div className="sheet-contact-detail"><span>Last:</span> {c.lastInteraction}</div>
          <div className="sheet-contact-detail"><span>They get:</span> {c.whatTheyGet}</div>
        </div>
      )}
    </div>
  );
}

export default function CharacterDossier({ char }) {
  const bgObj = char.background && allBackgrounds.find((b) => b.name === char.background);
  const edgeObjs = char.edges.map((name) => allEdges.find((e) => e.name === name)).filter(Boolean);

  // Compute effective armor values from all equipped armor
  // AC = armor base AC + DEX modifier (unarmored base is 10)
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

  // DEX modifier applies to both melee and ranged AC
  effectiveMeleeAC += dexMod;
  effectiveRangedAC += dexMod;

  const totalSoak = char.damageSoak + armorSoak;

  // System strain: cyberware package + specialty cyberware items
  let systemStrainUsed = char.cyberwarePackage?.totalSystemStrain || 0;
  for (const item of char.inventory) {
    if (item.specialty && item.category === "cyberware" && item.stats.strain) {
      systemStrainUsed += item.stats.strain;
    }
  }
  const systemStrainMax = char.attributes.constitution.score;

  // Collect armor names
  const armorItems = char.inventory.filter((i) => i.category === "armor");
  const armorName = armorItems.map((a) => a.name).join(" + ") || "Unarmored";

  // Categorize inventory
  const weapons = char.inventory.filter((i) => i.category === "weapon");
  const hackingItems = char.inventory.filter((i) => i.specialty && i.category === "hacking");
  const vehicleDroneItems = char.inventory.filter((i) => i.specialty && (i.category === "vehicle" || i.category === "drone"));
  const cyberwareSpecialty = char.inventory.filter((i) => i.specialty && i.category === "cyberware");
  const techItems = char.inventory.filter((i) => i.specialty && i.category === "tech");

  return (
    <div className="dossier">
      {/* Header: Name + Background */}
      <div className="dossier-header">
        <h2 className="dossier-name">{char.name}</h2>
        {bgObj && (
          <div className="dossier-bg">
            <span className="sheet-bg-tag">{bgObj.name}</span>
            <p className="sheet-bg-desc">{bgObj.description}</p>
          </div>
        )}
      </div>

      <div className="dossier-grid">
        {/* ---- Left Column ---- */}
        <div className="dossier-col">
          {/* Attributes */}
          <div className="sheet-section dossier-section-first">
            <div className="sheet-section-title"><span>Attributes</span></div>
            <div className="attr-grid">
              {ATTR_NAMES.map((a) => (
                <div key={a} className="attr-row">
                  <span className="attr-name">{a.slice(0, 3).toUpperCase()}</span>
                  <span className="attr-score">{char.attributes[a].score}</span>
                  <span className={`attr-mod ${char.attributes[a].mod > 0 ? "positive" : char.attributes[a].mod < 0 ? "negative" : "neutral"}`}>
                    {char.attributes[a].mod >= 0 ? "+" : ""}{char.attributes[a].mod}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="sheet-section">
            <div className="sheet-section-title"><span>Skills</span></div>
            <div className="skill-grid">
              {ALL_SKILLS.map((name) => {
                const lvl = char.skills[name];
                const hasSkill = lvl !== undefined;
                return (
                  <span key={name} className={`skill-pill${hasSkill ? "" : " skill-pill-untrained"}`}>
                    {name}
                    <span className="skill-level">{hasSkill ? lvl : "-1"}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Edges */}
          {edgeObjs.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Edges</span></div>
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

          {/* Foci */}
          {char.foci.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Foci</span></div>
              <div className="sheet-list">
                {char.foci.map((f) => {
                  const data = allFoci.find((d) => d.name === f.name);
                  return (
                    <div key={f.name} className="sheet-list-item">
                      <strong>
                        {f.name}{" "}
                        <span style={{ color: "var(--amber)" }}>L{f.level}</span>
                      </strong>
                      {data && <span className="sheet-item-desc">{data.level_1}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts */}
          {char.contacts.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Contacts</span></div>
              <div className="sheet-list">
                {char.contacts.map((c, i) => (
                  <DossierContact key={i} contact={c} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Right Column ---- */}
        <div className="dossier-col">
          {/* Combat Stats */}
          <div className="sheet-section dossier-section-first">
            <div className="sheet-section-title"><span>Combat</span></div>
            <div className="dossier-combat-grid">
              <div className="combat-stat hp">
                <span className="combat-stat-label">HP</span>
                <span className="combat-stat-value">{char.hp}</span>
              </div>
              <div className="combat-stat">
                <span className="combat-stat-label">BAB</span>
                <span className="combat-stat-value">+{char.bab}</span>
              </div>
              <div className="combat-stat">
                <span className="combat-stat-label">Init</span>
                <span className="combat-stat-value">
                  {char.initiative >= 0 ? "+" : ""}{char.initiative}
                </span>
              </div>
              <div className="combat-stat">
                <span className="combat-stat-label">Sys Strain</span>
                <span className="combat-stat-value">{systemStrainUsed}/{systemStrainMax}</span>
              </div>
            </div>
          </div>

          {/* Saving Throws */}
          <div className="sheet-section">
            <div className="sheet-section-title"><span>Saving Throws</span></div>
            <div className="dossier-inline-row">
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Physical</span>
                <span className="dossier-inline-value">{char.savingThrows.physical}+</span>
              </div>
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Evasion</span>
                <span className="dossier-inline-value">{char.savingThrows.evasion}+</span>
              </div>
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Mental</span>
                <span className="dossier-inline-value">{char.savingThrows.mental}+</span>
              </div>
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Luck</span>
                <span className="dossier-inline-value">{char.savingThrows.luck}+</span>
              </div>
            </div>
          </div>

          {/* Armor */}
          <div className="sheet-section">
            <div className="sheet-section-title"><span>Armor</span></div>
            <div className="dossier-armor-name">{armorName}</div>
            <div className="dossier-inline-row">
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Melee AC</span>
                <span className="dossier-inline-value">{effectiveMeleeAC}</span>
              </div>
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Ranged AC</span>
                <span className="dossier-inline-value">{effectiveRangedAC}</span>
              </div>
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Soak</span>
                <span className="dossier-inline-value">{totalSoak}</span>
              </div>
              <div className="dossier-inline-stat">
                <span className="dossier-inline-label">Trauma Tgt</span>
                <span className="dossier-inline-value">{effectiveTraumaTarget}</span>
              </div>
            </div>
          </div>

          {/* Weapons Table */}
          {weapons.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Weapons</span></div>
              <div className="dossier-table-wrap">
                <table className="dossier-weapon-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Hit</th>
                      <th>DMG</th>
                      <th>Shock</th>
                      <th>Range</th>
                      <th>Trauma</th>
                      <th>Mag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.map((w) => {
                      const nw = normalizeWeapon(w, char);
                      return (
                        <tr key={nw.name}>
                          <td className="dossier-weapon-name">{nw.name}</td>
                          <td className="dossier-weapon-hit">{nw.hit >= 0 ? `+${nw.hit}` : nw.hit}</td>
                          <td>{nw.damage}</td>
                          <td>{nw.shock}</td>
                          <td>{nw.range}</td>
                          <td>{nw.traumaDie}{nw.traumaMult ? ` ${nw.traumaMult}` : ""}</td>
                          <td>{nw.mag}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cyberware */}
          {(char.cyberwarePackage || cyberwareSpecialty.length > 0) && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Cyberware</span></div>
              {char.cyberwarePackage && (
                <>
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
                </>
              )}
              {cyberwareSpecialty.map((item) => (
                <div key={item.name} className="dossier-specialty-block">
                  <div className="sheet-gear-name">{item.name}</div>
                  <p className="sheet-item-desc">{item.description}</p>
                  <div className="sheet-gear-stats">
                    {item.stats.strain !== undefined && <span className="sheet-gear-pill">Strain {item.stats.strain}</span>}
                    {item.stats.concealment && <span className="sheet-gear-pill">Conceal {item.stats.concealment}</span>}
                    {item.stats.effect && <span className="sheet-gear-pill">{item.stats.effect}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cyberdeck / Hacking */}
          {hackingItems.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Cyberdeck</span></div>
              {hackingItems.map((item) => (
                <div key={item.name} className="dossier-specialty-block">
                  <div className="sheet-gear-name">{item.name}</div>
                  <p className="sheet-item-desc">{item.description}</p>
                  <div className="sheet-gear-stats">
                    {item.stats.memory && <span className="sheet-gear-pill">MEM {item.stats.memory}</span>}
                    {item.stats.shielding && <span className="sheet-gear-pill">Shield {item.stats.shielding}</span>}
                    {item.stats.cpu && <span className="sheet-gear-pill">CPU {item.stats.cpu}</span>}
                    {item.stats.bonusAccess && <span className="sheet-gear-pill">Access +{item.stats.bonusAccess}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vehicle / Drone */}
          {vehicleDroneItems.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Vehicles &amp; Drones</span></div>
              {vehicleDroneItems.map((item) => (
                <div key={item.name} className="dossier-specialty-block">
                  <div className="sheet-gear-name">
                    {item.name}
                    <span className="sheet-gear-type-tag">{item.category}</span>
                  </div>
                  <p className="sheet-item-desc">{item.description}</p>
                  <div className="sheet-gear-stats">
                    {item.stats.hp && <span className="sheet-gear-pill">HP {item.stats.hp}</span>}
                    {item.stats.ac && <span className="sheet-gear-pill">AC {item.stats.ac}</span>}
                    {item.stats.speed !== undefined && <span className="sheet-gear-pill">Speed {item.stats.speed}</span>}
                    {item.stats.move && <span className="sheet-gear-pill">Move {item.stats.move}</span>}
                    {item.stats.traumaTarget && <span className="sheet-gear-pill">Trauma Tgt {item.stats.traumaTarget}</span>}
                    {item.stats.crew && <span className="sheet-gear-pill">Crew {item.stats.crew}</span>}
                    {item.stats.fittings !== undefined && <span className="sheet-gear-pill">Fittings {item.stats.fittings}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tech Gear */}
          {techItems.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title"><span>Tech</span></div>
              {techItems.map((item) => (
                <div key={item.name} className="dossier-specialty-block">
                  <div className="sheet-gear-name">{item.name}</div>
                  <p className="sheet-item-desc">{item.description}</p>
                  <div className="sheet-gear-stats">
                    {item.stats.effect && <span className="sheet-gear-pill">{item.stats.effect}</span>}
                    {item.stats.enc && <span className="sheet-gear-pill">ENC {item.stats.enc}</span>}
                    {item.stats.special && <span className="sheet-gear-pill">{item.stats.special}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commented-out sections for future implementation */}
      {/* <div className="sheet-section">
        <div className="sheet-section-title"><span>Stowed Equipment</span></div>
        <p className="sheet-item-desc">Readied / stowed gear tracking not yet implemented.</p>
      </div> */}
      {/* <div className="sheet-section">
        <div className="sheet-section-title"><span>Stored Equipment</span></div>
        <p className="sheet-item-desc">Off-person storage not yet implemented.</p>
      </div> */}
      {/* <div className="sheet-section">
        <div className="sheet-section-title"><span>Aliases / IDs</span></div>
        <p className="sheet-item-desc">Identity tracking not yet implemented.</p>
      </div> */}
      {/* <div className="sheet-section">
        <div className="sheet-section-title"><span>Languages Known</span></div>
        <p className="sheet-item-desc">Language tracking not yet implemented.</p>
      </div> */}
    </div>
  );
}
