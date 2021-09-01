import FArchive from "./FArchive";
import FString from "./FString";

export default class FSHAHash {
  Hash: Buffer = Buffer.alloc(20)

  constructor(nums: number[])
  constructor(ar: FArchive)
  constructor()

  constructor(data?) {
    if (data instanceof FArchive) this.Hash = data.read(20)
    else if (data instanceof Array) this.Hash = Buffer.from(data)
  }

  ToHexString() {
    return this.Hash.toString("hex").toUpperCase()
  }

  toString() {
    return this.Hash.toString("base64")
  }

  toJSON() {
    return this.toString()
  }
}