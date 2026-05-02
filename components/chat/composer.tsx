import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from "react-native";

const ARROW_UP_ICON = require("../../assets/images/arrow-up.png");
const EXPAND_ICON = require("../../assets/images/expand.png");
const RECTANGLE_ICON = require("../../assets/images/rectangle.png");
const SHRINK_ICON = require("../../assets/images/shrink.png");

const MIN_INPUT_HEIGHT = 22;
const COMPACT_MAX_INPUT_HEIGHT = 198;
const COMPACT_VERTICAL_CHROME_HEIGHT = 92;
const EXPANDED_TOP_GAP = 8;
const RIGHT_RAIL_WIDTH = 40;
const RESIZE_BUTTON_VISIBLE_HEIGHT = 68;
const SOFT_WRAP_POINT = "\u200B";
const COMPOSER_ANIMATION_DURATION = 260;

type ComposerProps = {
  bottomInset: number;
  keyboardHeight: number;
  modelLabel: string;
  onChangeText: (text: string) => void;
  onModelPress: () => void;
  onStop: () => void;
  onSubmit: () => void;
  placeholder: string;
  status: "submitted" | "streaming" | "ready" | "error";
  topInset: number;
  value: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function withSoftWrapPoints(value: string) {
  return value.replace(/[^\s\n]{12,}/g, (word) =>
    word
      .split("")
      .map((character) => `${character}${SOFT_WRAP_POINT}`)
      .join(""),
  );
}

function getMeasuredText(value: string) {
  if (!value) {
    return " ";
  }

  const measuredValue = withSoftWrapPoints(value);

  return value.endsWith("\n") ? `${measuredValue} ` : measuredValue;
}

function IconImage({
  source,
  style,
}: {
  source: ImageSourcePropType;
  style: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors={true}
      resizeMode="contain"
      source={source}
      style={style}
    />
  );
}

export function Composer({
  bottomInset,
  keyboardHeight,
  modelLabel,
  onChangeText,
  onModelPress,
  onStop,
  onSubmit,
  placeholder,
  status,
  topInset,
  value,
}: ComposerProps) {
  const inputRef = useRef<TextInput>(null);
  const animatedSheetHeight = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(MIN_INPUT_HEIGHT);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [isHeightAnimated, setIsHeightAnimated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isGenerating = status === "submitted" || status === "streaming";
  const hasText = value.trim().length > 0;
  const compactMaxInputHeight = Math.min(
    COMPACT_MAX_INPUT_HEIGHT,
    Math.max(150, Math.round(windowHeight * 0.32)),
  );
  const compactSheetHeight =
    COMPACT_VERTICAL_CHROME_HEIGHT + bottomInset + inputHeight;
  const expandedHeight = Math.max(
    compactSheetHeight,
    windowHeight - keyboardHeight - topInset - EXPANDED_TOP_GAP,
  );
  const showResizeButton =
    isExpanded ||
    value.includes("\n") ||
    contentHeight >= RESIZE_BUTTON_VISIBLE_HEIGHT;
  const isCompactScrollable =
    !isExpanded && contentHeight > compactMaxInputHeight + 1;
  const measuredText = getMeasuredText(value);
  const sheetHeightStyle = isHeightAnimated
    ? { height: animatedSheetHeight }
    : isExpanded
      ? { height: expandedHeight }
      : null;

  useEffect(() => {
    if (!value) {
      animatedSheetHeight.stopAnimation();
      animatedSheetHeight.setValue(0);
      setContentHeight(MIN_INPUT_HEIGHT);
      setInputHeight(MIN_INPUT_HEIGHT);
      setIsHeightAnimated(false);

      if (isExpanded) {
        setIsExpanded(false);
      }
    }
  }, [animatedSheetHeight, isExpanded, value]);

  const handleMeasuredHeight = (height: number) => {
    const nextContentHeight = Math.ceil(height);
    const nextHeight = clamp(
      nextContentHeight,
      MIN_INPUT_HEIGHT,
      compactMaxInputHeight,
    );

    if (nextContentHeight !== contentHeight) {
      setContentHeight(nextContentHeight);
    }

    if (nextHeight !== inputHeight) {
      setInputHeight(nextHeight);
    }
  };

  const animateSheetTo = (height: number, onEnd?: () => void) => {
    animatedSheetHeight.stopAnimation();
    Animated.timing(animatedSheetHeight, {
      duration: COMPOSER_ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      toValue: height,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onEnd?.();
      }
    });
  };

  const handleOpenExpanded = () => {
    if (!showResizeButton) {
      return;
    }

    animatedSheetHeight.stopAnimation();
    animatedSheetHeight.setValue(compactSheetHeight);
    setIsHeightAnimated(true);
    setIsExpanded(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      animateSheetTo(expandedHeight, () => {
        setIsHeightAnimated(false);
      });
    });
  };

  const handleCloseExpanded = () => {
    animatedSheetHeight.stopAnimation();
    animatedSheetHeight.setValue(expandedHeight);
    setIsHeightAnimated(true);
    setIsExpanded(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      animateSheetTo(compactSheetHeight, () => {
        setIsHeightAnimated(false);
      });
    });
  };

  const handleActionPress = () => {
    if (isGenerating) {
      onStop();
      return;
    }

    if (!hasText) {
      return;
    }

    if (isExpanded) {
      animatedSheetHeight.stopAnimation();
      animatedSheetHeight.setValue(expandedHeight);
      setIsHeightAnimated(true);
      setIsExpanded(false);
      animateSheetTo(compactSheetHeight, () => {
        setIsHeightAnimated(false);
      });
    }

    onSubmit();
  };

  const renderActionButton = () => {
    const isDisabled = !hasText && !isGenerating;

    return (
      <Pressable
        accessibilityLabel={isGenerating ? "Stop response" : "Send message"}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        onPress={handleActionPress}
        style={({ pressed }) => [
          styles.actionButton,
          isDisabled ? styles.actionButtonDisabled : null,
          pressed && !isDisabled ? styles.actionButtonPressed : null,
        ]}
      >
        <IconImage
          source={isGenerating ? RECTANGLE_ICON : ARROW_UP_ICON}
          style={[
            styles.actionIcon,
            isDisabled ? styles.actionIconDisabled : null,
          ]}
        />
      </Pressable>
    );
  };

  return (
    <Animated.View
      style={[
        styles.sheet,
        isExpanded ? styles.sheetExpanded : null,
        isHeightAnimated ? styles.sheetAnimating : null,
        sheetHeightStyle,
        { paddingBottom: 12 + bottomInset },
      ]}
    >
      <View
        style={[
          styles.inputShell,
          isExpanded ? styles.inputShellExpanded : null,
        ]}
      >
        <View
          style={[
            styles.inputRegion,
            isExpanded ? styles.inputRegionExpanded : null,
          ]}
        >
          {!isExpanded ? (
            <Text
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
              onLayout={(event) => {
                handleMeasuredHeight(event.nativeEvent.layout.height);
              }}
              pointerEvents="none"
              style={[styles.inputText, styles.measureText]}
            >
              {measuredText}
            </Text>
          ) : null}

          <TextInput
            autoCorrect={true}
            lineBreakModeIOS="char"
            lineBreakStrategyIOS="none"
            multiline={true}
            onChangeText={onChangeText}
            onContentSizeChange={(event) => {
              if (isExpanded) {
                setContentHeight(
                  Math.ceil(event.nativeEvent.contentSize.height),
                );
              }
            }}
            placeholder={placeholder}
            placeholderTextColor={CHAT_COLORS.placeholder}
            ref={inputRef}
            scrollEnabled={isExpanded || isCompactScrollable}
            selectionColor={CHAT_COLORS.accent}
            spellCheck={true}
            style={[
              styles.inputText,
              styles.input,
              isExpanded ? styles.inputExpanded : null,
              {
                height: isExpanded ? "100%" : inputHeight,
                maxHeight: isExpanded ? undefined : compactMaxInputHeight,
              },
            ]}
            submitBehavior="newline"
            textBreakStrategy="simple"
            textAlignVertical="top"
            value={value}
          />
        </View>

        <View pointerEvents="box-none" style={styles.rightRail}>
          {showResizeButton ? (
            <Pressable
              accessibilityLabel={
                isExpanded ? "Collapse input" : "Expand input"
              }
              onPress={isExpanded ? handleCloseExpanded : handleOpenExpanded}
              style={({ pressed }) => [
                styles.resizeButton,
                pressed ? styles.resizeButtonPressed : null,
              ]}
            >
              <IconImage
                source={isExpanded ? SHRINK_ICON : EXPAND_ICON}
                style={styles.resizeIcon}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityLabel="Choose model"
          onPress={onModelPress}
          style={({ pressed }) => [
            styles.modelChip,
            pressed ? styles.modelChipPressed : null,
          ]}
        >
          <Text numberOfLines={1} style={styles.modelLabel}>
            {modelLabel}
          </Text>
          <Feather
            color={CHAT_COLORS.textSecondary}
            name="chevron-down"
            size={20}
          />
        </Pressable>

        <View style={styles.actionsSpacer} />

        {renderActionButton()}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: CHAT_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 12,
    gap: 16,
    paddingHorizontal: 12,
    paddingTop: 16,
    shadowColor: CHAT_COLORS.shadow,
    shadowOffset: {
      height: -4,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  sheetExpanded: {
    minHeight: 0,
  },
  sheetAnimating: {
    overflow: "hidden",
  },
  inputShell: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    flexDirection: "row",
    position: "relative",
  },
  inputShellExpanded: {
    flex: 1,
    minHeight: 0,
  },
  inputRegion: {
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  inputRegionExpanded: {
    alignSelf: "stretch",
  },
  inputText: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    alignSelf: "stretch",
    minHeight: MIN_INPUT_HEIGHT,
    paddingBottom: 0,
    paddingLeft: 8,
    paddingRight: RIGHT_RAIL_WIDTH,
    paddingTop: 0,
    width: "100%",
  },
  inputExpanded: {
    flex: 1,
    minHeight: 0,
  },
  measureText: {
    left: 0,
    opacity: 0,
    paddingLeft: 8,
    paddingRight: RIGHT_RAIL_WIDTH,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: -1,
  },
  rightRail: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: RIGHT_RAIL_WIDTH,
    zIndex: 1,
  },
  resizeButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    top: -4,
    width: 32,
  },
  resizeButtonPressed: {
    opacity: 0.68,
  },
  resizeIcon: {
    height: 24,
    tintColor: "#8A898E",
    width: 24,
  },
  actionsRow: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 12,
    minHeight: 48,
  },
  modelChip: {
    alignItems: "center",
    borderColor: CHAT_COLORS.border,
    borderRadius: 100,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 14,
  },
  modelChipPressed: {
    opacity: 0.72,
  },
  modelLabel: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  actionsSpacer: {
    flex: 1,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: CHAT_COLORS.textPrimary,
    borderColor: CHAT_COLORS.textPrimary,
    borderRadius: 100,
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    padding: 7,
  },
  actionButtonDisabled: {
    backgroundColor: CHAT_COLORS.surfaceMuted,
    borderColor: CHAT_COLORS.surfaceMuted,
  },
  actionButtonPressed: {
    opacity: 0.76,
  },
  actionIcon: {
    height: 18,
    tintColor: CHAT_COLORS.surface,
    width: 18,
  },
  actionIconDisabled: {
    tintColor: "#B8B8B8",
  },
});
