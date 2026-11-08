import { View } from "react-native";
import type { ReactNode } from "react";

import { AppText as Text } from "./AppText";
import { Button } from "./Button";
import { Colon3Wordmark } from "../Colon3Wordmark";

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
  readonly action?: ReactNode;
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
        <Text textRole="title" className="text-center font-t3-bold text-foreground">
          {props.title}
        </Text>
        <Text
          textRole="body"
          className="mt-2 text-center font-sans leading-normal text-foreground-muted"
        >
          {props.detail}
        </Text>
        {props.action ? (
          <View className="mt-5">{props.action}</View>
        ) : props.actionLabel && props.onAction ? (
          <View className="mt-5">
            <Button tone="primary" label={props.actionLabel} onPress={props.onAction} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className="rounded-[22px] border border-border bg-card p-5">
      <View className="mb-3">
        <EmptyStateFace face={face} height={28} />
      </View>
      <Text textRole="headline" className="font-t3-bold text-foreground">
        {props.title}
      </Text>
      <Text textRole="footnote" className="mt-2 font-sans leading-relaxed text-foreground-muted">
        {props.detail}
      </Text>
      {props.action ? (
        <View className="mt-4 self-start">{props.action}</View>
      ) : props.actionLabel && props.onAction ? (
        <View className="mt-4 self-start">
          <Button tone="primary" label={props.actionLabel} onPress={props.onAction} />
        </View>
      ) : null}
    </View>
  );
}
