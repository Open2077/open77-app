"use client";

import { useFavorites } from "@/components/favorites";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { play, star } from "@/components/ui/icons";
import { useMessages } from "@/i18n/client";
import { joinServer } from "@/lib/servers";

import styles from "./server-actions.module.css";

/**
 * The favourite and connect controls on a server profile, isolated in a client
 * component so the rest of the profile renders without them.
 */
export function ServerActions({ id }: { id: string }) {
  const { isFavorite, toggle } = useFavorites();
  const { show: showToast, node: toastNode } = useToast();
  const m = useMessages("servers");
  const favorited = isFavorite(id);

  return (
    <>
      <div className={styles.actions}>
        <Button
          lines="left"
          size="lg"
          icon={play}
          iconPosition="left"
          onClick={() => {
            showToast(m.shared.opening);
            joinServer(id);
          }}
        >
          {m.actions.connect}
        </Button>
        <button
          type="button"
          className={styles.fav}
          aria-pressed={favorited}
          aria-label={favorited ? m.actions.removeFavorite : m.shared.addToFavorites}
          onClick={() => toggle(id)}
        >
          <Icon glyph={star} />
          <span>{favorited ? m.actions.favorite : m.shared.addToFavorites}</span>
        </button>
      </div>
      {toastNode}
    </>
  );
}
