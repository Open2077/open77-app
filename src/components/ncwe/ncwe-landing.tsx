import Link from "next/link";

import { CopyLine } from "@/components/copy-line";
import { ArrowRightIcon, CheckIcon, DiscordIcon, DownloadIcon, PlayIcon, WindowsIcon } from "@/components/icons";
import { megabytes, NCWE_RELEASE, NCWE_TRAILER } from "@/lib/ncwe-release";
import { site } from "@/lib/site";
import { NcweHeroBackdrop, NcweTrailerButton, NcweTrailerPoster } from "./ncwe-trailer";
import styles from "./ncwe-landing.module.css";

const FACTS = [
  { key: "Price", value: "Free and open source" },
  { key: "Account", value: "None needed to build" },
  { key: "Game", value: `Cyberpunk 2077 ${NCWE_RELEASE.game}` },
  { key: "Ships as", value: "ArchiveXL mods · OPEN//77 worlds" },
];

const CITY_POINTS = [
  { title: "It streams as the game does.", body: "No neighborhood to load: sectors arrive around your camera the way the game picks them, and a place you have visited comes back almost at once." },
  { title: "It looks like the game.", body: "Near the camera, meshes wear their real materials: layered surfaces, glass, decals, water, neons, screens and foliage, under a sun, a sky and a night preview." },
  { title: "It leaves your game alone.", body: "A project is a list of changes against the game's data. Nothing in your installation is rewritten, and every export is checked against what you edited." },
];

const TOOLS = [
  { title: "Move what is there", body: "Select, move, rotate, scale, hide or replace the game's own objects, with gizmos, snapping and unlimited undo." },
  { title: "Roads", body: "Draw splines with any game road type, bank them, drop them on the ground. They export with collision that follows the surface." },
  { title: "Terrain", body: "Sculpt, cut and paint the ground. Plants and the objects resting on it follow." },
  { title: "Lights, effects, decals, sounds", body: "Place point, spot and area lights, particles, decals and sound emitters, or edit the game's own." },
  { title: "Doors and entities", body: "Place any entity template, pick its appearance, and set how a door opens, closes and locks." },
  { title: "Elevators", body: "Pick a type, click each floor it stops at. It exports as the game builds its own, with call panels and landing doors." },
  { title: "Collision and occlusion", body: "See the game's real collision and occluders, edit them, add your own, or fit collision to a mesh." },
  { title: "Traffic", body: "View, edit, link and draw the lanes vehicles and pedestrians follow." },
  { title: "Library and prefabs", body: "Browse the game's props and entities with thumbnails and live 3D previews. Save your own prefabs and stamp them anywhere." },
];

const ASSETS = [
  { tag: "MODELS", title: "Your meshes", body: "Import glTF, FBX or OBJ. NCWE cooks them into game meshes and textures when you export." },
  { tag: "PICTURES", title: "Your decals", body: "Any picture becomes a decal, transparency kept. Keep them in a bank and place them like the game's." },
  { tag: "AUDIO", title: "Your sounds", body: "Ambiences and music for OPEN//77 worlds. A synced loop plays at the same moment for every player." },
];

const EXPORTS = [
  { tag: "SINGLE PLAYER", title: "ArchiveXL mod", body: "A package for archive/pc/mod with its own sectors and guarded patches. Install it and remove it from the editor." },
  { tag: "MULTIPLAYER", title: "OPEN//77 world", body: "A server resource the launcher installs for every player before the game starts. Your map, on your server." },
  { tag: "WOLVENKIT", title: "World Builder", body: "A file for WolvenKit's World Builder, to carry what you placed into that workflow." },
];

const STEPS = [
  { title: "Download and extract", body: "Unzip the whole archive into a folder of your choice. Do not start NCWE from inside the zip." },
  { title: "Start NCWE.Studio.exe", body: "The beta is not signed yet: if Windows SmartScreen appears, choose More info, then Run anyway." },
  { title: "Open Night City", body: "NCWE finds your Cyberpunk 2077 installation on its own, or asks for its folder. Then fly." },
];

const QUESTIONS = [
  { q: "Is it free?", a: "Yes. NCWE is free software under the GNU General Public License v3.0. No game data is included: it reads the city from your own installation." },
  { q: "Do I need an account?", a: "Not to build. An OPEN//77 account is only asked for cloud saves and live collaboration, and signing in happens on open2077.net in your browser." },
  { q: "Which game version?", a: `Cyberpunk 2077 ${NCWE_RELEASE.game}, on Windows 10 or 11 with a DirectX 11 graphics card. To play what you export, the game needs ArchiveXL and RED4ext.` },
  { q: "Will it change my game files?", a: "No. Projects are stored as changes, and an export is a separate mod you install and remove. Your vanilla files are never rewritten." },
  { q: "It is a beta. What does that mean?", a: "Things move fast and some break. Help > Open the logs folder collects what we need for a bug report; bring it to the OPEN//77 Discord." },
];

/** /ncwe: what the Night City World Editor is, and its download. */
export function NcweLanding() {
  const size = megabytes(NCWE_RELEASE.bytes);
  return (
    <main id="main" className={styles.page}>
      <section className={styles.hero} aria-labelledby="ncwe-title">
        <NcweHeroBackdrop videoId={NCWE_TRAILER.id} poster={NCWE_TRAILER.poster} />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><span aria-hidden="true">{"//"}</span> NIGHT CITY WORLD EDITOR <b>OPEN BETA</b></p>
          <h1 id="ncwe-title">Shape Night City<em>as you want.</em></h1>
          <p className={styles.lede}>
            <strong>NCWE</strong> is the free world editor for Cyberpunk&nbsp;2077. Fly through the real city, move or remove what is there,
            build new places with roads, terrain, lights and your own models, then ship them as an ArchiveXL mod or an OPEN//77 multiplayer world.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href={NCWE_RELEASE.url}>
              <DownloadIcon size={18} />
              <span><b>Download for Windows</b><i>{NCWE_RELEASE.version} · {size}</i></span>
            </a>
            <NcweTrailerButton videoId={NCWE_TRAILER.id} title={NCWE_TRAILER.title} className={styles.secondary}>
              <PlayIcon size={16} /><span>Watch the trailer</span><i>{NCWE_TRAILER.length}</i>
            </NcweTrailerButton>
          </div>
          <p className={styles.small}><WindowsIcon size={13} /> Windows 10 and 11 · Cyberpunk 2077 {NCWE_RELEASE.game} · no account needed</p>
        </div>
        <a className={styles.scroll} href="#city"><span>SEE WHAT IT DOES</span><i aria-hidden="true" /></a>
      </section>

      <ul className={styles.facts} aria-label="NCWE at a glance">
        {FACTS.map((fact) => <li key={fact.key}><span>{fact.key.toUpperCase()}</span><strong>{fact.value}</strong></li>)}
      </ul>

      <section className={styles.band} id="city" aria-labelledby="city-title">
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> THE REAL CITY</p>
          <h2 id="city-title">Night City, live around<em>your camera.</em></h2>
          <p>Not a blank grid and not a copy: the editor reads the city from your own game and draws it as you fly, so what you build sits in the real streets from the first click.</p>
        </div>
        <ol className={styles.points}>
          {CITY_POINTS.map((point, index) => <li key={point.title}><span>0{index + 1}</span><h3>{point.title}</h3><p>{point.body}</p></li>)}
        </ol>
      </section>

      <section className={styles.band} aria-labelledby="tools-title">
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> THE TOOLS</p>
          <h2 id="tools-title">Everything a mapper<em>reaches for.</em></h2>
          <p>One editor for the whole job: change what the game put there, then add what it never had.</p>
        </div>
        <ul className={styles.grid}>
          {TOOLS.map((tool, index) => <li key={tool.title}><span>{String(index + 1).padStart(2, "0")} /</span><h3>{tool.title}</h3><p>{tool.body}</p></li>)}
        </ul>
      </section>

      <section className={styles.reelBand} aria-labelledby="reel-title">
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> TWO MINUTES</p>
          <h2 id="reel-title">See it<em>move.</em></h2>
        </div>
        <NcweTrailerPoster videoId={NCWE_TRAILER.id} title={NCWE_TRAILER.title} poster={NCWE_TRAILER.poster} length={NCWE_TRAILER.length} />
      </section>

      <section className={styles.band} aria-labelledby="assets-title">
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> YOUR OWN CONTENT</p>
          <h2 id="assets-title">Bring what the game<em>never shipped.</em></h2>
          <p>Your library lives beside the game&apos;s. What a world uses travels with it when you export or share it.</p>
        </div>
        <ul className={styles.trio}>
          {ASSETS.map((asset) => <li key={asset.title}><span>{asset.tag}</span><h3>{asset.title}</h3><p>{asset.body}</p></li>)}
        </ul>
      </section>

      <section className={styles.duo}>
        <article aria-labelledby="together-title">
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> TOGETHER</p>
          <h2 id="together-title">Build with your crew.</h2>
          <ul className={styles.checks}>
            <li><CheckIcon size={15} /><span><strong>Live sessions.</strong> Everyone&apos;s edits arrive as they are made; you see the others&apos; cameras and selections, with chat built in.</span></li>
            <li><CheckIcon size={15} /><span><strong>Shared worlds.</strong> Share a world with an invite code: one builds at night, another goes on in the morning.</span></li>
            <li><CheckIcon size={15} /><span><strong>Cloud saves.</strong> Every version of your worlds, on any PC, with the models and sounds they use.</span></li>
          </ul>
          <p className={styles.note}>These three use a free OPEN//77 account. Building alone never does.</p>
        </article>
        <article aria-labelledby="agents-title">
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> AI AGENTS</p>
          <h2 id="agents-title">Or hand the tools to an agent.</h2>
          <ul className={styles.checks}>
            <li><CheckIcon size={15} /><span><strong>An MCP server comes with it.</strong> Claude Code, Codex or any MCP client drives the running editor.</span></li>
            <li><CheckIcon size={15} /><span><strong>You watch it work.</strong> The agent says what it plans, measures in your view, and every batch is one undo step.</span></li>
            <li><CheckIcon size={15} /><span><strong>Same tools as you.</strong> Interiors, streets and new places, built with what the editor already does.</span></li>
          </ul>
          <p className={styles.note}>The automation pipe is local and limited to your Windows user.</p>
        </article>
      </section>

      <section className={styles.band} aria-labelledby="ship-title">
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> SHIP IT</p>
          <h2 id="ship-title">From the editor<em>to the game.</em></h2>
          <p>One project, three ways out. Each export carries a manifest of what it changes and what it was built against.</p>
        </div>
        <ul className={styles.trio}>
          {EXPORTS.map((target) => <li key={target.title}><span>{target.tag}</span><h3>{target.title}</h3><p>{target.body}</p></li>)}
        </ul>
        <p className={styles.aside}>Running a server? <Link href="/create">Create your OPEN//77 server<ArrowRightIcon size={12} /></Link></p>
      </section>

      <section className={styles.download} id="download" aria-labelledby="download-title">
        <div className={styles.downloadCopy}>
          <p className={styles.eyebrow}><span aria-hidden="true">{"//"}</span> OPEN BETA</p>
          <h2 id="download-title">Get NCWE.</h2>
          <p>Free, no account, nothing else to install: .NET and the Windows App SDK come in the zip.</p>
          <a className={styles.primary} href={NCWE_RELEASE.url}>
            <DownloadIcon size={18} />
            <span><b>Download NCWE {NCWE_RELEASE.version}</b><i>Windows 10 and 11, 64-bit · {size}</i></span>
          </a>
          <div className={styles.checksum}>
            <span>SHA-256</span>
            <CopyLine value={NCWE_RELEASE.sha256} label="Copy the SHA-256 of the download" />
          </div>
          {site.links.discord ? (
            <a className={styles.discord} href={site.links.discord} target="_blank" rel="noopener noreferrer"><DiscordIcon size={18} />Feedback and help on the OPEN//77 Discord</a>
          ) : null}
        </div>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => <li key={step.title}><span>{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
      </section>

      <section className={styles.faq} aria-labelledby="faq-title">
        <h2 id="faq-title">Questions.</h2>
        <div>
          {QUESTIONS.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </div>
      </section>

      <p className={styles.thanks}>
        NCWE stands on <a href="https://github.com/WolvenKit/WolvenKit" target="_blank" rel="noopener noreferrer">WolvenKit</a> and{" "}
        <a href="https://github.com/psiberx/cp2077-archive-xl" target="_blank" rel="noopener noreferrer">ArchiveXL</a>. Without them it would not exist: thank you to their authors.
      </p>
    </main>
  );
}
