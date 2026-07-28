# Anti-Slop Frontend Design Taste Framework

## 1. Brief Inference & Anti-Default Discipline

Before generating UI or CSS:
1. **Infer Page Purpose & Audience**: Identify page category (B2B SaaS, developer tool, agency portfolio, consumer product).
2. **Anti-Default Discipline**: Banned AI defaults:
   - Centered hero over purple dark-mesh background.
   - Generic 3-card equal column layout with centered icons.
   - Plain Inter or browser default font stacks without font-weight contrast.
   - Uncalibrated generic colors (`#000000`, `#ffffff`, `#ff0000`, `slate-900` on everything).
   - Uniform border radii and heavy dropped shadow boxes.

## 2. Design Dials Configuration

Calibrate three primary design dials prior to layout generation:
- **`DESIGN_VARIANCE`** (1-10): Layout asymmetry, grid offset, and visual surprise.
- **`MOTION_INTENSITY`** (1-10): Transition speeds, hover depth, and animation curves.
- **`VISUAL_DENSITY`** (1-10): Information spacing, padding scales, and component margin bounds.

Recommended Presets:
- B2B Technical SaaS: Variance = 6 | Motion = 4 | Density = 4
- Developer Tools / CLI: Variance = 5 | Motion = 3 | Density = 7
- High-End Brand / Agency: Variance = 9 | Motion = 8 | Density = 3

## 3. Typography & Visual Hierarchy

- Combine distinct display font (e.g. Outfit, Syne, Cabinet Grotesk) with legible body typeface (Inter, Geist, Plus Jakarta Sans).
- Enforce dramatic scale contrast between headlines (`3.5rem` to `5rem`) and subtext (`1.125rem`).
- Never let headline text wrap beyond 3 lines.
