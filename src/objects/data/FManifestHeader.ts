import { ManifestHeaderVersionSizes } from "../../enums/ManifestHeaderVersionSizes";
import { EManifestStorageFlags } from "../../enums/EManifestStorageFlags";
import { EFeatureLevel } from "../../enums/EFeatureLevel";

import { FArchive } from "../misc/FArchive";
import { FSHAHash } from "../misc/FSHAHash";

export class FManifestHeader {
  /* The manifest header magic codeword, for quick checking that the opened file is probably a manifest file. */
  static readonly MANIFEST_HEADER_MAGIC: number = 0x44BEC00C


  /* The version of this header and manifest data format, driven by the feature level. */
  Version: EFeatureLevel = EFeatureLevel.Latest
  /* The size of this header. */
  HeaderSize: number = 0
  /* The size of this data compressed. */
  DataSizeCompressed: number = 0
  /* The size of this data uncompressed. */
  DataSizeUncompressed: number = 0
  /* How the chunk data is stored. */
  StoredAs: EManifestStorageFlags = EManifestStorageFlags.None
  /* The SHA1 hash for the manifest data that follows. */
  SHAHash: FSHAHash = new FSHAHash()

  constructor(ar: FArchive) {
    /* Calculate how much space left in the archive for reading data ( will be 0 when writing ). */
    let startPos = ar.tell()
    let sizeLeft = ar.size - startPos
    let expectedBytes = 0

    /* Make sure the archive has enough data to read from, or we are saving instead. */
    let bSuccess = sizeLeft >= ManifestHeaderVersionSizes[EFeatureLevel.Original]
    if (bSuccess) {
      /* Start by loading the first version we had. */
      let magic = ar.readUInt32()
      this.HeaderSize = ar.readUInt32()
      this.DataSizeUncompressed = ar.readUInt32()
      this.DataSizeCompressed = ar.readUInt32()
      this.SHAHash = new FSHAHash(ar)
      this.StoredAs = ar.readUInt8()

      bSuccess = magic === FManifestHeader.MANIFEST_HEADER_MAGIC
      expectedBytes = ManifestHeaderVersionSizes[EFeatureLevel.Original]

      /* After the Original with no specific version serialized, the header size increased and we had a version to load. */
      if (bSuccess && this.HeaderSize > ManifestHeaderVersionSizes[EFeatureLevel.Original]) {
        this.Version = ar.readUInt32()
        expectedBytes = ManifestHeaderVersionSizes[EFeatureLevel.StoredAsBinaryData]
      }
      /* Otherwise, this header was at the version for a UObject class before this code refactor. */
      else if (bSuccess) {
        this.Version = EFeatureLevel.StoredAsCompressedUClass
      }
    }

    /* Make sure the expected number of bytes were serialized. In practice this will catch errors where type */
    /* serialization operators changed their format and that will need investigating. */
    bSuccess = bSuccess && (ar.tell() - startPos) === expectedBytes
    if (bSuccess) {
      /* Make sure the archive now points to data location. */
      ar.seek(startPos + this.HeaderSize)
    }
    else {
      /* If we had a serialization error when loading, zero out the header values. */
      this.Version = EFeatureLevel.Latest
      this.HeaderSize = 0
      this.DataSizeCompressed = 0
      this.DataSizeUncompressed = 0
      this.StoredAs = EManifestStorageFlags.None
      this.SHAHash = new FSHAHash()
    }
  }
}