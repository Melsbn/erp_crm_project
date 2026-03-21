from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.schemas import (
    ProduitCreate, ProduitUpdate, ProduitResponse,
    CategorieCreate, CategorieUpdate, CategorieResponse
)
from app.models import ProduitModel, CategorieModel, BaseModel, serialize_doc, serialize_docs
#from app.api.deps import get_current_active_admin
from app.api.deps import require_roles, ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE



router = APIRouter()


# Category endpoints
@router.get("/categories", response_model=List[CategorieResponse])
async def get_categories(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get all categories."""
    categories = await db[CategorieModel.collection].find().to_list(1000)
    return serialize_docs(categories)


@router.get("/categories/{category_id}", response_model=CategorieResponse)
async def get_category(
    category_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get category by ID."""
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Invalid category ID")
    
    category = await db[CategorieModel.collection].find_one({"_id": ObjectId(category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return serialize_doc(category)


@router.post("/categories", response_model=CategorieResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategorieCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    """Create a new category."""
    category_dict = category.model_dump()
    category_dict.update(BaseModel.get_base_fields())
    
    result = await db[CategorieModel.collection].insert_one(category_dict)
    created_category = await db[CategorieModel.collection].find_one({"_id": result.inserted_id})
    
    return serialize_doc(created_category)


@router.put("/categories/{category_id}", response_model=CategorieResponse)
async def update_category(
    category_id: str,
    category: CategorieUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    """Update category."""
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Invalid category ID")
    
    update_data = category.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db[CategorieModel.collection].update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated_category = await db[CategorieModel.collection].find_one({"_id": ObjectId(category_id)})
    return serialize_doc(updated_category)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    """Delete category."""
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Invalid category ID")
    
    # Check if category has products
    products = await db[ProduitModel.collection].find_one({"categorieId": category_id})
    if products:
        raise HTTPException(status_code=400, detail="Cannot delete category with products")
    
    result = await db[CategorieModel.collection].delete_one({"_id": ObjectId(category_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return None


# Product endpoints
@router.get("", response_model=List[ProduitResponse])
async def get_products(
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get all products."""
    products = await db[ProduitModel.collection].find().to_list(1000)
    return serialize_docs(products)


@router.get("/{product_id}", response_model=ProduitResponse)
async def get_product(
    product_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR, ROLE_EMPLOYE]))
):
    """Get product by ID."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = await db[ProduitModel.collection].find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return serialize_doc(product)


@router.post("", response_model=ProduitResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProduitCreate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    """Create a new product."""
    # Validate category exists
    if not ObjectId.is_valid(product.categorieId):
        raise HTTPException(status_code=400, detail="Invalid category ID")
    
    category = await db[CategorieModel.collection].find_one({"_id": ObjectId(product.categorieId)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    product_dict = product.model_dump()
    product_dict.update(BaseModel.get_base_fields())
    
    result = await db[ProduitModel.collection].insert_one(product_dict)
    created_product = await db[ProduitModel.collection].find_one({"_id": result.inserted_id})
    
    return serialize_doc(created_product)


@router.put("/{product_id}", response_model=ProduitResponse)
async def update_product(
    product_id: str,
    product: ProduitUpdate,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    """Update product."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    update_data = product.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Validate category if being updated
    if "categorieId" in update_data:
        if not ObjectId.is_valid(update_data["categorieId"]):
            raise HTTPException(status_code=400, detail="Invalid category ID")
        
        category = await db[CategorieModel.collection].find_one({"_id": ObjectId(update_data["categorieId"])})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    result = await db[ProduitModel.collection].update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated_product = await db[ProduitModel.collection].find_one({"_id": ObjectId(product_id)})
    return serialize_doc(updated_product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(require_roles([ROLE_ADMIN, ROLE_SUPERVISEUR]))
):
    """Delete product."""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    result = await db[ProduitModel.collection].delete_one({"_id": ObjectId(product_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return None
