'use client';

import React, { useState } from 'react';
import {
  PenTool,
  Square,
  Trash2,
  Download,
  FileSpreadsheet,
  Bot,
  UserCheck,
  Zap,
  ChevronRight,
  ChevronLeft,
  Ruler,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { formatMeters } from '../utils/metrics';
import { exportGeoJSON, exportCSV } from '../utils/export';

export const SidePanel: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    features,
    totalLengthMeters,
    selectedFeatureId,
    setSelectedFeatureId,
    deleteFeature,
    planName,
    vectorSourceRef,
  } = usePlanner();

  const lineCount = features.filter((f) => f.type === 'LineString').length;
  const zoneCount = features.filter((f) => f.type === 'Polygon').length;

  // 10Lines Autonomous Striping Robot vs Manual Crew Estimation
  // Autonomous Striping: ~1.0 m/s (~60 m/min)
  // Manual crew: ~0.2 m/s (~12 m/min)
  const robotMinutes = totalLengthMeters > 0 ? totalLengthMeters / 60 : 0;
  const manualMinutes = totalLengthMeters > 0 ? totalLengthMeters / 12 : 0;

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '0 min';
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
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
    <>
      {/* Floating Pill Trigger when Collapsed */}
      {isCollapsed && (
        <button
          type="button"
          className="panel-expand-trigger"
          onClick={() => setIsCollapsed(false)}
          title="Expand telemetry panel"
        >
          <ChevronLeft size={15} />
          <Ruler size={14} />
          <span className="tabular-nums">{formatMeters(totalLengthMeters)}</span>
        </button>
      )}

      {/* Floating Side Panel */}
      <aside className={`floating-panel-container ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Panel Header */}
        <header className="panel-header">
          <div className="panel-title-wrapper">
            <h2 className="panel-title">Telemetry & Inventory</h2>
          </div>
          <button
            type="button"
            className="panel-toggle-btn"
            onClick={() => setIsCollapsed(true)}
            title="Minimize panel"
          >
            <ChevronRight size={16} />
          </button>
        </header>

        <div className="panel-scroll-area">
          {/* Hero Linear Meterage Card */}
          <section className="nordic-card hero-meterage-card">
            <div className="hero-micro-label">
              <span>Total Linear Distance</span>
              <span className="geo-spec-tag">WGS84 Geodesic</span>
            </div>
            <div className="hero-metric-readout">
              <span className="hero-metric-value tabular-nums">
                {totalLengthMeters.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className="hero-metric-unit">m</span>
            </div>
            <div className="hero-breakdown-row">
              <span><strong>{features.length}</strong> elements</span>
              <span>•</span>
              <span><strong>{lineCount}</strong> lines</span>
              <span>•</span>
              <span><strong>{zoneCount}</strong> zones</span>
            </div>
          </section>

          {/* 10Lines Autonomous Estimator Card */}
          <section className="nordic-card estimator-card">
            <div className="estimator-header">
              <div className="estimator-title-group">
                <Zap size={13} style={{ color: 'var(--accent-lichen)' }} />
                <span className="estimator-title">10Lines Estimator</span>
              </div>
              {totalLengthMeters > 0 && (
                <span className="estimator-speedup-tag">~{timeSavedPercent}% Faster</span>
              )}
            </div>

            <div className="estimator-matrix">
              <div className="matrix-col">
                <span className="matrix-label robot-label">
                  <Bot size={13} />
                  <span>10Lines Robot</span>
                </span>
                <span className="matrix-time tabular-nums">{formatDuration(robotMinutes)}</span>
                <span className="matrix-rate">@ 1.0 m/s autonomous</span>
              </div>

              <div className="matrix-divider" />

              <div className="matrix-col">
                <span className="matrix-label">
                  <UserCheck size={13} />
                  <span>Manual Crew</span>
                </span>
                <span className="matrix-time tabular-nums">{formatDuration(manualMinutes)}</span>
                <span className="matrix-rate">@ 0.2 m/s manual</span>
              </div>
            </div>
          </section>

          {/* Elements Inventory */}
          <section>
            <div className="inventory-section-header">
              <span className="inventory-title">Elements ({features.length})</span>
            </div>

            {features.length === 0 ? (
              <div className="inventory-empty-card">
                <PenTool size={18} style={{ color: 'var(--text-muted)' }} />
                <p className="empty-guide-text">
                  Press <strong>L</strong> to draw stall lines or <strong>P</strong> for zones on the aerial canvas.
                </p>
              </div>
            ) : (
              <ul className="inventory-items-list" role="list">
                {features.map((feature, idx) => {
                  const isSelected = selectedFeatureId === feature.id;
                  const isLine = feature.type === 'LineString';

                  return (
                    <li
                      key={feature.id}
                      className={`inventory-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedFeatureId(isSelected ? null : feature.id)}
                    >
                      <div className="row-icon">
                        {isLine ? <PenTool size={13} /> : <Square size={13} />}
                      </div>

                      <div className="row-meta">
                        <div className="row-top-line">
                          <span className="row-name">
                            {feature.label || `${isLine ? 'Line' : 'Zone'} #${idx + 1}`}
                          </span>
                          <span className="row-type-tag">{isLine ? 'Line' : 'Zone'}</span>
                        </div>
                        <span className="row-length tabular-nums">
                          {formatMeters(feature.lengthMeters)}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="row-trash-btn"
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

          {/* Direct Export Stack */}
          <section className="export-stack">
            <button
              type="button"
              className="nordic-export-btn"
              onClick={handleExportGeoJSON}
              disabled={features.length === 0}
              title="Export RFC 7946 GeoJSON in WGS84"
            >
              <Download size={15} style={{ color: 'var(--accent-arctic-light)' }} />
              <div className="export-btn-label-block">
                <span className="export-primary-text">Export GeoJSON</span>
                <span className="export-secondary-text">RFC 7946 (EPSG:4326)</span>
              </div>
            </button>

            <button
              type="button"
              className="nordic-export-btn"
              onClick={handleExportCSV}
              disabled={features.length === 0}
              title="Export tabular CSV summary"
            >
              <FileSpreadsheet size={15} style={{ color: 'var(--accent-lichen)' }} />
              <div className="export-btn-label-block">
                <span className="export-primary-text">Export CSV</span>
                <span className="export-secondary-text">Per-segment lengths & total</span>
              </div>
            </button>
          </section>
        </div>

        {/* Legal & Attribution Footer */}
        <footer className="panel-footer-legal">
          <p className="legal-copy">
            Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community.
          </p>
        </footer>
      </aside>
    </>
  );
};
