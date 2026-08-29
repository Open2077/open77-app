import Image from "next/image";
import Link from "next/link";

import { Eyebrow, SlashMark } from "@/components/brand";
import { JsonLd } from "@/components/json-ld";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CodeIcon,
  InfoIcon,
  PeopleIcon,
  ServerRackIcon,
  ShieldIcon,
} from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { cssBackgrounds, images } from "@/lib/images";
import { CREATE_REQUIREMENTS_NOTE, PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Create a Server",
  description: `Run your own Cyberpunk 2077 multiplayer server with OPEN//77. Players need ${PLAYER_REQUIREMENT_SHORT}. The dedicated server does not need the game installed.`,
  path: "/create",
});

const BENEFITS = [
  {
    Icon: ServerRackIcon,
    title: "A dedicated, persistent world",
    body: "Your server keeps running when players log off. Economies, factions and stories continue — the world remembers, because you host it.",
  },
  {
    Icon: ShieldIcon,
    title: "Your rules & moderation",
    body: "Whitelist or open door, hardcore or casual — you set the rules, pick the staff, and shape the culture of your community.",
  },
  {
    Icon: CodeIcon,
    title: "Custom gameplay & resources",
    body: "Add jobs, economies, missions, vehicles and UI through resources — drop-in packages of gameplay. Use what the community shares, or script your own.",
  },
  {
    Icon: PeopleIcon,
    title: "A front door for your community",
    body: "Your server page in the public browser shows your world, mode, language and player count — discovery is built into the platform.",
  },
];

const MODE_SHOTS = [
  { image: images.roleplay, caption: "ROLEPLAY CITIES" },
  { image: images.racing, caption: "RACING LEAGUES" },
  { image: images.combat, caption: "COMBAT & SURVIVAL" },
];

const STEPS = [
  {
    num: "01",
    title: "Get the server",
    body: "Download the dedicated server software and run it on your own hardware or a rented machine. It is a normal server process — it does not need Cyberpunk 2077 installed, and you own it entirely.",
  },
  {
    num: "02",
    title: "License it to your account",
    body: "Create a free account, mint a license key in the keymaster, and put it in your server config. The key ties the server to you and is what the master checks before it lets the server onto the platform.",
  },
  {
    num: "03",
    title: "Open the doors",
    body: "Shape your slots, rules, language and mode, add the resources you want, and your licensed server appears in the public browser — players' clients auto-download everything your world needs.",
  },
];

export default function CreatePage() {
  return (
    <>
      <link rel="preload" as="image" href={cssBackgrounds.createHero} fetchPriority="high" />

      <main id="main">
        <section className="page-hero page-hero-create">
          <div className="page-hero-bg" aria-hidden="true" />
          <div className="section-inner page-hero-inner">
            <Eyebrow>CREATE A SERVER</Eyebrow>
            <h1 className="page-title">
              Run your own
              <br />
              Night City.
            </h1>
            <p className="section-lead">
              A dedicated Cyberpunk&nbsp;2077 server that stays online for your community — with
              your rules, your identity, and gameplay you design. {CREATE_REQUIREMENTS_NOTE}
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#how">
                How it works
                <ArrowDownIcon />
              </a>
              <Link className="btn btn-ghost" href="/docs/platform#dedicated-servers">
                Technical docs
              </Link>
            </div>
          </div>
        </section>

        <section className="section" id="benefits">
          <div className="section-inner">
            <Eyebrow>WHAT A SERVER GIVES YOU</Eyebrow>
            <h2 className="section-title">Your world, your call.</h2>
            <div className="benefit-grid">
              {BENEFITS.map(({ Icon, title, body }) => (
                <article className="benefit-card" key={title}>
                  <Icon className="feat-icon" />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="modes">
          <div className="section-inner section-inner-wide">
            <div className="split-head">
              <div>
                <Eyebrow>FROM RP TO RACING TO UNKNOWN</Eyebrow>
                <h2 className="section-title">
                  Any experience
                  <br />
                  you can script.
                </h2>
              </div>
              <p className="split-head-lead">
                OPEN//77 doesn&apos;t ship a game mode — it ships the platform. A hardcore roleplay
                city, a ranked racing league, a survival district, a social hub with zero combat, or
                something nobody has built yet: they&apos;re all just servers.
              </p>
            </div>
            <div className="mode-strip">
              {MODE_SHOTS.map(({ image, caption }) => (
                <figure className="mode-shot" key={caption}>
                  <span className="hud-corners" aria-hidden="true" />
                  <Image
                    src={image.src}
                    width={image.width}
                    height={image.height}
                    alt={image.alt}
                    sizes="(max-width: 1080px) 100vw, 420px"
                  />
                  <figcaption>
                    <SlashMark /> {caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-inner">
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <h2 className="section-title">Three steps to open the doors.</h2>
            <ol className="steps steps-3">
              {STEPS.map((step) => (
                <li className="step" key={step.num}>
                  <span className="step-num">{step.num}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="status-note" role="note">
              <InfoIcon />
              <span>
                <strong>Requirements.</strong> {CREATE_REQUIREMENTS_NOTE} See{" "}
                <Link href="/docs/platform#requirements">platform requirements</Link>.
              </span>
            </p>
            <p className="status-note" role="note">
              <InfoIcon />
              <span>
                <strong>Licensing.</strong> Every server on the platform belongs to an account. The{" "}
                <Link href="/docs/server-licensing">server licensing guide</Link> walks through
                creating an account, getting a license key, and linking it to your server so the
                master authorises it.
              </span>
            </p>
            <p className="status-note" role="note">
              <InfoIcon />
              <span>
                <strong>Honest status:</strong> the dedicated server download opens to owners in a
                later pre-alpha milestone — you cannot host a public world yet. This page shows the
                intended flow so you can start planning your world now. See the{" "}
                <Link href="/docs/platform#roadmap">roadmap</Link>.
              </span>
            </p>
          </div>
        </section>

        <section className="section" id="deeper">
          <div className="section-inner">
            <div className="deeper-band light-zone">
              <span className="lz-corner" aria-hidden="true">
                <i />
                <i />
              </span>
              <div>
                <Eyebrow>FOR BUILDERS</Eyebrow>
                <h2 className="browser-cta-title">Want the technical details?</h2>
                <p>
                  Architecture, dedicated servers, the resource format and the complete Lua API live
                  in the documentation — written for people who build.
                </p>
              </div>
              <div className="deeper-links">
                <Link className="btn btn-primary" href="/docs/server-resources">
                  Server docs
                  <ArrowRightIcon />
                </Link>
                <Link className="btn btn-ghost" href="/docs/server-licensing">
                  Server licensing
                </Link>
                <Link className="btn btn-ghost" href="/docs/api">
                  Lua API reference
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Create a Server", path: "/create" },
          ]),
        )}
      />
    </>
  );
}
