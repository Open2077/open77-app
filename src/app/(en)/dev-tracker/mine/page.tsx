import { IdeaDirectory } from "@/components/dev-tracker/directory";
export const metadata = { title: "My ideas", robots: { index: false, follow: false } };
export default function MyIdeasPage() { return <IdeaDirectory view="mine" />; }
