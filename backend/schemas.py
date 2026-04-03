from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from models import UserRole, PropertyStatus, TipoVivienda, TipoOperacion


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
    tipo_vivienda: TipoVivienda = TipoVivienda.piso
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
    tipo_vivienda: Optional[TipoVivienda] = None
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


# ── Lead schemas ──────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    telefono: str
    direccion: str
    como_nos_conocio: str


class LeadOut(BaseModel):
    id: int
    user_id: int
    telefono: str
    direccion: str
    como_nos_conocio: str
    created_at: datetime
    user: UserOut

    class Config:
        from_attributes = True


class LeadStatus(BaseModel):
    has_lead: bool


# ── ValuationModifier schemas ─────────────────────────────────────────────────

class ValuationModifierBase(BaseModel):
    nombre: str
    valor_adicional: float
    tipo_operacion: TipoOperacion = TipoOperacion.suma_fija


class ValuationModifierCreate(ValuationModifierBase):
    pass


class ValuationModifierUpdate(BaseModel):
    nombre: Optional[str] = None
    valor_adicional: Optional[float] = None
    tipo_operacion: Optional[TipoOperacion] = None


class ValuationModifierOut(ValuationModifierBase):
    id: int

    class Config:
        from_attributes = True
