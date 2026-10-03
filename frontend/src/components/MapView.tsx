'use client';

import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Draw, Modify, Snap, Select } from 'ol/interaction';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { defaults as defaultControls, Attribution, ScaleLine } from 'ol/control';
import { usePlanner } from '../context/PlannerContext';
import { MARKING_CONFIGS } from '../types/planner';

// Default initial viewport: Ülemiste Parking Lot in Tallinn, Estonia
const DEFAULT_CENTER = fromLonLat([24.7937, 59.4225]);
const DEFAULT_ZOOM = 18;

export const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const satelliteLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Active interaction references
  const drawInteractionRef = useRef<Draw | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);

  // Telemetry state (Feature C)
  const [cursorCoords, setCursorCoords] = useState<{ lon: number; lat: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);

  const {
    basemap,
    activeTool,
    markingType,
    vectorSourceRef,
    syncFeaturesFromMap,
    selectedFeatureId,
    setSelectedFeatureId,
    registerPanHandler,
  } = usePlanner();

  // Register pan handler for search (Feature B)
  useEffect(() => {
    registerPanHandler((lon: number, lat: number) => {
      if (!mapRef.current) return;
      mapRef.current.getView().animate({
        center: fromLonLat([lon, lat]),
        zoom: 18.5,
        duration: 900,
      });
    });
  }, [registerPanHandler]);

  // Initialize Map on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    // 1. Esri World Imagery (Satellite)
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
      }),
      visible: true,
    });
    satelliteLayerRef.current = satelliteLayer;

    // 2. OpenStreetMap (Standard Street Map)
    const osmLayer = new TileLayer({
      source: new OSM({
        attributions: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }),
      visible: false,
    });
    osmLayerRef.current = osmLayer;

    // 3. Dynamic Vector Layer with custom road marking colors (Feature A)
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => {
        const isSelected = feature.getId() === selectedFeatureId || feature.get('id') === selectedFeatureId;
        const geomType = feature.getGeometry()?.getType();
        const strokeColor = feature.get('color') || '#ffffff';

        if (geomType === 'Polygon') {
          return new Style({
            stroke: new Stroke({
              color: isSelected ? '#38bdf8' : strokeColor,
              width: isSelected ? 3.5 : 2.5,
              lineDash: [6, 4],
            }),
            fill: new Fill({
              color: strokeColor === '#ffffff' ? 'rgba(255, 255, 255, 0.12)' : `${strokeColor}26`,
            }),
          });
        }

        return new Style({
          stroke: new Stroke({
            color: isSelected ? '#38bdf8' : strokeColor,
            width: isSelected ? 5.0 : 3.5,
            lineCap: 'round',
            lineJoin: 'round',
          }),
        });
      },
    });
    vectorLayerRef.current = vectorLayer;

    // Construct OpenLayers Map with ScaleLine (Feature C)
    const map = new Map({
      target: mapContainerRef.current,
      layers: [satelliteLayer, osmLayer, vectorLayer],
      view: new View({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        maxZoom: 21,
        minZoom: 10,
      }),
      controls: defaultControls({
        attribution: false,
      }).extend([
        new Attribution({
          collapsible: false,
        }),
        new ScaleLine({
          units: 'metric',
          bar: false,
          steps: 2,
          text: true,
          minWidth: 80,
        }),
      ]),
    });
    mapRef.current = map;

    // Pointer move listener for cursor WGS84 coordinates (Feature C)
    map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const [lon, lat] = toLonLat(evt.coordinate);
      setCursorCoords({ lon, lat });
    });

    // Zoom level listener
    map.getView().on('change:resolution', () => {
      const z = map.getView().getZoom();
      if (z !== undefined) setZoomLevel(Math.round(z * 10) / 10);
    });

    // Listen to vector changes to sync state with React
    vectorSource.on(['addfeature', 'removefeature', 'changefeature'], () => {
      syncFeaturesFromMap();
    });

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [syncFeaturesFromMap, vectorSourceRef]);

  // Synchronize Basemap visibility
  useEffect(() => {
    if (!satelliteLayerRef.current || !osmLayerRef.current) return;
    satelliteLayerRef.current.setVisible(basemap === 'satellite');
    osmLayerRef.current.setVisible(basemap === 'osm');
  }, [basemap]);

  // Synchronize Drawing / Modifying / Snapping Interactions
  useEffect(() => {
    const map = mapRef.current;
    const source = vectorSourceRef.current;
    if (!map || !source) return;

    if (drawInteractionRef.current) map.removeInteraction(drawInteractionRef.current);
    if (modifyInteractionRef.current) map.removeInteraction(modifyInteractionRef.current);
    if (snapInteractionRef.current) map.removeInteraction(snapInteractionRef.current);
    if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);

    const activeColor = MARKING_CONFIGS[markingType]?.color || '#ffffff';

    // 1. Draw LineString Interaction
    if (activeTool === 'line') {
      const draw = new Draw({
        source,
        type: 'LineString',
        style: new Style({
          stroke: new Stroke({
            color: activeColor,
            width: 3.5,
            lineDash: [4, 4],
          }),
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: activeColor }),
            stroke: new Stroke({ color: '#090d14', width: 2 }),
          }),
        }),
      });

      draw.on('drawend', (event) => {
        const id = `line-${Date.now()}`;
        event.feature.setId(id);
        event.feature.set('id', id);
        event.feature.set('type', 'LineString');
        event.feature.set('markingType', markingType);
        event.feature.set('color', activeColor);
      });

      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    }

    // 2. Draw Polygon Interaction
    if (activeTool === 'polygon') {
      const draw = new Draw({
        source,
        type: 'Polygon',
        style: new Style({
          stroke: new Stroke({
            color: activeColor,
            width: 2.5,
            lineDash: [6, 4],
          }),
          fill: new Fill({
            color: activeColor === '#ffffff' ? 'rgba(255, 255, 255, 0.15)' : `${activeColor}26`,
          }),
        }),
      });

      draw.on('drawend', (event) => {
        const id = `zone-${Date.now()}`;
        event.feature.setId(id);
        event.feature.set('id', id);
        event.feature.set('type', 'Polygon');
        event.feature.set('markingType', markingType);
        event.feature.set('color', activeColor);
      });

      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    }

    // 3. Modify Interaction
    if (activeTool === 'modify') {
      const modify = new Modify({ source });
      modify.on('modifyend', () => syncFeaturesFromMap());
      map.addInteraction(modify);
      modifyInteractionRef.current = modify;
    }

    // 4. Select Interaction
    if (activeTool === 'select') {
      const select = new Select({
        layers: vectorLayerRef.current ? [vectorLayerRef.current] : undefined,
      });
      select.on('select', (e) => {
        const selected = e.selected[0];
        setSelectedFeatureId(selected ? String(selected.getId() || selected.get('id')) : null);
      });
      map.addInteraction(select);
      selectInteractionRef.current = select;
    }

    // 5. Delete Interaction
    if (activeTool === 'delete') {
      const selectDelete = new Select({
        layers: vectorLayerRef.current ? [vectorLayerRef.current] : undefined,
      });
      selectDelete.on('select', (e) => {
        const selected = e.selected[0];
        if (selected) {
          source.removeFeature(selected);
          syncFeaturesFromMap();
          setSelectedFeatureId(null);
          selectDelete.getFeatures().clear();
        }
      });
      map.addInteraction(selectDelete);
      selectInteractionRef.current = selectDelete;
    }

    // Snap Interaction
    const snap = new Snap({
      source,
      pixelTolerance: 12,
    });
    map.addInteraction(snap);
    snapInteractionRef.current = snap;

  }, [activeTool, markingType, setSelectedFeatureId, syncFeaturesFromMap, vectorSourceRef]);

  // Re-render layer on selection change
  useEffect(() => {
    vectorLayerRef.current?.changed();
  }, [selectedFeatureId]);

  return (
    <div className="map-view-wrapper">
      <div ref={mapContainerRef} className="map-canvas" />

      {/* Cartographic Bottom Telemetry Bar (Feature C) */}
      <footer className="map-telemetry-bar">
        <div className="telemetry-item">
          <span className="telemetry-label">CRS</span>
          <span className="telemetry-val">EPSG:3857 / WGS84</span>
        </div>

        {cursorCoords && (
          <div className="telemetry-item">
            <span className="telemetry-val tabular-nums">
              {Math.abs(cursorCoords.lat).toFixed(5)}° {cursorCoords.lat >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(cursorCoords.lon).toFixed(5)}° {cursorCoords.lon >= 0 ? 'E' : 'W'}
            </span>
          </div>
        )}

        <div className="telemetry-item">
          <span className="telemetry-label">Zoom</span>
          <span className="telemetry-val tabular-nums">{zoomLevel.toFixed(1)}</span>
        </div>
      </footer>
    </div>
  );
};
