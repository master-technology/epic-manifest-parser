import { EChunkDataListVersion } from "../../enums/EChunkDataListVersion";

import { FArchive } from "../misc/FArchive";

export class FCustomFields {
  /* The map of field name to field data. */
  Fields: Map<string, string>

  constructor(ar: FArchive) {
    /* Serialise the data header type values. */
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()
    let dataVersion = ar.readUInt8()
    let elementCount = ar.readInt32()

    this.Fields = new Map<string, string>()

    if (dataVersion >= EChunkDataListVersion.Original) {
      let keys = [...Array(elementCount)], values = [...Array(elementCount)]
      for (let i = 0; i < elementCount; i++) keys[i] = ar.readFString()
      for (let i = 0; i < elementCount; i++) values[i] = ar.readFString()

      for (let i = 0; i < elementCount; i++) this.Fields.set(keys[i], values[i])
    }

    /* We must always make sure to seek the archive to the correct end location. */
    ar.seek(startPos + dataSize)
  }
}