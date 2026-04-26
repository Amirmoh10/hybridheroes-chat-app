import { UIMessage } from "ai";

export function getMessageText(message: UIMessage) {
  return message.parts.reduce((text, part) => {
    if (part.type === "text") {
      return text + part.text;
    }

    return text;
  }, "");
}

export function hasRenderableText(message: UIMessage) {
  return getMessageText(message).trim().length > 0;
}
