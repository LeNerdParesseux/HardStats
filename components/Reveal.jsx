// components/Reveal.jsx
"use client";

import { motion } from "framer-motion";

// Conteneur qui anime à l'apparition et garde l'état "show" pour les updates.
// Stagger pour révéler les enfants sans remonter en "hidden" lors des filtres.
const container = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1, y: 0,
    transition: { when: "beforeChildren", staggerChildren: 0.06 }
  }
};

const item = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 160, damping: 16 } },
};

export function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children }) {
  return (
    <motion.div layout variants={item}>
      {children}
    </motion.div>
  );
}
