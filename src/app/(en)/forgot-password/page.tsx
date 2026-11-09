import { authMetadata, ForgotPasswordView } from "@/views/auth";

export const metadata = authMetadata("forgot", "en");

export default function ForgotPasswordPage() {
  return <ForgotPasswordView locale="en" />;
}
