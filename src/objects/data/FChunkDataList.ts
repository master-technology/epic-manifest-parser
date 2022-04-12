import { EChunkDataListVersion } from "../../enums/EChunkDataListVersion";

import { FChunkInfo } from "./FChunkInfo";

import { FArchive } from "../misc/FArchive";
import { FSHAHash } from "../misc/FSHAHash";
import { FGuid } from "../misc/FGuid";

export class FChunkDataList {
  /* The list of chunks. */
  ChunkList: FChunkInfo[]

  constructor(ar: FArchive) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readUInt8()
    let elementCount = ar.readInt32()

    this.ChunkList = [...Array(elementCount)].map(_ => new FChunkInfo())

    /* For a struct list type of data, we serialise every variable as it's own flat list. */
    /* This makes it very simple to handle or skip, extra variables added to the struct later. */

    /* Serialise the ManifestMetaVersion::Original version variables. */
    if (dataVersion >= EChunkDataListVersion.Original) {
      let guids = ar.readArray(elementCount, () => new FGuid(ar))
      let hashes = ar.readArray(elementCount, () => ar.readUInt64())
      let shas = ar.readArray(elementCount, () => new FSHAHash(ar))
      let groups = ar.readArray(elementCount, () => ar.readInt8())
      let windows = ar.readArray(elementCount, () => ar.readInt32())
      let files = ar.readArray(elementCount, () => ar.readInt64())

      for (let i = 0; i < elementCount; i++) {
        this.ChunkList[i].Guid = guids[i]
        this.ChunkList[i].Hash = hashes[i]
        this.ChunkList[i].ShaHash = shas[i]
        this.ChunkList[i].GroupNumber = groups[i]
        this.ChunkList[i].WindowSize = windows[i]
        this.ChunkList[i].FileSize = files[i]
      }
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize)
  }
}