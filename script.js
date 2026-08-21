/* OPEN//77 — shared page behavior (nav, header, docs widgets).
   The server browser lives in servers.js. */

(function () {
  "use strict";

  /* ---------- Color system trial switcher ---------- */

  var THEMES = [
    { id: "open-signal", name: "Open Signal", bg: "#080e19", accent: "#22d8e2" },
    { id: "night-cyan", name: "Night Cyan", bg: "#080d18", accent: "#20d5e5" },
    { id: "samurai-red", name: "Samurai Red", bg: "#0d090b", accent: "#ff3d52" },
    { id: "street-yellow", name: "Street Yellow", bg: "#0b0b07", accent: "#fcee0a" },
    { id: "braindance-violet", name: "Braindance Violet", bg: "#0a0714", accent: "#a86bff" },
    { id: "kitsch-magenta", name: "Kitsch Magenta", bg: "#120714", accent: "#ff2e88" }
  ];
  var THEME_KEY = "open77.theme";

  function applyTheme(id) {
    if (id === "open-signal") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", id);
    }
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (savedTheme && THEMES.some(function (t) { return t.id === savedTheme; })) {
    applyTheme(savedTheme);
  } else {
    savedTheme = "open-signal";
  }

  (function buildThemeTool() {
    var tool = document.createElement("div");
    tool.className = "theme-tool";
    tool.innerHTML =
      '<div class="theme-tool-panel" id="theme-panel" hidden>' +
        '<p class="theme-tool-title"><span class="eyebrow-slash">//</span> COLOR SYSTEM &mdash; TRIAL</p>' +
        THEMES.map(function (t) {
          return (
            '<button class="theme-opt' + (t.id === savedTheme ? " is-active" : "") + '" data-theme-id="' + t.id + '">' +
              '<span class="theme-swatch" style="background:' + t.bg + '"><i style="background:' + t.accent + '"></i></span>' +
              '<span class="theme-opt-name">' + t.name + "</span>" +
              '<svg class="theme-opt-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            "</button>"
          );
        }).join("") +
        '<p class="theme-tool-note">Trying color directions &mdash; the pick becomes the permanent OPEN//77 system.</p>' +
      "</div>" +
      '<button class="theme-tool-btn" id="theme-toggle" aria-expanded="false" aria-controls="theme-panel" aria-label="Try color systems">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.5v17M5.5 6.5l13 11M18.5 6.5l-13 11" stroke="currentColor" stroke-width="1" opacity="0.4"/><circle cx="12" cy="7.2" r="1.6" fill="currentColor"/><circle cx="8" cy="14.5" r="1.6" fill="currentColor"/><circle cx="16" cy="14.5" r="1.6" fill="currentColor"/></svg>' +
      "</button>";
    document.body.appendChild(tool);

    var toggleBtn = tool.querySelector("#theme-toggle");
    var panel = tool.querySelector("#theme-panel");
    toggleBtn.addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      toggleBtn.setAttribute("aria-expanded", String(open));
    });
    panel.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-theme-id]");
      if (!opt) return;
      var id = opt.getAttribute("data-theme-id");
      savedTheme = id;
      applyTheme(id);
      try { localStorage.setItem(THEME_KEY, id); } catch (err) {}
      panel.querySelectorAll(".theme-opt").forEach(function (o) {
        o.classList.toggle("is-active", o === opt);
      });
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !tool.contains(e.target)) {
        panel.hidden = true;
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });
  })();

  /* ---------- Motion: decode labels + scroll reveals ---------- */

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Terminal-style decode on section eyebrows as they enter the viewport */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var GLYPHS = "/\\<>[]{}=+*#_—0177";
    var decode = function (node) {
      var target = node.textContent;
      if (!target || node.dataset.decoded) return;
      node.dataset.decoded = "1";
      var frame = 0;
      var total = Math.max(10, Math.min(22, target.length));
      var tick = function () {
        frame++;
        var resolved = Math.floor((frame / total) * target.length);
        var out = "";
        for (var i = 0; i < target.length; i++) {
          if (i < resolved || target[i] === " ") out += target[i];
          else out += GLYPHS[(i * 7 + frame * 3) % GLYPHS.length];
        }
        node.textContent = out;
        if (resolved < target.length) requestAnimationFrame(tick);
        else node.textContent = target;
      };
      requestAnimationFrame(tick);
    };

    var wrapText = function (parent, textNode) {
      var span = document.createElement("span");
      span.textContent = textNode.textContent;
      parent.replaceChild(span, textNode);
      return span;
    };

    var eyebrowIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        eyebrowIO.unobserve(entry.target);
        /* decode only the text after the // span */
        var node = entry.target.lastChild;
        if (node && node.nodeType === 3 && node.textContent.trim()) {
          decode(wrapText(entry.target, node));
        }
      });
    }, { threshold: 0.6 });

    document.querySelectorAll(".eyebrow").forEach(function (el) { eyebrowIO.observe(el); });

    /* Scroll reveal — transform-only, content always visible without JS */
    var revealables = document.querySelectorAll(
      ".feature-visual, .exp-card, .benefit-card, .mode-shot, .step, .follow-card, " +
      ".create-visual, .create-points li, .browser-cta-band, .deeper-band, .alpha-band, .status-note"
    );
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("rv-in");
        revealIO.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealables.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight - 30) {
        el.classList.add("rv");
        revealIO.observe(el);
      }
    });
  }

  /* ---------- Mobile nav ---------- */

  var toggle = document.getElementById("nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.hidden;
      mobileNav.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        mobileNav.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
    });
  }

  /* ---------- Header border on scroll ---------- */

  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* Expose the real header height so full-viewport sections can subtract it */
    var setHeaderVar = function () {
      document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    };
    window.addEventListener("resize", setHeaderVar, { passive: true });
    setHeaderVar();
  }

  /* ---------- Architecture diagram (docs page) ---------- */

  var diagram = document.getElementById("arch-diagram");
  if (diagram) {
    diagram.innerHTML =
      '<svg viewBox="0 0 420 460" role="img" aria-label="Players connect through the OPEN//77 client to a community-run dedicated server, which owns the authoritative world state and streams resources back.">' +
        '<defs>' +
          '<marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" fill="var(--diagram-line)"/></marker>' +
        '</defs>' +
        '<g class="dg-server">' +
          '<rect x="110" y="24" width="200" height="118" rx="10" class="dg-server-box"/>' +
          '<text x="210" y="52" text-anchor="middle" class="dg-label-strong">DEDICATED SERVER</text>' +
          '<text x="210" y="72" text-anchor="middle" class="dg-label-dim">community-operated</text>' +
          '<rect x="130" y="86" width="160" height="20" rx="4" class="dg-pill"/>' +
          '<text x="210" y="100" text-anchor="middle" class="dg-pill-text">authoritative world state</text>' +
          '<rect x="130" y="112" width="160" height="20" rx="4" class="dg-pill"/>' +
          '<text x="210" y="126" text-anchor="middle" class="dg-pill-text">resources &amp; game mode</text>' +
        "</g>" +
        '<g class="dg-links">' +
          '<path d="M210 142 V 210" class="dg-line" marker-end="url(#arr)" marker-start="url(#arr)"/>' +
          '<path d="M160 142 C 120 190, 90 230, 78 296" class="dg-line dg-line-dim"/>' +
          '<path d="M260 142 C 300 190, 330 230, 342 296" class="dg-line dg-line-dim"/>' +
        "</g>" +
        '<text x="210" y="182" text-anchor="middle" class="dg-flow">state sync &#8597; resource streaming</text>' +
        '<g>' +
          '<rect x="120" y="210" width="180" height="52" rx="8" class="dg-client-box"/>' +
          '<text x="210" y="232" text-anchor="middle" class="dg-label-strong dg-accent">OPEN//77 CLIENT</text>' +
          '<text x="210" y="250" text-anchor="middle" class="dg-label-dim">discovery + connection</text>' +
        "</g>" +
        '<g class="dg-players">' +
          '<path d="M180 262 C 140 290, 110 300, 86 310" class="dg-line dg-line-dim"/>' +
          '<path d="M210 262 V 306" class="dg-line dg-line-dim"/>' +
          '<path d="M240 262 C 280 290, 310 300, 334 310" class="dg-line dg-line-dim"/>' +
          '<g transform="translate(46,310)">' +
            '<rect width="84" height="64" rx="8" class="dg-player-box"/>' +
            '<circle cx="42" cy="24" r="9" class="dg-avatar"/>' +
            '<text x="42" y="52" text-anchor="middle" class="dg-label-dim">player</text>' +
          "</g>" +
          '<g transform="translate(168,310)">' +
            '<rect width="84" height="64" rx="8" class="dg-player-box"/>' +
            '<circle cx="42" cy="24" r="9" class="dg-avatar"/>' +
            '<text x="42" y="52" text-anchor="middle" class="dg-label-dim">player</text>' +
          "</g>" +
          '<g transform="translate(290,310)">' +
            '<rect width="84" height="64" rx="8" class="dg-player-box"/>' +
            '<circle cx="42" cy="24" r="9" class="dg-avatar"/>' +
            '<text x="42" y="52" text-anchor="middle" class="dg-label-dim">player</text>' +
          "</g>" +
        "</g>" +
        '<text x="210" y="416" text-anchor="middle" class="dg-caption">each player runs their own copy of Cyberpunk 2077</text>' +
        '<text x="210" y="436" text-anchor="middle" class="dg-caption dg-caption-dim">the server persists the world &mdash; players come and go</text>' +
      "</svg>";
  }

  /* ---------- Code sample (docs page) ---------- */

  var code = document.getElementById("code-sample");
  if (code) {
    code.innerHTML =
'<span class="c">// A resource adds gameplay to a server. Design preview.</span>\n' +
'<span class="k">import</span> { srv } <span class="k">from</span> <span class="s">"@open77/server"</span>;\n' +
'\n' +
'<span class="k">const</span> <span class="v">job</span> = srv.jobs.<span class="f">register</span>(<span class="s">"delivery"</span>, {\n' +
'  title: <span class="s">"Night Courier"</span>,\n' +
'  payout: { base: <span class="n">120</span>, perKm: <span class="n">14</span> },\n' +
'});\n' +
'\n' +
'srv.events.<span class="f">on</span>(<span class="s">"playerJoined"</span>, (player) =&gt; {\n' +
'  player.<span class="f">notify</span>(<span class="s">"Kabuki depot needs couriers tonight."</span>);\n' +
'});\n' +
'\n' +
'job.<span class="f">onAccept</span>(<span class="k">async</span> (player) =&gt; {\n' +
'  <span class="k">const</span> <span class="v">van</span> = <span class="k">await</span> srv.vehicles.<span class="f">spawn</span>(<span class="s">"thorton_colby"</span>, {\n' +
'    at: srv.world.<span class="f">marker</span>(<span class="s">"kabuki_depot"</span>),\n' +
'    ownedBy: player,\n' +
'  });\n' +
'  player.<span class="f">setWaypoint</span>(srv.world.<span class="f">marker</span>(<span class="s">"charter_hill_drop"</span>));\n' +
'  van.<span class="f">onArrive</span>(<span class="s">"charter_hill_drop"</span>, () =&gt; {\n' +
'    player.wallet.<span class="f">add</span>(job.<span class="f">payoutFor</span>(van.trip));\n' +
'    srv.world.<span class="f">broadcast</span>(<span class="s">`${player.name} finished a night run.`</span>);\n' +
'  });\n' +
'});';
  }

})();
