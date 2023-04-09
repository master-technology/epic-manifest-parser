import { EChunkLoadResult } from "../enums/EChunkLoadResult";

import { Manifest } from "./Manifest";
import { ManifestOptions } from "./ManifestOptions";

import { FChunkHeader } from "./data/FChunkHeader";
import { FChunkPart } from "./data/FChunkPart";

import { FRollingHash } from "./misc/FRollingHash";
import { FArchive } from "./misc/FArchive";
import { request } from "./misc/HTTPSUtils";
import { toHex } from "./misc/HexUtils";

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
  Data = null;

  readonly #options: ManifestOptions

  constructor(chunk: FChunkPart, manifest: Manifest) {
    this.#options = manifest.Options;

    this.Guid = chunk.Guid.toString();
    this.Offset = chunk.Offset;
    this.Size = chunk.Size;

    this.Hash = toHex(manifest.ChunkHashList[this.Guid]);
    if (this.#options.lazy) {
      this.Sha = null
    }
    else {
      this.Sha = toHex(manifest.ChunkShaList[this.Guid], 20);
    }
    this.DataGroup = ('00' + manifest.DataGroupList[this.Guid].toString()).substr(-2);

    this.Filename = `${this.Hash}_${this.Guid}.chunk`;
    this.Url = `${this.DataGroup}/${this.Filename}`;
  }

  clearData() {
    this.Data = null;
  }

  async loadData(): Promise<Buffer> {
    let { cacheDirectory: dir, lazy } = this.#options
    let path = dir != null ? join(dir, this.Filename) : null

    let data = Buffer.alloc(0)
    if (path != null && fs.existsSync(path)) {
      if (this.Data) {
        data = this.Data;
      } else {
        data = fs.readFileSync(path)

        if (!lazy) {
          let hash = toHex(FRollingHash.GetHashForDataSet(data));
          if (hash != this.Hash) {
            throw new Error(`Chunk '${this.Filename}' is corrupted: Hash mismatch (${hash} != ${this.Hash})`);
          }

          // We have No SHA
          if (this.Sha !== "00000000000000000000") {
            let sha = crypto.createHash("sha1").update(data).digest("hex").toUpperCase()
            if (sha != this.Sha) {
              throw new Error(`Chunk '${this.Filename}' is corrupted: Sha mismatch (${sha} != ${this.Sha})`);
            }
          }
        }
        this.Data = data;
      }
    } else {
      if (this.#options.chunkBaseUri == null) {
        throw new Error("'<ManifestOptions>.chunkBaseUri' can not be empty for downloading chunks");
      }

      let url = this.#options.chunkBaseUri + (this.#options.chunkBaseUri.endsWith("/") ? "" : "/") + this.Url;
      let res = await request({ uri: url })
      if (res.status != 200) {
        console.log("url failed to download", url);
        throw new Error(`Failed to download '${this.Filename}': Request failed with status '${res.status}'`);
      }

      let ar = new FArchive(res.content)
      let magic = ar.readUInt32()
      if (magic != FChunkHeader.MAGIC) {
        throw new Error(`Chunk '${this.Filename}' is invalid: Header magic mismatch (0x${toHex(magic)} != 0x${toHex(FChunkHeader.MAGIC)})`);
      }
      ar.seek(0)

      let header = new FChunkHeader(ar, lazy)
      let [ status, buf ] = header.load(ar, lazy)
      if (status != EChunkLoadResult.Success) {
        throw new Error(`Chunk '${this.Filename}' is invalid: Load result 'EChunkLoadResult::${EChunkLoadResult[status]}'`);
      }

      data = buf
      if (path != null) fs.writeFileSync(path, data)
      this.Data = data;
    }

    let result = Buffer.alloc(this.Size)
    data.copy(result, 0, this.Offset, this.Offset + this.Size)
    return result
  }
}
