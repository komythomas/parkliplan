'use client';

import React from 'react';
import {
  PenTool,
  Square,
  Trash2,
  Download,
  FileSpreadsheet,
  Bot,
  UserCheck,
  Zap,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { formatMeters } from '../utils/metrics';
import { exportGeoJSON, exportCSV } from '../utils/export';

export const SidePanel: React.FC = () => {
  const {
    features,
    totalLengthMeters,
    selectedFeatureId,
    setSelectedFeatureId,
    deleteFeature,
    planName,
    vectorSourceRef,
  } = usePlanner();

  // Metrics computation
  const lineCount = features.filter((f) => f.type === 'LineString').length;
  const zoneCount = features.filter((f) => f.type === 'Polygon').length;

  // 10Lines Autonomous Striping Robot vs Manual Striping Estimation
  // 10Lines autonomous robot speed: ~1.0 m/s (~60 m/min)
  // Manual crew striping speed (chalking + push striper): ~0.2 m/s (~12 m/min)
  const robotMinutes = totalLengthMeters > 0 ? (totalLengthMeters / 60) : 0;
  const manualMinutes = totalLengthMeters > 0 ? (totalLengthMeters / 12) : 0;

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '0 min';
    if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s > 0 ? `${m}m ${s}s` : `${m} min`;
  };

  const timeSavedPercent = manualMinutes > 0
    ? Math.round(((manualMinutes - robotMinutes) / manualMinutes) * 100)
    : 0;

  const handleExportGeoJSON = () => {
    exportGeoJSON(vectorSourceRef.current, features, planName);
  };

  const handleExportCSV = () => {
    exportCSV(features, totalLengthMeters, planName);
  };

  return (
    <aside className="side-panel-container">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-row">
          <Layers size={18} className="panel-header-icon" />
          <h2 className="panel-title">Plan Overview</h2>
        </div>
        <span className="panel-subtitle">Real-time Geodesic Metrics & Inventory</span>
      </div>

      <div className="panel-content">
        {/* Hero Metric Card: Total Geodesic Distance */}
        <section className="metric-card hero-card">
          <div className="metric-label-row">
            <span className="metric-label">TOTAL LINEAR METERS</span>
            <span className="accuracy-badge" title="WGS84 Geodesic Ellipsoidal Distance">
              WGS84 Geodesic
            </span>
          </div>
          <div className="metric-value-display">
            <span className="metric-number">
              {totalLengthMeters.toLocaleString('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="metric-unit">m</span>
          </div>
          <div className="metric-breakdown">
            <span className="breakdown-item">
              <strong>{features.length}</strong> elements
            </span>
            <span className="breakdown-separator">•</span>
            <span className="breakdown-item">
              <strong>{lineCount}</strong> lines
            </span>
            <span className="breakdown-separator">•</span>
            <span className="breakdown-item">
              <strong>{zoneCount}</strong> zones
            </span>
          </div>
        </section>

        {/* 10Lines Autonomous Striping vs Manual Striping Estimator */}
        <section className="metric-card roi-card">
          <div className="roi-header">
            <div className="roi-title-group">
              <Zap size={16} className="roi-icon" />
              <span className="roi-title">10Lines Striping Estimator</span>
            </div>
            {totalLengthMeters > 0 && (
              <span className="roi-savings-badge">
                ~{timeSavedPercent}% Faster
              </span>
            )}
          </div>

          <div className="comparison-grid">
            <div className="comparison-col robot-col">
              <div className="comp-header">
                <Bot size={15} className="comp-icon" />
                <span>10Lines Robot</span>
              </div>
              <div className="comp-value">{formatDuration(robotMinutes)}</div>
              <div className="comp-rate">@ 1.0 m/s autonomous</div>
            </div>

            <div className="comparison-divider" />

            <div className="comparison-col manual-col">
              <div className="comp-header">
                <UserCheck size={15} className="comp-icon" />
                <span>Manual Crew</span>
              </div>
              <div className="comp-value">{formatDuration(manualMinutes)}</div>
              <div className="comp-rate">@ 0.2 m/s manual</div>
            </div>
          </div>
        </section>

        {/* Elements Inventory Section */}
        <section className="inventory-section">
          <div className="inventory-header">
            <h3 className="section-title">
              Drawn Elements ({features.length})
            </h3>
            {features.length > 0 && (
              <span className="click-hint">Click to inspect</span>
            )}
          </div>

          {features.length === 0 ? (
            <div className="empty-inventory">
              <div className="empty-icon-circle">
                <PenTool size={22} />
              </div>
              <p className="empty-title">No elements drawn yet</p>
              <p className="empty-desc">
                Select <strong>Draw Line</strong> (L) or <strong>Draw Zone</strong> (P) in the toolbar
                to begin marking layout segments directly on satellite imagery.
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
                    className={`element-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedFeatureId(isSelected ? null : feature.id)}
                  >
                    <div className="element-icon-wrapper">
                      {isLine ? <PenTool size={14} /> : <Square size={14} />}
                    </div>

                    <div className="element-details">
                      <div className="element-name-row">
                        <span className="element-name">
                          {feature.label || `${isLine ? 'Line' : 'Zone'} #${idx + 1}`}
                        </span>
                        <span className="element-type-badge">
                          {isLine ? 'Line' : 'Zone'}
                        </span>
                      </div>
                      <span className="element-metric">
                        {formatMeters(feature.lengthMeters)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="element-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFeature(feature.id);
                      }}
                      title="Delete this element"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Export Actions Section */}
        <section className="export-section">
          <h3 className="section-title">Export Plan</h3>
          <div className="export-buttons-stack">
            <button
              type="button"
              className="export-panel-btn geojson-btn"
              onClick={handleExportGeoJSON}
              disabled={features.length === 0}
              title="Export valid RFC 7946 GeoJSON in WGS84 coordinates"
            >
              <Download size={16} />
              <div className="btn-text-block">
                <span className="btn-main-text">Export GeoJSON</span>
                <span className="btn-sub-text">RFC 7946 (EPSG:4326) standard</span>
              </div>
              <ChevronRight size={16} className="btn-arrow" />
            </button>

            <button
              type="button"
              className="export-panel-btn csv-btn"
              onClick={handleExportCSV}
              disabled={features.length === 0}
              title="Export CSV table with individual segments and total"
            >
              <FileSpreadsheet size={16} />
              <div className="btn-text-block">
                <span className="btn-main-text">Export CSV Spreadsheet</span>
                <span className="btn-sub-text">Segment lengths & cumulative total</span>
              </div>
              <ChevronRight size={16} className="btn-arrow" />
            </button>
          </div>
        </section>
      </div>

      {/* Legal & Technical Footer */}
      <footer className="panel-footer">
        <div className="attribution-row">
          <Info size={12} className="info-icon" />
          <p className="attribution-text">
            <strong>Esri World Imagery:</strong> Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX,
            GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.
          </p>
        </div>
      </footer>
    </aside>
  );
};
