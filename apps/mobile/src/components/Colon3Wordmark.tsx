import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";

const ThemedPath = withUniwind(Path);

/**
 * The ":3" brand mark, matching the desktop sidebar's Colon3Wordmark SVG
 * (apps/web Sidebar.tsx). Width derives from the viewBox aspect ratio.
 */
export function Colon3Wordmark(props: {
  readonly height: number;
  readonly color?: ColorValue;
  readonly colorClassName?: string;
}) {
  const aspectRatio = 61.42 / 56.96;
  return (
    <Svg
      accessibilityLabel=":3"
      height={props.height}
      width={props.height * aspectRatio}
      viewBox="48.5 37 61.42 56.96"
    >
      <ThemedPath
        d="M50.3 52.08H59.66C60.65 52.08 61.46 52.89 61.46 53.88V63.24C61.46 64.23 60.65 65.04 59.66 65.04H50.3C49.31 65.04 48.5 64.23 48.5 63.24V53.88C48.5 52.89 49.31 52.08 50.3 52.08ZM50.3 80.04H59.66C60.65 80.04 61.46 80.85 61.46 81.84V91.2C61.46 92.19 60.65 93 59.66 93H50.3C49.31 93 48.5 92.19 48.5 91.2V81.84C48.5 80.85 49.31 80.04 50.3 80.04ZM86.7253 93.96C82.832 93.96 78.9653 93.4533 75.1253 92.44C71.2853 91.3733 68.032 89.88 65.3653 87.96L70.4053 78.04C72.5386 79.5867 75.0186 80.8133 77.8453 81.72C80.672 82.6267 83.5253 83.08 86.4053 83.08C89.6586 83.08 92.2186 82.44 94.0853 81.16C95.952 79.88 96.8853 78.12 96.8853 75.88C96.8853 73.7467 96.0586 72.0667 94.4053 70.84C92.752 69.6133 90.0853 69 86.4053 69H80.4853V60.44L96.0853 42.76L97.5253 47.4H68.1653V37H107.365V45.4L91.8453 63.08L85.2853 59.32H89.0453C95.9253 59.32 101.125 60.8667 104.645 63.96C108.165 67.0533 109.925 71.0267 109.925 75.88C109.925 79.0267 109.099 81.9867 107.445 84.76C105.792 87.48 103.259 89.6933 99.8453 91.4C96.432 93.1067 92.0586 93.96 86.7253 93.96Z"
        color={props.color}
        colorClassName={props.colorClassName}
        fill="currentColor"
      />
    </Svg>
  );
}
