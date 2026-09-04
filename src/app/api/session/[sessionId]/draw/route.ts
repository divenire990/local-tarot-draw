import { drawCardSchema } from "@/lib/tarot/schemas";
import { jsonError, jsonOk } from "@/lib/tarot/http";
import { drawCard, getSessionState } from "@/lib/tarot/session-store";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const input = drawCardSchema.parse(body);
    const result = await drawCard(sessionId, input);

    return jsonOk({
      ...result,
      session: await getSessionState(sessionId),
    });
  } catch (error) {
    return jsonError(error, "抽牌失败。");
  }
}
