/* https://github.com/EpicGames/UnrealEngine/blob/99b6e203a15d04fc7bbbf554c421a985c1ccb8f1/Engine/Source/Runtime/Online/BuildPatchServices/Private/BuildPatchUtil.cpp */

import FSHAHash from "../objects/FSHAHash";
import FString from "../objects/FString";
import FGuid from "../objects/FGuid";
import * as crypto from "crypto";
import {
  FManifestMeta
} from "../objects/ManifestData";

export function GenerateNewBuildId(): FString {
  let guid = FGuid.NewGuid()
  let buf = guid.getBuffer()

  let base64 = buf.toString("base64")

  /* make it URI save */
  base64 = base64.replace(/\+/g, "-")
  base64 = base64.replace(/\//g, "_")

  /* trim = characters */
  base64 = base64.replace(/=/g, "")

  return new FString(base64)
}

/* Not sure if its accurate */
export function GetBackwardsCompatibleBuildId(data: any): FString {
  /* https://github.com/EpicGames/UnrealEngine/blob/99b6e203a15d04fc7bbbf554c421a985c1ccb8f1/Engine/Source/Runtime/Online/BuildPatchServices/Private/BuildPatchUtil.cpp#L167 */
  if (data instanceof FManifestMeta) {
    let hash = crypto.createHash("sha1")
    hash.update(Buffer.from(FString.ToStringBlob(data.AppID).ToBlob(4, true)))
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

    return new FString(base64)
  }
  else if (data.constructor.name === "Object") {
    let hash = crypto.createHash("sha1")
    hash.update(Buffer.from(new FString(data.AppID).ToBlob(4, true)))
    hash.update(Buffer.from(data.AppNameString))
    hash.update(Buffer.from(data.BuildVersionString))
    hash.update(Buffer.from(data.LaunchExeString))
    hash.update(Buffer.from(data.LaunchCommand))

    let base64 = hash.digest("base64")

    /* make it URI save */
    base64 = base64.replace(/\+/g, "-")
    base64 = base64.replace(/\//g, "_")

    /* trim = characters */
    base64 = base64.replace(/=/g, "")

    return new FString(base64)
  }
  else {
    return null
  }
}