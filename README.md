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

## Despliegue a VPS

Este proyecto no se despliega como app nativa en el VPS. Lo que se sube al servidor es
la version web generada por Expo para que los administradores entren desde el navegador.

### Resumen del flujo

1. Primero sube `eldojo-backend-api` al VPS y dejalo respondiendo por una URL publica
   como `https://api.tudominio.com`
2. Luego compila este proyecto en modo web
3. Sirve la carpeta generada con `pm2`
4. Coloca `nginx` delante para exponer el sitio por dominio o IP

### Requisitos recomendados en el VPS

- Ubuntu/Debian con acceso por SSH
- Node.js 20+
- npm
- `pm2`
- `nginx`
- La API ya corriendo y accesible desde internet o desde la red privada del VPS

### Paso 1. Entrar al VPS e instalar lo necesario

```bash
sudo apt update
sudo apt install -y nginx curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Verifica versiones:

```bash
node -v
npm -v
pm2 -v
```

### Paso 2. Subir el proyecto al servidor

Ejemplo usando `/var/www`:

```bash
cd /var/www
sudo git clone <URL_DE_TU_REPO> eldojo-mobile
sudo chown -R $USER:$USER /var/www/eldojo-mobile
cd /var/www/eldojo-mobile
```

Si el proyecto ya existe y solo quieres actualizarlo:

```bash
cd /var/www/eldojo-mobile
git pull origin main
```

### Paso 3. Crear el archivo `.env`

```bash
cp .env.example .env
```

Configura la URL publica de la API:

```env
EXPO_PUBLIC_API_URL=https://api.tudominio.com/api/v1
```

Si todavia no tienes dominio, tambien puedes usar la IP publica del VPS:

```env
EXPO_PUBLIC_API_URL=http://TU_IP_PUBLICA/api/v1
```

Importante:

- esta URL debe terminar en `/api/v1`
- si cambias esta URL, debes volver a generar el build web
- el backend debe permitir este origen en `BACKEND_CORS_ORIGINS`

### Paso 4. Instalar dependencias

```bash
npm install
```

### Paso 5. Generar la version web de produccion

```bash
npx expo export --platform web
```

Al terminar, Expo genera una carpeta `dist/`. Esa es la que se publica en el VPS.

### Paso 6. Levantar el frontend con `pm2`

```bash
cd /var/www/eldojo-mobile
pm2 serve dist 3000 --name eldojo-mobile --spa
pm2 save
pm2 startup
```

Que hace esto:

- `pm2 serve dist 3000` publica la carpeta compilada en el puerto `3000`
- `--spa` ayuda a que la navegacion web siga funcionando como aplicacion de una sola pagina
- `pm2 save` guarda el proceso para que vuelva a subir despues de reiniciar el VPS

Para revisar que quedo corriendo:

```bash
pm2 list
pm2 logs eldojo-mobile
curl http://127.0.0.1:3000
```

### Paso 7. Publicar el frontend con `nginx`

Crea el archivo:

```bash
sudo nano /etc/nginx/sites-available/eldojo-mobile
```

Contenido sugerido:

```nginx
server {
    listen 80;
    server_name app.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activa el sitio y recarga `nginx`:

```bash
sudo ln -s /etc/nginx/sites-available/eldojo-mobile /etc/nginx/sites-enabled/eldojo-mobile
sudo nginx -t
sudo systemctl reload nginx
```

### Paso 8. Activar HTTPS

Si ya tienes el dominio apuntando al VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.tudominio.com
```

### Paso 9. Validar que todo quedo bien

1. Abre `https://app.tudominio.com`
2. Intenta iniciar sesion
3. Confirma en DevTools del navegador que las llamadas salen hacia
   `https://api.tudominio.com/api/v1`
4. Si aparece un error de CORS, revisa `BACKEND_CORS_ORIGINS` en la API

### Paso 10. Actualizar el frontend en futuras versiones

Cada vez que subas cambios:

```bash
cd /var/www/eldojo-mobile
git pull origin main
npm install
npx expo export --platform web
pm2 restart eldojo-mobile
```

### Orden recomendado de despliegue

1. Sube y valida `eldojo-backend-api`
2. Configura en este proyecto `EXPO_PUBLIC_API_URL` con la URL real de la API
3. Genera el build web
4. Levanta `pm2`
5. Prueba login, alumnos y pagos para confirmar que frontend y backend se ven entre si

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
