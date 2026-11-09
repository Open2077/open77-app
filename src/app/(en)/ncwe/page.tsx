import { NcweView, ncweMetadata } from "@/views/ncwe";

export const metadata = ncweMetadata("en");

export default function NcwePage() {
  return <NcweView locale="en" />;
}
