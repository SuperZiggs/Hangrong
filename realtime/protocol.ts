import {z} from 'zod';
export const inputSchema=z.object({runId:z.string().min(1).max(80),seq:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),moveX:z.union([z.literal(-1),z.literal(0),z.literal(1)]),moveY:z.union([z.literal(-1),z.literal(0),z.literal(1)]),interactPressed:z.boolean(),dashPressed:z.boolean(),abandonHeld:z.boolean()}).strict();
