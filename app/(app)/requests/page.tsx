import { requireUser } from "@/lib/auth";
import { RequestsClient } from "@/components/requests-client";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  await requireUser();
  return <RequestsClient />;
}