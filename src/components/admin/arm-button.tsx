"use client";

import { useState } from "react";

import { Button } from "@/components/admin/admin-button";
import { alert02 } from "@/components/ui/icons";

import styles from "./arm-button.module.css";

/**
 * Two-step destructive action: first click arms, second click within the same
 * focus commits, blur disarms. Every destructive control in the panel goes
 * through this so the confirm behavior is uniform.
 *
 * Disarmed it is a red outline; armed it fills red and carries the warning
 * glyph, so the second click is never mistaken for the first.
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
    // React's onBlur bubbles (focusout), so the wrapper disarms whenever the button loses focus.
    <span className={styles.arm} data-armed={armed || undefined} onBlur={() => setArmed(false)}>
      <Button
        size="sm"
        color="red"
        border={!armed}
        lines="none"
        icon={armed ? alert02 : undefined}
        iconPosition="left"
        disabled={disabled}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          onConfirm();
        }}
      >
        {armed ? confirmLabel : label}
      </Button>
    </span>
  );
}
