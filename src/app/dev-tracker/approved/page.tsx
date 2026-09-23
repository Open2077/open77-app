import { IdeaDirectory } from "@/components/dev-tracker/directory";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Validated community ideas", description: "Community ideas accepted by the OPEN//77 team, from validation to release.", path: "/dev-tracker/approved" });
export default function ApprovedIdeasPage() { return <IdeaDirectory view="approved" />; }
