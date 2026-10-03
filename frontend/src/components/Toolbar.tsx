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
      showNotice('CSV report exported');
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
    <div className="floating-toolbar-wrapper">
      <header className="floating-dock">
        {/* Brand Capsule */}
        <div className="dock-brand">
          <span className="brand-gem" />
          <span className="brand-label">Parkliplan</span>
          <span className="tag-10lines" title="10Lines Autonomous Striping Ready">10Lines</span>
        </div>

        <div className="dock-divider" />

        {/* Basemap Switcher */}
        <div className="dock-segmented" role="group" aria-label="Basemap Toggle">
          <button
            type="button"
            className={`dock-segmented-btn ${basemap === 'satellite' ? 'active' : ''}`}
            onClick={() => setBasemap('satellite')}
            title="High-resolution Esri World Imagery"
          >
            <Layers size={13} />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            className={`dock-segmented-btn ${basemap === 'osm' ? 'active' : ''}`}
            onClick={() => setBasemap('osm')}
            title="OpenStreetMap Street View"
          >
            <Layers size={13} />
            <span>Street</span>
          </button>
        </div>

        <div className="dock-divider" />

        {/* Vector Drawing Tools */}
        <div className="dock-tools" role="toolbar" aria-label="Vector Drawing Tools">
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`dock-tool-btn ${isActive ? 'active' : ''} ${tool.id === 'delete' ? 'danger-tool' : ''}`}
                title={`${tool.label} mode (Shortcut: ${tool.shortcut})`}
              >
                {tool.icon}
                <span>{tool.label}</span>
                <span className="dock-key-badge">{tool.shortcut}</span>
              </button>
            );
          })}
        </div>

        {/* Snapping Pill */}
        <div className="dock-snap-badge" title="12px magnetic snap enabled for vertices and edges">
          <span className="snap-pulse-dot" />
          <span>Snap 12px</span>
        </div>

        <div className="dock-divider" />

        {/* Action Controls */}
        <button
          type="button"
          onClick={handleSavePlan}
          disabled={features.length === 0 || isSaving}
          className="dock-action-btn btn-save"
          title="Save plan to SQLite database"
        >
          {isSaving ? <Loader2 size={13} className="spinner" /> : <CloudUpload size={13} />}
          <span>Save</span>
        </button>

        <button
          type="button"
          onClick={() => setIsLoadModalOpen(true)}
          className="dock-action-btn"
          title="Open saved plans repository"
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
          className="dock-action-btn"
          title="Clear all features"
        >
          <RotateCcw size={13} />
          <span>Clear</span>
        </button>

        <button
          type="button"
          onClick={handleExportGeoJSON}
          disabled={features.length === 0}
          className="dock-action-btn"
          title="Export GeoJSON RFC 7946"
        >
          <Download size={13} />
          <span>GeoJSON</span>
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={features.length === 0}
          className="dock-action-btn"
          title="Export tabular CSV summary"
        >
          <FileSpreadsheet size={13} />
          <span>CSV</span>
        </button>
      </header>

      {/* Floating Toast Notification */}
      {exportNotice && (
        <div className="nordic-toast">
          <span className="toast-gem" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Load Plan Modal */}
      <LoadPlanModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onPlanLoaded={(loadedName) => showNotice(`Loaded "${loadedName}"`)}
      />
    </div>
  );
};
