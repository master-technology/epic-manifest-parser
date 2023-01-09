import { FArchive } from "./FArchive";

export class FGuid {
  A: number = 0
  B: number = 0
  C: number = 0
  D: number = 0

  constructor(ar: FArchive)
  constructor(string)
  constructor()

  constructor(data?) {
    if (data instanceof FArchive) {
      this.#fromFArchive(data);
    } else if (data && data.length === 32) {
      this.#fromString(data);
    }
  }

  #fromString(data) {
    this.A = parseInt(data.substr(0,8), 16);
    this.B = parseInt(data.substr(8, 8), 16);
    this.C = parseInt(data.substr(16, 8), 16);
    this.D = parseInt(data.substr(24, 8), 16);
  }

  #fromFArchive(ar: FArchive) {
      this.A = ar.readUInt32()
      this.B = ar.readUInt32()
      this.C = ar.readUInt32()
      this.D = ar.readUInt32()
  }

  isValid() {
    return (this.A | this.B | this.C | this.D) !== 0
  }

  toString() {
    return [this.A, this.B, this.C, this.D].map(v => v.toString(16).padStart(8, "0")).join("").toUpperCase()
  }

  toJSON() {
    return toString();
  }
}
