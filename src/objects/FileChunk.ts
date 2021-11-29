import FString from "./FString";

export default class FileChunk {
  Guid: string
  Hash: string
  Sha: string
  DataGroup: FString
  Size: number

  Filename: string
  Url: string

  Start: number
  Offset: number

  constructor(guid, manifest) {
    this.Guid                = guid
    this.Hash                = manifest.ChunkHashList[guid]
    this.Sha                 = manifest.ChunkShaList[guid]
    this.DataGroup           = manifest.DataGroupList[guid]
    this.Size                = manifest.ChunkFilesizeList[guid].ToBlob()

    this.Filename            = `${this.Hash}_${this.Guid}.chunk`
    this.Url                 = `${this.DataGroup.slice(-2)}/${this.Filename}`
  }
}