import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Colon3Wordmark } from "./Colon3Wordmark";

// Mirrors web's spinner-bounce keyframes (apps/web/src/components/ui/spinner.css):
// 900ms loop, rest -> hop up 12% and stretch (40%) -> land squashed (75%) -> rest.
const BOUNCE_DURATION_MS = 900;
const BOUNCE_EASING = Easing.inOut(Easing.quad);
const KEYFRAMES = [0, 1, 2, 3];
const TRANSLATE_Y_FRACTION = [0, -0.12, 0, 0];
const SCALE_X = [1, 0.96, 1.05, 1];
const SCALE_Y = [1, 1.04, 0.95, 1];

/**
 * The :3 mark doing a gentle transform-only bounce on the UI thread. Renders a
 * static mark when the system asks for reduced motion.
 */
export function Colon3Spinner(props: {
  readonly height?: number;
  readonly colorClassName?: string;
}) {
  const height = props.height ?? 24;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BOUNCE_DURATION_MS * 0.4, easing: BOUNCE_EASING }),
        withTiming(2, { duration: BOUNCE_DURATION_MS * 0.35, easing: BOUNCE_EASING }),
        withTiming(3, { duration: BOUNCE_DURATION_MS * 0.25, easing: BOUNCE_EASING }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(progress);
      progress.value = 0;
    };
  }, [progress, reduceMotion]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, KEYFRAMES, TRANSLATE_Y_FRACTION) * height },
      { scaleX: interpolate(progress.value, KEYFRAMES, SCALE_X) },
      { scaleY: interpolate(progress.value, KEYFRAMES, SCALE_Y) },
    ],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="loading"
      style={[{ transformOrigin: "50% 100%" }, bounceStyle]}
    >
      <Colon3Wordmark
        height={height}
        colorClassName={props.colorClassName ?? "accent-icon-muted"}
      />
    </Animated.View>
  );
}
