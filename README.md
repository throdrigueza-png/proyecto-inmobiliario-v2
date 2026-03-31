# Inmobiliaria Mónica Anzola

Plataforma inmobiliaria SaaS para la asesora Mónica Anzola. Permite publicar, explorar y contactar propiedades (casas, apartamentos, locales) en venta y arriendo.

## Tecnologías

- **Frontend:** React + Vite + Tailwind CSS v4 + React Leaflet
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL (Azure)
- **Auth:** JWT + Google OAuth (Firebase / Google Identity)

## Roles y acceso

| Rol    | Correos                                                                 |
|--------|-------------------------------------------------------------------------|
| Admin  | `thomasfernandoroan@gmail.com`, `serviasi@hotmail.com`, `thomas_frodrigueza@soy.sena.edu.co`, `throdrigueza@unal.edu.co` |
| Cliente | Cualquier otro correo registrado                                        |

Solo los administradores pueden crear, editar y eliminar propiedades.

## Variables de entorno

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_bd
JWT_SECRET_KEY=tu-clave-secreta-larga
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
```

En producción (Azure App Service `api-inmo-sena-thomas`) estas variables se configuran en
**Configuration → Application settings** del portal de Azure.

### Frontend (`frontend/.env`)
```
VITE_API_URL=https://api-inmo-sena-thomas.azurewebsites.net
VITE_GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
VITE_MONICA_PHONE=573001234567       # número WhatsApp (código país sin +)
VITE_FACEBOOK_URL=https://www.facebook.com/tu-pagina
VITE_INSTAGRAM_URL=https://www.instagram.com/tu-perfil
```

> **Importante – variables de build de Vite en producción**
>
> El frontend es una aplicación React/Vite. Las variables `VITE_*` se incrustan en el
> bundle estático durante la compilación y **no** se leen en tiempo de ejecución.
> Por eso **no** es suficiente definirlas en el portal de Azure Static Web Apps;
> deben existir como **GitHub Repository Secrets** para que el workflow de
> GitHub Actions las inyecte en el paso de build.
>
> ### Pasos para configurar los secrets en GitHub
>
> 1. Ve al repositorio en GitHub → **Settings → Secrets and variables → Actions**.
> 2. Haz clic en **New repository secret** y crea cada una de las siguientes variables
>    con su valor real (sin comillas):
>
>    | Secret name            | Valor de ejemplo                                       |
>    |------------------------|--------------------------------------------------------|
>    | `VITE_API_URL`         | `https://api-inmo-sena-thomas.azurewebsites.net`       |
>    | `VITE_GOOGLE_CLIENT_ID`| `208393082876-xxxx.apps.googleusercontent.com`         |
>    | `VITE_MONICA_PHONE`    | `573001234567`                                         |
>    | `VITE_FACEBOOK_URL`    | `https://www.facebook.com/tu-pagina`                   |
>    | `VITE_INSTAGRAM_URL`   | `https://www.instagram.com/tu-perfil`                  |
>
> 3. El workflow `.github/workflows/azure-static-web-apps-nice-desert-0564dc70f.yml`
>    ya está configurado para leer estos secrets y pasarlos al build de Vite.
> 4. Realiza un nuevo push a `main` (o re-ejecuta el workflow manualmente) para que
>    el frontend se recompile con los valores correctos.

## Despliegue

- **Frontend:** Azure Static Web Apps (`https://nice-desert-0564dc70f.1.azurestaticapps.net`)
- **Backend:** Azure App Service (`https://api-inmo-sena-thomas.azurewebsites.net`)

## Desarrollo local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

