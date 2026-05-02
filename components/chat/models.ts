export const CHAT_MODELS = [
  {
    description: "Best general-purpose responses",
    id: "openai/gpt-5.3-chat",
    label: "GPT-5.3 Chat",
    shortLabel: "5.3 Chat",
  },
  {
    description: "Balanced speed and capability",
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    shortLabel: "5.4 Mini",
  },
  {
    description: "Fastest, lowest-cost option",
    id: "openai/gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    shortLabel: "5.4 Nano",
  },
  {
    description: "Highest capability option",
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    shortLabel: "5.4",
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "openai/gpt-5.3-chat";

export function isChatModelId(value: unknown): value is ChatModelId {
  return (
    typeof value === "string" &&
    CHAT_MODELS.some((model) => model.id === value)
  );
}

export function getChatModel(modelId: ChatModelId) {
  return (
    CHAT_MODELS.find((model) => model.id === modelId) ?? CHAT_MODELS[0]
  );
}
