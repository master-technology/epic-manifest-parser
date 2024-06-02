export enum EManifestMetaVersion {
  Original = 0,
  SerialisesBuildId,
  hasUninstallCommand,

  // Always after the latest version, signifies the latest version plus 1 to allow initialization simplicity.
  LatestPlusOne,
  Latest = (LatestPlusOne - 1),
}
