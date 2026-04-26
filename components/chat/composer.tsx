import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_INPUT_HEIGHT = 26;
const COMPACT_MAX_INPUT_HEIGHT = 220;
const SOFT_WRAP_POINT = "\u200B";
const SHEET_CLOSE_VELOCITY = 1100;

type ComposerProps = {
  onChangeText: (text: string) => void;
  onStop: () => void;
  onSubmit: () => void;
  placeholder: string;
  status: "submitted" | "streaming" | "ready" | "error";
  value: string;
};

function clampInputHeight(height: number, maxHeight: number) {
  return Math.max(MIN_INPUT_HEIGHT, Math.min(maxHeight, height));
}

function getMeasuredText(value: string) {
  if (!value) {
    return " ";
  }

  const breakableText = value.replace(
    /[^\s\n]/g,
    (character) => `${character}${SOFT_WRAP_POINT}`,
  );

  return value.endsWith("\n") ? `${breakableText} ` : breakableText;
}

export function Composer({
  onChangeText,
  onStop,
  onSubmit,
  placeholder,
  status,
  value,
}: ComposerProps) {
  const compactInputRef = useRef<TextInput>(null);
  const expandedInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [isExpanded, setIsExpanded] = useState(false);
  const sheetTranslateY = useSharedValue(windowHeight);
  const sheetStartY = useSharedValue(0);
  const isGenerating = status === "submitted" || status === "streaming";
  const isDisabled = !isGenerating && value.trim().length === 0;
  const compactMaxInputHeight = Math.min(
    COMPACT_MAX_INPUT_HEIGHT,
    Math.max(140, Math.round(windowHeight * 0.28)),
  );
  const expandedUnderlayTop = Math.max(insets.top + 10, 50);
  const expandedTopOffset = expandedUnderlayTop + 28;
  const expandedUnderlayHeight = windowHeight - expandedUnderlayTop - 28;
  const closeThreshold = windowHeight * 0.38;
  const showExpandButton = inputHeight >= 82 || value.includes("\n\n");
  const measuredText = getMeasuredText(value);

  const finishCloseExpanded = useCallback(() => {
    setIsExpanded(false);
    requestAnimationFrame(() => {
      compactInputRef.current?.focus();
    });
  }, []);

  const handleCloseExpanded = useCallback(() => {
    sheetTranslateY.value = withTiming(windowHeight, { duration: 160 }, (finished) => {
      if (finished) {
        runOnJS(finishCloseExpanded)();
      }
    });
  }, [finishCloseExpanded, sheetTranslateY, windowHeight]);

  useEffect(() => {
    if (!value) {
      setInputHeight(MIN_INPUT_HEIGHT);
    }
  }, [value]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    sheetTranslateY.value = windowHeight;
    sheetTranslateY.value = withSpring(0, {
      damping: 30,
      mass: 0.8,
      stiffness: 320,
    });

    const focusTimeout = setTimeout(() => {
      expandedInputRef.current?.focus();
    }, 40);

    return () => {
      clearTimeout(focusTimeout);
    };
  }, [isExpanded, sheetTranslateY, windowHeight]);

  const handleOpenExpanded = () => {
    setIsExpanded(true);
  };

  const handleActionPress = () => {
    if (isGenerating) {
      onStop();
      return;
    }

    if (isDisabled) {
      return;
    }

    setIsExpanded(false);
    onSubmit();
  };

  const renderActionButton = () => (
    <Pressable
      accessibilityLabel={isGenerating ? "Stop response" : "Send message"}
      disabled={isDisabled}
      onPress={handleActionPress}
      style={({ pressed }) => [
        styles.actionButton,
        isDisabled ? styles.actionButtonDisabled : styles.actionButtonActive,
        pressed && !isDisabled ? styles.actionButtonPressed : null,
      ]}
    >
      {isGenerating ? (
        <View style={styles.stopGlyph} />
      ) : (
        <Feather
          color={isDisabled ? "#B6B6B6" : CHAT_COLORS.surface}
          name="arrow-up"
          size={23}
        />
      )}
    </Pressable>
  );

  const expandedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const expandedUnderlayStyle = useAnimatedStyle(() => {
    const dragProgress = Math.min(
      1,
      Math.max(0, sheetTranslateY.value / closeThreshold),
    );

    return {
      opacity: 0.92 - dragProgress * 0.12,
      transform: [
        { translateY: -10 + dragProgress * 22 },
        { scale: 0.94 + dragProgress * 0.02 },
      ],
    };
  });

  const expandedPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .onBegin(() => {
          sheetStartY.value = sheetTranslateY.value;
        })
        .onUpdate((event) => {
          const nextTranslateY = sheetStartY.value + event.translationY;

          sheetTranslateY.value = Math.min(
            windowHeight,
            Math.max(-18, nextTranslateY),
          );
        })
        .onEnd((event) => {
          const shouldClose =
            event.velocityY > SHEET_CLOSE_VELOCITY ||
            sheetTranslateY.value > closeThreshold;

          if (shouldClose) {
            sheetTranslateY.value = withTiming(
              windowHeight,
              { duration: 160 },
              (finished) => {
                if (finished) {
                  runOnJS(finishCloseExpanded)();
                }
              },
            );
            return;
          }

          sheetTranslateY.value = withSpring(0, {
            damping: 30,
            mass: 0.85,
            stiffness: 320,
          });
        }),
    [
      closeThreshold,
      finishCloseExpanded,
      sheetStartY,
      sheetTranslateY,
      windowHeight,
    ],
  );

  return (
    <>
      <View style={styles.compactRow}>
        <View style={styles.compactSurface}>
          <View style={styles.compactInputRegion}>
            <Text
              lineBreakStrategyIOS="none"
              onLayout={(event) => {
                const nextHeight = clampInputHeight(
                  Math.ceil(event.nativeEvent.layout.height),
                  compactMaxInputHeight,
                );

                setInputHeight((currentHeight) =>
                  currentHeight === nextHeight ? currentHeight : nextHeight,
                );
              }}
              pointerEvents="none"
              style={[styles.inputText, styles.measureText]}
              textBreakStrategy="simple"
            >
              {measuredText}
            </Text>

            <TextInput
              autoCapitalize="sentences"
              autoCorrect={true}
              lineBreakModeIOS="char"
              lineBreakStrategyIOS="none"
              multiline={true}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={CHAT_COLORS.placeholder}
              ref={compactInputRef}
              scrollEnabled={inputHeight >= compactMaxInputHeight}
              selectionColor={CHAT_COLORS.accent}
              style={[styles.inputText, styles.input, { height: inputHeight }]}
              submitBehavior="newline"
              textBreakStrategy="simple"
              textAlignVertical="top"
              value={value}
            />
          </View>

          {showExpandButton ? (
            <Pressable
              accessibilityLabel="Expand composer"
              hitSlop={12}
              onPress={handleOpenExpanded}
              style={styles.expandButton}
            >
              <Feather
                color={CHAT_COLORS.textSecondary}
                name="maximize-2"
                size={18}
              />
            </Pressable>
          ) : null}

          <View style={styles.compactAction}>{renderActionButton()}</View>
        </View>
      </View>

      <Modal
        animationType="none"
        onRequestClose={handleCloseExpanded}
        presentationStyle="overFullScreen"
        transparent={true}
        visible={isExpanded}
      >
        <StatusBar backgroundColor="#000000" style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.expandedKeyboard}
        >
          <View style={styles.expandedBackdrop}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.expandedUnderlay,
                {
                  height: expandedUnderlayHeight,
                  top: expandedUnderlayTop,
                },
                expandedUnderlayStyle,
              ]}
            >
              <View style={styles.expandedUnderlayHeader}>
                <Feather
                  color={CHAT_COLORS.textPrimary}
                  name="menu"
                  size={24}
                />
                <Text numberOfLines={1} style={styles.expandedUnderlayTitle}>
                  HybridHeroesGPT
                </Text>
              </View>
            </Animated.View>

            <GestureDetector gesture={expandedPanGesture}>
              <Animated.View
                style={[
                  styles.expandedSheet,
                  {
                    marginTop: expandedTopOffset,
                  },
                  expandedSheetStyle,
                ]}
              >
                <Pressable
                  accessibilityLabel="Collapse composer"
                  hitSlop={12}
                  onPress={handleCloseExpanded}
                  style={styles.collapseButton}
                >
                  <Feather
                    color={CHAT_COLORS.textPrimary}
                    name="minimize-2"
                    size={20}
                  />
                </Pressable>

                <TextInput
                  autoCapitalize="sentences"
                  autoCorrect={true}
                  lineBreakModeIOS="char"
                  lineBreakStrategyIOS="none"
                  multiline={true}
                  onChangeText={onChangeText}
                  placeholder={placeholder}
                  placeholderTextColor={CHAT_COLORS.placeholder}
                  ref={expandedInputRef}
                  scrollEnabled={true}
                  selectionColor={CHAT_COLORS.accent}
                  style={[styles.inputText, styles.expandedInput]}
                  submitBehavior="newline"
                  textBreakStrategy="simple"
                  textAlignVertical="top"
                  value={value}
                />

                <View style={styles.expandedAction}>{renderActionButton()}</View>
              </Animated.View>
            </GestureDetector>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  compactRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    width: "100%",
  },
  compactSurface: {
    backgroundColor: CHAT_COLORS.surfaceMuted,
    borderRadius: 32,
    flex: 1,
    minHeight: 64,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 68,
    paddingTop: 14,
    position: "relative",
    shadowColor: CHAT_COLORS.shadow,
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  compactInputRegion: {
    justifyContent: "flex-start",
    maxWidth: "100%",
    minHeight: MIN_INPUT_HEIGHT,
    position: "relative",
    width: "100%",
  },
  inputText: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.regular,
    fontSize: 18,
    letterSpacing: -0.35,
    lineHeight: 26,
    padding: 0,
    paddingBottom: 0,
    width: "100%",
  },
  input: {
    maxHeight: COMPACT_MAX_INPUT_HEIGHT,
  },
  measureText: {
    left: 0,
    opacity: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: -1,
  },
  expandButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    top: 13,
    width: 34,
  },
  compactAction: {
    bottom: 10,
    position: "absolute",
    right: 10,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionButtonActive: {
    backgroundColor: CHAT_COLORS.textPrimary,
  },
  actionButtonDisabled: {
    backgroundColor: "#F2F2F2",
  },
  actionButtonPressed: {
    opacity: 0.82,
  },
  stopGlyph: {
    backgroundColor: CHAT_COLORS.surface,
    borderRadius: 4,
    height: 14,
    width: 14,
  },
  expandedKeyboard: {
    flex: 1,
  },
  expandedBackdrop: {
    backgroundColor: "#000000",
    flex: 1,
    justifyContent: "flex-end",
  },
  expandedUnderlay: {
    backgroundColor: "#ECECEC",
    borderRadius: 28,
    left: 28,
    overflow: "hidden",
    position: "absolute",
    right: 28,
  },
  expandedUnderlayHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 32,
    paddingTop: 44,
  },
  expandedUnderlayTitle: {
    color: CHAT_COLORS.textPrimary,
    flex: 1,
    fontFamily: CHAT_FONTS.medium,
    fontSize: 19,
    lineHeight: 26,
  },
  expandedSheet: {
    backgroundColor: CHAT_COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flex: 1,
    paddingBottom: 24,
    paddingHorizontal: 36,
    paddingTop: 64,
    position: "relative",
  },
  collapseButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 32,
    top: 28,
    width: 44,
    zIndex: 2,
  },
  expandedInput: {
    flex: 1,
    fontSize: 21,
    lineHeight: 30,
    paddingBottom: 88,
  },
  expandedAction: {
    bottom: 26,
    position: "absolute",
    right: 36,
  },
});
