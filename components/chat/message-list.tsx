import { MessageItem } from "@/components/chat/message-item";
import { TypingPlaceholder } from "@/components/chat/typing-placeholder";
import { UIMessage } from "ai";
import {
  FlatList,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
} from "react-native";
import { forwardRef, useImperativeHandle, useRef } from "react";

export type MessageListHandle = {
  scrollToBottom: (animated?: boolean) => void;
};

type MessageListProps = {
  bottomPadding: number;
  messages: UIMessage[];
  onContentHeightChange: (height: number) => void;
  onLayoutHeightChange: (height: number) => void;
  onNearBottomChange: (isNearBottom: boolean) => void;
  showAssistantPlaceholder: boolean;
};

const NEAR_BOTTOM_THRESHOLD = 96;

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList(
    {
      bottomPadding,
      messages,
      onContentHeightChange,
      onLayoutHeightChange,
      onNearBottomChange,
      showAssistantPlaceholder,
    },
    ref,
  ) {
    const listRef = useRef<FlatList<UIMessage>>(null);
    const contentHeightRef = useRef(0);
    const layoutHeightRef = useRef(0);

    useImperativeHandle(ref, () => ({
      scrollToBottom(animated = true) {
        const offset = Math.max(
          0,
          contentHeightRef.current - layoutHeightRef.current,
        );

        listRef.current?.scrollToOffset({
          animated,
          offset,
        });
      },
    }));

    const handleScroll = (
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);

      onNearBottomChange(distanceFromBottom <= NEAR_BOTTOM_THRESHOLD);
    };

    return (
      <FlatList
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom: bottomPadding,
          },
        ]}
        data={messages}
        ItemSeparatorComponent={Separator}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(message) => message.id}
        ListFooterComponent={
          <View style={styles.footer}>
            {showAssistantPlaceholder ? <TypingPlaceholder /> : null}
          </View>
        }
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
          onContentHeightChange(height);
        }}
        onLayout={(event) => {
          layoutHeightRef.current = event.nativeEvent.layout.height;
          onLayoutHeightChange(event.nativeEvent.layout.height);
        }}
        onScroll={handleScroll}
        ref={listRef}
        renderItem={({ item }) => <MessageItem message={item} />}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
    );
  },
);

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  footer: {
    minHeight: 12,
  },
  separator: {
    height: 4,
  },
});
