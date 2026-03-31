from typing import Optional, List
from pydantic import BaseModel, EmailStr
from models import UserRole, PropertyStatus, TipoTransaccion


# ── User schemas ─────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    facebook_link: Optional[str] = None
    rol: UserRole = UserRole.cliente


class UserCreate(UserBase):
    password: Optional[str] = None


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True


# ── Auth schemas ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Property schemas ──────────────────────────────────────────────────────────

class PropertyBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    precio: float
    tamaño_m2: Optional[float] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    # List of up to 10 Cloudinary image URLs; images[0] is the cover/default image.
    images: Optional[List[str]] = []
    tipo_transaccion: TipoTransaccion = TipoTransaccion.venta
    estado: PropertyStatus = PropertyStatus.disponible


class PropertyCreate(PropertyBase):
    owner_id: int


class PropertyUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    tamaño_m2: Optional[float] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    images: Optional[List[str]] = None
    tipo_transaccion: Optional[TipoTransaccion] = None
    estado: Optional[PropertyStatus] = None


class PropertyOut(PropertyBase):
    id: int
    owner_id: int
    owner: UserOut

    class Config:
        from_attributes = True


# ── Favorites schemas ─────────────────────────────────────────────────────────

class FavoriteStatus(BaseModel):
    favorited: bool


class FavoriteIds(BaseModel):
    favorite_ids: List[int]
