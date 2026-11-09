import { View } from "react-native";
import { Text } from "@expo/ui/jetpack-compose";
import { IconButton } from "../../components/ui/IconButton";
import { NativeAppBar } from "../../components/ui/NativeAppBar.android";

export function NativeAppBarExample() {
  return (
    <NativeAppBar
      title={<Text style={{ fontSize: 21 }}>native app bar</Text>}
      navigationIcon={
        <IconButton icon="arrow.left" accessibilityLabel="example back" onPress={() => {}} />
      }
      actions={
        <View className="flex-row">
          <IconButton
            icon="magnifyingglass"
            accessibilityLabel="example search"
            onPress={() => {}}
          />
        </View>
      }
    />
  );
}
