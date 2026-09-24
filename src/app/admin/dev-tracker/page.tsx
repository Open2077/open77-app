import { IdeaDirectory } from "@/components/dev-tracker/directory";
export const metadata = { title: "Dev Tracker moderation", robots: { index: false, follow: false } };
export default function DevTrackerAdminPage() { return <IdeaDirectory view="admin" admin />; }
