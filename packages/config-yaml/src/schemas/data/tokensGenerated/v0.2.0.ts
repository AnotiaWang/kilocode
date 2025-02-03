import { tokensGeneratedEventAllSchema } from "./index.js";

export const tokensGeneratedEventSchema_0_2_0 =
  tokensGeneratedEventAllSchema.pick({
    // base
    createdAt: true,
    userId: true,
    userAgent: true,
    selectedProfileId: true,
    eventName: true,
    schemaVersion: true,

    // tokens generated specific
    model: true,
    provider: true,
    promptTokens: true,
    generatedTokens: true,
  });

export const tokensGeneratedEventSchema_0_2_0_noPII =
  tokensGeneratedEventSchema_0_2_0;
