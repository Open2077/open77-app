"use client";

import { useFavorites } from "@/components/favorites";
import { PlayIcon, StarIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

/**
 * The favourite and connect controls on a server page.
 *
 * Isolated into its own client component so the rest of the server page — cover,
 * stats, rules, player list — stays a server component and ships no JavaScript.
 */
export function ServerActions({ id }: { id: string }) {
  const { isFavorite, toggle } = useFavorites();
  const { show: showToast, node: toastNode } = useToast();
  const favorited = isFavorite(id);

  return (
    <>
      <div className="sv-cover-actions">
        <button
          className={`fav-btn sv-fav${favorited ? " is-fav" : ""}`}
          type="button"
          aria-pressed={favorited}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          onClick={() => toggle(id)}
        >
          <StarIcon filled={favorited} />
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => showToast("Connecting goes live with the first public build.")}
        >
          <PlayIcon />
          Connect
        </button>
      </div>
      {toastNode}
    </>
  );
}
