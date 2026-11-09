"use client";

import { useMessages } from "@/i18n/client";
import { communityUrl, type GameServer } from "@/lib/servers";
import { Icon } from "@/components/ui/icon";
import { discord, globe02, arrowUpRight01 } from "@/components/ui/icons";
import styles from "./server-presentation.module.css";

/** The operator's own links: the URLs and hosts are theirs, only the labels are ours. */
export function ServerCommunityLinks({ server }: { server: GameServer }) {
  const m = useMessages("servers").shared.links;
  const links = [
    { kind: "discord", url: communityUrl(server.links?.discord), label: m.discord, icon: discord },
    { kind: "website", url: communityUrl(server.links?.website), label: m.website, icon: globe02 },
  ].filter(link => link.url);
  if (!links.length) return null;
  return <div className={styles.communityLinks}>{links.map(link => <a key={link.kind} href={link.url} target="_blank" rel="noopener noreferrer">
    <Icon glyph={link.icon} /><span><strong>{link.label}</strong><small>{new URL(link.url!).host.replace(/^www\./, "")}</small></span><Icon glyph={arrowUpRight01} />
  </a>)}</div>;
}
