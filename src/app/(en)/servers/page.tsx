import { ServersView, serversMetadata } from "@/views/servers";

export const metadata = serversMetadata("en");

export default function ServersPage() {
  return <ServersView locale="en" />;
}
