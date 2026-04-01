import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function CountUp({ value, duration = 1, prefix = '', suffix = '', decimals = 0 }: CountUpProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return `${prefix}${Number(latest).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(count, value, { duration });
    return controls.stop;
  }, [count, value, duration]);

  return <motion.span>{rounded}</motion.span>;
}
