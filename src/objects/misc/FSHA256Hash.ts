import { FArchive } from "./FArchive";

export class FSHA256Hash {
  static readonly SIZE: number = 32
  Hash: Buffer = Buffer.alloc(FSHA256Hash.SIZE)

  constructor(ar: FArchive)
  constructor(buf: Buffer)
  constructor(buf: String)
  constructor()

  constructor(data?) {
    if (data instanceof FArchive) {
      let buf = data.read(FSHA256Hash.SIZE)
      buf.copy(this.Hash, 0, 0, FSHA256Hash.SIZE)
    } else if (data instanceof Buffer) {
      let buf = Buffer.alloc(20)
      buf.copy(this.Hash, 0, 0, FSHA256Hash.SIZE)
    } else if (typeof data === "string") {
      let buf = Buffer.from(data, 'hex');
      buf.copy(this.Hash, 0, 0, FSHA256Hash.SIZE);
    }
  }

  copyTo(buf: Buffer) {
    this.Hash.copy(buf, 0, 0, FSHA256Hash.SIZE)
  }

  toString() {
    return this.Hash.toString('hex').toUpperCase()
  }
}
