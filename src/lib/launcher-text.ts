export type LauncherTextRun = { text: string; color?: string; bold?: boolean; italic?: boolean; upper?: boolean; shadow?: boolean; width?: "n" | "w" };

/** Matches launcher-text.js. Unrecognized/incomplete codes remain literal. */
export function parseLauncherText(value: string): LauncherTextRun[] {
  const runs: LauncherTextRun[] = [];
  let state: Omit<LauncherTextRun, "text"> = {}, buffer = "";
  const flush = () => { if (buffer) runs.push({ ...state, text: state.upper ? buffer.toUpperCase() : buffer }); buffer = ""; };
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== "$" || i + 1 === value.length) { buffer += value[i]; continue; }
    const code = value.charAt(i + 1).toLowerCase(), color = value.slice(i + 1, i + 4);
    if (code === "$") { buffer += "$"; i++; continue; }
    if (/^[0-9a-f]{3}$/i.test(color)) { flush(); state.color = `#${color}`; i += 3; continue; }
    if (!"wnoitsgz".includes(code)) { buffer += "$"; continue; }
    flush(); i++;
    if (code === "z") state = {};
    else if (code === "g") delete state.color;
    else if (code === "n" || code === "w") state.width = code;
    else if (code === "o") state.bold = true;
    else if (code === "i") state.italic = true;
    else if (code === "t") state.upper = true;
    else if (code === "s") state.shadow = true;
  }
  flush(); return runs;
}
