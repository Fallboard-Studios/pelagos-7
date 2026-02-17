# Factory Visual Design Guide (Silhouette System)

## Overview
Factories are massive, static silhouettes lining the ocean floor. To emphasize depth and scale, they are rendered as solid-fill shapes with minimal interior detail. Variety is driven by a deterministic seed using **Alea** and **Simplex Noise**.

## Design Philosophy
* **Silhouette-First:** All buildings are identified by their outline.
* **90/45 Rule:** Outlines only use vertical, horizontal, or 45-degree lines.
* **Atmospheric Depth:** Factories recede into the background using varying levels of desaturation and opacity.

## SVG Rules
* **Single Path:** Each building should ideally be a single `<path>` element.
* **No Interior Complexity:** Only 1-3 interior "cutouts" (windows or vents) are allowed per building to maintain the silhouette feel.
* **Ground Locking:** The bottom of the path must be a flat line at `y=100%` to sit on the seabed.

## Color System
Colors are pulled from `./src/constants/colorTheme.json`.
* **Primary Fill:** `bodyBase` or `bodyShadow` (for distant buildings).
* **Interior Detail:** `indicator` (neon green) or `glassBase` (cyan) for tiny, high-contrast "pinprick" lights.

## Silhouette Variants (Simplex Driven)
The **Simplex Noise** value at a specific `x` coordinate determines which "Profile" is drawn:

1.  **The Monolith (-1.0 to -0.4):** A wide, rectangular block with beveled 45-degree corners. Represents heavy processing.
2.  **The Spire (-0.3 to 0.3):** A tall, thin vertical tower. Represents communication/sensors.
3.  **The Refinery (0.4 to 1.0):** A staggered, multi-level shape with horizontal pipes (90-degree steps).

## Procedural Logic
```typescript
import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

// Simple mapping: Noise value -> Path String
const getSilhouette = (noiseValue: number) => {
  if (noiseValue < -0.4) return "M0,100 L0,40 L20,20 H80 L100,40 L100,100 Z"; // Monolith
  if (noiseValue < 0.3)  return "M30,100 V10 L50,0 L70,10 V100 Z";           // Spire
  return "M0,100 V60 H30 V40 H70 V60 H100 V100 Z";                         // Refinery
};