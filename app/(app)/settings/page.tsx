import { requireUser } from "@/lib/auth";
import { SettingsClient } from "@/components/settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();
  return <SettingsClient />;
}