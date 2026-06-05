from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class StatutCommande(str, Enum):
    BROUILLON = "BROUILLON"
    CONFIRMEE = "CONFIRMEE"
    LIVREE = "LIVREE"
    ANNULEE = "ANNULEE"


class StatutPaiement(str, Enum):
    EN_ATTENTE = "EN_ATTENTE"
    PAYEE = "PAYEE"
    PARTIELLE = "PARTIELLE"


class MethodePaiement(str, Enum):
    CARTE = "CARTE"
    VIREMENT = "VIREMENT"
    ESPECES = "ESPECES"


class ProspectStatut(str, Enum):
    NOUVEAU = "NOUVEAU"
    CONTACTE = "CONTACTE"
    QUALIFIE = "QUALIFIE"
    PERDU = "PERDU"


class InteractionType(str, Enum):
    APPEL = "APPEL"
    EMAIL = "EMAIL"
    REUNION = "REUNION"


class ClientType(str, Enum):
    PARTICULIER = "PARTICULIER"
    ENTREPRISE = "ENTREPRISE"


class TypeRapport(str, Enum):
    VENTES = "VENTES"
    CLIENTS = "CLIENTS"
    PERFORMANCE = "PERFORMANCE"


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    SUPERVISEUR = "SUPERVISEUR"
    EMPLOYE = "EMPLOYE"


# Base Schema
class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise TypeError('string required')
        return v


# User Schemas
class UserBase(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    actif: bool = True
    role: UserRole


class UserCreate(UserBase):
    password: Optional[str] = None


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[EmailStr] = None
    actif: Optional[bool] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None


class UserInDB(UserBase):
    id: str = Field(alias="_id")
    passwordHash: str
    dateCreation: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class UserResponse(UserBase):
    id: str
    dateCreation: str
    is_primary_supervisor: bool = False

    class Config:
        from_attributes = True


# Contact Base
class ContactBase(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    telephone: str
    entreprise: str = ""


# Client Schemas
class ClientBase(ContactBase):
    adresse: str
    type: ClientType


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    entreprise: Optional[str] = None
    adresse: Optional[str] = None
    type: Optional[ClientType] = None


class ClientResponse(ClientBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Prospect Schemas
class ProspectBase(ContactBase):
    statut: ProspectStatut


class ProspectCreate(ProspectBase):
    pass


class ProspectUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    entreprise: Optional[str] = None
    statut: Optional[ProspectStatut] = None


class ProspectResponse(ProspectBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Category Schemas
class CategorieBase(BaseModel):
    nom: str
    description: str


class CategorieCreate(CategorieBase):
    pass


class CategorieUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None


class CategorieResponse(CategorieBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Product Schemas
class ProduitBase(BaseModel):
    nom: str
    description: str
    prix: float
    stock: int
    disponible: bool = True
    categorieId: str


class ProduitCreate(ProduitBase):
    pass


class ProduitUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    prix: Optional[float] = None
    stock: Optional[int] = None
    disponible: Optional[bool] = None
    categorieId: Optional[str] = None


class ProduitResponse(ProduitBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Order Line Schema
class LigneCommandeBase(BaseModel):
    quantite: int
    prixUnitaire: float
    sousTotal: float
    produitId: str


class LigneCommandeCreate(LigneCommandeBase):
    pass


class LigneCommandeResponse(LigneCommandeBase):
    id: str
    commandeId: str
    dateCreation: str

    class Config:
        from_attributes = True


# Order Schemas
class CommandeBase(BaseModel):
    dateCommande: str
    statut: StatutCommande
    montantTotal: float
    notes: str = ""
    clientId: str
    userId: str


class CommandeCreate(BaseModel):
    dateCommande: str
    statut: StatutCommande
    notes: str = ""
    clientId: str
    userId: str
    lignes: List[LigneCommandeCreate]


class CommandeUpdate(BaseModel):
    dateCommande: Optional[str] = None
    statut: Optional[StatutCommande] = None
    montantTotal: Optional[float] = None
    notes: Optional[str] = None


class CommandeResponse(CommandeBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Invoice Schemas
class FactureBase(BaseModel):
    numeroFacture: str
    dateEmission: str
    montantTotal: float
    statutPaiement: StatutPaiement
    datePaiement: Optional[str] = None
    commandeId: str
    clientId: str


class FactureCreate(FactureBase):
    pass


class FactureUpdate(BaseModel):
    numeroFacture: Optional[str] = None
    dateEmission: Optional[str] = None
    montantTotal: Optional[float] = None
    statutPaiement: Optional[StatutPaiement] = None
    datePaiement: Optional[str] = None


class FactureResponse(FactureBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Payment Schemas
class PaiementBase(BaseModel):
    montant: float
    methode: MethodePaiement
    datePaiement: str
    reference: str
    factureId: str


class PaiementCreate(PaiementBase):
    pass


class PaiementResponse(PaiementBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Interaction Schemas
class InteractionBase(BaseModel):
    type: InteractionType
    description: str
    date: str
    userId: str
    clientId: Optional[str] = None
    prospecId: Optional[str] = None


class InteractionCreate(InteractionBase):
    pass


class InteractionUpdate(BaseModel):
    type: Optional[InteractionType] = None
    description: Optional[str] = None
    date: Optional[str] = None


class InteractionResponse(InteractionBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Report Schemas
class RapportPeriode(BaseModel):
    dateDebut: str
    dateFin: str


class RapportBase(BaseModel):
    type: TypeRapport
    dateGeneration: str
    periode: RapportPeriode
    userId: str


class RapportCreate(RapportBase):
    pass


class RapportResponse(RapportBase):
    id: str
    dateCreation: str

    class Config:
        from_attributes = True


# Dashboard KPIs
class KPIs(BaseModel):
    totalVentes: int
    totalClients: int
    totalProspects: int
    totalCommandes: int
    commandesEnCours: int
    revenuMois: float
    revenuAnnee: float
    panierMoyen: float


class VenteMensuelle(BaseModel):
    mois: str
    montant: float
    nombre: int


class ProduitPopulaire(BaseModel):
    produit: ProduitResponse
    quantiteVendue: int
    revenu: float


class PerformanceEmploye(BaseModel):
    employe: UserResponse
    nombreVentes: int
    montantTotal: float
    nombreClients: int
