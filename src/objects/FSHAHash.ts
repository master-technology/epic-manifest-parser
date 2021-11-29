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

  toString(encoding: BufferEncoding = "base64") {
    return this.Hash.toString(encoding)
  }

  toJSON() {
    return this.toString()
  }
}