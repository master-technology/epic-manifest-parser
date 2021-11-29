import { EChunkLoadResult } from "../enums/EChunkLoadResult";

import { existsSync, readFileSync, writeFileSync } from "fs";
import { ManifestOptions } from "./ManifestOptions";
import { request } from "../misc/HTTPSUtils";
import { FChunkHeader } from "./ChunkData";
import { FileManifest } from "./Manifest";
import FileChunk from "./FileChunk";
import { Readable } from "stream";
import FArchive from "./FArchive";
import { join } from "path";
import crypto from "crypto";

export class FileManifestStream extends Readable {
  _index: number = 0
  _chunks: FileChunk[]

  constructor(file) {
    super()

    Object.defineProperty(this, "_file", { value: file, enumerable: false });

    let manifest = Object.getOwnPropertyDescriptor(file, "_manifest").value
    let options = Object.getOwnPropertyDescriptor(manifest, "_options").value
    Object.defineProperty(this, "_options", { value: options, enumerable: false });

    let chunks = file.ChunkParts
    this._chunks = [...new Array(chunks.length)]
    for (var idx in chunks) {
      let i = Number(idx)
      let chunk = chunks[i]
      this._chunks[i] = manifest.Chunks.get(chunk.Guid)

      let prevChunk = i === 0 ? null : this._chunks[i - 1]
      this._chunks[i].Size = chunk.Size
      this._chunks[i].Start = prevChunk ? prevChunk.Start + prevChunk.Size : 0
      this._chunks[i].Offset = chunk.Offset
    }
  }

  async _read() {
    if (this._index >= this._chunks.length) return this.push(null)

    let chunk = this._chunks[this._index]
    let file = Object.getOwnPropertyDescriptor(this, "_file").value

    let options = Object.getOwnPropertyDescriptor(this, "_options").value
    let useCache = options.cacheDirectory && existsSync(options.cacheDirectory)
    let path = useCache ? join(options.cacheDirectory, chunk.Filename) : null

    let result = Buffer.alloc(chunk.Size)
    let resultSize = 0

    let buf = Buffer.alloc(0)

    if (useCache && existsSync(path)) {
      buf = readFileSync(path)
      resultSize = buf.copy(result, 0, chunk.Offset, chunk.Offset + chunk.Size)
    }
    else {
      let res = await request({ uri: options.chunkBaseUri + (options.chunkBaseUri.endsWith("/") ? "" : "/") + chunk.Url })
      if (res.status === 200) {
        let ar = new FArchive(res.content)
        let header = new FChunkHeader(ar)

        let loadResult = EChunkLoadResult.None;
        [ loadResult, buf ] = header.load()
        if (loadResult === EChunkLoadResult.Success) {
          resultSize = buf.copy(result, 0, chunk.Offset, chunk.Offset + chunk.Size)
          if (useCache && !existsSync(path)) writeFileSync(path, buf)
        }
        else throw new Error(`Failed to load chunk header at index ${this._index} for '${file.Name}', result '${EChunkLoadResult[loadResult]}'`)
      }
      else throw new Error(`Failed to request chunk header at index ${this._index} for '${file.Name}', status '${res.status}'`)
    }

    if (!resultSize || resultSize !== chunk.Size) throw new Error(`Failed to load chunk at index ${this._index} for '${file.Name}'`)

    let hash = crypto.createHash("sha1").update(buf).digest("hex").toUpperCase()
    if (hash !== chunk.Sha) throw new Error(`Chunk hash missmatch at index ${this._index} for '${file.Name}'`)

    this._index++
    this.push(result)
  }
}