import { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion } from "motion/react";
import ConfirmButton from "../ConfirmButton";
import "./ContactSequence.css";

const DETAIL_ROWS = [
  { key: "socialCircle", label: "Social Circle" },
  { key: "howWellKnown", label: "How Well Known" },
  { key: "howMet", label: "How You Met" },
  { key: "lastInteraction", label: "Last Interaction" },
  { key: "whatTheyGet", label: "What They Get From You" },
];

/* ---- Main ContactSequence ---- */

export default function ContactSequence({ contacts, onComplete }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [names, setNames] = useState(() => contacts.map(() => ""));

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Reveal contacts one at a time with a staggered delay
  useEffect(() => {
    if (revealedCount >= contacts.length) return;
    const timer = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, revealedCount === 0 ? 400 : 1500);
    return () => clearTimeout(timer);
  }, [revealedCount, contacts.length]);

  const allRevealed = revealedCount >= contacts.length;
  const allNamed = names.every((n) => n.trim().length > 0);

  const setName = (idx, value) => {
    setNames((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const friendCount = contacts.filter((c) => c.relationship === "friend").length;
  const acquaintanceCount = contacts.filter((c) => c.relationship === "acquaintance").length;

  const getContactLabel = (contact, idx) => {
    let friendsSoFar = 0;
    let acquaintancesSoFar = 0;
    for (let i = 0; i <= idx; i++) {
      if (contacts[i].relationship === "friend") friendsSoFar++;
      else acquaintancesSoFar++;
    }
    return contact.relationship === "friend"
      ? `Friend${friendCount > 1 ? ` #${friendsSoFar}` : ""}`
      : `Acquaintance${acquaintanceCount > 1 ? ` #${acquaintancesSoFar}` : ""}`;
  };

  return (
    <div className="contact-sequence">
      <p className="step-desc">
        Your charisma has attracted {contacts.length} starting contact{contacts.length > 1 ? "s" : ""}.
        Contacts are NPCs you can call on once per session for help, but they won&apos;t come on missions with you.
      </p>

      {contacts.slice(0, revealedCount).map((contact, idx) => (
        <motion.div
          key={idx}
          className="contact-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="contact-card-header">
            <span className="contact-relationship-tag">
              {contact.relationship}
            </span>
            <h3 className="contact-label">{getContactLabel(contact, idx)}</h3>
          </div>

          <div className="contact-name-input-wrap">
            <input
              className="contact-name-input"
              type="text"
              placeholder="Enter contact name..."
              value={names[idx]}
              onChange={(e) => setName(idx, e.target.value)}
              autoFocus={idx === revealedCount - 1}
            />
          </div>

          <div className="contact-detail-list">
            {DETAIL_ROWS.map((row, ri) => (
              <motion.div
                key={row.key}
                className="contact-detail-row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: ri * 0.08 }}
              >
                <span className="contact-detail-label">{row.label}</span>
                <span className="contact-detail-value">{contact[row.key]}</span>
              </motion.div>
            ))}

            {/* What they can do — just show the resolved abilities */}
            <motion.div
              className="contact-detail-row"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: DETAIL_ROWS.length * 0.08 }}
            >
              <span className="contact-detail-label">What They Can Do</span>
              <span className="contact-detail-value">
                {contact.whatTheyCanDoForYou.join("; ")}
              </span>
            </motion.div>
          </div>
        </motion.div>
      ))}

      {/* Confirm button after all contacts revealed and named */}
      <ConfirmButton
        isVisible={allRevealed}
        label="Confirm Contacts"
        onClick={() => onCompleteRef.current(names)}
        disabled={!allNamed}
        delay={0.3}
      />
    </div>
  );
}
