import { autocompleteEventAllSchema } from "./index.js";

export const autocompleteEventSchema_0_2_0 = autocompleteEventAllSchema.pick({
  // base
  createdAt: true,
  userId: true,
  userAgent: true,
  selectedProfileId: true,
  eventName: true,
  schemaVersion: true,

  // autocomplete-specific
  disable: true,
  useFileSuffix: true,
  maxPromptTokens: true,
  debounceDelay: true,
  maxSuffixPercentage: true,
  prefixPercentage: true,
  transform: true,
  template: true,
  multilineCompletions: true,
  slidingWindowPrefixPercentage: true,
  slidingWindowSize: true,
  useCache: true,
  onlyMyCode: true,
  useRecentlyEdited: true,
  disableInFiles: true,
  useImports: true,
  accepted: true,
  time: true,
  prefix: true,
  suffix: true,
  prompt: true,
  completion: true,
  modelProvider: true,
  modelName: true,
  completionOptions: true,
  cacheHit: true,
  filepath: true,
  gitRepo: true,
  completionId: true,
  uniqueId: true,
  timestamp: true,
});

export const autocompleteEventSchema_0_2_0_noPII =
  autocompleteEventSchema_0_2_0.omit({
    prefix: true,
    suffix: true,
    prompt: true,
    completion: true,
  });
