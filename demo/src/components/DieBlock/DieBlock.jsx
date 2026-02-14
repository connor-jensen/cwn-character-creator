// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion } from "motion/react";

const LOCK_ANIMATION = {
  scale: [1, 1.25, 0.95, 1],
  boxShadow: [
    "0 0 0px rgba(0,229,255,0)",
    "0 0 30px rgba(0,229,255,0.6)",
    "0 0 15px rgba(0,229,255,0.3)",
    "0 0 8px rgba(0,229,255,0.15)",
  ],
};

const LOCK_TRANSITION = { duration: 0.5, ease: "easeOut" };

export default function DieBlock({ value, locked, animate = false, mini, className }) {
  const classes = [
    "die-block",
    locked ? "locked" : "spinning",
    mini && "mini",
    className,
  ].filter(Boolean).join(" ");

  if (!animate) {
    return <div className={classes}>{value}</div>;
  }

  return (
    <motion.div
      className={classes}
      animate={locked ? LOCK_ANIMATION : {}}
      transition={locked ? LOCK_TRANSITION : {}}
    >
      {value}
    </motion.div>
  );
}
