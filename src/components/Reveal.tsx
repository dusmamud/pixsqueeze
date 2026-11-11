import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

// One restrained scroll reveal for the home page's lower sections.
// Small rise (14px) + short fade (0.45s), once, transform/opacity only,
// same ease as the batch progress bar. With reduced motion the element
// renders at its final state immediately (initial={false}) — never hidden.
// During the Node prerender initial styles are not applied, so no-JS
// HTML is fully visible too.
export default function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      data-reveal
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
