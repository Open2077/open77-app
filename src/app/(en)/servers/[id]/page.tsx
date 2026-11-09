import type { Metadata } from "next";

import { ServerProfileView, serverProfileMetadata } from "@/views/server-profile";

// Profiles are generated on first visit. ISR refreshes their text/images while
// the browser refreshes live data; builds must not fan out a request per server
// against the master's shared public rate limit. The sitemap still lists them.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return serverProfileMetadata("en", id);
}

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServerProfileView locale="en" id={id} />;
}
