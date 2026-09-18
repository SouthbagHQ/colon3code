import { Pressable, View } from "react-native";

import { AppText as Text } from "./AppText";
import { Colon3Wordmark } from "./Colon3Wordmark";

/**
 * The ":3" mark above an empty state. `sad` mirrors it horizontally so it
 * reads as "3:", for error and empty-after-failure states.
 */
function EmptyStateFace(props: { readonly face: "happy" | "sad"; readonly height: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={props.face === "sad" ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Colon3Wordmark colorClassName="accent-icon-muted" height={props.height} />
    </View>
  );
}

export function EmptyState(props: {
  readonly title: string;
  readonly detail: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly variant?: "card" | "plain";
  readonly face?: "happy" | "sad";
}) {
  const face = props.face ?? "happy";

  if (props.variant === "plain") {
    return (
      <View className="items-center px-8 py-8">
        <View className="mb-5">
          <EmptyStateFace face={face} height={56} />
        </View>
        <Text className="text-center text-xl font-t3-bold text-foreground">{props.title}</Text>
        <Text className="mt-2 text-center font-sans text-base leading-normal text-foreground-muted">
          {props.detail}
        </Text>
        {props.actionLabel && props.onAction ? (
          <Pressable
            className="mt-5 rounded-full bg-primary px-5 py-3 active:opacity-70"
            onPress={props.onAction}
          >
            <Text className="text-sm font-t3-bold text-primary-foreground">
              {props.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="rounded-[22px] border border-border bg-card p-5">
      <View className="mb-3">
        <EmptyStateFace face={face} height={28} />
      </View>
      <Text className="font-t3-bold text-lg text-foreground">{props.title}</Text>
      <Text className="mt-2 font-sans text-sm leading-relaxed text-foreground-muted">
        {props.detail}
      </Text>
      {props.actionLabel && props.onAction ? (
        <Pressable
          className="mt-4 self-start rounded-full bg-primary px-4 py-2.5 active:opacity-70"
          onPress={props.onAction}
        >
          <Text className="text-sm font-t3-bold text-primary-foreground">{props.actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
