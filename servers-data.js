/* OPEN//77 — shared server directory data layer.
   Used by servers.html (browser) and server.html (detail page).
   Everything here is DEMO data (labeled in the UI) until a public build and a
   real listing API exist — swap api.listServers/getServer to fetch() then. */

window.OPEN77 = (function () {
  "use strict";

  var SERVERS = [
    {
      id: "nc-roleplay",
      name: "Night City Roleplay",
      desc: "Serious whitelist roleplay. Jobs, housing, a player-run economy and a city council that actually meets.",
      mode: "Roleplay",
      tags: ["Roleplay", "Economy", "Whitelist"],
      lang: "EN",
      region: "EU",
      players: 187,
      max: 256,
      ping: 24,
      featured: true,
      addedDaysAgo: 210,
      banner: "assets/exp-roleplay.jpg",
      owner: "NCRP Collective",
      links: { website: "nightcity-rp.example", discord: "discord.gg/ncrp" },
      rules: [
        "Whitelist application required before playing",
        "Stay in character in the city at all times",
        "No random violence without narrative buildup",
        "Voice and text roleplay both accepted"
      ]
    },
    {
      id: "afterlife-freeroam",
      name: "Afterlife Freeroam",
      desc: "Drop in, cause chaos, leave. Sandbox rules, all vehicles unlocked, events every evening.",
      mode: "Freeroam",
      tags: ["Freeroam", "Events"],
      lang: "EN",
      region: "NA",
      players: 94,
      max: 128,
      ping: 41,
      addedDaysAgo: 160,
      banner: "assets/exp-exploration.jpg",
      owner: "Afterlife Crew",
      links: { discord: "discord.gg/afterlife-fr" },
      rules: [
        "No hacking or exploit abuse",
        "Event zones follow the host's rules",
        "Everything else: it's a sandbox"
      ]
    },
    {
      id: "badlands-league",
      name: "Badlands Racing League",
      desc: "Ranked night races through the Badlands and city circuits. Custom handling, seasonal ladder.",
      mode: "Racing",
      tags: ["Racing", "Ranked", "Custom cars"],
      lang: "EN",
      region: "EU",
      players: 47,
      max: 64,
      ping: 18,
      featured: true,
      addedDaysAgo: 95,
      banner: "assets/exp-racing.jpg",
      owner: "BRL Stewards",
      links: { website: "brl-racing.example", discord: "discord.gg/brl" },
      rules: [
        "Clean racing — contact penalties are enforced",
        "Ranked lobbies require a placement session",
        "Custom handling profiles are server-provided"
      ]
    },
    {
      id: "nuit-blanche",
      name: "Nuit Blanche RP",
      desc: "Serveur roleplay francophone. Ambiance narrative, factions joueurs, staff actif.",
      mode: "Roleplay",
      tags: ["Roleplay", "Factions"],
      lang: "FR",
      region: "EU",
      players: 121,
      max: 200,
      ping: 22,
      addedDaysAgo: 140,
      banner: "assets/exp-roleplay.jpg",
      owner: "Collectif Nuit Blanche",
      links: { discord: "discord.gg/nuitblanche" },
      rules: [
        "Serveur exclusivement francophone",
        "Roleplay obligatoire en ville",
        "Candidature requise pour les factions"
      ]
    },
    {
      id: "pacifica-survival",
      name: "Pacifica: Blackout",
      desc: "Survival ruleset in a locked-down district. Scarce loot, hostile gangs, permadeath seasons.",
      mode: "Survival",
      tags: ["Survival", "PvP", "Hardcore"],
      lang: "EN",
      region: "NA",
      players: 58,
      max: 80,
      ping: 55,
      addedDaysAgo: 60,
      banner: "assets/exp-combat.jpg",
      owner: "Blackout Team",
      links: null,
      rules: [
        "Permadeath is on — one life per season",
        "No teaming above four players",
        "Loot spawns are server-controlled"
      ]
    },
    {
      id: "corpo-wars",
      name: "Corpo Wars",
      desc: "Two corporations, one contract. Team objective PvP with gadget loadouts and territory control.",
      mode: "PvP",
      tags: ["PvP", "Teams", "Objective"],
      lang: "EN",
      region: "EU",
      players: 76,
      max: 96,
      ping: 29,
      featured: true,
      addedDaysAgo: 120,
      banner: "assets/exp-combat.jpg",
      owner: "Corpo Wars Dev Team",
      links: { website: "corpowars.example" },
      rules: [
        "Matches are 12v12 objective rounds",
        "Loadouts unlock through play, not payment",
        "Team switching is balanced automatically"
      ]
    },
    {
      id: "chrom-asphalt",
      name: "Chrom & Asphalt",
      desc: "Deutscher Freeroam-Server mit Tuning-Treffen, Crews und freiem Stadtverkehr.",
      mode: "Freeroam",
      tags: ["Freeroam", "Tuning"],
      lang: "DE",
      region: "EU",
      players: 63,
      max: 100,
      ping: 19,
      addedDaysAgo: 75,
      banner: "assets/exp-racing.jpg",
      owner: "C&A Crew",
      links: { discord: "discord.gg/chromasphalt" },
      rules: [
        "Deutschsprachiger Server",
        "Keine Waffen bei Tuning-Treffen",
        "Crews organisieren sich im Discord"
      ]
    },
    {
      id: "neon-circuit",
      name: "Neon Circuit Social",
      desc: "A social world: live DJ venues, player apartments, photography crews and zero combat.",
      mode: "Social",
      tags: ["Social", "Music", "Safe zone"],
      lang: "EN",
      region: "NA",
      players: 139,
      max: 150,
      ping: 47,
      addedDaysAgo: 45,
      banner: "assets/exp-roleplay.jpg",
      owner: "Neon Circuit",
      links: { website: "neoncircuit.example", discord: "discord.gg/neoncircuit" },
      rules: [
        "Combat is disabled everywhere",
        "Venues are player-run — respect the host",
        "Photography mode encouraged"
      ]
    },
    {
      id: "delamain-dispatch",
      name: "Delamain Dispatch Co-op",
      desc: "Scripted co-op missions for 2-8 players: escort runs, heists and rescue contracts with checkpoints.",
      mode: "Missions",
      tags: ["Missions", "Co-op", "PvE"],
      lang: "EN",
      region: "EU",
      players: 31,
      max: 48,
      ping: 26,
      addedDaysAgo: 30,
      banner: "assets/exp-combat.jpg",
      owner: "Dispatch Collective",
      links: null,
      rules: [
        "Missions scale from 2 to 8 players",
        "Friendly fire is on in hard contracts",
        "Checkpoint saves between mission stages"
      ]
    },
    {
      id: "santo-domingo-md",
      name: "Santo Domingo Medical RP",
      desc: "Niche roleplay around trauma teams and street medicine. Slow-paced, heavy on emotes and stories.",
      mode: "Roleplay",
      tags: ["Roleplay", "Niche", "PvE"],
      lang: "EN",
      region: "SA",
      players: 24,
      max: 64,
      ping: 88,
      addedDaysAgo: 25,
      banner: "assets/exp-roleplay.jpg",
      owner: "Trauma Unit RP",
      links: { discord: "discord.gg/sdmedrp" },
      rules: [
        "Medical scenarios are cooperative stories",
        "No combat outside scripted scenes",
        "New players get a mentor shift"
      ]
    },
    {
      id: "kabuki-market",
      name: "Kabuki Night Market",
      desc: "Economy sandbox: player shops, smuggling routes, crafting chains and a stock ticker that lies.",
      mode: "Social",
      tags: ["Economy", "Social", "Trading"],
      lang: "EN",
      region: "AS",
      players: 82,
      max: 120,
      ping: 112,
      addedDaysAgo: 55,
      banner: "assets/exp-exploration.jpg",
      owner: "Market Syndicate",
      links: { website: "kabukimarket.example" },
      rules: [
        "Scamming NPCs: fine. Scamming players: ban",
        "Shops require a market license role",
        "Smuggling routes rotate weekly"
      ]
    },
    {
      id: "zero-g",
      name: "Zero Gravity Minigames",
      desc: "Rotating party modes: rooftop parkour, drone tag, prop hunt. Five-minute rounds, zero commitment.",
      mode: "Freeroam",
      tags: ["Minigames", "Casual"],
      lang: "EN",
      region: "NA",
      players: 41,
      max: 60,
      ping: 38,
      addedDaysAgo: 14,
      banner: "assets/exp-exploration.jpg",
      owner: "Zero-G Team",
      links: null,
      rules: [
        "Modes rotate every 15 minutes",
        "Votes pick the next minigame",
        "Be nice — it's a party server"
      ]
    },
    {
      id: "vista-del-rey",
      name: "Vista del Rey Familias",
      desc: "Roleplay en espanol: barrios, negocios de jugadores y tramas de facciones de largo recorrido.",
      mode: "Roleplay",
      tags: ["Roleplay", "Factions"],
      lang: "ES",
      region: "SA",
      players: 66,
      max: 128,
      ping: 74,
      addedDaysAgo: 90,
      banner: "assets/exp-roleplay.jpg",
      owner: "Familias VDR",
      links: { discord: "discord.gg/vdrfamilias" },
      rules: [
        "Servidor en espanol",
        "Roleplay serio en zonas urbanas",
        "Facciones con lore propio"
      ]
    },
    {
      id: "watson-wars",
      name: "Watson District Wars",
      desc: "Persistent gang territory PvP across Watson. Capture zones, weekly resets, faction economies.",
      mode: "PvP",
      tags: ["PvP", "Territory", "Factions"],
      lang: "EN",
      region: "OC",
      players: 52,
      max: 96,
      ping: 96,
      addedDaysAgo: 7,
      banner: "assets/exp-combat.jpg",
      owner: "District Wars Team",
      links: { discord: "discord.gg/watsonwars" },
      rules: [
        "Join a faction to fight for territory",
        "Zones lock 10 minutes after capture",
        "Weekly reset every Sunday night"
      ]
    }
  ];

  /* Demo handles used to render a plausible-but-clearly-demo player list. */
  var HANDLES = [
    "silverhand_fan77", "chooms4life", "netrunner_kae", "quadra_queen", "ripperdoc_uwe",
    "afterlife_reg", "corpo_dropout", "edge_of_glory", "kabuki_kat", "maelstrom_max",
    "nomad_nadia", "preem_pete", "delamain_no9", "gonk_hunter", "trauma_tess",
    "wired_wren", "arasaka_ex", "borg_barista", "neon_nina", "static_saul",
    "valentino_vee", "zero_day_zed", "input_ivy", "chrome_carl", "biotech_bo"
  ];

  var api = {
    /* Replace with fetch("/api/servers") when the live directory exists. */
    listServers: function () {
      return Promise.resolve(SERVERS);
    },
    getServer: function (id) {
      return Promise.resolve(SERVERS.filter(function (s) { return s.id === id; })[0] || null);
    },
    /* Deterministic demo player list derived from the server id. */
    samplePlayers: function (server, count) {
      var seed = 0;
      for (var i = 0; i < server.id.length; i++) seed = (seed * 31 + server.id.charCodeAt(i)) % 9973;
      var out = [];
      var n = Math.min(count || 10, HANDLES.length);
      for (var j = 0; j < n; j++) out.push(HANDLES[(seed + j * 7) % HANDLES.length]);
      return out;
    }
  };

  var FAV_KEY = "open77.favorites";
  var favs = {
    load: function () {
      try { return JSON.parse(localStorage.getItem(FAV_KEY)) || {}; }
      catch (e) { return {}; }
    },
    save: function (map) {
      try { localStorage.setItem(FAV_KEY, JSON.stringify(map)); } catch (e) {}
    }
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function pingClass(p) {
    if (p <= 30) return "ping-good";
    if (p <= 70) return "ping-mid";
    return "ping-far";
  }

  return { api: api, favs: favs, esc: esc, pingClass: pingClass };
})();
