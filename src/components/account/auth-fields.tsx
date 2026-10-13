"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { mail01, view, viewOff } from "@/components/ui/icons";
import { padlock } from "./kit";

import styles from "./auth-fields.module.css";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  /** A glyph from `ui/icons`. */
  icon?: string;
};

/** A labelled text input with a leading glyph, its hint and its error. */
export function AuthField({ label, hint, error, icon = mail01, ...props }: FieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      <Input icon={icon} inputSize="lg" {...props} />
    </Field>
  );
}

/** A password input that can be revealed without losing its value or submitting the form. */
export function PasswordField({ label = "Password", hint, error, ...props }: Omit<FieldProps, "type" | "icon">) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      <Input
        icon={padlock}
        inputSize="lg"
        {...props}
        type={visible ? "text" : "password"}
        trailing={
          <button
            type="button"
            className={styles.reveal}
            disabled={props.disabled}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            data-reveal
            onClick={() => setVisible((value) => !value)}
          >
            <Icon glyph={visible ? viewOff : view} />
          </button>
        }
      />
    </Field>
  );
}
