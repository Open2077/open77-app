/**
 * Intrinsic dimensions for the site imagery.
 *
 * `next/image` needs the real pixel size to reserve layout space and to build a
 * sensible srcset. The files live in `public/` because the design system also
 * references several of them as CSS backgrounds, which rules out static imports,
 * so the dimensions are recorded here instead of being inferred.
 */
export type SiteImage = { src: string; width: number; height: number; alt: string };

export const images = {
  playTogether: {
    src: "/assets/play-together.jpg",
    width: 1400,
    height: 752,
    alt: "A neon-lit Night City street scene from Cyberpunk 2077, crowded with people",
  },
  createCommunity: {
    src: "/assets/create-community.jpg",
    width: 1400,
    height: 787,
    alt: "A group of characters together in a neon-lit Night City scene",
  },
  roleplay: {
    src: "/assets/exp-roleplay.jpg",
    width: 2000,
    height: 1000,
    alt: "A moody Cyberpunk 2077 bar interior, characters mid-conversation",
  },
  racing: {
    src: "/assets/exp-racing.jpg",
    width: 2048,
    height: 1152,
    alt: "A sports car speeding through neon-lit Night City streets",
  },
  combat: {
    src: "/assets/exp-combat.jpg",
    width: 1920,
    height: 1080,
    alt: "A dramatic Cyberpunk 2077 firefight scene",
  },
} as const satisfies Record<string, SiteImage>;

/**
 * Backgrounds owned by the stylesheet. Listed so pages can preload the one that
 * is their largest contentful paint — a CSS background is discovered late,
 * which is exactly the case a preload hint exists for.
 */
export const cssBackgrounds = {
  hero: "/assets/hero-cinematic.jpg",
  finale: "/assets/city-finale.jpg",
  createHero: "/assets/create-server.jpg",
  playTogether: "/assets/play-together.jpg",
} as const;

/** Card art referenced through the `--exp-img` custom property. */
export const expCardArt = {
  roleplay: "/assets/exp-roleplay.jpg",
  racing: "/assets/exp-racing.jpg",
  custom: "/assets/exp-custom.jpg",
} as const;
