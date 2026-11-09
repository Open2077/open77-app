import type { ReactNode } from "react";

import { CopyLine } from "@/components/copy-line";
import { DownloadAction } from "@/components/downloads/download-action";
import { linuxGlyph, windowsGlyph } from "@/components/downloads/glyphs";
import { FileDetails } from "@/components/downloads/product-blocks";
import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { DefinitionList } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import { Display, Eyebrow } from "@/components/ui/typography";
import { fill, rich } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import { formatBytes, formatReleaseDate } from "@/lib/cdn";
import type { ServerBuild, ServerRelease } from "@/lib/server-release";

import styles from "./server-builds.module.css";

/** How you launch the server on each platform, once it is unpacked. */
const RUN_COMMANDS: Record<ServerBuild["os"], string> = { windows: "Start.cmd", linux: "./start.sh" };

type BuildMessages = Messages["host"]["builds"];

const code = (chunk: ReactNode) => <code>{chunk}</code>;

/** One server release: its version and one card per platform. */
export function ServerBuilds({
  release,
  m,
  common,
  languageTag,
}: {
  release: ServerRelease;
  m: BuildMessages;
  common: Pick<Messages["common"], "downloadNote">;
  /** BCP-47 tag of the page language, for dates and sizes. */
  languageTag: string;
}) {
  const unstable = release.channel === "unstable";
  return (
    <div
      className={cx(styles.release, unstable && styles.unstable)}
      data-release-channel={unstable ? "server-unstable" : "server"}
      data-release-version={release.version}
    >
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <Eyebrow>{unstable ? m.unstableEyebrow : m.stableEyebrow}</Eyebrow>
          <h2 className={styles.version}>{release.version}</h2>
        </div>
        <div className={styles.headMeta}>
          <Tag tone={unstable ? "yellow" : "blue"} variant="solid">
            {unstable ? m.previewTag : m.officialTag}
          </Tag>
          {release.publishedAtUtc ? <span className={styles.date}>{fill(m.published, { date: formatReleaseDate(release.publishedAtUtc, languageTag) })}</span> : null}
        </div>
      </header>
      {unstable ? (
        <p className={styles.compat}>
          {rich(m.compat, { code }, { client: release.clientVersion ?? "", protocol: release.protocol ?? "" })}
        </p>
      ) : null}
      <ul className={styles.builds}>
        {release.builds.map((build) => (
          <BuildCard key={build.platform} build={build} unstable={unstable} m={m} note={common.downloadNote} languageTag={languageTag} />
        ))}
      </ul>
    </div>
  );
}

function BuildCard({
  build,
  unstable,
  m,
  note,
  languageTag,
}: {
  build: ServerBuild;
  unstable: boolean;
  m: BuildMessages;
  note: string;
  languageTag: string;
}) {
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
            {fill(m.archiveKind, { os: build.osLabel, kind: build.archiveKind })}
          </p>
        </div>
      </div>
      {build.url ? (
        <>
          <DefinitionList
            className={styles.facts}
            items={[
              { label: m.size, value: build.sizeBytes !== null ? formatBytes(build.sizeBytes, languageTag) : m.notPublished },
              { label: m.run, value: <code>{RUN_COMMANDS[build.os]}</code> },
              { label: m.runtime, value: m.runtimeValue },
            ]}
          />
          <DownloadAction
            href={build.url}
            label={fill(unstable ? m.downloadUnstableFor : m.downloadFor, { os })}
            meta={[`.${build.archiveKind}`, build.sizeBytes !== null ? formatBytes(build.sizeBytes, languageTag) : null].filter(Boolean).join(" · ")}
            tone={unstable ? "yellow" : undefined}
            lines={false}
            size="md"
            fullWidth
            note={note}
          />
          <FileDetails summary={m.details}>
            <p>{rich(m.file, { code }, { file: build.fileName ?? "" })}</p>
            {build.archiveSha256 ? (
              <>
                <p>{m.shaIntro}</p>
                <CopyLine value={build.archiveSha256} label={fill(m.copySha, { os })} />
              </>
            ) : (
              <p>{m.noChecksum}</p>
            )}
          </FileDetails>
        </>
      ) : (
        <p className={styles.missing} role="status">
          {m.missing}
        </p>
      )}
    </li>
  );
}
