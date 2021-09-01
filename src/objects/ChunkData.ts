/* https://github.com/EpicGames/UnrealEngine/blob/99b6e203a15d04fc7bbbf554c421a985c1ccb8f1/Engine/Source/Runtime/Online/BuildPatchServices/Private/Data/ChunkData.cpp */

import { ChunkHeaderVersionSizes } from "../enums/ChunkHeaderVersionSizes";
import { EChunkStorageFlags } from "../enums/EChunkStorageFlags";
import { EChunkHashFlags } from "../enums/EChunkHashFlags";
import { EChunkVersion } from "../enums/EChunkVersion";

import { FileChunkPart } from "./Manifest";
import { inflateSync } from "zlib";
import FArchive from "./FArchive";
import FSHAHash from "./FSHAHash";
import FGuid from "./FGuid";

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

export class FChunkPart {
  /* The GUID of the chunk containing this part. */
  Guid: FGuid
	/* The offset of the first byte into the chunk. */
  Offset: number
	/* The size of this part. */
  Size: number

  constructor(ar: FArchive) {
    let startPos = ar.tell()
    let dataSize = ar.readUInt32()

    this.Guid = new FGuid(ar)
    this.Offset = ar.readUInt32()
    this.Size = ar.readUInt32()

    /* We must always make sure to seek the archive to the correct end location. Only seek if we must, to avoid a flush. */
    ar.seek(startPos + dataSize)
  }
}

export class FChunkHeader {
  /* The chunk header magic codeword, for quick checking that the opened file is a chunk file. */
  readonly CHUNK_HEADER_MAGIC: number =  0xB1FE3AA2


  /* The version of this header data. */
  Version: EChunkVersion = EChunkVersion.Latest
	/* The size of this header. */
  HeaderSize: number = ChunkHeaderVersionSizes[EChunkVersion.Latest]
	/* The GUID for this data. */
  Guid: FGuid
	/* The size of this data compressed. */
  DataSizeCompressed: number = 0
	/* The size of this data uncompressed. */
  DataSizeUncompressed: number = 1024 * 1024
	/* How the chunk data is stored. */
  StoredAs: EChunkStorageFlags = EChunkStorageFlags.None
	/* What type of hash we are using. */
  HashType: EChunkHashFlags = EChunkHashFlags.RollingPoly64
	/* The FRollingHash hashed value for this chunk data. */
  RollingHash: bigint = 0n
	/* The FSHA hashed value for this chunk data. */
  SHAHash: FSHAHash

  _ar: FArchive

  constructor(ar: FArchive) {
    this._ar = ar

    /* Calculate how much space left in the archive for reading data ( will be 0 when writing ). */
    let startPos = ar.tell()
    let sizeLeft = ar.size - startPos
    let expectedBytes = 0

    /* Make sure the archive has enough data to read from, or we are saving instead. */
    let bSuccess = sizeLeft >= ChunkHeaderVersionSizes[EChunkVersion.Original]
    if (bSuccess) {
      let magic = ar.readUInt32()
      this.Version = ar.readEnum(EChunkVersion, ar.readUInt32())
      this.HeaderSize = ar.readUInt32()
      this.DataSizeCompressed = ar.readUInt32()
      this.Guid = new FGuid(ar)
      this.RollingHash = ar.readUInt64()
      this.StoredAs = ar.readEnum(EChunkStorageFlags)

      bSuccess = magic === this.CHUNK_HEADER_MAGIC
      expectedBytes = ChunkHeaderVersionSizes[EChunkVersion.Original]

      /* From version 2, we have a hash type choice. Previous versions default as only rolling. */
      if (bSuccess && this.Version >= EChunkVersion.StoresShaAndHashType) {
        bSuccess = sizeLeft >= ChunkHeaderVersionSizes[EChunkVersion.StoresShaAndHashType]
        if (bSuccess) {
          this.SHAHash = new FSHAHash(ar)
          this.HashType = ar.readEnum(EChunkHashFlags)
        }
        expectedBytes = ChunkHeaderVersionSizes[EChunkVersion.StoresShaAndHashType]
      }

      /* From version 3, we have an uncompressed data size. Previous versions default to 1 MiB (1048576 B). */
			if (bSuccess && this.Version >= EChunkVersion.StoresDataSizeUncompressed) {
        bSuccess = sizeLeft >= ChunkHeaderVersionSizes[EChunkVersion.StoresDataSizeUncompressed]
        if (bSuccess) {
          this.DataSizeUncompressed = ar.readUInt32()
        }
        expectedBytes = ChunkHeaderVersionSizes[EChunkVersion.StoresDataSizeUncompressed];
      }
    }

    /* Make sure the expected number of bytes were serialized. In practice this will catch errors where type */
		/* serialization operators changed their format and that will need investigating. */
    bSuccess = bSuccess && (ar.tell() - startPos) === expectedBytes
    if (bSuccess) {
      /* Make sure the archive now points to data location. Only seek if we must, to avoid a flush. */
      ar.seek(startPos + this.HeaderSize)
    }
    else {
      /* If we had a serialization error when loading, zero out the header values. */
      this.Version = EChunkVersion.Latest
      this.HeaderSize = ChunkHeaderVersionSizes[EChunkVersion.Latest]
      this.Guid = new FGuid()
      this.DataSizeCompressed = 0
      this.DataSizeUncompressed = 1024 * 1024
      this.StoredAs = EChunkStorageFlags.None
      this.HashType = EChunkHashFlags.RollingPoly64
      this.RollingHash = 0n
      this.SHAHash = new FSHAHash()
    }
  }

  load(chunk: FileChunkPart): Buffer {
    this._ar.seek(this.HeaderSize)

    let buf = this._ar.read(this.DataSizeCompressed)

    if (this.StoredAs & EChunkStorageFlags.Compressed) {
      let data = inflateSync(buf)
      buf = data
    }

    return buf
  }
}