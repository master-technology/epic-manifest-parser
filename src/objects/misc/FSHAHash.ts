import { FArchive } from "./FArchive";

export class FSHAHash {
  static readonly SIZE: number = 20
  Hash: Buffer = Buffer.alloc(FSHAHash.SIZE)

  constructor(ar: FArchive)
  constructor(buf: Buffer)
  constructor(buf: String)
  constructor()

  constructor(data?) {
    if (data instanceof FArchive) {
      let buf = data.read(FSHAHash.SIZE)
      buf.copy(this.Hash, 0, 0, FSHAHash.SIZE)
    } else if (data instanceof Buffer) {
      let buf = Buffer.alloc(20)
      buf.copy(this.Hash, 0, 0, FSHAHash.SIZE)
    } else if (typeof data === "string") {
      let buf = Buffer.from(data, 'hex');
      buf.copy(this.Hash, 0, 0, FSHAHash.SIZE);
    }
  }

  copyTo(buf: Buffer) {
    this.Hash.copy(buf, 0, 0, FSHAHash.SIZE)
  }

  toString() {
    return this.Hash.toString('hex').toUpperCase()
  }
}
