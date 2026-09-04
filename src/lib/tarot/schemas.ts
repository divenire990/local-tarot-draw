import { z } from "zod";

const spreadIdSchema = z.enum(["single-card", "three-card", "celtic-cross"]);

export const createSessionSchema = z.object({
  spreadId: spreadIdSchema,
  question: z.string().max(500).optional().default(""),
});

export const drawCardSchema = z.object({
  selectedIndex: z.number().int().min(0),
  slot: z.number().int().min(1),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type DrawCardInput = z.infer<typeof drawCardSchema>;
