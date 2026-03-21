from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.core.email_service import send_invoice_reminder_email
from app.schemas import (
    FactureCreate, FactureUpdate, FactureResponse,
    PaiementCreate, PaiementResponse
)
from app.models import FactureModel, PaiementModel, ClientModel, BaseModel, serialize_doc, serialize_docs
from app.api.deps import (
    require_roles,
    ROLE_ADMIN,
    ROLE_SUPERVISEUR,
    ROLE_EMPLOYE,
)

router = APIRouter()


# ---------------- GET ALL INVOICES ----------------
@router.get("", response_model=List[FactureResponse])
async def get_invoices(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    invoices = await db[FactureModel.collection].find().to_list(1000)
    return serialize_docs(invoices)


# ---------------- GET ONE INVOICE ----------------
@router.get("/{invoice_id}", response_model=FactureResponse)
async def get_invoice(
    invoice_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    invoice = await db[FactureModel.collection].find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return serialize_doc(invoice)


# ---------------- GET PAYMENTS FOR INVOICE ----------------
@router.get("/{invoice_id}/payments", response_model=List[PaiementResponse])
async def get_invoice_payments(
    invoice_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    payments = await db[PaiementModel.collection].find({"factureId": invoice_id}).to_list(1000)
    return serialize_docs(payments)


# ---------------- CREATE INVOICE ----------------
@router.post("", response_model=FactureResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice: FactureCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    existing = await db[FactureModel.collection].find_one({"numeroFacture": invoice.numeroFacture})
    if existing:
        raise HTTPException(status_code=400, detail="Invoice number already exists")

    invoice_dict = invoice.model_dump()
    invoice_dict.update(BaseModel.get_base_fields())

    result = await db[FactureModel.collection].insert_one(invoice_dict)
    created_invoice = await db[FactureModel.collection].find_one({"_id": result.inserted_id})

    return serialize_doc(created_invoice)


# ---------------- UPDATE INVOICE ----------------
@router.put("/{invoice_id}", response_model=FactureResponse)
async def update_invoice(
    invoice_id: str,
    invoice: FactureUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    update_data = invoice.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "numeroFacture" in update_data:
        existing = await db[FactureModel.collection].find_one({
            "numeroFacture": update_data["numeroFacture"],
            "_id": {"$ne": ObjectId(invoice_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Invoice number already exists")

    result = await db[FactureModel.collection].update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")

    updated_invoice = await db[FactureModel.collection].find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated_invoice)


# ---------------- DELETE INVOICE ----------------
@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    result = await db[FactureModel.collection].delete_one({"_id": ObjectId(invoice_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return None


# ---------------- CREATE PAYMENT ----------------
@router.post("/payments", response_model=PaiementResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: PaiementCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(payment.factureId):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    invoice = await db[FactureModel.collection].find_one({"_id": ObjectId(payment.factureId)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment_dict = payment.model_dump()
    payment_dict.update(BaseModel.get_base_fields())

    result = await db[PaiementModel.collection].insert_one(payment_dict)
    created_payment = await db[PaiementModel.collection].find_one({"_id": result.inserted_id})

    return serialize_doc(created_payment)


# ---------------- GET ALL PAYMENTS ----------------
@router.get("/payments", response_model=List[PaiementResponse])
async def get_payments(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    payments = await db[PaiementModel.collection].find().to_list(1000)
    return serialize_docs(payments)


# ---------------- GET ONE PAYMENT ----------------
@router.get("/payments/{payment_id}", response_model=PaiementResponse)
async def get_payment(
    payment_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(payment_id):
        raise HTTPException(status_code=400, detail="Invalid payment ID")

    payment = await db[PaiementModel.collection].find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return serialize_doc(payment)


# ---------------- SEND PAYMENT REMINDER ----------------
@router.post("/{invoice_id}/send-reminder")
async def send_invoice_reminder(
    invoice_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    invoice = await db[FactureModel.collection].find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.get("statutPaiement") == "PAYEE":
        raise HTTPException(status_code=400, detail="Invoice is already paid")

    client_id = invoice.get("clientId")
    if not client_id or not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Invalid client linked to invoice")

    client = await db[ClientModel.collection].find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client_email = client.get("email")
    if not client_email:
        raise HTTPException(status_code=400, detail="Client email is missing")

    payments = await db[PaiementModel.collection].find({"factureId": invoice_id}).to_list(1000)
    total_paid = sum(float(p.get("montant", 0)) for p in payments)
    amount_due = max(float(invoice.get("montantTotal", 0)) - total_paid, 0.0)

    client_name = f"{client.get('prenom', '')} {client.get('nom', '')}".strip() or "Client"

    sent = await send_invoice_reminder_email(
        to_email=client_email,
        client_name=client_name,
        invoice_number=invoice.get("numeroFacture", invoice_id),
        amount_due=amount_due,
        due_status=invoice.get("statutPaiement", "EN_ATTENTE"),
    )

    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send reminder email")

    return {"message": "Reminder email sent successfully"}
