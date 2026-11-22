from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AccessStatusResponse(BaseModel):
    allowed: bool
    is_locked: bool
    reason: Optional[str] = None
    message: Optional[str] = None
    client_name: Optional[str] = None
    license_key: Optional[str] = None
    status: Optional[str] = None
    expires_at: Optional[str] = None
    features: Optional[Dict[str, Any]] = None


class VerifyKeyRequest(BaseModel):
    license_key: str


class AdminLoginRequest(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    authenticated: bool
    token: Optional[str] = None
    message: str


class CreateLicenseRequest(BaseModel):
    client_name: str
    expires_in_days: Optional[int] = None  # None = Lifetime
    notes: Optional[str] = None
    allowed_features: Optional[Dict[str, bool]] = None


class ClientLicenseResponse(BaseModel):
    id: str
    license_key: str
    client_name: str
    status: str
    is_active: bool
    expires_at: Optional[datetime] = None
    allowed_features: Optional[str] = None
    notes: Optional[str] = None
    device_info: Optional[str] = None
    last_used_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GlobalLockRequest(BaseModel):
    is_locked: bool
    lock_message: Optional[str] = None


class RemoteConfigRequest(BaseModel):
    enabled: bool
    url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
