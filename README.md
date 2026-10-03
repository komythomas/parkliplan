# Parkkiplan

**Interactive Geospatial Planning & Measurement Engine for Autonomous Pavement Striping**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![OpenLayers](https://img.shields.io/badge/OpenLayers-10.4-1f425f?logo=openlayers)](https://openlayers.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fly.io](https://img.shields.io/badge/API-Fly.io-8B5CF6?logo=fly.io&logoColor=white)](https://parkliplan-api.fly.dev/docs)

---

## Live Deployment

| Service | URL |
|:---|:---|
| **Frontend (Vercel)** | [https://parkkiplan.vercel.app](https://parkkiplan.vercel.app) |
| **Backend API (Fly.io)** | [https://parkliplan-api.fly.dev](https://parkliplan-api.fly.dev) |
| **Interactive API Docs (Swagger)** | [https://parkliplan-api.fly.dev/docs](https://parkliplan-api.fly.dev/docs) |
| **API Health** | [https://parkliplan-api.fly.dev/health](https://parkliplan-api.fly.dev/health) |

---

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Mathematical Accuracy & Latitude Correction](#mathematical-accuracy--latitude-correction)
- [Quick Start](#quick-start)
- [Deploy to Vercel](#deploy-to-vercel)
- [Keyboard Navigation](#keyboard-navigation)
- [Architecture & Repository Structure](#architecture--repository-structure)
- [Engineering Documentation](#engineering-documentation)
- [Automated Verification Suite](#automated-verification-suite)
- [REST API Reference](#rest-api-reference)
- [Author & License](#author--license)
- [Legal, Attributions & Disclaimers](#legal-attributions--disclaimers)

---

## Overview

Autonomous pavement striping robots (such as those pioneered by **10Lines OÜ**) replace manual chalking and tape measurement with autonomous, electric precision marking. However, autonomous field deployments require exact, machine-readable geospatial layouts generated over real-world asphalt coordinates.

**Parkkiplan** is a lightweight, web-native spatial layout editor engineered for striping contractors, estimators, and robotic fleet planners. It allows operators to design stall lines, safety bays, and boundaries directly over high-resolution aerial imagery, calculate distortion-free linear metrics, and export compliant geometries for robotic trajectory planners.

![Parkkiplan Workspace Preview](./docs/screenshots/03-line-drawn-metrics.png)
*Live preview of the Parkkiplan canvas: high-resolution Esri aerial imagery, real-time WGS84 geodesic metrology, and parking line budget estimator.*

---

## Core Capabilities

- **Dual-Layer Basemap Synchronization**: Instant, zero-reload switching between sub-meter resolution **Esri World Imagery** and cartographic **OpenStreetMap**, allowing operators to match layout boundaries directly with asphalt joints and curbs.
- **Topological Snapping & Editing**: Interactive vector drawing with a calibrated **12-pixel magnetic capture radius** (`ol/interaction/Snap`) for vertices and edges, accompanied by vertex manipulation (`ol/interaction/Modify`) and interactive deletion.
- **Spherical Geodesic Metrology**: Pavement distances are computed via great-circle integration on a sphere (`ol/sphere.getLength`), canceling out Web Mercator projection distortion ($\approx 1.97\times$ distance exaggeration at northern latitudes such as Tallinn, Estonia at 59.4° N). The deviation from a rigorous WGS84 ellipsoidal calculation is less than 0.5 % for the segment lengths encountered in parking-lot planning — well within the accuracy limits of clicking on satellite imagery (typically ±20–50 cm).
- **4 Marking Types with Color Coding**:
  - White — Standard stall lines
  - Blue — Accessible (PMR) spaces
  - Yellow — Safety / fire zones
  - Green — EV charging stations
- **Budget Estimator**: Real-time cost estimation per linear meter for each marking type, with project total.
- **Location Search**: Geocoder powered by Nominatim/OSM to navigate directly to any address or site.
- **Live Telemetry Bar**: WGS84 cursor coordinates, current zoom level, and scale line displayed continuously.
- **Dual Export Pipeline**:
  - **GeoJSON (RFC 7946)**: Coordinate projection in `EPSG:4326` (WGS84 `[longitude, latitude]`) with full feature metadata, ready for ingestion by GIS software (QGIS, ArcGIS) and autonomous path planning pipelines.
  - **Tabular CSV**: Formatted report listing individual element types, segment lengths, and the cumulative project total for cost estimation.
- **State Persistence**: Full plan lifecycle management (`Create`, `Read`, `List`, `Delete`) backed by an asynchronous SQLite database on a persistent Fly.io volume through a typed FastAPI REST interface.

---

## Mathematical Accuracy & Latitude Correction

Standard web map interfaces render spatial features in **Spherical Mercator (EPSG:3857)**. While Mercator preserves angles locally, it introduces significant areal and linear distortion as latitude increases:

$$k = \frac{1}{\cos(\phi)}$$

Where:
- $\phi$ is the site latitude.
- $k$ is the linear scale inflation factor.

At the latitude of Tallinn, Estonia ($\phi \approx 59.437^\circ\text{ N}$):

$$k = \frac{1}{\cos(59.437^\circ)} \approx 1.967$$

A standard 5.0-meter parking stall line naively measured in Cartesian Web Mercator coordinates results in $\approx 9.83$ units—an error of **+96.7%**.

Parkkiplan eliminates this distortion by calculating all lengths via spherical great-circle integration (`ol/sphere.getLength`). The spherical model deviates from the WGS84 ellipsoid by less than 0.5 % for the short segments typical in parking-lot planning — well within the accuracy limits of clicking on satellite imagery (typically ±20–50 cm depending on zoom level).

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Or Node.js 18+ and Python 3.11+ for local development without containers.

### Containerized Execution (Recommended)

Run the entire full-stack application with a single command:

```bash
docker compose up --build
```

| Service | Port | Endpoint |
|:---|:---|:---|
| **Frontend Web Client** | `3000` | [http://localhost:3000](http://localhost:3000) |
| **Backend API Service** | `8000` | [http://localhost:8000](http://localhost:8000) |
| **Interactive API Docs (Swagger)** | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Service Healthcheck** | `8000` | [http://localhost:8000/health](http://localhost:8000/health) |

### Local Development (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Deploy to Vercel

The frontend is designed to be deployed on Vercel with the backend API proxied transparently via Next.js rewrites (no CORS configuration needed).

### Steps

1. **Import the repository** on [vercel.com/new](https://vercel.com/new)
2. **Framework preset**: Next.js (auto-detected)
3. **Root Directory**: `frontend`
4. **Build command**: `next build` (default)
5. **Environment Variables** (optional — defaults to the live Fly.io backend):

   | Variable | Value |
   |:---|:---|
   | `BACKEND_API_URL` | `https://parkliplan-api.fly.dev` |

6. Click **Deploy**.

> The Next.js rewrite in `next.config.ts` automatically proxies all `/api/*` requests from the Vercel frontend to the Fly.io backend. No CORS headers or credentials are required.

---

## Keyboard Navigation

To accelerate spatial drawing on site, Parkkiplan supports single-key tool activation:

| Key | Mode | Operational Purpose |
|:---:|:---|:---|
| `L` | **Draw Line** | Plot line segments for parking stalls, lane lines, and stop bars (`LineString`). |
| `P` | **Draw Zone** | Demarcate parking bays, hatched areas, and pedestrian zones (`Polygon`). |
| `M` | **Modify** | Select, drag, and adjust existing vertices with snapping enabled. |
| `S` | **Select** | Inspect element properties, lengths, and highlight corresponding inventory items. |
| `D` | **Delete** | Click directly on any drawn geometry on the canvas to remove it. |

---

## Architecture & Repository Structure

```
parkliplan/
├── frontend/                     # Next.js 15 App Router & React 19 Client
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Document metadata and root layout
│   │   │   ├── page.tsx          # Application shell, hotkeys, and view composition
│   │   │   └── globals.css       # Design system, glassmorphism tokens, and layout styles
│   │   ├── components/
│   │   │   ├── MapView.tsx       # OpenLayers map canvas, layers, draw, modify & snap
│   │   │   ├── Toolbar.tsx       # Tool selection, basemap switch, persistence & exports
│   │   │   ├── SidePanel.tsx     # Geodesic metrics, budget estimator & element list
│   │   │   └── LoadPlanModal.tsx # Plan retrieval modal connected to SQLite API
│   │   ├── context/
│   │   │   └── PlannerContext.tsx# Centralized state machine syncing OpenLayers with React
│   │   ├── types/
│   │   │   └── planner.ts        # TypeScript contracts for plans, tools, and GeoJSON
│   │   └── utils/
│   │       ├── api.ts            # Typed HTTP client for FastAPI endpoints
│   │       ├── export.ts         # RFC 7946 GeoJSON and CSV file generator
│   │       └── metrics.ts        # Spherical geodesic calculations (ol/sphere)
│   └── tests/                    # Vitest unit and precision test suite
│
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── main.py               # ASGI application, CORS middleware, rate limiting & REST routes
│   │   ├── models.py             # Pydantic v2 schemas for RFC 7946 GeoJSON validation
│   │   └── database.py           # aiosqlite asynchronous SQLite data access layer
│   ├── fly.toml                  # Fly.io deployment configuration
│   └── Dockerfile                # Production container (port 8080, DATABASE_PATH env var)
│
├── docker-compose.yml            # Multi-container service definitions (local dev)
├── LICENSE                       # MIT License
└── README.md                     # Engineering documentation
```

### Production Architecture

```
Browser
  │
  ├─ GET / → Vercel (Next.js SSR)
  │
  └─ /api/* → Next.js Rewrite → Fly.io (FastAPI)
                                      │
                                      └─ /data/parkliplan.db (persistent volume)
```

---

## Engineering Documentation

Detailed technical design notes and data contracts are documented in the [`docs/`](docs/) directory:

- [**`docs/GEODESICS.md`**](docs/GEODESICS.md): In-depth physical derivation of Web Mercator distortion ($k = \sec\phi$), comparison table across European/Nordic latitudes, and WGS84 great-circle spherical integration implementation.
- [**`docs/ROBOTIC_SPEC.md`**](docs/ROBOTIC_SPEC.md): Hypothetical design notes describing how Parkkiplan GeoJSON exports could be consumed by an autonomous striping robot — RFC 7946 schema, ENU local frame projection, and trajectory generation pipeline. Not based on internal documentation from any company.
- [**`docs/screenshots/`**](docs/screenshots/): Full-resolution visual test scans of the live interface and metrology readouts.

---

## Automated Verification Suite

Parkkiplan maintains automated verification covering both frontend spatial math and backend data integrity.

### 1. Frontend Unit & Precision Tests (Vitest)

```bash
cd frontend
npm test
```

- **Geodesic Precision**: Validates that a 5.00-meter segment at latitude 59.437° N (Tallinn) measures $5.00 \pm 0.05\text{ m}$, verifying immunity to Mercator scale inflation.
- **CSV Serialization**: Confirms tabular output formatting, header integrity, individual lengths, and cumulative totals.
- **RFC 7946 Compliance**: Asserts property preservation, coordinate projection, and GeoJSON schema correctness.

### 2. Backend REST & Validation Tests (pytest)

```bash
cd backend
python -m pytest
```

- **Healthcheck**: Confirms service readiness and JSON payload schema.
- **GeoJSON Validation**: Verifies `POST /api/plans` persists valid collections and returns aggregated metrics.
- **Error Handling**: Verifies strict rejection of malformed or invalid geometry types with **HTTP 422 Unprocessable Entity**.
- **CRUD Operations**: Tests plan listing, retrieval by identifier, and clean deletion.

---

## REST API Reference

| Method | Route | Request Body | Response | Description |
|:---|:---|:---|:---:|:---|
| `GET` | `/health` | _None_ | `200 OK` | Verifies backend process availability. |
| `POST` | `/api/plans` | `PlanCreateRequest` | `201 Created` | Persists a new layout with validated GeoJSON. |
| `GET` | `/api/plans` | _None_ | `200 OK` | Lists summary metadata for all saved plans. |
| `GET` | `/api/plans/{id}` | _None_ | `200 OK` | Returns full RFC 7946 GeoJSON FeatureCollection. |
| `DELETE` | `/api/plans/{id}` | _None_ | `200 OK` | Permanently deletes a saved plan by its identifier. |

Full interactive documentation: [https://parkliplan-api.fly.dev/docs](https://parkliplan-api.fly.dev/docs)

---

## Author & License

- **Author**: [@komythomas](https://github.com/komythomas)
- **License**: Released under the terms of the [MIT License](LICENSE). Copyright © 2026 komythomas.

---

## Legal, Attributions & Disclaimers

### Data & Basemap Attributions
- **Esri World Imagery**: Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.
- **OpenStreetMap**: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

### Trademark & Fair Use Notice
- **10Lines** is the name of a company (10Lines OÜ). All company names and product names cited in this repository are the property of their respective owners.
- Parkkiplan is an independent technical demonstration and portfolio project developed by [@komythomas](https://github.com/komythomas) to demonstrate web-GIS spatial planning, spherical geodesic calculation, and autonomous striping path generation.
- This software is not an official product of, nor is it endorsed by, affiliated with, or sponsored by 10Lines OÜ or the Norway Grants Green ICT programme.
