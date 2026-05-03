import { Composer } from "@/components/chat/composer";
import { ChatHeader } from "@/components/chat/chat-header";
import {
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
} from "@/components/chat/models";
import { ModelPicker } from "@/components/chat/model-picker";
import { MessageList, MessageListHandle } from "@/components/chat/message-list";
import { hasRenderableText } from "@/components/chat/message-utils";
import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { generateAPIUrl } from "@/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardEventName,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_COMPOSER_HEIGHT = 118;
const LIST_BOTTOM_PADDING = 24;
const ARROW_DOWN_ICON = require("../../assets/images/arrow-down.png");

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const [contentHeight, setContentHeight] = useState(0);
  const [input, setInput] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isModelPickerVisible, setIsModelPickerVisible] = useState(false);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_CHAT_MODEL_ID);
  const [pinnedUserMessageId, setPinnedUserMessageId] = useState<string | null>(null);
  const [activeScrollRequestId, setActiveScrollRequestId] = useState<string | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);
  const isNearBottomRef = useRef(true);
  const pendingSendRef = useRef(false);

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

  const latestUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].id;
    }
    return null;
  }, [messages]);

  const isPinActive =
    pinnedUserMessageId != null && pinnedUserMessageId === latestUserMessageId;

  const bottomSpacerHeight = isPinActive && layoutHeight > 0 ? layoutHeight : 0;

  const realContentHeight = contentHeight - bottomSpacerHeight;
  const showScrollToBottom =
    realContentHeight > layoutHeight + 16 && !isNearBottom;
  const composerBottomInset = isKeyboardVisible
    ? 0
    : Math.max(insets.bottom, 12);
  const composerKeyboardOffset = Platform.OS === "ios" ? keyboardHeight : 0;
  const selectedModel = getChatModel(selectedModelId);
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
    pendingSendRef.current = true;

    void sendMessage(
      { text: nextMessage },
      {
        body: {
          model: selectedModelId,
        },
      },
    );
  };

  const handleStop = () => {
    stop();
  };

  // Convert pending-send into a pin once the new user message lands in state.
  // messages is stale inside handleSend, so we pick up the new id here.
  useEffect(() => {
    if (!pendingSendRef.current) return;
    if (latestUserMessageId == null) return;
    if (latestUserMessageId === pinnedUserMessageId) return;

    pendingSendRef.current = false;
    setPinnedUserMessageId(latestUserMessageId);
    setActiveScrollRequestId(latestUserMessageId);
  }, [latestUserMessageId, pinnedUserMessageId]);

  // When idle and near bottom, keep the list scrolled to the bottom as the
  // composer grows (multi-line input) or shrinks.
  useEffect(() => {
    if (isGenerating) return;
    if (!isNearBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom(false));
  }, [composerHeight, isGenerating]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(keyboardShowEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(keyboardHideEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHideEvent, keyboardShowEvent]);

  return (
    <View style={styles.screen}>
      <ChatHeader
        onPressModel={() => {
          setIsModelPickerVisible(true);
        }}
        topInset={insets.top}
      />

      <View style={styles.listArea}>
        <MessageList
          bottomPadding={composerHeight + LIST_BOTTOM_PADDING}
          bottomSpacerHeight={bottomSpacerHeight}
          messages={messages as UIMessage[]}
          onContentHeightChange={setContentHeight}
          onLayoutHeightChange={setLayoutHeight}
          onNearBottomChange={handleNearBottomChange}
          onPendingScrollSatisfied={() => setActiveScrollRequestId(null)}
          pendingScrollMessageId={activeScrollRequestId}
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
            bottom: composerKeyboardOffset,
          },
        ]}
      >
        {error ? <Text style={styles.errorText}>{error.message}</Text> : null}

        <Composer
          bottomInset={composerBottomInset}
          keyboardHeight={keyboardHeight}
          modelLabel={selectedModel.shortLabel}
          onChangeText={handleInputChange}
          onModelPress={() => {
            setIsModelPickerVisible(true);
          }}
          onStop={handleStop}
          onSubmit={handleSend}
          placeholder="Message HybridHeroesGPT"
          status={status}
          topInset={insets.top}
          value={input}
        />
      </View>

      {showScrollToBottom ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.scrollButtonFrame,
            { bottom: composerKeyboardOffset + composerHeight + 18 },
          ]}
        >
          <Pressable
            accessibilityLabel="Scroll to latest message"
            onPress={() => {
              // Collapse spacer first, then scroll — otherwise scrollToBottom
              // lands inside the empty spacer instead of at the assistant tail.
              setPinnedUserMessageId(null);
              setActiveScrollRequestId(null);
              handleNearBottomChange(true);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => scrollToBottom(true));
              });
            }}
            style={({ pressed }) => [
              styles.scrollButton,
              pressed ? styles.scrollButtonPressed : null,
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors={true}
              resizeMode="contain"
              source={ARROW_DOWN_ICON}
              style={styles.scrollIcon}
            />
          </Pressable>
        </View>
      ) : null}

      <ModelPicker
        onClose={() => {
          setIsModelPickerVisible(false);
        }}
        onSelect={setSelectedModelId}
        selectedModelId={selectedModelId}
        visible={isModelPickerVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    left: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  errorText: {
    color: CHAT_COLORS.error,
    fontFamily: CHAT_FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  scrollButtonFrame: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 10,
  },
  scrollButton: {
    alignItems: "center",
    backgroundColor: CHAT_COLORS.surface,
    borderColor: CHAT_COLORS.border,
    borderRadius: 100,
    borderWidth: 1,
    elevation: 6,
    justifyContent: "center",
    padding: 8.5,
    shadowColor: CHAT_COLORS.shadow,
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  scrollButtonPressed: {
    opacity: 0.76,
  },
  scrollIcon: {
    height: 18,
    tintColor: CHAT_COLORS.textPrimary,
    width: 18,
  },
});
