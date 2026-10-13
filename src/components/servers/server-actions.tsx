"use client";

import { useFavorites } from "@/components/favorites";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { play, star } from "@/components/ui/icons";
import { joinServer } from "@/lib/servers";

import styles from "./server-actions.module.css";

/**
 * The favourite and connect controls on a server profile, isolated in a client
 * component so the rest of the profile renders without them.
 */
export function ServerActions({ id }: { id: string }) {
  const { isFavorite, toggle } = useFavorites();
  const { show: showToast, node: toastNode } = useToast();
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
            showToast("Opening the OPEN//77 launcher…");
            joinServer(id);
          }}
        >
          Connect
        </Button>
        <button
          type="button"
          className={styles.fav}
          aria-pressed={favorited}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          onClick={() => toggle(id)}
        >
          <Icon glyph={star} />
          <span>{favorited ? "Favorite" : "Add to favorites"}</span>
        </button>
      </div>
      {toastNode}
    </>
  );
}
