import type { Metadata } from "next";

import { UsersPanel } from "@/components/admin/users-panel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Admin — Users",
    description: "OPEN//77 operations console: account search and moderation.",
    path: "/admin/users",
  }),
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return <UsersPanel />;
}
