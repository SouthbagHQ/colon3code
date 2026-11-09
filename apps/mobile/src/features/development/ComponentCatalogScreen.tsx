import { NativeAppBarExample } from "./NativeAppBarExample";
import { Toast } from "../../components/ui/Toast";
import { Progress } from "../../components/ui/Progress";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import { View, type TextInputInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, AppTextInput } from "../../components/ui/AppText";
import { Sheet } from "../../components/ui/Sheet";
import { Chip } from "../../components/ui/Chip";
import { Menu } from "../../components/ui/Menu";
import { ListActionRow } from "../../components/ui/ListActionRow";
import { ListChoiceRow } from "../../components/ui/ListChoiceRow";
import { ListRow } from "../../components/ui/ListRow";
import { ListSection } from "../../components/ui/ListSection";
import { ListToggleRow } from "../../components/ui/ListToggleRow";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { FloatingActionButton } from "../../components/ui/FloatingActionButton";
import { SearchField } from "../../components/ui/SearchField";
import { Notice } from "../../components/ui/Notice";
import { NumberField } from "../../components/ui/NumberField";
import { AppBar } from "../../components/ui/AppBar";
import { ScreenScrollView } from "../../components/ui/ScreenScrollView";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { SliderRow } from "../../components/ui/SliderRow";
import * as Dialog from "../../components/ui/Dialog";
import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";
import { MOBILE_THEME_IDS } from "../../lib/mobileTheme";

const CHOICES = [
  { value: "overview", label: "overview" },
  { value: "activity", label: "activity" },
];

export function ComponentCatalogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const appearance = useAppearancePreferences();
  const [page, setPage] = useState("controls");
  const [tab, setTab] = useState("overview");
  const [enabled, setEnabled] = useState(true);
  const [value, setValue] = useState(3);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState(true);
  const searchRef = useRef<TextInputInstance>(null);
  const announceAction = () => setNotice(true);
  const confirm = () => {
    Dialog.confirm({
      title: "discard changes?",
      message: "This example only changes local catalog state.",
      confirmText: "discard",
      destructive: true,
      onConfirm: () => setText(""),
    });
  };
  return (
    <View className="flex-1 bg-screen">
      <AppBar title="UI components" onBack={() => navigation.goBack()} />
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <AppText className="text-sm text-foreground-muted">theme preview</AppText>
          <View className="flex-row flex-wrap gap-2">
            {MOBILE_THEME_IDS.filter(
              (id) => id !== "material-you" || appearance.systemColorsAvailable,
            ).map((id) => (
              <Chip
                key={id}
                label={id}
                selected={appearance.themeId === id}
                onPress={() => appearance.setThemeIdForBothAppearances(id)}
              />
            ))}
          </View>
          <SegmentedControl
            options={[
              { value: "light", label: "light" },
              { value: "dark", label: "dark" },
            ]}
            selected={appearance.themeAppearance}
            onSelect={appearance.setThemeMode}
            size="compact"
          />
        </View>
        <SegmentedControl
          options={[
            { value: "controls", label: "controls" },
            { value: "forms", label: "forms" },
            { value: "feedback", label: "feedback" },
          ]}
          selected={page}
          onSelect={setPage}
          size="compact"
        />
        {page === "controls" ? (
          <>
            <View className="gap-3">
              <AppText className="text-lg font-t3-semibold">lists and selection</AppText>
              <ListSection>
                <View className="p-4">
                  <SegmentedControl
                    variant="card"
                    options={CHOICES}
                    selected={tab}
                    onSelect={setTab}
                    size="compact"
                    role="tab"
                  />
                </View>
                <ListRow icon="folder" label="projects" detail="4" onPress={() => setSheet(true)} />
                <ListToggleRow
                  icon="bell.badge"
                  label="notifications"
                  description="Updates from your active threads"
                  value={enabled}
                  onValueChange={setEnabled}
                />
                <ListChoiceRow label="selected option" selected onPress={announceAction} />
                <ListActionRow
                  icon="trash"
                  label="discard changes"
                  tone="danger"
                  onPress={confirm}
                />
              </ListSection>
              <SegmentedControl
                options={CHOICES}
                selected={tab}
                onSelect={setTab}
                size="compact"
                role="tab"
              />
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label="selected filter"
                  selected={enabled}
                  onPress={() => setEnabled(!enabled)}
                />
                <Chip label="label" size="small" />
                <Chip label="disabled" disabled onPress={announceAction} />
              </View>
            </View>
            <View className="gap-3">
              <NativeAppBarExample />
              <AppText className="text-lg font-t3-semibold">buttons</AppText>
              <View className="flex-row flex-wrap gap-2">
                <Button label="primary" tone="primary" onPress={announceAction} />
                <Button label="secondary" onPress={announceAction} />
                <Button label="contrast" tone="contrast" onPress={announceAction} />
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Button label="disabled" disabled onPress={announceAction} />
                <Button label="loading" loading onPress={announceAction} />
                <IconButton
                  accessibilityLabel="open example sheet"
                  icon="plus"
                  variant="tonal"
                  onPress={() => setSheet(true)}
                />
              </View>
            </View>
          </>
        ) : null}
        {page === "forms" ? (
          <View className="gap-3">
            <AppText className="text-lg font-t3-semibold">forms</AppText>
            <AppTextInput
              accessibilityLabel="example name"
              placeholder="name"
              value={text}
              onChangeText={setText}
            />
            <View className="flex-row">
              <SearchField
                inputRef={searchRef}
                accessibilityLabel="search examples"
                clearAccessibilityLabel="clear examples search"
                placeholder="search examples"
                value={search}
                onChangeText={setSearch}
                autoFocus={false}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <AppText>count</AppText>
              <NumberField
                label="example count"
                min={1}
                max={10}
                value={value}
                onValueChange={setValue}
              />
            </View>
            <ListSection>
              <SliderRow
                icon="textformat.size"
                label="example slider"
                valueLabel={String(value)}
                min={1}
                max={10}
                step={1}
                value={value}
                onChange={setValue}
              />
            </ListSection>
          </View>
        ) : null}
        {page === "feedback" ? (
          <View className="gap-3">
            <AppText className="text-lg font-t3-semibold">feedback and presentation</AppText>
            <Notice message="This action could not finish. Try again." tone="danger" />
            <Button label="show notice" onPress={announceAction} />
            <View className="flex-row flex-wrap gap-2">
              <Button label="sheet" onPress={() => setSheet(true)} />
              <Button label="dialog" onPress={confirm} />
              <Button
                label="alert"
                onPress={() =>
                  Dialog.alert("example alert", "Choose an action.", [
                    {
                      text: "more info",
                      onPress: () =>
                        Dialog.alert("more information", "This second alert stays open."),
                    },
                    { text: "cancel", style: "cancel" },
                    { text: "continue", onPress: announceAction },
                  ])
                }
              />
              <Button
                label="prompt"
                onPress={() =>
                  Dialog.prompt({
                    title: "rename example",
                    initialValue: text,
                    confirmText: "rename",
                    onConfirm: setText,
                  })
                }
              />
              <Menu
                title="example menu"
                actions={[
                  { id: "copy", title: "copy", image: "doc.on.doc" },
                  { id: "discard", title: "discard", attributes: { destructive: true } },
                ]}
                onPressAction={({ nativeEvent }) =>
                  nativeEvent.event === "discard" ? confirm() : announceAction()
                }
              >
                <Chip label="menu" trailingIcon="chevron.down" />
              </Menu>
            </View>
            <Progress value={0.6} label="example upload" />
            <Progress label="connecting" />
            <View className="items-start">
              <FloatingActionButton
                label="new thread"
                icon="plus"
                variant="extended"
                tone="primary"
                onPress={() => setSheet(true)}
              />
            </View>
          </View>
        ) : null}
      </ScreenScrollView>
      {page === "feedback" && notice ? (
        <View
          collapsable={false}
          className="absolute inset-x-3 z-[100]"
          style={{ bottom: insets.bottom + 12 }}
          pointerEvents="box-none"
        >
          <Toast
            message="Changes are ready to review."
            tone="success"
            dismissMode="swipe"
            action={{
              label: "undo",
              onPress: () => {
                setNotice(false);
                setText("restored example");
              },
            }}
            onDismiss={() => setNotice(false)}
          />
        </View>
      ) : null}
      {sheet ? (
        <Sheet title="example sheet" onClose={() => setSheet(false)}>
          <ScreenScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerClassName="p-4"
          >
            <ListSection>
              <ListChoiceRow
                label="overview"
                selected={tab === "overview"}
                onPress={() => setTab("overview")}
              />
              <ListChoiceRow
                label="activity"
                selected={tab === "activity"}
                onPress={() => setTab("activity")}
              />
            </ListSection>
          </ScreenScrollView>
        </Sheet>
      ) : null}
    </View>
  );
}
