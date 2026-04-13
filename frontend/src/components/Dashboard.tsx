import { useCallback, useState } from 'react'
import { HydrologyStats } from './HydrologyStats/HydrologyStats'
import { MapViewer } from './MapViewer/MapViewer'
import './Dashboard.css'

const NAV_ITEMS = [
  { id: 'map', label: 'Map Viewer', icon: 'fa-solid fa-map-location-dot' },
  { id: 'analysis', label: 'Hydrology Analysis', icon: 'fa-solid fa-droplet' },
  { id: 'media', label: 'Media Gallery', icon: 'fa-solid fa-images' },
  { id: 'issues', label: 'Issue Tracker', icon: 'fa-solid fa-clipboard-list' },
  { id: 'downloads', label: 'Downloads', icon: 'fa-solid fa-file-arrow-down' },
] as const

export function Dashboard() {
  const [activeId, setActiveId] = useState<string>('map')
  const [shareCopied, setShareCopied] = useState(false)
  const [floodSimulationLevel, setFloodSimulationLevel] = useState(0)

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}`
    const flashCopied = () => {
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2200)
    }
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(flashCopied).catch(() => {
        window.prompt('Copy white-label link:', url)
      })
    } else {
      window.prompt('Copy white-label link:', url)
    }
  }, [])

  return (
    <div className="ds-dashboard">
      <aside className="ds-sidebar" aria-label="Droid Survair navigation">
        <div className="ds-sidebar__brand">
          <div className="ds-sidebar__brand-mark">
            <span className="ds-sidebar__logo" aria-hidden>
              <i className="fa-solid fa-layer-group" />
            </span>
            <div>
              <p className="ds-sidebar__title">Droid Survair</p>
              <p className="ds-sidebar__tagline">Survey · Map · Insight</p>
            </div>
          </div>
        </div>

        <nav className="ds-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={
                activeId === item.id
                  ? 'ds-sidebar__link ds-sidebar__link--active'
                  : 'ds-sidebar__link'
              }
              onClick={(e) => {
                e.preventDefault()
                setActiveId(item.id)
              }}
            >
              <i className={item.icon} aria-hidden />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="ds-sidebar__footer">Droid Survair · v1</div>
      </aside>

      <div className="ds-main">
        <header className="ds-topbar">
          <div className="ds-topbar__project">
            <span className="ds-topbar__label">Project</span>
            <h1 className="ds-topbar__name">
              964 Acres Hydrology Project
            </h1>
          </div>

          <div className="ds-topbar__actions">
            <button
              type="button"
              className={
                shareCopied
                  ? 'ds-share ds-share--copied'
                  : 'ds-share'
              }
              onClick={handleShare}
              title="Copy white-label link to this view"
            >
              <i className="fa-solid fa-link" aria-hidden />
              {shareCopied ? 'Copied' : 'Share'}
            </button>

            <div className="ds-profile" role="group" aria-label="User profile">
              <div className="ds-profile__avatar" aria-hidden>
                DS
              </div>
              <div className="ds-profile__meta">
                <span className="ds-profile__name">Survey Lead</span>
                <span className="ds-profile__role">Field ops</span>
              </div>
            </div>
          </div>
        </header>

        <main className="ds-content">
          <div
            className={
              activeId === 'analysis'
                ? 'ds-map-shell ds-map-shell--viewer ds-map-shell--analysis'
                : 'ds-map-shell ds-map-shell--viewer'
            }
          >
            <div className="ds-map-toolbar">
              <h2 className="ds-map-toolbar__title">
                {activeId === 'analysis'
                  ? 'Hydrology analysis workspace'
                  : 'Live map canvas'}
              </h2>
              <span className="ds-map-toolbar__badge">
                {activeId === 'analysis' ? 'Stats · Map' : 'React Leaflet'}
              </span>
            </div>
            {activeId === 'analysis' ? (
              <div className="ds-analysis-split">
                <HydrologyStats
                  floodSimulationLevel={floodSimulationLevel}
                  onFloodSimulationChange={setFloodSimulationLevel}
                />
                <div
                  className="ds-map-body"
                  role="region"
                  aria-label="Map viewer"
                >
                  <MapViewer
                    floodSimulationLevel={floodSimulationLevel}
                  />
                </div>
              </div>
            ) : (
              <div
                className="ds-map-body"
                role="region"
                aria-label="Map viewer"
              >
                <MapViewer floodSimulationLevel={floodSimulationLevel} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
