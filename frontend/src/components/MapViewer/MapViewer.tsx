import 'leaflet/dist/leaflet.css'
import './MapViewer.css'

import area from '@turf/area'
import { polygon as turfPolygon } from '@turf/helpers'
import type { LatLng } from 'leaflet'
import L from 'leaflet'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import {
  type BaseLayerId,
  type FloodReturnPeriod,
  getBaseLayerUrlOrFallback,
  getDefaultMapCenter,
  getDefaultZoom,
  getFloodOverlayTileUrlWithBust,
  hasCustomTileBase,
} from './tileSources'

export type { BaseLayerId, FloodReturnPeriod } from './tileSources'

type MeasureMode = 'none' | 'distance' | 'area'

const BASE_LABELS: Record<BaseLayerId, string> = {
  orthomosaic: 'Orthomosaic (drone)',
  dem: 'DEM',
  dtm: 'DTM',
}

const FLOOD_LABELS: Record<FloodReturnPeriod, string> = {
  '1in25': '1 : 25 years',
  '1in50': '1 : 50 years',
  '1in100': '1 : 100 years',
}

function formatLengthM(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${meters.toFixed(1)} m`
}

function formatAreaM2(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`
  return `${m2.toFixed(0)} m²`
}

function ringAreaM2(points: LatLng[]): number {
  if (points.length < 3) return 0
  const coords = points.map((p) => [p.lng, p.lat] as [number, number])
  const closed: [number, number][] = [...coords, coords[0]!]
  const poly = turfPolygon([closed])
  return area(poly)
}

function totalPathLengthM(points: LatLng[]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    sum += points[i - 1]!.distanceTo(points[i]!)
  }
  return sum
}

type SyncRefs = {
  lockRef: MutableRefObject<boolean>
  mapARef: MutableRefObject<L.Map | null>
  mapBRef: MutableRefObject<L.Map | null>
}

function MapSyncBridge({ isA, lockRef, mapARef, mapBRef }: SyncRefs & { isA: boolean }) {
  const map = useMap()
  const selfRef = isA ? mapARef : mapBRef
  const peerRef = isA ? mapBRef : mapARef

  useEffect(() => {
    selfRef.current = map
    return () => {
      selfRef.current = null
    }
  }, [map, selfRef])

  useMapEvents({
    moveend() {
      if (lockRef.current) return
      const peer = peerRef.current
      if (!peer) return
      lockRef.current = true
      peer.setView(map.getCenter(), map.getZoom(), { animate: false })
      window.setTimeout(() => {
        lockRef.current = false
      }, 48)
    },
  })
  return null
}

function MeasureInteraction({
  mode,
  enabled,
  points,
  areaFrozen,
  onAddPoint,
  onCloseRing,
}: {
  mode: MeasureMode
  enabled: boolean
  points: LatLng[]
  areaFrozen: boolean
  onAddPoint: (ll: LatLng) => void
  onCloseRing: () => void
}) {
  const map = useMap()

  useEffect(() => {
    if (mode === 'area' && !areaFrozen) map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()
    return () => {
      map.doubleClickZoom.enable()
    }
  }, [map, mode, areaFrozen])

  useMapEvents({
    click(e) {
      if (!enabled || mode === 'none') return
      if (mode === 'area' && areaFrozen) return
      if (mode === 'distance' || mode === 'area') onAddPoint(e.latlng)
    },
    dblclick(e) {
      if (!enabled || mode !== 'area' || areaFrozen) return
      e.originalEvent.preventDefault()
      if (points.length >= 3) onCloseRing()
    },
  })
  return null
}

interface MapPaneProps {
  baseLayer: BaseLayerId
  floodEnabled: boolean
  floodPeriod: FloodReturnPeriod
  /** 0–100: boosts flood tile opacity + drives parent veil (placeholder hydraulics). */
  floodSimulationLevel: number
  measureMode: MeasureMode
  measureActive: boolean
  measurePoints: LatLng[]
  areaFrozen: boolean
  onMeasureAdd: (ll: LatLng) => void
  onMeasureCloseRing: () => void
  sync?: SyncRefs & { isA: boolean }
}

function floodTileOpacity(
  floodEnabled: boolean,
  floodUrl: string | null,
  simulationLevel: number,
): number {
  if (!floodEnabled || !floodUrl) return 0
  const t = Math.min(1, Math.max(0, simulationLevel / 100))
  /* Placeholder: stronger overlay as slider increases (ties to HydrologyStats control). */
  return Math.min(0.92, 0.26 + t * 0.66)
}

function MapPane({
  baseLayer,
  floodEnabled,
  floodPeriod,
  floodSimulationLevel,
  measureMode,
  measureActive,
  measurePoints,
  areaFrozen,
  onMeasureAdd,
  onMeasureCloseRing,
  sync,
}: MapPaneProps) {
  const baseUrl = useMemo(() => getBaseLayerUrlOrFallback(baseLayer), [baseLayer])
  const floodUrl = useMemo(
    () =>
      floodEnabled ? getFloodOverlayTileUrlWithBust(floodPeriod) : null,
    [floodEnabled, floodPeriod],
  )
  const floodOpacity = useMemo(
    () => floodTileOpacity(floodEnabled, floodUrl, floodSimulationLevel),
    [floodEnabled, floodUrl, floodSimulationLevel],
  )

  return (
    <>
      {/*
        URL includes ?v=… cache-bust on custom bases (tileSources.withTileCacheBust).
        Bump VITE_TILE_CACHE_BUST after regenerating local tiles; Leaflet fetches XYZ per zoom/pan.
      */}
      <TileLayer
        key={baseUrl}
        attribution={
          hasCustomTileBase()
            ? '&copy; Project ortho / elevation tiles'
            : '&copy; OpenStreetMap'
        }
        url={baseUrl}
        maxZoom={22}
        maxNativeZoom={20}
      />
      {floodUrl ? (
        <TileLayer
          key={`flood-${floodPeriod}-${floodUrl}`}
          url={floodUrl}
          opacity={floodOpacity}
          maxZoom={22}
          maxNativeZoom={20}
        />
      ) : null}
      {measureActive ? (
        <>
          <MeasureInteraction
            mode={measureMode}
            enabled={measureActive}
            points={measurePoints}
            areaFrozen={areaFrozen}
            onAddPoint={onMeasureAdd}
            onCloseRing={onMeasureCloseRing}
          />
          {measureMode === 'distance' && measurePoints.length > 0 ? (
            <Polyline
              positions={measurePoints}
              pathOptions={{ color: '#0e3e49', weight: 3, dashArray: '6 4' }}
            />
          ) : null}
          {measureMode === 'area' && measurePoints.length > 0 ? (
            <Polygon
              positions={measurePoints}
              pathOptions={{
                color: '#0e3e49',
                weight: 2,
                fillColor: '#14b8a6',
                fillOpacity: 0.25,
              }}
            />
          ) : null}
          {measurePoints.map((p, i) => (
            <CircleMarker
              key={`${p.lat.toFixed(5)}-${p.lng.toFixed(5)}-${i}`}
              center={p}
              radius={5}
              pathOptions={{
                color: '#0e3e49',
                weight: 2,
                fillColor: '#fff',
                fillOpacity: 1,
              }}
            />
          ))}
        </>
      ) : null}
      {sync ? (
        <MapSyncBridge
          isA={sync.isA}
          lockRef={sync.lockRef}
          mapARef={sync.mapARef}
          mapBRef={sync.mapBRef}
        />
      ) : null}
    </>
  )
}

export type MapViewerProps = {
  /** 0–100 from HydrologyStats flood slider; placeholder for inundation visual. */
  floodSimulationLevel?: number
}

function FloodSimulationVeil({ level }: { level: number }) {
  const opacity = Math.min(0.72, Math.max(0, (level / 100) * 0.68))
  if (opacity < 0.02) return null
  return (
    <div
      className="mv-flood-sim-veil"
      style={{ opacity }}
      aria-hidden
    />
  )
}

export function MapViewer({ floodSimulationLevel = 0 }: MapViewerProps) {
  const center = useMemo(() => getDefaultMapCenter(), [])
  const zoom = useMemo(() => getDefaultZoom(), [])
  const customTilesReady = hasCustomTileBase()

  const [baseLayer, setBaseLayer] = useState<BaseLayerId>('orthomosaic')
  const [compareLayer, setCompareLayer] = useState<BaseLayerId>('dtm')
  const [floodOn, setFloodOn] = useState(false)
  const [floodPeriod, setFloodPeriod] = useState<FloodReturnPeriod>('1in25')
  const [splitView, setSplitView] = useState(false)
  const [measureMode, setMeasureMode] = useState<MeasureMode>('none')
  const [points, setPoints] = useState<LatLng[]>([])
  const [areaFrozen, setAreaFrozen] = useState(false)

  const syncLockRef = useRef(false)
  const mapARef = useRef<L.Map | null>(null)
  const mapBRef = useRef<L.Map | null>(null)
  const syncRefs = useMemo(
    () => ({
      lockRef: syncLockRef,
      mapARef,
      mapBRef,
    }),
    [],
  )

  const distanceM = useMemo(
    () => (measureMode === 'distance' ? totalPathLengthM(points) : 0),
    [measureMode, points],
  )
  const areaM2 = useMemo(
    () => (measureMode === 'area' ? ringAreaM2(points) : 0),
    [measureMode, points],
  )

  const clearMeasure = useCallback(() => {
    setPoints([])
    setAreaFrozen(false)
  }, [])

  const setTool = useCallback((mode: MeasureMode) => {
    setMeasureMode((prev) => {
      const next = prev === mode ? 'none' : mode
      return next
    })
    setPoints([])
    setAreaFrozen(false)
  }, [])

  useEffect(() => {
    if (measureMode === 'none') {
      setPoints([])
      setAreaFrozen(false)
    }
  }, [measureMode])

  const onMeasureAdd = useCallback(
    (ll: LatLng) => {
      setPoints((prev) => [...prev, ll])
    },
    [],
  )

  const onMeasureCloseRing = useCallback(() => {
    setAreaFrozen(true)
  }, [])

  const measureActive = measureMode !== 'none' && !splitView

  const mapProps = {
    center,
    zoom,
    scrollWheelZoom: true,
    className: 'mv-leaflet',
  } as const

  return (
    <div className="mv-root">
      {!customTilesReady ? (
        <div className="mv-banner" role="status">
          <i className="fa-solid fa-circle-info" aria-hidden />
          <span>
            Set <code className="mv-banner__code">VITE_TILE_BASE_URL</code> or{' '}
            <code className="mv-banner__code">VITE_S3_TILE_BASE_URL</code>{' '}
            (e.g. FastAPI <code className="mv-banner__code">/tiles</code>) to load
            ortho, DEM, DTM, and flood layers. Showing OSM fallback for base
            layers.
          </span>
        </div>
      ) : null}

      <div className="mv-chrome">
        <div className="mv-panel mv-panel--layers">
          <p className="mv-panel__title">Layers</p>
          <fieldset className="mv-fieldset">
            <legend className="mv-legend">Base</legend>
            {(Object.keys(BASE_LABELS) as BaseLayerId[]).map((id) => (
              <label key={id} className="mv-radio">
                <input
                  type="radio"
                  name="mv-base-layer"
                  checked={baseLayer === id}
                  onChange={() => setBaseLayer(id)}
                />
                <span>{BASE_LABELS[id]}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="mv-fieldset">
            <legend className="mv-legend">Flood risk overlay</legend>
            <label className="mv-check">
              <input
                type="checkbox"
                checked={floodOn}
                disabled={!customTilesReady}
                onChange={(e) => setFloodOn(e.target.checked)}
              />
              <span>Show flood tiles</span>
            </label>
            <div className="mv-flood-grid">
              {(Object.keys(FLOOD_LABELS) as FloodReturnPeriod[]).map((p) => (
                <label key={p} className="mv-radio mv-radio--compact">
                  <input
                    type="radio"
                    name="mv-flood-period"
                    disabled={!floodOn || !customTilesReady}
                    checked={floodPeriod === p}
                    onChange={() => setFloodPeriod(p)}
                  />
                  <span>{FLOOD_LABELS[p]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mv-toolbar" role="toolbar" aria-label="Map tools">
          <button
            type="button"
            className={
              measureMode === 'distance' && !splitView
                ? 'mv-tool mv-tool--active'
                : 'mv-tool'
            }
            disabled={splitView}
            onClick={() => setTool('distance')}
            title="Click the map to add vertices; total length updates live."
          >
            <i className="fa-solid fa-ruler" aria-hidden />
            Distance
          </button>
          <button
            type="button"
            className={
              measureMode === 'area' && !splitView
                ? 'mv-tool mv-tool--active'
                : 'mv-tool'
            }
            disabled={splitView}
            onClick={() => setTool('area')}
            title="Click vertices; double-click to finish polygon."
          >
            <i className="fa-solid fa-draw-polygon" aria-hidden />
            Area
          </button>
          <button
            type="button"
            className={splitView ? 'mv-tool mv-tool--active' : 'mv-tool'}
            onClick={() => {
              setSplitView((v) => !v)
              setMeasureMode('none')
              setPoints([])
            }}
            title="Side-by-side comparison (views stay in sync)."
          >
            <i className="fa-solid fa-columns" aria-hidden />
            Split view
          </button>
          {measureMode !== 'none' && !splitView ? (
            <button
              type="button"
              className="mv-tool mv-tool--ghost"
              onClick={clearMeasure}
            >
              Clear drawing
            </button>
          ) : null}
        </div>
      </div>

      {measureMode !== 'none' && !splitView ? (
        <div className="mv-hud" aria-live="polite">
          {measureMode === 'distance' ? (
            <span>
              Distance: <strong>{formatLengthM(distanceM)}</strong>
            </span>
          ) : (
            <span>
              Area: <strong>{formatAreaM2(areaM2)}</strong>
              {!areaFrozen ? (
                <span className="mv-hud__hint"> · Double-click to finish</span>
              ) : (
                <span className="mv-hud__hint"> · Finished — Clear to reset</span>
              )}
            </span>
          )}
        </div>
      ) : null}

      <div className={splitView ? 'mv-maps mv-maps--split' : 'mv-maps'}>
        <div className="mv-map-wrap">
          {splitView ? (
            <span className="mv-map-label">
              Primary · {BASE_LABELS[baseLayer]}
            </span>
          ) : null}
          <div className="mv-map-canvas">
            <MapContainer {...mapProps} style={{ height: '100%', width: '100%' }}>
              <MapPane
                baseLayer={baseLayer}
              floodEnabled={floodOn && customTilesReady}
              floodPeriod={floodPeriod}
              floodSimulationLevel={floodSimulationLevel}
              measureMode={measureMode}
              measureActive={measureActive}
              measurePoints={points}
              areaFrozen={areaFrozen}
              onMeasureAdd={onMeasureAdd}
              onMeasureCloseRing={onMeasureCloseRing}
              sync={splitView ? { ...syncRefs, isA: true } : undefined}
              />
            </MapContainer>
            <FloodSimulationVeil level={floodSimulationLevel} />
          </div>
        </div>

        {splitView ? (
          <div className="mv-map-wrap mv-map-wrap--compare">
            <div className="mv-compare-head">
              <span className="mv-map-label">Compare</span>
              <select
                className="mv-select"
                value={compareLayer}
                onChange={(e) =>
                  setCompareLayer(e.target.value as BaseLayerId)
                }
                aria-label="Comparison base layer"
              >
                {(Object.keys(BASE_LABELS) as BaseLayerId[]).map((id) => (
                  <option key={id} value={id}>
                    {BASE_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mv-map-canvas">
              <MapContainer {...mapProps} style={{ height: '100%', width: '100%' }}>
                <MapPane
                  baseLayer={compareLayer}
                  floodEnabled={floodOn && customTilesReady}
                  floodPeriod={floodPeriod}
                  floodSimulationLevel={floodSimulationLevel}
                  measureMode="none"
                  measureActive={false}
                  measurePoints={[]}
                  areaFrozen={false}
                  onMeasureAdd={() => {}}
                  onMeasureCloseRing={() => {}}
                  sync={{ ...syncRefs, isA: false }}
                />
              </MapContainer>
              <FloodSimulationVeil level={floodSimulationLevel} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MapViewer
