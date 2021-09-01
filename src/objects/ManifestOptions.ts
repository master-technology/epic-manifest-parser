import { existsSync, mkdirSync } from "fs";

export class ManifestOptions {
  chunkBaseUri: string
  cacheDirectory: string

  constructor(data: {[k: string]: any} = { chunkBaseUri: null, cacheDirectory: null }) {
    this.chunkBaseUri = data.chunkBaseUri
    this.cacheDirectory = data.cacheDirectory

    if (this.cacheDirectory && !existsSync(this.cacheDirectory)) mkdirSync(this.cacheDirectory, { recursive: true })
  }
}