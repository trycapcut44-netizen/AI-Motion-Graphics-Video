from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class UserBase(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None
    role: str = Field(default="user", description="admin, user, editor, viewer")
    status: str = Field(default="active", description="active, suspended, pending")
    is_active: bool = True
    can_ai_dubbing: bool = True
    can_voice_over: bool = True
    can_clone_voice: bool = False
    can_export_subtitles: bool = True
    can_burn_subtitles: bool = True
    tier: str = Field(default="free", description="free, pro, enterprise")
    max_video_duration_minutes: int = 30
    monthly_minutes_quota: int = 120


class UserCreate(UserBase):
    password: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    tier: Optional[str] = None
    password: Optional[str] = None


class UserAccessUpdate(BaseModel):
    is_active: Optional[bool] = None
    status: Optional[str] = None
    role: Optional[str] = None
    can_ai_dubbing: Optional[bool] = None
    can_voice_over: Optional[bool] = None
    can_clone_voice: Optional[bool] = None
    can_export_subtitles: Optional[bool] = None
    can_burn_subtitles: Optional[bool] = None
    tier: Optional[str] = None
    max_video_duration_minutes: Optional[int] = None
    monthly_minutes_quota: Optional[int] = None
    used_minutes: Optional[float] = None


class UserResponse(UserBase):
    id: str
    used_minutes: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    projects_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    admin_users: int
    total_projects: int
    total_minutes_dubbed: float
    ai_dubbing_enabled_users: int
    system_status: str = "healthy"
