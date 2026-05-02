import { ChatModelId, CHAT_MODELS } from "@/components/chat/models";
import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModelPickerProps = {
  onClose: () => void;
  onSelect: (modelId: ChatModelId) => void;
  selectedModelId: ChatModelId;
  visible: boolean;
};

export function ModelPicker({
  onClose,
  onSelect,
  selectedModelId,
  visible,
}: ModelPickerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent={true}
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close model selector"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityLabel="Model selector"
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <Text style={styles.title}>Choose model</Text>

          <View style={styles.options}>
            {CHAT_MODELS.map((model) => {
              const isSelected = model.id === selectedModelId;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={model.id}
                  onPress={() => {
                    onSelect(model.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected ? styles.optionSelected : null,
                    pressed ? styles.optionPressed : null,
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{model.label}</Text>
                    <Text style={styles.optionDescription}>
                      {model.description}
                    </Text>
                  </View>

                  {isSelected ? (
                    <Feather
                      color={CHAT_COLORS.textPrimary}
                      name="check"
                      size={20}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: CHAT_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  title: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.bold,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  options: {
    gap: 8,
  },
  option: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: CHAT_COLORS.surfaceMuted,
  },
  optionPressed: {
    opacity: 0.76,
  },
  optionText: {
    flex: 1,
    gap: 2,
    paddingRight: 14,
  },
  optionLabel: {
    color: CHAT_COLORS.textPrimary,
    fontFamily: CHAT_FONTS.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  optionDescription: {
    color: CHAT_COLORS.textSecondary,
    fontFamily: CHAT_FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
