# Emil Kowalski Motion Engineering Principles

## 1. Physics & Spring Dynamics Over Linear Timing

- Never use `linear` or default `ease` for interactive UI elements.
- Use spring physics for natural feel:
  - **Snappy UI Feedback**: `stiffness: 400`, `damping: 30`, `mass: 0.8`
  - **Gentle Layout Transition**: `stiffness: 200`, `damping: 25`, `mass: 1.0`
  - **Bouncy Impact**: `stiffness: 500`, `damping: 18`

## 2. Hardware Acceleration & Transform-Only Rule

- Only animate GPU-accelerated CSS properties:
  - `transform` (`translate3d`, `scale`, `rotate`)
  - `opacity`
- Banned for animation loops: `height`, `width`, `margin`, `padding`, `top`, `left` (causes reflow/repaint lag).

## 3. Micro-Interactions & Hover Feedback

- Interactive elements must respond within 100ms.
- Active states should feel tactile: scale down slightly on press (`scale(0.97)`), spring back on release.
- Use `layoutId` (Framer Motion) or `Flip` (GSAP) for smooth shared-element layout shifts.

## 4. Accessibility & Reduced Motion

- Always respect user motion preferences:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
