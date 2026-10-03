'use client';

import React, { useState } from 'react';
import {
  PenTool,
  Square,
  Trash2,
  Download,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { formatMeters } from '../utils/metrics';
import { exportGeoJSON, exportCSV } from '../utils/export';

type LineWidthOption = 0.10 | 0.12 | 0.15; // in meters (10cm, 12cm, 15cm)

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

  const [lineWidth, setLineWidth] = useState<LineWidthOption>(0.10);

  if (!isSidePanelOpen) return null;

  const lineCount = features.filter((f) => f.type === 'LineString').length;
  const zoneCount = features.filter((f) => f.type === 'Polygon').length;

  // Real pavement marking physical estimates:
  // Surface Area (m²) = Length (m) * Width (m)
  const surfaceAreaSqM = totalLengthMeters * lineWidth;

  // Traffic paint: ~0.20 L/m² standard application rate
  const paintLiters = surfaceAreaSqM * 0.20;

  // Reflective glass beads: ~300 g/m² standard drop-on
  const glassBeadsKg = surfaceAreaSqM * 0.30;

  // Standard striper application time (~50 m/min)
  const spraySeconds = totalLengthMeters > 0 ? (totalLengthMeters / 50) * 60 : 0;

  const formatSeconds = (sec: number): string => {
    if (sec === 0) return '0s';
    if (sec < 60) return `${Math.round(sec)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
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
      {/* Header */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Plan details</h2>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={toggleSidePanel}
          title="Close panel"
          aria-label="Close details"
        >
          <X size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {/* Metric Summary */}
        <div className="sidebar-section hero-section">
          <div className="metric-label">Total length</div>
          <div className="metric-readout">
            <span className="metric-val tabular-nums">
              {totalLengthMeters.toLocaleString('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="metric-unit">m</span>
          </div>
          <div className="metric-sub">
            {features.length === 0 ? (
              <span>No elements drawn</span>
            ) : (
              <span>
                {features.length} element{features.length > 1 ? 's' : ''} · {lineCount} line{lineCount !== 1 ? 's' : ''} · {zoneCount} zone{zoneCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Material & Work Estimates */}
        <div className="sidebar-section">
          <div className="section-title-row">
            <span className="section-title">Material estimates</span>
            <div className="inline-segmented">
              <button
                type="button"
                className={`seg-btn ${lineWidth === 0.10 ? 'active' : ''}`}
                onClick={() => setLineWidth(0.10)}
              >
                10 cm
              </button>
              <button
                type="button"
                className={`seg-btn ${lineWidth === 0.12 ? 'active' : ''}`}
                onClick={() => setLineWidth(0.12)}
              >
                12 cm
              </button>
              <button
                type="button"
                className={`seg-btn ${lineWidth === 0.15 ? 'active' : ''}`}
                onClick={() => setLineWidth(0.15)}
              >
                15 cm
              </button>
            </div>
          </div>

          <div className="estimates-table">
            <div className="estimate-row">
              <span className="est-key">Marked area</span>
              <span className="est-val tabular-nums">
                {surfaceAreaSqM.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} m²
              </span>
            </div>

            <div className="estimate-row">
              <span className="est-key">Traffic paint</span>
              <span className="est-val tabular-nums">
                {paintLiters.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} L
              </span>
            </div>

            <div className="estimate-row">
              <span className="est-key">Glass beads</span>
              <span className="est-val tabular-nums">
                {glassBeadsKg.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} kg
              </span>
            </div>

            <div className="estimate-row">
              <span className="est-key">Application time</span>
              <span className="est-val tabular-nums">
                ~{formatSeconds(spraySeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Elements Inventory */}
        <div className="sidebar-section elements-section">
          <div className="section-title-row">
            <span className="section-title">Elements ({features.length})</span>
          </div>

          {features.length === 0 ? (
            <div className="empty-notice">
              Draw lines (press <strong>L</strong>) or zones (press <strong>P</strong>) on the map.
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
                    <span className="row-icon">
                      {isLine ? <PenTool size={13} /> : <Square size={13} />}
                    </span>

                    <div className="row-info">
                      <span className="row-name">
                        {feature.label || `${isLine ? 'Line' : 'Zone'} ${idx + 1}`}
                      </span>
                      <span className="row-len tabular-nums">
                        {formatMeters(feature.lengthMeters)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="row-del-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFeature(feature.id);
                      }}
                      title="Delete element"
                      aria-label="Delete element"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Export Buttons */}
        <div className="export-actions">
          <button
            type="button"
            className="export-btn"
            onClick={handleExportGeoJSON}
            disabled={features.length === 0}
          >
            <Download size={14} />
            <span>Export GeoJSON</span>
          </button>

          <button
            type="button"
            className="export-btn"
            onClick={handleExportCSV}
            disabled={features.length === 0}
          >
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
