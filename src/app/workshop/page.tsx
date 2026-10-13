import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowRight01, search01 } from "@/components/ui/icons";
import { Section } from "@/components/ui/page";
import { SmartLink } from "@/components/ui/smart-link";
import { Display, Eyebrow } from "@/components/ui/typography";
import { HubReadFailure } from "@/components/community/hub-read-failure";
import { ProjectCard } from "@/components/community/project-card";
import { WorkshopGrid } from "@/components/community/workshop-card";
import { WorkshopHero, spaced } from "@/components/community/workshop-hero";
import { WorkshopIcon } from "@/components/community/workshop-icon";
import { WorkshopShell as HubShell } from "@/components/community/workshop-shell";
import { WorkshopStrip } from "@/components/community/workshop-strip";
import { listProjects } from "@/lib/community/public-api";
import { categories } from "@/lib/community/types";
import { pageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

export const metadata = pageMetadata({ title: "Workshop", description: "Discover and share resources, gamemodes, maps and interfaces built for OPEN//77 servers.", path: "/workshop" });

const FACTS = [
  { title: "Free to download", text: "Every creation in the library is free, from one-file scripts to whole gamemodes." },
  { title: "Reviewed first", text: "Packages are inspected and reviewed before they go public. Published files never change." },
  { title: "Installed through Warden", text: "Paste a Workshop link into your server console, review the plan, install." },
];

const PATHS = [
  { label: "For creators", title: ["Share what", "you built"], text: "Upload a ZIP or import a GitHub release, add screenshots, and let server owners install it through Warden.", link: "Start a creation", href: "/account/creations/new" },
  { label: "For server owners", title: ["Install with", "Warden"], text: "Browse the Workshop from your server console, review the plan, then install, update or roll back with one confirmation.", link: "Read the Warden guide", href: "/docs/community-hub-warden" },
  { label: "Need help?", title: ["Ask the", "community"], text: "Platform bugs, missing APIs and general help live on the OPEN//77 Discord.", link: "Join the Discord", href: "https://discord.open2077.net" },
];

export default async function CommunityPage() {
  const results = await Promise.allSettled([
    listProjects({ sort: "featured", limit: 1 }), listProjects({ sort: "trending", limit: 8 }),
    listProjects({ sort: "new", limit: 8 }), listProjects({ sort: "updated", limit: 4 }), listProjects({ kind: "showcase", limit: 4 }),
  ]);
  const shelves = results.map(result => result.status === "fulfilled" ? result.value : null);
  const seen = new Set<string>();
  const sections = [
    { title: ["Featured"], eyebrow: "Editorial pick", href: "/workshop/browse?sort=featured", featured: true },
    { title: ["Trending", "this week"], eyebrow: "Most active right now", href: "/workshop/browse?sort=trending", ranked: true },
    { title: ["New in", "the library"], eyebrow: "Just published", href: "/workshop/browse?sort=new" },
    { title: ["Recently", "updated"], eyebrow: "Fresh releases", href: "/workshop/browse?sort=updated" },
    { title: ["Showcases"], eyebrow: "Made with OPEN//77", href: "/workshop/browse?kind=showcase" },
  ].map((section, index) => {
    const shelf = shelves[index];
    const request = results[index];
    const items = (index === 1 && !shelf?.rankingAsOfUtc ? [] : shelf?.items ?? []).filter(project => !seen.has(project.projectId));
    items.forEach(project => seen.add(project.projectId));
    return { ...section, items, unavailable: shelf === null, error: request?.status === "rejected" ? request.reason : undefined };
  });
  const allDown = shelves.every(shelf => shelf === null);
  const empty = !allDown && shelves.every(shelf => shelf !== null) && seen.size === 0;
  let shelfIndex = 2;
  // The first creations ride along the foot of the hero: this week's ranking, or the newest when there is none yet.
  const trending = shelves[1]?.rankingAsOfUtc ? shelves[1].items : [];
  const heroPicks = trending.length > 0 ? trending : shelves[2]?.items ?? [];
  return (
    <HubShell>
      <WorkshopHero
        size="full"
        className={styles.hero}
        art={{ src: "/home/img/creators-bg.webp", position: "60% 40%" }}
        character={{ src: "/home/img/creators-character.webp", width: 1261, height: 1253 }}
        watermark="Workshop"
        eyebrow={<Eyebrow>The Workshop · resources for server builders</Eyebrow>}
        title={<Display as="h1" size="xl" lines={spaced(["Build your", "server", "together"])} accent={[1]} glitch />}
        lead="Community scripts, gamemodes, maps, interfaces and tools, plus the official resources. All free."
        strip={
          heroPicks.length > 0 ? (
            <WorkshopStrip
              id="workshop-picks"
              title={trending.length > 0 ? "Trending this week" : "New in the library"}
              href={trending.length > 0 ? "/workshop/browse?sort=trending" : "/workshop/browse?sort=new"}
              projects={heroPicks}
            />
          ) : undefined
        }
      >
        <div className={styles.find}>
          <form className={styles.search} action="/workshop/browse" role="search" aria-label="Search the Workshop" data-workshop-search>
            <label className="sr-only" htmlFor="workshop-search">
              Search resources
            </label>
            <Input
              id="workshop-search"
              type="search"
              name="query"
              maxLength={200}
              inputSize="lg"
              icon={search01}
              placeholder="Search resources, gamemodes, maps, tools…"
              trailing={<Button type="submit" color="blue" lines="none" size="sm" iconOnly icon={arrowRight01} aria-label="Search the Workshop" />}
            />
          </form>
          <Button color="blue" lines="none" href="/workshop/browse">
            Browse the library
          </Button>
          <SmartLink className={styles.pathLink} href="/docs/server-resources" glitch>
            How resources work
          </SmartLink>
        </div>
      </WorkshopHero>

      <ul className={styles.facts} aria-label="How the Workshop works">
        {FACTS.map((fact, index) => (
          <li key={fact.title} className={styles.fact}>
            <span className={styles.factIndex} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={styles.factTitle}>{fact.title}</span>
            <span className={styles.factText}>{fact.text}</span>
          </li>
        ))}
      </ul>

      <Section
        eyebrow={<Eyebrow as="span" index={1}>Categories</Eyebrow>}
        title={spaced(["Browse by", "category"])}
        actions={
          <Button color="blue" border lines="none" size="sm" icon={arrowRight01} href="/workshop/browse">
            Browse everything
          </Button>
        }
      >
        <nav aria-label="Categories">
          <ul className={styles.categories}>
            {categories.map((category, index) => (
              <li key={category.id} style={{ display: "grid" }}>
                <Link className={styles.category} href={`/workshop/browse?category=${category.id}`}>
                  <span className={styles.categoryTop}>
                    <WorkshopIcon category={category.id} size={26} />
                    <span className={styles.categoryIndex}>{String(index + 1).padStart(2, "0")}</span>
                  </span>
                  <strong className={styles.categoryName}>{category.label}</strong>
                  <span className={styles.categoryText}>{category.description}</span>
                  <Icon glyph={arrowRight01} className={styles.categoryGo} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Section>

      {allDown ? (
        <Section>
          <HubReadFailure error={results[0].status === "rejected" ? results[0].reason : undefined} />
        </Section>
      ) : null}

      {sections.map(section => {
        if (!(section.items.length > 0 || (section.unavailable && !allDown))) return null;
        const index = shelfIndex++;
        return (
          <Section
            key={section.href}
            eyebrow={<Eyebrow as="span" index={index}>{section.eyebrow}</Eyebrow>}
            title={spaced(section.title)}
            actions={
              <SmartLink className={styles.pathLink} href={section.href} glitch>
                View all
              </SmartLink>
            }
          >
            {section.unavailable ? (
              <HubReadFailure error={section.error} />
            ) : section.featured && section.items[0] ? (
              <div className={styles.spotlight}>
                <ProjectCard project={section.items[0]} wide />
              </div>
            ) : (
              <WorkshopGrid label={section.title.join(" ")}>
                {section.items.map((project, position) => (
                  <ProjectCard key={project.projectId} project={project} rank={section.ranked ? position + 1 : undefined} eager={position < 3} />
                ))}
              </WorkshopGrid>
            )}
          </Section>
        );
      })}

      {empty ? (
        <Section>
          <div data-workshop-empty>
          <EmptyState
            eyebrow="Empty library"
            title="Nothing published yet"
            action={
              <Button color="blue" lines="right" href="/account/creations/new">
                Share your first creation
              </Button>
            }
          >
            The first community resources will appear here as they are reviewed. Bring something you have built and help get things started.
          </EmptyState>
          </div>
        </Section>
      ) : null}

      <Section eyebrow={<Eyebrow as="span" index={shelfIndex}>Get involved</Eyebrow>} title={spaced(["Make the", "library bigger"])}>
        <div className={styles.closing}>
          <ul className={styles.paths}>
            {PATHS.map(path => (
              <li key={path.label} className={styles.path}>
                <span className={styles.pathLabel}>{path.label}</span>
                <h3 className={styles.pathTitle}>
                  {spaced(path.title).map(line => (
                    <span key={line} style={{ display: "block" }}>
                      {line}
                    </span>
                  ))}
                </h3>
                <p className={styles.pathText}>{path.text}</p>
                <SmartLink className={styles.pathLink} href={path.href} glitch>
                  {path.link}
                </SmartLink>
              </li>
            ))}
          </ul>
          <div className={styles.rack} aria-hidden="true">
            <Image src="/home/img/server-creators.webp" alt="" width={1827} height={1423} sizes="(max-width: 1084px) 90vw, 45vw" quality={75} />
          </div>
        </div>
      </Section>
    </HubShell>
  );
}
