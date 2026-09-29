# Brand Guidelines — El Dojo (Editable)

> **Status**: FLEXIBLE — Todos los valores de este archivo son orientativos.
> Edita directamente las tablas/campos que aparecen a continuación para cambiar
> la identidad visual del proyecto **sin tener que tocar componentes ni skills**.
>
> **Origen de verdad en runtime** (mayor → menor precedencia):
>
> 1. `localStorage.setItem("eldojo_theme_overrides", {...})`
>    (consola del navegador, sin build)
> 2. Variables `EXPO_PUBLIC_THEME_*` en `.env.public` / `.env.admin` / `.env.student`
> 3. Este archivo `docs/brand-guidelines.md`
> 4. Valores por defecto en `src/constants/theme.ts`

---

## 0. Reglas de cumplimiento — AI Image Gen

Antes de generar cualquier banner, slide, CIP o asset de marca, prepende
**OBLIGATORIAMENTE** el siguiente bloque a tu prompt (edítalo según la sección 1):

```
VISUAL STYLE MOOD: {reemplaza_por_mood_1 + mood_2 + mood_3}
COLORS (HEX):
  PRIMARY = #XXXXXXXX
  SECONDARY = #XXXXXXXX
  ACCENT = #XXXXXXXX
  BG = #XXXXXXXX
  TEXT = #XXXXXXXX
LIGHTING: {ej: natural soft, dramatic rim, studio high-key}
COMPOSITION: {ej: centered, rule-of-thirds, minimal negative-space}
AESTHETIC: {ej: editorial-minimal, brutalist, bento-grid-material, museum-quality}
CAMERA & LENS: {ej: 35mm f/1.8, medium format, cinematic 2.39:1}
```

### Palabras clave sugeridas por categoría

| Categoría | Keywords (elige 2–4) |
|-----------|----------------------|
| **Lighting** | `natural soft`, `dramatic rim`, `studio high-key`, `golden-hour`, `overcast diffused`, `neon nocturne` |
| **Mood** | `professional`, `energetic`, `serene`, `confident`, `minimal-editorial`, `warm-judogi`, `tech-precise`, `traditional-dojo`, `playful-vibrant` |
| **Composition** | `centered`, `rule-of-thirds`, `minimal negative-space`, `bento-grid asymmetric`, `hero-centric`, `split-diagonal` |
| **Treatment** | `high contrast`, `muted desaturated`, `vibrant punchy`, `matte-film`, `clean-studio` |
| **Aesthetic** | `modern-minimal`, `vintage filmic`, `editorial-vogue`, `brutalist-raw`, `bento-material`, `museum-quality` |
| **Don'ts (prohibido)** | `ai artifacts`, `extra limbs`, `text in images`, `watermarks`, `low-res`, `compressed jpeg` |

---

## 1. Quick Reference — CUSTOMIZAR AQUÍ PRIMERO

> 🎯 **Rellena esta tabla primero.** Todo lo demás (componentes, skills de
> diseño, generadores de tokens) leerá de aquí como fuente canónica.

| Elemento | Valor actual (editable) | Variable `EXPO_PUBLIC_THEME_*` equivalente |
|----------|-------------------------|--------------------------------------------|
| **Primary Color**       | `#8D6E63` (Aged Wood — modifica este) | `EXPO_PUBLIC_THEME_PRIMARY` |
| **Primary Hover**       | `#6D4C41` | `EXPO_PUBLIC_THEME_PRIMARY_HOVER` |
| **Accent Color**        | `#1A237E` (Indigo — modifica este) | `EXPO_PUBLIC_THEME_ACCENT` |
| **Secondary Color**     | `#1A237E` | `EXPO_PUBLIC_THEME_SECONDARY` |
| **Secondary Hover**     | `#151C66` | `EXPO_PUBLIC_THEME_SECONDARY_HOVER` |
| **Danger / Error**      | `#C62828` (Judogi Red) | `EXPO_PUBLIC_THEME_DANGER` |
| **Success**             | `#558B2F` (Tatami Green) | `EXPO_PUBLIC_THEME_SUCCESS` |
| **Warning**             | `#F9A825` (Golden Yellow) | `EXPO_PUBLIC_THEME_WARNING` |
| **Info**                | `#1A237E` | `EXPO_PUBLIC_THEME_INFO` |
| **Background**          | `#FFFFFF` | `EXPO_PUBLIC_THEME_BG` |
| **Surface / Cards**     | `#FFFFFF` | `EXPO_PUBLIC_THEME_SURFACE` |
| **Text Primary**        | `#1A1A1A` | `EXPO_PUBLIC_THEME_TEXT` |
| **Text Muted**          | `#6D6D6D` | `EXPO_PUBLIC_THEME_TEXT_MUTED` |
| **Border (divisores)**  | `rgba(141,110,99,0.22)` | `EXPO_PUBLIC_THEME_BORDER` |
| **Focus Ring**          | `#8D6E63` | `EXPO_PUBLIC_THEME_FOCUS_RING` |
| **Active Indicator**    | `#8D6E63` | `EXPO_PUBLIC_THEME_ACTIVE_INDICATOR` |
| **Sidebar Background**  | `#FFFFFF` | `EXPO_PUBLIC_THEME_SIDEBAR` |
| **Display Font (Títulos)** | `Montserrat, Inter` | `EXPO_PUBLIC_THEME_DISPLAY_FONT` |
| **Body Font (Texto)**   | `Inter` | `EXPO_PUBLIC_THEME_BODY_FONT` |
| **Mono Font**           | `IBM Plex Mono` | `EXPO_PUBLIC_THEME_MONO_FONT` |
| **Radius Cards lg**     | `20px` | `EXPO_PUBLIC_THEME_RADIUS_LG` |
| **Radius Buttons md**   | `14px` | `EXPO_PUBLIC_THEME_RADIUS_MD` |
| **Spacing md (base)**   | `16px` | `EXPO_PUBLIC_THEME_SPACING_MD` |
| **Transition base**     | `200ms` | `EXPO_PUBLIC_THEME_TRANSITION_BASE` |

### Valores *Soft* (rgba) — auto-calculados

Si sólo rellenas los HEX anteriores, el sistema genera automáticamente:
- `primarySoft = rgba(PRIMARY, 0.10)`
- `accentSoft = rgba(ACCENT, 0.10)`
- `dangerSoft = rgba(DANGER, 0.10)`
- `successSoft = rgba(SUCCESS, 0.12)`
- `warningSoft = rgba(WARNING, 0.14)`
- `infoSoft = rgba(INFO, 0.10)`

Sólo define `EXPO_PUBLIC_THEME_PRIMARY_SOFT` (y equivalentes) si quieres
sobreescribir la versión auto-generada.

---

## 2. Color Palette — Especificación extendida

### 2.1 Primary Colors

| Nombre (role) | Hex | RGB | Uso (edita según necesites) |
|---------------|-----|-----|-----------------------------|
| Primary       | `#8D6E63` | `rgb(141,110,99)` | CTAs, actions, focus ring, active indicator |
| Primary Hover | `#6D4C41` | `rgb(109,76,65)`  | Hover states buttons/chips |
| Primary Soft  | auto-rgba | `rgba(141,110,99,0.12)` | Pills, subtle highlights, hover backgrounds |
| Primary Dark  | `#6D4C41` | `rgb(109,76,65)`  | Strong emphasis (mismo que Hover por defecto) |

**Notas de edición**: Para un look "tech" sustituye `agedWood` por azul/índigo.
Para un look "lujoso" prueba `#2B2B2B` + acento dorado.

### 2.2 Secondary + Accent Colors

| Role | Hex | RGB | Uso |
|------|-----|-----|-----|
| Secondary       | `#1A237E` | `rgb(26,35,126)` | Títulos secundarios, enlaces, iconos destacados |
| Secondary Hover | `#151C66` | `rgb(21,28,102)` | |
| Accent          | `#1A237E` | `rgb(26,35,126)` | Elementos de atención moderada |
| Accent Soft     | auto-rgba | `rgba(26,35,126,0.10)` | Badges, tags |

### 2.3 Semantic / Estado

| Role | Hex | Uso | NOTA |
|------|-----|-----|------|
| Success | `#558B2F` | Checks, confirmaciones, pagos OK | **NO cambiar por mero gusto** — sugiere verde salvo anti-patrón |
| Warning | `#F9A825` | Pendientes, advertencias leves | Ámbar por defecto |
| Danger  | `#C62828` | Errores, acciones destructivas | Rojo por convención universal |
| Info    | `#1A237E` | Tooltips, hints, info badges | |

### 2.4 Neutrals

| Role | Hex | Uso |
|------|-----|-----|
| Background (page) | `#FFFFFF` | |
| Surface (cards/panels) | `#FFFFFF` | |
| Surface Alt | `#FAFAFA` | Zebrado, tablas, panels secundarios |
| Text Primary | `#1A1A1A` | Títulos + body |
| Text Muted | `#6D6D6D` | Captions, help text, labels secundarias |
| Border | `rgba(141,110,99,0.22)` | Divisores |
| Border Strong | `rgba(141,110,99,0.42)` | Inputs focused, outlined cards |
| Overlay | `rgba(26,26,26,0.32)` | Backdrop modales |

### 2.5 Accesibilidad — Checks mínimos

- [ ] Body text sobre bg = **≥ 4.5:1** (WCAG AA)
- [ ] Large text (≥18pt bold o ≥24pt) = **≥ 3:1**
- [ ] Botón primary + label = **≥ 4.5:1**
- [ ] Focus ring visible en teclado (nunca `outline: none` sin alternativa)

---

## 3. Typography

### 3.1 Stacks por plataforma

| Role | Web (CSS stack) | React Native (expo-font) | `EXPO_PUBLIC_THEME_*` |
|------|-----------------|--------------------------|------------------------|
| **Display** (H1, H2) | `"Montserrat", "Inter", "Segoe UI", sans-serif` | `Montserrat_800ExtraBold` → `Montserrat_700Bold` | `EXPO_PUBLIC_THEME_DISPLAY_FONT` (web) + storage key `typography.displayFamilyNative` (native) |
| **Heading** (H3, H4) | `"Montserrat", "Inter", ...` | `Montserrat_700Bold` | `EXPO_PUBLIC_THEME_HEADING_FONT` |
| **Body** | `"Inter", "Segoe UI", ...` | `Inter_400Regular` | `EXPO_PUBLIC_THEME_BODY_FONT` |
| **Mono** | `"IBM Plex Mono", Consolas, monospace` | *(opcional)* | `EXPO_PUBLIC_THEME_MONO_FONT` |

### 3.2 Escala de tamaños (px / pt)

| Token | Desktop | Mobile | Weight | Line Height | `EXPO_PUBLIC_THEME_*` |
|-------|---------|--------|--------|-------------|------------------------|
| Display | 40 | 34 | 800 | 1.15 | `EXPO_PUBLIC_THEME_DISPLAY_SIZE` |
| Title   | 30 | 26 | 700 | 1.20 | `EXPO_PUBLIC_THEME_TITLE_SIZE` |
| Subtitle | 18 | 17 | 600 | 1.30 | `EXPO_PUBLIC_THEME_SUBTITLE_SIZE` |
| Body    | 15 | 15 | 400 | 1.50 | `EXPO_PUBLIC_THEME_BODY_SIZE` |
| Caption | 13 | 13 | 400 | 1.40 | `EXPO_PUBLIC_THEME_CAPTION_SIZE` |

---

## 4. Spacing, Radius & Motion

### 4.1 Spacing (8-base relajada — edita si quieres más/menos aire)

| Token | Valor px | Uso típico | `EXPO_PUBLIC_THEME_*` |
|-------|----------|------------|------------------------|
| xs | 8  | Gap entre icono + label | `EXPO_PUBLIC_THEME_SPACING_XS` |
| sm | 12 | Padding interno compacto | `EXPO_PUBLIC_THEME_SPACING_SM` |
| md | 16 | Padding estándar, gaps grid | `EXPO_PUBLIC_THEME_SPACING_MD` |
| lg | 20 | Padding cards | `EXPO_PUBLIC_THEME_SPACING_LG` |
| xl | 28 | Gap entre secciones | `EXPO_PUBLIC_THEME_SPACING_XL` |
| 2xl| 36 | Margen vertical grande | `EXPO_PUBLIC_THEME_SPACING_2XL` |

### 4.2 Border Radius

| Token | px | Uso | `EXPO_PUBLIC_THEME_*` |
|-------|----|-----|------------------------|
| sm | 10 | Inputs, pills pequeñas | `EXPO_PUBLIC_THEME_RADIUS_SM` |
| md | 14 | Botones, chips | `EXPO_PUBLIC_THEME_RADIUS_MD` |
| lg | 20 | Cards, modales | `EXPO_PUBLIC_THEME_RADIUS_LG` |
| pill | 999 | Badges, tags, CTAs full-rounded | `EXPO_PUBLIC_THEME_RADIUS_PILL` |

### 4.3 Motion / Transitions

| Token | ms | Uso | `EXPO_PUBLIC_THEME_*` |
|-------|----|-----|------------------------|
| fast | 150 | Hover micro-interacciones | `EXPO_PUBLIC_THEME_TRANSITION_FAST` |
| base | 200 | Entradas/salidas standard | `EXPO_PUBLIC_THEME_TRANSITION_BASE` |
| slow | 250 | Modales, expand/collapse | `EXPO_PUBLIC_THEME_TRANSITION_SLOW` |

---

## 5. Componentes — Mínima especificación (edita sin miedo)

### 5.1 Buttons

| Variant | Background | Text | Radius | Hover cambia |
|---------|------------|------|--------|--------------|
| Primary   | `colors.primary` | `colors.onPrimary = #FFFFFF` | `radius.md` | background → `colors.primaryHover` |
| Secondary | transparent + 1px border | `colors.secondary` | `radius.md` | background → `colors.secondarySoft` |
| Ghost     | transparent | `colors.text` | `radius.md` | background → `colors.hover` |
| Danger    | `colors.danger` | `#FFFFFF` | `radius.md` | `colors.dangerHover` |

### 5.2 Cards

| Atributo | Valor |
|----------|-------|
| Background | `colors.surface` |
| Radius | `radius.lg` |
| Shadow | `shadows.card` (0 4px 14px rgba 4%) |
| Padding | `spacing.lg` (20px) por defecto |
| Border | 1px solid `colors.border` (opcional) |

### 5.3 Inputs

| Atributo | Valor |
|----------|-------|
| Background | `colors.surface` |
| Radius | `radius.sm` (10px) |
| Border idle | 1px `colors.border` |
| Border focused | `colors.borderStrong` + ring `colors.focusRing` |
| Padding y | 12px |
| Padding x | 14px |

---

## 6. Shadows — especificación

| Key | shadowColor | offset (W×H) | opacity | radius |
|-----|-------------|--------------|---------|--------|
| `shadows.card` | `#1A1A1A` *(overridea con `EXPO_PUBLIC_THEME_PRIMARY` via focus si quieres brand-tint)* | 0 × 4 | 0.04 | 14 |
| `shadows.cardElevated` | `#1A1A1A` | 0 × 8 | 0.06 | 20 |
| `shadows.focus` | `colors.focusRing` | 0 × 0 | 0 | 0 *(usa border + outline en CSS)* |

---

## 7. Runtime Overrides (cambio instantáneo SIN BUILD)

Copia y pega en **DevTools → Console** (web) para probar paletas al
instante. No necesitas rebuild.

```js
/* Ejemplo 1: El Dojo → Tech Blue (SaaS minimalista) */
localStorage.setItem("eldojo_theme_overrides", JSON.stringify({
  colors: {
    primary:       "#2563EB",
    primaryHover:  "#1D4ED8",
    accent:        "#8B5CF6",
    secondary:     "#4F46E5",
    secondaryHover:"#4338CA",
    danger:        "#DC2626",
    success:       "#16A34A",
    warning:       "#D97706",
    info:          "#0284C7",
    focusRing:     "#2563EB",
    activeIndicator:"#2563EB",
    border:        "rgba(37,99,235,0.18)",
    borderStrong:  "rgba(37,99,235,0.40)",
    text:          "#0F172A",
    textMuted:     "#64748B",
  },
  radius:   { sm: 8,  md: 10, lg: 16, pill: 999 },
  spacing:  { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, "2xl": 48 },
  typography: {
    displayFamily: '"Space Grotesk", system-ui, sans-serif',
    bodyFamily:    '"DM Sans", system-ui, sans-serif',
    displaySize: 44,
    titleSize:   32,
  },
  transitions: { fast: 120, base: 180, slow: 280 },
}));
location.reload();
```

```js
/* Ejemplo 2: El Dojo → Luxury (madera oscura + dorado) */
localStorage.setItem("eldojo_theme_overrides", JSON.stringify({
  colors: {
    primary:       "#3E2723",
    primaryHover:  "#2C1810",
    accent:        "#D4AF37",
    secondary:     "#D4AF37",
    secondaryHover:"#B8941F",
    background:    "#F5F1EA",
    surface:       "#FFFFFF",
    border:        "rgba(62,39,35,0.20)",
    borderStrong:  "rgba(212,175,55,0.55)",
    focusRing:     "#D4AF37",
    activeIndicator:"#3E2723",
    text:          "#2B1D18",
    textMuted:     "#7A6558",
  },
  radius: { sm: 6, md: 8, lg: 12, pill: 999 },
}));
location.reload();
```

```js
/* Resetear a defaults (borra overrides) */
localStorage.removeItem("eldojo_theme_overrides");
location.reload();
```

### Forma equivalente en `.env.public` / `.env.admin` / `.env.student`

```dotenv
EXPO_PUBLIC_THEME_PRIMARY=#2563EB
EXPO_PUBLIC_THEME_PRIMARY_HOVER=#1D4ED8
EXPO_PUBLIC_THEME_ACCENT=#8B5CF6
EXPO_PUBLIC_THEME_SECONDARY=#4F46E5
EXPO_PUBLIC_THEME_BG=#FFFFFF
EXPO_PUBLIC_THEME_TEXT=#0F172A
EXPO_PUBLIC_THEME_TEXT_MUTED=#64748B
EXPO_PUBLIC_THEME_RADIUS_LG=16
EXPO_PUBLIC_THEME_SPACING_MD=16
EXPO_PUBLIC_THEME_TRANSITION_BASE=180
EXPO_PUBLIC_THEME_DISPLAY_FONT='"Space Grotesk", sans-serif'
EXPO_PUBLIC_THEME_BODY_FONT='"DM Sans", sans-serif'
EXPO_PUBLIC_THEME_DISPLAY_SIZE=44
```

---

## 8. Voice & Tone — para copy + marketing (editable)

> **Edita esta tabla sólo si cambias la estrategia de comunicación.**
> No afecta a componentes visuales, pero sí a skills de `brand` y `slides`.

| Trait | Somos | No somos |
|-------|-------|----------|
| **Autoritativo pero humano** | Expertos en artes marciales + cercanos | Rígidos, pedantes, militares sin alma |
| **Claro + directo** | Menos copy, más acción | Lero lero relleno, jergas |
| **Orientado al progreso** | Cinturones, asistencias, evolución medible | Promesas vacías "sé campeón" |
| **Premium pero accesible** | Detalles cuidados, precio justo | Elitista / ostentoso |

### Termino-prohibido

| Evitar | Sustituir por | Motivo |
|--------|---------------|--------|
| "seamless" | "sin fricción" / "automático" | Anglocliched |
| "best-in-class" | "líder en dojos" | Reclamación sin prueba |
| "leverage" | "usa" / "aprovecha" | Corp-speak |
| "synergy" | *(borrar)* | Corp-speak |
| "garantizado" | "o te devolvemos tu pago" (si procede) | Legalmente sensible en LATAM |

---

## 9. Logo — reglas mínimas

| Variante | Path sugerido | Uso |
|----------|---------------|-----|
| Horizontal completo | `assets/img/logo.svg` | Navbars, headers de página |
| Icon (símbolo solo)  | `assets/img/logo-vect.svg` | Favicon, app icons, drawer header |
| Monocromo *(si existe)* | *(crear si hace falta)* | Sobre fondos de color, impresión B/N |

### Clear-space mínimo

Altura del símbolo = `X`. El padding alrededor en todos los lados debe ser ≥ `0.5 × X`.

### Don'ts de logo

- [ ] No estirar (aspect ratio 1:1 para el icon, ~3:1 para horizontal)
- [ ] No cambiar los colores del logo sin pasar por sección 1 primero
- [ ] No poner sobre fondos con contraste < 3:1
- [ ] No añadir sombras, strokes ni brillos al logo

---

## 10. Changelog de Marca (para que tú lleves el control)

| Fecha | Quién | Cambio |
|-------|-------|--------|
| `2026-09-28` | Setup inicial | Versión flexible inicial. Paleta agedWood/indigo de El Dojo por defecto, pero TODO editable sin tocar código. |
| `YYYY-MM-DD` | *tu nombre/handle* | *Ej: primary → #2563EB, fuentes → Space Grotesk + DM Sans* |
