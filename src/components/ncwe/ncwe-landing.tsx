import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { ArrowLink, Faq, FeatureGrid, SpecStrip, Steps } from "@/components/downloads/product-blocks";
import { ProductHero } from "@/components/downloads/product-hero";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import {
  arrowUp01,
  cursor01,
  discord,
  dollarCircle,
  folderOpen,
  gameController03,
  gridView,
  image01,
  layers01,
  maps,
  packageBox,
  road,
  serverStack01,
  squareUnlock02,
  sun03,
  tick02,
  trafficLight,
  user,
  video01,
  wrench01,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";
import { megabytes, NCWE_ARCHIVEXL, NCWE_RELEASE, NCWE_TRAILER } from "@/lib/ncwe-release";
import { site } from "@/lib/site";
import { NcweTrailerButton, NcweTrailerPoster } from "./ncwe-trailer";

import styles from "./ncwe-landing.module.css";

/**
 * Stills from the trailer, taken where no caption is burned in (the YouTube
 * thumbnail, NCWE_TRAILER.poster, carries a giant "THEN GO BIGGER."):
 * the glass arcade at 0:04, graded and widened with a dark left side for the
 * copy, and the night-preview street at 1:16 for the reel.
 */
const HERO_ART = "/assets/ncwe/hero-glass-arcade.webp";
const REEL_POSTER = "/assets/ncwe/reel-night-street.webp";

const CITY_POINTS = [
  {
    title: "It streams as the game does.",
    body: "No neighborhood to load: sectors arrive around your camera the way the game picks them, and a place you have visited comes back almost at once.",
  },
  {
    title: "It looks like the game.",
    body: "Near the camera, meshes wear their real materials: layered surfaces, glass, decals, water, neons, screens and foliage, under a sun, a sky and a night preview.",
  },
  {
    title: "It leaves your game alone.",
    body: "A project is a list of changes against the game's data. Nothing in your installation is rewritten, and every export is checked against what you edited.",
  },
];

const TOOLS = [
  { icon: cursor01, title: "Move what is there", body: "Select, move, rotate, scale, hide or replace the game's own objects, with gizmos, snapping and unlimited undo." },
  { icon: road, title: "Roads", body: "Draw splines with any game road type, bank them, drop them on the ground. They export with collision that follows the surface." },
  { icon: maps, title: "Terrain", body: "Sculpt, cut and paint the ground. Plants and the objects resting on it follow." },
  { icon: sun03, title: "Lights, effects, decals, sounds", body: "Place point, spot and area lights, particles, decals and sound emitters, or edit the game's own." },
  { icon: squareUnlock02, title: "Doors and entities", body: "Place any entity template, pick its appearance, and set how a door opens, closes and locks." },
  { icon: arrowUp01, title: "Elevators", body: "Pick a type, click each floor it stops at. It exports as the game builds its own, with call panels and landing doors." },
  { icon: gridView, title: "Collision and occlusion", body: "See the game's real collision and occluders, edit them, add your own, or fit collision to a mesh." },
  { icon: trafficLight, title: "Traffic", body: "View, edit, link and draw the lanes vehicles and pedestrians follow." },
  { icon: folderOpen, title: "Library and prefabs", body: "Browse the game's props and entities with thumbnails and live 3D previews. Save your own prefabs and stamp them anywhere." },
];

const ASSETS = [
  { icon: layers01, tag: "Models", title: "Your meshes", body: "Import glTF, FBX or OBJ. NCWE cooks them into game meshes and textures when you export." },
  { icon: image01, tag: "Pictures", title: "Your decals", body: "Any picture becomes a decal, transparency kept. Keep them in a bank and place them like the game's." },
  { icon: video01, tag: "Audio", title: "Your sounds", body: "Ambiences and music for OPEN//77 worlds. A synced loop plays at the same moment for every player." },
];

const EXPORTS = [
  { icon: packageBox, tag: "Single player", title: "ArchiveXL mod", body: "A package for archive/pc/mod with its own sectors and guarded patches. Install it and remove it from the editor." },
  { icon: serverStack01, tag: "Multiplayer", title: "OPEN//77 world", body: "A server resource the launcher installs for every player before the game starts. Your map, on your server." },
  { icon: wrench01, tag: "WolvenKit", title: "World Builder", body: "A file for WolvenKit's World Builder, to carry what you placed into that workflow." },
];

const TOGETHER = [
  { title: "Live sessions.", body: "Everyone's edits arrive as they are made; you see the others' cameras and selections, with chat built in." },
  { title: "Shared worlds.", body: "Share a world with an invite code: one builds at night, another goes on in the morning." },
  { title: "Cloud saves.", body: "Every version of your worlds, on any PC, with the models and sounds they use." },
];

const AGENTS = [
  { title: "An MCP server comes with it.", body: "Claude Code, Codex or any MCP client drives the running editor." },
  { title: "You watch it work.", body: "The agent says what it plans, measures in your view, and every batch is one undo step." },
  { title: "Same tools as you.", body: "Interiors, streets and new places, built with what the editor already does." },
];

const STEPS = [
  { title: "Download and extract", body: <p>Unzip the whole archive into a folder of your choice. Do not start NCWE from inside the zip.</p> },
  {
    title: "Start NCWE.Studio.exe",
    body: <p>The beta is not signed yet: if Windows SmartScreen appears, choose More info, then Run anyway.</p>,
  },
  {
    title: "Open Night City",
    body: <p>NCWE finds your Cyberpunk 2077 installation on its own, or asks for its folder. Then fly.</p>,
  },
];

const QUESTIONS = [
  {
    q: "Is it free?",
    a: "Yes. NCWE is free software under the GNU General Public License v3.0. No game data is included: it reads the city from your own installation.",
  },
  {
    q: "Do I need an account?",
    a: "Not to build. An OPEN//77 account is only asked for cloud saves and live collaboration, and signing in happens on open2077.net in your browser.",
  },
  {
    q: "Which game version?",
    a: (
      <>
        Cyberpunk 2077 {NCWE_RELEASE.game}, on Windows 10 or 11 with a DirectX 11 graphics card. To play what you export,
        the game needs ArchiveXL and RED4ext. ArchiveXL has no official 2.5 release yet: install{" "}
        <a href={NCWE_ARCHIVEXL.url}>our 2.5 build of ArchiveXL</a> ({NCWE_ARCHIVEXL.version}, source on{" "}
        <a href={NCWE_ARCHIVEXL.source} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        ).
      </>
    ),
  },
  {
    q: "Will it change my game files?",
    a: "No. Projects are stored as changes, and an export is a separate mod you install and remove. Your vanilla files are never rewritten.",
  },
  {
    q: "It is a beta. What does that mean?",
    a: "Things move fast and some break. Help > Open the logs folder collects what we need for a bug report; bring it to the OPEN//77 Discord.",
  },
];

function CheckList({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <ul className={styles.checks}>
      {items.map((item) => (
        <li key={item.title}>
          <span className={styles.tick} aria-hidden="true">
            <Icon glyph={tick02} />
          </span>
          <span>
            <strong>{item.title}</strong> {item.body}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** /ncwe: what the Night City World Editor is, and its download. Renders inside a blue <Page>. */
export function NcweLanding() {
  const size = megabytes(NCWE_RELEASE.bytes);
  return (
    <>
      <ProductHero
        titleId="ncwe-title"
        eyebrow={
          <>
            Night City World Editor <Tag tone="blue" variant="solid">Open beta</Tag>
          </>
        }
        title={["Shape", "Night City", "as you want."]}
        accent={[2]}
        lead={
          <>
            <strong>NCWE</strong> is the free world editor for Cyberpunk&nbsp;2077. Fly through the real city, move or remove
            what is there, build new places with roads, terrain, lights and your own models, then ship them as an ArchiveXL
            mod or an OPEN//77 multiplayer world.
          </>
        }
        art={{ src: HERO_ART, position: "79% 35%" }}
        strip={
          <SpecStrip
            label="NCWE at a glance"
            facts={[
              { icon: dollarCircle, label: "Price", value: "Free and open source" },
              { icon: user, label: "Account", value: "None needed to build" },
              { icon: gameController03, label: "Game", value: `Cyberpunk 2077 ${NCWE_RELEASE.game}` },
              { icon: packageBox, label: "Ships as", value: "ArchiveXL mods · OPEN//77 worlds" },
            ]}
          />
        }
        wide
      >
        <div className={styles.heroActions}>
          <DownloadAction
            href={NCWE_RELEASE.url}
            label="Download for Windows"
            meta={`${NCWE_RELEASE.version} · ${size}`}
            note={`Windows 10 and 11 · Cyberpunk 2077 ${NCWE_RELEASE.game} · no account needed`}
          />
          <NcweTrailerButton videoId={NCWE_TRAILER.id} title={NCWE_TRAILER.title} length={NCWE_TRAILER.length} />
        </div>
      </ProductHero>

      <Section
        id="city"
        eyebrow="The real city"
        title={["Night City, live", "around your camera."]}
        lead="Not a blank grid and not a copy: the editor reads the city from your own game and draws it as you fly, so what you build sits in the real streets from the first click."
      >
        <Steps steps={CITY_POINTS.map((point) => ({ title: point.title, body: <p>{point.body}</p> }))} />
      </Section>

      <Section
        id="tools"
        eyebrow="The tools"
        title={["Everything a mapper", "reaches for."]}
        lead="One editor for the whole job: change what the game put there, then add what it never had."
      >
        <FeatureGrid items={TOOLS} columns={3} className={styles.tools} />
      </Section>

      <Section id="reel" width="wide" className={styles.reelSection}>
        <div className={styles.reelHead}>
          <Eyebrow>Two minutes</Eyebrow>
          <Display size="md" lines={["See it", "move."]} accent={[1]} />
        </div>
        <div className={styles.reelFrame}>
          <NcweTrailerPoster
            videoId={NCWE_TRAILER.id}
            title={NCWE_TRAILER.title}
            poster={REEL_POSTER}
            length={NCWE_TRAILER.length}
          />
        </div>
      </Section>

      <Section
        id="content"
        eyebrow="Your own content"
        title={["Bring what the game", "never shipped."]}
        lead="Your library lives beside the game's. What a world uses travels with it when you export or share it."
      >
        <FeatureGrid items={ASSETS} columns={3} />
      </Section>

      <Section id="together">
        <div className={styles.duo}>
          <Panel as="article" brackets padding="lg" aria-labelledby="together-title">
            <Eyebrow>Together</Eyebrow>
            <Display as="h2" size="sm" id="together-title" className={styles.duoTitle}>
              Build with your crew.
            </Display>
            <CheckList items={TOGETHER} />
            <p className={styles.duoNote}>These three use a free OPEN//77 account. Building alone never does.</p>
          </Panel>
          <Panel as="article" brackets padding="lg" aria-labelledby="agents-title">
            <Eyebrow>AI agents</Eyebrow>
            <Display as="h2" size="sm" id="agents-title" className={styles.duoTitle}>
              Or hand the tools to an agent.
            </Display>
            <CheckList items={AGENTS} />
            <p className={styles.duoNote}>The automation pipe is local and limited to your Windows user.</p>
          </Panel>
        </div>
      </Section>

      <Section
        id="ship"
        eyebrow="Ship it"
        title={["From the editor", "to the game."]}
        lead="One project, three ways out. Each export carries a manifest of what it changes and what it was built against."
      >
        <FeatureGrid items={EXPORTS} columns={3} />
        <p className={styles.aside}>
          Running a server? <ArrowLink href="/create">Create your OPEN//77 server</ArrowLink>
        </p>
      </Section>

      <Section id="download" className={styles.downloadSection}>
        <div className={styles.download}>
          <div className={styles.downloadCopy}>
            <Eyebrow>Open beta</Eyebrow>
            <Display size="md" lines={["Get", "NCWE."]} accent={[1]} />
            <p className={styles.downloadText}>
              Free, no account, nothing else to install: .NET and the Windows App SDK come in the zip.
            </p>
            <DownloadAction
              href={NCWE_RELEASE.url}
              label={`Download NCWE ${NCWE_RELEASE.version}`}
              meta={`Windows 10 and 11, 64-bit · ${size}`}
            />
            <div className={styles.checksum}>
              <span className={styles.checksumLabel}>SHA-256</span>
              <CopyLine value={NCWE_RELEASE.sha256} label="Copy the SHA-256 of the download" />
            </div>
            {site.links.discord ? (
              <span className={styles.discord}>
                <Button color="neutral" border lines="none" icon={discord} iconPosition="left" href={site.links.discord}>
                  Feedback & help on Discord
                </Button>
              </span>
            ) : null}
          </div>
          <div className={styles.downloadSteps}>
            <Eyebrow muted>Three steps</Eyebrow>
            <Steps steps={STEPS} className={styles.stepsStacked} />
          </div>
        </div>
      </Section>

      <Section id="faq" eyebrow="Before you start" title="Questions." width="narrow">
        <Faq items={QUESTIONS} />
      </Section>

      <Section width="narrow" className={styles.closing}>
        <p className={styles.thanks}>
          NCWE stands on{" "}
          <a href="https://github.com/WolvenKit/WolvenKit" target="_blank" rel="noopener noreferrer">
            WolvenKit
          </a>{" "}
          and{" "}
          <a href="https://github.com/psiberx/cp2077-archive-xl" target="_blank" rel="noopener noreferrer">
            ArchiveXL
          </a>
          . Without them it would not exist: thank you to their authors.
        </p>
        <p className={styles.fineprint}>
          NCWE is in open beta and free software (GPL-3.0). It is an independent community project, unaffiliated with CD
          PROJEKT RED; Cyberpunk 2077 is a trademark of CD PROJEKT S.A. No game data is included.
        </p>
      </Section>
    </>
  );
}
