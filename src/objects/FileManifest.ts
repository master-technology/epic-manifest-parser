import { FileManifestStream } from "./FileManifestStream";
import { FileChunkPart } from "./FileChunkPart";
import { Manifest } from "./Manifest";

import { FFileManifest } from "./data/FFileManifest";

import { FSHAHash } from "./misc/FSHAHash";

export class FileManifest {
  Name: string
  Hash: Buffer

  Size: number
  SymlinkTarget: string
  Chunks: FileChunkPart[]

  MetaFlags: number
  Tags: string[]

  constructor(file: FFileManifest, manifest: Manifest) {
    this.Name = file.Filename;
    this.Hash = Buffer.alloc(FSHAHash.SIZE);
    if (file.FileHash != null) file.FileHash.copyTo(this.Hash);

    this.SymlinkTarget = file.SymlinkTarget;
    this.Chunks = file.ChunkParts.map(c => new FileChunkPart(c, manifest));
    this.Size = this.Chunks.reduce((acc, chunk) => acc + chunk.Size, 0);

    this.MetaFlags = file.FileMetaFlags;
    this.Tags = file.InstallTags;
  }

  getStream() { return new FileManifestStream(this) }
}