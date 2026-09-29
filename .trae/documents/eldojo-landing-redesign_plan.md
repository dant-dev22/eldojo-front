# Plan de Implementación: Rediseño Landing El Dojo
**Fecha:** 2026-09-28
**Modo:** TRAE-plan-mode (1 aprobación → ejecutar)
**Scope:** Header público + /home completa + Footer + Modal de login
**Deploy final:** `SKIP_GIT_PULL=1 bash scripts/deploy/deploy.sh`

---

## 1. Contexto y Restricciones Confirmadas

### Stack
- **Frontend:** Expo Web / React Native Web (repositorio: `eldojo-mobile`)
- **Backend:** FastAPI (repositorio: `eldojo-backend-api`) — NO-TOUCH
- **Infra:** Nginx reverse proxy multi-portal → eldojo.tech / app.eldojo.tech / mi.eldojo.tech

### NO-TOUCH AREAS (confirmado en requerimiento y memoria)
| Componente | Ubicación | Motivo |
|---|---|---|
| Endpoints backend auth | `eldojo-backend-api` | Funcionando en producción |
| Lógica de tokens JWT | `SimpleAuthProvider`, `auth.ts` | Integración cross-app |
| Session Tickets cross-domain | `/auth/session-ticket/*` | Transferencia de sesión entre subdominios |
| `SessionIndicator` pill | `src/components/SessionIndicator.tsx` | Indicador de estado cross-domain |
| `readSessionHint()` cookie | `src/utils/sessionHint.ts` | Polling cookie de sesión 2500ms |
| `SimpleAuthGate` + `SimpleAuthProvider` | `src/context/*` | Gate de rutas privadas |
| `resolveSelectedMode()` hostname routing | `App.tsx:L59-76` | Previene spinner infinito por env mal inyectado |

### Paleta FIJA — Validada 1:1 con EDITORIAL_* en theme.ts
| Uso | HEX | Token existente |
|---|---|---|
| Fondo base / BG | `#1F2937` | `EDITORIAL_BG` |
| Texto / Superficie primaria | `#FFFFFF` | `EDITORIAL_FG` |
| Borde 1px / Ring focus / Underline | `#FFFFFF` (algunos alfa) | `EDITORIAL_BORDER`, `EDITORIAL_RING` |
| Borde suave (tarjetas/superficies) | `rgba(255,255,255,0.12)` | `EDITORIAL_BORDER_SOFT` |
| Superficie elevada (cards) | `rgba(255,255,255,0.04)` | `EDITORIAL_SURFACE` |
| Semántico Success | `#22C55E` | `EDITORIAL_ACCENT_SUCCESS` |
| Semántico Warning | `#F59E0B` | `EDITORIAL_ACCENT_WARNING` |
| Semántico Danger | `#EF4444` | `EDITORIAL_ACCENT_DANGER` |

✅ **Conclusión paleta:** La cadena de resolución por defaults ya entrega la paleta correcta. No se requieren cambios en theme.ts si no se quieren overrides explícitos vía env. OPCIONAL: añadir `EXPO_PUBLIC_THEME_*` en `.env.public`/`.env.admin`/`.env.student` para explicitud (decisión en sección 4).

---

## 2. Investigación Previa: Arquitectura Actual

### Jerarquía de renderizado del Portal Público
```
App.tsx
  └─ resolveSelectedMode() → "public" para eldojo.tech
       └─ SafeAreaProvider → QueryClient → SimpleAuthProvider → AuthProvider
            └─ PublicNavigator
                 ├─ Home → HomeScreen (PublicSiteScreen.tsx:L2129-2376)
                 ├─ About → AboutScreen
                 ├─ SignIn / CreateAccount
                 └─ ...confirmation flows
```

```
HomeScreen  (target del rediseño)
  └─ PublicPageChrome wrapper
       ├─ Sticky Navbar (logo + SessionIndicator + nav links + login CTA)
       ├─ Mobile floating bar (menu trigger + mini avatar pill)
       ├─ Mobile menu modal (nav anchors)
       ├─ HomeScreen (5 secciones)
       │   ├─ Hero (actual: H1 + lead + 3 bullets HOME_HIGHLIGHTS + 2 CTAs)
       │   ├─ Features (3 tarjetas disciplina BJJ/MMA/Judo ✅)
       │   ├─ Pricing (2 planes: Estándar + Pro — FALTA 3º)
       │   ├─ Social Proof (María Rojas quote ✅)
       │   └─ CTA Final ✅
       └─ Footer shell (logo+eslogan, legal links, copyright)
```

### Componentes UI reutilizables disponibles (ya estilizados con theme.ts)
- `AppButton` — variant=primary/secondary, radius=0 (editorial sharp), loading state
- `AppCard` — surface 0.04 white, border 0.12, radius=4
- `AppInput` — label uppercase, border red on error, eye toggle password
- `AppModal` — overlay 0.72 dark, dialog BG=colors.background (matches dark)
- `LogoSvg` — logo vectorial, marca cuadrada con borde

### Motion actual
- Scroll reveal por IntersectionObserver ya implementado en HomeScreen (L2137-2197):
  - `.ed-fade.ed-in` → `transition 380ms cubic-bezier(0.22,1,0.36,1)`
  - Above-fold (d1-d4): immediate via requestIdleCallback
  - Below-fold (d5-d8): threshold 0.1
- Ajuste necesario: bajar a 350ms y respetar `prefers-reduced-motion`

---

## 3. Archivos y Módulos a Modificar

| # | Archivo | Propósito del cambio | Impacto |
|---|---|---|---|
| 1 | `src/styles/web/base.css` | Resetear `:root` CSS vars a paleta dark (actualmente LIGHT Aged Wood). Fija flicker de fondo blanco en carga y desync CSS/RN | Bajo — solo web, sin afectar JS |
| 2 | `App.tsx:L110` | StatusBar `style="dark"` → `"light"` (por mode) | Bajo — solo StatusBar |
| 3 | `src/components/PublicPageChrome.tsx` | Header: eliminar navItems "Inicio/Acerca" → dejar 3 bloques: logo \| SessionIndicator pill \| Login CTA. Mobile menu: añadir anchors a 5 secciones. Footer: verificar labels y orden "Términos · Privacidad · Contacto" | Medio — navegación pública |
| 4 | `src/components/PublicAuthModal.tsx` | (a) Añadir tabs internas "Correo electrónico / Google" dentro del modo login (Google = stub disabled). (b) Recovery link: mostrar tooltip "Próximamente" o stub screen. (c) Verificar inline error + loading button funcionen | Medio — auth público |
| 5 | `src/screens/auth/PublicSiteScreen.tsx` | **Core rediseño:** (a) Hero: nuevo copy H1 + subheading corto, ELIMINAR HOME_HIGHLIGHTS 3 bullets, 1 CTA primario + 1 link secundario. (b) Pricing: AÑADIR 3er plan. (c) Motion: reducir a 350ms + prefers-reduced-motion. (d) Ajustes paddings 375px first. (e) Verificar ≤12 elementos visibles por vista | Alto — landing principal |
| 6 | `src/screens/auth/PublicSiteScreen.tsx` (styles block) | Actualizar escalas tipográficas, paddings, gaps al design system densidad=4 | Alto — consistencia visual |
| 7 | **OPCIONAL** `.env.public` / `.env.admin` / `.env.student` | Añadir `EXPO_PUBLIC_THEME_BG=#1F2937` + `EXPO_PUBLIC_THEME_TEXT=#FFFFFF` explícitos | Nulo — defaults ya cubren; decisión en sección 4 |

---

## 4. Pasos de Implementación (Orden Dependencias)

```
FASE A — Infraestructura visual & base (sin contenido)
  Paso 1  →  base.css :root vars reset dark
  Paso 2  →  App.tsx : StatusBar style por appMode (public/admin/student → light)

FASE B — Chrome (Header/Footer/Modal)  [indep. de contenido Home]
  Paso 3  →  PublicPageChrome Header:
              · Desktop navbar L202-383: ELIMINAR bloque navItems (Inicio/Acerca)
                Layout final: [brand + pillLeft] [espacio] [Ingresar CTA]
              · Mobile menu modal L605-721: reemplazar navItems por anchors a
                secciones → #hero / #features / #pricing / #testimonial / #cta
              · Footer L440-603: confirmar orden y texto exacto:
                "Términos · Privacidad · Contacto" — verificar que no diga
                "Términos y condiciones" o similar; si difiere, corregir label
  Paso 4  →  PublicAuthModal:
              · Dentro de authMode="login", crear segmented control 2 tabs:
                "Correo electrónico" (activo, campos email/password)
                "Google" (stub disabled: badge "Próximamente", no inputs)
              · Recovery link onPress → show toast "Recuperación de contraseña: Próximamente" (no navegar, no romper flow)
              · Verificar: error inline abajo de inputs (danger color) ✔
                         botón submit con ActivityIndicator cuando isPending ✔

FASE C — HomeScreen (5 secciones, 375px first, motion 3/10)
  Paso 5  →  Constante PAGE_COPY / hero copy:
              H1 propuesto: "La gestión de tu academia de artes marciales, en un solo lugar."
              Subheading propuesto: "Administra BJJ, MMA y Judo con software diseñado para instructores y dueños de club. Menos planillas, más tiempo en el tatami."
              ELIMINAR HOME_HIGHLIGHTS (3 bullets actuales en hero)
              CTA primario: "Crear cuenta gratis" → CreateAccount tab del modal
              Link secundario: "Ver planes ↓" → scroll a #pricing
  Paso 6  →  Features: mantener 3 tarjetas por disciplina, afinar copy:
              · BJJ: "Gestión de graduaciones, gi por peso y torneos IBJJF"
              · MMA: "Control de rounds, sparring y equipos de combate"
              · Judo: "Registro de katas, competencias oficiales y kyus/dans"
              (paleta solo 2 colores: quitar softColor por bordes 1px white + iconos text-only)
  Paso 7  →  Pricing: AÑADIR 3er plan (orden 3 columnas):
              PLAN 1 · Starter      · $X / mes · 1 academia, ≤ 50 alumnos, facturación básica
              PLAN 2 · Estándar     · $Y / mes · (actual) 1 academia, ilimitados, + reportes
              PLAN 3 · Pro          · $Z / mes · (actual) multi-sede, API, + features avanzadas
              (NOTA: valores X/Y/Z placeholder si no están definidos — mantener los actuales Estándar/Pro y añadir Starter primero)
  Paso 8  →  Social Proof: mantener María Rojas, ajustar styling (borde 1px blanco)
  Paso 9  →  CTA Final: mantener estructura, ajustar copy a H2:
             "¿Listo para dejar de gestionar con planillas? Empieza hoy."
  Paso 10 →  Motion + responsive:
              · Reducir transition 380ms → 350ms
              · Añadir media query @media (prefers-reduced-motion: reduce) { .ed-fade { transition: none !important; opacity: 1 !important; } }
              · Ajustes padding móvil 375px: edShell padding-horizontal = 20px (reducir de 24)
              · Confirmar ≤12 elementos visibles por breakpoint (incluyendo header + CTA fijo móvil)

FASE D — Validación pre-deploy
  Paso 11 → (Opcional) .env.* tokens explícitos: ver sección Decision 1
  Paso 12 → Build local smoke test: `npx cross-env EXPO_PUBLIC_APP_MODE=public npx expo export --platform web`
  Paso 13 → Validar que bundle público contenga strings de control: buscar "Crear cuenta gratis" y "Starter" en dist/
  Paso 14 → Deploy vía script y smoke tests 06
```

### Decisiones Pendientes (requieren tu OK o defaults aplicables):

| # | Decisión | Opciones | Default aplicado si no respuesta |
|---|---|---|---|
| **D1** | EXPO_PUBLIC_THEME_* en .env explícitos? | (a) No → defaults EDITORIAL_* ya son correctos; (b) Sí → añadir a 3 .env.* por seguridad de bake-in | **(a) No tocar** — menos riesgo de typo, defaults ya probados |
| **D2** | Tipografía Display | (a) Calistoga (recomendado ui-ux-pro-max, requiere añadir fuente); (b) Mantener Montserrat 800 (actual) | **(b) Mantener Montserrat** — evitar añadir fuente nueva sin aprobación explícita (riesgo layout shift) |
| **D3** | 3er plan Pricing: Nombre y precio | (a) Starter $4.990 CLP; (b) Básico $3.990; (c) Enterprise arriba | **(a) Starter** como plan inicial low-tier; precio placeholder si no hay real |
| **D4** | Tab Google en Modal | (a) Stub disabled + badge "Próximamente"; (b) No mostrar tab, solo Email | **(a) Stub** — usuario pidió "si aplica", así mostramos roadmap sin romper |
| **D5** | Password Recovery link | (a) Toast "Próximamente"; (b) Navegar a stub screen reset-password | **(a) Toast** — menor riesgo, no requiere navegación nueva |

---

## 5. Validación Post-Implementación

### Checklist Visual (375px / 768px / 1024px / 1440px)
- [ ] Header: logo alineado izq, SessionIndicator pill centro-izq, CTA "Ingresar" derecha — desktop
- [ ] Mobile: floating bar con botón menú + mini avatar pill cuando hintShowsAuth
- [ ] Mobile menú: anchors a 5 secciones funcionan (smooth-scroll)
- [ ] Footer: orden "Términos · Privacidad · Contacto" separados por `·`
- [ ] Footer: copyright `© 2026 El Dojo`
- [ ] Hero: H1 legible, 1 CTA blanco sólido, 1 link secundario underline blanco
- [ ] Features: 3 tarjetas disciplina, solo bordes blancos 1px, sin colores suaves
- [ ] Pricing: 3 tarjetas (Starter / Estándar / Pro), grid responsive 1→2→3 cols
- [ ] Social Proof: 1 bloque con cita, borde blanco
- [ ] CTA Final: H2 + 1 botón primario
- [ ] **Regla estricta ≤12 elementos visibles** en cualquier breakpoint (contar: logo, pill, login CTA, H1, sub, CTA1, link2, 3 cards-features = 9 → OK; etc)

### Paleta y Accesibilidad
- [ ] Background body/html = #1F2937 (sin flicker blanco en carga)
- [ ] Todos los bordes/rings/focus = #FFFFFF
- [ ] Contraste FG #FFFFFF sobre BG #1F2937 = 15.1:1 → **WCAG AAA**
- [ ] Todos los focus-visible tienen ring blanco 2px
- [ ] `prefers-reduced-motion: reduce` → sin animaciones (testear devtools)

### Funcional
- [ ] Click "Ingresar" abre modal correctamente
- [ ] Modal tabs Login/Registro academy siguen funcionando
- [ ] Dentro Login: tabs "Correo electrónico" (inputs visibles) / "Google" (stub)
- [ ] Form login: credenciales inválidas → error inline rojo (campo + texto)
- [ ] Submit login → botón muestra spinner loading, no se puede volver a clickear
- [ ] Recovery link → toast "Próximamente" (sin crash)
- [ ] SessionIndicator pill se actualiza al detectar cookie hint (polling 2500ms intacto)
- [ ] Login exitoso → redirección cross-domain por session ticket NO TOCADO (solo verificamos que modal cierre)

### Deploy
- [ ] `SKIP_GIT_PULL=1 bash scripts/deploy/deploy.sh` corre sin errores
- [ ] 05-nginx-apply.sh: rsync dist/, dist-admin/, dist-student/ → /eldojo/eldojo-front
- [ ] Permisos: root:www-data 755/644 aplicados
- [ ] 06-smoke-tests.sh: 9/9 tests pasan
- [ ] eldojo.tech carga sin spinner infinito → renderiza HomeScreen nuevo diseño
- [ ] Buscar strings en dist/: "Starter", "Crear cuenta gratis" → están en el bundle (confirma build público correcto)

---

## 6. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **R1 — Spinner infinito** por build con env mal inyectado (recurrente histórico) | Media | Alto | (a) Validar strings de control en dist/ post-build local; (b) `resolveSelectedMode()` hostname fallback intacto (NO-TOUCH); (c) 06-smoke-tests chequea eldojo.tech render |
| **R2 — Regresión Login/Register** por cambios en Modal | Media | Alto | (a) Tocar solo UI shell (tabs/stub) y recovery toast, NO mutaciones hook/formulario; (b) Testing manual login OK pre-deploy |
| **R3 — base.css :root reset rompe otros portales (admin/student)** | Baja | Alto | (a) Admin/Student también usan dark theme (#1F2937 compatible); (b) Build admin/student posterior con mismo pipeline; (c) Rollback rápido: revertir base.css + redeploy |
| **R4 — Mobile menu breaks al reemplazar navItems por anchors** | Baja | Medio | (a) Verificar que Pressable onPress use `window.location.hash = "#section"` en RN web; (b) Testear 375px click en cada item |
| **R5 — Layout shift al ajustar paddings/tipografía 375px** | Media | Bajo | (a) Aumentar padding progresivamente y testear cada sección; (b) Mantener máximo 12 elementos visibles |
| **R6 — Pricing break si no hay 3 cards en grid** | Baja | Bajo | (a) Añadir 3er entry en HOME_PRICING_PLANS antes de render loop; (b) Grid responsive usa `auto-fit minmax(280px,1fr)` para N cols |

---

## 7. Instrucciones Deploy Final (sin pasos extra)

1. **Aprobar este plan** (confirmación explícita del usuario)
2. **Yo ejecuto los cambios de archivos** de la sección 3
3. **Tú ejecutas en el VPS** (1 solo comando):
   ```bash
   cd /eldojo/eldojo-front  # o ruta al repo frontend en VPS
   SKIP_GIT_PULL=1 bash scripts/deploy/deploy.sh
   ```
4. **Si requiere cambios manuales en .env** que yo no pueda aplicar (Decision D1):
   - Añadir a `.env.public`, `.env.admin`, `.env.student` las líneas:
     ```
     EXPO_PUBLIC_THEME_BG=#1F2937
     EXPO_PUBLIC_THEME_TEXT=#FFFFFF
     EXPO_PUBLIC_THEME_BORDER=#FFFFFF
     EXPO_PUBLIC_THEME_RING=#FFFFFF
     EXPO_PUBLIC_THEME_SUCCESS=#22C55E
     EXPO_PUBLIC_THEME_WARNING=#F59E0B
     EXPO_PUBLIC_THEME_DANGER=#EF4444
     ```
5. **Post-deploy check rápido manual en eldojo.tech** (5 items):
   - Background es oscuro #1F2937 (no blanco)
   - Header tiene logo / pill / "Ingresar" (sin links Inicio/Acerca)
   - Pricing muestra 3 tarjetas (Starter + Estándar + Pro)
   - Modal Ingresar abre, tiene tabs Correo/Google y loading en botón
   - Smoke test endpoint `/health` API responde OK

---

## 8. Aprobación

> **Para aprobar, responde "Aprobar plan" o indica los cambios en las decisiones D1-D5 (u otros ajustes).**
> En caso de aprobación, ejecutaré los 14 pasos de implementación y entregaré el código listo para `deploy.sh`.
