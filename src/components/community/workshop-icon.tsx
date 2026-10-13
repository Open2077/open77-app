import { Icon } from "@/components/ui/icon";
import { gameController03, layers01, layout01, maps, sourceCode } from "@/components/ui/icons";

const GLYPHS: Record<string, string> = {
  scripts: sourceCode,
  gamemodes: gameController03,
  maps,
  ui: layout01,
  tools: layers01,
};

/** The mark of a Workshop category, drawn from the site's stroke icon set. */
export function WorkshopIcon({ category, size = 24, className }: { category: string; size?: number; className?: string }) {
  return <Icon glyph={GLYPHS[category] ?? layers01} size={size} className={className} />;
}
