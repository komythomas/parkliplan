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
  Magnet,
  Check,
  CloudUpload,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { DrawingTool, BasemapType } from '../types/planner';
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
  } = usePlanner();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(planName);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const handleSavePlan = async () => {
    if (features.length === 0) {
      showNotice('Draw at least one line or zone before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const geojsonStr = generateGeoJSONString(vectorSourceRef.current, features, planName);
      const geojsonObj = JSON.parse(geojsonStr);
      const saved = await savePlanToBackend(planName, geojsonObj);
      showNotice(`Plan saved successfully (ID: ${saved.id})!`);
    } catch (err: any) {
      showNotice(`Error saving: ${err.message}`);
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
      showNotice('Draw at least one line or zone before exporting.');
      return;
    }
    const success = exportGeoJSON(vectorSourceRef.current, features, planName);
    if (success) {
      showNotice('GeoJSON exported successfully (RFC 7946 WGS84)!');
    }
  };

  const handleExportCSV = () => {
    if (features.length === 0) {
      showNotice('Draw at least one line or zone before exporting.');
      return;
    }
    const success = exportCSV(features, totalLengthMeters, planName);
    if (success) {
      showNotice('CSV spreadsheet exported successfully!');
    }
  };

  const showNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const tools: { id: DrawingTool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select', icon: <MousePointer size={16} />, shortcut: 'S' },
    { id: 'line', label: 'Draw Line', icon: <PenTool size={16} />, shortcut: 'L' },
    { id: 'polygon', label: 'Draw Zone', icon: <Square size={16} />, shortcut: 'P' },
    { id: 'modify', label: 'Modify', icon: <Edit3 size={16} />, shortcut: 'M' },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={16} />, shortcut: 'D' },
  ];

  return (
    <header className="toolbar-container">
      {/* Brand & Plan Name */}
      <div className="toolbar-section">
        <div className="brand-group">
          <div className="brand-logo">
            <span className="brand-dot" />
            <span className="brand-title">Parkliplan</span>
          </div>
          <span className="robot-badge" title="Compatible with 10Lines Autonomous Striping Robots">
            10Lines Ready
          </span>
        </div>

        <div className="plan-name-wrapper">
          {isEditingName ? (
            <div className="plan-name-input-group">
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
              <button onClick={handleNameSave} className="plan-name-btn" title="Save name">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempName(planName);
                setIsEditingName(true);
              }}
              className="plan-name-display"
              title="Click to rename plan"
            >
              <span>{planName}</span>
              <Edit3 size={12} className="edit-icon" />
            </button>
          )}
        </div>
      </div>

      {/* Basemap Switcher */}
      <div className="toolbar-section basemap-section">
        <div className="segmented-control" role="group" aria-label="Basemap Switcher">
          <button
            type="button"
            className={`segmented-btn ${basemap === 'satellite' ? 'active' : ''}`}
            onClick={() => setBasemap('satellite')}
            title="High-resolution Esri World Imagery"
          >
            <Layers size={14} />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${basemap === 'osm' ? 'active' : ''}`}
            onClick={() => setBasemap('osm')}
            title="OpenStreetMap Cartographic Basemap"
          >
            <Layers size={14} />
            <span>Street (OSM)</span>
          </button>
        </div>
      </div>

      {/* Vector Drawing Tools */}
      <div className="toolbar-section tools-section">
        <div className="tools-group" role="toolbar" aria-label="Drawing Tools">
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`tool-btn ${isActive ? 'active' : ''} ${tool.id === 'delete' ? 'danger-tool' : ''}`}
                title={`${tool.label} (Press ${tool.shortcut})`}
              >
                {tool.icon}
                <span className="tool-label">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Magnetic Snapping Indicator */}
        <div className="snap-indicator" title="Automatic 12px magnetic snap to vertices and edges">
          <Magnet size={13} className="snap-icon" />
          <span>Snap 12px</span>
        </div>
      </div>

      {/* Actions: Clear & Exports */}
      <div className="toolbar-section actions-section">
        <button
          type="button"
          onClick={() => {
            if (features.length === 0) return;
            if (window.confirm('Are you sure you want to clear all lines and zones from this plan?')) {
              clearAllFeatures();
            }
          }}
          disabled={features.length === 0}
          className="action-btn clear-btn"
          title="Clear all drawn elements"
        >
          <RotateCcw size={14} />
          <span>Clear</span>
        </button>

        <div className="persistence-group">
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={features.length === 0 || isSaving}
            className="action-btn save-btn"
            title="Save plan to SQLite database via FastAPI"
          >
            {isSaving ? <Loader2 size={14} className="spinner" /> : <CloudUpload size={14} />}
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLoadModalOpen(true)}
            className="action-btn load-btn"
            title="Load saved plan from database"
          >
            <FolderOpen size={14} />
            <span>Load</span>
          </button>
        </div>

        <div className="export-group">
          <button
            type="button"
            onClick={handleExportGeoJSON}
            disabled={features.length === 0}
            className="action-btn export-btn"
            title="Export GeoJSON RFC 7946 standard file"
          >
            <Download size={14} />
            <span>GeoJSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={features.length === 0}
            className="action-btn export-btn csv-btn"
            title="Export structured CSV report with individual segment lengths and total"
          >
            <FileSpreadsheet size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {exportNotice && (
        <div className="toast-notice">
          <Check size={14} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Load Plan Modal */}
      <LoadPlanModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onPlanLoaded={(loadedName) => showNotice(`Plan "${loadedName}" loaded successfully!`)}
      />
    </header>
  );
};
