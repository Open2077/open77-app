/* OPEN//77 — server browser page logic.
   Data comes from window.OPEN77 (servers-data.js); all listings are demo data
   until the live directory API exists. */

(function () {
  "use strict";

  var listEl = document.getElementById("server-list");
  if (!listEl || !window.OPEN77) return;

  var api = OPEN77.api;
  var esc = OPEN77.esc;
  var pingClass = OPEN77.pingClass;

  var searchEl = document.getElementById("server-search");
  var filtersEl = document.getElementById("client-filters");
  var regionEl = document.getElementById("filter-region");
  var langEl = document.getElementById("filter-lang");
  var minPlayersEl = document.getElementById("filter-minplayers");
  var maxPingEl = document.getElementById("filter-maxping");
  var sortEl = document.getElementById("sort-by");
  var favsOnlyEl = document.getElementById("favs-only");
  var countEl = document.getElementById("server-count");
  var featuredEl = document.getElementById("featured-list");
  var toastEl = document.getElementById("toast");

  var MAIN_MODES = ["Roleplay", "Freeroam", "Racing", "PvP", "Social"];

  var state = {
    servers: [],
    query: "",
    mode: "all",
    region: "all",
    lang: "all",
    minPlayers: 0,
    maxPing: 999,
    sort: "recommended",
    favsOnly: false,
    favs: OPEN77.favs.load()
  };

  /* ---------- Toast ---------- */

  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
      toastTimer = setTimeout(function () { toastEl.hidden = true; }, 250);
    }, 2600);
  }

  /* ---------- Filtering & sorting ---------- */

  function matches(s) {
    if (state.favsOnly && !state.favs[s.id]) return false;
    if (state.mode === "Custom") {
      if (MAIN_MODES.indexOf(s.mode) !== -1) return false;
    } else if (state.mode !== "all") {
      if (s.mode !== state.mode && s.tags.indexOf(state.mode) === -1) return false;
    }
    if (state.region !== "all" && s.region !== state.region) return false;
    if (state.lang !== "all" && s.lang !== state.lang) return false;
    if (s.players < state.minPlayers) return false;
    if (s.ping > state.maxPing) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (s.name + " " + s.desc + " " + s.tags.join(" ") + " " + s.lang + " " + s.region + " " + s.mode + " " + (s.owner || "")).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function sorted(list) {
    var arr = list.slice();
    if (state.sort === "recommended") {
      arr.sort(function (a, b) {
        if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
        return (b.players / b.max) - (a.players / a.max) || b.players - a.players;
      });
    }
    if (state.sort === "players") arr.sort(function (a, b) { return b.players - a.players; });
    if (state.sort === "ping") arr.sort(function (a, b) { return a.ping - b.ping; });
    if (state.sort === "recent") arr.sort(function (a, b) { return a.addedDaysAgo - b.addedDaysAgo; });
    return arr;
  }

  function popClass(s) {
    var r = s.players / s.max;
    if (r >= 0.9) return "pop-full";   /* coral: nearly full — the live signal */
    if (r >= 0.7) return "pop-high";
    if (r >= 0.35) return "pop-mid";
    return "pop-low";
  }

  function starSvg(filled) {
    return '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="' +
      (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  }

  /* ---------- Rendering ---------- */

  function rowHtml(s) {
    var pct = Math.round((s.players / s.max) * 100);
    var fav = !!state.favs[s.id];
    return (
      '<li class="sb-row" data-id="' + s.id + '">' +
        '<a class="sb-row-link" href="server.html?id=' + encodeURIComponent(s.id) + '" aria-label="' + esc(s.name) + ' — server details">' +
          '<span class="sb-thumb" style="background-image:url(\'' + s.banner + '\')" aria-hidden="true"></span>' +
          '<span class="sb-id">' +
            '<span class="sb-name">' + esc(s.name) +
              (s.featured ? '<span class="sb-feat-chip">FEATURED</span>' : "") +
            "</span>" +
            '<span class="sb-desc">' + esc(s.desc) + "</span>" +
            '<span class="sb-tags">' + s.tags.slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</span>" +
          "</span>" +
          '<span class="sb-players ' + popClass(s) + '">' +
            '<span class="sb-players-num">' + s.players + '<span class="sb-players-max"> / ' + s.max + "</span></span>" +
            '<span class="sb-players-label">players</span>' +
            '<span class="players-bar" aria-hidden="true"><span style="width:' + pct + '%"></span></span>' +
          "</span>" +
          '<span class="sb-net">' +
            '<span class="sb-ping ' + pingClass(s.ping) + '">' + s.ping + ' ms</span>' +
            '<span class="sb-loc">' + esc(s.region) + " &middot; " + esc(s.lang) + "</span>" +
          "</span>" +
        "</a>" +
        '<span class="sb-actions">' +
          '<button class="fav-btn ' + (fav ? "is-fav" : "") + '" data-fav="' + s.id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Remove " + esc(s.name) + " from favorites" : "Add " + esc(s.name) + " to favorites") + '">' + starSvg(fav) + "</button>" +
          '<button class="sb-connect" data-connect="' + s.id + '">Connect</button>' +
        "</span>" +
      "</li>"
    );
  }

  function render() {
    var visible = sorted(state.servers.filter(matches));
    listEl.innerHTML = visible.map(rowHtml).join("");
    if (!visible.length) {
      listEl.innerHTML = '<li class="server-empty">No servers match these filters. Clear the search or pick another mode.</li>';
    }
    countEl.textContent = visible.length + " / " + state.servers.length + " (demo)";
    updateFilterBadge();
  }

  function renderFeatured() {
    if (!featuredEl) return;
    var feats = state.servers.filter(function (s) { return s.featured; });
    featuredEl.innerHTML = feats.map(function (s) {
      return (
        '<li>' +
          '<a class="sb-feat-card" href="server.html?id=' + encodeURIComponent(s.id) + '">' +
            '<span class="sb-feat-thumb" style="background-image:url(\'' + s.banner + '\')" aria-hidden="true"></span>' +
            '<span class="sb-feat-body">' +
              '<span class="sb-feat-name">' + esc(s.name) + "</span>" +
              '<span class="sb-feat-meta"><strong>' + s.players + " / " + s.max + "</strong> players &middot; " + s.ping + " ms</span>" +
              '<span class="sb-feat-mode"><span class="eyebrow-slash">//</span>' + esc(s.mode).toUpperCase() + "</span>" +
            "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("");
  }

  /* ---------- Filter badge ---------- */

  var filterBadge = document.getElementById("filter-badge");
  function activeFilterCount() {
    var n = 0;
    if (state.region !== "all") n++;
    if (state.lang !== "all") n++;
    if (state.minPlayers > 0) n++;
    if (state.maxPing < 999) n++;
    return n;
  }
  function updateFilterBadge() {
    if (!filterBadge) return;
    var n = activeFilterCount();
    filterBadge.hidden = n === 0;
    filterBadge.textContent = n;
  }

  /* ---------- Panels (filters / direct connect) ---------- */

  function bindPanel(btnId, panelId, otherPanelId) {
    var btn = document.getElementById(btnId);
    var panel = document.getElementById(panelId);
    var other = document.getElementById(otherPanelId);
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.classList.toggle("is-open", open);
      if (open && other && !other.hidden) {
        other.hidden = true;
        var otherBtn = document.querySelector('[aria-controls="' + otherPanelId + '"]');
        if (otherBtn) { otherBtn.setAttribute("aria-expanded", "false"); otherBtn.classList.remove("is-open"); }
      }
    });
  }
  bindPanel("filter-toggle", "filter-panel", "direct-panel");
  bindPanel("direct-toggle", "direct-panel", "filter-panel");

  var statusMore = document.getElementById("status-more");
  var statusNote = document.getElementById("status-note");
  if (statusMore && statusNote) {
    statusMore.addEventListener("click", function () {
      var open = statusNote.hidden;
      statusNote.hidden = !open;
      statusMore.setAttribute("aria-expanded", String(open));
      statusMore.textContent = open ? "Hide" : "What does this mean?";
    });
  }

  var directBtn = document.getElementById("direct-connect-btn");
  if (directBtn) {
    directBtn.addEventListener("click", function () {
      toast("Direct connect goes live with the first public build.");
    });
  }

  /* ---------- Events ---------- */

  listEl.addEventListener("click", function (e) {
    var favEl = e.target.closest("[data-fav]");
    if (favEl) {
      e.preventDefault();
      var id = favEl.getAttribute("data-fav");
      state.favs[id] = !state.favs[id];
      OPEN77.favs.save(state.favs);
      if (state.favsOnly) { render(); return; }
      /* update just this button to avoid losing scroll/hover context */
      var fav = !!state.favs[id];
      favEl.classList.toggle("is-fav", fav);
      favEl.setAttribute("aria-pressed", String(fav));
      favEl.innerHTML = starSvg(fav);
      return;
    }
    var connectEl = e.target.closest("[data-connect]");
    if (connectEl) {
      e.preventDefault();
      toast("Connecting goes live with the first public build.");
    }
  });

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      state.query = searchEl.value.trim();
      render();
    });
  }

  function setMode(mode) {
    state.mode = mode;
    filtersEl.querySelectorAll(".filter-chip[data-filter]").forEach(function (c) {
      var active = c.getAttribute("data-filter") === mode;
      c.classList.toggle("is-active", active);
      c.setAttribute("aria-pressed", String(active));
    });
  }

  if (filtersEl) {
    filtersEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".filter-chip[data-filter]");
      if (!chip) return;
      setMode(chip.getAttribute("data-filter"));
      render();
    });
  }

  if (favsOnlyEl) {
    favsOnlyEl.addEventListener("click", function () {
      state.favsOnly = !state.favsOnly;
      favsOnlyEl.classList.toggle("is-active", state.favsOnly);
      favsOnlyEl.setAttribute("aria-pressed", String(state.favsOnly));
      render();
    });
  }

  if (regionEl) regionEl.addEventListener("change", function () { state.region = regionEl.value; render(); });
  if (langEl) langEl.addEventListener("change", function () { state.lang = langEl.value; render(); });
  if (minPlayersEl) minPlayersEl.addEventListener("change", function () { state.minPlayers = parseInt(minPlayersEl.value, 10) || 0; render(); });
  if (maxPingEl) maxPingEl.addEventListener("change", function () { state.maxPing = parseInt(maxPingEl.value, 10) || 999; render(); });
  if (sortEl) sortEl.addEventListener("change", function () { state.sort = sortEl.value; render(); });

  var clearBtn = document.getElementById("filter-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      state.region = "all"; state.lang = "all"; state.minPlayers = 0; state.maxPing = 999;
      if (regionEl) regionEl.value = "all";
      if (langEl) langEl.value = "all";
      if (minPlayersEl) minPlayersEl.value = "0";
      if (maxPingEl) maxPingEl.value = "999";
      render();
    });
  }

  /* ---------- Count-up on first paint ---------- */

  function countUp() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var nodes = listEl.querySelectorAll(".sb-players-num");
    nodes.forEach(function (node, idx) {
      var textNode = node.firstChild;
      if (!textNode || textNode.nodeType !== 3) return;
      var target = parseInt(textNode.textContent, 10);
      if (!target) return;
      var start = null;
      var dur = 600;
      var delay = Math.min(idx * 45, 450);
      function stepFn(ts) {
        if (start === null) start = ts;
        var t = Math.max(0, (ts - start - delay) / dur);
        if (t >= 1) { textNode.textContent = target; return; }
        var eased = 1 - Math.pow(1 - Math.max(t, 0), 3);
        textNode.textContent = Math.round(target * eased);
        requestAnimationFrame(stepFn);
      }
      requestAnimationFrame(stepFn);
    });
  }

  /* ---------- Init ---------- */

  var params = new URLSearchParams(window.location.search);
  var modeParam = params.get("mode");

  api.listServers().then(function (servers) {
    state.servers = servers;
    if (modeParam && filtersEl.querySelector('[data-filter="' + modeParam + '"]')) {
      setMode(modeParam);
    }
    renderFeatured();
    render();
    countUp();
  });

})();
