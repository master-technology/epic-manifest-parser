import { EManifestMetaVersion } from "../../enums/EManifestMetaVersion";
import { EFeatureLevel } from "../../enums/EFeatureLevel";

import * as FBuildPatchUtils from "../misc/FBuildPatchUtils";
import { FArchive } from "../misc/FArchive";

export class FManifestMeta {
  /* The feature level support this build was created with, regardless of the serialised format. */
  FeatureLevel: EFeatureLevel = EFeatureLevel.Invalid
  /* Whether this is a legacy 'nochunks' build. */
  bIsFileData: boolean = false
  /* The app id provided at generation. */
  AppID: number = 0
  /* The app name string provided at generation. */
  AppName: string
  /* The build version string provided at generation. */
  BuildVersion: string
  /* The file in this manifest designated the application executable of the build. */
  LaunchExe: string
  /* The command line required when launching the application executable. */
  LaunchCommand: string
  /* The set of prerequisite ids for dependencies that this build's prerequisite installer will apply. */
  PrereqIds: string[]
  /* A display string for the prerequisite provided at generation. */
  PrereqName: string
  /* The file in this manifest designated the launch executable of the prerequisite installer. */
  PrereqPath: string
  /* The command line required when launching the prerequisite installer. */
  PrereqArgs: string
  /* A unique build id generated at original chunking time to identify an exact build. */
  BuildId: string = FBuildPatchUtils.GenerateNewBuildId()

  constructor(ar: FArchive) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readUInt8()

    /* Serialise the ManifestMetaVersion::Original version variables. */
    if (dataVersion >= EManifestMetaVersion.Original) {
      this.FeatureLevel = ar.readUInt32()
      this.bIsFileData = ar.readUInt8() === 1
      this.AppID = ar.readUInt32()
      this.AppName = ar.readFString()
      this.BuildVersion = ar.readFString()
      this.LaunchExe = ar.readFString()
      this.LaunchCommand = ar.readFString()
      this.PrereqIds = ar.readArray((_ar) => _ar.readFString())
      this.PrereqName = ar.readFString()
      this.PrereqPath = ar.readFString()
      this.PrereqArgs = ar.readFString()
    }

    if (dataVersion >= EManifestMetaVersion.SerialisesBuildId) {
      /* Serialise the BuildId. */
      this.BuildId = ar.readFString()
    }
    else {
      /* Otherwise, initialise with backwards compatible default when loading. */
      this.BuildId = FBuildPatchUtils.GetBackwardsCompatibleBuildId(this)
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize);
  }
}