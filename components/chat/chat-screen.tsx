import { Composer } from "@/components/chat/composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { MessageList, MessageListHandle } from "@/components/chat/message-list";
import { hasRenderableText } from "@/components/chat/message-utils";
import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { generateAPIUrl } from "@/utils";
import { useChat } from "@ai-sdk/react";
import { Feather } from "@expo/vector-icons";
import { DefaultChatTransport, UIMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardEventName,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_COMPOSER_HEIGHT = 118;
const LIST_BOTTOM_PADDING = 24;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const [contentHeight, setContentHeight] = useState(0);
  const [input, setInput] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const messageListRef = useRef<MessageListHandle>(null);
  const isNearBottomRef = useRef(true);

  const { clearError, error, messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
    }),
    onError: (chatError) => console.error(chatError, "chat-ui-error"),
  });

  const isGenerating = status === "submitted" || status === "streaming";
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const showAssistantPlaceholder =
    isGenerating &&
    (!lastAssistantMessage || !hasRenderableText(lastAssistantMessage));
  const showScrollToBottom =
    contentHeight > layoutHeight + 16 && !isNearBottom;
  const composerBottomPadding = isKeyboardVisible
    ? 8
    : Math.max(insets.bottom, 12);
  const keyboardShowEvent: KeyboardEventName =
    Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
  const keyboardHideEvent: KeyboardEventName =
    Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

  const scrollToBottom = (animated = true) => {
    messageListRef.current?.scrollToBottom(animated);
  };

  const handleNearBottomChange = (nextIsNearBottom: boolean) => {
    isNearBottomRef.current = nextIsNearBottom;
    setIsNearBottom(nextIsNearBottom);
  };

  const handleInputChange = (nextValue: string) => {
    if (error) {
      clearError();
    }

    setInput(nextValue);
  };

  const handleSend = () => {
    const nextMessage = input.trim();

    if (!nextMessage) {
      return;
    }

    if (error) {
      clearError();
    }

    setInput("");
    handleNearBottomChange(true);
    void sendMessage({ text: nextMessage });
    requestAnimationFrame(() => {
      scrollToBottom(true);
    });
  };

  const handleStop = () => {
    stop();
    requestAnimationFrame(() => {
      scrollToBottom(true);
    });
  };

  useEffect(() => {
    if (!messages.length && !showAssistantPlaceholder) {
      return;
    }

    if (!isNearBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToBottom(status !== "streaming");
    });
  }, [messages, showAssistantPlaceholder, status]);

  useEffect(() => {
    if (!isNearBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToBottom(false);
    });
  }, [composerHeight]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(keyboardShowEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(keyboardHideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHideEvent, keyboardShowEvent]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardAvoiding}
    >
      <View style={styles.screen}>
        <ChatHeader topInset={insets.top} />

        <View style={styles.listArea}>
          <MessageList
            bottomPadding={LIST_BOTTOM_PADDING}
            messages={messages as UIMessage[]}
            onContentHeightChange={setContentHeight}
            onLayoutHeightChange={setLayoutHeight}
            onNearBottomChange={handleNearBottomChange}
            ref={messageListRef}
            showAssistantPlaceholder={showAssistantPlaceholder}
          />
        </View>

        <View
          onLayout={(event) => {
            setComposerHeight(event.nativeEvent.layout.height);
          }}
          style={[
            styles.composerLayer,
            {
              paddingBottom: composerBottomPadding,
            },
          ]}
        >
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}

          <Composer
            onChangeText={handleInputChange}
            onStop={handleStop}
            onSubmit={handleSend}
            placeholder="Message HybridHeroesGPT"
            status={status}
            value={input}
          />
        </View>

        {showScrollToBottom ? (
          <Pressable
            accessibilityLabel="Scroll to latest message"
            onPress={() => {
              handleNearBottomChange(true);
              requestAnimationFrame(() => {
                scrollToBottom(true);
              });
            }}
            style={[
              styles.scrollButton,
              { bottom: composerHeight + 18 },
            ]}
          >
            <Feather color={CHAT_COLORS.textPrimary} name="arrow-down" size={24} />
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  screen: {
    backgroundColor: CHAT_COLORS.background,
    flex: 1,
    position: "relative",
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  composerLayer: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorText: {
    color: CHAT_COLORS.error,
    fontFamily: CHAT_FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  scrollButton: {
    alignItems: "center",
    backgroundColor: CHAT_COLORS.surface,
    borderColor: CHAT_COLORS.border,
    borderRadius: 26,
    borderWidth: 1,
    elevation: 6,
    height: 52,
    justifyContent: "center",
    left: "50%",
    marginLeft: -26,
    position: "absolute",
    shadowColor: CHAT_COLORS.shadow,
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 52,
    zIndex: 10,
  },
});
