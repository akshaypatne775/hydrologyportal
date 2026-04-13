/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Root URL for XYZ tiles, e.g. https://bucket.s3.eu-west-1.amazonaws.com/964-acres */
  readonly VITE_S3_TILE_BASE_URL?: string
  /** Path segment under base for orthomosaic tiles (default: tiles/orthomosaic) */
  readonly VITE_S3_ORTHO_PREFIX?: string
  readonly VITE_S3_DEM_PREFIX?: string
  readonly VITE_S3_DTM_PREFIX?: string
  readonly VITE_S3_FLOOD_1IN25_PREFIX?: string
  readonly VITE_S3_FLOOD_1IN50_PREFIX?: string
  readonly VITE_S3_FLOOD_1IN100_PREFIX?: string
  /** File extension for tiles (default: png) */
  readonly VITE_S3_TILE_EXT?: string
  readonly VITE_MAP_DEFAULT_LAT?: string
  readonly VITE_MAP_DEFAULT_LNG?: string
  readonly VITE_MAP_DEFAULT_ZOOM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
