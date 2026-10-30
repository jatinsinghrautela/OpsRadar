const { withAppBuildGradle } = require("expo/config-plugins");
module.exports = (config) =>
  withAppBuildGradle(config, (result) => {
    const marker = "// OpsRadar: hash CMake object paths for Windows MAX_PATH";
    if (!result.modResults.contents.includes(marker))
      result.modResults.contents += `
${marker}
android {
    externalNativeBuild {
        cmake {
            buildStagingDirectory rootProject.file('../../.cache/android-cxx')
        }
    }
    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments '-DCMAKE_OBJECT_PATH_MAX=240'
            }
        }
    }
}
`;
    return result;
  });
