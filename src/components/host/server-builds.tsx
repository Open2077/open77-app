import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { linuxGlyph, windowsGlyph } from "@/components/downloads/glyphs";
import { FileDetails } from "@/components/downloads/product-blocks";
import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { DefinitionList } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import { lock } from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import type { ServerBuild, ServerRelease } from "@/lib/server-release";

import styles from "./server-builds.module.css";

/** How you launch the server on each platform, once it is unpacked. */
const RUN_COMMANDS: Record<ServerBuild["os"], string> = { windows: "Start.cmd", linux: "./start.sh" };

/** One server release: its version and one card per platform. */
export function ServerBuilds({ release }: { release: ServerRelease }) {
  const unstable = release.channel === "unstable";
  return (
    <div
      className={cx(styles.release, unstable && styles.unstable)}
      data-release-channel={unstable ? "server-unstable" : "server"}
      data-release-version={release.version}
    >
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <Eyebrow>{unstable ? "Unstable server · test build" : "Latest stable server"}</Eyebrow>
          <h2 className={styles.version}>{release.version}</h2>
        </div>
        <div className={styles.headMeta}>
          <Tag tone={unstable ? "yellow" : "blue"} variant="solid">
            {unstable ? "Preview build" : "Official build"}
          </Tag>
          {release.publishedAtUtc ? <span className={styles.date}>Published {formatReleaseDate(release.publishedAtUtc)}</span> : null}
        </div>
      </header>
      {unstable ? (
        <p className={styles.compat}>
          Compatible client: <code>{release.clientVersion}</code> · Network protocol: <code>{release.protocol}</code>. Stable
          clients may not be able to join.
        </p>
      ) : null}
      <ul className={styles.builds}>
        {release.builds.map((build) => (
          <BuildCard key={build.platform} build={build} unstable={unstable} />
        ))}
      </ul>
    </div>
  );
}

/** What the gate keeps closed: the version and its platforms, with no download links. */
export function ServerBuildsPreview({ release }: { release: ServerRelease }) {
  return (
    <div className={styles.preview}>
      <span className={styles.previewLabel}>
        Latest stable · <span className={styles.previewVersion}>{release.version}</span>
      </span>
      <ul className={styles.previewList}>
        {release.builds
          .filter((build) => build.url)
          .map((build) => (
            <li key={build.platform}>
              <Icon glyph={build.os === "windows" ? windowsGlyph : linuxGlyph} />
              <span>
                {build.label} · .{build.archiveKind}
                {build.sizeBytes !== null ? ` · ${formatBytes(build.sizeBytes)}` : ""}
              </span>
              <Icon glyph={lock} className={styles.previewLock} />
            </li>
          ))}
      </ul>
    </div>
  );
}

function BuildCard({ build, unstable }: { build: ServerBuild; unstable: boolean }) {
  const os = build.os === "windows" ? "Windows" : "Linux";
  return (
    <li className={cx(styles.build, !build.url && styles.buildUnavailable)}>
      <div className={styles.buildTop}>
        <Icon glyph={build.os === "windows" ? windowsGlyph : linuxGlyph} className={styles.os} />
        <div>
          <Display as="h3" size="xs">
            {build.label}
          </Display>
          <p className={styles.kind}>
            {build.osLabel} · .{build.archiveKind} archive
          </p>
        </div>
      </div>
      {build.url ? (
        <>
          <DefinitionList
            className={styles.facts}
            items={[
              { label: "Size", value: build.sizeBytes !== null ? formatBytes(build.sizeBytes) : "Not published" },
              { label: "Run", value: <code>{RUN_COMMANDS[build.os]}</code> },
              { label: "Runtime", value: ".NET included" },
            ]}
          />
          <DownloadAction
            href={build.url}
            label={`Download ${unstable ? "Unstable " : ""}for ${os}`}
            meta={[`.${build.archiveKind}`, build.sizeBytes !== null ? formatBytes(build.sizeBytes) : null].filter(Boolean).join(" · ")}
            tone={unstable ? "yellow" : undefined}
            lines={false}
            size="md"
            fullWidth
            note="From the official OPEN//77 CDN, the only place we publish it."
          />
          <FileDetails summary="Archive details & verification">
            <p>
              File: <code>{build.fileName}</code>
            </p>
            {build.archiveSha256 ? (
              <>
                <p>Archive SHA-256. Compare it against the downloaded archive before extracting.</p>
                <CopyLine value={build.archiveSha256} label={`Copy the ${build.os} archive SHA-256`} />
              </>
            ) : (
              <p>An archive checksum is not published for this build.</p>
            )}
          </FileDetails>
        </>
      ) : (
        <p className={styles.missing} role="status">
          This platform&apos;s build has not been published for this release yet. Use “Check for updates” below to retry.
        </p>
      )}
    </li>
  );
}
