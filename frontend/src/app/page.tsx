'use client';

import React, { useEffect } from 'react';
import { PlannerProvider, usePlanner } from '../context/PlannerContext';
import { MapView } from '../components/MapView';
import { Toolbar } from '../components/Toolbar';
import { SidePanel } from '../components/SidePanel';

function PlannerContent() {
  const { setActiveTool } = usePlanner();

  // Keyboard navigation shortcuts for high-velocity spatial planning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'l':
          setActiveTool('line');
          break;
        case 'p':
          setActiveTool('polygon');
          break;
        case 'm':
          setActiveTool('modify');
          break;
        case 's':
          setActiveTool('select');
          break;
        case 'd':
          setActiveTool('delete');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool]);

  return (
    <div className="app-container">
      {/* Fullscreen Map Canvas */}
      <main className="map-viewport" aria-label="Geospatial Map Canvas">
        <MapView />
      </main>

      {/* Floating Island Toolbar */}
      <Toolbar />

      {/* Floating Collapsible Telemetry & Inventory Panel */}
      <SidePanel />
    </div>
  );
}

export default function HomePage() {
  return (
    <PlannerProvider>
      <PlannerContent />
    </PlannerProvider>
  );
}
