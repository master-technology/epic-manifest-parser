export enum EFileManifestListVersion {
  Original = 0,
  MimeMD5Hash = 1,
  SHA256Hash = 2,

  // Always after the latest version, signifies the latest version plus 1 to allow initialization simplicity.
  LatestPlusOne,
  Latest = (LatestPlusOne - 1)
}
