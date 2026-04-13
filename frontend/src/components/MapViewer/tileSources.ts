/**
 * S3 / CDN XYZ tile URL helpers.
 *
 * Expected object layout (customise prefixes via VITE_S3_* env vars):
 *
 *   {VITE_S3_TILE_BASE_URL}/{prefix}/{z}/{x}/{y}.{ext}
 *
 * Example (AWS S3 static website or public bucket):
 *   https://my-bucket.s3.eu-west-1.amazonaws.com/hydrology-964-acres/tiles/orthomosaic/12/2048/1360.png
 *
 * For CloudFront, set VITE_S3_TILE_BASE_URL to the distribution origin path instead.
 */

export type BaseLayerId = 'orthomosaic' | 'dem' | 'dtm'

/** Flood return period folders under the S3 tile root. */
export type FloodReturnPeriod = '1in25' | '1in50' | '1in100'

const env = import.meta.env

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '').replace(/^\/+/, '')
}

export function hasS3TileBase(): boolean {
  return Boolean(env.VITE_S3_TILE_BASE_URL?.trim())
}

export function getTileExtension(): string {
  return (env.VITE_S3_TILE_EXT ?? 'png').replace(/^\./, '')
}

/** Leaflet XYZ template `{z}/{x}/{y}` under your base URL. */
export function buildS3XyzTemplate(
  baseUrl: string,
  prefix: string,
  ext: string = getTileExtension(),
): string {
  const base = trimSlash(baseUrl)
  const path = trimSlash(prefix)
  return `${base}/${path}/{z}/{x}/{y}.${ext}`
}

function defaultPrefix(layer: BaseLayerId): string {
  if (layer === 'orthomosaic') return env.VITE_S3_ORTHO_PREFIX ?? 'tiles/orthomosaic'
  if (layer === 'dem') return env.VITE_S3_DEM_PREFIX ?? 'tiles/dem'
  return env.VITE_S3_DTM_PREFIX ?? 'tiles/dtm'
}

function defaultFloodPrefix(period: FloodReturnPeriod): string {
  if (period === '1in25') {
    return env.VITE_S3_FLOOD_1IN25_PREFIX ?? 'tiles/flood/1in25'
  }
  if (period === '1in50') {
    return env.VITE_S3_FLOOD_1IN50_PREFIX ?? 'tiles/flood/1in50'
  }
  return env.VITE_S3_FLOOD_1IN100_PREFIX ?? 'tiles/flood/1in100'
}

/** XYZ URL template for a base imagery / elevation layer. */
export function getBaseLayerTileUrl(layer: BaseLayerId): string | null {
  const base = env.VITE_S3_TILE_BASE_URL?.trim()
  if (!base) return null
  return buildS3XyzTemplate(base, defaultPrefix(layer))
}

/** XYZ URL template for flood hazard tiles for a return period. */
export function getFloodOverlayTileUrl(period: FloodReturnPeriod): string | null {
  const base = env.VITE_S3_TILE_BASE_URL?.trim()
  if (!base) return null
  return buildS3XyzTemplate(base, defaultFloodPrefix(period))
}

/** OpenStreetMap fallback when S3 base is not configured (local dev). */
export const OSM_FALLBACK_URL =
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export function getBaseLayerUrlOrFallback(layer: BaseLayerId): string {
  return getBaseLayerTileUrl(layer) ?? OSM_FALLBACK_URL
}

export function getDefaultMapCenter(): [number, number] {
  const lat = Number(env.VITE_MAP_DEFAULT_LAT ?? '51.505')
  const lng = Number(env.VITE_MAP_DEFAULT_LNG ?? '-0.09')
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng]
  return [51.505, -0.09]
}

export function getDefaultZoom(): number {
  const z = Number(env.VITE_MAP_DEFAULT_ZOOM ?? '13')
  return Number.isFinite(z) ? z : 13
}
