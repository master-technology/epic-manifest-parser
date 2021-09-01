import { existsSync, readFileSync, writeFileSync } from "fs";
import { ManifestOptions } from "./ManifestOptions";
import { request } from "../misc/HTTPSUtils";
import { createHash } from "crypto";
import { join } from "path";

export class ManifestInfo {
  buildVersion: string
  labelName: string
  filename: string
  appName: string
  hash: string
  urls: string[]

  private _options: ManifestOptions

  constructor(data: string, options?: ManifestOptions)
  constructor(data: object, options?: ManifestOptions)
  constructor(buf: Buffer, options?: ManifestOptions)

  constructor(data, options: ManifestOptions = new ManifestOptions()) {
    this._options = options

    if (data.constructor.name !== "Object") data = JSON.parse(data)

    if ("elements" in data) {
      data = data.elements[0]

      this.appName = data.appName
      this.labelName = data.labelName
      this.buildVersion = data.buildVersion
      this.hash = data.hash

      this.urls = data.manifests.reduce((acc, c) => {
        let url = c.uri;

        let querys = []
        let query = ""
        for (var q of c.queryParams) {
          if (query === "") query = "?"
          else query += "&"

          query += `${q.name}=${q.value}`
        }
        url += query;

        acc.push(url)
        return acc;
      }, [])
    }
    else {
      this.appName = data.appName
      this.labelName = data.labelName
      this.buildVersion = data.buildVersion

      let m = data.items.MANIFEST;
      this.hash = m.hash
      this.urls = [m.distribution + m.path + "?" + m.signature]
    }

    this.filename = new URL(this.urls[0]).pathname.split("/").pop()
  }

  async downloadManifestData() {
    let _file = this._options.cacheDirectory ? join(this._options.cacheDirectory, this.filename) : null
    if (_file && existsSync(_file)) return readFileSync(_file)

    let data, urls = this.urls;
    while (!data && urls.length) {
      let uri = urls.shift()

      let res = await request({ uri })
      if (res.status === 200) {
        data = Buffer.alloc(res.content.length)
        res.content.copy(data, 0, 0, res.content.length)
        break
      }
    }

    if (!data) throw new Error("Failed to grab manifest data")

    let hash = createHash("sha1").update(data).digest("hex")
    if (hash !== this.hash) throw new Error("Manifest hash missmatch")

    if (_file) writeFileSync(_file, data)
    return data
  }
}