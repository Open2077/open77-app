import { notFound } from "next/navigation";
import { IdeaDetail } from "@/components/dev-tracker/idea-detail";
export const metadata = { title: "Community idea — Dev Tracker", robots: { index: false, follow: true } };
export default async function CommunityIdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  return <IdeaDetail id={id} />;
}
