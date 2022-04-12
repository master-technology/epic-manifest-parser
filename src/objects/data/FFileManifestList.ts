import { EFileManifestListVersion } from "../../enums/EFileManifestListVersion";

import { FFileManifest } from "./FFileManifest";
import { FChunkPart } from "./FChunkPart";

import { FArchive } from "../misc/FArchive";
import { FSHAHash } from "../misc/FSHAHash";

export class FFileManifestList {
  /* The list of files. */
  FileList: FFileManifest[]

  constructor(ar: FArchive) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readUInt8()
    let elementCount = ar.readInt32()

    this.FileList = [...Array(elementCount)].map(_ => new FFileManifest())

    /* Serialise the ManifestMetaVersion::Original version variables. */
    if (dataVersion >= EFileManifestListVersion.Original) {
      let names = ar.readArray(elementCount, () => ar.readFString())
      let links = ar.readArray(elementCount, () => ar.readFString())
      let hashes = ar.readArray(elementCount, () => new FSHAHash(ar))
      let flags = ar.readArray(elementCount, () => ar.readUInt8())
      let tags = ar.readArray(elementCount, () => ar.readArray(() => ar.readFString()))
      let chunks = ar.readArray(elementCount, () => ar.readArray(() => new FChunkPart(ar)))

      for (let i = 0; i < elementCount; i++) {
        this.FileList[i].Filename = names[i]
        this.FileList[i].SymlinkTarget = links[i]
        this.FileList[i].FileHash = hashes[i]
        this.FileList[i].FileMetaFlags = flags[i]
        this.FileList[i].InstallTags = tags[i]
        this.FileList[i].ChunkParts = chunks[i]
      }
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize)
    this.OnPostLoad()
  }

  OnPostLoad() {
    this.FileList = this.FileList.sort((a, b) => a.Filename > b.Filename ? 1 : -1)

    for (let FileManifest of this.FileList) {
      FileManifest.FileSize = FileManifest.ChunkParts.reduce((acc, c) => acc + c.Size, 0)
    }
  }
}