import { NextResponse } from "next/server";
import { DOMAINS, getActiveDomains } from "@/lib/domains";

export async function GET() {
  return NextResponse.json({
    domains: getActiveDomains(),
    allDomains: DOMAINS,
  });
}
