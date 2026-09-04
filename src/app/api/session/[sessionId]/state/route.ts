import { jsonError, jsonOk } from "@/lib/tarot/http";
import { getSessionState } from "@/lib/tarot/session-store";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    return jsonOk(await getSessionState(sessionId));
  } catch (error) {
    return jsonError(error, "读取抽牌会话失败。");
  }
}
