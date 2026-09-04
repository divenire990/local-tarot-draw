import { createSessionSchema } from "@/lib/tarot/schemas";
import { jsonError, jsonOk } from "@/lib/tarot/http";
import { createSession } from "@/lib/tarot/session-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createSessionSchema.parse(body);
    const result = await createSession(input.spreadId, input.question);

    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error, "创建抽牌会话失败。");
  }
}
