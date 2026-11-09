import type { ReactNode } from "react";

import { AuthMessages } from "@/components/account/auth-messages";

/** Every English account page can fall back to its sign-in panel, so all of them carry its strings. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AuthMessages locale="en">{children}</AuthMessages>;
}
