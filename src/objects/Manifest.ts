import {EManifestStorageFlags} from "../enums/EManifestStorageFlags";
import {EFeatureLevel} from "../enums/EFeatureLevel";

import {FFileManifestList} from "./data/FFileManifestList";
import {FManifestHeader} from "./data/FManifestHeader";
import {FChunkDataList} from "./data/FChunkDataList";
import {FCustomFields} from "./data/FCustomFields";
import {FManifestMeta} from "./data/FManifestMeta";

import {FArchive} from "./misc/FArchive";
import {toHex} from "./misc/HexUtils";

import {ManifestOptions} from "./ManifestOptions";
import {FileManifest} from "./FileManifest";

import * as crypto from "node:crypto";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as fs from "node:fs";

export class Manifest {
  ManifestFileVersion: number
  bIsFileData: boolean
  AppID: number
  AppName: string
  BuildVersion: string
  BuildId: string
  LaunchExe: string
  LaunchCommand: string
  PrereqIds: string[]
  PrereqName: string
  PrereqPath: string
  PrereqArgs: string
  uninstallExe: string
  uninstallCommand: string
  FileManifestList: FileManifest[]
  ChunkHashList: object
  ChunkShaList: object
  DataGroupList: object
  ChunkFilesizeList: object
  CustomFields: object

  readonly Options: ManifestOptions = new ManifestOptions()

  constructor(data: Buffer | any | string, options?: ManifestOptions) {
    if (options) this.Options = options

    let meta, chunkData, fileData, customFields, manifestData;

    // Is this a JSON Manifest -- JSON based Manifest Starts with { and ends with }
    if (data instanceof Buffer && data.length > 1 && data[0] === 123 && data[data.length-1] === 125) {
      // JSON Manifest (in buffer)
      manifestData = JSON.parse(data.toString());
    } else if (typeof data === 'string' && data.length > 1 && data[0] === '{' && data[data.length-1] === '}') {
      // JSON Manifest
      manifestData = JSON.parse(data);
    } else if (typeof data.ManifestFileVersion !== 'undefined') {
       // Manifest Object from JSON
       manifestData = data;
    } else if (data instanceof Buffer) {
        // Binary Manifest
        let magic = data.readUInt32LE()
        if (magic === FManifestHeader.MANIFEST_HEADER_MAGIC) {
          let ar = new FArchive(data)

          let header = new FManifestHeader(ar, options.lazy)

          let bytes;
          if ((header.StoredAs & EManifestStorageFlags.Encrypted) == EManifestStorageFlags.Encrypted) {
            throw new Error("Manifest is invalid: Data is encrypted");
          } else if ((header.StoredAs & EManifestStorageFlags.Compressed) == EManifestStorageFlags.Compressed) {
            let buf = ar.read(header.DataSizeCompressed)
            bytes = zlib.inflateSync(buf)
          } else if ((header.StoredAs & EManifestStorageFlags.Compressed) == EManifestStorageFlags.Compressed) {
            bytes = ar.read(header.DataSizeCompressed)
          }

          if (bytes.length != header.DataSizeUncompressed) {
            throw new Error(`Manifest is invalid: Data size mismatch (${bytes.length} != ${header.DataSizeUncompressed})`);
          }

          if (!options.lazy) {
            let hash = crypto.createHash("sha1").update(bytes).digest("hex").toUpperCase();
            if (hash !== header.SHAHash.toString()) throw new Error(`Manifest is corrupted (${hash} != ${header.SHAHash.toString()})`);
          }

          ar = new FArchive(bytes)
          meta = new FManifestMeta(ar, options.lazy)
          chunkData = new FChunkDataList(ar, options.lazy)
          fileData = new FFileManifestList(ar, options.lazy)
          customFields = new FCustomFields(ar)
        } else {
          throw new Error(`Manifest is invalid: Header magic mismatch (0x${toHex(magic)} != 0x${toHex(FManifestHeader.MANIFEST_HEADER_MAGIC)})`);
        }
    } else {
      throw new Error("Manifest constructor requires a buffer or a JSON Manifest");
    }

    if (manifestData) {
      manifestData.parsed = typeof manifestData.ManifestFileVersion !== "string";

      meta = new FManifestMeta(manifestData, options.lazy);
      chunkData = new FChunkDataList(manifestData, options.lazy);
      fileData = new FFileManifestList(manifestData, options.lazy);
      customFields = new FCustomFields(manifestData);
    }

    // Do We have all the data parsed
    if (meta && chunkData && fileData && customFields) {
      this.ManifestFileVersion = meta.FeatureLevel
      this.bIsFileData = meta.bIsFileData
      this.AppID = meta.AppID
      this.AppName = meta.AppName
      this.BuildVersion = meta.BuildVersion
      this.BuildId = meta.BuildId
      this.uninstallExe = meta.UninstallExe
      this.uninstallCommand = meta.UninstallCommand
      this.LaunchExe = meta.LaunchExe
      this.LaunchCommand = meta.LaunchCommand
      this.PrereqIds = meta.PrereqIds
      this.PrereqName = meta.PrereqName
      this.PrereqPath = meta.PrereqPath
      this.PrereqArgs = meta.PrereqArgs
      this.ChunkHashList = chunkData.ChunkList.reduce((acc, chunk) => {
        acc[chunk.Guid.toString()] = chunk.Hash
        return acc
      }, {})
      this.ChunkShaList = chunkData.ChunkList.reduce((acc, chunk) => {
        acc[chunk.Guid.toString()] = chunk.ShaHash?.Hash || null
        return acc
      }, {})
      this.DataGroupList = chunkData.ChunkList.reduce((acc, chunk) => {
        acc[chunk.Guid.toString()] = chunk.GroupNumber
        return acc
      }, {})
      this.ChunkFilesizeList = chunkData.ChunkList.reduce((acc, chunk) => {
        acc[chunk.Guid.toString()] = chunk.FileSize
        return acc
      }, {})
      this.CustomFields = Object.fromEntries(customFields.Fields)

      this.FileManifestList = fileData.FileList.map(file => new FileManifest(file, this))
    } else {
      throw new Error("Manifest failed to be parsed properly");
    }
}

  toJSON() {
    return {
      ManifestFileVersion: this.ManifestFileVersion, bIsFileData: this.bIsFileData,
      AppID: this.AppID, AppNameString: this.AppName, BuildVersionString: this.BuildVersion,
      BuildId: this.BuildId, LaunchExeString: this.LaunchExe, LaunchCommand: this.LaunchCommand,
      PrereqIds: this.PrereqIds, PrereqName: this.PrereqName, PrereqPath: this.PrereqPath,
      PrereqArgs: this.PrereqArgs,
      uninstallExe: this.uninstallExe, uninstallCommand: this.uninstallCommand,
      FileManifestList: this.FileManifestList,
      ChunkHashList: this.ChunkHashList, ChunkShaList: this.ChunkShaList,
      DataGroupList: this.DataGroupList, ChunkFilesizeList: this.ChunkFilesizeList,
      CustomFields: this.CustomFields
    };
  }

  deleteUnusedChunks() {
    let dir = this.Options.cacheDirectory
    if (!dir || !fs.existsSync(dir)) return [ -1, -1 ]

    let guids = Object.keys(this.ChunkHashList)
    let chunks = guids.map(guid => `${toHex(this.ChunkHashList[guid])}_${guid}.chunk`)

    let count = 0
    let size = 0

    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.chunk'))) {
      if (chunks.includes(file)) continue
      try {
        let fpath = path.join(dir, file)
        let length = fs.lstatSync(fpath).size
        fs.unlinkSync(fpath)
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
    return this.ManifestFileVersion < EFeatureLevel.DataFileRenames ? "Chunks"
				: this.ManifestFileVersion < EFeatureLevel.ChunkCompressionSupport ? "ChunksV2"
				: this.ManifestFileVersion < EFeatureLevel.VariableSizeChunksWithoutWindowSizeChunkInfo ? "ChunksV3"
				: "ChunksV4";
  }
}
