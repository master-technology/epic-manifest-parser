import Long from "long";

export class FRollingHash {
  // We'll use the commonly used in CRC64, ECMA polynomial defined in ECMA 182.
  static readonly HashPoly64: bigint = BigInt("0xC96C5795D7870F42")
  static HashTable: Long[]

  static Init() {
    if (FRollingHash.HashTable != null) return;

    let table = [];
    let one = BigInt(1)
    for (let tableIndex = 0; tableIndex < 256; ++tableIndex) {
      let crc = BigInt(tableIndex)

      for (let shiftCount = 0; shiftCount < 8; ++shiftCount) {
        if ((crc & one) == one) {
          crc >>= one
          crc ^= FRollingHash.HashPoly64
        }
        else {
          crc >>= one
        }
      }

      table[tableIndex] = crc
    }

    FRollingHash.HashTable = table.map(bi => Long.fromString(bi.toString(16), true, 16))
  }

  static GetHashForDataSet(data: Buffer): Long {
    FRollingHash.Init()

    let hashState = Long.UZERO
    for (let i = 0; i < data.length; i++) {
      hashState = FRollingHash.ROTLEFT_64B(hashState, 1)
      hashState = hashState.xor(FRollingHash.HashTable[data[i]])
    }
    return hashState;
  }

  private static ROTLEFT_64B(value: Long, shifts: number): Long {
    let val1 = value.shl(shifts % 64)
    let val2 = value.shr( ((64 - ((shifts) % 64)) % 64) )
    return val1.or(val2.neg())
  }
}