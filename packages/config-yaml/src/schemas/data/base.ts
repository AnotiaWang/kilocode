import { z } from "zod";

export const baseSchema = z.object({
  userId: z.string(),
});
