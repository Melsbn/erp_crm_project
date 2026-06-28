import asyncio
from datetime import datetime, timedelta

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.email_service import send_invoice_reminder_email
from app.models import ClientModel, FactureModel, PaiementModel


REMINDER_AFTER_DAYS = 3
REMINDER_CHECK_INTERVAL_SECONDS = 24 * 60 * 60
UNPAID_STATUSES = ["EN_ATTENTE", "PARTIELLE"]


async def send_automatic_invoice_reminders(db: AsyncIOMotorDatabase) -> int:
    """Send one automatic reminder for unpaid invoices older than the threshold."""
    cutoff = datetime.utcnow() - timedelta(days=REMINDER_AFTER_DAYS)
    cursor = db[FactureModel.collection].find(
        {
            "statutPaiement": {"$in": UNPAID_STATUSES},
            "dateCreation": {"$lte": cutoff},
            "autoReminderSentAt": {"$exists": False},
            "autoReminderClaimedAt": {"$exists": False},
        }
    )

    sent_count = 0
    async for invoice in cursor:
        try:
            sent = await _send_automatic_reminder_for_invoice(db, invoice)
        except Exception as exc:
            print(
                "Automatic invoice reminder failed for "
                f"{invoice.get('numeroFacture', invoice.get('_id'))}: {exc}"
            )
            continue

        if sent:
            sent_count += 1

    if sent_count:
        print(f"Sent {sent_count} automatic invoice reminder(s)")

    return sent_count


async def automatic_invoice_reminder_loop(db: AsyncIOMotorDatabase) -> None:
    while True:
        try:
            await send_automatic_invoice_reminders(db)
        except Exception as exc:
            print(f"Automatic invoice reminder check failed: {exc}")
        await asyncio.sleep(REMINDER_CHECK_INTERVAL_SECONDS)


async def _send_automatic_reminder_for_invoice(
    db: AsyncIOMotorDatabase,
    invoice: dict,
) -> bool:
    claimed = await db[FactureModel.collection].update_one(
        {
            "_id": invoice["_id"],
            "autoReminderSentAt": {"$exists": False},
            "autoReminderClaimedAt": {"$exists": False},
        },
        {"$set": {"autoReminderClaimedAt": datetime.utcnow()}},
    )
    if claimed.modified_count != 1:
        return False

    invoice_id = str(invoice["_id"])
    client_id = invoice.get("clientId")
    if not client_id or not ObjectId.is_valid(client_id):
        await _release_automatic_reminder_claim(db, invoice)
        return False

    client = await db[ClientModel.collection].find_one({"_id": ObjectId(client_id)})
    if not client or not client.get("email"):
        await _release_automatic_reminder_claim(db, invoice)
        return False

    payments = await db[PaiementModel.collection].find({"factureId": invoice_id}).to_list(1000)
    total_paid = sum(float(payment.get("montant", 0)) for payment in payments)
    amount_due = max(float(invoice.get("montantTotal", 0)) - total_paid, 0.0)

    if amount_due <= 0:
        await _release_automatic_reminder_claim(db, invoice)
        return False

    client_name = f"{client.get('prenom', '')} {client.get('nom', '')}".strip() or "Client"
    sent = await send_invoice_reminder_email(
        to_email=client["email"],
        client_name=client_name,
        invoice_number=invoice.get("numeroFacture", invoice_id),
        amount_due=amount_due,
        due_status=invoice.get("statutPaiement", "EN_ATTENTE"),
    )

    if not sent:
        await _release_automatic_reminder_claim(db, invoice)
        return False

    result = await db[FactureModel.collection].update_one(
        {
            "_id": invoice["_id"],
            "autoReminderSentAt": {"$exists": False},
        },
        {
            "$set": {"autoReminderSentAt": datetime.utcnow()},
            "$unset": {"autoReminderClaimedAt": ""},
        },
    )
    return result.modified_count == 1


async def _release_automatic_reminder_claim(
    db: AsyncIOMotorDatabase,
    invoice: dict,
) -> None:
    await db[FactureModel.collection].update_one(
        {
            "_id": invoice["_id"],
            "autoReminderSentAt": {"$exists": False},
        },
        {"$unset": {"autoReminderClaimedAt": ""}},
    )
