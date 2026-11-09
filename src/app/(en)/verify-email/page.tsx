import { authMetadata, VerifyEmailView } from "@/views/auth";

export const metadata = authMetadata("verify", "en");

export default function VerifyEmailPage() {
  return <VerifyEmailView locale="en" />;
}
