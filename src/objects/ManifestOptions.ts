import fs from "node:fs";

export class ManifestOptions {
  lazy: boolean = false
  chunkBaseUri: string = null
  cacheDirectory: string = null

  constructor(data: {[k: string]: any} = {}) {
    this.lazy = !!data.lazy
    this.chunkBaseUri = data.chunkBaseUri || null
    this.cacheDirectory = data.cacheDirectory || null

    if (this.cacheDirectory && !fs.existsSync(this.cacheDirectory)) fs.mkdirSync(this.cacheDirectory, { recursive: true })
  }
}
