---
title: Viewshed Explorer
description: 360° terrain visibility analysis tool. Drop an observer anywhere on a map, compute a viewshed across a configurable radius, and explore an interactive polar horizon diagram showing skyline, occluded terrain, and island peaks.
date: 2026-04-06
tags: [terrain, geospatial, mapping, visualization]
status: draft
format: react
render: iframe
aspect: 16:9
version: 1.0.0
source: https://github.com/woodhouse711/viewsheds
---

## Intent

Answer the question: *what can I see from here?*

A real-time viewshed tool built on actual terrain data. The user places an observer on a map and the app computes what ground is visible from that point — including distant terrain islands visible beyond intervening ridgelines. A synchronized polar horizon diagram renders the full 360° hemispherical view as azimuth × elevation angle — the terrain horizon as geometry.

This connects naturally to the Field Atlas pipeline: the viewshed becomes a layer that accompanies any GPX route, answering "what did I actually see from this point on the trail?"

## Approach

Fully client-side. No backend. No API keys.

- **Map:** MapLibre GL JS (open-source Mapbox fork)
- **Elevation data:** AWS Terrain Tiles (Terrarium format) — free, no key, no limits, 30m global resolution
- **Viewshed engine:** raycasting in a Web Worker (360–720 azimuths, ~50ms per compute)
- **Earth curvature:** corrected with standard refraction coefficient (0.87 × curvature drop)
- **Polar diagram:** Canvas 2D — skyline silhouette, visible terrain, island peaks

Algorithm: for each azimuth ray, step outward at DEM cell resolution. Track max elevation angle seen so far. Cells above the max are visible; visible cells behind a prior occlusion are "islands."

## Design

Split-screen: map left, polar diagram right. Drag the observer pin to recompute live. The polar diagram is the signature output — it abstracts a 360° panorama to its geometric skeleton, making terrain topology immediately legible.

Color language: teal for visible terrain (fading with distance), bright cyan for island peaks, dark/absent for occluded ground.

## Status

**Working:** map interface, tile fetching with LRU cache, raycasting engine, polar diagram, earth curvature correction, pan/zoom on diagram, hover cross-highlight between map and diagram, named peaks above 2500m.

**Draft:** the observer height control needs UI polish. The viewshed toggle is not yet wired. Mobile layout needs work.

**Next:** GPX route overlay, cumulative visibility layer, SVG polar diagram export for Field Atlas print output.

## Field Atlas Integration

The viewshed and the Field Atlas share the same elevation data pipeline. Integration points:

1. GPX parser identifies positions → add viewshed computation at each sample point
2. Same AWS Terrain Tiles serve both contour generation and viewshed analysis
3. SVG composer can render viewshed polygons as a new layer
4. Polar diagram renders as a horizontal strip synchronized with route progress
