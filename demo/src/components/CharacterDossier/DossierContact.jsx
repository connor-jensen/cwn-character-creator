import { useState } from "react";

export default function DossierContact({ contact }) {
  const [expanded, setExpanded] = useState(false);
  const c = contact;

  if (!c.whatTheyCanDoForYou) {
    return (
      <div className="dos-contact-card">
        <div className="dos-contact-top">
          <span className="dos-contact-name">{c.name || "Unnamed"}</span>
          <span className="dos-contact-rel">{c.relationship}</span>
        </div>
        {c.description && <p className="dos-contact-desc">{c.description}</p>}
      </div>
    );
  }

  return (
    <div className={`dos-contact-card${expanded ? " dos-contact-expanded" : ""}`}>
      <div className="dos-contact-top">
        <div className="dos-contact-identity">
          <span className="dos-contact-name">{c.name || "Unnamed"}</span>
          <span className="dos-contact-rel">{c.relationship}</span>
        </div>
        <button
          className="dos-contact-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "\u25B4" : "\u25BE"}
        </button>
      </div>
      <ul className="dos-contact-abilities">
        {c.whatTheyCanDoForYou.map((ability, i) => (
          <li key={i}>{ability}</li>
        ))}
      </ul>
      {expanded && (
        <div className="dos-contact-details">
          <div className="dos-contact-detail"><span>Circle</span>{c.socialCircle}</div>
          <div className="dos-contact-detail"><span>Known</span>{c.howWellKnown}</div>
          <div className="dos-contact-detail"><span>Met</span>{c.howMet}</div>
          <div className="dos-contact-detail"><span>Last seen</span>{c.lastInteraction}</div>
          <div className="dos-contact-detail"><span>They get</span>{c.whatTheyGet}</div>
        </div>
      )}
    </div>
  );
}
