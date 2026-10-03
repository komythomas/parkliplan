'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { BasemapType, DrawingTool, PlanFeature, MarkingType, MARKING_CONFIGS } from '../types/planner';
import { calculateGeodesicLength } from '../utils/metrics';

interface PlannerContextType {
  basemap: BasemapType;
  setBasemap: (basemap: BasemapType) => void;
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  markingType: MarkingType;
  setMarkingType: (type: MarkingType) => void;
  costPerMeter: number;
  setCostPerMeter: (cost: number) => void;
  features: PlanFeature[];
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  totalLengthMeters: number;
  planName: string;
  setPlanName: (name: string) => void;
  planId: string | null;
  setPlanId: (id: string | null) => void;
  vectorSourceRef: React.MutableRefObject<VectorSource | null>;
  syncFeaturesFromMap: () => void;
  deleteFeature: (id: string) => void;
  clearAllFeatures: () => void;
  loadPlanFromGeoJSON: (geojson: any, name?: string, id?: string) => void;
  isSidePanelOpen: boolean;
  setIsSidePanelOpen: (open: boolean) => void;
  toggleSidePanel: () => void;
  panToLocation: (lon: number, lat: number) => void;
  registerPanHandler: (handler: (lon: number, lat: number) => void) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [basemap, setBasemap] = useState<BasemapType>('satellite');
  const [activeTool, setActiveTool] = useState<DrawingTool>('line');
  const [markingType, setMarkingType] = useState<MarkingType>('standard');
  const [costPerMeter, setCostPerMeter] = useState<number>(3.50);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>('Tallinn Logistics Bay Layout');
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(true);

  const panHandlerRef = useRef<((lon: number, lat: number) => void) | null>(null);

  const registerPanHandler = useCallback((handler: (lon: number, lat: number) => void) => {
    panHandlerRef.current = handler;
  }, []);

  const panToLocation = useCallback((lon: number, lat: number) => {
    if (panHandlerRef.current) {
      panHandlerRef.current(lon, lat);
    }
  }, []);

  const toggleSidePanel = useCallback(() => {
    setIsSidePanelOpen((prev) => !prev);
  }, []);

  const vectorSourceRef = useRef<VectorSource | null>(null);

  const syncFeaturesFromMap = useCallback(() => {
    if (!vectorSourceRef.current) return;
    const olFeatures = vectorSourceRef.current.getFeatures();
    const mapped: PlanFeature[] = olFeatures.map((f, index) => {
      const geom = f.getGeometry();
      const geomType = geom?.getType() === 'Polygon' ? 'Polygon' : 'LineString';
      const coords = (geom as any)?.getCoordinates() || [];
      const length = geom ? calculateGeodesicLength(geom) : 0;
      const id = String(f.getId() || f.get('id') || `feat-${index + 1}`);

      const featMarkingType: MarkingType = f.get('markingType') || 'standard';
      const featColor: string = f.get('color') || MARKING_CONFIGS[featMarkingType]?.color || '#ffffff';

      // Ensure feature has consistent properties
      if (!f.getId()) f.setId(id);
      f.set('id', id);
      f.set('length_m', length);
      f.set('type', geomType);
      f.set('markingType', featMarkingType);
      f.set('color', featColor);

      return {
        id,
        type: geomType,
        coordinates: coords,
        lengthMeters: length,
        markingType: featMarkingType,
        color: featColor,
        label: f.get('label') || `${geomType === 'LineString' ? 'Line' : 'Zone'} #${index + 1}`,
      };
    });

    setFeatures(mapped);
  }, []);

  const deleteFeature = useCallback((id: string) => {
    if (!vectorSourceRef.current) return;
    const f = vectorSourceRef.current.getFeatureById(id) ||
              vectorSourceRef.current.getFeatures().find(item => item.get('id') === id);
    if (f) {
      vectorSourceRef.current.removeFeature(f);
      syncFeaturesFromMap();
      if (selectedFeatureId === id) setSelectedFeatureId(null);
    }
  }, [selectedFeatureId, syncFeaturesFromMap]);

  const clearAllFeatures = useCallback(() => {
    if (!vectorSourceRef.current) return;
    vectorSourceRef.current.clear();
    setFeatures([]);
    setSelectedFeatureId(null);
  }, []);

  const loadPlanFromGeoJSON = useCallback((geojson: any, name?: string, id?: string) => {
    if (!vectorSourceRef.current) return;
    const format = new GeoJSON();
    const olFeatures = format.readFeatures(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });

    vectorSourceRef.current.clear();
    vectorSourceRef.current.addFeatures(olFeatures);
    if (name) setPlanName(name);
    if (id) setPlanId(id);
    setSelectedFeatureId(null);
    syncFeaturesFromMap();
  }, [syncFeaturesFromMap]);

  const totalLengthMeters = Math.round(
    features.reduce((sum, item) => sum + item.lengthMeters, 0) * 10
  ) / 10;

  return (
    <PlannerContext.Provider
      value={{
        basemap,
        setBasemap,
        activeTool,
        setActiveTool,
        markingType,
        setMarkingType,
        costPerMeter,
        setCostPerMeter,
        features,
        selectedFeatureId,
        setSelectedFeatureId,
        totalLengthMeters,
        planName,
        setPlanName,
        planId,
        setPlanId,
        vectorSourceRef,
        syncFeaturesFromMap,
        deleteFeature,
        clearAllFeatures,
        loadPlanFromGeoJSON,
        isSidePanelOpen,
        setIsSidePanelOpen,
        toggleSidePanel,
        panToLocation,
        registerPanHandler,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};
