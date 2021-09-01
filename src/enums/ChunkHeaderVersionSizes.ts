export var ChunkHeaderVersionSizes: number[] = [
  // Dummy for indexing.
	0,
	// Original is 41 bytes (32b Magic, 32b Version, 32b HeaderSize, 32b DataSizeCompressed, 4x32b GUID, 64b Hash, 8b StoredAs).
	41,
	// StoresShaAndHashType is 62 bytes (328b Original, 160b SHA1, 8b HashType).
	62,
	// StoresDataSizeUncompressed is 66 bytes (496b StoresShaAndHashType, 32b DataSizeUncompressed).
	66
]