import { z } from "zod";

import { openLocalDirectory } from "@/lib/desktop/open-directory";
import { getRecordsDirectory } from "@/lib/tarot/config";
import { jsonError, jsonOk } from "@/lib/tarot/http";

export const runtime = "nodejs";

const openDirectorySchema = z.object({
  targetPath: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = openDirectorySchema.parse(body);
    const result = await openLocalDirectory(input.targetPath, getRecordsDirectory());

    if (!result.ok) {
      throw new Error(result.error ?? "打开目录失败。");
    }

    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "打开目录失败。");
  }
}
