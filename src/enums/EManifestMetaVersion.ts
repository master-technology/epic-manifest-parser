export enum EManifestMetaVersion {
  Original = 0,
  SerialisesBuildId,

  // Always after the latest version, signifies the latest version plus 1 to allow initialization simplicity.
  LatestPlusOne,
  Latest = (LatestPlusOne - 1),
}