"use client";

import { useState } from "react";

/**
 * Two-step destructive action: first click arms, second click within the same
 * focus commits, blur disarms. Every destructive control in the panel goes
 * through this so the confirm behavior is uniform.
 */
export function ArmButton({
  label,
  confirmLabel,
  disabled,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={`ac-iconbtn is-danger${armed ? " is-armed" : ""}`}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
