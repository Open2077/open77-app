import Image from "next/image";
import Link from "next/link";

import { Eyebrow, EyebrowSpan, SlashMark } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import { ArrowRightIcon, CodeIcon, ServerRackIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { highlightCode } from "@/lib/docs";
import { cssBackgrounds, expCardArt, images } from "@/lib/images";
import { PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import {
  HOME_CLIENT_LUA,
  HOME_SERVER_LUA,
  SCRIPT_DOC_LINKS,
  SCRIPT_RUNTIMES,
} from "@/lib/scripting";
import { breadcrumbNode, jsonLdGraph, pageMetadata, softwareApplicationNode } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  description: site.description,
  path: "/",
});

/** The four load-bearing facts about the platform, stated without adjectives. */
const HERO_FACTS = [
  { key: "Model", value: "Community-run dedicated servers" },
  { key: "Requires", value: PLAYER_REQUIREMENT_SHORT },
  { key: "Game modes", value: "Whatever creators build" },
  { key: "Stage", value: "Pre-alpha, developed in the open" },
];

const RUNTIME_ICONS = {
  "CLIENT RUNTIME": CodeIcon,
  "SERVER RUNTIME": ServerRackIcon,
} as const;

function Snippet({ filename, badge, html }: { filename: string; badge: string; html: string }) {
  return (
    <div className="code-window">
      <div className="code-titlebar">
        <span className="client-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="code-filename">{filename}</span>
        <span className="client-badge">{badge}</span>
      </div>
      <div className="dx-snippet" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

const EXPERIENCES = [
  { tag: "ROLEPLAY", title: "Live another life", href: "/servers?mode=Roleplay", art: expCardArt.roleplay },
  { tag: "RACING", title: "Own the streets", href: "/servers?mode=Racing", art: expCardArt.racing },
  { tag: "CUSTOM WORLDS", title: "Rewrite the rules", href: "/servers", art: expCardArt.custom },
];

const CREATE_POINTS = [
  {
    title: "Your own dedicated server",
    body: "A persistent world you operate — on your hardware or a rented machine.",
  },
  {
    title: "Custom gameplay",
    body: "Build anything from a strict roleplay city to a racing league to a game mode nobody has seen yet.",
  },
  {
    title: "Your rules, your community",
    body: "Whitelists, moderation, staff, identity — your server page is your front door.",
  },
];

export default async function HomePage() {
  const [clientHtml, serverHtml] = await Promise.all([
    highlightCode(HOME_CLIENT_LUA, "lua"),
    highlightCode(HOME_SERVER_LUA, "lua"),
  ]);

  return (
    <>
      {/* The hero background is a stylesheet background, so the browser cannot
          discover it while parsing the markup. It is almost always the largest
          contentful paint on this page, hence the explicit hint. */}
      <link rel="preload" as="image" href={cssBackgrounds.hero} fetchPriority="high" />

      <main id="main">
        <section className="hero hero-home">
          <div className="hero-bg" aria-hidden="true">
            <i className="amb-glow amb-cyan" />
            <i className="amb-glow amb-warm" />
            <i className="amb-scan" />
          </div>
          <div className="hero-inner">
            <Eyebrow>PRE-ALPHA</Eyebrow>
            <h1 className="hero-title">
              Multiplayer for
              <br />
              Cyberpunk&nbsp;<span className="hero-title-accent">2077</span>
              <span className="hero-caret" aria-hidden="true" />
            </h1>
            <p className="hero-sub">
              Play Cyberpunk&nbsp;2077 online on community servers — or create your own server and
              your own multiplayer experience.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" href="/community#alpha">
                Join alpha
                <ArrowRightIcon />
              </Link>
              <Link className="btn btn-light btn-lg" href="/create">
                Create a server
              </Link>
            </div>
            <ul className="hero-facts" aria-label="Platform facts">
              {HERO_FACTS.map((fact) => (
                <li key={fact.key}>
                  <span className="fact-k">{fact.key}</span>
                  <span className="fact-v">{fact.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section light-zone" id="play">
          <span className="lz-corner" aria-hidden="true">
            <i />
            <i />
          </span>
          <div className="section-inner">
            <div className="split-head">
              <div>
                <Eyebrow>FOR PLAYERS</Eyebrow>
                <h2 className="section-title">
                  Play Cyberpunk
                  <br />
                  together.
                </h2>
              </div>
              <p className="split-head-lead">
                Community servers turn Night City into multiplayer worlds, each with its own rules
                and its own experience. OPEN//77 is the layer that makes them possible.
              </p>
            </div>
          </div>

          <div className="section-inner section-inner-wide">
            <figure className="feature-visual">
              <span className="hud-corners" aria-hidden="true" />
              <Image
                src={images.playTogether.src}
                width={images.playTogether.width}
                height={images.playTogether.height}
                alt={images.playTogether.alt}
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
              <figcaption className="feature-visual-caption">
                <EyebrowSpan>ONE CITY, MANY WORLDS</EyebrowSpan>
                <p>The same streets you know — shared with everyone on your server.</p>
              </figcaption>
            </figure>

            <div className="exp-grid exp-grid-3">
              {EXPERIENCES.map((experience) => (
                <Link
                  key={experience.tag}
                  className="exp-card exp-card-tall"
                  href={experience.href}
                  style={{ "--exp-img": `url('${experience.art}')` } as React.CSSProperties}
                >
                  <span className="exp-tag">
                    <SlashMark />
                    {experience.tag}
                  </span>
                  <span className="exp-body">
                    <span className="exp-title">{experience.title}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="section-cta-row">
              <Link className="btn btn-primary" href="/servers">
                Preview the server browser
                <ArrowRightIcon />
              </Link>
              <p className="section-cta-note">
                One client will take you to every community server — resources download
                automatically when you join a world.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="create">
          <div className="section-inner section-inner-wide">
            <div className="create-split">
              <div className="create-copy">
                <Eyebrow>FOR SERVER CREATORS</Eyebrow>
                <h2 className="section-title">
                  Create your
                  <br />
                  own server.
                </h2>
                <p className="section-lead">
                  Run a dedicated server that stays online for your community — with your rules,
                  your mods, and gameplay you design.
                </p>
                <ul className="create-points">
                  {CREATE_POINTS.map((point) => (
                    <li key={point.title}>
                      <h3>{point.title}</h3>
                      <p>{point.body}</p>
                    </li>
                  ))}
                </ul>
                <div className="hero-ctas">
                  <Link className="btn btn-primary" href="/create">
                    Start a server
                    <ArrowRightIcon />
                  </Link>
                  <Link className="btn btn-ghost" href="/docs">
                    Read the docs
                  </Link>
                </div>
              </div>
              <figure className="create-visual">
                <span className="hud-corners" aria-hidden="true" />
                <Image
                  src={images.createCommunity.src}
                  width={images.createCommunity.width}
                  height={images.createCommunity.height}
                  alt={images.createCommunity.alt}
                  sizes="(max-width: 1080px) 100vw, 620px"
                />
                <figcaption className="create-visual-chip">
                  <span className="live-dot" aria-hidden="true" /> YOUR WORLD // YOUR PEOPLE
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="section light-zone" id="script">
          <span className="lz-corner" aria-hidden="true">
            <i />
            <i />
          </span>
          <div className="section-inner">
            <div className="split-head">
              <div>
                <Eyebrow>FOR SCRIPT AUTHORS</Eyebrow>
                <h2 className="section-title">Develop in Lua.</h2>
              </div>
              <p className="split-head-lead">
                Every resource is Lua&nbsp;5.4. Client scripts run inside the game; server scripts
                run on the dedicated server. Each resource gets its own isolated Lua state — there
                is one language, and two runtimes that the docs keep apart on purpose.
              </p>
            </div>
          </div>

          <div className="section-inner section-inner-wide">
            <div className="benefit-grid">
              {SCRIPT_RUNTIMES.map((runtime) => {
                const Icon = RUNTIME_ICONS[runtime.tag];
                return (
                  <article className="benefit-card" key={runtime.tag}>
                    <Icon className="feat-icon" />
                    <span className="audience-tag">{runtime.tag}</span>
                    <h3>{runtime.title}</h3>
                    <p>{runtime.body}</p>
                    <Link className="btn btn-ghost" href={runtime.href}>
                      {runtime.link}
                      <ArrowRightIcon />
                    </Link>
                  </article>
                );
              })}
            </div>

            <div className="distinction-grid">
              <Snippet
                filename="resources/garage/client/main.lua"
                badge="CLIENT RUNTIME"
                html={clientHtml}
              />
              <Snippet
                filename="resources/garage/server/main.lua"
                badge="SERVER RUNTIME"
                html={serverHtml}
              />
            </div>

            <div className="section-cta-row">
              <Link className="btn btn-primary" href="/docs">
                Read the docs
                <ArrowRightIcon />
              </Link>
              <p className="section-cta-note">
                {SCRIPT_DOC_LINKS.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 ? " · " : null}
                    <Link href={link.href}>{link.label}</Link>
                  </span>
                ))}
                . Samples are the garage resource from the Lua resources guide.
              </p>
            </div>
          </div>
        </section>

        <section className="finale" id="community">
          <div className="finale-bg" aria-hidden="true">
            <i className="amb-glow amb-cyan amb-slow" />
            <i className="amb-scan" />
          </div>
          <div className="finale-inner">
            <Eyebrow>OPEN//77</Eyebrow>
            <h2 className="finale-title">
              The city was built for one.
              <br />
              Open it to everyone.
            </h2>
            <div className="hero-ctas finale-ctas">
              <Link className="btn btn-primary btn-lg" href="/community#alpha">
                Join alpha
              </Link>
              <Link className="btn btn-light btn-lg" href="/create">
                Create a server
              </Link>
            </div>
            <p className="finale-note">
              <Link href="/community">Follow development</Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter fineprint="Pre-alpha. No public build exists yet; server listings shown on this site are demo data." />

      <JsonLd
        data={jsonLdGraph(
          softwareApplicationNode(),
          breadcrumbNode([{ name: "Home", path: "/" }]),
        )}
      />
    </>
  );
}
