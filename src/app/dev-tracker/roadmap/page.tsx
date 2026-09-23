import { DevelopmentBoard } from "@/components/dev-tracker/directory";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Development board", description: "Follow OPEN//77 community ideas through validation, planning, development, testing and release.", path: "/dev-tracker/roadmap" });
export default function DevelopmentBoardPage() { return <DevelopmentBoard />; }
