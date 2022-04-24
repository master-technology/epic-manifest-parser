import { EFileManifestListVersion } from "../../enums/EFileManifestListVersion";

import { FFileManifest } from "./FFileManifest";
import { FChunkPart } from "./FChunkPart";

import { FArchive } from "../misc/FArchive";
import { FSHAHash } from "../misc/FSHAHash";

export class FFileManifestList {
  /* The list of files. */
  FileList: FFileManifest[]

  constructor(ar: FArchive, lazy: boolean) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readUInt8()
    let elementCount = ar.readInt32()

    this.FileList = [...Array(elementCount)].map(_ => new FFileManifest())

    /* Serialise the ManifestMetaVersion::Original version variables. */
    if (dataVersion >= EFileManifestListVersion.Original) {
      let names = ar.readArray(elementCount, () => ar.readFString())
      if (lazy) {
        for (let i = 0; i < elementCount; i++) // SymlinkTarget
          ar.skip(ar.readInt32())

        ar.skip(elementCount * FSHAHash.SIZE) // FileHash
        ar.skip(elementCount * 1) // FileMetaFlags

        for (let i = 0; i < elementCount; i++) {
          let count = ar.readUInt32();
          for (let j = 0; j < count; j++) { // InstallTags
            ar.skip(ar.readInt32())
          }
        }
      }
      else {
        var links = ar.readArray(elementCount, () => ar.readFString())
        var hashes = ar.readArray(elementCount, () => new FSHAHash(ar))
        var flags = ar.readArray(elementCount, () => ar.readUInt8())
        var tags = ar.readArray(elementCount, () => ar.readArray(() => ar.readFString()))
      }
      let chunks = ar.readArray(elementCount, () => ar.readArray(() => new FChunkPart(ar)))

      for (let i = 0; i < elementCount; i++) {
        this.FileList[i].Filename = names[i]
        this.FileList[i].SymlinkTarget = lazy ? null : links[i]
        this.FileList[i].FileHash = lazy ? null : hashes[i]
        this.FileList[i].FileMetaFlags = lazy ? null : flags[i]
        this.FileList[i].InstallTags = lazy ? null : tags[i]
        this.FileList[i].ChunkParts = chunks[i]
      }
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize)
    this.OnPostLoad()
  }

  OnPostLoad() {
    this.FileList = this.FileList.sort((a, b) => a.Filename > b.Filename ? 1 : -1)

    for (let file of this.FileList) {
      file.FileSize = file.ChunkParts.reduce((acc, c) => acc + c.Size, 0)
    }
  }
}