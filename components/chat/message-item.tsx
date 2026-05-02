import { MarkdownText } from "@/components/chat/markdown";
import { getMessageText, hasRenderableText } from "@/components/chat/message-utils";
import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { UIMessage } from "ai";
import { StyleSheet, Text, View } from "react-native";

type MessageItemProps = {
  message: UIMessage;
};

export function MessageItem({ message }: MessageItemProps) {
  if (message.role === "user") {
    const text = getMessageText(message).trim();

    if (!text) {
      return null;
    }

    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{text}</Text>
        </View>
      </View>
    );
  }

  if (message.role === "assistant") {
    if (!hasRenderableText(message)) {
      return null;
    }

    return (
      <View style={styles.assistantRow}>
        <MarkdownText text={getMessageText(message)} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  assistantRow: {
    alignSelf: "stretch",
    paddingVertical: 8,
    width: "100%",
  },
  userRow: {
    alignItems: "flex-end",
    paddingVertical: 4,
    width: "100%",
  },
  userBubble: {
    backgroundColor: CHAT_COLORS.surfaceMuted,
    borderRadius: 100,
    maxWidth: "86%",
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  userText: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.regular,
    fontSize: 16,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
});
