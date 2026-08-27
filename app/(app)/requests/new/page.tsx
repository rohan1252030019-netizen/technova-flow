import { requireUser } from "@/lib/auth";
import { NewRequestClient } from "@/components/new-request-client";

export const metadata = { title: "New Request" };

export default async function NewRequestPage() {
  await requireUser();
  return <NewRequestClient />;
}