import { FArchive } from "../misc/FArchive";
import { FGuid } from "../misc/FGuid";
import {EpicReversedDecimalToNumber} from "../misc/HexUtils";

export class FChunkPart {
  /* The GUID of the chunk containing this part. */
  Guid: FGuid
  /* The offset of the first byte into the chunk. */
  Offset: number
  /* The size of this part. */
  Size: number

  constructor(data, parsed = false) {
    if (data instanceof FArchive) {
      this.#fromFArchive(data);
    } else {
        this.#fromJSON(data, parsed)
    }
  }


  #fromJSON(chunkData, parsed) {
    this.Guid = new FGuid(chunkData.Guid);
    if (parsed) {
        this.Offset = chunkData.Offset;
        this.Size = chunkData.Size;
    } else {
        this.Offset = EpicReversedDecimalToNumber(chunkData.Offset);
        this.Size = EpicReversedDecimalToNumber(chunkData.Size);
    }
  }

  #fromFArchive(ar: FArchive) {
      let startPos = ar.tell()
      let dataSize = ar.readUInt32()

      this.Guid = new FGuid(ar)
      this.Offset = ar.readUInt32()
      this.Size = ar.readUInt32()

      /* We must always make sure to seek the archive to the correct end location. Only seek if we must, to avoid a flush. */
      ar.seek(startPos + dataSize)
  }
}
