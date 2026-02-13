import { useState } from "react";

export default function SheetContact({ contact }) {
  const [expanded, setExpanded] = useState(false);
  const c = contact;

  // Old-format contacts (from Voice of the People)
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
