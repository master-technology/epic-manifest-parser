export enum EChunkDataListVersion {
  Original = 0,

  // Always after the latest version, signifies the latest version plus 1 to allow initialization simplicity.
  LatestPlusOne,
  Latest = (LatestPlusOne - 1)
}