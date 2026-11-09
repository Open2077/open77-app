import { authMetadata, ResetPasswordView } from "@/views/auth";

export const metadata = authMetadata("reset", "en");

export default function ResetPasswordPage() {
  return <ResetPasswordView locale="en" />;
}
