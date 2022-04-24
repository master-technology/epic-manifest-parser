import * as https from "https";

export function request({ uri, method = "get", headers = {}, body = null }): Promise<Response> {
  return new Promise((resolve, reject) => {
    let url = new URL(uri)
    let req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers
    }, (res) => {
      let chunks = []
      res.on("data", (chunk) => chunks.push(chunk))
      res.on("end", () => resolve(new Response(
        res.statusCode,
        res.headers,
        Buffer.concat(chunks)
      )))
    })
    req.on("error", (err) => reject(err))

    if (body) req.write(body);
    req.end();
  });
}

export class Response {
  status: number
  headers: object
  content: Buffer

  constructor(inStatus, inHeaders, inContent) {
    this.status = inStatus
    this.headers = inHeaders
    this.content = inContent
  }
}