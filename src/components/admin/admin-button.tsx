"use client";

import type { ComponentProps } from "react";

import { Button as BaseButton } from "@/components/ui/button";

/**
 * The site button, named once.
 *
 * The shared hover scramble draws its label through `::before { content:
 * attr(...) }`, and browsers count generated content in the accessible name,
 * so a bare <Button>Save</Button> is announced as "Save Save". Until the
 * primitive gives that pseudo-element empty alt text, console buttons carry
 * their label as `aria-label`. Remove this wrapper once the primitive is fixed.
 */
export function Button(props: ComponentProps<typeof BaseButton>) {
  return <BaseButton {...props} aria-label={props["aria-label"] ?? props.children} />;
}
