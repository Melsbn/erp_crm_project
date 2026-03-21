#!/usr/bin/env python3
"""
Database initialization script - Creates collections, indexes, and initial admin account
"""
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    UserModel,
    ClientModel,
    ProspectModel,
    ProduitModel,
    CommandeModel,
    LigneCommandeModel,
    FactureModel,
    PaiementModel,
    InteractionModel,
    RapportModel,
    create_all_indexes
)


async def init_database():
    """Initialize the database with collections and indexes."""
    print("=== Database Initialization Started ===\n")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    print(f"Connected to MongoDB: {settings.MONGODB_URL}")
    print(f"Database: {settings.DATABASE_NAME}\n")
    
    # Create indexes for all collections
    print("Creating indexes...")
    await create_all_indexes(db)
    print("✓ All collection indexes created\n")
    
    # Create admin collection and initial admin user
    print("Setting up admin authentication...")
    
    # Check if admin already exists
    admin_email = "gourmease@gmail.com".lower()  # Normalize email
    existing_admin = await db.admin.find_one({"email": admin_email})
    
    if existing_admin:
        print("⚠ Admin user already exists")
    else:
        # Create initial admin user
        admin_doc = {
            "email": admin_email,  # Use normalized email
            "hashed_password": get_password_hash("admin123"),
            "role": "ADMIN",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.admin.insert_one(admin_doc)
        print("✓ Initial admin user created")
        print("  Email: gourmease@gmail.com")
        print("  Password: admin123")
        print("  ⚠ IMPORTANT: Change this password after first login!\n")
    
    # Create indexes for admin collection
    await db.admin.create_index("email", unique=True)
    print("✓ Admin collection indexes created")
    
    # Create password_resets collection
    await db.password_resets.create_index("email")
    await db.password_resets.create_index("code")
    await db.password_resets.create_index("expires_at")
    print("✓ Password resets collection indexes created\n")
    
    # Display collection statistics
    print("=== Database Statistics ===")
    collections = await db.list_collection_names()
    for collection in sorted(collections):
        count = await db[collection].count_documents({})
        print(f"  {collection}: {count} documents")
    
    print("\n=== Database Initialization Complete ===")
    print("\n🚀 You can now start the application!")
    print("   Run: uvicorn app.main:app --reload")
    print("\n🔐 Login with:")
    print("   Email: gourmease@gmail.com")
    print("   Password: admin123\n")
    
    client.close()


def main():
    """Entry point for the script."""
    asyncio.run(init_database())


if __name__ == "__main__":
    main()
