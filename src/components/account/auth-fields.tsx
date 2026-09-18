"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { AuthIcon } from "@/components/account/auth-icon";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; icon?: string };

export function AuthField({ label, hint, icon = "mail", id: suppliedId, ...props }: FieldProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap"><AuthIcon name={icon} size={19} /><input {...props} id={id} className="ac-input" aria-describedby={hint ? `${id}-hint` : undefined} /></div>
    {hint && <p className="ac-hint" id={`${id}-hint`}>{hint}</p>}
  </div>;
}

export function PasswordField({ label = "Password", hint, id: suppliedId, ...props }: Omit<FieldProps, "type" | "icon">) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [visible, setVisible] = useState(false);
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap auth-password">
      <AuthIcon name="lock" size={19} />
      <input {...props} type={visible ? "text" : "password"} id={id} className="ac-input" aria-describedby={hint ? `${id}-hint` : undefined} />
      <button type="button" className="auth-reveal" disabled={props.disabled} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(value => !value)}><AuthIcon name={visible ? "hidden" : "eye"} size={20} /></button>
    </div>
    {hint && <p className="ac-hint" id={`${id}-hint`}>{hint}</p>}
  </div>;
}
