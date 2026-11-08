const { withAppBuildGradle } = require("expo/config-plugins");

// When COLON3CODE_ANDROID_KEYSTORE_PATH is set at prebuild, sign release builds with
// that keystore instead of the debug one. Only env var names go into build.gradle;
// Gradle reads the values at build time, so the generated project holds no secrets.
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
