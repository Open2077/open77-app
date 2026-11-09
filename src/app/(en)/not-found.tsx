import { NotFoundView, notFoundMetadata } from "@/views/not-found";

export const metadata = notFoundMetadata("en");

export default function NotFound() {
  return <NotFoundView locale="en" />;
}
