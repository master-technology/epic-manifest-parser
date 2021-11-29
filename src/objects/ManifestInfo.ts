import { request } from "../misc/HTTPSUtils";
import crypto from "crypto";
import { join } from "path";
import fs from "fs";

export class ManifestInfo {
  buildVersion: string
  labelName: string
  filename: string
  appName: string
  hash: string
  urls: string[]

  constructor(data: string)
  constructor(obj: object)
  constructor(buf: Buffer)

  constructor(data) {
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

  async downloadManifestData(dir = null) {
    let path = dir ? join(dir, this.filename) : null
    if (path && fs.existsSync(path)) return fs.readFileSync(path)

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

    if (!data) throw new Error("Failed to fetch manifest")

    let hash = crypto.createHash("sha1").update(data).digest("hex")
    if (hash !== this.hash) throw new Error("Manifest is corrupted")

    if (path) fs.writeFileSync(path, data)
    return data
  }
}