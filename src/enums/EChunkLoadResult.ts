export enum EChunkLoadResult {
  None = -1,
  Success = 0,

  // Failed to open the file to load the chunk.
  OpenFileFail,

  // Could not serialize due to wrong archive type.
  BadArchive,

  // The header in the loaded chunk was invalid.
  CorruptHeader,

  // The expected file size in the header did not match the size of the file.
  IncorrectFileSize,

  // The storage type of the chunk is not one which we support.
  UnsupportedStorage,

  // The hash information was missing.
  MissingHashInfo,

  // The serialized data was not successfully understood.
  SerializationError,

  // The data was saved compressed but decompression failed.
  DecompressFailure,

  // The expected data hash in the header did not match the hash of the data.
  HashCheckFailed,

  // The operation was aborted.
  Aborted
}