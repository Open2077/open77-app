import type { CSSProperties } from "react";
import { parseLauncherText } from "@/lib/launcher-text";
import styles from "./server-presentation.module.css";

/** Text nodes only: server formatting can never inject markup or links. */
export function ServerText({ text }: { text: string }) {
  return parseLauncherText(text).map((run, index) => {
    const style: CSSProperties = {
      color: run.color,
      fontWeight: run.bold ? 800 : undefined,
      fontStyle: run.italic ? "italic" : undefined,
      textShadow: run.shadow ? "1px 1px 2px #000" : undefined,
      fontVariationSettings: run.width ? `"wdth" ${run.width === "n" ? 75 : 125}` : undefined,
    };
    return <span key={index} className={run.width ? styles.variableText : undefined} style={style}>{run.text}</span>;
  });
}
