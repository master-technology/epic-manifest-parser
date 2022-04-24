import Long from "long";

export function toHex(value: number | BigInt | Long | Buffer, size: number = 16): string {
  let hex = ""
  if (typeof(value) == "number" || typeof(value) == "bigint" || Long.isLong(value)) {
    hex = value.toString(16)
  }
  else if (Buffer.isBuffer(value)) {
    hex = value.toString("hex")
  }

  return hex.toUpperCase().padStart(size, "0");
}