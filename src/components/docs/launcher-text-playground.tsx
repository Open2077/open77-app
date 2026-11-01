"use client";

import { useRef, useState, type CSSProperties } from "react";
import { parseLauncherText } from "@/lib/launcher-text";
import styles from "./launcher-text-playground.module.css";

const colors: [string, string][] = [["ff0", "Yellow"], ["f80", "Orange"], ["f00", "Red"], ["f0f", "Pink"], ["a6f", "Purple"], ["08f", "Blue"], ["0ff", "Cyan"], ["0f0", "Green"], ["6fa", "Mint"], ["fff", "White"], ["888", "Grey"], ["000", "Black"]];
const codes: [string, string][] = [["o", "Bold"], ["i", "Italic"], ["n", "Narrow"], ["w", "Wide"], ["t", "Uppercase"], ["s", "Shadow"], ["g", "Reset color"], ["z", "Reset all"], ["$", "Literal $"]];
const examples: [string, string][] = [
  ["Roleplay", "$o$ff0Night City$z $i$0ffRoleplay$z"],
  ["Racing", "$w$f80NIGHT RUN$z $fff// $iStreet racing$z"],
  ["Freeroam", "$o$6faFREE$fffROAM$z $nExplore Night City$z"],
  ["Description", "$o$ff0Welcome to Night City.$z\n$0ffRoleplay$g, racing and late-night sessions.\nEntry: $$0."],
];
function Preview({ text }: { text: string }) {
  return parseLauncherText(text).map((run, index) => {
    const style: CSSProperties = { color: run.color, fontWeight: run.bold ? 800 : undefined, fontStyle: run.italic ? "italic" : undefined, textShadow: run.shadow ? "1px 1px 2px #000" : undefined };
    if (run.width) { style.fontFamily = "LauncherSaira, sans-serif"; style.fontVariationSettings = `"wdth" ${run.width === "n" ? 75 : 125}`; }
    return <span key={index} style={style}>{run.text}</span>;
  });
}
export function LauncherTextPlayground() {
  const [text, setText] = useState(examples[0]![1]);
  const [custom, setCustom] = useState("a6f");
  const [status, setStatus] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  function insert(code: string) {
    const start = input.current?.selectionStart ?? text.length;
    setText(text.slice(0, start) + code + text.slice(start)); setStatus("");
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + code.length, start + code.length); });
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus("Copied. Paste into your server name or description."); }
    catch { input.current?.focus(); input.current?.select(); setStatus("Copy unavailable. The text is selected; press Ctrl+C or Cmd+C."); }
  }
  return <section className={styles.panel} aria-label="Launcher text editor">
    <header className={styles.heading}><span>{"// LIVE EDITOR"}</span><small>LAUNCHER 178+</small></header>
    <div className={styles.preview}>
      <span className={styles.caption}>SERVER PREVIEW</span>
      <div className={styles.server}><span className={styles.icon} aria-hidden="true">{"//77"}</span><div className={styles.name}><Preview text={text} /></div></div>
      <span className={styles.hint}>Formatting preview only — this does not change your server.</span>
    </div>
    <div className={styles.controls}>
      <label className={styles.caption} htmlFor="launcher-format-input">YOUR TEXT + CODES</label>
      <textarea ref={input} id="launcher-format-input" value={text} rows={3} spellCheck={false} onChange={e => { setText(e.target.value); setStatus(""); }} />
      <p className={styles.hint}>Place the cursor, then choose a color or style to insert its code.</p>
      <div className={styles.palette}>{colors.map(([code, name]) => <button key={code} type="button" onClick={() => insert(`$${code}`)} aria-label={`Insert ${name}, $${code}`} title={`${name} · $${code}`}><span style={{ background: `#${code}` }} /><code>${code}</code></button>)}</div>
      <div className={styles.custom}><label htmlFor="launcher-custom-color">Custom color</label><input id="launcher-custom-color" type="color" value={`#${[...custom].map(c => c + c).join("")}`} onChange={e => setCustom([1, 3, 5].map(i => Math.round(parseInt(e.target.value.slice(i, i + 2), 16) / 17).toString(16)).join(""))} /><button type="button" onClick={() => insert(`$${custom}`)}>Insert ${custom}</button><small>Rounded to the nearest 3-digit RGB color.</small></div>
      <div className={styles.styles}>{codes.map(([code, label]) => <button type="button" key={code} onClick={() => insert(`$${code}`)}><code>${code}</code>{label}</button>)}</div>
      <div className={styles.examples}><span className={styles.caption}>TRY AN EXAMPLE</span>{examples.map(([label, value]) => <button type="button" key={label} onClick={() => { setText(value); setStatus(""); }}>{label}</button>)}</div>
      <footer className={styles.footer}><span role="status">{status}</span><button type="button" className={styles.copy} onClick={copy}>Copy formatted text ↗</button></footer>
    </div>
  </section>;
}
