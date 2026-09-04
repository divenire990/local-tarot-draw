import { jsonError, jsonOk } from "@/lib/tarot/http";
import { saveSession } from "@/lib/tarot/session-store";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    return jsonOk(await saveSession(sessionId));
  } catch (error) {
    return jsonError(error, "保存抽牌记录失败。");
  }
}
