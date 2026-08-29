# The OPEN//77 launcher

The launcher is how you play. It is one Windows program that finds your copy of
Cyberpunk 2077, checks it is the build the platform targets, signs you into your
OPEN//77 account, installs and keeps current the mod set that makes multiplayer
work, and then starts the game already connecting to a world.

None of that is something you can do by hand and get right. The client is a
native plugin loaded into the game process at addresses fixed for one exact game
build; multiplayer needs a specific set of files present and a specific set
absent; and your identity has to reach the game from something the game cannot
forge. The launcher exists because those are four separate ways to end up with a
game that starts and then quietly does nothing.

> **The alpha is not open yet.** There are no public servers to join, and the
> mod index the launcher installs from is not published to production. This page
> documents what the launcher does, not an invitation to go and do it.

## What you need

| | |
|---|---|
| **Windows** | The launcher refuses to start anywhere else, and the client is a native Windows plugin |
| **Microsoft Edge WebView2 Runtime** | The launcher's window is a web view. It ships with Windows 11 and installs itself on Windows 10 |
| **Cyberpunk 2077, bought** | Your own legal copy. OPEN//77 distributes no part of the game |
| **The exact game build** | Not a minimum — an equality. See [How the platform works](/docs/platform) |
| **Phantom Liberty** | The expansion ships as EP1, and the world you load on connect is an EP1 save |
| **An OPEN//77 account** | Created on the website; the launcher signs into it |

If WebView2 is somehow missing, the launcher does not fail silently: it puts up a
message naming the Microsoft Edge WebView2 Runtime and writes the underlying
error to its log.

## Installing it

The launcher is published as a **single file**, `Open77Launcher.exe` — roughly
50 MB, with the .NET runtime, the web view assemblies and its own interface
assets bundled inside. There is no installer, no setup wizard and no
uninstaller: you put the exe somewhere and run it. Everything it later creates
lives under `%LOCALAPPDATA%\Open77` and inside your Cyberpunk 2077 folder.

### The SmartScreen warning, and what it actually means

**The launcher executable is not code-signed today.** Nothing in the build
pipeline signs it, and you can check that yourself on the file you downloaded —
in PowerShell, `Get-AuthenticodeSignature .\Open77Launcher.exe` reports
`NotSigned`.

Windows treats a downloaded, unsigned executable it has not seen before the way
it treats any of them: with the blue *"Windows protected your PC"* screen, whose
only real action is hidden behind **More info → Run anyway**.

It is worth being precise about what that dialog is telling you, because "unknown
publisher" gets read as "malware" and it does not mean that:

- SmartScreen is reporting that this file carries **no publisher identity it can
  check**, and that it has not yet seen enough copies of it in the wild to have
  built a reputation. That is the expected state for an unsigned executable from
  a small project.
- It is **not** a detection. Nothing has scanned the file and found something in
  it. A detection looks different and is worded differently.
- It says nothing about *which* file you have. An unsigned exe is exactly as
  unverifiable when someone else has modified it, which is why where you got it
  from matters more than usual.

The honest consequences follow from that: download the launcher only from
OPEN//77's own site, and treat a copy from anywhere else as a copy of unknown
provenance. Code signing is a purchase and an identity-verification process the
project has not been through; when that changes, the dialog goes away on its own.

Two related notes, both accurate and both easy to misread. The launcher verifies
**everything it downloads** — the mod index is signed and the signature is
checked, package archives are recognised by SHA-256 before a byte enters the
store, and a launcher self-update is hash-checked against the platform's build
allowlist. That is real integrity checking, and it is a different thing from the
exe itself being signed. The first protects what the launcher fetches; only the
second would tell Windows who published the launcher.

And the launcher **strips the mark-of-the-web** from every file it installs. That
is not it hiding something from Windows: the mark propagates from a downloaded
archive to everything extracted out of it, and a mod DLL still carrying it can
simply fail to load under Code Integrity or Smart App Control — a mod that
"does nothing" with no error anywhere. The file is verified by hash before that
happens.

## Finding your game

You are not asked where Cyberpunk 2077 is unless the launcher genuinely cannot
work it out. It looks, in this order:

1. An explicit `--game-dir` on the command line.
2. The `OP77_GAME_DIR` environment variable (the process environment, then your
   user environment).
3. **GOG**, from the registry — `HKLM\SOFTWARE\WOW6432Node\GOG.com\Games\1423049311`.
4. **Steam**, from the registry, and then *every* Steam library: it reads Steam's
   install path from `HKCU\Software\Valve\Steam` and the `HKLM` install keys, then
   parses `steamapps\libraryfolders.vdf` to find your other drives. A game on a
   second SSD is found.

If none of that hits, you pick the folder yourself, and the picker is deliberately
forgiving: it accepts the install root, `bin\x64`, the executable itself, a Steam
library root, `steamapps`, `common`, or the parent of any of those, and falls back
to a shallow search under whatever you chose.

**Epic is not in that list.** Nothing about the platform requires a particular
store — it requires a legitimate copy at the right build — but there is no
registry probe for Epic, so an Epic install is found by picking the folder.

## Checking the build

The launcher computes the **SHA-256 of `bin\x64\Cyberpunk2077.exe`** and compares
it with the master's build manifest. If your build is unknown, deprecated or
revoked, it warns you.

That warning is **advisory**. The launcher will not stop you, because the launcher
is not the thing that enforces it — the real check happens when your client asks
the platform for a ticket to join a server, and a wrong build is refused there.
So a warning at the launcher is not a suggestion you can ignore; it is an early
notice of a refusal that will come later, at a much more annoying moment.

The practical cause is almost always the same: the game auto-updated. The
platform targets one exact build, and a newer patch does not "mostly work" — the
plugin compares the byte prologues of the engine functions it hooks and declines
to load on a mismatch.

## Signing in

Two ways in, both handled entirely in the launcher's own code — the page inside
the window never touches the network or your credentials.

**Through your browser (the default).** The launcher opens your normal browser on
the OPEN//77 website's [launcher authorisation page](/launcher). You sign in
there, on the site, exactly as you would to read your account page — **no password
is ever typed into the launcher** — and the site hands back a one-time code to a
loopback address on your own machine. The code is PKCE-bound (S256) to the
launcher instance that started the flow, so a code intercepted in transit is
useless to anything else, and the site refuses to redirect anywhere that is not a
`127.0.0.1` / `localhost` callback. The launcher then exchanges the code for an
account session.

If the authorisation page ever tells you the link "points somewhere it shouldn't",
that is this guard firing. Close it and start the sign-in from the launcher again.

**Directly, with e-mail and password.** The launcher also offers a plain sign-in
form that posts your credentials to the platform's login endpoint itself. It is
the same account and produces the same session.

Either way, the result is written to `launcher-session-v1.dat` under
`%LOCALAPPDATA%\Open77`, encrypted with **DPAPI at CurrentUser scope** — so it is
readable by your Windows user on that machine and nowhere else, and copying the
file to another PC gets you nothing. The game plugin reads it at startup, which is
how your account and display name reach the world you join without the game ever
handling a password.

## The mod menu

The mod menu is where you choose what loads with the game. You reach it from the
cube in the title bar, from a **Mods** row in Settings, or as a secondary action
on the READY screen.

> **It is not switched on for everyone yet.** There are two ways an install can
> be kept up to date: the older whole-payload updater, and the mod stack that
> everything below describes. Which one runs is decided once per launch, and the
> mod stack only takes over where the platform has published a signed mod index.
> Until then the menu says so in as many words — *this install is managed by the
> classic OPEN//77 updater, and the mod list becomes available once the platform
> publishes a mod index* — and there is nothing to choose. The two never both
> run: the old updater would silently reinstate every file the new one had
> disabled.

The rule that shapes everything else: **the page decides nothing.** Every
question — what depends on what, what conflicts with what, what may not be
switched off — is answered by the launcher itself, and a request the rules do not
allow is *refused by name* rather than quietly bouncing back. A checkbox that
springs back with no explanation is the single worst thing a mod menu can do, so
every refusal carries a reason:

| Reason | What it means |
|---|---|
| `mandatory` | This is part of the floor multiplayer needs. It cannot be off |
| `required_by` | Something else that is on needs this — and it names what |
| `conflict` | Two packages want the same file, and it names both sides |
| `consent_required` | This one changes something you should agree to first, with the points to read |
| `needs_file` | This package's archive has to be supplied before it can be enabled |
| `game_running` | Cyberpunk 2077 is open. Files cannot be moved under a live game |
| `blocked` | A rule refuses this one, with the reason and, when there is one, a link |

### Mandatory and optional

Four packages make up the floor and cannot be unticked:

| Package | Why it cannot be off |
|---|---|
| `open77-core` | OPEN//77 itself: the client plugin, its archive and its scripts |
| `open77-webui` | The in-game interface runtime — the server browser you are looking at is drawn by it |
| `red4ext` | The loader that gets the plugin into the game process at all |
| `redscript` | The script compiler the game runs at boot |

Everything else is yours to choose. The stack carries third-party packages —
Cyber Engine Tweaks, Cyber Vehicle Overhaul, and the CVOO overlay on top of it —
each with its author, licence and upstream link recorded, none of them mandatory,
and none of them enabled behind your back.

A package can also be **consent-gated**: switched off by default and refused until
you have read what it does and said yes. That exists for changes that outlive the
session — a tweak that alters your singleplayer game and keeps altering it after
you stop playing OPEN//77 is not something a checkbox should do silently. The
first attempt to enable one returns the points to read; your acceptance comes back
on the same action.

Your consent is remembered separately from your on/off choices, on purpose: if
the warning attached to a package later changes, you are asked again rather than
inheriting an answer you gave to a different question.

### Dependencies, conflicts and overrides

Turning something on turns on what it needs. Turning something off is refused
while something that needs it is still on, and the refusal names the dependant.

Two enabled packages claiming the same file is normally a **hard refusal**, and it
should be: a silent race for a path is how a mod set stops being reproducible.
But some pairings are genuinely an overlay rather than a collision. CVOO ships 36
of Cyber Vehicle Overhaul's 39 files, with different bytes, and ships no
`init.lua` at all — it is not a replacement for CVO, it is a layer on top of one.

So a package can **declare** what it overlays, which means exactly three things:

- **It implies a dependency.** An overlay is not standalone, so what it overlays
  is switched on with it — and unticking the package underneath is refused,
  naming the overlay.
- **It suppresses the shared-path conflict for that one declared pair.** Any
  other two packages claiming a path is still refused. The rule is not weakened;
  it is given one auditable exception.
- **The winner is the overriding package, deterministically** — never "whichever
  was written last".

The rows show both ends of it: the overlay says what it overrides and how many
files it took, and the package underneath says how many of its own files are
currently somebody else's.

### What happens when you untick something

Nothing is deleted. The launcher keeps a **content store** under
`%LOCALAPPDATA%\Open77\modstore`, addressed by content hash, and the copy of every
file a package displaced stays in it.

So switching an overlay off **restores the original copy of every path it had
taken**, byte for byte. That promise is load-bearing enough that applying a change
deliberately fetches the displaced copies even though it does not install them —
because without that, undoing a checkbox could require a download, and for a
package whose bytes you supplied yourself there would be no download to make.

### Apply, and the compile that can refuse it

**Apply** is the commit point, and it runs in three steps: work out the file set,
compile the redscript, then write.

The middle step is not a formality. Every `.reds` file in the game shares one
compilation unit, so a single broken script anywhere makes the whole compile fail
— and a failed compile silently reverts the game to its **vanilla scripts**. That
drops OPEN//77's own bridge scripts with it, and multiplayer simply stops working,
with no error you would ever see. You would get a game that starts, looks
completely normal, and has no OPEN//77 in it.

So the launcher compiles the set that would actually result — against a scratch
copy, never your game folder — *before* moving a single file. If it does not
compile, the whole apply is refused, the offending mod is named, the compiler's
own errors are shown, and you are offered one click to switch that mod off and
try again.

**Apply is also refused while Cyberpunk 2077 is running**, including a session you
started from somewhere else. Installing means deleting and relinking files a live
game holds open.

### Mods you installed yourself

The launcher scans the eight folders Cyberpunk mods live in — `archive/pc/mod`,
`r6/scripts`, `r6/tweaks`, `r6/input`, `red4ext/plugins`, `bin/x64/plugins`,
`engine/tools`, and CET's own mods folder — and sorts what it finds into three
kinds: **ours** (a package we installed), **contested** (a package claims that
path but somebody else's bytes are there — never blind-overwritten), and
**foreign** (yours).

Your own mods get their own section, and the rows are honest about what is not
known: no version, no author, no licence, because the launcher has no way to learn
them. The row says what it is, where it came from, how big it is, and — if a rule
caught it — why, in plain language.

Two kinds of rule can catch one, and the difference matters:

- **Switched off by default.** The launcher turns it off the first time it sees
  it, and *writes that decision down*. If you switch it back on, that answer
  sticks and no rule turns it off again. Your game, your choice.
- **Blocked.** Refused while OPEN//77 is installed, because it breaks or cheats.
  This one is re-asserted every time, because it is a refusal rather than a
  default.

Switching one of your own mods off is a **move, never a delete**. Its files go
into the content store, and they only leave your game folder *after* their bytes
have been written to the store and re-read and re-hashed there. Restoring copies
them back, hash-verified, with their original timestamps. There is a *restore my
mods* action that hands every held file back, blocked ones included — and
uninstalling OPEN//77 does the same thing.

If you use Vortex or Mod Organizer 2, they will put a quarantined file back, and
that is fine. The scan is hash-and-path driven and re-runs every time, so a
restored file is simply seen again; a blocked one is held again and says so, and a
default you already overruled is left alone. Nothing here overwrites a file
another manager owns.

## Browsing and joining a world

The launcher's server browser is the *same interface as the game's own* — the same
shell, the same list, the same connect panel — because it is literally the same
web assets, driven by the launcher instead of by the game.

The directory comes from the platform master, fetched by the launcher itself
rather than by the page. Press connect on a world and the launcher starts
Cyberpunk 2077 with your account session and a boot connect target, so the game
comes up already joining that world instead of dropping you on the server browser.
If a client is already running, it joins in place rather than launching a second
one.

There are **no public servers yet**, so the list is empty by design. Nothing is
broken.

## Direct connect links

A link of this shape boots the game straight into a world:

```text
open77://connect?server=<serverId>
```

It is what the Join buttons on the OPEN//77 website emit and what the launcher's
own rows use, so a link a server owner posts in their Discord behaves identically
to one on this site.

The launcher registers the `open77` scheme for your user account on every start —
idempotently, so a broken registration heals itself — and clicking such a link:

- opens the launcher if it is closed;
- **hands the link to the launcher you already have open**, over a local pipe, and
  brings that window to the front. You never get a second window;
- **queues the target if you are not ready yet** — signed out, game unverified, or
  mods still updating. You sign in, it finishes, and the connect fires on its own.
  You do not have to click the link twice.

A deep link is a shortcut through the launcher's interface, not through
authentication: it drives exactly the same authenticated connect a manual click
does. If anything fails, you land in the normal server browser with the error
rather than on a hung screen.

If you have no launcher installed, your browser shows its usual "no app for this
link" prompt and nothing happens.

## How it updates itself

The launcher checks for a newer version of itself against the platform's build
allowlist, and offers it as a banner. Applying it is deliberately two-phase, so a
running program is never overwritten under its own feet:

1. **Stage.** The new executable is downloaded, its **SHA-256 verified against the
   allowlist entry**, and written *beside* the current one. Nothing running is
   touched. A failed download or a hash that does not match leaves you exactly
   where you were, with a message and a manual download link.
2. **Swap.** The very first thing the launcher does on its *next* start is put the
   staged executable in place and relaunch it. The old one is kept as a backup
   until the swap is proven, and any failure falls through to simply starting the
   version you already had.

So a launcher update lands on a restart, exactly once, and cannot leave you with a
half-written exe. The banner offers you that restart when a version is staged.
There is a setting for whether it checks at all.

The client mod is a separate thing on a separate cadence, checked at every start
before you reach the READY screen, and offered as its own banner while you are
using the launcher. Installing it is refused while the game is running.

Where the mod stack is in use, the mod is fetched **per package and by content
hash**, which is what makes a routine OPEN//77 update small. The client payload
weighs about 410 MB, but roughly 384 MB of that is a browser runtime that only
changes when that runtime is bumped. Because each package is fetched separately
and addressed by its content, a plugin-only update moves on the order of **8 MB
of blobs instead of the whole 410 MB**. Switching between the stable and beta
channels is cheap for the same reason: only what actually differs is downloaded.

## When something goes wrong

**The log is at `%LOCALAPPDATA%\Open77\launcher.log`.** It is a plain text file,
appended to, one timestamped line per event: sign-in, the directory fetch, the
mod update, the launch, the world it was trying to connect you to, and any
initialisation error. The window has no console, so this is the only place these
end up. It is never rotated or trimmed, so it is also complete — attach it when
you ask for help.

There are a few command-line switches that answer questions faster than
guesswork:

```text
Open77Launcher.exe --detect-only    locate and hash the game, print it, exit
                                    (no window, no network)
Open77Launcher.exe --console        the original one-pass console sign-in
                                    and launch flow
Open77Launcher.exe --mods           open straight on the mod menu
Open77Launcher.exe --game-dir <dir> point it at a specific install
```

`--detect-only` is the one to reach for first: it tells you which install the
launcher found and what it hashed to, without touching the network or your files.

| Symptom | Where to look |
|---|---|
| "Windows protected your PC" on first run | Expected — the exe is unsigned. **More info → Run anyway**, and make sure you got it from the official site |
| The window never appears | WebView2 Runtime. The launcher says so, and the log has the exception |
| It cannot find your game | `--detect-only` to see what it tried, then pick the folder manually. Epic installs are not auto-detected |
| A build warning you did not expect | The game auto-updated. The platform targets one exact build |
| Apply is refused | Read the reason — it always gives one. `game_running` is the most common, and means exactly what it says |
| "Another mod manager owns files OPEN//77 needs" | Vortex or MO2 has its own copy of a shared loader file — RED4ext's or redscript's. The launcher refuses to overwrite it rather than start a restore war. Let one manager own those files |
| You were signed in yesterday and are signed out today | Sessions expire. An expired one is treated as signed out rather than half-working; sign in again |
| The game starts but there is no OPEN//77 in it | Almost always a failed redscript compile reverting to vanilla scripts. The preflight exists to stop this, so check whether anything was installed outside the launcher |
| The server list is empty | There are no public servers yet |

## See also

- [Your server in the launcher](launcher-for-server-owners.md) — the same
  machinery from a server owner's side, including the deep-link contract.
- [How the platform works](/docs/platform) — what OPEN//77 is, and the exact
  requirements.
- [Host your own server](/docs/host-a-server) — running a world of your own.
