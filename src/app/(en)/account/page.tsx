import { authMetadata, AccountView } from "@/views/auth";

export const metadata = authMetadata("account", "en");

export default function AccountPage() {
  return <AccountView locale="en" />;
}
