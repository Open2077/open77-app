import { HostView, hostMetadata } from "@/views/host";

export const metadata = hostMetadata("en");

export default function HostPage() {
  return <HostView locale="en" />;
}
