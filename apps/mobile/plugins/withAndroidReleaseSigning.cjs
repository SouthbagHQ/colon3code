const { withAppBuildGradle } = require("expo/config-plugins");

// The Expo template signs release builds with the debug keystore. When
// COLON3CODE_ANDROID_KEYSTORE_PATH is set at prebuild time, point the release
// build type at a keystore instead. Only the env var names are written into
// build.gradle; Gradle reads the path, passwords and alias from the
// environment at build time, so the generated project never holds secrets.
const ENV = {
  storeFile: "COLON3CODE_ANDROID_KEYSTORE_PATH",
  storePassword: "COLON3CODE_ANDROID_KEYSTORE_PASSWORD",
  keyAlias: "COLON3CODE_ANDROID_KEY_ALIAS",
  keyPassword: "COLON3CODE_ANDROID_KEY_PASSWORD",
};

const RELEASE_SIGNING_CONFIG = `        release {
            storeFile file(System.getenv("${ENV.storeFile}"))
            storePassword System.getenv("${ENV.storePassword}")
            keyAlias System.getenv("${ENV.keyAlias}")
            keyPassword System.getenv("${ENV.keyPassword}")
        }
`;

module.exports = function withAndroidReleaseSigning(config) {
  if (!process.env[ENV.storeFile]) return config;

  return withAppBuildGradle(config, (nextConfig) => {
    const gradle = nextConfig.modResults.contents;
    const withConfig = gradle.replace(
      /(    signingConfigs \{\n[\s\S]*?\n        \}\n)/,
      `$1${RELEASE_SIGNING_CONFIG}`,
    );
    const withRelease = withConfig.replace(
      /(        release \{[^}]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig signingConfigs.release",
    );
    if (withConfig === gradle || withRelease === withConfig) {
      throw new Error(
        "withAndroidReleaseSigning: could not find the template signing blocks in app/build.gradle.",
      );
    }
    nextConfig.modResults.contents = withRelease;
    return nextConfig;
  });
};
