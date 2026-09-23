/**
 * Content for the "Host your own server" documentation page
 * (`/docs/host-a-server`).
 *
 * Authored in TypeScript rather than the wiki because it describes the
 * platform experience — the download, the license key, the first-run setup and
 * the `server.jsonc` fields an owner touches — rather than the server Lua API
 * the wiki covers. The page renders from these constants and its Markdown twin
 * is projected from `hostingToMarkdown()`, exactly as the licensing and
 * platform pages do, so the machine-readable version can never quietly diverge
 * from what a human reads.
 */

export const HOSTING_TITLE = "Host your own server";

export const HOSTING_DESCRIPTION =
  "Install and configure an OPEN//77 dedicated server on Windows or Linux: downloads, license keys, first-run setup, network endpoints and startup.";

export const HOSTING_LEDE =
  "Everyone with Alpha access can download and run a dedicated server, with no separate developer application. Configure its license and reachable endpoints, then invite Alpha players. Cyberpunk 2077 is not required on the host.";

export const HOSTING_OVERVIEW =
  "The dedicated server is a self-contained Windows or Linux application. It uses a platform license to register with the Master and publish its name, endpoint and status. Public, eligible servers appear in the directory; private or hidden servers do not.";

export const HOSTING_STEPS = [
  {
    num: "01",
    title: "Get the build",
    body: "Download the official dedicated server for your platform from the Host a Server page. Windows ships as a .zip, Linux as a self-contained .tar.gz (built for Debian and compatible distributions). Every archive lists its SHA-256 so you can verify exactly what you run.",
    href: "/host",
    linkText: "Open the download page",
  },
  {
    num: "02",
    title: "Mint a license key",
    body: "In your account, open the keymaster and create a license key. It ties the server to your account and is shown once. Copy it now, because the platform only stores a fingerprint and can never show it again.",
    href: "/account/keys",
    linkText: "Open the keymaster",
  },
  {
    num: "03",
    title: "Unpack and run the first-run setup",
    body: "Unzip (Windows) or untar (Linux) into a folder of your choice. The first time you launch with no server.jsonc present, the server opens a first-run setup, a small wizard in your browser that walks you through naming the server, pasting your license key and picking visibility, then writes the config for you.",
    href: "#first-run",
    linkText: "About first-run setup",
  },
  {
    num: "04",
    title: "Check server.jsonc",
    body: "Whether the wizard wrote it or you prefer to edit by hand, confirm the handful of fields that matter: the server's name and visibility, its public address, and that the master server is enabled. The defaults already point at the production master.",
    href: "#configure",
    linkText: "The fields that matter",
  },
  {
    num: "05",
    title: "Set the license key in the environment",
    body: "Export OP77_LICENSE_KEY so the server can present it to the master on start-up. Keeping the key in the environment rather than the file means server.jsonc stays safe to copy, back up or share.",
    href: "#run",
    linkText: "How to launch",
  },
  {
    num: "06",
    title: "Run it, and it appears automatically",
    body: "Start the server. It enrols, registers and begins heartbeating, and within a heartbeat it is live in the launcher and on the public server list under your account. Players can join straight away.",
    href: "#appears",
    linkText: "What happens on boot",
  },
] as const;

export const NEED_INTRO =
  "The host is deliberately light. You do not install Cyberpunk 2077, REDengine or any game content on the server machine. The server ships everything it needs.";

export const NEED_POINTS = [
  {
    label: "The self-contained server package",
    body: "Both Windows x64 and Linux x64 downloads include the .NET runtime, native dependencies, Freeroam and its system resources. Extract the archive and use Start.cmd on Windows or ./start.sh on Linux; no separate .NET installation is needed.",
  },
  {
    label: "A public address",
    body: "A hostname or IP, and the server's port, that players on the internet can reach. This is what goes in network.publicEndpoint, and it is how the launcher tells people where to connect. Behind a router or firewall you forward the port; on a hosting box it is usually the public IP directly.",
  },
  {
    label: "A license key",
    body: "One op77_live_ key minted in the keymaster. No key means no enrolment and no listing. Anonymous servers are not part of the platform.",
  },
] as const;

export const BUILD_INTRO =
  "Head to the Host a Server page and download the archive for your platform. Both builds contain the same server; they differ only in packaging and how you launch them.";

export const BUILD_ROWS = [
  {
    os: "Windows (x64)",
    archive: ".zip",
    run: "Open77.Server.exe (or dotnet Open77.Server.dll)",
  },
  {
    os: "Linux (x64, Debian)",
    archive: ".tar.gz, self-contained",
    run: "./Open77.Server",
  },
] as const;

export const BUILD_NOTE =
  "Only ever download the server from the Host a Server page or the official CDN, nowhere else. Each release publishes a SHA-256 for every archive; compare it against the file you downloaded before you run it.";

export const FIRSTRUN_INTRO =
  "If server.jsonc is absent on first launch, a browser-based setup wizard creates it.";

export const FIRSTRUN_BODY =
  "Enter the server name, license key, public endpoint and visibility. Review the generated server.jsonc before starting. Later changes can be made in the file or through Warden.";

export const FIRSTRUN_NOTE =
  "To skip the wizard, place a valid server.jsonc beside the server executable before launch.";

export const CONFIG_INTRO =
  "server.jsonc supports JSON with // comments. Configure the following fields for enrollment and directory visibility.";

export const CONFIG_SAMPLE = `{
  // How your server presents itself in the launcher and server list.
  "identity": {
    "name": "Neon District RP",
    "visibility": "public"          // "public" to be listed; "private" to hide
  },

  // The address players connect to. Use a hostname or public IP plus the port
  // players can reach — not a LAN address.
  "network": {
    "publicEndpoint": "play.example.com:27015"
  },

  // The platform link. Leave enabled so the server enrols and gets listed;
  // the url already defaults to the production master, so you rarely touch it.
  "masterServer": {
    "enabled": true,
    "url": "https://master.open2077.net/",

    // Prefer the OP77_LICENSE_KEY environment variable and leave this null so
    // the file stays safe to share. Set it here only for a private deployment.
    "licenseKey": null
  }
}`;

export const CONFIG_FIELDS = [
  {
    label: "identity.name",
    body: "The name players see in the launcher and on the server list. Make it recognisable. It is your server's front door.",
  },
  {
    label: "identity.visibility",
    body: 'Set to "public" to appear in the launcher and on open2077.net. "private" keeps the server enrolled and licensed but off the public list, for a closed group.',
  },
  {
    label: "network.publicEndpoint",
    body: "The address the launcher hands to players. It must be reachable from the internet: a public hostname or IP and the server's port, not a 192.168.x address.",
  },
  {
    label: "masterServer.enabled",
    body: "Leave this true. It is the switch that makes the server enrol with the platform and get listed. Its url already points at the production master, so you almost never change it.",
  },
] as const;

export const ENV_INTRO =
  "Set your license key in the environment before you start the server. This keeps the key out of server.jsonc, so the config stays safe to copy or back up.";

export const ENV_SAMPLE = `# Linux / macOS
export OP77_LICENSE_KEY="op77_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Windows (PowerShell)
$env:OP77_LICENSE_KEY = "op77_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`;

export const RUN_INTRO =
  "With the key set and server.jsonc in place, start the server the way its platform expects:";

export const RUN_SAMPLE = `# Windows, from the unpacked folder
Open77.Server.exe
#   …or, against an installed .NET 10 runtime:
dotnet Open77.Server.dll

# Linux, from the unpacked folder
./Open77.Server`;

export const STARTUP_DOC = {
  href: "/docs/server-startup",
  label: "Startup arguments, log levels and hosting-panel configuration",
} as const;

export const APPEARS_INTRO =
  "On startup, the server enrolls and registers automatically:";

export const APPEARS_STEPS = [
  {
    title: "It enrols with the master",
    body: "The server presents your license key. The master verifies it, binds the server to your account, and issues a short-lived run lease that is renewed on every heartbeat.",
  },
  {
    title: "It registers itself",
    body: "The server publishes its identity (name, public endpoint, player count and icon) to the master. There is no separate listing form; the config is the listing.",
  },
  {
    title: "It appears in the launcher",
    body: "Within a heartbeat the server shows up in the in-game launcher and on the public server list at open2077.net, under your account. Players pick it and connect. Stop the server, or revoke its key, and it drops off the list just as automatically.",
  },
] as const;

export const APPEARS_NOTE =
  "If the server is missing from the directory, check its license, public visibility, master connection and endpoint. LAN and loopback endpoints are not public listings. A platform administrator can also hide a server. For connection failures, check external port reachability.";

export const NEXT_INTRO =
  "Use Warden to view logs, manage players and control resources. Some configuration and preload changes require a server restart.";

/** Markdown twin of the page, projected from the same constants. */
export function hostingToMarkdown(): string {
  const lines: string[] = [`# ${HOSTING_TITLE}`, "", HOSTING_LEDE, ""];

  lines.push("## Overview", "", HOSTING_OVERVIEW, "");

  lines.push("## From download to open doors", "");
  for (const step of HOSTING_STEPS) {
    lines.push(`${step.num}. **${step.title}**: ${step.body}`);
  }
  lines.push("");

  lines.push("## What the host needs", "", NEED_INTRO, "");
  for (const point of NEED_POINTS) lines.push(`- **${point.label}**: ${point.body}`);
  lines.push("");

  lines.push("## Get the build", "", BUILD_INTRO, "");
  lines.push("| Platform | Archive | Run |", "| --- | --- | --- |");
  for (const row of BUILD_ROWS) lines.push(`| ${row.os} | ${row.archive} | \`${row.run}\` |`);
  lines.push("", BUILD_NOTE, "");

  lines.push("## First-run setup", "", FIRSTRUN_INTRO, "", FIRSTRUN_BODY, "");
  lines.push(`> ${FIRSTRUN_NOTE}`, "");

  lines.push("## Configure server.jsonc", "", CONFIG_INTRO, "");
  lines.push("```jsonc", CONFIG_SAMPLE, "```", "");
  for (const field of CONFIG_FIELDS) lines.push(`- **${field.label}**: ${field.body}`);
  lines.push("");

  lines.push("## Set the license key", "", ENV_INTRO, "");
  lines.push("```bash", ENV_SAMPLE, "```", "");

  lines.push("## Run it", "", RUN_INTRO, "");
  lines.push("```bash", RUN_SAMPLE, "```", "");
  lines.push(`[${STARTUP_DOC.label}](${STARTUP_DOC.href})`, "");

  lines.push("## It appears automatically", "", APPEARS_INTRO, "");
  APPEARS_STEPS.forEach((step, index) => {
    lines.push(`${index + 1}. **${step.title}**: ${step.body}`);
  });
  lines.push("", `> ${APPEARS_NOTE}`, "");

  lines.push("## Next: run it live with Warden", "", NEXT_INTRO, "");

  return `${lines.join("\n")}\n`;
}
