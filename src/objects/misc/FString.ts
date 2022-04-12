export class FString {
  static FromBlob(values: number[], size: number = values.length): string {
    let dst = [ ...Array(size).fill(0) ];

    for (let i = 0; i < size; i++) {
      dst[i] = values[i];
    }

    return dst.map(v => ("000" + v).substr(-3)).join("");
  }

  static ToBlob(str: string, size: number = str.length / 3): number[] {
    let dst = [ ...Array(size).fill(0) ];

    for (let i = 0; i < size; i++) {
      dst[i] = Number(str.substr(i * 3, 3));
    }

    return dst;
  }
}