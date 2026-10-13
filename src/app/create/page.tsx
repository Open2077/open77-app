import Image from "next/image";
import Link from "next/link";

import { linuxGlyph, windowsGlyph } from "@/components/downloads/glyphs";
import { ArrowLink, ArtCard, FeatureGrid, SpecStrip, Steps } from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Notice } from "@/components/ui/feedback";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Icon } from "@/components/ui/icon";
import { code, discord, informationCircle, serverStack01, shield01, userGroup } from "@/components/ui/icons";
import { Page, Section } from "@/components/ui/page";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Video } from "@/components/ui/video";
import { CREATE_REQUIREMENTS_NOTE, PLAYER_REQUIREMENT_SHORT } from "@/lib/requirements";
import { breadcrumbNode, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

import styles from "./create.module.css";

export const metadata = pageMetadata({
  title: "Create a Server",
  description: `Everyone with Alpha access can download the OPEN//77 server and build a custom Cyberpunk 2077 gamemode. No separate developer application. Players need ${PLAYER_REQUIREMENT_SHORT}.`,
  path: "/create",
});

const EXPERIENCES = [
  {
    sub: "Roleplay",
    title: "Live another life",
    body: "Strict roleplay cities with their own economies, factions, jobs and staff.",
    image: "/home/img/server-roleplay.webp",
  },
  {
    sub: "Racing",
    title: "Own the streets",
    body: "Racing leagues, late-night meets and a city full of open roads.",
    image: "/home/img/server-racing.webp",
  },
  {
    sub: "Custom worlds",
    title: "Rewrite the rules",
    body: "PvP, Survival, Freeroam, or a game mode nobody has seen yet.",
    image: "/home/img/server-custom-worlds.webp",
  },
];

const MODES = ["Roleplay", "Racing", "PvP", "Battle Royale", "Survival", "Social hub"];

const BENEFITS = [
  {
    icon: serverStack01,
    title: "A dedicated, persistent world",
    body: "Your server keeps running when players log off. Economies, factions and stories continue. The world remembers, because you host it.",
    href: "/docs/host-a-server",
    action: "Hosting guide",
  },
  {
    icon: shield01,
    title: "Your rules & moderation",
    body: "Whitelist or open door, hardcore or casual: you set the rules, pick the staff, and shape the culture of your community.",
    href: "/docs/warden",
    action: "Meet Warden, the admin panel",
  },
  {
    icon: code,
    title: "Custom gameplay & resources",
    body: "Add jobs, economies, missions, vehicles and UI through resources, drop-in packages of gameplay. Use what the community shares, or script your own.",
    href: "/docs/server-resources",
    action: "How resources work",
  },
  {
    icon: userGroup,
    title: "A front door for your community",
    body: "Your server page in the public browser shows your world, mode, language and player count. Discovery is built into the platform.",
    href: "/servers",
    action: "Preview the server browser",
  },
];

const STEPS = [
  {
    title: "Get the server",
    body: (
      <p>
        Download the <Link href="/host">dedicated server software</Link> and run it on your own hardware or a rented machine.
        It is a normal server process: it does not need Cyberpunk 2077 installed, and you own it entirely.
      </p>
    ),
  },
  {
    title: "License it to your account",
    body: (
      <p>
        Create a free account, mint a license key in the <Link href="/account/keys">keymaster</Link>, and put it in your
        server config. The key ties the server to you and is what the master checks before it lets the server onto the
        platform.
      </p>
    ),
  },
  {
    title: "Open the doors",
    body: (
      <p>
        Shape your slots, rules, language and mode, add the resources you want, and your licensed server appears in the
        public browser. Players&apos; clients auto-download everything your world needs.
      </p>
    ),
  },
];

export default function CreatePage() {
  return (
    <Page tone="blue">
      <ProductHero
        titleId="create-title"
        eyebrow="Create a server"
        title={["Run your own", "Night City"]}
        accent={[1]}
        lead={
          <>
            A dedicated Cyberpunk&nbsp;2077 server that stays online for your community, with your rules, your identity, and
            gameplay you design. <strong>Everyone with Alpha access can download it and start building now.</strong>
          </>
        }
        className={styles.hero}
        art={{ src: "/home/img/creators-bg.webp", position: "70% 50%" }}
        figure={{ src: "/home/img/creators-character.webp", width: 1261, height: 1253 }}
        strip={
          <SpecStrip
            facts={[
              { icon: windowsGlyph, label: "Windows host", value: "64-bit · .NET runtime included" },
              { icon: linuxGlyph, label: "Linux host", value: "64-bit · .NET runtime included" },
              { icon: code, label: "Scripting", value: "Lua 5.4 resources · Chromium WebUI" },
              { icon: serverStack01, label: "Hosting", value: "Your hardware or a rented machine" },
            ]}
          />
        }
      >
        <div className={styles.actions}>
          <Button color="blue" lines="left" href="/host">Download server</Button>
          <Button color="blue" border lines="none" href="/docs/host-a-server">
            Hosting guide
          </Button>
          <ArrowLink href="/docs/platform#dedicated-servers">Technical docs</ArrowLink>
        </div>
        <p className={styles.heroNote}>
          <Icon glyph={informationCircle} />
          {CREATE_REQUIREMENTS_NOTE}
        </p>
      </ProductHero>

      <Section
        id="experiences"
        eyebrow="From RP to racing to unknown"
        title={["Any experience", "you can script."]}
        lead={
          <>
            OPEN//77 doesn&apos;t ship a game mode. It ships the platform. A hardcore roleplay city, a ranked racing league, a
            survival district, a social hub with zero combat, or something nobody has built yet: they&apos;re all just
            servers.
          </>
        }
      >
        <div className={styles.experiences}>
          {EXPERIENCES.map((experience) => (
            <ArtCard key={experience.title} image={experience.image} sub={experience.sub} title={experience.title}>
              <p>{experience.body}</p>
            </ArtCard>
          ))}
        </div>
        <ul className={styles.modes} aria-label="Game modes people build">
          {MODES.map((mode) => (
            <li key={mode}>
              <Tag tone="neutral">{mode}</Tag>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="benefits" className={styles.benefitsSection}>
        <div className={styles.benefits}>
          <div className={styles.benefitsCopy}>
            <Eyebrow>What a server gives you</Eyebrow>
            <Display size="lg" lines={["Your world,", "your call."]} accent={[1]} className={styles.benefitsTitle} />
            <FeatureGrid items={BENEFITS} columns={2} />
          </div>
          <div className={styles.rack} aria-hidden="true">
            <GlitchFrame>
              <Image
                src="/home/img/server-creators.webp"
                alt=""
                width={1827}
                height={1423}
                sizes="(max-width: 1084px) 90vw, 40vw"
                quality={100}
                draggable={false}
              />
            </GlitchFrame>
          </div>
        </div>
      </Section>

      <Section id="how" eyebrow="How it works" title="Three steps to open the doors.">
        <Steps steps={STEPS} />
        <Notice kind="info" title="Licensing." className={styles.notice}>
          Every server on the platform belongs to an account. The{" "}
          <Link href="/docs/server-licensing">server licensing guide</Link> walks through creating an account, getting a
          license key, and linking it to your server so the master authorises it. See also the{" "}
          <Link href="/docs/platform#requirements">platform requirements</Link>.
        </Notice>
      </Section>

      <section id="alpha-access" className={styles.band} aria-labelledby="alpha-title">
        <div className={styles.bandArt} aria-hidden="true">
          <Video id="hero" />
        </div>
        <div className={styles.bandInner}>
          <Eyebrow>Alpha access · Build now</Eyebrow>
          <Display id="alpha-title" size="lg" lines={["It's time", "to build."]} accent={[1]} />
          <p className={styles.bandText}>
            Everyone with Alpha access can now download the server and start building. Roleplay, PvP, Battle Royale, Racing,
            Survival: create your own gamemode and your own experience in Night City. No separate developer application,
            project review or staff role. Need Alpha access? Use <code>/alpha apply</code> with the bot in any channel on our
            official Discord.
          </p>
          <div className={styles.actions}>
            <Button
              color="blue"
              lines="left"
              icon={discord}
              iconPosition="left"
              href={site.links.discord ?? "https://discord.open2077.net"}
            >
              Join our Discord
            </Button>
            <Button color="blue" border lines="none" href="/docs/alpha-access">
              Read the Alpha guide
            </Button>
          </div>
        </div>
      </section>

      <Section
        id="builders"
        eyebrow="For builders"
        title="Want the technical details?"
        lead="Architecture, dedicated servers, the resource format and the complete Lua API live in the documentation, written for people who build."
      >
        <div className={styles.actions}>
          <Button color="blue" border lines="none" href="/docs/server-resources">
            Server docs
          </Button>
          <Button color="neutral" border lines="none" href="/docs/server-licensing">
            Server licensing
          </Button>
          <ArrowLink href="/docs/api">Lua API reference</ArrowLink>
        </div>
      </Section>

      <JsonLd
        data={jsonLdGraph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Create a Server", path: "/create" },
          ]),
        )}
      />
    </Page>
  );
}
