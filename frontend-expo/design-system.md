# Design System — Visual Language Reference

**Preset:** Swiss — strict grid, generous whitespace, flat color fields, asymmetric layouts. Typography-driven; no decorative elements.

---

## 1. Layout

- **Container:** max-width 1280px, margin 0 auto, padding 0 20px
- **Grid:** 12 columns, gap 15px (gutter 15px, margin 20px)
- **Breakpoints:** xs base, sm ≥640px, md ≥768px, lg ≥1024px, xl ≥1280px, 2xl ≥1536px
- **Range:** 375px–1440px+

---

## 2. Color Tokens

### Primary (Red)
- **Base:** `#D94030` — hsl(6, 69%, 52%)
- **Hover:** `#be3223` | **Active:** `#9f2a1d`
- **Text on primary:** `#110504` (primary), `#551913` (secondary)

### Secondary (Dark)
- **Base:** `#1a1a1a` — hsl(0, 0%, 10%)
- **Text on secondary:** `#cdcdcd`, `#818181`

### Accent (Blue)
- **Base:** `#206cdf` — hsl(216, 75%, 50%)
- **Text on accent:** `#f2f6fd`, `#b5cef4`

### Background & Surfaces
- **Background:** `#111110`
- **Card/surface:** `#1a1a19` (surface-1)
- **Surface-2:** `#4f4f47` | **Surface-3:** `#8d8d81`
- **Border:** `rgba(255,255,255,0.12)` (base); divider `0.06`; hover `0.18`; focus `0.24`

### Text
- **Primary:** `#eeeee8`
- **Secondary:** `#bbbbb4`
- **Tertiary:** `#88887e`
- **Disabled:** `#55554e`

### Semantic
- **Success:** `#22C55E` | **Warning:** `#F59E0B` | **Error:** `#EF4444` | **Info:** `#3B82F6`

### Interactive
- **Ghost hover:** `rgba(217, 64, 48, 0.08)`
- **Disabled opacity:** 0.4

---

## 3. Typography (Inter font only)

**Load:** `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`  
**Weights:** 400, 500, 600, 700

| Scale    | Size | Weight | Line-height | Letter-spacing |
|----------|------|--------|-------------|----------------|
| Overline | 10px | 500    | 12px       | 0.1em, uppercase |
| Caption  | 12px | 400    | 20px       | 0.02em |
| Body     | 18px | 400    | 32px       | 0 |
| Lead     | 22px | 400    | 36px       | 0 |
| Title    | 36px | 600    | 44px       | -0.01em |
| Headline | 52px | 700    | 64px       | -0.02em |
| Display  | 80px | 700    | 96px       | -0.03em |

Use headings at 600–700; body/labels at 400.

---

## 4. Surfaces & Depth

- **Radius:** 0px everywhere
- **Elevation:** Flat — no box-shadow; use borders or background contrast
- **Borders:** 1px solid, base `rgba(255,255,255,0.12)`
- **Cards:** bg `#1a1a19`, padding 15px, border 1px `rgba(255,255,255,0.12)`
- **Hover:** border `rgba(255,255,255,0.18)`, optional `translateY(-1px)`
- **Active:** `scale(0.99)` or `scale(0.98)`

---

## 5. Spacing

Base unit 20px; baseline 4px (multiples of 4px).

| Token | Value |
|-------|--------|
| 4xs   | 3px   |
| 3xs   | 5px   |
| 2xs   | 8px   |
| xs    | 10px  |
| sm    | 15px  |
| md    | 20px  |
| lg    | 30px  |
| xl    | 40px  |
| 2xl   | 60px  |
| 3xl   | 80px  |
| 4xl   | 120px |

Component heights: buttons/inputs 40px; icons 20px; avatars 40px.

---

## 6. Motion

- **Timings:** Micro 60ms, base 120ms, medium 180ms, large 300ms
- **Easing:** Enter `cubic-bezier(0,.9,.1,1)`, exit `cubic-bezier(.4,0,1,1)`, move `cubic-bezier(.4,0,.2,1)`
- **Hover:** 60ms; **Press:** scale(0.97) 36ms
- **Stagger:** 15ms per child
- Respect `prefers-reduced-motion`

---

## 7. Component Styling (Applied in App)

### Buttons
- **Primary:** bg `#D94030`, color `#110504`, padding 0 20px, height 40px, no border. Hover `#be3223`, active `#9f2a1d` scale(0.98).
- **Secondary:** transparent, border 1px `#D94030`.
- **Ghost:** transparent, hover bg `rgba(217,64,48,0.08)`.
- **Focus:** outline 2px solid `#206cdf`, offset 2px.

### Inputs / Upload area
- Height 40px, padding 0 12px, bg transparent, border 1px `rgba(255,255,255,0.12)`.
- **Focus:** border `#D94030` + box-shadow `0 0 0 2px rgba(217,64,48,0.2)` (60ms).
- **Error:** border `#EF4444`.

### Cards (summary, preview, transcript, analysis)
- bg `#1a1a19`, padding 15px, border 1px `rgba(255,255,255,0.12)`.
- Video preview: aspect 16/9, object-fit cover.

### Focus
- Buttons/links/cards: outline 2px solid `#206cdf`, offset 2px.
- Inputs: border + shadow as above.

### Overlays
- Backdrop: `rgba(0,0,0,0.6)`; uniform: `rgba(0,0,0,0.35)`. No blur/gradients.

---

## 8. Accessibility

- Contrast AA.
- Focus outlines/rings on all interactive elements.
- ARIA on dynamic content.
- No color-only indicators.

---

## 9. App Mapping

- **Page 1:** App details (headline + lead) + file upload card (input-style border, primary CTA).
- **Page 2:** Dashboard bg `#111110`; video preview card (16/9); AI summary/transcript/analysis as cards with borders; KPI-like stat blocks; table-like transcript; chart-like timeline with accent bars.

All tokens are centralized in `utils/constants.ts` (COLORS, SPACING, TYPE, MOTION) and applied via StyleSheet in existing components.
