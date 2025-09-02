# Agro Mas - Marketplace Agropecuario

## 🌾 Descripción

Agro Mas es una plataforma digital que conecta productores agrícolas con compradores, facilitando el comercio de productos agropecuarios en Argentina.

## 🏗️ Arquitectura

- **Frontend**: Angular 17+ desplegado en Firebase Hosting
- **Backend**: Go (Gin) desplegado en Google Cloud Run
- **Base de Datos**: PostgreSQL en Google Cloud SQL
- **Storage**: Google Cloud Storage
- **Secrets**: Google Secret Manager

## 🚀 Deploy Automatizado

### Requisitos Previos

1. **Google Cloud CLI** configurado y autenticado
2. **Firebase CLI** instalado y autenticado
3. **Docker** instalado
4. **Node.js 18+** y **npm**
5. **Go 1.21+**
6. **jq** para procesamiento JSON

### Configuración Inicial

1. **Clonar el repositorio:**
   ```bash
   git clone <repository-url>
   cd agro-mas
   ```

2. **Verificar configuración:**
   ```bash
   # Editar deploy.config.json con tus valores específicos
   nano deploy.config.json
   ```

3. **Hacer scripts ejecutables:**
   ```bash
   chmod +x scripts/*.sh
   ```

### Deploy Manual

#### Deploy Completo (Recomendado)
```bash
# Deploy a desarrollo (por defecto)
./scripts/deploy-full.sh develop

# Deploy a producción
./scripts/deploy-full.sh production
```

#### Deploy por Componentes
```bash
# 1. Infraestructura (Cloud SQL, Secrets, Storage)
./scripts/deploy-infrastructure.sh [develop|production]

# 2. Backend (Go + migraciones)
./scripts/deploy-backend.sh [develop|production]

# 3. Frontend (Angular + Firebase)
./scripts/deploy-frontend.sh [develop|production]
```

### Deploy Automático con GitHub Actions

#### Configuración CI/CD

1. **Crear Service Account en Google Cloud:**
   ```bash
   gcloud iam service-accounts create agro-mas-cicd --display-name="Agro Mas CI/CD"
   
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:agro-mas-cicd@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:agro-mas-cicd@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/cloudsql.admin"
   
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:agro-mas-cicd@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/secretmanager.admin"
   
   gcloud iam service-accounts keys create key.json \
     --iam-account=agro-mas-cicd@PROJECT_ID.iam.gserviceaccount.com
   ```

2. **Configurar GitHub Secrets:**
   - `GCP_SA_KEY`: Contenido del archivo `key.json`
   - `FIREBASE_TOKEN`: Token de Firebase (`firebase login:ci`)
   - `FIREBASE_SERVICE_ACCOUNT`: JSON del service account de Firebase

3. **Configurar ramas para deploy automático:**
   ```bash
   # Push a develop para deploy automático a desarrollo
   git checkout develop
   git add .
   git commit -m "Setup automated deployment"
   git push origin develop
   
   # Push a main para deploy automático a producción
   git checkout main
   git add .
   git commit -m "Setup automated deployment"
   git push origin main
   ```

## 📁 Estructura del Proyecto

```
agro-mas/
├── agro-mas-backend/          # API Go con Gin
│   ├── cmd/api/               # Aplicación principal
│   ├── internal/              # Lógica de negocio
│   ├── pkg/                   # Paquetes compartidos
│   ├── migrations/            # Migraciones de BD
│   └── Dockerfile             # Imagen Docker
├── agro-mas-frontend/         # Frontend Angular
│   ├── src/                   # Código fuente
│   ├── src/environments/      # Configuraciones
│   └── firebase.json          # Config Firebase
├── scripts/                   # Scripts de deploy
│   ├── deploy-full.sh         # Deploy completo
│   ├── deploy-infrastructure.sh
│   ├── deploy-backend.sh
│   └── deploy-frontend.sh
├── .github/workflows/         # GitHub Actions
│   └── deploy.yml             # Pipeline CI/CD
├── deploy.config.json         # Configuración central
└── README.md                  # Esta documentación
```

## 🔧 Configuración

### deploy.config.json

Archivo central de configuración para todos los scripts con soporte multi-ambiente:

```json
{
  "environments": {
    "develop": {
      "project": {
        "id": "agro-mas-develop",
        "region": "us-central1"
      },
      "backend": {
        "name": "agro-mas-backend-dev",
        "memory": "256Mi",
        "cpu": "0.5",
        "maxInstances": 2
      },
      "database": {
        "instance": "agro-mas-db-dev",
        "tier": "db-f1-micro",
        "diskSize": "10GB"
      },
      "frontend": {
        "projectId": "agro-mas-frontend-dev"
      }
    },
    "production": {
      "project": {
        "id": "agro-mas-production",
        "region": "us-central1"
      },
      "backend": {
        "name": "agro-mas-backend",
        "memory": "512Mi",
        "cpu": "1",
        "maxInstances": 10
      },
      "database": {
        "instance": "agro-mas-db-prod",
        "tier": "db-n1-standard-1",
        "diskSize": "50GB"
      },
      "frontend": {
        "projectId": "agro-mas-frontend-prod"
      }
    }
  }
}
```

## 🏥 Monitoreo y Health Checks

### URLs de Verificación

#### Desarrollo
- **Frontend**: `https://agro-mas-frontend-dev.web.app`
- **Backend Health**: `https://agro-mas-backend-dev-[project-id].us-central1.run.app/health`
- **API**: `https://agro-mas-backend-dev-[project-id].us-central1.run.app/api/v1`

#### Producción
- **Frontend**: `https://agro-mas-frontend-prod.web.app`
- **Backend Health**: `https://agro-mas-backend-[project-id].us-central1.run.app/health`
- **API**: `https://agro-mas-backend-[project-id].us-central1.run.app/api/v1`

### Logs

```bash
# Backend logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=agro-mas-backend" --limit=50

# Frontend logs (Firebase)
firebase functions:log
```

## 🔄 Actualizaciones

### Backend
```bash
# Backend desarrollo
./scripts/deploy-backend.sh develop

# Backend producción
./scripts/deploy-backend.sh production
```

### Frontend
```bash
# Frontend desarrollo
./scripts/deploy-frontend.sh develop

# Frontend producción
./scripts/deploy-frontend.sh production
```

### Base de Datos
Las migraciones se ejecutan automáticamente durante el deploy del backend.

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error de autenticación:**
   ```bash
   gcloud auth login
   firebase login
   ```

2. **Permisos insuficientes:**
   ```bash
   # Verificar permisos del service account
   gcloud projects get-iam-policy PROJECT_ID
   ```

3. **CORS errors:**
   - Verificar que el frontend URL esté en la configuración CORS del backend
   - Revisar `pkg/middleware/common.go`

4. **Migraciones fallidas:**
   ```bash
   # Verificar estado de migraciones
   gcloud sql instances describe agro-mas-db-prod
   ```

## 📈 Escalabilidad

El sistema está configurado para auto-escalar:

- **Cloud Run**: 0-5 instancias automáticas
- **Cloud SQL**: Backups automáticos
- **Firebase**: CDN global automático

## 🔒 Seguridad

- Secrets gestionados por Google Secret Manager
- HTTPS enforced en todos los endpoints
- CORS configurado restrictivamente
- Row Level Security en PostgreSQL

## 📞 Soporte

Para problemas de deployment, revisar:
1. Los logs de GitHub Actions
2. Los logs de Cloud Run
3. Los logs de Firebase

---

**Desarrollado con ❤️ para el sector agropecuario argentino**