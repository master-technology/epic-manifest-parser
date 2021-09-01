/* https://github.com/EpicGames/UnrealEngine/blob/99b6e203a15d04fc7bbbf554c421a985c1ccb8f1/Engine/Source/Runtime/Online/BuildPatchServices/Private/Data/ManifestData.cpp */

import { ManifestHeaderVersionSizes } from "../enums/ManifestHeaderVersionSizes";
import { EFileManifestListVersion } from "../enums/EFileManifestListVersion";
import { EChunkDataListVersion } from "../enums/EChunkDataListVersion";
import { EManifestStorageFlags } from "../enums/EManifestStorageFlags";
import { EManifestMetaVersion } from "../enums/EManifestMetaVersion";
import { EFileMetaFlags } from "../enums/EFileMetaFlags";
import { EFeatureLevel } from "../enums/EFeatureLevel";

import * as FBuildPatchUtils from "../misc/FBuildPatchUtils";

import FArchive from "./FArchive";
import FSHAHash from "./FSHAHash";
import FString from "./FString";
import FGuid from "./FGuid";
import {
  FChunkInfo,
  FChunkPart
} from "./ChunkData";

export class FManifestHeader {
  /* The manifest header magic codeword, for quick checking that the opened file is probably a manifest file. */
  static readonly MANIFEST_HEADER_MAGIC: number =  0x44BEC00C


  /* The version of this header and manifest data format, driven by the feature level. */
  Version: EFeatureLevel = EFeatureLevel.Latest
  /* The size of this header. */
  HeaderSize: number = 0
  /* The size of this data compressed. */
  DataSizeCompressed: number = 0
  /* The size of this data uncompressed. */
  DataSizeUncompressed: number = 0
  /* How the chunk data is stored. */
  StoredAs: EManifestStorageFlags = EManifestStorageFlags.None
  /* The SHA1 hash for the manifest data that follows. */
  SHAHash: FSHAHash = new FSHAHash()

  constructor(ar: FArchive) {
    /* Calculate how much space left in the archive for reading data ( will be 0 when writing ). */
    let startPos = ar.tell()
    let sizeLeft = ar.size - startPos
    let expectedBytes = 0

    /* Make sure the archive has enough data to read from, or we are saving instead. */
    let bSuccess = sizeLeft >= ManifestHeaderVersionSizes[EFeatureLevel.Original]
    if (bSuccess) {
      /* Start by loading the first version we had. */
      let magic = ar.readUInt32()
      this.HeaderSize = ar.readUInt32()
      this.DataSizeUncompressed = ar.readUInt32()
      this.DataSizeCompressed = ar.readUInt32()
      this.SHAHash = new FSHAHash(ar)
      this.StoredAs = ar.readEnum(EManifestStorageFlags)

      bSuccess = magic === FManifestHeader.MANIFEST_HEADER_MAGIC
      expectedBytes = ManifestHeaderVersionSizes[EFeatureLevel.Original]

      /* After the Original with no specific version serialized, the header size increased and we had a version to load. */
      if (bSuccess && this.HeaderSize > ManifestHeaderVersionSizes[EFeatureLevel.Original]) {
        this.Version = ar.readEnum(EFeatureLevel, ar.readUInt32())
        expectedBytes = ManifestHeaderVersionSizes[EFeatureLevel.StoredAsBinaryData]
      }
      /* Otherwise, this header was at the version for a UObject class before this code refactor. */
      else if (bSuccess) {
        this.Version = EFeatureLevel.StoredAsCompressedUClass
      }
    }

    /* Make sure the expected number of bytes were serialized. In practice this will catch errors where type */
		/* serialization operators changed their format and that will need investigating. */
    bSuccess = bSuccess && (ar.tell() - startPos) === expectedBytes
    if (bSuccess) {
      /* Make sure the archive now points to data location. */
      ar.seek(startPos + this.HeaderSize)
    }
    else {
      /* If we had a serialization error when loading, zero out the header values. */
      this.Version = EFeatureLevel.Latest
      this.HeaderSize = 0
      this.DataSizeCompressed = 0
      this.DataSizeUncompressed = 0
      this.StoredAs = EManifestStorageFlags.None
      this.SHAHash = new FSHAHash()
    }
  }
}

export class FManifestMeta {
  /* The feature level support this build was created with, regardless of the serialised format. */
  FeatureLevel: EFeatureLevel = EFeatureLevel.Invalid
  /* Whether this is a legacy 'nochunks' build. */
  bIsFileData: boolean = false
  /* The app id provided at generation. */
  AppID: number = 0
  /* The app name string provided at generation. */
  AppName: FString
  /* The build version string provided at generation. */
  BuildVersion: FString
  /* The file in this manifest designated the application executable of the build. */
  LaunchExe: FString
	/* The command line required when launching the application executable. */
  LaunchCommand: FString
	/* The set of prerequisite ids for dependencies that this build's prerequisite installer will apply. */
  PrereqIds: FString[]
	/* A display string for the prerequisite provided at generation. */
  PrereqName: FString
	/* The file in this manifest designated the launch executable of the prerequisite installer. */
  PrereqPath: FString
	/* The command line required when launching the prerequisite installer. */
  PrereqArgs: FString
	/* A unique build id generated at original chunking time to identify an exact build. */
	BuildId: FString = FBuildPatchUtils.GenerateNewBuildId()

  constructor(ar: FArchive) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readEnum(EManifestMetaVersion)

    /* Serialise the ManifestMetaVersion::Original version variables. */
    if (dataVersion >= EManifestMetaVersion.Original) {
      this.FeatureLevel = ar.readEnum(EFeatureLevel, ar.readUInt32())
      this.bIsFileData = ar.readUInt8() === 1
      this.AppID = ar.readUInt32()
      this.AppName = new FString(ar)
      this.BuildVersion = new FString(ar)
      this.LaunchExe = new FString(ar)
      this.LaunchCommand = new FString(ar)
      this.PrereqIds = ar.readArray((_ar) => new FString(_ar))
      this.PrereqName = new FString(ar)
      this.PrereqPath = new FString(ar)
      this.PrereqArgs = new FString(ar)
    }

    if (dataVersion >= EManifestMetaVersion.SerialisesBuildId) {
      /* Serialise the BuildId. */
      this.BuildId = new FString(ar)
    }
    else {
      /* Otherwise, initialise with backwards compatible default when loading. */
      this.BuildId = FBuildPatchUtils.GetBackwardsCompatibleBuildId(this)
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize);
  }
}

export class FChunkDataList {
  /* The list of chunks. */
  ChunkList: FChunkInfo[]

  constructor(ar: FArchive) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readEnum(EChunkDataListVersion)
    let elementCount = ar.readInt32()

    this.ChunkList = [...Array(elementCount)].map(_ => new FChunkInfo())

    /* For a struct list type of data, we serialise every variable as it's own flat list. */
		/* This makes it very simple to handle or skip, extra variables added to the struct later. */

		/* Serialise the ManifestMetaVersion::Original version variables. */
    if (dataVersion >= EChunkDataListVersion.Original) {
      for (let i = 0; i < elementCount; i++) this.ChunkList[i].Guid            = new FGuid(ar)
      for (let i = 0; i < elementCount; i++) this.ChunkList[i].Hash            = ar.readUInt64()
      for (let i = 0; i < elementCount; i++) this.ChunkList[i].ShaHash         = new FSHAHash(ar)
      for (let i = 0; i < elementCount; i++) this.ChunkList[i].GroupNumber     = ar.readInt8()
      for (let i = 0; i < elementCount; i++) this.ChunkList[i].WindowSize      = ar.readInt32()
      for (let i = 0; i < elementCount; i++) this.ChunkList[i].FileSize        = ar.readInt64()
    }

    /* We must always make sure to seek the archive to the correct end location. */
		ar.seek(startPos + dataSize)
  }
}

export class FFileManifest {
  /* The build relative filename. */
  Filename: FString
	/* Whether this is a symlink to another file. */
  SymlinkTarget: FString
	/* The file SHA1. */
  FileHash: FSHAHash
	/* The flags for this file. */
  FileMetaFlags: EFileMetaFlags
	/* The install tags for this file. */
  InstallTags: FString[]
	/* The list of chunk parts to stitch. */
  ChunkParts: FChunkPart[]
	/* The size of this file. */
  FileSize: number

  constructor() { }
}

export class FFileManifestList {
  /* The list of files. */
	FileList: FFileManifest[]

  constructor(ar: FArchive) {
		/* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readEnum(EFileManifestListVersion)
    let elementCount = ar.readInt32()

		this.FileList = [...Array(elementCount)].map(_ => new FFileManifest())

		/* Serialise the ManifestMetaVersion::Original version variables. */
		if (dataVersion >= EFileManifestListVersion.Original) {
      for (let i = 0; i < elementCount; i++) this.FileList[i].Filename         = ar.readFString()
      for (let i = 0; i < elementCount; i++) this.FileList[i].SymlinkTarget    = ar.readFString()
      for (let i = 0; i < elementCount; i++) this.FileList[i].FileHash         = new FSHAHash(ar)
      for (let i = 0; i < elementCount; i++) this.FileList[i].FileMetaFlags    = ar.readEnum(EFileMetaFlags)
      for (let i = 0; i < elementCount; i++) this.FileList[i].InstallTags      = ar.readArray((_ar) => _ar.readFString())
      for (let i = 0; i < elementCount; i++) this.FileList[i].ChunkParts       = ar.readArray((_ar) => new FChunkPart(_ar))
    }

		/* We must always make sure to seek the archive to the correct end location. */
		ar.seek(startPos + dataSize)
  }
}

export class FCustomFields {
  /* The map of field name to field data. */
  Fields: Map<FString, string>

  constructor(ar: FArchive) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readEnum(EChunkDataListVersion)
    let elementCount = ar.readInt32()

    this.Fields = new Map<FString, string>()

    if (dataVersion >= EChunkDataListVersion.Original) {
      let keys = [...Array(elementCount)], values = [...Array(elementCount)]
      for (let i = 0; i < elementCount; i++) keys[i]                           = ar.readFString()
      for (let i = 0; i < elementCount; i++) values[i]                         = ar.readFString()

      for (let i = 0; i < elementCount; i++) this.Fields.set(keys[i], values[i].toString())
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize)
  }
}