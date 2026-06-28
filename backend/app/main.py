import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.api import auth, users, clients, prospects, products, orders, invoices, misc, dashboard, assistant
from app.api.deps import (
    ROLE_EMPLOYE,
    ROLE_SUPERVISEUR,
    PRIMARY_SUPERVISOR_FIELD,
    SUPERVISOR_EMAIL,
)
from app.services.invoice_reminders import automatic_invoice_reminder_loop


async def enforce_primary_supervisor_identity() -> None:
    """Promote the legacy supervisor account to primary and demote any other supervisors."""
    db = get_database()
    primary_supervisor = await db.users.find_one(
        {PRIMARY_SUPERVISOR_FIELD: True, "role": ROLE_SUPERVISEUR}
    )

    if not primary_supervisor:
        primary_supervisor = await db.users.find_one(
            {"role": ROLE_SUPERVISEUR, "email": SUPERVISOR_EMAIL}
        )
        if primary_supervisor:
            await db.users.update_one(
                {"_id": primary_supervisor["_id"]},
                {"$set": {PRIMARY_SUPERVISOR_FIELD: True}},
            )

    if not primary_supervisor:
        await db.users.update_many(
            {PRIMARY_SUPERVISOR_FIELD: True},
            {"$unset": {PRIMARY_SUPERVISOR_FIELD: ""}},
        )
        return

    await db.users.update_many(
        {
            PRIMARY_SUPERVISOR_FIELD: True,
            "_id": {"$ne": primary_supervisor["_id"]},
        },
        {"$unset": {PRIMARY_SUPERVISOR_FIELD: ""}},
    )

    result = await db.users.update_many(
        {
            "role": ROLE_SUPERVISEUR,
            "_id": {"$ne": primary_supervisor["_id"]},
        },
        {
            "$set": {"role": ROLE_EMPLOYE},
            "$unset": {PRIMARY_SUPERVISOR_FIELD: ""},
        },
    )
    if result.modified_count:
        print(
            f"Demoted {result.modified_count} non-primary supervisor account(s) to EMPLOYE"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    await connect_to_mongo()
    await enforce_primary_supervisor_identity()
    reminder_task = asyncio.create_task(automatic_invoice_reminder_loop(get_database()))
    try:
        yield
    finally:
        reminder_task.cancel()
        with suppress(asyncio.CancelledError):
            await reminder_task
    # Shutdown
    await close_mongo_connection()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint with database status."""
    from app.core.database import get_database
    try:
        db = get_database()
        # Ping database to verify connectivity
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "version": settings.APP_VERSION
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "version": settings.APP_VERSION
        }


# Include routers
app.include_router(auth.router, prefix="/api")  # Authentication routes (no prefix to keep /api/auth)
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(prospects.router, prefix="/api/prospects", tags=["Prospects"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(misc.router, prefix="/api", tags=["Interactions & Reports"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(assistant.router, prefix="/api", tags=["Assistant"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
