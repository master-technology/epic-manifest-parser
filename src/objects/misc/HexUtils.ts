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

export function EpicReversedDecimalToBigInt(inData: String): BigInt {
  let num = 0n;
  for (let i = inData.length-3; i >= 0; i -= 3) {
    num = num << 8n;
    num += BigInt(inData.substr(i, 3))
  }
  return num;
}

export function EpicReversedDecimalToNumber(inData: String): number {
  let num = 0;
  for (let i = 0, j = 0; i < inData.length; i += 3, j++) {
    num = num + (parseInt(inData.substr(i, 3), 10) << (j * 8));
  }
  return num
}

export function EpicReversedDecimalToHex(inData: String): string {
  let output = '';
  for (let i = 0; i < inData.length; i += 3) {
    output = parseInt(inData.substr(i, 3), 10).toString(16).padStart(2, "0") + output;
  }
  return output;
}
