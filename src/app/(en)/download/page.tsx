import { DownloadView, downloadMetadata } from "@/views/download";

export const metadata = downloadMetadata("en");

export default function DownloadPage() {
  return <DownloadView locale="en" />;
}
