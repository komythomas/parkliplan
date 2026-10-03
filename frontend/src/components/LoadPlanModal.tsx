'use client';

import React, { useEffect, useState } from 'react';
import { X, FolderOpen, Trash2, Calendar, Ruler, Layers, Loader2, AlertCircle } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { fetchPlansList, fetchPlanById, deletePlanFromBackend, PlanSummary } from '../utils/api';
import { formatMeters } from '../utils/metrics';

interface LoadPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanLoaded?: (planName: string) => void;
}

export const LoadPlanModal: React.FC<LoadPlanModalProps> = ({ isOpen, onClose, onPlanLoaded }) => {
  const { loadPlanFromGeoJSON } = usePlanner();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPlansList();
      setPlans(data);
    } catch (err: any) {
      setError(err?.message || 'Could not connect to FastAPI backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const handleSelectPlan = async (plan: PlanSummary) => {
    setLoadingPlanId(plan.id);
    try {
      const fullPlan = await fetchPlanById(plan.id);
      if (fullPlan && fullPlan.geojson) {
        loadPlanFromGeoJSON(fullPlan.geojson, fullPlan.name, fullPlan.id);
        if (onPlanLoaded) onPlanLoaded(fullPlan.name);
        onClose();
      }
    } catch (err: any) {
      alert(`Error loading plan: ${err.message}`);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleDeletePlan = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this plan from the database?')) {
      return;
    }

    try {
      const success = await deletePlanFromBackend(planId);
      if (success) {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
      }
    } catch (err: any) {
      alert(`Failed to delete plan: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <FolderOpen size={20} className="modal-icon" />
            <div>
              <h3 className="modal-title">Saved Parking Layouts</h3>
              <p className="modal-subtitle">SQLite & FastAPI GeoJSON Storage</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {isLoading ? (
            <div className="modal-loading-state">
              <Loader2 size={28} className="spinner" />
              <span>Fetching plans from database...</span>
            </div>
          ) : error ? (
            <div className="modal-error-state">
              <AlertCircle size={24} />
              <p>{error}</p>
              <button type="button" onClick={loadPlans} className="modal-retry-btn">
                Retry Connection
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="modal-empty-state">
              <Layers size={32} className="empty-icon" />
              <p className="empty-title">No saved plans found</p>
              <p className="empty-desc">
                Draw lines or zones on the satellite canvas and click <strong>Save Plan</strong> to store
                your layout in the database.
              </p>
            </div>
          ) : (
            <ul className="plans-list" role="list">
              {plans.map((plan) => {
                const isSelected = loadingPlanId === plan.id;
                const formattedDate = new Date(plan.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <li
                    key={plan.id}
                    className={`plan-card ${isSelected ? 'loading' : ''}`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    <div className="plan-card-left">
                      <span className="plan-card-name">{plan.name}</span>
                      <div className="plan-card-meta">
                        <span className="meta-badge">
                          <Ruler size={12} />
                          {formatMeters(plan.total_length_m)}
                        </span>
                        <span className="meta-badge">
                          <Layers size={12} />
                          {plan.features_count} elements
                        </span>
                        <span className="meta-date">
                          <Calendar size={12} />
                          {formattedDate}
                        </span>
                      </div>
                    </div>

                    <div className="plan-card-actions">
                      <button
                        type="button"
                        className="plan-load-btn"
                        disabled={isSelected}
                        title="Load this plan onto canvas"
                      >
                        {isSelected ? <Loader2 size={14} className="spinner" /> : <FolderOpen size={14} />}
                        <span>Load</span>
                      </button>

                      <button
                        type="button"
                        className="plan-delete-btn"
                        onClick={(e) => handleDeletePlan(e, plan.id)}
                        title="Delete from database"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
