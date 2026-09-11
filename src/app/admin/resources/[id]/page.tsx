import { CommunityProjectPanel } from "@/components/admin/community-project-panel";

export const metadata = { title: "Hub project moderation", robots: { index: false, follow: false } };
export default async function ProjectModerationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityProjectPanel id={id} />;
}
