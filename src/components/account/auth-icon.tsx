/** Small outline icons following the site's existing icon language. */
export function AuthIcon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    hidden: <><path d="m3 3 18 18M9.8 5.2A12 12 0 0 1 12 5c7 0 10 7 10 7a18 18 0 0 1-3 4M6.5 6.5A21 21 0 0 0 2 12s3 7 10 7a13 13 0 0 0 5.5-1.5M10 10a3 3 0 0 0 4 4" /></>,
    shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
    server: <><rect x="3" y="3" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="7" rx="2" /><path d="M7 6.5h.1M7 17.5h.1M12 6.5h5M12 17.5h5" /></>,
    game: <><path d="M7 6h10c3 0 4 4 5 12 .3 3-3 3-4 1l-3-3H9l-3 3c-1 2-4 2-4-1C3 10 4 6 7 6Z" /><path d="M8 9v5M5.5 11.5h5M16 10h.1M18 13h.1" /></>,
    link: <><path d="m10 7 3-3a5 5 0 0 1 7 7l-3 3M7 10l-3 3a5 5 0 0 0 7 7l3-3m-6-1 8-8" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.shield}</svg>;
}
