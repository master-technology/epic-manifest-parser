import { EManifestMetaVersion } from "../../enums/EManifestMetaVersion";
import { EFeatureLevel } from "../../enums/EFeatureLevel";

import * as FBuildPatchUtils from "../misc/FBuildPatchUtils";
import { FArchive } from "../misc/FArchive";
import {EpicReversedDecimalToNumber} from "../misc/HexUtils";

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
  /* Uninstall Information */
  UninstallExe: string
  UninstallCommand: string
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


  constructor(data: FArchive | any, lazy: boolean = false) {
    if (data instanceof FArchive) {
       this.#fromFArchive(data as FArchive, lazy);
    } else {
       this.#fromJSON(data);
    }
  }

  #fromJSON(data: any) {
    if (data.parsed) {
      this.FeatureLevel = data.ManifestFileVersion as EFeatureLevel;
      this.AppID = data.AppID;
    } else {
      this.FeatureLevel = EpicReversedDecimalToNumber(data.ManifestFileVersion) as EFeatureLevel;
      this.AppID = EpicReversedDecimalToNumber(data.AppID);

    }
    this.bIsFileData = data.bIsFileData;
    this.AppName = data.AppNameString;
    this.BuildVersion = data.BuildVersionString;
    this.UninstallExe = data.UninstallExeString;
    this.UninstallCommand = data.UninstallCommand;
    this.LaunchExe = data.LaunchExeString;
    this.LaunchCommand = data.LaunchCommand;
    this.PrereqIds = data.PrereqIds;
    this.PrereqName = data.PrereqName;
    this.PrereqPath = data.PrereqPath;
    this.PrereqArgs = data.PrereqArgs;
    this.BuildId = data.BuildId ? data.BuildId : FBuildPatchUtils.GetBackwardsCompatibleBuildId(this);
  }

  #fromFArchive(ar: FArchive, lazy: boolean) {
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
      if (lazy) {
        let count = ar.readUInt32()
        for (let i = 0; i < count; i++) // PrereqIds
          ar.skip(ar.readInt32())
        ar.skip(ar.readInt32()) // PrereqName
        ar.skip(ar.readInt32()) // PrereqPath
        ar.skip(ar.readInt32()) // PrereqArgs
      }
      else {
        this.PrereqIds = ar.readArray((_ar) => _ar.readFString())
        this.PrereqName = ar.readFString()
        this.PrereqPath = ar.readFString()
        this.PrereqArgs = ar.readFString()
      }
    }

    if (dataVersion >= EManifestMetaVersion.SerialisesBuildId) {
      /* Serialise the BuildId. */
      this.BuildId = ar.readFString()
    }
    else {
      /* Otherwise, initialise with backwards compatible default when loading. */
      this.BuildId = FBuildPatchUtils.GetBackwardsCompatibleBuildId(this)
    }

    if (dataVersion >= EManifestMetaVersion.hasUninstallCommand) {
        /* Un-serialise the UninstallExe and UninstallCommand. */
        this.UninstallExe = ar.readFString()
        this.UninstallCommand = ar.readFString()
    } else {
      this.UninstallExe = ""
      this.UninstallCommand = ""
    }


    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize);
  }
}
