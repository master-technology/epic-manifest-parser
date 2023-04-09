import { FManifestMeta } from "../data/FManifestMeta";

import crypto from "crypto";

export function GenerateNewBuildId(): string {
  let buf = Buffer.alloc(16)
  let base64 = buf.toString("base64")

  /* make it URI save */
  base64 = base64.replace(/\+/g, "-")
  base64 = base64.replace(/\//g, "_")

  /* trim = characters */
  base64 = base64.replace(/=/g, "")

  return base64
}

export function GetBackwardsCompatibleBuildId(data: FManifestMeta): string {
  let hash = crypto.createHash("sha1")

  let buf = Buffer.alloc(4)
  console.log("Data", data.AppID, typeof data.AppID);
  buf.writeUInt32LE(data.AppID)
  hash.update(buf)
  hash.update(Buffer.from(data.AppName))
  hash.update(Buffer.from(data.BuildVersion))
  hash.update(Buffer.from(data.LaunchExe))
  hash.update(Buffer.from(data.LaunchCommand))

  let base64 = hash.digest("base64")

  /* make it URI save */
  base64 = base64.replace(/\+/g, "-")
  base64 = base64.replace(/\//g, "_")

  /* trim = characters */
  base64 = base64.replace(/=/g, "")

  return base64
}
