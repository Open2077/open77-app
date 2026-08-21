/**
 * What a player and a server operator each have to have. Stated once.
 *
 * Both lists are taken from the platform repository rather than from this
 * site's earlier copy, and two of the values are stricter than they look:
 *
 * - the game build is exact, not a floor. The client plugin resolves engine
 *   functions at addresses fixed for that build and compares their byte
 *   prologues before hooking anything; a mismatch fails initialisation and the
 *   plugin is rejected outright, so a newer game patch does not partly work.
 * - Phantom Liberty is required, not recommended. Connecting installs and loads
 *   the save the client ships with, and that save's metadata declares the EP1
 *   expansion, so the session has nothing to load without it.
 *
 * The dedicated server is the opposite case and is worth saying out loud: it
 * shares none of this, because it never touches the game.
 *
 * Not on this list, because they are not install requirements:
 * - storefronts. A legitimate 2.31 copy is what the platform asks for. The
 *   debug launcher searches common Steam and GOG folders; it does not name
 *   Epic, and none of those paths are a supported-store guarantee.
 * - the 2.31 / Phantom Liberty research catalogues. Those are extraction
 *   versions for wiki datasets, not a second player-facing requirement.
 */

export const GAME_BUILD = "2.31";
export const GAME_EXPANSION = "Phantom Liberty DLC";

/** The one-line version, for the hero and for structured data. */
export const PLAYER_REQUIREMENT_SHORT = `Cyberpunk 2077 ${GAME_BUILD} + ${GAME_EXPANSION}`;

export const PLAYER_REQUIREMENTS = [
  {
    label: "Your own copy of Cyberpunk 2077",
    body: "OPEN//77 never distributes the game or any of its assets. It builds on the installation you already own.",
  },
  {
    label: `Game build ${GAME_BUILD}`,
    body: "This exact build, not a minimum. The client hooks the game engine at addresses established for it and refuses to load when they do not match.",
  },
  {
    label: `${GAME_EXPANSION}`,
    body: "The expansion ships as EP1, and the client needs it: the world it loads when you connect to a server is an EP1 save.",
  },
  {
    label: "Windows 10 or 11, 64-bit",
    body: "The client is a native Windows plugin that loads inside the game process.",
  },
];

export const SERVER_REQUIREMENTS = [
  {
    label: "The game is not needed",
    body: "A dedicated server runs independently of Cyberpunk 2077, REDengine and the client plugin. It never loads game content and never needs a copy installed.",
  },
  {
    label: "Windows x64 and .NET 10",
    body: "The server is a standalone .NET process with a native networking layer. It is the machine you keep online, not the machine you play on.",
  },
  {
    label: "Your players still need all of the above",
    body: `Everyone who connects needs ${PLAYER_REQUIREMENT_SHORT} on their own machine. Hosting changes nothing about that.`,
  },
];

/** One line for /create, so it cannot drift from the home headline. */
export const CREATE_REQUIREMENTS_NOTE = `Players who connect need ${PLAYER_REQUIREMENT_SHORT} on their own machine. The dedicated server does not need the game installed.`;
