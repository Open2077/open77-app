/**
 * The connection model: players run the client, the client talks to one
 * community-operated dedicated server, and that server owns the world state.
 *
 * Inline SVG rather than an image so it inherits the theme tokens through
 * `--diagram-line` and the `dg-*` classes, stays sharp at any size, and carries
 * its own description for screen readers and for crawlers that read the
 * accessible name instead of the picture.
 */
export function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 420 460"
      role="img"
      aria-label="Players connect through the OPEN//77 client to a community-run dedicated server, which owns the authoritative world state and streams resources back."
    >
      <defs>
        <marker
          id="arch-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L8 4 L0 8 z" fill="var(--diagram-line)" />
        </marker>
      </defs>

      <g className="dg-server">
        <rect x="110" y="24" width="200" height="118" rx="10" className="dg-server-box" />
        <text x="210" y="52" textAnchor="middle" className="dg-label-strong">
          DEDICATED SERVER
        </text>
        <text x="210" y="72" textAnchor="middle" className="dg-label-dim">
          community-operated
        </text>
        <rect x="130" y="86" width="160" height="20" rx="4" className="dg-pill" />
        <text x="210" y="100" textAnchor="middle" className="dg-pill-text">
          authoritative world state
        </text>
        <rect x="130" y="112" width="160" height="20" rx="4" className="dg-pill" />
        <text x="210" y="126" textAnchor="middle" className="dg-pill-text">
          resources &amp; game mode
        </text>
      </g>

      <g className="dg-links">
        <path
          d="M210 142 V 210"
          className="dg-line"
          markerEnd="url(#arch-arrow)"
          markerStart="url(#arch-arrow)"
        />
        <path d="M160 142 C 120 190, 90 230, 78 296" className="dg-line dg-line-dim" />
        <path d="M260 142 C 300 190, 330 230, 342 296" className="dg-line dg-line-dim" />
      </g>

      <text x="210" y="182" textAnchor="middle" className="dg-flow">
        state sync ↕ resource streaming
      </text>

      <g>
        <rect x="120" y="210" width="180" height="52" rx="8" className="dg-client-box" />
        <text x="210" y="232" textAnchor="middle" className="dg-label-strong dg-accent">
          OPEN//77 CLIENT
        </text>
        <text x="210" y="250" textAnchor="middle" className="dg-label-dim">
          discovery + connection
        </text>
      </g>

      <g className="dg-players">
        <path d="M180 262 C 140 290, 110 300, 86 310" className="dg-line dg-line-dim" />
        <path d="M210 262 V 306" className="dg-line dg-line-dim" />
        <path d="M240 262 C 280 290, 310 300, 334 310" className="dg-line dg-line-dim" />
        {[46, 168, 290].map((x) => (
          <g transform={`translate(${x},310)`} key={x}>
            <rect width="84" height="64" rx="8" className="dg-player-box" />
            <circle cx="42" cy="24" r="9" className="dg-avatar" />
            <text x="42" y="52" textAnchor="middle" className="dg-label-dim">
              player
            </text>
          </g>
        ))}
      </g>

      <text x="210" y="416" textAnchor="middle" className="dg-caption">
        each player runs their own copy of Cyberpunk 2077
      </text>
      <text x="210" y="436" textAnchor="middle" className="dg-caption dg-caption-dim">
        the server persists the world — players come and go
      </text>
    </svg>
  );
}
