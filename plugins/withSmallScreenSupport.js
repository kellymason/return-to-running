const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withSmallScreenSupport(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const mainActivity = manifest.application[0].activity[0];

    // Allow the activity to resize for any display size (foldables, small externals)
    mainActivity.$["android:resizeableActivity"] = "true";

    // Handle screen-size configuration changes without restarting the activity
    const existing = mainActivity.$["android:configChanges"] || "";
    const changes = new Set(existing.split("|").filter(Boolean));
    changes.add("screenSize");
    changes.add("smallestScreenSize");
    changes.add("screenLayout");
    mainActivity.$["android:configChanges"] = [...changes].join("|");

    // Declare support for every screen bucket so Android never letterboxes
    manifest["supports-screens"] = [
      {
        $: {
          "android:smallScreens": "true",
          "android:normalScreens": "true",
          "android:largeScreens": "true",
          "android:xlargeScreens": "true",
          "android:anyDensity": "true",
          "android:resizeable": "true",
        },
      },
    ];

    return config;
  });
};
