import { authMetadata, LauncherView } from "@/views/auth";

export const metadata = authMetadata("launcher", "en");

export default function LauncherPage() {
  return <LauncherView locale="en" />;
}
