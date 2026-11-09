import { CreateView, createMetadata } from "@/views/create";

export const metadata = createMetadata("en");

export default function CreatePage() {
  return <CreateView locale="en" />;
}
