import FArchive from "./FArchive";

export default class FString extends String {
  constructor(ar: FArchive)
  constructor(...whatever)

  constructor(...params) {
    let toSuper = params

    if (params[0] instanceof FArchive) toSuper = [ params[0].readString() ]

    super(...toSuper)
  }

  ToBlob(size: number = this.length / 3, retNums: boolean = false): any {
    let str = this
    if (size < (str.length / 3) || str.length % 3 != 0) return null

    let numbers = []
    for (let i = 0; i < str.length; i += 3) numbers.push(parseInt(str[i] + str[i + 1] + str[i + 2]))

    let buffer: any = new Uint8Array(numbers)
    if (size === 1) { }
    else if (size === 2) buffer = new Uint16Array(buffer.buffer)
    else if (size === 4) buffer = new Uint32Array(buffer.buffer)
    else if (size === 8) buffer = new BigUint64Array(buffer.buffer)
    else return numbers

    return retNums ? [ ...buffer ] : buffer[0]
  }

  static ToStringBlob(num: number | bigint, size = 4): FString {
    if (typeof(num) === "bigint") num = Number(num)
    const dat = []
    dat.unshift(num & 255)
    while (num >= 256) {
      num = num >>> 8
      dat.unshift(num & 255)
    }
    let buf = [ ...Buffer.concat([ Buffer.alloc(size), new Uint8Array(dat) ]) ]
    return new FString(buf.reverse().slice(0, size).map(v => ("000" + v).substr(-3)).join(""))
  }
}