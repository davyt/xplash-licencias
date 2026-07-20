# Xplash — Sistema de Licencias VR

## Qué es este proyecto
Sistema propio de licencias para Xplash. Permite activar, bloquear y controlar el acceso a experiencias de entrenamiento VR distribuidas en Meta Quest a empresas B2B con contratos de tiempo limitado.

**Problema que resuelve:** Meta no permite revocar acceso a apps ya instaladas. Este sistema implementa una validación propia en el arranque de la app VR.

## Stack
- **Panel web:** React + Vite + Ant Design (en `/panel`)
- **Backend:** Firebase Cloud Functions Node.js (en `/functions`)
- **DB:** Firestore · **Auth:** Firebase Authentication · **Hosting:** Firebase Hosting
- **Repo:** GitHub `davyt/xplash-licencias`
- **Firebase project:** `xplash-licencias`

## Estructura del repo
```
/panel       React + Vite app
  /src
    /layouts   AppLayout (sidebar + header)
    /pages     Dashboard, Companies, Licenses, Devices, Events, LoginPage
    /mock      Datos demo para desarrollo sin Firebase
    firebase.js
    App.jsx
/functions   Cloud Functions
  /src
    index.js
    validateLicense.js   <- función principal, endpoint para los visores Quest
    registerInstallation.js
    admin.js
firestore.rules
firestore.indexes.json
firebase.json
.firebaserc
```

## Modelo de datos Firestore
- `companies/{id}` — name, email, status (active|paused), notes, createdAt
- `licenses/{id}` — licenseCode, companyId, status (active|blocked|paused|draft|expired), plan, maxDevices, offlineGraceHours, startDate, expiresAt, enabledModules[], notes
- `installations/{licenseId_installId}` — installId, licenseId, companyId, appVersion, firstSeenAt, lastSeenAt
- `events/{id}` — licenseCode, licenseId, companyId, installId, moduleId, appVersion, allowed, reason, createdAt
- `adminUsers/{uid}` — email (solo para regla isAdmin())

## Contrato integración Unreal Engine
```
POST https://southamerica-east1-xplash-licencias-a7a58.cloudfunctions.net/validateLicense

Body:     { "licenseCode": "XPL-001", "installId": "quest-01", "moduleId": "derrame_combustible", "appVersion": "1.0.0" }
OK:       { "allowed": true,  "validUntil": "2026-08-01T00:00:00Z", "offlineGraceHours": 48 }
Denegado: { "allowed": false, "reason": "Licencia bloqueada por Xplash" }
```

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
# Instalar Firebase CLI si no está: npm install -g firebase-tools
# Terminal 1:
firebase emulators:start
# Terminal 2:
cd panel && npm run dev
```

### Deploy (cuando Firebase Blaze esté activo)
```bash
cd panel && npm run build
firebase deploy
```

## Estado del proyecto
- [x] Etapa 0: Scaffold completo (panel mock + functions codificadas)
- [ ] Etapa 1: Conectar Firebase real (esperando resolución cuenta Blaze de Xplash)
- [ ] Etapa 2: Panel completo funcional (Firestore real, onSnapshot)
- [ ] Etapa 3: Deploy + subdominio licencias.xplash.org + entrega

## Notas de contexto
- Xplash ya tiene un Firebase existente en `experiencias.xplash.org` — este es un proyecto **separado**
- El repo es del desarrollador freelancer, no de Xplash
- Subdominio definitivo: `licencias.xplash.org` (CNAME a configurar al deployar)
- Etapa 2 futura: verificación S2S con Meta (Nonce + org_scoped_id)
- Etapa futura: integración WooCommerce para renovaciones automáticas
