'use client';

import React, { useState } from 'react';
import {
  PenTool,
  Square,
  Trash2,
  Download,
  FileSpreadsheet,
  X,
  Layers,
  Droplets,
  Sparkles,
  Clock,
  PaintBucket,
  Ruler,
  Sliders,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { formatMeters } from '../utils/metrics';
import { exportGeoJSON, exportCSV } from '../utils/export';

// Standard industry marking widths (DIN EN 1436 / FHWA standards)
type LineWidthOption = 0.10 | 0.12 | 0.15; // in meters (10cm, 12cm, 15cm)
type ApplicationSpeed = 25 | 50 | 80; // in meters per minute

export const SidePanel: React.FC = () => {
  const {
    features,
    totalLengthMeters,
    selectedFeatureId,
    setSelectedFeatureId,
    deleteFeature,
    planName,
    vectorSourceRef,
    isSidePanelOpen,
    toggleSidePanel,
  } = usePlanner();

  // Configurable estimator parameters
  const [lineWidth, setLineWidth] = useState<LineWidthOption>(0.10);
  const [speedMpm, setSpeedMpm] = useState<ApplicationSpeed>(50); // default 50 m/min (ride-on striper)

  if (!isSidePanelOpen) return null;

  const lineCount = features.filter((f) => f.type === 'LineString').length;
  const zoneCount = features.filter((f) => f.type === 'Polygon').length;

  // Real Civil Engineering & Pavement Marking Physics:
  // 1. Total Marked Surface Area (m²) = Total Linear Distance (m) * Line Width (m)
  const surfaceAreaSqM = totalLengthMeters * lineWidth;

  // 2. Paint Volume (Liters):
  // Standard traffic paint (acrylic/solvent/thermoplastic) applied at 350-400 µm wet film thickness
  // yields ~0.20 Liters per m² (~5 m² per Liter)
  const paintLiters = surfaceAreaSqM * 0.20;
  const paintPails20L = Math.ceil(paintLiters / 20);

  // 3. Retroreflective Glass Beads (kg):
  // DIN EN 1436 & FHWA standard drop-on rate: ~300 g/m² (0.30 kg/m²)
  const glassBeadsKg = surfaceAreaSqM * 0.30;

  // 4. Field Application Time:
  // Application duration based on selected standard equipment rate
  const sprayMinutes = totalLengthMeters > 0 ? totalLengthMeters / speedMpm : 0;

  // 5. Estimated Parking Stall Capacity Equivalent:
  // A standard 90° single parking stall (2.5m x 5.0m) requires ~12.5m of boundary line marking
  const estimatedStalls = Math.floor(totalLengthMeters / 12.5);

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '0 min';
    if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const handleExportGeoJSON = () => {
    exportGeoJSON(vectorSourceRef.current, features, planName);
  };

  const handleExportCSV = () => {
    exportCSV(features, totalLengthMeters, planName);
  };

  return (
    <aside className="pro-sidebar">
      {/* Sidebar Header */}
      <header className="sidebar-header">
        <div className="sidebar-title-group">
          <Layers size={15} className="sidebar-icon" />
          <h2 className="sidebar-title">Plan Telemetry & Estimator</h2>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={toggleSidePanel}
          title="Close panel"
          aria-label="Close telemetry sidebar"
        >
          <X size={15} />
        </button>
      </header>

      {/* Scrollable Content */}
      <div className="sidebar-content">
        {/* Hero Linear Meterage Card */}
        <section className="pro-card hero-card">
          <div className="card-micro-label">
            <span>Total Linear Distance</span>
            <span className="geo-tag">WGS84 Geodesic</span>
          </div>
          <div className="metric-readout">
            <span className="metric-val tabular-nums">
              {totalLengthMeters.toLocaleString('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="metric-unit">m</span>
          </div>
          <div className="card-breakdown">
            <span><strong>{features.length}</strong> elements</span>
            <span>•</span>
            <span><strong>{lineCount}</strong> lines</span>
            <span>•</span>
            <span><strong>{zoneCount}</strong> zones</span>
            {estimatedStalls > 0 && (
              <>
                <span>•</span>
                <span><strong>~{estimatedStalls}</strong> stalls</span>
              </>
            )}
          </div>
        </section>

        {/* Civil Marking & Materials Simulator Card */}
        <section className="pro-card estimator-card">
          <div className="estimator-header">
            <div className="estimator-title-group">
              <PaintBucket size={14} className="estimator-icon" />
              <span className="estimator-title">Material & Job Estimator</span>
            </div>
            <span className="spec-badge">DIN EN 1436 / FHWA</span>
          </div>

          {/* Line Width Specification Selector */}
          <div className="estimator-control-row">
            <span className="control-label">
              <Ruler size={12} />
              <span>Line Width</span>
            </span>
            <div className="mini-segmented">
              <button
                type="button"
                className={`mini-seg-item ${lineWidth === 0.10 ? 'active' : ''}`}
                onClick={() => setLineWidth(0.10)}
                title="10 cm (Standard 4 in stall line)"
              >
                10 cm
              </button>
              <button
                type="button"
                className={`mini-seg-item ${lineWidth === 0.12 ? 'active' : ''}`}
                onClick={() => setLineWidth(0.12)}
                title="12 cm (Commercial heavy line)"
              >
                12 cm
              </button>
              <button
                type="button"
                className={`mini-seg-item ${lineWidth === 0.15 ? 'active' : ''}`}
                onClick={() => setLineWidth(0.15)}
                title="15 cm (6 in high-traffic lane line)"
              >
                15 cm
              </button>
            </div>
          </div>

          {/* Application Equipment Speed Preset */}
          <div className="estimator-control-row">
            <span className="control-label">
              <Sliders size={12} />
              <span>Application Pace</span>
            </span>
            <div className="mini-segmented">
              <button
                type="button"
                className={`mini-seg-item ${speedMpm === 25 ? 'active' : ''}`}
                onClick={() => setSpeedMpm(25)}
                title="Walk-behind striper (~25 m/min)"
              >
                25 m/min
              </button>
              <button
                type="button"
                className={`mini-seg-item ${speedMpm === 50 ? 'active' : ''}`}
                onClick={() => setSpeedMpm(50)}
                title="Ride-on mechanized striper (~50 m/min)"
              >
                50 m/min
              </button>
              <button
                type="button"
                className={`mini-seg-item ${speedMpm === 80 ? 'active' : ''}`}
                onClick={() => setSpeedMpm(80)}
                title="Automated / High-speed striper (~80 m/min)"
              >
                80 m/min
              </button>
            </div>
          </div>

          {/* Detailed Material Metrics Grid */}
          <div className="estimator-metrics-grid">
            {/* Paint Consumption */}
            <div className="est-metric-tile">
              <div className="tile-top">
                <Droplets size={13} className="tile-icon-cyan" />
                <span className="tile-label">Traffic Paint</span>
              </div>
              <div className="tile-value tabular-nums">
                {paintLiters.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} <span className="tile-unit">L</span>
              </div>
              <span className="tile-sub">
                {paintPails20L > 0 ? `${paintPails20L} × 20L pail${paintPails20L > 1 ? 's' : ''}` : '0 pails'}
              </span>
            </div>

            {/* Glass Beads */}
            <div className="est-metric-tile">
              <div className="tile-top">
                <Sparkles size={13} className="tile-icon-amber" />
                <span className="tile-label">Glass Beads</span>
              </div>
              <div className="tile-value tabular-nums">
                {glassBeadsKg.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} <span className="tile-unit">kg</span>
              </div>
              <span className="tile-sub">@ 300 g/m² retroreflectivity</span>
            </div>

            {/* Surface Area */}
            <div className="est-metric-tile">
              <div className="tile-top">
                <Square size={13} className="tile-icon-blue" />
                <span className="tile-label">Marked Area</span>
              </div>
              <div className="tile-value tabular-nums">
                {surfaceAreaSqM.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} <span className="tile-unit">m²</span>
              </div>
              <span className="tile-sub">W: {Math.round(lineWidth * 100)} cm width</span>
            </div>

            {/* Spray Application Duration */}
            <div className="est-metric-tile">
              <div className="tile-top">
                <Clock size={13} className="tile-icon-green" />
                <span className="tile-label">Spray Time</span>
              </div>
              <div className="tile-value tabular-nums">
                {formatDuration(sprayMinutes)}
              </div>
              <span className="tile-sub">@ {speedMpm} m/min application</span>
            </div>
          </div>

          <p className="estimator-disclaimer">
            Calculated using standard industrial road marking coverage rates (0.20 L/m² traffic paint, 300 g/m² drop-on glass beads, ~30 min cure window).
          </p>
        </section>

        {/* Drawn Elements Inventory */}
        <section className="inventory-block">
          <div className="inventory-header">
            <span className="inventory-title">Elements ({features.length})</span>
            {features.length > 0 && (
              <span className="inventory-sub">Click to inspect</span>
            )}
          </div>

          {features.length === 0 ? (
            <div className="inventory-empty">
              <PenTool size={16} className="empty-icon" />
              <p className="empty-text">
                Press <strong>L</strong> to draw stall lines or <strong>P</strong> for zones on the canvas.
              </p>
            </div>
          ) : (
            <ul className="elements-list" role="list">
              {features.map((feature, idx) => {
                const isSelected = selectedFeatureId === feature.id;
                const isLine = feature.type === 'LineString';

                return (
                  <li
                    key={feature.id}
                    className={`element-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedFeatureId(isSelected ? null : feature.id)}
                  >
                    <div className="element-row-icon">
                      {isLine ? <PenTool size={13} /> : <Square size={13} />}
                    </div>

                    <div className="element-row-meta">
                      <div className="element-row-title">
                        <span className="element-label">
                          {feature.label || `${isLine ? 'Line' : 'Zone'} #${idx + 1}`}
                        </span>
                        <span className="element-tag">{isLine ? 'Line' : 'Zone'}</span>
                      </div>
                      <span className="element-len tabular-nums">
                        {formatMeters(feature.lengthMeters)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="element-del-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFeature(feature.id);
                      }}
                      title="Delete this element"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Export Action Block */}
        <section className="export-block">
          <button
            type="button"
            className="pro-export-btn"
            onClick={handleExportGeoJSON}
            disabled={features.length === 0}
            title="Export RFC 7946 GeoJSON in WGS84"
          >
            <Download size={15} />
            <div className="btn-text">
              <span className="main-text">Export GeoJSON</span>
              <span className="sub-text">RFC 7946 (EPSG:4326)</span>
            </div>
          </button>

          <button
            type="button"
            className="pro-export-btn"
            onClick={handleExportCSV}
            disabled={features.length === 0}
            title="Export tabular CSV summary"
          >
            <FileSpreadsheet size={15} />
            <div className="btn-text">
              <span className="main-text">Export CSV</span>
              <span className="sub-text">Per-segment lengths & material totals</span>
            </div>
          </button>
        </section>
      </div>

      {/* Sidebar Footer */}
      <footer className="sidebar-footer">
        <p className="footer-copy">
          Autonomous line marking & geospatial parking lot planner. Tiles © Esri & OpenStreetMap contributors.
        </p>
      </footer>
    </aside>
  );
};
