from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db.session import get_db
from app.db.models import User, Project, UsageRecord
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserAccessUpdate,
    UserResponse,
    AdminStatsResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin Panel & Access Control"])


def _user_to_response(u: User, db: Session) -> UserResponse:
    proj_count = db.query(Project).filter(Project.owner_id == u.id).count()
    return UserResponse(
        id=u.id,
        email=u.email,
        username=u.username,
        full_name=u.full_name,
        role=u.role,
        status=u.status,
        is_active=u.is_active,
        can_ai_dubbing=u.can_ai_dubbing,
        can_voice_over=u.can_voice_over,
        can_clone_voice=u.can_clone_voice,
        can_export_subtitles=u.can_export_subtitles,
        can_burn_subtitles=u.can_burn_subtitles,
        tier=u.tier,
        max_video_duration_minutes=u.max_video_duration_minutes,
        monthly_minutes_quota=u.monthly_minutes_quota,
        used_minutes=u.used_minutes,
        created_at=u.created_at,
        updated_at=u.updated_at,
        last_login_at=u.last_login_at,
        projects_count=proj_count,
    )


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns platform-wide metrics and user access summaries for the Admin Dashboard.
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True, User.status == "active").count()
    suspended_users = db.query(User).filter(or_(User.is_active == False, User.status == "suspended")).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    ai_dubbing_enabled_users = db.query(User).filter(User.can_ai_dubbing == True).count()
    total_projects = db.query(Project).count()

    # Calculate total minutes dubbed from UsageRecord or User used_minutes
    total_minutes = db.query(func.sum(User.used_minutes)).scalar() or 0.0

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        suspended_users=suspended_users,
        admin_users=admin_users,
        total_projects=total_projects,
        total_minutes_dubbed=round(total_minutes, 1),
        ai_dubbing_enabled_users=ai_dubbing_enabled_users,
        system_status="healthy",
    )


@router.get("/users", response_model=List[UserResponse])
def list_users(
    search: Optional[str] = Query(None, description="Search by name, email or username"),
    role: Optional[str] = Query(None, description="Filter by role: admin, user, editor"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: active, suspended"),
    tier: Optional[str] = Query(None, description="Filter by tier: free, pro, enterprise"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Lists users with optional filtering and search. Includes their project counts.
    """
    query = db.query(User)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.username.ilike(search_term),
                User.full_name.ilike(search_term),
            )
        )

    if role:
        query = query.filter(User.role == role)

    if status_filter:
        query = query.filter(User.status == status_filter)

    if tier:
        query = query.filter(User.tier == tier)

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    # Attach project count for each user
    results = []
    for u in users:
        proj_count = db.query(Project).filter(Project.owner_id == u.id).count()
        u_dict = {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "status": u.status,
            "is_active": u.is_active,
            "can_ai_dubbing": u.can_ai_dubbing,
            "can_voice_over": u.can_voice_over,
            "can_clone_voice": u.can_clone_voice,
            "can_export_subtitles": u.can_export_subtitles,
            "can_burn_subtitles": u.can_burn_subtitles,
            "tier": u.tier,
            "max_video_duration_minutes": u.max_video_duration_minutes,
            "monthly_minutes_quota": u.monthly_minutes_quota,
            "used_minutes": u.used_minutes,
            "created_at": u.created_at,
            "updated_at": u.updated_at,
            "last_login_at": u.last_login_at,
            "projects_count": proj_count,
        }
        results.append(UserResponse(**u_dict))

    return results


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Admin endpoint to create a new user account with specific permissions.
    """
    existing_email = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    existing_username = db.query(User).filter(User.username == payload.username.strip().lower()).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="A user with this username already exists.")

    new_user = User(
        email=payload.email.strip().lower(),
        username=payload.username.strip().lower(),
        full_name=payload.full_name.strip() if payload.full_name else None,
        role=payload.role,
        status=payload.status,
        is_active=payload.is_active,
        can_ai_dubbing=payload.can_ai_dubbing,
        can_voice_over=payload.can_voice_over,
        can_clone_voice=payload.can_clone_voice,
        can_export_subtitles=payload.can_export_subtitles,
        can_burn_subtitles=payload.can_burn_subtitles,
        tier=payload.tier,
        max_video_duration_minutes=payload.max_video_duration_minutes,
        monthly_minutes_quota=payload.monthly_minutes_quota,
        used_minutes=0.0,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return _user_to_response(new_user, db)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_details(user_id: str, db: Session = Depends(get_db)):
    """
    Fetch full profile and access parameters for a single user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _user_to_response(user, db)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_profile(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    """
    Update core profile properties of a user (email, name, role, status, tier).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.email and payload.email.strip().lower() != user.email:
        existing = db.query(User).filter(User.email == payload.email.strip().lower()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already taken by another account.")
        user.email = payload.email.strip().lower()

    if payload.username and payload.username.strip().lower() != user.username:
        existing_u = db.query(User).filter(User.username == payload.username.strip().lower()).first()
        if existing_u:
            raise HTTPException(status_code=400, detail="Username is already taken.")
        user.username = payload.username.strip().lower()

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.role is not None:
        user.role = payload.role
    if payload.status is not None:
        user.status = payload.status
        user.is_active = (payload.status == "active")
    if payload.tier is not None:
        user.tier = payload.tier

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return _user_to_response(user, db)


@router.patch("/users/{user_id}/access", response_model=UserResponse)
def update_user_access(user_id: str, payload: UserAccessUpdate, db: Session = Depends(get_db)):
    """
    Admin control endpoint: Granularly configure user access permissions,
    feature toggles (AI dubbing, voice over, cloning), quotas, and active status.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.is_active is not None:
        user.is_active = payload.is_active
        user.status = "active" if payload.is_active else "suspended"

    if payload.status is not None:
        user.status = payload.status
        user.is_active = (payload.status == "active")

    if payload.role is not None:
        user.role = payload.role

    if payload.can_ai_dubbing is not None:
        user.can_ai_dubbing = payload.can_ai_dubbing

    if payload.can_voice_over is not None:
        user.can_voice_over = payload.can_voice_over

    if payload.can_clone_voice is not None:
        user.can_clone_voice = payload.can_clone_voice

    if payload.can_export_subtitles is not None:
        user.can_export_subtitles = payload.can_export_subtitles

    if payload.can_burn_subtitles is not None:
        user.can_burn_subtitles = payload.can_burn_subtitles

    if payload.tier is not None:
        user.tier = payload.tier

    if payload.max_video_duration_minutes is not None:
        user.max_video_duration_minutes = payload.max_video_duration_minutes

    if payload.monthly_minutes_quota is not None:
        user.monthly_minutes_quota = payload.monthly_minutes_quota

    if payload.used_minutes is not None:
        user.used_minutes = payload.used_minutes

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return _user_to_response(user, db)


@router.post("/users/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_active_status(user_id: str, db: Session = Depends(get_db)):
    """
    Quick 1-click action: Toggle a user between Active and Suspended (Banned).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin self-lockout
    if user.email == "admin@globaldub.ai" and user.is_active:
        raise HTTPException(status_code=400, detail="Cannot suspend the primary administrator account.")

    # Toggle
    new_active = not user.is_active
    user.is_active = new_active
    user.status = "active" if new_active else "suspended"
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return _user_to_response(user, db)


@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    """
    Permanently delete a user account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email == "admin@globaldub.ai":
        raise HTTPException(status_code=400, detail="Cannot delete the primary administrator account.")

    deleted_username = user.username
    db.delete(user)
    db.commit()

    return {
        "success": True,
        "detail": f"User '{deleted_username}' has been successfully deleted.",
        "id": user_id,
    }
