/* OPEN//77 — server detail page. Renders one server from servers-data.js
   based on ?id=. All content is demo data (labeled) until the live API exists. */

(function () {
  "use strict";

  var view = document.getElementById("server-view");
  if (!view || !window.OPEN77) return;

  var api = OPEN77.api;
  var esc = OPEN77.esc;
  var pingClass = OPEN77.pingClass;
  var favs = OPEN77.favs.load();
  var toastEl = document.getElementById("toast");

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

  function starSvg(filled) {
    return '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="' +
      (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  }

  function linkChip(iconPath, label) {
    return (
      '<span class="sv-link-chip" title="Demo data — community links go live with real listings">' +
        '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">' + iconPath + "</svg>" +
        esc(label) +
      "</span>"
    );
  }

  function notFound() {
    view.innerHTML =
      '<div class="sv-missing">' +
        '<h1 class="sb-title">Server not found.</h1>' +
        '<p class="section-lead">This listing doesn\'t exist &mdash; it may have been removed from the demo directory.</p>' +
        '<p><a class="btn btn-primary" href="servers.html">Back to the browser</a></p>' +
      "</div>";
    document.title = "Server not found — OPEN//77";
  }

  function render(s) {
    var pct = Math.round((s.players / s.max) * 100);
    var fav = !!favs[s.id];
    document.title = s.name + " — OPEN//77";

    var linksHtml = "";
    if (s.links && (s.links.website || s.links.discord)) {
      linksHtml =
        '<div class="sv-links">' +
          (s.links.website ? linkChip('<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 8h12M8 2c2 1.8 2 10.2 0 12M8 2c-2 1.8-2 10.2 0 12" fill="none" stroke="currentColor" stroke-width="1.2"/>', s.links.website) : "") +
          (s.links.discord ? linkChip('<path d="M3 5.5C4.5 4.6 6 4.2 8 4.2s3.5.4 5 1.3c.8 2 .9 4.2.6 6.3-1.2.9-2.4 1.4-3.6 1.6l-.5-1.1c.4-.1.9-.3 1.3-.6-1.8.8-3.8.8-5.6 0 .4.3.9.5 1.3.6l-.5 1.1c-1.2-.2-2.4-.7-3.6-1.6-.3-2.1-.2-4.3.6-6.3z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="6.2" cy="8.4" r="0.9" fill="currentColor"/><circle cx="9.8" cy="8.4" r="0.9" fill="currentColor"/>', s.links.discord) : "") +
          '<span class="sv-links-note">demo links</span>' +
        "</div>";
    } else {
      linksHtml = '<p class="sv-links-empty">Community links appear here when the server provides them.</p>';
    }

    var playerNames = api.samplePlayers(s, 12);

    view.innerHTML =
      '<article class="sv-card">' +
        '<div class="sv-cover" style="background-image: linear-gradient(180deg, rgba(11,15,25,0.2), rgba(11,15,25,0.45) 55%, rgba(11,15,25,0.96)), url(\'' + s.banner + '\')">' +
          '<span class="hud-corners" aria-hidden="true"></span>' +
          '<div class="sv-cover-bottom">' +
            '<div class="sv-cover-id">' +
              '<p class="sv-eyebrow"><span class="eyebrow-slash">//</span>SERVER PAGE <span class="mini-chip">DEMO</span></p>' +
              '<h1 class="sv-name">' + esc(s.name) + "</h1>" +
              '<p class="sv-sub">' + esc(s.mode) + " &middot; " + esc(s.region) + " region &middot; " + esc(s.lang) +
                (s.owner ? ' &middot; run by <strong>' + esc(s.owner) + "</strong>" : "") + "</p>" +
            "</div>" +
            '<div class="sv-cover-actions">' +
              '<button class="fav-btn sv-fav ' + (fav ? "is-fav" : "") + '" id="sv-fav" aria-pressed="' + fav + '" aria-label="' + (fav ? "Remove from favorites" : "Add to favorites") + '">' + starSvg(fav) + "</button>" +
              '<button class="btn btn-primary" id="sv-connect">' +
                '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 3.5v9l8-4.5z" fill="currentColor"/></svg>' +
                "Connect</button>" +
            "</div>" +
          "</div>" +
        "</div>" +

        '<div class="sv-statbar">' +
          '<div class="sv-stat sv-stat-players">' +
            '<span class="sv-stat-k">Players</span>' +
            '<span class="sv-stat-v">' + s.players + ' <span class="sv-stat-dim">/ ' + s.max + "</span></span>" +
            '<span class="players-bar" aria-hidden="true"><span style="width:' + pct + '%"></span></span>' +
          "</div>" +
          '<div class="sv-stat"><span class="sv-stat-k">Ping</span><span class="sv-stat-v ' + pingClass(s.ping) + '">' + s.ping + ' ms</span></div>' +
          '<div class="sv-stat"><span class="sv-stat-k">Region</span><span class="sv-stat-v">' + esc(s.region) + "</span></div>" +
          '<div class="sv-stat"><span class="sv-stat-k">Language</span><span class="sv-stat-v">' + esc(s.lang) + "</span></div>" +
          '<div class="sv-stat sv-stat-tags"><span class="sv-stat-k">Tags</span><span class="dstat-tags">' +
            s.tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") +
          "</span></div>" +
        "</div>" +

        '<div class="sv-body">' +
          '<div class="sv-main">' +
            '<section class="sv-section">' +
              '<h2 class="sv-h2"><span class="eyebrow-slash">//</span> About this server</h2>' +
              '<p class="sv-desc">' + esc(s.desc) + "</p>" +
              linksHtml +
            "</section>" +
            (s.rules && s.rules.length ?
              '<section class="sv-section">' +
                '<h2 class="sv-h2"><span class="eyebrow-slash">//</span> Server rules</h2>' +
                '<ul class="sv-rules">' + s.rules.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" +
              "</section>" : "") +
          "</div>" +
          '<aside class="sv-side">' +
            '<section class="sv-section">' +
              '<h2 class="sv-h2"><span class="eyebrow-slash">//</span> Online now <span class="mini-chip">DEMO</span></h2>' +
              '<ul class="sv-playerlist">' +
                playerNames.map(function (p) { return '<li><span class="live-dot" aria-hidden="true"></span>' + esc(p) + "</li>"; }).join("") +
              "</ul>" +
              '<p class="sv-playerlist-more">+ ' + Math.max(0, s.players - playerNames.length) + " more (illustrative)</p>" +
            "</section>" +
          "</aside>" +
        "</div>" +

        '<p class="sv-footnote">Demo listing &mdash; connecting, live player counts and community links go live with the first public build.</p>' +
      "</article>";

    document.getElementById("sv-connect").addEventListener("click", function () {
      toast("Connecting goes live with the first public build.");
    });
    document.getElementById("sv-fav").addEventListener("click", function () {
      favs[s.id] = !favs[s.id];
      OPEN77.favs.save(favs);
      var f = !!favs[s.id];
      this.classList.toggle("is-fav", f);
      this.setAttribute("aria-pressed", String(f));
      this.innerHTML = starSvg(f);
      this.setAttribute("aria-label", f ? "Remove from favorites" : "Add to favorites");
    });
  }

  var id = new URLSearchParams(window.location.search).get("id");
  if (!id) { notFound(); return; }
  api.getServer(id).then(function (s) {
    if (!s) { notFound(); return; }
    render(s);
  });

})();
