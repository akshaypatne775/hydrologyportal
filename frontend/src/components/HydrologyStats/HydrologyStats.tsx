import './HydrologyStats.css'

export type HydrologyStatsProps = {
  floodSimulationLevel: number
  onFloodSimulationChange: (level: number) => void
}

/** Placeholder figures aligned with a typical hydrology study PDF scope (964 Acres). */
const CATCHMENT_STATS = [
  { label: 'Gross catchment', value: '390.0', unit: 'ha' },
  { label: 'Net contributing', value: '382.4', unit: 'ha' },
  { label: 'Delineation', value: 'D8 / filled DEM', unit: '' },
  { label: 'Pour point', value: 'Outlet chainage 0', unit: '' },
] as const

const STREAM_STATS = [
  { label: 'Main channel length', value: '4.85', unit: 'km' },
  { label: 'Reach average slope', value: '1.2', unit: '%' },
  { label: 'Design n (placeholder)', value: '0.035', unit: '' },
] as const

const LULC_ROWS = [
  { name: 'Agriculture', pct: 42, color: '#2dd4bf' },
  { name: 'Forest / scrub', pct: 28, color: '#0d9488' },
  { name: 'Built-up / roads', pct: 18, color: '#5eead4' },
  { name: 'Water / wetland', pct: 8, color: '#67e8f9' },
  { name: 'Other / bare', pct: 4, color: '#94a3b8' },
] as const

export function HydrologyStats({
  floodSimulationLevel,
  onFloodSimulationChange,
}: HydrologyStatsProps) {
  return (
    <div className="hs-root">
      <header className="hs-header">
        <p className="hs-kicker">Hydrology scope</p>
        <h2 className="hs-title">Study metrics summary</h2>
        <p className="hs-sub">
          Values below mirror the reporting structure in the project PDF: catchment
          statement, stream reach analysis, and land-use classification. Replace with
          API-bound data when available.
        </p>
      </header>

      <section className="hs-section" aria-labelledby="hs-catchment-heading">
        <div className="hs-section__head">
          <h3 id="hs-catchment-heading" className="hs-section__title">
            Catchment area statement
          </h3>
          <span className="hs-section__badge">PDF §2</span>
        </div>
        <div className="hs-stat-grid">
          {CATCHMENT_STATS.map((s) => (
            <div key={s.label} className="hs-stat">
              <span className="hs-stat__label">{s.label}</span>
              <span className="hs-stat__value">
                {s.value}
                {s.unit ? <span className="hs-stat__unit">{s.unit}</span> : null}
              </span>
            </div>
          ))}
        </div>
        <p className="hs-prose">
          Catchment boundary derived from project DTM, hydrologically corrected and
          snapped to the surveyed outlet. Statement supports design storm routing and
          flood volume checks for the 964-acre development envelope.
        </p>
      </section>

      <section className="hs-section" aria-labelledby="hs-stream-heading">
        <div className="hs-section__head">
          <h3 id="hs-stream-heading" className="hs-section__title">
            Stream analysis
          </h3>
          <span className="hs-section__badge">L-section</span>
        </div>
        <div className="hs-stat-grid">
          {STREAM_STATS.map((s) => (
            <div key={s.label} className="hs-stat">
              <span className="hs-stat__label">{s.label}</span>
              <span className="hs-stat__value">
                {s.value}
                {s.unit ? <span className="hs-stat__unit">{s.unit}</span> : null}
              </span>
            </div>
          ))}
        </div>
        <div className="hs-chart" role="img" aria-label="Long section placeholder">
          <div className="hs-chart__grid" />
          <div className="hs-chart__axis-y" />
          <div className="hs-chart__axis-x" />
          <span className="hs-chart__label-y">Elevation (m AOD)</span>
          <span className="hs-chart__label-x">Chainage (m)</span>
          <svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="hsWaterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0e3e49" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <path
              className="hs-chart__water"
              d="M0,95 L40,88 L80,82 L120,78 L160,72 L200,68 L240,65 L280,62 L320,60 L320,120 L0,120 Z"
            />
            <path
              className="hs-chart__profile"
              d="M0,95 L40,88 L80,82 L120,78 L160,72 L200,68 L240,65 L280,62 L320,60"
            />
          </svg>
        </div>
        <p className="hs-chart__caption">
          Placeholder long-section profile. Bind to surveyed cross-sections or
          extracted DEM thalweg when engineering data is loaded.
        </p>
      </section>

      <section className="hs-section" aria-labelledby="hs-lulc-heading">
        <div className="hs-section__head">
          <h3 id="hs-lulc-heading" className="hs-section__title">
            LULC classification
          </h3>
          <span className="hs-section__badge">Land use</span>
        </div>
        <div className="hs-lulc-bars">
          {LULC_ROWS.map((row) => (
            <div key={row.name} className="hs-lulc-row">
              <span className="hs-lulc-name">{row.name}</span>
              <span className="hs-lulc-pct">{row.pct}%</span>
              <div className="hs-lulc-track">
                <div
                  className="hs-lulc-fill"
                  style={{
                    width: `${row.pct}%`,
                    background: `linear-gradient(90deg, ${row.color}aa, ${row.color})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="hs-prose">
          Classification from project orthomosaic / satellite stack (placeholder
          split). Raster statistics can replace these percentages on ingest.
        </p>
      </section>

      <section
        className="hs-section hs-flood"
        aria-labelledby="hs-flood-heading"
      >
        <div className="hs-flood__top">
          <h3 id="hs-flood-heading" className="hs-section__title">
            Flood simulation
          </h3>
          <span className="hs-flood__value">{floodSimulationLevel}%</span>
        </div>
        <p className="hs-flood__hint">
          Drives a visual inundation veil on the map (placeholder). Replace with
          WMS time-step or depth-grid blend when hydraulic results are connected.
        </p>
        <label className="sr-only" htmlFor="hs-flood-slider">
          Flood simulation intensity
        </label>
        <input
          id="hs-flood-slider"
          className="hs-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={floodSimulationLevel}
          onChange={(e) =>
            onFloodSimulationChange(Number(e.target.value))
          }
        />
        <div className="hs-slider-labels">
          <span>Dry</span>
          <span>Design flood</span>
          <span>Extreme</span>
        </div>
      </section>
    </div>
  )
}

export default HydrologyStats
