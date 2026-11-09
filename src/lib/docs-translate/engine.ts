/**
 * The DOM half of the docs translator: finds the blocks of a page, sends each
 * one through the browser's translator, writes the answer in place and can put
 * the English back at any time.
 *
 * React owns most of this DOM (the guides' bodies are raw HTML, everything else
 * is rendered by React and hydrated). The engine never removes or moves a node
 * React created, which is what crashes React pages run through a translator
 * extension. It only:
 *
 * - changes the text of a text node (`nodeValue`), which React overwrites
 *   harmlessly if it re-renders;
 * - hides an element with an inline `display: none`;
 * - inserts its own `<span data-op77-translation>` next to the hidden nodes,
 *   holding text nodes and clones of the page's own inline elements.
 *
 * A MutationObserver watches the page. When React changes something the engine
 * had translated (a client-side navigation, the API explorer selecting another
 * function), that block is put back to English before the next paint and
 * translated again; new blocks are picked up the same way.
 *
 * Nothing the translator returns is parsed as HTML: answers become text nodes.
 */

import {
  collapseWhitespace,
  encode,
  hasPairs,
  hasTokenCollision,
  parse,
  plainText,
  repairSpacing,
  spacesBetweenWords,
  splitKeepTerms,
  worthTranslating,
  type Encoded,
  type Piece,
} from "./text";

export type TranslateText = (text: string, signal: AbortSignal) => Promise<string>;

export type EngineProgress = {
  /** Blocks processed since the last start, translated or not. */
  done: number;
  /** `done` plus what is still queued. */
  total: number;
  /** Blocks the translator rejected (left in English). */
  failed: number;
  /** False once the queue is empty. */
  running: boolean;
};

export type EngineOptions = {
  /** Watched for changes: React re-renders, client-side navigations. */
  container: HTMLElement;
  /** The parts of the page that are translated, inside `container`. */
  rootSelector: string;
  /** BCP-47 tag of the translation, written as `lang` on translated blocks. */
  target: string;
  translate: TranslateText;
  /** Translations already made this visit, by source string: reused on the next start. */
  cache?: Map<string, string>;
  /** Mutations under these nodes are not the page changing (the translator's own UI). */
  ignore?: (node: Node) => boolean;
  onProgress?: (progress: EngineProgress) => void;
  /** The translator kept failing: the engine stopped queueing (what is translated stays). */
  onError?: (error: unknown) => void;
};

/** Marks the engine's own spans. */
export const TRANSLATION_ATTRIBUTE = "data-op77-translation";

/** Elements never translated: code and everything a reader types, presses or plays. */
const SKIP_TAGS = new Set([
  "PRE", "CODE", "KBD", "SAMP", "VAR", "TT",
  "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE",
  "svg", "SVG", "MATH", "math", "IMG", "PICTURE", "VIDEO", "AUDIO", "CANVAS", "IFRAME", "OBJECT", "EMBED",
  "BR", "HR", "WBR",
  "TEXTAREA", "INPUT", "SELECT", "OPTION", "BUTTON",
]);

/** Elements whose clone would not work like the original. */
const INTERACTIVE = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION", "LABEL"]);

const BLOCK_DESCENDANT = "address,article,aside,blockquote,details,dialog,div,dl,fieldset,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hr,li,main,nav,ol,p,pre,section,table,ul";

const OBSERVE: MutationObserverInit = { childList: true, subtree: true, characterData: true };

type Pending = {
  parent: Element;
  nodes: Node[];
  /** A display title split into words (`data-translate-words`). */
  words?: boolean;
  /** Distance from the top of the viewport: what the reader sees goes first. */
  order: number;
};

type Applied = {
  parent: Element;
  nodes: Node[];
  span: HTMLElement | null;
  /** Text nodes the engine rewrote (`value` is what it wrote: "" when hidden). */
  texts: Array<{ node: Text; original: string; value: string }>;
  hidden: Array<{ element: HTMLElement | SVGElement; value: string; priority: string; style: string | null }>;
  attributes: Array<{ element: Element; name: string; original: string | null; value: string }>;
};

type Model = {
  pieces: Piece[];
  /** Placeholder id → node cloned as is, or a word kept as written. */
  atoms: Map<number, Node | string>;
  /** Placeholder id → inline element cloned around its translated words. */
  pairs: Map<number, Element>;
  /** Text nodes reached as words, in order. */
  texts: Text[];
  interactive: boolean;
};

function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function styled(element: Element): element is HTMLElement | SVGElement {
  return "style" in element;
}

/** Excluded from translation, by tag or by `translate="no"`. */
function isSkipped(element: Element): boolean {
  return (
    SKIP_TAGS.has(element.tagName) ||
    element.getAttribute("translate") === "no" ||
    element.hasAttribute(TRANSLATION_ATTRIBUTE) ||
    // Button labels drawn from `data-glitchess`, which the hover scramble rewrites to English.
    element.hasAttribute("data-glitchess") ||
    (element as HTMLElement).isContentEditable === true
  );
}

function displayOf(element: Element): string {
  return element.ownerDocument.defaultView?.getComputedStyle(element).display ?? "inline";
}

function hasWords(text: string): boolean {
  return worthTranslating(splitKeepTerms(text).filter((part) => !part.keep).map((part) => part.text).join(" "));
}

/** The words of a run as the reader sees them, code left out. */
function wordsOf(nodes: Node[]): string {
  let out = "";
  const walk = (list: Iterable<Node>) => {
    for (const node of list) {
      if (isText(node)) out += node.nodeValue ?? "";
      else if (isElement(node) && !isSkipped(node)) walk(node.childNodes);
      else out += " ";
    }
  };
  walk(nodes);
  return out;
}

export class PageTranslation {
  private readonly options: EngineOptions;
  private readonly cache: Map<string, string>;
  private readonly observer: MutationObserver;
  private readonly spaced: boolean;
  private claimed = new WeakSet<Node>();
  private applied: Applied[] = [];
  private queue: Pending[] = [];
  private controller = new AbortController();
  private running = false;
  private observing = false;
  private stopped = false;
  private reorder = false;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private done = 0;
  private failed = 0;

  constructor(options: EngineOptions) {
    this.options = options;
    this.cache = options.cache ?? new Map();
    this.spaced = spacesBetweenWords(options.target);
    this.observer = new MutationObserver((records) => {
      if (records.some((record) => this.foreign(record))) this.scheduleRefresh();
    });
  }

  /** Translates every root under the container, then keeps up with the page. */
  start(): void {
    this.observing = true;
    this.observer.observe(this.options.container, OBSERVE);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.enqueue(this.collect());
    this.report();
    void this.run();
  }

  /** Stops, and puts every translated block back to English. */
  stop(): void {
    this.stopped = true;
    this.controller.abort();
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    window.removeEventListener("scroll", this.onScroll);
    this.observing = false;
    this.observer.disconnect();
    for (const unit of this.applied) restore(unit);
    this.applied = [];
    this.queue = [];
    this.claimed = new WeakSet();
  }

  /** How many blocks are translated right now. */
  get translatedCount(): number {
    return this.applied.length;
  }

  private onScroll = () => {
    this.reorder = true;
  };

  private foreign(record: MutationRecord): boolean {
    return !this.options.ignore?.(record.target);
  }

  private scheduleRefresh() {
    if (this.stopped) return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    // Stale blocks are put back at once, before the next paint; new content is
    // picked up a moment later, once React has finished rendering it.
    this.dropStale();
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      if (this.stopped) return;
      this.dropStale();
      this.enqueue(this.collect());
      void this.run();
    }, 150);
  }

  /** Puts back the blocks the page changed under the engine, so they can be translated again. */
  private dropStale() {
    const stale = this.applied.filter(isStale);
    if (!stale.length) return;
    this.applied = this.applied.filter((unit) => !stale.includes(unit));
    for (const unit of stale) for (const node of unit.nodes) this.claimed.delete(node);
    this.mutate(() => stale.forEach(restore));
  }

  /** Runs the engine's own DOM writes without hearing them as page changes. */
  private mutate(write: () => void) {
    const pending = this.observing ? this.observer.takeRecords() : [];
    this.observer.disconnect();
    try {
      write();
    } finally {
      if (this.observing) this.observer.observe(this.options.container, OBSERVE);
      if (pending.some((record) => this.foreign(record))) this.scheduleRefresh();
    }
  }

  private report() {
    this.options.onProgress?.({
      done: this.done,
      total: this.done + this.queue.length + (this.running ? 1 : 0),
      failed: this.failed,
      running: this.running || this.queue.length > 0,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Finding the blocks                                                       */
  /* ------------------------------------------------------------------------ */

  private collect(): Pending[] {
    const out: Pending[] = [];
    for (const root of this.options.container.querySelectorAll(this.options.rootSelector)) {
      if (root.closest('[translate="no"]')) continue;
      this.walk(root, out);
    }
    return out;
  }

  /**
   * Splits an element's children into runs of inline content (one block
   * each) and recurses into the children that lay out as boxes of their own.
   * Computed `display` decides, not the tag: the docs style plenty of spans
   * as blocks and links as cards.
   */
  private walk(element: Element, out: Pending[]) {
    if (element.hasAttribute("data-translate-words")) {
      const nodes = [...element.childNodes];
      if (!nodes.some((node) => this.claimed.has(node)) && hasWords(element.textContent ?? "")) out.push(this.pending(element, nodes, true));
      return;
    }

    let run: Node[] = [];
    const flush = () => {
      if (run.length && hasWords(wordsOf(run))) out.push(this.pending(element, run));
      run = [];
    };

    for (const child of [...element.childNodes]) {
      if (this.claimed.has(child)) {
        flush();
        continue;
      }
      if (isText(child)) {
        run.push(child);
        continue;
      }
      if (!isElement(child)) continue;
      if (child.hasAttribute(TRANSLATION_ATTRIBUTE)) {
        flush();
        continue;
      }
      const display = displayOf(child);
      if (isSkipped(child)) {
        // Inline code inside a sentence travels with the sentence, as a placeholder.
        if (display.startsWith("inline")) run.push(child);
        else flush();
        continue;
      }
      if ((display === "inline" || display === "contents") && !child.querySelector(BLOCK_DESCENDANT)) {
        run.push(child);
        continue;
      }
      flush();
      this.walk(child, out);
    }
    flush();
  }

  private pending(parent: Element, nodes: Node[], words = false): Pending {
    return { parent, nodes, words, order: orderOf(parent) };
  }

  private enqueue(units: Pending[]) {
    if (!units.length) return;
    // A new batch (the next page of a client-side navigation) counts from zero.
    if (!this.running && !this.queue.length) {
      this.done = 0;
      this.failed = 0;
    }
    for (const unit of units) for (const node of unit.nodes) this.claimed.add(node);
    this.queue.push(...units);
    this.queue.sort((a, b) => a.order - b.order);
    this.report();
  }

  /* ------------------------------------------------------------------------ */
  /* Translating                                                              */
  /* ------------------------------------------------------------------------ */

  private async run() {
    if (this.running || this.stopped) return;
    this.running = true;
    let streak = 0;
    let halted = false;
    try {
      while (this.queue.length && !this.stopped) {
        if (this.reorder) {
          this.reorder = false;
          for (const unit of this.queue) unit.order = orderOf(unit.parent);
          this.queue.sort((a, b) => a.order - b.order);
        }
        const unit = this.queue.shift()!;
        this.report();
        try {
          const applied = await this.translateUnit(unit);
          if (this.stopped) return;
          if (applied) this.applied.push(applied);
          streak = 0;
        } catch (error) {
          if (this.stopped || isAbort(error)) return;
          this.failed += 1;
          streak += 1;
          // The translator itself is gone (model unloaded, tab throttled): stop
          // rather than walk the whole page into the same error.
          if (streak >= 5) {
            this.queue = [];
            halted = true;
            this.options.onError?.(error);
            return;
          }
        }
        this.done += 1;
      }
    } finally {
      this.running = false;
      // After an error the last word is the error, not a "finished" report.
      if (!this.stopped && !halted) this.report();
    }
  }

  private async tr(text: string): Promise<string> {
    const hit = this.cache.get(text);
    if (hit !== undefined) return hit;
    const answer = await this.options.translate(text, this.controller.signal);
    if (typeof answer !== "string") throw new TypeError("translator returned no text");
    this.cache.set(text, answer);
    return answer;
  }

  private async translateUnit(unit: Pending): Promise<Applied | null> {
    if (!unit.nodes.every((node) => node.parentNode === unit.parent)) return null;
    if (unit.words) return this.translateWords(unit);

    const model = buildModel(unit.nodes);
    if (!worthTranslating(plainText(model.pieces))) return null;
    const snapshot = model.texts.map((node) => node.nodeValue);
    const unchanged = () =>
      unit.nodes.every((node) => node.parentNode === unit.parent) && model.texts.every((node, index) => node.nodeValue === snapshot[index]);

    const textOnly = model.pairs.size === 0 && [...model.atoms.values()].every((atom) => typeof atom === "string");
    let pieces: Piece[] | null = null;
    if (!model.interactive && !hasTokenCollision(plainText(model.pieces))) pieces = await this.translatePieces(model.pieces);

    if (pieces && !textOnly) {
      if (!unchanged()) return null;
      const fragment = this.fragment(pieces, model);
      const applied = emptyApplied(unit);
      this.mutate(() => {
        const span = document.createElement("span");
        span.setAttribute(TRANSLATION_ATTRIBUTE, "");
        span.setAttribute("lang", this.options.target);
        span.append(fragment);
        unit.parent.insertBefore(span, unit.nodes[0]!);
        applied.span = span;
        hideOriginals(unit.nodes, applied);
      });
      return applied;
    }

    // Plain text, or a block whose placeholders did not survive: rewrite the
    // text nodes where they are, each on its own when there is more than one.
    const values: string[] = [];
    if (pieces) values.push(flatten(pieces, model), ...model.texts.slice(1).map(() => ""));
    else for (const node of model.texts) values.push(await this.translatePlain(node.nodeValue ?? ""));
    if (!unchanged()) return null;
    const applied = emptyApplied(unit);
    this.mutate(() => {
      model.texts.forEach((node, index) => {
        const value = values[index] ?? "";
        applied.texts.push({ node, original: node.nodeValue ?? "", value });
        node.nodeValue = value;
      });
      setAttribute(applied, unit.parent, "lang", this.options.target);
      if (unit.parent.hasAttribute("data-glitch") && model.texts.length) setAttribute(applied, unit.parent, "data-glitch", values.join("").trim());
    });
    return applied;
  }

  /**
   * Tries the richest encoding first and falls back: links and emphasis as
   * pairs around their words; then as single placeholders translated on their
   * own; null when even that does not come back intact.
   */
  private async translatePieces(pieces: Piece[]): Promise<Piece[] | null> {
    if (!worthTranslating(plainText(pieces))) return pieces;

    if (hasPairs(pieces)) {
      const sent = encode(pieces, "pair");
      const parsed = parse(await this.tr(sent.text), sent.expected);
      if (parsed) return this.finish(parsed, sent);
    }

    const sent = encode(pieces, "atom");
    const parsed = parse(await this.tr(sent.text), sent.expected);
    if (!parsed) return null;
    const pairs = new Map(pieces.flatMap((piece) => (piece.kind === "pair" ? [[piece.id, piece] as const] : [])));
    const expanded: Piece[] = [];
    for (const piece of parsed) {
      const pair = piece.kind === "atom" ? pairs.get(piece.id) : undefined;
      if (!pair || pair.kind !== "pair") {
        expanded.push(piece);
        continue;
      }
      const inner = (await this.translatePieces(pair.children)) ?? pair.children;
      expanded.push({ kind: "pair", id: pair.id, children: inner });
    }
    return this.finish(expanded, sent);
  }

  private finish(pieces: Piece[], sent: Encoded): Piece[] {
    const out = this.spaced ? repairSpacing(pieces, sent.spaces) : pieces;
    return [
      ...(sent.lead ? [{ kind: "text" as const, text: sent.lead }] : []),
      ...out,
      ...(sent.trail ? [{ kind: "text" as const, text: sent.trail }] : []),
    ];
  }

  /** One string, words kept as written protected, without placeholders as a last resort. */
  private async translatePlain(text: string): Promise<string> {
    if (!hasWords(text)) return text;
    const atoms = new Map<number, Node | string>();
    const pieces = textPieces(text, atoms, { next: 1 });
    if (!hasTokenCollision(text)) {
      const translated = await this.translatePieces(pieces);
      if (translated) return flatten(translated, { atoms });
    }
    // Placeholders lost: translate the stretches between kept words separately.
    const lead = /^\s/.test(text) ? " " : "";
    const trail = /\s$/.test(text) ? " " : "";
    let out = "";
    for (const part of splitKeepTerms(collapseWhitespace(text).trim())) {
      if (part.keep || !worthTranslating(part.text)) out += part.text;
      else out += `${/^\s/.test(part.text) ? " " : ""}${(await this.tr(part.text.trim())).trim()}${/\s$/.test(part.text) ? " " : ""}`;
    }
    return lead + out + trail;
  }

  /**
   * A display title drawn word by word (the docs h1): translated as one
   * sentence, then cut into words again, each in a copy of the original word
   * element so the glitch layers and the accent colour follow.
   */
  private async translateWords(unit: Pending): Promise<Applied | null> {
    const source = collapseWhitespace(unit.parent.textContent ?? "").trim();
    const translated = collapseWhitespace(await this.translatePlain(source)).trim();
    if (!translated || !unit.nodes.every((node) => node.parentNode === unit.parent)) return null;
    if (collapseWhitespace(unit.parent.textContent ?? "").trim() !== source) return null;

    const templates = unit.nodes.filter(isElement);
    const words = this.spaced ? translated.split(" ") : [translated];
    const applied = emptyApplied(unit);
    this.mutate(() => {
      const span = document.createElement("span");
      span.setAttribute(TRANSLATION_ATTRIBUTE, "");
      span.setAttribute("lang", this.options.target);
      words.forEach((word, index) => {
        const template = index === words.length - 1 && words.length > 1 ? templates.at(-1) : templates[0];
        if (index > 0) span.append(" ");
        if (!template) {
          span.append(word);
          return;
        }
        const copy = template.cloneNode(false) as Element;
        copy.removeAttribute("id");
        copy.textContent = word;
        if (template.hasAttribute("data-glitch")) {
          // Glitch layers never wrap: a long word without them can break instead.
          if (word.length <= 16) copy.setAttribute("data-glitch", word);
          else copy.removeAttribute("data-glitch");
        }
        span.append(copy);
      });
      unit.parent.insertBefore(span, unit.nodes[0] ?? null);
      applied.span = span;
      hideOriginals(unit.nodes, applied);
    });
    return applied;
  }

  /** DOM for translated pieces: text nodes, and clones of the page's own elements. */
  private fragment(pieces: Piece[], model: Pick<Model, "atoms" | "pairs">): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const piece of pieces) {
      if (piece.kind === "text") {
        fragment.append(document.createTextNode(piece.text));
      } else if (piece.kind === "atom") {
        const atom = model.atoms.get(piece.id);
        if (typeof atom === "string") fragment.append(document.createTextNode(atom));
        else if (atom) fragment.append(cleanClone(atom, true));
      } else {
        const original = model.pairs.get(piece.id);
        if (!original) continue;
        const copy = cleanClone(original, false) as Element;
        copy.append(this.fragment(piece.children, model));
        if (copy.hasAttribute("data-glitch")) copy.setAttribute("data-glitch", copy.textContent ?? "");
        if (original.tagName === "A") forwardClicks(copy as HTMLAnchorElement, original as HTMLAnchorElement);
        fragment.append(copy);
      }
    }
    return fragment;
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function orderOf(element: Element): number {
  const rect = element.getBoundingClientRect();
  if (!rect.width && !rect.height) return 3e9;
  // Below the top of the viewport, by distance; above it, after everything below.
  return rect.bottom < 0 ? 1e9 - rect.bottom : rect.top;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function emptyApplied(unit: Pending): Applied {
  return { parent: unit.parent, nodes: unit.nodes, span: null, texts: [], hidden: [], attributes: [] };
}

function hideOriginals(nodes: Node[], applied: Applied) {
  for (const node of nodes) {
    if (isText(node)) {
      applied.texts.push({ node, original: node.nodeValue ?? "", value: "" });
      node.nodeValue = "";
    } else if (isElement(node) && styled(node)) {
      applied.hidden.push({
        element: node,
        value: node.style.getPropertyValue("display"),
        priority: node.style.getPropertyPriority("display"),
        style: node.getAttribute("style"),
      });
      node.style.setProperty("display", "none", "important");
    }
  }
}

function setAttribute(applied: Applied, element: Element, name: string, value: string) {
  applied.attributes.push({ element, name, original: element.getAttribute(name), value });
  element.setAttribute(name, value);
}

/** True when the page changed something the engine had written over. */
function isStale(unit: Applied): boolean {
  if (unit.span && unit.span.parentNode !== unit.parent) return true;
  if (unit.texts.some(({ node, value }) => !node.isConnected || node.nodeValue !== value)) return true;
  if (unit.hidden.some(({ element }) => element.parentNode !== unit.parent || element.style.getPropertyValue("display") !== "none")) return true;
  return false;
}

/** Puts the English back, leaving alone anything the page itself has since rewritten. */
function restore(unit: Applied) {
  unit.span?.remove();
  for (const { node, original, value } of unit.texts) if (node.nodeValue === value) node.nodeValue = original;
  for (const { element, value, priority, style } of unit.hidden) {
    if (element.style.getPropertyValue("display") !== "none") continue;
    if (value) element.style.setProperty("display", value, priority);
    else element.style.removeProperty("display");
    // No `style=""` left behind on an element that had no style attribute.
    if (style === null && element.getAttribute("style") === "") element.removeAttribute("style");
  }
  for (const { element, name, original, value } of unit.attributes) {
    if (element.getAttribute(name) !== value) continue;
    if (original === null) element.removeAttribute(name);
    else element.setAttribute(name, original);
  }
}

function textPieces(text: string, atoms: Map<number, Node | string>, counter: { next: number }): Piece[] {
  return splitKeepTerms(text).map((part) => {
    if (!part.keep) return { kind: "text" as const, text: part.text };
    const id = counter.next++;
    atoms.set(id, part.text);
    return { kind: "atom" as const, id };
  });
}

/** Pieces of a run of inline nodes, with what each placeholder stands for. */
function buildModel(nodes: Node[]): Model {
  const model: Model = { pieces: [], atoms: new Map(), pairs: new Map(), texts: [], interactive: false };
  const counter = { next: 1 };
  const visit = (list: Iterable<Node>, nested: boolean): Piece[] => {
    const out: Piece[] = [];
    for (const node of list) {
      if (isText(node)) {
        model.texts.push(node);
        out.push(...textPieces(node.nodeValue ?? "", model.atoms, counter));
        continue;
      }
      if (!isElement(node)) continue;
      if (INTERACTIVE.has(node.tagName) || node.getAttribute("role") === "button") model.interactive = true;
      const display = nested ? displayOf(node) : "inline";
      if (isSkipped(node) || (nested && display !== "inline" && display !== "contents")) {
        const id = counter.next++;
        model.atoms.set(id, node);
        out.push({ kind: "atom", id });
        continue;
      }
      const id = counter.next++;
      model.pairs.set(id, node);
      out.push({ kind: "pair", id, children: visit(node.childNodes, true) });
    }
    return out;
  };
  model.pieces = visit(nodes, false);
  return model;
}

/** Pieces back to a string: kept words and clones' text in place. */
function flatten(pieces: Piece[], model: Pick<Model, "atoms">): string {
  return pieces
    .map((piece) => {
      if (piece.kind === "text") return piece.text;
      if (piece.kind === "pair") return flatten(piece.children, model);
      const atom = model.atoms.get(piece.id);
      return typeof atom === "string" ? atom : (atom?.textContent ?? "");
    })
    .join("");
}

/** A copy for display: no duplicate ids. */
function cleanClone(node: Node, deep: boolean): Node {
  const copy = node.cloneNode(deep);
  if (isElement(copy)) {
    copy.removeAttribute("id");
    if (deep) for (const element of copy.querySelectorAll("[id]")) element.removeAttribute("id");
  }
  return copy;
}

/**
 * A translated link hands plain clicks to the hidden original, so a Next.js
 * `<Link>` still navigates client-side. Modified clicks (new tab, download)
 * keep the copy's own behaviour: it has the same `href`.
 */
function forwardClicks(copy: HTMLAnchorElement, original: HTMLAnchorElement) {
  copy.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!original.isConnected) return;
    event.preventDefault();
    original.click();
  });
}
