import type { Metadata } from "next";
import { GameOwnershipPanel } from "@/components/admin/game-ownership-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Admin · Genuine whitelist", description: "Account game access and manual approvals.", path: "/admin/game-ownership" }),
  robots: { index: false, follow: false },
};

export default function AdminGameOwnershipPage() {
  return <GameOwnershipPanel />;
}
