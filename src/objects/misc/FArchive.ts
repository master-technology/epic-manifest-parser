export class FArchive {
  protected data: Buffer
  protected position: number = 0

  constructor(buf: Buffer) {
    this.data = buf
  }

  tell() { return this.position }
  seek(pos: number) { this.position = pos }
  skip(count: number) { this.position += count }
  get size(): number { return this.data.length }

  readToBuffer(b: Buffer, off: number = 0, len: number = b.length) {
    this.data.copy(b, off, this.position, this.position += len)
  }

  read(size: number): Buffer {
    const res = Buffer.alloc(size)
    this.readToBuffer(res)
    return res
  }

  readInt8(): number { return this.read(1).readInt8() }
  readUInt8(): number { return this.read(1).readUInt8() }

  readInt16(): number { return this.read(2).readInt16LE() }
  readUInt16(): number { return this.read(2).readUInt16LE() }

  readInt32(): number { return this.read(4).readInt32LE() }
  readUInt32(): number { return this.read(4).readUInt32LE() }

  readInt64(): bigint { return this.read(8).readBigInt64LE() }
  readUInt64(): bigint { return this.read(8).readBigUInt64LE() }

  readFString(length = this.readInt32()): string {
    if (length < -65536 || length > 65536) throw new Error(`Invalid String length '${length}', pos: ${this.tell()}`)
    if (length < 0) {
      let utf16length = -length
      let arrLength = utf16length - 1
      let dat = []
      for (let i = 0; i < arrLength; ++i) dat.push(this.readUInt16())
      if (this.readUInt16() !== 0) throw new Error("Serialized FString is not null-terminated")
      return Buffer.from(dat).toString("utf16le")
    } else {
      if (length === 0) return ""
      let str = this.read(length - 1).toString("utf-8")
      if (this.readUInt8() !== 0) throw new Error("Serialized FString is not null-terminated")
      return str
    }
  }

  readArray(len: number | ((ar: FArchive) => any), fn?: (ar: FArchive) => any) {
    if (typeof(len) !== "number") {
      fn = len;
      len = this.readUInt32()
    }
    let dat = [];
    for (let i = 0; i < len; ++i) dat.push(fn(this))
    return dat;
  }
}