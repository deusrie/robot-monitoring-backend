from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from app.extensions import db, bcrypt
from app.models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}

    username = data.get("username")
    email = data.get("email")
    full_name = data.get("full_name")
    password = data.get("password")
    role = data.get("role", "user")
    room = data.get("room")

    if not username or not email or not full_name or not password:
        return {"error": "username, email, full_name, and password are required"}, 400

    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        return {"error": "Username or email already exists"}, 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        password_hash=password_hash,
        role=role,
        room=room
    )

    db.session.add(user)
    db.session.commit()

    return {
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "room": user.room
        }
    }, 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return {"error": "username and password are required"}, 400

    user = User.query.filter_by(username=username).first()

    if not user:
        return {"error": "Invalid username or password"}, 401

    if not user.is_active:
        return {"error": "This account is inactive"}, 403

    if not bcrypt.check_password_hash(user.password_hash, password):
        return {"error": "Invalid username or password"}, 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "username": user.username,
            "full_name": user.full_name
        }
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "room": user.room
        }
    }, 200


@auth_bp.get("/test")
def auth_test():
    return {"message": "Auth route working"}, 200
