import { existsSync, readFileSync, writeFileSync } from "fs";
import { ManifestOptions } from "./ManifestOptions";
import { request } from "../misc/HTTPSUtils";
import { FChunkHeader } from "./ChunkData";
import { FileManifest } from "./Manifest";
import { Readable } from "stream";
import FArchive from "./FArchive";
import FString from "./FString";
import { join } from "path";

export class FileManifestStream extends Readable {
  _options: ManifestOptions
  _file: FileManifest

  _chunks: any[]

  _length: number = 0
  _index: number = 0

  constructor(file) {
    super()

    this._file = file
    this._length = file.Size
    this._options = file._manifest._manifestOptions

    let chunks = file.ChunkParts
    this._chunks = [...new Array(chunks.length)]
    for (var idx in chunks) {
      let i = Number(idx)
      let chunk = chunks[i]

      let prevChunk = i === 0 ? null : this._chunks[i - 1]

      let group = file._manifest.DataGroupList[chunk.Guid].slice(-2)
      let hash = file._manifest.ChunkHashList[chunk.Guid]

      this._chunks[i] = {
        offset: chunk.Offset,
        guid: chunk.Guid,
        size: chunk.Size,

        start: i === 0 ? 0 : prevChunk.start + prevChunk.size,

        group,
        hash,

        url: `${group}/`,
        fileName: `${hash}_${chunk.Guid}.chunk`
      }
      this._chunks[i].url += this._chunks[i].fileName
    }
  }

  async _read(size) {
    if (this._index >= this._chunks.length) return this.push(null)

    let chunk = this._chunks[this._index]

    let _path = join(this._options.cacheDirectory || "", chunk.fileName)
    let data = Buffer.alloc(chunk.offset + chunk.size)

    if (this._options.cacheDirectory && existsSync(_path)) {
      data = readFileSync(_path)
    }
    else {
      let res = await request({ uri: this._options.chunkBaseUri + (this._options.chunkBaseUri.endsWith("/") ? "" : "/") + chunk.url })
      if (res.status === 200) {
        let ar = new FArchive(res.content)
        let header = new FChunkHeader(ar)

        data = header.load(chunk)

        writeFileSync(_path, data)
      }
    }

    this.push(data.slice(chunk.offset, chunk.offset + chunk.size))
    this._index++
  }
}