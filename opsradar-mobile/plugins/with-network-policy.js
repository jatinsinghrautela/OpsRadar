const { withAndroidManifest } = require("expo/config-plugins");
module.exports = (config, { allowHttp = false } = {}) =>
  withAndroidManifest(config, (result) => {
    result.modResults.manifest.application[0].$[
      "android:usesCleartextTraffic"
    ] = String(allowHttp);
    return result;
  });
