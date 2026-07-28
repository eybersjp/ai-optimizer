# Impeccable UI Engineering & Design Commands (22 Commands)

## Executive Suite of 22 Executable UI/UX Rules

1. **`CMD-01: Contrast Audit`**: Enforce WCAG AAA contrast ratio (minimum 7:1 for normal text, 4.5:1 for large text).
2. **`CMD-02: Typography Fluid Scale`**: Use `clamp()` for responsive headline typography without abrupt breakpoint shifts (`clamp(2rem, 5vw + 1rem, 4.5rem)`).
3. **`CMD-03: Asymmetric Spacing Grid`**: Avoid rigid equal padding; alternate container padding (`py-16 px-6 md:py-24 md:px-12`) for visual depth.
4. **`CMD-04: Non-Generic Palette Generation`**: Derive HSL color scales with calibrated saturation and lightness rather than default hex values.
5. **`CMD-05: Focus Ring High-Contrast Offset`**: All interactive elements must exhibit visible focus rings (`focus-visible:ring-2 focus-visible:ring-offset-2`).
6. **`CMD-06: Micro-Interaction Feedback`**: Buttons and links must provide immediate visual feedback on hover (`scale(1.02)`), active (`scale(0.98)`), and focus.
7. **`CMD-07: Anti-Truncation Line Wrapping`**: Use `text-balance` on headlines and `text-pretty` on body copy to prevent orphan words.
8. **`CMD-08: Skeleton Loading States`**: Replace spinners with content-shaped skeleton shimmer animations during async loading.
9. **`CMD-09: Dark Mode HSL Calibration`**: Dark mode backgrounds must use tinted dark grays (e.g., `hsl(222, 47%, 7%)`) rather than pure black `#000000`.
10. **`CMD-10: Mobile Touch Target Bounds`**: Minimum interactive touch target must be at least `48px x 48px` on mobile surfaces.
11. **`CMD-11: Form Validation State Feedback`**: Form inputs must show inline error messages with semantic colors, icons, and `aria-invalid` attributes.
12. **`CMD-12: Empty State Guidance`**: Empty states must display an illustrative graphic, descriptive message, and a clear call-to-action button.
13. **`CMD-13: Toast Notification Stacking`**: Toast notifications must stack vertically with queue limits (max 3 visible) and auto-dismiss timer.
14. **`CMD-14: Hardware-Accelerated Layout`**: Animate only GPU properties (`transform`, `opacity`) to guarantee 60 FPS transitions.
15. **`CMD-15: Dialog Focus Trap & Escape`**: Modal overlays must trap keyboard focus inside and close when pressing `Escape` or clicking overlay backdrop.
16. **`CMD-16: Font Smoothing & Antialiasing`**: Enforce `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` globally.
17. **`CMD-17: Dynamic Header Elevation`**: Sticky headers must transition background opacity and subtle backdrop blur (`backdrop-blur-md bg-background/80`) on scroll.
18. **`CMD-18: Card Border Highlights`**: Use subtle 1px borders with subtle linear gradient highlights (`border-white/10 dark:border-white/5`) instead of drop shadows.
19. **`CMD-19: Semantic Color Token System`**: Separate base colors (`neutral-900`) from semantic tokens (`bg-background`, `text-foreground`, `border-muted`).
20. **`CMD-20: Responsive Container Padding`**: Scale main layout container padding fluidly across viewports (`px-4 sm:px-6 lg:px-8 max-w-7xl`).
21. **`CMD-21: Z-Index Scale Hierarchy`**: Maintain strict z-index tokens (`z-dropdown: 10`, `z-sticky: 20`, `z-modal: 50`, `z-toast: 100`).
22. **`CMD-22: Accessible Reduced Motion Fallback`**: Automatically disable layout animations when `prefers-reduced-motion: reduce` is active.
