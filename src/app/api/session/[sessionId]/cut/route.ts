import { jsonError, jsonOk } from "@/lib/tarot/http";
import { getSessionState, cutSession } from "@/lib/tarot/session-store";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    await cutSession(sessionId);

    return jsonOk(await getSessionState(sessionId));
  } catch (error) {
    return jsonError(error, "切牌失败。");
  }
}
