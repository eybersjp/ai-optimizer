# Dashboard Design System Foundation

## Overview
This design system provides a reusable, accessible, precision-engineered foundation for the AI Optimize technical governance and configuration control plane. Designed dark-mode-first with high density, clear visual hierarchy, multi-modal state indication, and zero external runtime icon or component dependencies.

---

## Visual & Design Principles
1. **Precision & Trust**: Dark palette using slate/navy base tones (`#090d16`), clean contrast ratios, and monospaced font options for technical data.
2. **Dense & Orderly**: Compact line-heights, standard 4px/8px-based spacing grid, clear table shells, and structured inspector panels.
3. **Multi-Modal State Semantics**: Statuses rely on explicit labels, symbols (glyphs), border treatments, and colors—never color alone.
4. **No Decorative Excess**: No generic AI purple gradients, arbitrary blur/glow filters, or oversized hero sections.

---

## Token Categories (`tokens.css`)
- **Colors**: Base background (`--ds-color-bg-base`), subtle surfaces, elevated cards, borders (subtle, default, strong, focus), foreground (default, muted, subtle, disabled), accent (`--ds-color-accent`).
- **Semantic States**: Background, border, and foreground colors for `success`, `warning`, `danger`, `unresolved`, `observed`, `inferred`, `proposed`, `approved`, `active`, `failed`.
- **Typography**: Sans-serif (`Inter`, system fonts) and Monospace (`JetBrains Mono`, `Consolas`). Font size scale (`xs` through `2xl`).
- **Spacing**: 4px step scale (`--ds-space-1` to `--ds-space-12`).
- **Radii**: Sharp to subtle curvature (`none`, `sm`, `md`, `lg`, `full`).
- **Elevation**: Shadow layers (`sm`, `md`, `lg`).
- **Z-Index**: Defined hierarchy (`dropdown`, `sticky`, `overlay`, `modal`, `drawer`, `tooltip`).
- **Motion**: Standard durations (`100ms`, `200ms`, `300ms`) with `prefers-reduced-motion` override (set to `0ms`).

---

## Component Inventory

### Primitives (`apps/dashboard/src/components/primitives/`)
- **Button**: Typed variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), loading state, disabled states.
- **IconButton**: Accessible button requiring explicit `label` prop, customizable symbol.
- **Badge**: Compact status pill.
- **StatusBadge**: Semantic status indicator with symbol and label (covers all 11 required states).
- **Card**: Panel shell supporting elevated and interactive variants.
- **Divider**: Horizontal or vertical separator.
- **Tabs**: Accessible tab container with `aria-selected` and `role="tabpanel"`.
- **Tooltip**: Hover/focus accessible helper box.
- **FieldLabel**: Label with optional required marker.
- **TextInput**: Input element with integrated label, hint, and error message linking (`aria-describedby`).
- **Select**: Dropdown select element.
- **Checkbox**: Accessible checkbox with text label.
- **Switch**: Custom accessible toggle switch (`role="switch"`).
- **TableShell**: Data table wrapper with column renderers and empty row fallback.
- **EmptyState**: Standardized empty list/search layout.
- **InlineAlert**: Contextual alert box (`info`, `success`, `warning`, `danger`).
- **LoadingSkeleton**: Animated skeleton block with reduced-motion support.
- **ModalShell**: Accessible dialog overlay with Escape key listener.
- **DrawerShell**: Side drawer overlay with Escape key listener.

### Control-Plane Components (`apps/dashboard/src/components/`)
- `ProjectHealthIndicator` (`status/`)
- `EvidenceStatus` (`evidence/`)
- `ConfidenceMeter` (`evidence/`)
- `RiskBadge` (`status/`)
- `ApprovalStatus` (`status/`)
- `ValidationResult` (`status/`)
- `DiffFileHeader` (`evidence/`)
- `EventTimelineItem` (`status/`)
- `ConnectionStatus` (`status/`)
- `DiagnosticMessage` (`feedback/`)
- `ManagedArtifactStatus` (`status/`)
- `WorkflowStepIndicator` (`status/`)

### Layout Components (`apps/dashboard/src/components/layout/`)
- `ApplicationShell`
- `Sidebar`
- `TopBar`
- `ContentHeader`
- `SplitPane`
- `InspectorPanel`
- `DenseDataSection`
- `ResponsiveGrid`
- `CommandBar`
- `DetailDrawerLayout`

---

## Accessibility & Responsive Rules
- All interactive components support keyboard navigation and explicit focus rings (`--ds-focus-ring`).
- ARIA attributes used across tabs (`role="tab"`), modals (`aria-modal`), switches (`role="switch"`), and inputs (`aria-invalid`, `aria-describedby`).
- High-density responsive grid layouts adapt seamlessly from desktop to tablet and mobile viewports.
- `prefers-reduced-motion` CSS media query zeros out all transition and animation durations.

---

## Design-System Preview
Located at `apps/dashboard/src/design-system-preview.tsx`. Can be rendered independently for visual verification.

---

## Integration Instructions & Limitations
Import `tokens.css`, `base.css`, and `components.css` in application styles or import components directly. All components are presentation-only, receive typed props, and do not fetch data.
