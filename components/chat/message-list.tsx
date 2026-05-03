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
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";

export type MessageListHandle = {
  scrollToBottom: (animated?: boolean) => void;
};

type MessageListProps = {
  bottomPadding: number;
  bottomSpacerHeight: number;
  messages: UIMessage[];
  onContentHeightChange: (height: number) => void;
  onLayoutHeightChange: (height: number) => void;
  onNearBottomChange: (isNearBottom: boolean) => void;
  onPendingScrollSatisfied?: () => void;
  pendingScrollMessageId: string | null;
  showAssistantPlaceholder: boolean;
};

const NEAR_BOTTOM_THRESHOLD = 96;

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList(
    {
      bottomPadding,
      bottomSpacerHeight,
      messages,
      onContentHeightChange,
      onLayoutHeightChange,
      onNearBottomChange,
      onPendingScrollSatisfied,
      pendingScrollMessageId,
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

    const listFooter = useMemo(
      () => (
        <View style={styles.footer}>
          {showAssistantPlaceholder ? <TypingPlaceholder /> : null}
          {bottomSpacerHeight > 0 ? (
            <View style={{ height: bottomSpacerHeight }} />
          ) : null}
        </View>
      ),
      [showAssistantPlaceholder, bottomSpacerHeight],
    );

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
        ListFooterComponent={listFooter}
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
          onContentHeightChange(height);

          if (pendingScrollMessageId) {
            const targetId = pendingScrollMessageId;
            requestAnimationFrame(() => {
              const idx = messages.findIndex((m) => m.id === targetId);
              if (idx < 0) return;
              listRef.current?.scrollToIndex({
                index: idx,
                viewPosition: 0,
                animated: true,
              });
              onPendingScrollSatisfied?.();
            });
          }
        }}
        onLayout={(event) => {
          layoutHeightRef.current = event.nativeEvent.layout.height;
          onLayoutHeightChange(event.nativeEvent.layout.height);
        }}
        onScroll={handleScroll}
        onScrollToIndexFailed={(info) => {
          const approxOffset = info.averageItemLength * info.index;
          listRef.current?.scrollToOffset({ offset: approxOffset, animated: false });
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              viewPosition: 0,
              animated: true,
            });
          }, 100);
        }}
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  footer: {
    minHeight: 12,
  },
  separator: {
    height: 4,
  },
});
