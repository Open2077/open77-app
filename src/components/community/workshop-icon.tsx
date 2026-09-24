import { CodeIcon, GlobeIcon } from "@/components/icons";

export function WorkshopIcon({ category, size = 24 }: { category: string; size?: number }) {
  if (category === "scripts") return <CodeIcon size={size} />;
  if (category === "maps") return <GlobeIcon size={size} />;
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {category === "tools" ? <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" /></> : category === "ui" ? <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M9 9v11M6 6.5h.01M9 6.5h.01" /></> : <><path d="M7 6h10c2 0 3 2 3.5 4l1 6c.5 3-2 4-4 2l-2-2h-7l-2 2c-2 2-4.5 1-4-2l1-6C4 8 5 6 7 6Z" /><path d="M6 11h4M8 9v4M16 10h.01M18 12h.01" /></>}
  </svg>;
}
