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
import { DrawingTool, MARKING_CONFIGS, MarkingType } from '../types/planner';
import { exportGeoJSON, exportCSV, generateGeoJSONString } from '../utils/export';
import { savePlanToBackend } from '../utils/api';
import { LoadPlanModal } from './LoadPlanModal';
import { LocationSearch } from './LocationSearch';

export const Toolbar: React.FC = () => {
  const {
    basemap,
    setBasemap,
    activeTool,
    setActiveTool,
    markingType,
    setMarkingType,
    costPerMeter,
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
      showNotice(`Plan saved (${saved.id.slice(0, 8)})`);
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
      showNotice('GeoJSON exported');
    }
  };

  const handleExportCSV = () => {
    if (features.length === 0) {
      showNotice('Draw at least one element before exporting.');
      return;
    }
    const success = exportCSV(features, totalLengthMeters, planName, costPerMeter);
    if (success) {
      showNotice('CSV exported with cost estimates');
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

  const markingTypesList: MarkingType[] = ['standard', 'prm', 'safety', 'ev'];

  return (
    <header className="pro-header">
      {/* Left: Brand, Plan Name & Location Search */}
      <div className="header-zone-left">
        <div className="brand-badge">
          <span className="brand-name">Parkliplan</span>
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
              <button type="button" onClick={handleNameSave} className="plan-name-confirm" aria-label="Confirm rename">
                <Check size={13} />
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
              title="Click to rename"
            >
              <span>{planName}</span>
              <Edit3 size={11} className="edit-icon" />
            </button>
          )}
        </div>

        <div className="header-divider" />

        {/* Location Search Bar (Feature B) */}
        <LocationSearch />
      </div>

      {/* Center: Basemap, Tools & Marking Color Swatches */}
      <div className="header-zone-center">
        {/* Basemap Switcher */}
        <div className="segmented-group" role="group" aria-label="Basemap">
          <button
            type="button"
            className={`segmented-item ${basemap === 'satellite' ? 'active' : ''}`}
            onClick={() => setBasemap('satellite')}
            title="Satellite Imagery"
          >
            <Layers size={13} />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            className={`segmented-item ${basemap === 'osm' ? 'active' : ''}`}
            onClick={() => setBasemap('osm')}
            title="Map Cartography"
          >
            <Layers size={13} />
            <span>Map</span>
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
                title={`${tool.label} (${tool.shortcut})`}
              >
                {tool.icon}
                <span>{tool.label}</span>
                <span className="key-hint">{tool.shortcut}</span>
              </button>
            );
          })}
        </div>

        <div className="header-divider" />

        {/* Marking Color / Type Selector (Feature A) */}
        <div className="marking-type-selector" role="group" aria-label="Marking Color and Classification">
          {markingTypesList.map((typeKey) => {
            const config = MARKING_CONFIGS[typeKey];
            const isSelected = markingType === typeKey;

            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setMarkingType(typeKey)}
                className={`marking-type-btn ${isSelected ? 'active' : ''}`}
                title={`${config.label} — ${config.description}`}
                aria-pressed={isSelected}
              >
                <span
                  className="marking-color-dot"
                  style={{ backgroundColor: config.color }}
                />
                <span className="marking-label">{config.badgeLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="header-divider" />

        {/* Magnetic Snapping Status */}
        <div className="snap-indicator" title="Magnetic snapping active (12px)">
          <span>Snap 12px</span>
        </div>
      </div>

      {/* Right: Actions & Sidebar Toggle */}
      <div className="header-zone-right">
        <div className="btn-group">
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={features.length === 0 || isSaving}
            className="action-btn primary"
            title="Save layout"
          >
            {isSaving ? <Loader2 size={13} className="spinner" /> : <CloudUpload size={13} />}
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLoadModalOpen(true)}
            className="action-btn"
            title="Open saved layouts"
          >
            <FolderOpen size={13} />
            <span>Open</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (features.length === 0) return;
              if (window.confirm('Clear all drawn lines and zones?')) {
                clearAllFeatures();
              }
            }}
            disabled={features.length === 0}
            className="action-btn"
            title="Clear canvas"
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>
        </div>

        <div className="header-divider" />

        <div className="btn-group">
          <button
            type="button"
            onClick={handleExportGeoJSON}
            disabled={features.length === 0}
            className="action-btn"
            title="Export GeoJSON"
          >
            <Download size={13} />
            <span>GeoJSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={features.length === 0}
            className="action-btn"
            title="Export CSV"
          >
            <FileSpreadsheet size={13} />
            <span>CSV</span>
          </button>
        </div>

        <div className="header-divider" />

        {/* Sidebar Toggle */}
        <button
          type="button"
          onClick={toggleSidePanel}
          className={`sidebar-toggle-btn ${isSidePanelOpen ? 'active' : ''}`}
          title={isSidePanelOpen ? 'Hide side panel' : 'Show side panel'}
          aria-label="Toggle side panel"
        >
          <Sidebar size={14} />
          <span>Panel</span>
          {features.length > 0 && (
            <span className="badge-count">{features.length}</span>
          )}
        </button>
      </div>

      {/* Toast Notification */}
      {exportNotice && (
        <div className="pro-toast">
          <Check size={13} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Load Modal */}
      <LoadPlanModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onPlanLoaded={(loadedName) => showNotice(`Loaded "${loadedName}"`)}
      />
    </header>
  );
};
