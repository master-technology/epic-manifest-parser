import fs from "fs";

export class ManifestOptions {
  chunkBaseUri: string
  cacheDirectory: string

  constructor(data: {[k: string]: any} = { chunkBaseUri: null, cacheDirectory: null }) {
    this.chunkBaseUri = data.chunkBaseUri
    this.cacheDirectory = data.cacheDirectory

    if (this.cacheDirectory && !fs.existsSync(this.cacheDirectory)) fs.mkdirSync(this.cacheDirectory, { recursive: true })
  }
}