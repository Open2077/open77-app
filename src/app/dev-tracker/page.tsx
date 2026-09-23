import { IdeaDirectory } from "@/components/dev-tracker/directory";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Dev Tracker — community ideas", description: "Suggest improvements for OPEN//77, vote on community ideas and discuss what the team should build next.", path: "/dev-tracker" });
export default function DevTrackerPage() { return <IdeaDirectory />; }
