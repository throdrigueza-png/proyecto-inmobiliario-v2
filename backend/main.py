import os
import pathlib
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import cloudinary
import cloudinary.uploader
import models
import schemas
from database import engine, get_db
from models import ADMIN_EMAILS

logger = logging.getLogger(__name__)

# Create (or recreate) all tables on startup.
# Set RECREATE_TABLES=true to drop and recreate every table — use this ONCE
# when initialising a fresh database, then remove the variable to avoid
# accidental data loss on subsequent restarts.
if os.getenv("RECREATE_TABLES", "").lower() == "true":
    models.Base.metadata.drop_all(bind=engine)
models.Base.metadata.create_all(bind=engine)

# ── JWT config ────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    logger.warning(
        "JWT_SECRET_KEY is not set. Using an insecure default key — "
        "set this environment variable before deploying to production."
    )
    SECRET_KEY = "dev-only-insecure-default-key-change-before-production"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

app = FastAPI(
    title="Agencia Inmobiliaria API",
    description="API REST para la plataforma inmobiliaria.",
    version="2.0.0",
)

# ── CORS (only needed during local development; in production the frontend is
#    served by FastAPI itself from the same origin) ───────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _role_for_email(email: str) -> models.UserRole:
    """Return admin role if the email is in the whitelist, else cliente."""
    return models.UserRole.admin if email.lower() in ADMIN_EMAILS else models.UserRole.cliente


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """Decode the Bearer token and return the User, or None if unauthenticated."""
    if token is None:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None
    return db.query(models.User).filter(models.User.email == email).first()


def require_admin(current_user: Optional[models.User] = Depends(get_current_user)):
    """Dependency that raises 403 unless the token belongs to an admin."""
    if current_user is None or current_user.rol != models.UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Solo administradores pueden realizar esta acción.",
        )
    return current_user


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password and return a JWT."""
    user = db.query(models.User).filter(
        models.User.email == payload.email.lower()
    ).first()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Sync role in case the whitelist has changed
    expected_role = _role_for_email(user.email)
    if user.rol != expected_role:
        user.rol = expected_role
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.email})
    return schemas.TokenResponse(access_token=token, user=user)


@app.post("/auth/google", response_model=schemas.TokenResponse)
def google_login(payload: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    """Verify a Google ID token and return a JWT for this platform."""
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login no está configurado en este servidor.",
        )

    # Log a masked version of the configured client ID to help diagnose
    # mismatches between the frontend and backend GOOGLE_CLIENT_ID values.
    # Google Client IDs are public identifiers (embedded in frontend JS), not secrets.
    masked_id = GOOGLE_CLIENT_ID[:8] + "..." if len(GOOGLE_CLIENT_ID) > 8 else GOOGLE_CLIENT_ID
    print(f"[Google Auth] Using GOOGLE_CLIENT_ID starting with: {masked_id}", flush=True)

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        id_info = google_id_token.verify_oauth2_token(
            payload.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        email = id_info["email"].lower()
        nombre = id_info.get("name", email.split("@")[0])
    except Exception as exc:
        # Log exception type and message for debugging in Azure Log Stream.
        # Google's verification errors contain only technical details (e.g. audience mismatch,
        # expiry), never user-provided token content.
        print(f"[Google Auth] Token verification FAILED: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(status_code=401, detail="Token de Google inválido")

    # Get or create the user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            nombre=nombre,
            email=email,
            password_hash=None,
            rol=_role_for_email(email),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        expected_role = _role_for_email(email)
        if user.rol != expected_role:
            user.rol = expected_role
            db.commit()
            db.refresh(user)

    token = create_access_token({"sub": user.email})
    return schemas.TokenResponse(access_token=token, user=user)


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: Optional[models.User] = Depends(get_current_user)):
    """Return the current authenticated user, or 401."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    return current_user


# ── Properties ────────────────────────────────────────────────────────────────

@app.get("/properties", response_model=List[schemas.PropertyOut])
def list_properties(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Return all properties (public catalog)."""
    return (
        db.query(models.Property)
        .offset(skip)
        .limit(limit)
        .all()
    )


@app.get("/properties/{property_id}", response_model=schemas.PropertyOut)
def get_property(property_id: int, db: Session = Depends(get_db)):
    """Return a single property by ID."""
    prop = db.query(models.Property).filter(
        models.Property.id == property_id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    return prop


@app.post("/properties", response_model=schemas.PropertyOut, status_code=201)
def create_property(
    payload: schemas.PropertyCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    """Create a new property listing (admin only)."""
    owner = db.query(models.User).filter(
        models.User.id == payload.owner_id
    ).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Usuario propietario no encontrado")
    prop = models.Property(**payload.model_dump())
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@app.put("/properties/{property_id}", response_model=schemas.PropertyOut)
def update_property(
    property_id: int,
    payload: schemas.PropertyUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    """Update a property (admin only)."""
    prop = db.query(models.Property).filter(
        models.Property.id == property_id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(prop, field, value)
    db.commit()
    db.refresh(prop)
    return prop


@app.delete("/properties/{property_id}", status_code=204)
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    """Delete a property listing (admin only)."""
    prop = db.query(models.Property).filter(
        models.Property.id == property_id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    db.delete(prop)
    db.commit()


# ── Image upload ──────────────────────────────────────────────────────────────

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _configure_cloudinary():
    """Configure the Cloudinary SDK from environment variables, raising 503 if not set."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not all([cloud_name, api_key, api_secret]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de almacenamiento de imágenes no está configurado en el servidor.",
        )
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    _admin: models.User = Depends(require_admin),
):
    """Upload a single image to Cloudinary and return its secure URL (admin only)."""
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, GIF).",
        )

    _configure_cloudinary()

    contents = await file.read()
    try:
        result = cloudinary.uploader.upload(
            contents,
            folder="inmobiliaria",
            resource_type="image",
        )
    except Exception as exc:
        logger.error("Cloudinary upload failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="No se pudo subir la imagen al servicio de almacenamiento. Inténtalo de nuevo.",
        )
    return {"url": result["secure_url"]}


@app.post("/upload/multiple")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    _admin: models.User = Depends(require_admin),
):
    """Upload up to 10 images to Cloudinary and return their secure URLs (admin only)."""
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="Máximo 10 imágenes por propiedad.",
        )
    for f in files:
        if f.content_type not in _ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de archivo no permitido: {f.filename}. Solo JPEG, PNG, WebP y GIF.",
            )

    _configure_cloudinary()

    urls: List[str] = []
    uploaded_public_ids: List[str] = []
    for f in files:
        contents = await f.read()
        try:
            result = cloudinary.uploader.upload(
                contents,
                folder="inmobiliaria",
                resource_type="image",
            )
            urls.append(result["secure_url"])
            uploaded_public_ids.append(result["public_id"])
        except Exception as exc:
            logger.error("Cloudinary upload failed for %s: %s", f.filename, exc)
            # Roll back already-uploaded images to avoid orphaned resources
            for pid in uploaded_public_ids:
                try:
                    cloudinary.uploader.destroy(pid)
                except Exception as cleanup_exc:
                    logger.warning("Cloudinary cleanup failed for %s: %s", pid, cleanup_exc)
            raise HTTPException(
                status_code=502,
                detail=f"No se pudo subir '{f.filename}'. Inténtalo de nuevo.",
            )
    return {"urls": urls}


# ── Favorites ─────────────────────────────────────────────────────────────────

@app.post("/favorites/{property_id}", response_model=schemas.FavoriteStatus)
def toggle_favorite(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user),
):
    """Toggle a property favorite for the current authenticated user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Debes iniciar sesión para agregar favoritos.",
        )
    prop = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada.")

    existing = (
        db.query(models.Favorite)
        .filter(
            models.Favorite.user_id == current_user.id,
            models.Favorite.property_id == property_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"favorited": False}
    else:
        db.add(models.Favorite(user_id=current_user.id, property_id=property_id))
        db.commit()
        return {"favorited": True}


@app.get("/favorites", response_model=schemas.FavoriteIds)
def get_user_favorites(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user),
):
    """Return the list of property IDs favorited by the current user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Debes iniciar sesión.",
        )
    fav_ids = [
        row.property_id
        for row in db.query(models.Favorite.property_id)
        .filter(models.Favorite.user_id == current_user.id)
        .all()
    ]
    return {"favorite_ids": fav_ids}


# ── Users ─────────────────────────────────────────────────────────────────────

@app.get("/users", response_model=List[schemas.UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    return db.query(models.User).offset(skip).limit(limit).all()


@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@app.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(
        models.User.email == payload.email.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    # Determine role from the admin email whitelist
    role = _role_for_email(payload.email)

    user_data = payload.model_dump(exclude={"password", "rol"})
    user_data["email"] = user_data["email"].lower()
    user_data["rol"] = role

    if payload.password:
        user_data["password_hash"] = pwd_context.hash(payload.password)
    else:
        user_data["password_hash"] = None

    user = models.User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Serve React SPA (monolithic deployment) ───────────────────────────────────
# The React build output is placed in backend/static (via vite.config.js).
# In production, FastAPI serves all frontend assets directly.
# All routes not matched by the API above fall through to index.html so that
# React Router can handle client-side navigation.

_FRONTEND_DIST = pathlib.Path(__file__).parent / "static"

# Mount the /assets sub-directory for fast static-file delivery with proper
# content-type headers and browser caching.  This must be registered AFTER all
# API routes so those routes are matched first.
if (_FRONTEND_DIST / "assets").is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=str(_FRONTEND_DIST / "assets")),
        name="frontend-assets",
    )


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    """Serve static frontend files or fall back to index.html for SPA routing."""
    # Serve an exact file if it exists (e.g. favicon.ico, vite.svg, …)
    candidate = _FRONTEND_DIST / full_path
    if candidate.is_file():
        return FileResponse(str(candidate))
    # Fall back to index.html so React Router handles the route client-side
    index = _FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(str(index))
    raise HTTPException(
        status_code=404,
        detail="Frontend not found. Run `npm run build` inside the frontend directory.",
    )
