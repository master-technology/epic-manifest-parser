import FArchive from "./FArchive";

export default class FGuid {
  readonly A: number
  readonly B: number
  readonly C: number
  readonly D: number

  constructor(a: number, b: number, c: number, d: number)
  constructor(hexString: string)
  constructor(ar: FArchive)
  constructor()

  constructor(...params) {
    if (!params.length) this.A = this.B = this.C = this.D = 0
    else if (params.length === 4) {
      this.A = params[0]
      this.B = params[1]
      this.C = params[2]
      this.D = params[3]
    } else {
      const x = params[0]
      if (x instanceof FArchive) {
        this.A = x.readUInt32()
        this.B = x.readUInt32()
        this.C = x.readUInt32()
        this.D = x.readUInt32()
      } else {
        const ar = Buffer.from(x, "hex")
        this.A = ar.readUInt32LE(0)
        this.B = ar.readUInt32LE(4)
        this.C = ar.readUInt32LE(8)
        this.D = ar.readUInt32LE(12)
      }
    }
  }

  getBuffer(): Buffer {
    let buf = Buffer.alloc(16)
    buf.writeUInt32LE(this.A, 0)
    buf.writeUInt32LE(this.B, 4)
    buf.writeUInt32LE(this.C, 8)
    buf.writeUInt32LE(this.D, 12)
    return buf
  }

  static NewGuid(): FGuid {
    return new FGuid()
  }

  isValid() {
    return (this.A | this.B | this.C | this.D) !== 0
  }

  toString() {
    return [this.A, this.B, this.C, this.D].map(v => v.toString(16).padStart(8, "0")).join("").toUpperCase()
  }

  toJSON() {
    return this.toString()
  }
}