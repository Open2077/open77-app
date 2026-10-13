import styles from "./architecture-diagram.module.css";

/**
 * The connection model: players run the client, the client talks to one
 * community-operated dedicated server, and that server owns the world state.
 *
 * Inline SVG rather than an image so it takes the page tone and the design
 * tokens through its CSS module, stays sharp at any size, and carries its own
 * description for screen readers and for crawlers that read the accessible
 * name instead of the picture.
 */
export function ArchitectureDiagram() {
  return (
    <svg
      className={styles.diagram}
      viewBox="0 0 420 460"
      role="img"
      aria-label="Players connect through the OPEN//77 client to a community-run dedicated server, which owns the authoritative world state and streams resources back."
    >
      <defs>
        <marker id="arch-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" className={styles.arrow} />
        </marker>
      </defs>

      <g>
        <path d="M120 24 H320 L300 142 H100 Z" className={styles.server} />
        <text x="210" y="52" textAnchor="middle" className={styles.strong}>
          DEDICATED SERVER
        </text>
        <text x="210" y="71" textAnchor="middle" className={styles.dim}>
          community-operated
        </text>
        <path d="M136 86 H290 L287 106 H133 Z" className={styles.pill} />
        <text x="210" y="100" textAnchor="middle" className={styles.pillText}>
          authoritative world state
        </text>
        <path d="M131 112 H285 L282 132 H128 Z" className={styles.pill} />
        <text x="207" y="126" textAnchor="middle" className={styles.pillText}>
          resources &amp; game mode
        </text>
      </g>

      <g>
        <path d="M205 142 V 210" className={styles.line} markerEnd="url(#arch-arrow)" markerStart="url(#arch-arrow)" />
        <path d="M150 142 C 115 190, 90 230, 78 296" className={styles.lineDim} />
        <path d="M265 142 C 300 190, 330 230, 342 296" className={styles.lineDim} />
      </g>

      <text x="210" y="182" textAnchor="middle" className={styles.flow}>
        state sync ↕ resource streaming
      </text>

      <g>
        <path d="M130 210 H305 L295 262 H120 Z" className={styles.client} />
        <text x="212" y="232" textAnchor="middle" className={styles.accent}>
          OPEN//77 CLIENT
        </text>
        <text x="210" y="250" textAnchor="middle" className={styles.dim}>
          discovery + connection
        </text>
      </g>

      <g>
        <path d="M180 262 C 140 290, 110 300, 86 310" className={styles.lineDim} />
        <path d="M208 262 V 306" className={styles.lineDim} />
        <path d="M240 262 C 280 290, 310 300, 334 310" className={styles.lineDim} />
        {[46, 168, 290].map((x) => (
          <g transform={`translate(${x},310)`} key={x}>
            <path d="M8 0 H86 L78 64 H0 Z" className={styles.player} />
            <path d="M36 15 H54 L51 33 H33 Z" className={styles.avatar} />
            <text x="43" y="52" textAnchor="middle" className={styles.dim}>
              player
            </text>
          </g>
        ))}
      </g>

      <text x="210" y="416" textAnchor="middle" className={styles.caption}>
        each player runs their own copy of Cyberpunk 2077
      </text>
      <text x="210" y="436" textAnchor="middle" className={styles.captionDim}>
        the server persists the world. Players come and go
      </text>
    </svg>
  );
}
