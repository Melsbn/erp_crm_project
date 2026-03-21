from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "crm_database"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Email (SMTP)
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = ""
    
    # Admin settings
    RESET_CODE_EXPIRY_MINUTES: int = 15
    
    # App
    APP_NAME: str = "CRM API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # AI settings
    GROQ_API_KEY: str = "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"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # CORS
    BACKEND_CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'
    
    @property
    def cors_origins(self) -> List[str]:
        return json.loads(self.BACKEND_CORS_ORIGINS)
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
