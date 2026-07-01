import { NextRequest } from "next/server";
import { filonRecoveryStatusResponse } from "@/lib/filon-recovery/status-query";

export async function GET(request: NextRequest) {
  return filonRecoveryStatusResponse(request);
}
