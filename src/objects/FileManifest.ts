import { FileManifestStream } from "./FileManifestStream";
import { FileChunkPart } from "./FileChunkPart";
import { Manifest } from "./Manifest";

import { FFileManifest } from "./data/FFileManifest";

import { FSHAHash } from "./misc/FSHAHash";
import {FSHA256Hash} from "./misc/FSHA256Hash";

export class FileManifest {
  Name: string
  Hash: Buffer

  Size: number
  SymlinkTarget: string
  Chunks: FileChunkPart[]

  MetaFlags: number
  Tags: string[]

  md5Hash: string
  mimeType: string
  sha256Hash: Buffer


  constructor(file: FFileManifest, manifest: Manifest) {
    this.Name = file.Filename;
    this.Hash = Buffer.alloc(FSHAHash.SIZE);
    if (file.FileHash != null) file.FileHash.copyTo(this.Hash);

    this.SymlinkTarget = file.SymlinkTarget;
    this.Chunks = file.ChunkParts.map(c => new FileChunkPart(c, manifest));
    this.Size = this.Chunks.reduce((acc, chunk) => acc + chunk.Size, 0);

    this.MetaFlags = file.FileMetaFlags;
    this.Tags = file.InstallTags;

    this.md5Hash = file.md5Hash;
    this.mimeType = file.mimeType;
    this.sha256Hash = Buffer.alloc(FSHA256Hash.SIZE);
    if (file.sha256Hash != null) file.sha256Hash.copyTo(this.sha256Hash);
  }

  toJSON() {
    return {
      Filename: this.Name,
      FileHash: this.Hash,
      SymlinkTarget: this.SymlinkTarget,
      FileChunkParts: this.Chunks,
      MetaFlags: this.MetaFlags,
      Tags: this.Tags,
      md5Hash: this.md5Hash,
      mimeType: this.mimeType,
      sha256Hash: this.sha256Hash
    }
  }

  getStream() { return new FileManifestStream(this) }
}
