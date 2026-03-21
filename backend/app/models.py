from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    
    doc_copy = doc.copy()
    if "_id" in doc_copy:
        doc_copy["id"] = str(doc_copy.pop("_id"))
    
    # Convert datetime to ISO string
    for key, value in doc_copy.items():
        if isinstance(value, datetime):
            doc_copy[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            doc_copy[key] = str(value)
    
    return doc_copy


def serialize_docs(docs: list) -> list:
    """Convert list of MongoDB documents to JSON-serializable list."""
    return [serialize_doc(doc) for doc in docs]


class BaseModel:
    """Base model with common fields."""
    
    @staticmethod
    def get_base_fields() -> dict:
        return {
            "dateCreation": datetime.utcnow()
        }


class UserModel(BaseModel):
    collection = "users"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for users collection."""
        db[UserModel.collection].create_index("email", unique=True)


class ClientModel(BaseModel):
    collection = "clients"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for clients collection."""
        db[ClientModel.collection].create_index("email")
        db[ClientModel.collection].create_index("type")


class ProspectModel(BaseModel):
    collection = "prospects"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for prospects collection."""
        db[ProspectModel.collection].create_index("email")
        db[ProspectModel.collection].create_index("statut")


class CategorieModel(BaseModel):
    collection = "categories"


class ProduitModel(BaseModel):
    collection = "produits"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for produits collection."""
        db[ProduitModel.collection].create_index("categorieId")
        db[ProduitModel.collection].create_index("disponible")


class CommandeModel(BaseModel):
    collection = "commandes"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for commandes collection."""
        db[CommandeModel.collection].create_index("clientId")
        db[CommandeModel.collection].create_index("userId")
        db[CommandeModel.collection].create_index("statut")
        db[CommandeModel.collection].create_index("dateCommande")


class LigneCommandeModel(BaseModel):
    collection = "lignes_commande"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for lignes_commande collection."""
        db[LigneCommandeModel.collection].create_index("commandeId")
        db[LigneCommandeModel.collection].create_index("produitId")


class FactureModel(BaseModel):
    collection = "factures"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for factures collection."""
        db[FactureModel.collection].create_index("numeroFacture", unique=True)
        db[FactureModel.collection].create_index("commandeId")
        db[FactureModel.collection].create_index("clientId")
        db[FactureModel.collection].create_index("statutPaiement")


class PaiementModel(BaseModel):
    collection = "paiements"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for paiements collection."""
        db[PaiementModel.collection].create_index("factureId")
        db[PaiementModel.collection].create_index("reference")


class InteractionModel(BaseModel):
    collection = "interactions"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for interactions collection."""
        db[InteractionModel.collection].create_index("userId")
        db[InteractionModel.collection].create_index("clientId")
        db[InteractionModel.collection].create_index("prospecId")
        db[InteractionModel.collection].create_index("date")


class RapportModel(BaseModel):
    collection = "rapports"
    
    @staticmethod
    def create_indexes(db):
        """Create indexes for rapports collection."""
        db[RapportModel.collection].create_index("userId")
        db[RapportModel.collection].create_index("type")
        db[RapportModel.collection].create_index("dateGeneration")


async def create_all_indexes(db):
    """Create all indexes for the application."""
    UserModel.create_indexes(db)
    ClientModel.create_indexes(db)
    ProspectModel.create_indexes(db)
    ProduitModel.create_indexes(db)
    CommandeModel.create_indexes(db)
    LigneCommandeModel.create_indexes(db)
    FactureModel.create_indexes(db)
    PaiementModel.create_indexes(db)
    InteractionModel.create_indexes(db)
    RapportModel.create_indexes(db)
    print("All indexes created successfully")