import { EFileManifestListVersion } from "../../enums/EFileManifestListVersion";

import { FFileManifest } from "./FFileManifest";
import { FChunkPart } from "./FChunkPart";

import { FArchive } from "../misc/FArchive";
import { FSHAHash } from "../misc/FSHAHash";
import { FSHA256Hash } from "../misc/FSHA256Hash";
import {EpicDecimalToHex} from "../misc/HexUtils";

export class FFileManifestList {
  /* The list of files. */
  FileList: FFileManifest[]

  constructor(data, lazy: boolean) {
    if (data instanceof FArchive) {
      this.#fromFArchive(data, lazy);
    } else {
      this.#fromJSON(data);
    }
  }

  #fromJSON(manifest) {
    this.FileList = [];
    for (let i=0;i<manifest.FileManifestList.length;i++) {
      let fileList = new FFileManifest();
      fileList.Filename = manifest.FileManifestList[i].Filename;
      fileList.FileHash = new FSHAHash(manifest.parsed ? manifest.FileManifestList[i].FileHash : EpicDecimalToHex(manifest.FileManifestList[i].FileHash));
      fileList.SymlinkTarget = manifest.SymlinkTarget || "";
      fileList.FileMetaFlags = manifest.FileMetaFlags || 0;
      fileList.InstallTags = manifest.InstallTags || [];
      fileList.mimeType = manifest.mimeType || "";
      fileList.md5Hash = manifest.md5Hash || "";
      if (manifest.sha256Hash && manifest.sha256Hash.length === 32) {
        fileList.sha256Hash = new FSHA256Hash(manifest.FileManifestList[i].sha256Hash);
      } else {
        fileList.sha256Hash = null;
      }

      fileList.ChunkParts = [];
      fileList.FileSize = 0;
      for (let j=0;j<manifest.FileManifestList[i].FileChunkParts.length;j++) {
        fileList.ChunkParts.push(new FChunkPart(manifest.FileManifestList[i].FileChunkParts[j], manifest.parsed));
      }
      this.FileList.push(fileList);
    }
    this.OnPostLoad();
  }

  #fromFArchive(ar: FArchive, lazy: boolean) {
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
        for (let i = 0; i < elementCount; i++) {
          // SymlinkTarget
          ar.skip(ar.readInt32())
        }

        ar.skip(elementCount * FSHAHash.SIZE) // FileHash
        ar.skip(elementCount * 1) // FileMetaFlags

        for (let i = 0; i < elementCount; i++) {
          let count = ar.readUInt32();
          for (let j = 0; j < count; j++) {
            // InstallTags
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

      let md5s=[], mimes=[], sha256s=[];
      if (!lazy) {
        if (dataVersion >= EFileManifestListVersion.MimeMD5Hash) {
          // Read MD5's if they exist
          for (let i = 0; i < elementCount; i++) {
            if (ar.readUInt32() === 0) {
              md5s.push(null);
            } else {
              md5s.push(ar.read(16).toString());
            }
          }
          mimes = ar.readArray(elementCount, () => ar.readFString())
        }

        if (dataVersion >= EFileManifestListVersion.SHA256Hash) {
          sha256s = ar.readArray(elementCount, () => new FSHA256Hash(ar))
        }
      }


      for (let i = 0; i < elementCount; i++) {
        this.FileList[i].Filename = names[i]
        this.FileList[i].SymlinkTarget = lazy ? null : links[i]
        this.FileList[i].FileHash = lazy ? null : hashes[i]
        this.FileList[i].FileMetaFlags = lazy ? null : flags[i]
        this.FileList[i].InstallTags = lazy ? null : tags[i]
        this.FileList[i].ChunkParts = chunks[i]
        this.FileList[i].md5Hash = lazy ? null : md5s[i];
        this.FileList[i].mimeType = lazy ? null : mimes[i];
        this.FileList[i].sha256Hash = lazy ? null : sha256s[i];
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
