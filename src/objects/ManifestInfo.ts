import { request } from "../misc/HTTPSUtils";
import crypto from "crypto";
import { join } from "path";
import fs from "fs";

export class ManifestInfo {
  BuildVersion: string
  LabelName: string
  Filename: string
  AppName: string
  Urls: string[]
  Hash: string

  constructor(data: string)
  constructor(obj: object)
  constructor(buf: Buffer)

  constructor(data) {
    if (data.constructor.name !== "Object") data = JSON.parse(data)

    if ("elements" in data) {
      data = data.elements[0]

      this.AppName = data.appName
      this.LabelName = data.labelName
      this.BuildVersion = data.buildVersion
      this.Hash = data.hash

      this.Urls = data.manifests.reduce((acc, c) => {
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
      this.AppName = data.appName
      this.LabelName = data.labelName
      this.BuildVersion = data.buildVersion

      let m = data.items.MANIFEST;
      this.Hash = m.hash
      this.Urls = [m.distribution + m.path + "?" + m.signature]
    }

    this.Filename = new URL(this.Urls[0]).pathname.split("/").pop()
  }

  async downloadManifestData(dir = null): Promise<Buffer> {
    let path = dir ? join(dir, this.Filename) : null;
    if (path && fs.existsSync(path)) return fs.readFileSync(path);

    let data = Buffer.alloc(0);
    for (let i = 0; i < this.Urls.length; i++) {
      let uri = this.Urls[i];

      let res = await request({ uri });
      if (res.status === 200) {
        data = Buffer.alloc(res.content.length);
        res.content.copy(data, 0, 0, res.content.length);
        break;
      }
    }

    if (!data) throw new Error("Failed to fetch manifest");

    let hash = crypto.createHash("sha1").update(data).digest("hex");
    if (hash !== this.Hash) throw new Error("Manifest is corrupted");

    if (path) fs.writeFileSync(path, data);
    return data;
  }
}