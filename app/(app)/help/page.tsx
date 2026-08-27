import { requireUser } from "@/lib/auth";
import { HelpClient } from "@/components/help-client";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  await requireUser();
  return <HelpClient />;
}