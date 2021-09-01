export enum EFileMetaFlags {
  None           = 0,
	// Flag for readonly file.
	ReadOnly       = 1,
	// Flag for natively compressed.
	Compressed     = 1 << 1,
	// Flag for unix executable.
	UnixExecutable = 1 << 2
}