"use client";

import { useEffect, useState, useRef } from "react";
import { animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  showSign?: boolean;
}

export function AnimatedNumber({ value, prefix = "$", showSign = false }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const controls = animate(prevValueRef.current, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(latest) {
        setDisplayValue(latest);
      },
    });
    prevValueRef.current = value;
    return () => controls.stop();
  }, [value]);

  const isNegative = displayValue < 0;
  const absValue = Math.abs(displayValue);
  const formatted = absValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = isNegative ? "-" : (showSign && value > 0 ? "+" : "");

  return (
    <span>
      {sign}{prefix}{formatted}
    </span>
  );
}
