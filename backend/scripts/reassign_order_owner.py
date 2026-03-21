import argparse
import asyncio
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.database import connect_to_mongo, close_mongo_connection, db  # noqa: E402
from app.models import CommandeModel, UserModel  # noqa: E402


async def resolve_user_id(user_id: str | None, email: str | None) -> str | None:
    if user_id:
        return user_id
    if not email:
        return None

    user = await db.db[UserModel.collection].find_one({"email": email}, {"_id": 1, "email": 1})
    if not user:
        raise ValueError(f"User not found for email: {email}")
    return str(user["_id"])


async def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reassign order ownership from one employee to another."
    )
    parser.add_argument("--from-user-id", help="Current order owner userId")
    parser.add_argument("--from-user-email", help="Resolve current owner by email")
    parser.add_argument("--to-user-id", help="New order owner userId")
    parser.add_argument("--to-user-email", help="Resolve new owner by email")
    parser.add_argument(
        "--statuses",
        nargs="*",
        default=["BROUILLON", "CONFIRMEE", "LIVREE"],
        help="Optional order statuses to include",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the reassignment. Without this flag the script only prints a dry run.",
    )
    args = parser.parse_args()

    await connect_to_mongo()
    try:
        from_user_id = await resolve_user_id(args.from_user_id, args.from_user_email)
        to_user_id = await resolve_user_id(args.to_user_id, args.to_user_email)

        if not from_user_id:
            raise ValueError("Provide --from-user-id or --from-user-email")
        if not to_user_id:
            raise ValueError("Provide --to-user-id or --to-user-email")
        if from_user_id == to_user_id:
            raise ValueError("Source and destination users are the same")

        query = {"userId": from_user_id}
        if args.statuses:
            query["statut"] = {"$in": args.statuses}

        orders = await db.db[CommandeModel.collection].find(
            query,
            {"_id": 1, "userId": 1, "clientId": 1, "statut": 1, "montantTotal": 1, "dateCommande": 1},
        ).to_list(length=None)

        print(f"Found {len(orders)} matching orders.")
        for order in orders[:20]:
            print(
                f"- order={order['_id']} statut={order.get('statut')} "
                f"amount={order.get('montantTotal')} userId={order.get('userId')}"
            )
        if len(orders) > 20:
            print(f"... and {len(orders) - 20} more")

        if not args.apply:
            print("Dry run only. Re-run with --apply to update these orders.")
            return 0

        result = await db.db[CommandeModel.collection].update_many(
            query,
            {"$set": {"userId": to_user_id}},
        )
        print(f"Updated {result.modified_count} orders to userId={to_user_id}.")
        return 0
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
