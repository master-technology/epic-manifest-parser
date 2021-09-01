export var ManifestHeaderVersionSizes: number[] = [
  // EFeatureLevel::Original is 37B (32b Magic, 32b HeaderSize, 32b DataSizeUncompressed, 32b DataSizeCompressed, 160b SHA1, 8b StoredAs)
	// This remained the same all up to including EFeatureLevel::StoresPrerequisiteIds.
	37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37,
	// EFeatureLevel::StoredAsBinaryData is 41B, (296b Original, 32b Version).
	// This remained the same all up to including EFeatureLevel::UsesBuildTimeGeneratedBuildId.
	41, 41, 41, 41, 41
]