import { EChunkLoadResult } from "../enums/EChunkLoadResult";

import { request } from "../misc/HTTPSUtils";

import { Manifest } from "./Manifest";
import { ManifestOptions } from "./ManifestOptions";

import { FChunkHeader } from "./data/FChunkHeader";
import { FChunkPart } from "./data/FChunkPart";

import { FArchive } from "./misc/FArchive";

import { join } from "path";
import crypto from "crypto";
import fs from "fs";

export class FileChunkPart {
  Guid: string
  Offset: number
  Size: number

  Hash: string
  Sha: string
  DataGroup: string

  Filename: string
  Url: string

  _options: ManifestOptions

  constructor(chunk: FChunkPart, manifest: Manifest) {
    this._options = manifest.Options;

    this.Guid = chunk.Guid.toString();
    this.Offset = chunk.Offset;
    this.Size = chunk.Size;

    this.Hash = manifest.ChunkHashList[this.Guid].toString(16).padStart(16, "0").toUpperCase();
    this.Sha = manifest.ChunkShaList[this.Guid].toString('hex').toUpperCase();
    this.DataGroup = manifest.DataGroupList[this.Guid].toString();

    this.Filename = `${this.Hash}_${this.Guid}.chunk`;
    this.Url = `${this.DataGroup}/${this.Filename}`;
  }

  async loadData(): Promise<Buffer> {
    let dir = this._options.cacheDirectory
    let path = dir != null ? join(dir, this.Filename) : null

    let data = Buffer.alloc(0)
    if (path != null && fs.existsSync(path)) {
      data = fs.readFileSync(path)

      // TODO: implement 'FRollingHash::GetHashForDataSet'
      // let hash = FRollingHash.GetHashForDataSet(buf);
      // if (hash.toString("hex") != this.Hash) {
      //   throw new Error(`Chunk '${this.Filename}' is corrupted: Hash mismatch`);
      // }

      let sha = crypto.createHash("sha1").update(data).digest("hex").toUpperCase()
      if (sha != this.Sha) {
        throw new Error(`Chunk '${this.Filename}' is corrupted: Sha mismatch`);
      }
    } else {
      if (this._options.chunkBaseUri == null) {
        throw new Error("'<ManifestOptions>.chunkBaseUri' can not be empty for downloading chunks");
      }

      let res = await request({ uri: this._options.chunkBaseUri + (this._options.chunkBaseUri.endsWith("/") ? "" : "/") + this.Url })
      if (res.status != 200) {
        throw new Error(`Failed to download '${this.Filename}': Request failed with status '${res.status}'`);
      }

      let ar = new FArchive(res.content)
      if (ar.readUInt32() != FChunkHeader.MAGIC) {
        throw new Error(`Chunk '${this.Filename}' is invalid: Header magic mismatch`);
      }
      ar.seek(0)

      let header = new FChunkHeader(ar)
      let [ status, buf ] = header.load(ar)
      if (status != EChunkLoadResult.Success) {
        throw new Error(`Chunk '${this.Filename}' is invalid: Load result error '${EChunkLoadResult[status]}'`);
      }

      data = buf
      if (path != null) fs.writeFileSync(path, data)
    }

    let result = Buffer.alloc(this.Size)
    data.copy(result, 0, this.Offset, this.Offset + this.Size)
    return result
  }
}