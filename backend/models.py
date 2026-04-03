import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Enum, ForeignKey, Text, JSON, DateTime,
)
from sqlalchemy.orm import relationship
from database import Base


# Emails that are always granted the admin role
ADMIN_EMAILS = {
    "thomasfernandoroan@gmail.com",
    "throdrigueza@unal.edu.co",
    "juanframirezg0821@gmail.com",
    "thomas_frodrigueza@soy.sena.edu.co",
}


class UserRole(str, enum.Enum):
    admin = "admin"
    cliente = "cliente"


class TipoVivienda(str, enum.Enum):
    piso = "piso"
    chalet = "chalet"
    villa = "villa"
    duplex = "duplex"
    local = "local"
    otro = "otro"


class PropertyStatus(str, enum.Enum):
    disponible = "disponible"
    reservado = "reservado"
    vendido = "vendido"


class TipoOperacion(str, enum.Enum):
    suma_fija = "suma_fija"
    porcentaje = "porcentaje"


class Favorite(Base):
    """Many-to-many join table: users ↔ properties (favorites)."""
    __tablename__ = "favorites"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    telefono = Column(String(30), nullable=True)
    facebook_link = Column(String(255), nullable=True)
    rol = Column(Enum(UserRole), default=UserRole.cliente, nullable=False)

    properties = relationship("Property", back_populates="owner")
    lead = relationship("Lead", back_populates="user", uselist=False)


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    precio = Column(Float, nullable=False)
    tamaño_m2 = Column(Float, nullable=True)
    direccion = Column(String(300), nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    # List of up to 10 Cloudinary image URLs; images[0] is the cover/default image.
    images = Column(JSON, nullable=True, default=list)
    tipo_vivienda = Column(
        Enum(TipoVivienda),
        default=TipoVivienda.piso,
        nullable=False,
    )
    estado = Column(
        Enum(PropertyStatus),
        default=PropertyStatus.disponible,
        nullable=False,
    )
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="properties")


class Lead(Base):
    """Contact data collected when a user shows interest in a property."""
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    telefono = Column(String(30), nullable=False)
    direccion = Column(String(300), nullable=False)
    como_nos_conocio = Column(String(100), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="lead")


class ValuationModifier(Base):
    """Admin-configurable modifiers used in the property valuation tool."""
    __tablename__ = "valuation_modifiers"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    valor_adicional = Column(Float, nullable=False)
    tipo_operacion = Column(
        Enum(TipoOperacion),
        default=TipoOperacion.suma_fija,
        nullable=False,
    )
