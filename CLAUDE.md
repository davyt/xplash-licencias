# Xplash — Sistema de Licencias VR

## Qué es este proyecto
Sistema propio de licencias para Xplash. Permite activar, bloquear y controlar el acceso a experiencias de entrenamiento VR distribuidas en Meta Quest a empresas B2B con contratos de tiempo limitado.

**Problema que resuelve:** Meta no permite revocar acceso a apps ya instaladas. Este sistema implementa una validación propia en el arranque de la app VR.

## Stack
- **Panel web:** React + Vite + Ant Design (en `/panel`)
- **Backend:** Firebase Cloud Functions Node.js (en `/functions`)
- **DB:** Firestore · **Auth:** Firebase Authentication · **Hosting:** Firebase Hosting
- **Repo:** GitHub `davyt/xplash-licencias`
- **Firebase project:** `xplash-licencias-a7a58` · región `southamerica-east1`

## Estructura del repo
```
/panel       React + Vite app
  /src
    /layouts   AppLayout (sidebar + header + NotificationBell)
    /pages     Dashboard, Companies, Licenses, Devices, Events, Settings, Team, LoginPage
    /components
      NotificationBell.jsx   <- campanita de alertas por rol
    /hooks
      useNotifications.js    <- genera notificaciones desde mock data, filtradas por rol
    /mock      Datos demo para desarrollo sin Firebase
      data.js  <- mockCompanies, mockLicenses, mockUserAccess, mockAdminUsers, MODULES, PLANS
    firebase.js
    App.jsx
/functions   Cloud Functions
  /src
    index.js
    validateLicense.js   <- función principal, endpoint para los visores Quest
    registerInstallation.js
    admin.js
  invite-users.js        <- script para crear usuarios en Firebase Auth y generar links de activación
  serviceAccountKey.json <- NUNCA commitear (está en .gitignore)
firestore.rules
firestore.indexes.json
firebase.json
.firebaserc
```

## Modelo de datos Firestore
- `companies/{id}` — name, email, contactName, contactPhone, status, notes, createdAt
- `licenses/{id}` — licenseCode, companyId, status (active|blocked|paused|draft|expired), plan, maxUsers, offlineGraceHours, startDate, expiresAt, enabledModules[], notes
- `userAccess/{licenseId_metaUserId}` — metaUserId, licenseId, companyId, appVersion, deviceModel, osVersion, platform, firstSeenAt, lastSeenAt
- `events/{id}` — licenseCode, licenseId, companyId, metaUserId, moduleId, appVersion, allowed, reason, createdAt
- `contracts/{id}` — historial comercial por empresa (companyId, plan, maxUsers, startDate, endDate, notes)
- `adminUsers/{uid}` — email (solo para regla isAdmin())

## Contrato integración Unreal Engine
```
POST https://southamerica-east1-xplash-licencias-a7a58.cloudfunctions.net/validateLicense

Body requerido:
  { "licenseCode": "XPL-001", "metaUserId": "123456789", "moduleId": "derrame_combustible" }

Body opcional:
  { "appVersion": "1.0.0", "deviceModel": "Meta Quest 3", "osVersion": "Android 12 (API 32)", "platform": "quest3" }

OK:       { "allowed": true,  "validUntil": "2026-08-01T00:00:00Z", "offlineGraceHours": 48 }
Denegado: { "allowed": false, "reason": "Licencia bloqueada por Xplash" }
```

**`metaUserId`**: ID de cuenta Meta obtenido automáticamente en Unreal con el nodo `Get Logged In User ID` del OVR Platform SDK. No requiere configuración del cliente. Formato: alfanumérico, 4–128 chars.

## Roles del panel
- **admin**: acceso completo a todas las secciones
- **marketing**: solo lectura (sin acciones de crear/editar/bloquear)

En modo mock: `getMockRole()` busca el email en `mockAdminUsers` para determinar el rol.
En Etapa 2: se leerá vía `auth.currentUser.getIdTokenResult()` usando custom claims Firebase (`{ role: 'admin' | 'marketing' }`). Los claims ya están seteados en Firebase Auth para todos los usuarios.

## Funcionalidades clave del panel
- **Campanita 🔔**: notificaciones generadas desde datos mock, filtradas por rol. Admin ve además empresas suspendidas e invitaciones pendientes. Ephemeral (dismissed por sesión).
- **Renovar fácil**: extiende `expiresAt` de una licencia. Si ya venció → parte de hoy. Si sigue vigente → parte del `expiresAt` actual. Opciones: 1/3/6/12 meses con preview.
- **Auto-cálculo vencimiento**: al crear licencia, elegir plan + fecha de inicio auto-completa `expiresAt` (editable para excepciones). Al editar: `expiresAt` es solo lectura; para cambiar usar Renovar.
- **Dashboard por rol**: KPIs y tablas distintas según rol. Cards y filas clickeables con navegación.
- **Historial comercial**: colección `contracts` por empresa, visible en panel → Empresas → botón historial.

## Módulos disponibles (Etapa 1)
- `derrame_combustible` — Derrame de combustible
- `riesgo_electrico` — Riesgo eléctrico
- `recorrido_obra` — Recorrido de obra
- `trabajo_en_altura` — Trabajo en altura

## Cómo correr localmente

### Panel (mock, sin Firebase)
```bash
cd panel
npm run dev
# → http://localhost:5173
# Login: admin@xplash.com / xplash2026
```

### Panel + Firebase Emulators
```bash
firebase emulators:start
# en otra terminal:
cd panel && npm run dev
```

### Deploy
```bash
cd panel && npm run build
firebase deploy --only hosting
```

### Generar links de activación de usuarios
```bash
cd functions
node invite-users.js
# Crea cuentas en Firebase Auth, asigna custom claims de rol y genera links (expiran 24h)
```

## Usuarios del panel (Firebase Auth — ya creados)
- `davyt@gmail.com` — admin, activo
- `marta@martajara.com` — admin
- `mariaelena.ragazzi@gmail.com` — admin
- `apariciodebali@gmail.com` — admin
- `amalianavarrete@gmail.com` — admin
- `comercial@xplash.org` — marketing (cuenta demo)

## Estado del proyecto
- [x] Etapa 0: Scaffold completo (panel mock + functions codificadas)
- [x] Etapa 1: Firebase real en producción, endpoint operativo, panel publicado con todas las funcionalidades UX
- [ ] Etapa 2: Conectar panel a Firestore real (reemplazar mock data por SDK), ingresar datos operativos, activar roles reales
- [ ] Etapa 3: Subdominio licencias.xplash.org + CNAME + QA final + Firebase App Check

## Archivos que NUNCA se commitean ni deployean
- `functions/serviceAccountKey.json` — clave de servicio Firebase (CRÍTICO)
- `informe-estado-xplash.html` — informe de estado para reuniones con Xplash
- `integracion-unreal-metaquest.html` — nota técnica para el equipo Unreal
- `nota-tecnica-blueprint.html` — referencia técnica interna

## Notas de contexto
- Xplash ya tiene un Firebase existente en `experiencias.xplash.org` — este es un proyecto **separado**
- El repo es del desarrollador freelancer, no de Xplash
- Subdominio definitivo: `licencias.xplash.org` (CNAME a configurar al deployar)
- Etapa futura: Firebase App Check para verificar que el llamante sea un dispositivo Android real
- Etapa futura: integración Stripe para renovaciones automáticas (webhook → extender `expiresAt` en la misma licencia, nunca crear código nuevo)
