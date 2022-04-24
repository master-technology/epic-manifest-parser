import { EManifestStorageFlags } from "../enums/EManifestStorageFlags";
import { EFeatureLevel } from "../enums/EFeatureLevel";

import { FFileManifestList } from "./data/FFileManifestList";
import { FManifestHeader } from "./data/FManifestHeader";
import { FChunkDataList } from "./data/FChunkDataList";
import { FCustomFields } from "./data/FCustomFields";
import { FManifestMeta } from "./data/FManifestMeta";

import { FArchive } from "./misc/FArchive";
import { toHex } from "./misc/HexUtils";

import { ManifestOptions } from "./ManifestOptions";
import { FileManifest } from "./FileManifest";

import crypto from "crypto";
import path from "path";
import zlib from "zlib";
import fs from "fs";

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
  FileManifestList: FileManifest[]
  ChunkHashList: object
  ChunkShaList: object
  DataGroupList: object
  ChunkFilesizeList: object
  CustomFields: object

  readonly Options: ManifestOptions = new ManifestOptions()

  constructor(data: Buffer, options?: ManifestOptions) {
    if (options) this.Options = options

    if (data instanceof Buffer) {
      let magic = data.readUInt32LE()
      if (magic === FManifestHeader.MANIFEST_HEADER_MAGIC) {
        let ar = new FArchive(data)

        let header = new FManifestHeader(ar, options.lazy)

        let bytes
        if ((header.StoredAs & EManifestStorageFlags.Encrypted) == EManifestStorageFlags.Encrypted) {
          throw new Error("Manifest is invalid: Data is encrypted");
        }
        else if ((header.StoredAs & EManifestStorageFlags.Compressed) == EManifestStorageFlags.Compressed) {
          let buf = ar.read(header.DataSizeCompressed)
          let decompressed = zlib.inflateSync(buf)
          bytes = decompressed
        }
        else if ((header.StoredAs & EManifestStorageFlags.Compressed) == EManifestStorageFlags.Compressed) {
          let buf = ar.read(header.DataSizeCompressed)
          bytes = buf
        }

        if (bytes.length != header.DataSizeUncompressed) {
          throw new Error(`Manifest is invalid: Data size mismatch (${bytes.length} != ${header.DataSizeUncompressed})`);
        }

        if (!options.lazy) {
          let hash = crypto.createHash("sha1").update(bytes).digest("hex").toUpperCase();
          if (hash !== header.SHAHash.toString()) throw new Error(`Manifest is corrupted (${hash} != ${header.SHAHash.toString()})`);
        }

        ar = new FArchive(bytes)
        let meta = new FManifestMeta(ar, options.lazy)
        let chunkData = new FChunkDataList(ar, options.lazy)
        let fileData = new FFileManifestList(ar, options.lazy)
        let customFields = new FCustomFields(ar)

        this.ManifestFileVersion                                       = meta.FeatureLevel
        this.bIsFileData                                               = meta.bIsFileData
        this.AppID                                                     = meta.AppID
        this.AppName                                                   = meta.AppName
        this.BuildVersion                                              = meta.BuildVersion
        this.BuildId                                                   = meta.BuildId
        this.LaunchExe                                                 = meta.LaunchExe
        this.LaunchCommand                                             = meta.LaunchCommand
        this.PrereqIds                                                 = meta.PrereqIds
        this.PrereqName                                                = meta.PrereqName
        this.PrereqPath                                                = meta.PrereqPath
        this.PrereqArgs                                                = meta.PrereqArgs
        this.ChunkHashList                                             = chunkData.ChunkList.reduce((acc, chunk) => {
          acc[chunk.Guid.toString()] = chunk.Hash
          return acc
        }, {})
        this.ChunkShaList                                              = chunkData.ChunkList.reduce((acc, chunk) => {
          acc[chunk.Guid.toString()] = chunk.ShaHash?.Hash || null
          return acc
        }, {})
        this.DataGroupList                                             = chunkData.ChunkList.reduce((acc, chunk) => {
          acc[chunk.Guid.toString()] = chunk.GroupNumber
          return acc
        }, {})
        this.ChunkFilesizeList                                         = chunkData.ChunkList.reduce((acc, chunk) => {
          acc[chunk.Guid.toString()] = chunk.FileSize
          return acc
        }, {})
        this.CustomFields                                              = Object.fromEntries(customFields.Fields)

        this.FileManifestList = fileData.FileList.map(file => new FileManifest(file, this))
      } else {
        throw new Error(`Manifest is invalid: Header magic mismatch (0x${toHex(magic)} != 0x${toHex(FManifestHeader.MANIFEST_HEADER_MAGIC)})`);
      }
    } else {
      throw new Error("Manifest constructor requires a buffer");
    }
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