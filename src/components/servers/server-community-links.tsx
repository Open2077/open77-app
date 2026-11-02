import { communityUrl, type GameServer } from "@/lib/servers";
import { Icon } from "@/components/ui/icon";
import { discord, globe02, arrowUpRight01 } from "@/components/ui/icons";
import styles from "./server-presentation.module.css";

export function ServerCommunityLinks({ server }: { server: GameServer }) {
  const links = [
    { url: communityUrl(server.links?.discord), label: "Join the Discord", icon: discord },
    { url: communityUrl(server.links?.website), label: "Visit the website", icon: globe02 },
  ].filter(link => link.url);
  if (!links.length) return null;
  return <div className={styles.communityLinks}>{links.map(link => <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">
    <Icon glyph={link.icon} /><span><strong>{link.label}</strong><small>{new URL(link.url!).host.replace(/^www\./, "")}</small></span><Icon glyph={arrowUpRight01} />
  </a>)}</div>;
}
