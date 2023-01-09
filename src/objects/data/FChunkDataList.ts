import { EChunkDataListVersion } from "../../enums/EChunkDataListVersion";

import { FChunkInfo } from "./FChunkInfo";

import { FArchive } from "../misc/FArchive";
import { FSHAHash } from "../misc/FSHAHash";
import { FGuid } from "../misc/FGuid";
import {EpicReversedDecimalToBigInt} from "../misc/HexUtils";

export class FChunkDataList {
  /* The list of chunks. */
  ChunkList: FChunkInfo[]

  constructor(data, lazy: boolean) {
    if (data instanceof FArchive) {
      this.#fromFArchive(data as FArchive, lazy);
    } else {
      this.#fromJSON(data);
    }
  }

  #fromJSON(manifest) {
    // Used to track the ChunkInfo by the GUID
    const elements = {};

    // An array of all Chunklists
    this.ChunkList = [];
    for (let elem in manifest.ChunkHashList) {
      if (!elements[elem]) {
        const chunkInfo = new FChunkInfo();
        chunkInfo.Guid = new FGuid(elem);
        chunkInfo.Hash = BigInt(manifest.ChunkHashList[elem]);
        elements[elem] = chunkInfo;
        this.ChunkList.push(chunkInfo);
      } else {
        console.error("Duplicate Chunk Guid", elem);
      }
    }
    if (manifest.parsed) {
      for (let elem in manifest.ChunkFilesizeList) {
        elements[elem].FileSize = BigInt(manifest.ChunkFilesizeList[elem]);
      }
    } else {
      for (let elem in manifest.ChunkFilesizeList) {
        elements[elem].FileSize = EpicReversedDecimalToBigInt(manifest.ChunkFilesizeList[elem]);
      }
    }

   for (let elem in manifest.DataGroupList) {
     elements[elem].GroupNumber = parseInt(manifest.DataGroupList[elem], 10);
   }
   for (let elem in manifest.ChunkShaList) {
      elements[elem].ShaHash = new FSHAHash(manifest.ChunkShaList[elem]);
   }
  }

  #fromFArchive(ar: FArchive, lazy: boolean): void {
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
      if (lazy) {
        ar.skip(elementCount * FSHAHash.SIZE) // ShaHash
      }
      else {
        var shas = ar.readArray(elementCount, () => new FSHAHash(ar))
      }
      let groups = ar.readArray(elementCount, () => ar.readInt8())
      if (lazy) {
        ar.skip(elementCount * 4) // WindowSize
        ar.skip(elementCount * 8) // FileSize
      }
      else {
        var windows = ar.readArray(elementCount, () => ar.readInt32())
        var files = ar.readArray(elementCount, () => ar.readInt64())
      }

      for (let i = 0; i < elementCount; i++) {
        this.ChunkList[i].Guid = guids[i]
        this.ChunkList[i].Hash = hashes[i]
        this.ChunkList[i].ShaHash = lazy ? null : shas[i]
        this.ChunkList[i].GroupNumber = groups[i]
        this.ChunkList[i].WindowSize = lazy ? null : windows[i]
        this.ChunkList[i].FileSize = lazy ? null : files[i]
      }
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize)
  }
}
