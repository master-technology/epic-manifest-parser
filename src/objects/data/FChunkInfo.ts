import { FSHAHash } from "../misc/FSHAHash";
import { FGuid } from "../misc/FGuid";

export class FChunkInfo {
  /* The GUID for this data. */
  Guid: FGuid
  /* The FRollingHash hashed value for this chunk data. */
  Hash: bigint = 0n
  /* The FSHA hashed value for this chunk data. */
  ShaHash: FSHAHash
  /* The group number this chunk divides into. */
  GroupNumber: number = 0
  /* The window size for this chunk. */
  WindowSize: number = 1048576
  /* The file download size for this chunk. */
  FileSize: bigint = 0n

  constructor() { }
}