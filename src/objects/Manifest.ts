import { EManifestStorageFlags } from "../enums/EManifestStorageFlags";
import { EFileMetaFlags } from "../enums/EFileMetaFlags";
import { EFeatureLevel } from "../enums/EFeatureLevel";

import { existsSync, readdirSync, lstatSync, unlinkSync } from "fs";
import * as FBuildPatchUtils from "../misc/FBuildPatchUtils";
import { FileManifestStream } from "./FileManifestStream";
import { ManifestOptions } from "./ManifestOptions";
import FileChunk from "./FileChunk";
import { inflateSync } from "zlib";
import FArchive from "./FArchive";
import FString from "./FString";
import { join } from "path";
import {
  FManifestHeader,
  FManifestMeta,
  FChunkDataList,
  FFileManifestList,
  FCustomFields,

  FFileManifest
} from "./ManifestData";

import { FChunkPart } from "./ChunkData";

enum ESerialisationType {
  JSON,
  Serialised,
  Invalid = -1
}

export class Manifest {
  ManifestFileVersion: string
  bIsFileData: boolean
  AppID: string
  AppName: string
  BuildVersion: string
  BuildId: string
  LaunchExe: string
  LaunchCommand: string
  PrereqIds: string[]
  PrereqName: string
  PrereqPath: string
  PrereqArgs: string
  FileManifestList: FileManifest[]
  ChunkHashList: object
  ChunkShaList: object
  DataGroupList: object
  ChunkFilesizeList: object
  CustomFields: object

  Chunks: Map<string, FileChunk>

  constructor(buf: Buffer, options?: ManifestOptions)
  constructor(data: object, options?: ManifestOptions)

  constructor(data, options: ManifestOptions = new ManifestOptions()) {
    Object.defineProperty(this, "_options", { value: options, enumerable: false });

    let serializationType = ESerialisationType.Invalid

    if (data.constructor.name === "Object") serializationType = ESerialisationType.JSON
    else try {
      data = JSON.parse(data)
      serializationType = ESerialisationType.JSON
    } catch {
      if (data instanceof Buffer) {
        let magic = data.readUInt32LE()
        if (magic === FManifestHeader.MANIFEST_HEADER_MAGIC) serializationType = ESerialisationType.Serialised
      }
    }

    if (serializationType === ESerialisationType.Invalid) throw new Error("Invalid manifest serialisation method")

    if (serializationType === ESerialisationType.Serialised) {
      let ar = new FArchive(data)

      let header = new FManifestHeader(ar)

      if (header.StoredAs & EManifestStorageFlags.Compressed) ar = new FArchive(inflateSync(ar.read(header.DataSizeCompressed)))
      else if (header.StoredAs & EManifestStorageFlags.Encrypted) throw new Error("Parsed manifest is encrypted")
      else ar = new FArchive(ar.read(header.DataSizeUncompressed))

      let meta = new FManifestMeta(ar)
      let chunkData = new FChunkDataList(ar)
      let fileData = new FFileManifestList(ar)
      let customFields = new FCustomFields(ar)

      this.ManifestFileVersion                                       = FString.ToStringBlob(meta.FeatureLevel).toString()
      this.bIsFileData                                               = meta.bIsFileData
      this.AppID                                                     = FString.ToStringBlob(meta.AppID).toString()
      this.AppName                                                   = meta.AppName.toString()
      this.BuildVersion                                              = meta.BuildVersion.toString()
      this.BuildId                                                   = meta.BuildId.toString()
      this.LaunchExe                                                 = meta.LaunchExe.toString()
      this.LaunchCommand                                             = meta.LaunchCommand.toString()
      this.PrereqIds                                                 = meta.PrereqIds.map(fstr => fstr.toString())
      this.PrereqName                                                = meta.PrereqName.toString()
      this.PrereqPath                                                = meta.PrereqPath.toString()
      this.PrereqArgs                                                = meta.PrereqArgs.toString()
      this.FileManifestList                                          = fileData.FileList.map(file => new FileManifest(file, this))
      this.ChunkHashList                                             = chunkData.ChunkList.reduce((acc, chunk) => {
        let hash = chunk.Hash.toString(16).toUpperCase()
        if (hash.length < 16) hash = "0".repeat(16 - hash.length) + hash
        acc[chunk.Guid.toString()] = hash
        return acc
      }, {})
      this.ChunkShaList                                              = chunkData.ChunkList.reduce((acc, chunk) => {
        acc[chunk.Guid.toString()] = chunk.ShaHash.toString('hex').toUpperCase()
        return acc
      }, {})
      this.DataGroupList                                             = chunkData.ChunkList.reduce((acc, chunk) => {
        acc[chunk.Guid.toString()] = FString.ToStringBlob(chunk.GroupNumber, 1)
        return acc
      }, {})
      this.ChunkFilesizeList                                         = chunkData.ChunkList.reduce((acc, chunk) => {
        acc[chunk.Guid.toString()] = FString.ToStringBlob(chunk.FileSize, 8)
        return acc
      }, {})
      this.CustomFields                                              = Object.fromEntries(customFields.Fields)
    }
    else if (serializationType === ESerialisationType.JSON) {
      this.ManifestFileVersion                                       = data.ManifestFileVersion
      this.bIsFileData                                               = data.bIsFileData
      this.AppID                                                     = data.AppID
      this.AppName                                                   = data.AppNameString
      this.BuildVersion                                              = data.BuildVersionString
      this.BuildId                                                   = FBuildPatchUtils.GetBackwardsCompatibleBuildId(data).toString()
      this.LaunchExe                                                 = data.LaunchExeString
      this.LaunchCommand                                             = data.LaunchCommand
      this.PrereqIds                                                 = data.PrereqIds
      this.PrereqName                                                = data.PrereqName
      this.PrereqPath                                                = data.PrereqPath
      this.PrereqArgs                                                = data.PrereqArgs
      this.FileManifestList                                          = data.FileManifestList.map(file => new FileManifest(file, this))
      this.ChunkHashList                                             = Object.keys(data.ChunkHashList).reduce((acc, guid) => {
        let hash = new FString(data.ChunkHashList[guid]).ToBlob().toString(16).toUpperCase()
        if (hash.length < 16) hash = "0".repeat(16 - hash.length) + hash
        acc[guid] = hash
        return acc
      }, {})
      this.ChunkShaList                                              = data.ChunkShaList
      this.DataGroupList                                             = data.DataGroupList
      this.ChunkFilesizeList                                         = Object.keys(data.ChunkFilesizeList).reduce((acc, guid) => {
        acc[guid] = new FString(data.ChunkFilesizeList[guid])
        return acc
      }, {})
      this.CustomFields                                              = data.CustomFields
    }

    let guids = Object.keys(this.ChunkHashList)
    this.Chunks = new Map<string, FileChunk>()
    for (const guid of guids) this.Chunks.set(guid, new FileChunk(guid, this))
  }

  deleteUnusedChunks() {
    let options = Object.getOwnPropertyDescriptor(this, "_options").value
    let dir = options.cacheDirectory
    if (!dir || !existsSync(dir)) return [ null, null ]

    let chunks = Array.from(this.Chunks.values()).map(chunk => chunk.Filename)
    let count = 0
    let size = 0

    for (const file of readdirSync(dir).filter(f => f.endsWith('.chunk'))) {
      if (chunks.includes(file)) continue
      try {
        let path = join(dir, file)
        let length = lstatSync(path).size
        unlinkSync(path)
        size += length
        count++
      } catch (error) {
        // not sure how to handle this
      }
    }

    return [ count, size ]
  }

  getDownloadSize() {
    return this.FileManifestList.reduce((acc, file) => (acc += file.Size, acc), 0)
  }

  getChunkSubdir() {
    let level = Number(new FString(this.ManifestFileVersion).ToBlob())
    return level < EFeatureLevel.DataFileRenames ? "Chunks"
				: level < EFeatureLevel.ChunkCompressionSupport ? "ChunksV2"
				: level < EFeatureLevel.VariableSizeChunksWithoutWindowSizeChunkInfo ? "ChunksV3"
				: "ChunksV4";
  }

  toJSON() {
    return {
      // Write general data
      ManifestFileVersion: this.ManifestFileVersion,
      bIsFileData: this.bIsFileData,
      AppID: this.AppID,
      AppNameString: this.AppName,
      BuildVersionString: this.BuildVersion,
      LaunchExeString: this.LaunchExe,
      LaunchCommand: this.LaunchCommand,
      PrereqIds: this.PrereqIds,
      PrereqName: this.PrereqName,
      PrereqPath: this.PrereqPath,
      PrereqArgs: this.PrereqArgs,

      // Write file manifest data
      FileManifestList: this.FileManifestList.map(file => file.toJSON()),

      // Write chunk hash list
      ChunkHashList: this.ChunkHashList,

      // Write chunk sha list
      ChunkShaList: this.ChunkShaList,

      // Write data group list
      DataGroupList: this.DataGroupList,

      // Write chunk size list
      ChunkFilesizeList: this.ChunkFilesizeList,

      // Write custom fields
      CustomFields: this.CustomFields
    }
  }
}

export class FileManifest {
  Name: string
  Hash: Buffer
  Size: number
  SymlinkTarget: string = ""
  ChunkParts: FileChunkPart[] = []
  InstallTags: string[] = []
  MetaFlags: EFileMetaFlags = EFileMetaFlags.None

  constructor(file, manifest) {
    Object.defineProperty(this, "_manifest", { value: manifest, enumerable: false });

    if (file instanceof FFileManifest) {
      this.Name = file.Filename.toString()
      this.Hash = file.FileHash.Hash

      this.SymlinkTarget = file.SymlinkTarget.toString()
      this.ChunkParts = file.ChunkParts.map(chunk => new FileChunkPart(chunk))

      this.MetaFlags = file.FileMetaFlags
      this.InstallTags = file.InstallTags.map(fstr => fstr.toString())
    }
    else {
      this.Name = file.Filename
      this.Hash = Buffer.from(new FString(file.FileHash).ToBlob())

      if ("SymlinkTarget" in file) this.SymlinkTarget = file.SymlinkTarget
      if ("FileChunkParts" in file) this.ChunkParts = file.FileChunkParts.map(chunk => new FileChunkPart(chunk))

      if ("InstallTags" in file) this.InstallTags = file.InstallTags

      if ("bIsUnixExecutable" in file) this.MetaFlags += EFileMetaFlags.UnixExecutable
      if ("bIsReadOnly" in file) this.MetaFlags += EFileMetaFlags.ReadOnly
      if ("bIsCompressed" in file) this.MetaFlags += EFileMetaFlags.Compressed
    }

    this.Size = this.ChunkParts.reduce((acc, chunk) => (acc += chunk.Size, acc), 0)
  }

  getBuffer() {
    return new Promise((resolve, reject) => {
      let stream = this.getStream()
      let chunks = []
      stream.on("data", chunk => chunks.push(chunk))
      stream.on("end", _ => resolve(Buffer.concat(chunks)))
      stream.on("error", err => reject(err))
    })
  }

  getStream() {
    let manifest = Object.getOwnPropertyDescriptor(this, "_manifest").value
    let options = Object.getOwnPropertyDescriptor(manifest, "_options").value
    if (!options.chunkBaseUri) throw new Error("<ManifestOptions>.chunkBaseUri is not defined")
    return new FileManifestStream(this)
  }

  toJSON() {
    let file: {[k: string]: any} = {
      Filename: this.Name,
      FileHash: [ ...this.Hash ].map(v => ("000" + v).substr(-3)).join("")
    }

    if (this.MetaFlags & EFileMetaFlags.UnixExecutable) file.bIsUnixExecutable = true
    if (this.MetaFlags & EFileMetaFlags.ReadOnly) file.bIsReadOnly = true
    if (this.MetaFlags & EFileMetaFlags.Compressed) file.bIsCompressed = true

    if (this.SymlinkTarget !== "") file.SymlinkTarget = this.SymlinkTarget
    else file.FileChunkParts = this.ChunkParts.map(chunk => chunk.toJSON())

    if (this.InstallTags.length) file.InstallTags = this.InstallTags

    return file
  }
}

export class FileChunkPart {
  Guid: string
  Offset: number
  Size: number

  constructor(chunk) {
    if (chunk instanceof FChunkPart) {
      this.Guid = chunk.Guid.toString()
      this.Offset = chunk.Offset
      this.Size = chunk.Size
    }
    else {
      this.Guid = chunk.Guid
      this.Offset = new FString(chunk.Offset).ToBlob()
      this.Size = new FString(chunk.Size).ToBlob()
    }
  }

  toJSON() {
    return {
      Guid: this.Guid,
      Offset: FString.ToStringBlob(this.Offset),
      Size: FString.ToStringBlob(this.Size)
    }
  }
}