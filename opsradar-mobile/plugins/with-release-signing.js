const { withAppBuildGradle } = require("expo/config-plugins");
module.exports = (config) =>
  withAppBuildGradle(config, (result) => {
    const marker = "// OpsRadar operator-owned release signing";
    let source = result.modResults.contents;
    if (source.includes(marker)) return result;
    const block = `${marker}
        opsradarRelease {
            def keyFile = System.getenv('OPSRADAR_KEYSTORE_FILE')
            if (keyFile) {
                storeFile file(keyFile)
                storePassword System.getenv('OPSRADAR_KEYSTORE_PASSWORD')
                keyAlias System.getenv('OPSRADAR_KEY_ALIAS')
                keyPassword System.getenv('OPSRADAR_KEY_PASSWORD')
            }
        }
`;
    source = source.replace("signingConfigs {", "signingConfigs {\n" + block);
    source = source.replace(
      /(release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
      "$1signingConfigs.opsradarRelease",
    );
    source += `
// Refuse a release that could accidentally use the public Android debug key.
if (gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }) {
    ['OPSRADAR_KEYSTORE_FILE','OPSRADAR_KEYSTORE_PASSWORD','OPSRADAR_KEY_ALIAS','OPSRADAR_KEY_PASSWORD'].each {
        if (!System.getenv(it)) throw new GradleException('Missing release signing environment variable: ' + it)
    }
}
`;
    result.modResults.contents = source;
    return result;
  });
