import {
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
} from "@/components/chat/models";
import { convertToModelMessages, streamText, UIMessage } from "ai";

export async function POST(req: Request) {
  const {
    messages,
    model,
  }: {
    messages: UIMessage[];
    model?: unknown;
  } = await req.json();
  const selectedModel = isChatModelId(model) ? model : DEFAULT_CHAT_MODEL_ID;

  const result = streamText({
    model: selectedModel,
    messages: await convertToModelMessages(messages),
    system:
      "You are HybridHeroesGPT, a concise and helpful chat assistant. Keep responses clear, conversational, and useful.",
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
