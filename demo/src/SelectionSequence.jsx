import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function SelectionSequence({
  allItems,
  offeredItems,
  renderCardContent,
  onComplete,
  poolLabel,
}) {
  const [phase, setPhase] = useState("revealing");
  const [revealedNames, setRevealedNames] = useState(new Set());
  const [eliminatedNames, setEliminatedNames] = useState(new Set());
  const [selectedName, setSelectedName] = useState(null);
  const [confirmedName, setConfirmedName] = useState(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  /* ---- Reveal animation ---- */
  useEffect(() => {
    let cancelled = false;

    const toReveal = offeredItems.map((item) => item.name);
    for (let i = toReveal.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [toReveal[i], toReveal[j]] = [toReveal[j], toReveal[i]];
    }

    const nonOffered = new Set(
      allItems
        .filter((item) => !offeredItems.some((o) => o.name === item.name))
        .map((item) => item.name)
    );

    async function run() {
      await sleep(600);
      for (let i = 0; i < toReveal.length; i++) {
        if (cancelled) return;
        setRevealedNames((prev) => new Set([...prev, toReveal[i]]));
        await sleep(500);
      }
      if (cancelled) return;
      setPhase("highlighting");
      await sleep(1000);
      if (cancelled) return;
      setEliminatedNames(nonOffered);
      setPhase("expanding");
      await sleep(1000);
      if (!cancelled) setPhase("pickable");
    }

    run();
    return () => { cancelled = true; };
  }, []);

  /* ---- Confirm handler ---- */
  const handleConfirm = (name) => {
    setConfirmedName(name);
    const unselected = offeredItems
      .filter((o) => o.name !== name)
      .map((o) => o.name);
    setEliminatedNames((prev) => new Set([...prev, ...unselected]));
    setPhase("confirmed");

    setTimeout(() => {
      onCompleteRef.current(name);
    }, 800);
  };

  /* ---- Render ---- */
  const isRevealing = phase === "revealing" || phase === "highlighting";

  return (
    <div className="bg-sequence">
      <motion.div
        key="selection"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {isRevealing && (
            <motion.div
              key="pool-header"
              className="bg-item-row bg-pool-header"
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
              transition={{ duration: 0.3 }}
            >
              <span>#</span>
              <span>{poolLabel || "Name"}</span>
              <span>Description</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-pool-list">
          <AnimatePresence>
            {allItems
              .filter((item) => !eliminatedNames.has(item.name))
              .map((item) => {
                const isRevealed = revealedNames.has(item.name);
                const isDimmed = isRevealing && !isRevealed;
                const showCyan =
                  (isRevealing && isRevealed) ||
                  phase === "expanding" ||
                  phase === "pickable";
                const isConfirmed = confirmedName === item.name;
                const isExpanded =
                  phase === "expanding" || phase === "pickable" || isConfirmed;
                const isPickable = phase === "pickable" && !confirmedName;
                const isSelected = selectedName === item.name;
                const poolIdx = allItems.indexOf(item) + 1;
                const offerIdx = offeredItems.findIndex(
                  (o) => o.name === item.name
                );

                return (
                  <motion.div
                    key={item.name}
                    layout
                    className={`bg-item${isExpanded ? " bg-item-expanded" : ""}${isPickable ? " bg-item-pickable" : ""}${isSelected ? " bg-item-selected" : ""}${isDimmed ? " bg-item-dimmed" : ""}`}
                    animate={{
                      backgroundColor:
                        isSelected || isConfirmed
                          ? "rgba(255, 182, 39, 0.1)"
                          : showCyan
                            ? "rgba(0, 229, 255, 0.08)"
                            : "rgba(0, 0, 0, 0)",
                      borderColor:
                        isSelected || isConfirmed
                          ? "rgba(255, 182, 39, 0.5)"
                          : showCyan
                            ? "rgba(0, 229, 255, 0.2)"
                            : "rgba(255, 255, 255, 0.06)",
                      opacity: isDimmed ? 0.3 : 1,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      marginBottom: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                      overflow: "hidden",
                    }}
                    transition={{
                      layout: { duration: 0.3, ease: "easeInOut" },
                      backgroundColor: { duration: 0.4 },
                      borderColor: { duration: 0.4 },
                      opacity: { duration: 0.4 },
                      default: { duration: 0.2 },
                    }}
                    onClick={
                      isPickable ? () => setSelectedName(item.name) : undefined
                    }
                  >
                    {!isExpanded && (
                      <div className="bg-item-row">
                        <span
                          className={`bg-pool-idx${showCyan ? " bg-highlighted" : ""}`}
                        >
                          {poolIdx}
                        </span>
                        <span
                          className={`bg-pool-name${showCyan ? " bg-highlighted" : ""}`}
                        >
                          {item.name}
                        </span>
                        <span className="bg-pool-desc">
                          {item.description}
                        </span>
                      </div>
                    )}

                    {isExpanded && (
                      <motion.div
                        className="bg-item-details"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                      >
                        {renderCardContent(item, offerIdx)}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedName && !confirmedName && (
            <motion.div
              key="confirm"
              className="bg-confirm-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <button
                className="btn-action"
                onClick={() => handleConfirm(selectedName)}
              >
                <span className="btn-prompt">&gt;_</span> Confirm{" "}
                {selectedName}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
