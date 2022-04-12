import { FArchive } from "./FArchive";

export class FGuid {
  A: number = 0
  B: number = 0
  C: number = 0
  D: number = 0

  constructor(ar: FArchive)
  constructor()

  constructor(...params) {
    if (params[0] instanceof FArchive) {
      let ar = params[0]
      this.A = ar.readUInt32()
      this.B = ar.readUInt32()
      this.C = ar.readUInt32()
      this.D = ar.readUInt32()
    }
  }

  isValid() {
    return (this.A | this.B | this.C | this.D) !== 0
  }

  toString() {
    return [this.A, this.B, this.C, this.D].map(v => v.toString(16).padStart(8, "0")).join("").toUpperCase()
  }
}