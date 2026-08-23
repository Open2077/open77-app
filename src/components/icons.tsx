/**
 * The icon set used across the site.
 *
 * These are inlined rather than loaded from a sprite or an icon package: there
 * are a dozen of them, they all inherit `currentColor`, and inlining keeps them
 * available inside statically generated HTML with no extra request.
 */

type IconProps = { size?: number; className?: string };

function svgProps({ size = 16, className }: IconProps, viewBox = "0 0 16 16") {
  return {
    viewBox,
    width: size,
    height: size,
    "aria-hidden": true as const,
    ...(className ? { className } : {}),
  };
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <path
        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 13, ...props })}>
      <path
        d="M13 8H4M7.5 4.5 4 8l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <path
        d="M8 3v9M4.5 8.5 8 12l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 16, ...props })}>
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PlugIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <path
        d="M2 8h8M7 4.5 10.5 8 7 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.5 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...svgProps({ size: 15, ...props })}>
      <path
        d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 16, ...props })}>
      <path
        d="M3 8.5 6.5 12 13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 16, ...props })}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <path
        d="M8 2v8M4.5 6.5 8 10l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 13h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <path d="M4 3.5v9l8-4.5z" fill="currentColor" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 13, ...props })}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2 8h12M8 2c2 1.8 2 10.2 0 12M8 2c-2 1.8-2 10.2 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function DiscordIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 13, ...props })}>
      <path
        d="M3 5.5C4.5 4.6 6 4.2 8 4.2s3.5.4 5 1.3c.8 2 .9 4.2.6 6.3-1.2.9-2.4 1.4-3.6 1.6l-.5-1.1c.4-.1.9-.3 1.3-.6-1.8.8-3.8.8-5.6 0 .4.3.9.5 1.3.6l-.5 1.1c-1.2-.2-2.4-.7-3.6-1.6-.3-2.1-.2-4.3.6-6.3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="6.2" cy="8.4" r="0.9" fill="currentColor" />
      <circle cx="9.8" cy="8.4" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 13, ...props })}>
      <path
        d="M9.52 6.78 14.48 1h-1.18L9 6.02 5.56 1H1.6l5.2 7.57L1.6 14.6h1.18l4.55-5.29 3.63 5.29h3.96L9.52 6.78Zm-1.61 1.87-.53-.75L3.2 1.89h1.8l3.38 4.84.53.75 4.4 6.29h-1.8L7.91 8.65Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 13, ...props })}>
      <path
        d="M11.2 1.2c.3 1.6 1.4 2.9 3.1 3.1v2.3c-1.1 0-2.2-.4-3.1-1v4.6a4.4 4.4 0 1 1-4.4-4.4c.3 0 .5 0 .8.1v2.4a2.1 2.1 0 1 0 1.4 2V1.2h2.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MenuIcon({ size = 22, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...(className ? { className } : {})}
    >
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ServerRackIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...(className ? { className } : {})}
    >
      <rect x="3" y="4" width="18" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="18" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7" cy="7.5" r="1" fill="currentColor" />
      <circle cx="7" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function ShieldIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...(className ? { className } : {})}
    >
      <path
        d="M12 3l8 4v6c0 4.5-3.5 7-8 8-4.5-1-8-3.5-8-8V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CodeIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...(className ? { className } : {})}
    >
      <path
        d="m9 6-5 6 5 6M15 6l5 6-5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 15, ...props })}>
      <circle cx="5.2" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.2 8h6M12 8v2.6M14.2 8v1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.5 3.5v-1h-8v8h1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <svg {...svgProps({ size: 14, ...props })}>
      <path
        d="M6.5 2.5H3v11h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8h7M10.5 4.8 13.7 8l-3.2 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PeopleIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...(className ? { className } : {})}
    >
      <circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16 14.7c2.4.1 4 1.4 4.6 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
