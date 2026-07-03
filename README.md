# ElDojo Mobile

Portal responsive para administrar dojos de BJJ con una UX diferenciada entre mobile y desktop.

## Stack

- Expo managed + TypeScript
- React Navigation
- TanStack Query
- axios con interceptor de access token y refresh automático
- expo-secure-store para persistencia segura
- expo-image-picker para la foto de perfil

## Alcance implementado

- Login enfocado al portal de administradores de gimnasio
- Acceso permitido en esta interfaz solo para `org_admin` y `branch_admin`
- UX diferenciada para:
  - mobile
  - desktop
- Stack actual de administración con:
  - dashboard inicial con métricas y accesos rápidos
  - listado de alumnos
  - CRUD de alumnos con formularios y confirmaciones
  - vista detalle de alumno
  - historial de pagos por alumno
  - búsqueda por nombre
  - pull-to-refresh
- Componentes reutilizables base:
  - botón
  - input
  - tarjeta

## Estructura

```text
src/
  api/
  components/
  constants/
  context/
  hooks/
  navigation/
  screens/
  types/
  utils/
```

## Requisitos

- Node.js 20+
- Backend `eldojo-backend-api` corriendo
- Variable `EXPO_PUBLIC_API_URL` apuntando al prefijo `/api/v1`

## Configuración

1. Copia el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Define la URL base de la API:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

En Expo web sobre WSL/Windows, `localhost` suele ser la opción más estable. Además, la app normaliza automáticamente `localhost` y `127.0.0.1` para reutilizar el hostname con el que abriste la UI en el navegador.

## Instalación

```powershell
npm install
```

## Ejecución

```powershell
npx expo start
```

Atajos útiles:

```powershell
npm run android
npm run ios
npm run web
```

## Validación rápida

```powershell
npm run typecheck
```

## Decisiones y notas

- Se creó como proyecto hermano de `eldojo-backend-api` en la misma raíz.
- Esta interfaz quedó reservada para administradores de gimnasio (`org_admin` y `branch_admin`).
- Los accesos de alumnos y super admins se separarán en experiencias distintas en entregas posteriores.
- La UI usa grupos de estilos distintos para mobile y desktop, con layouts diferentes según el ancho disponible.
- El flujo admin actual abre primero un dashboard y desde ahí navega al listado de alumnos.
- El módulo de alumnos permite alta, edición y baja lógica mediante modales; el alta muestra un resumen previo para confirmación.
- Cada alumno ahora cuenta con una vista de detalle para consultar su ficha general y el historial de pagos asociado.
- Para que la Fase 1 cierre de forma integral, se añadieron endpoints móviles mínimos al backend:
  - `POST /auth/refresh`
  - `POST /auth/student/register`
  - `GET /me`
  - `PATCH /me`
  - búsqueda `search` en `GET /students`
- El dashboard consume también `GET /classes` para mostrar clases activas y preparar el crecimiento del panel administrativo.
- El CRUD admin consume además `GET /branches`, `GET /classes`, `POST /students`, `PATCH /students/{id}` y `DELETE /students/{id}`.
- El detalle admin consume además `GET /students/{id}` y `GET /payments?student_id=...` para mostrar ficha completa e historial financiero del alumno.
- La actualización de perfil usa `multipart/form-data` para soportar foto y clase actual en un mismo endpoint.
- En este entorno de sandbox, `expo start` no puede crear la carpeta `.expo`, por lo que el arranque completo puede requerir ejecutarse fuera del sandbox o con permisos habilitados.

## Próximos pasos sugeridos

- Registrar pagos y conciliación desde el panel admin
- Mejorar diseño visual y estados vacíos
- Endpoints de logout y revocación de refresh token
- Módulos futuros de pagos, grados, torneos y QR
