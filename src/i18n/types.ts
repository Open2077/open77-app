import type en from "./messages/en.json";
import type { PluralForms } from "./format";

type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * English's shape with every plural object widened to {@link PluralForms}:
 * English has `one` and `other`, Polish and Russian add `few` and `many`,
 * Japanese and Thai have `other` only. An object counts as a plural when all
 * of its keys are CLDR categories (the rule scripts/check-i18n.mjs applies), so
 * an object that merely has an `other` key next to real names stays as it is.
 */
type Shape<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends readonly (infer Item)[]
      ? Shape<Item>[]
      : T extends { other: string }
        ? [Exclude<keyof T, PluralCategory>] extends [never]
          ? PluralForms
          : { [Key in keyof T]: Shape<T[Key]> }
        : { [Key in keyof T]: Shape<T[Key]> };

/** The shape of every dictionary: English is the source, the others mirror it key for key. */
export type Messages = Shape<typeof en>;
