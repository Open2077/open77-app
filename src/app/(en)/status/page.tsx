import { StatusView, statusMetadata } from "@/views/status";

export const metadata = statusMetadata("en");

export default function StatusPage() {
  return <StatusView locale="en" />;
}
