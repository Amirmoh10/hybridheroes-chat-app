import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { StyleSheet, Text, View } from "react-native";

type ChatHeaderProps = {
  topInset: number;
};

export function ChatHeader({ topInset }: ChatHeaderProps) {
  return (
    <View style={[styles.container, { paddingTop: topInset + 10 }]}>
      <Text numberOfLines={1} style={styles.title}>
        HybridHeroesGPT
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: CHAT_COLORS.background,
    justifyContent: "center",
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  title: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
});
