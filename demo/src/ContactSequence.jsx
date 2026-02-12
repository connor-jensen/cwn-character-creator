import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const DETAIL_ROWS = [
  { key: "socialCircle", label: "Social Circle" },
  { key: "howWellKnown", label: "How Well Known" },
  { key: "howMet", label: "How You Met" },
  { key: "lastInteraction", label: "Last Interaction" },
  { key: "whatTheyGet", label: "What They Get From You" },
];

export default function ContactSequence({ contacts, onComplete }) {
  const [revealedCount, setRevealedCount] = useState(0);

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

            {contact.whatTheyCanDoForYou.map((ability, ai) => (
              <motion.div
                key={`do-${ai}`}
                className="contact-detail-row contact-detail-highlight"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: (DETAIL_ROWS.length + ai) * 0.08 }}
              >
                <span className="contact-detail-label">
                  {contact.whatTheyCanDoForYou.length > 1 ? `What They Do (${ai + 1})` : "What They Do"}
                </span>
                <span className="contact-detail-value">{ability}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Confirm button after all contacts revealed */}
      <AnimatePresence>
        {allRevealed && (
          <motion.div
            className="contact-confirm-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <button className="btn-action" onClick={() => onCompleteRef.current()}>
              <span className="btn-prompt">&gt;_</span> Confirm Contacts
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
