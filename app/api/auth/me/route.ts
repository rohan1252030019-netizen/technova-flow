import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { jsonOk } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  return jsonOk({ user });
}