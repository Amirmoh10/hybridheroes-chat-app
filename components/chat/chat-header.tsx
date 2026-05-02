import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ChatHeaderProps = {
  onPressModel: () => void;
  topInset: number;
};

export function ChatHeader({ onPressModel, topInset }: ChatHeaderProps) {
  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }]}>
      <View style={styles.toolbar}>
        <View
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
          pointerEvents="none"
          style={styles.sideSlot}
        />

        <Pressable
          accessibilityLabel="Choose model"
          onPress={onPressModel}
          style={({ pressed }) => [
            styles.titleButton,
            pressed ? styles.titleButtonPressed : null,
          ]}
        >
          <Text numberOfLines={1} style={styles.title}>
            HybridHeroesGPT
          </Text>
          <Feather color={CHAT_COLORS.textSecondary} name="chevron-right" size={17} />
        </Pressable>

        <View style={styles.sideSlot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: CHAT_COLORS.background,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
  },
  sideSlot: {
    alignItems: "flex-start",
    justifyContent: "center",
    width: 48,
  },
  titleButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    minWidth: 0,
  },
  titleButtonPressed: {
    opacity: 0.72,
  },
  title: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.bold,
    fontSize: 16,
    lineHeight: 24,
  },
});
