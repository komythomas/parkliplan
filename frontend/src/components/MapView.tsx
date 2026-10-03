'use client';

import React, { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { Draw, Modify, Snap, Select } from 'ol/interaction';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { defaults as defaultControls, Attribution } from 'ol/control';
import { usePlanner } from '../context/PlannerContext';

// Default initial viewport: Ülemiste Parking Lot in Tallinn, Estonia
const DEFAULT_CENTER = fromLonLat([24.7937, 59.4225]);
const DEFAULT_ZOOM = 18;

// Pavement marking styles
const defaultStroke = new Stroke({
  color: '#FFFFFF',
  width: 3.5,
  lineCap: 'round',
  lineJoin: 'round',
});

const selectedStroke = new Stroke({
  color: '#38bdf8', // Tailwind sky-400
  width: 4.5,
  lineCap: 'round',
});

const defaultPolygonStyle = new Style({
  stroke: new Stroke({
    color: '#f59e0b', // Amber-500
    width: 2.5,
    lineDash: [6, 4],
  }),
  fill: new Fill({
    color: 'rgba(245, 158, 11, 0.2)',
  }),
});

const defaultLineStyle = new Style({
  stroke: defaultStroke,
});

const selectedLineStyle = new Style({
  stroke: selectedStroke,
});

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

  const {
    basemap,
    activeTool,
    vectorSourceRef,
    syncFeaturesFromMap,
    selectedFeatureId,
    setSelectedFeatureId,
  } = usePlanner();

  // Initialize Map on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Vector Source for custom drawn pavement markings
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    // 1. Esri World Imagery (Satellite) with required legal attribution (AD-4)
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
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

    // 3. Vector Layer for user drawings
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => {
        const isSelected = feature.getId() === selectedFeatureId || feature.get('id') === selectedFeatureId;
        const geomType = feature.getGeometry()?.getType();

        if (geomType === 'Polygon') {
          return defaultPolygonStyle;
        }
        return isSelected ? selectedLineStyle : defaultLineStyle;
      },
    });
    vectorLayerRef.current = vectorLayer;

    // Construct OpenLayers Map
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
        attribution: false, // Replaced by customized attribution control
      }).extend([
        new Attribution({
          collapsible: false,
        }),
      ]),
    });
    mapRef.current = map;

    // Listen to vector changes to sync state with React
    vectorSource.on(['addfeature', 'removefeature', 'changefeature'], () => {
      syncFeaturesFromMap();
    });

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [syncFeaturesFromMap, vectorSourceRef]);

  // Synchronize Basemap visibility (CAP-1)
  useEffect(() => {
    if (!satelliteLayerRef.current || !osmLayerRef.current) return;
    satelliteLayerRef.current.setVisible(basemap === 'satellite');
    osmLayerRef.current.setVisible(basemap === 'osm');
  }, [basemap]);

  // Synchronize Drawing / Modifying / Snapping Interactions (CAP-2)
  useEffect(() => {
    const map = mapRef.current;
    const source = vectorSourceRef.current;
    if (!map || !source) return;

    // Remove old interactions
    if (drawInteractionRef.current) map.removeInteraction(drawInteractionRef.current);
    if (modifyInteractionRef.current) map.removeInteraction(modifyInteractionRef.current);
    if (snapInteractionRef.current) map.removeInteraction(snapInteractionRef.current);
    if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);

    // 1. Draw LineString Interaction
    if (activeTool === 'line') {
      const draw = new Draw({
        source,
        type: 'LineString',
        style: new Style({
          stroke: new Stroke({
            color: '#38bdf8',
            width: 3.5,
            lineDash: [4, 4],
          }),
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: '#38bdf8' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
          }),
        }),
      });

      draw.on('drawend', (event) => {
        const id = `line-${Date.now()}`;
        event.feature.setId(id);
        event.feature.set('id', id);
        event.feature.set('type', 'LineString');
      });

      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    }

    // 2. Draw Polygon Interaction (Parking Areas, Safety Zones)
    if (activeTool === 'polygon') {
      const draw = new Draw({
        source,
        type: 'Polygon',
        style: defaultPolygonStyle,
      });

      draw.on('drawend', (event) => {
        const id = `zone-${Date.now()}`;
        event.feature.setId(id);
        event.feature.set('id', id);
        event.feature.set('type', 'Polygon');
      });

      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    }

    // 3. Modify Interaction (move existing vertices)
    if (activeTool === 'modify') {
      const modify = new Modify({
        source,
      });
      modify.on('modifyend', () => {
        syncFeaturesFromMap();
      });
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

    // 5. Delete Interaction (click directly on feature to remove it)
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

    // ALWAYS attach Snap interaction LAST so it snaps to existing vertices during draw and modify
    const snap = new Snap({
      source,
      pixelTolerance: 12, // 12px magnetic capture threshold
    });
    map.addInteraction(snap);
    snapInteractionRef.current = snap;

  }, [activeTool, setSelectedFeatureId, syncFeaturesFromMap, vectorSourceRef]);

  // Re-render layer when selection changes
  useEffect(() => {
    vectorLayerRef.current?.changed();
  }, [selectedFeatureId]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0f172a',
      }}
    />
  );
};
