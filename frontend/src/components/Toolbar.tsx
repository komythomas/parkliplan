'use client';

import React, { useState } from 'react';
import {
  Layers,
  MousePointer,
  PenTool,
  Square,
  Edit3,
  Trash2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  CloudUpload,
  FolderOpen,
  Loader2,
  Sidebar,
  Check,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { DrawingTool } from '../types/planner';
import { exportGeoJSON, exportCSV, generateGeoJSONString } from '../utils/export';
import { savePlanToBackend } from '../utils/api';
import { LoadPlanModal } from './LoadPlanModal';

export const Toolbar: React.FC = () => {
  const {
    basemap,
    setBasemap,
    activeTool,
    setActiveTool,
    planName,
    setPlanName,
    features,
    totalLengthMeters,
    clearAllFeatures,
    vectorSourceRef,
    isSidePanelOpen,
    toggleSidePanel,
  } = usePlanner();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(planName);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const handleSavePlan = async () => {
    if (features.length === 0) {
      showNotice('Draw at least one element before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const geojsonStr = generateGeoJSONString(vectorSourceRef.current, features, planName);
      const geojsonObj = JSON.parse(geojsonStr);
      const saved = await savePlanToBackend(planName, geojsonObj);
      showNotice(`Plan saved (${saved.id})`);
    } catch (err: any) {
      showNotice(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      setPlanName(tempName.trim());
    } else {
      setTempName(planName);
    }
    setIsEditingName(false);
  };

  const handleExportGeoJSON = () => {
    if (features.length === 0) {
      showNotice('Draw at least one element before exporting.');
      return;
    }
    const success = exportGeoJSON(vectorSourceRef.current, features, planName);
    if (success) {
      showNotice('GeoJSON (RFC 7946) exported');
    }
  };

  const handleExportCSV = () => {
    if (features.length === 0) {
      showNotice('Draw at least one element before exporting.');
      return;
    }
    const success = exportCSV(features, totalLengthMeters, planName);
    if (success) {
      showNotice('CSV spreadsheet exported');
    }
  };

  const showNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const tools: { id: DrawingTool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select', icon: <MousePointer size={14} />, shortcut: 'S' },
    { id: 'line', label: 'Line', icon: <PenTool size={14} />, shortcut: 'L' },
    { id: 'polygon', label: 'Zone', icon: <Square size={14} />, shortcut: 'P' },
    { id: 'modify', label: 'Modify', icon: <Edit3 size={14} />, shortcut: 'M' },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, shortcut: 'D' },
  ];

  return (
    <header className="pro-header">
      {/* Zone 1: Brand & Plan Name */}
      <div className="header-zone-left">
        <div className="brand-badge">
          <span className="brand-dot" />
          <span className="brand-name">Parkliplan</span>
          <span className="brand-chip">PRO GIS</span>
        </div>

        <div className="plan-name-container">
          {isEditingName ? (
            <div className="plan-name-edit">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') {
                    setTempName(planName);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                className="plan-name-input"
              />
              <button type="button" onClick={handleNameSave} className="plan-name-confirm">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempName(planName);
                setIsEditingName(true);
              }}
              className="plan-name-btn"
              title="Click to rename layout"
            >
              <span>{planName}</span>
              <Edit3 size={11} className="edit-icon" />
            </button>
          )}
        </div>
      </div>

      {/* Zone 2: Drawing Tools & Basemap Switcher */}
      <div className="header-zone-center">
        {/* Basemap Segment */}
        <div className="segmented-group" role="group" aria-label="Basemap">
          <button
            type="button"
            className={`segmented-item ${basemap === 'satellite' ? 'active' : ''}`}
            onClick={() => setBasemap('satellite')}
            title="Satellite Aerial Imagery (Esri)"
          >
            <Layers size={13} />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            className={`segmented-item ${basemap === 'osm' ? 'active' : ''}`}
            onClick={() => setBasemap('osm')}
            title="OpenStreetMap Cartography"
          >
            <Layers size={13} />
            <span>Street</span>
          </button>
        </div>

        <div className="header-divider" />

        {/* Vector Drawing Toolset */}
        <div className="tools-segmented" role="toolbar" aria-label="Drawing Tools">
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`tool-item ${isActive ? 'active' : ''} ${tool.id === 'delete' ? 'danger' : ''}`}
                title={`${tool.label} mode (${tool.shortcut})`}
              >
                {tool.icon}
                <span>{tool.label}</span>
                <span className="shortcut-pill">{tool.shortcut}</span>
              </button>
            );
          })}
        </div>

        {/* Magnetic Snap Badge */}
        <div className="snap-pill" title="12px magnetic vertex and edge snapping active">
          <span className="snap-dot" />
          <span>12px Snap</span>
        </div>
      </div>

      {/* Zone 3: Actions & Sidebar Toggle */}
      <div className="header-zone-right">
        {/* Persistence Group */}
        <div className="btn-group">
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={features.length === 0 || isSaving}
            className="action-pill save-pill"
            title="Save plan to SQLite database"
          >
            {isSaving ? <Loader2 size={13} className="spinner" /> : <CloudUpload size={13} />}
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLoadModalOpen(true)}
            className="action-pill"
            title="Load saved layout"
          >
            <FolderOpen size={13} />
            <span>Load</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (features.length === 0) return;
              if (window.confirm('Clear all lines and zones from canvas?')) {
                clearAllFeatures();
              }
            }}
            disabled={features.length === 0}
            className="action-pill"
            title="Clear all drawn elements"
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>
        </div>

        <div className="header-divider" />

        {/* Exports Group */}
        <div className="btn-group">
          <button
            type="button"
            onClick={handleExportGeoJSON}
            disabled={features.length === 0}
            className="action-pill export-pill"
            title="Export GeoJSON RFC 7946"
          >
            <Download size={13} />
            <span>GeoJSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={features.length === 0}
            className="action-pill export-pill"
            title="Export tabular CSV summary"
          >
            <FileSpreadsheet size={13} />
            <span>CSV</span>
          </button>
        </div>

        <div className="header-divider" />

        {/* Sidebar Toggle Button */}
        <button
          type="button"
          onClick={toggleSidePanel}
          className={`sidebar-toggle-btn ${isSidePanelOpen ? 'active' : ''}`}
          title={isSidePanelOpen ? 'Collapse Telemetry & Estimator Panel' : 'Open Telemetry & Estimator Panel'}
          aria-label="Toggle Telemetry Sidebar"
        >
          <Sidebar size={14} />
          <span className="sidebar-btn-label">Telemetry</span>
          {features.length > 0 && (
            <span className="sidebar-count-badge">{features.length}</span>
          )}
        </button>
      </div>

      {/* Floating Toast Notification */}
      {exportNotice && (
        <div className="pro-toast">
          <Check size={13} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Load Plan Modal */}
      <LoadPlanModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onPlanLoaded={(loadedName) => showNotice(`Loaded "${loadedName}"`)}
      />
    </header>
  );
};
