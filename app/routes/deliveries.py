from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.delivery import Delivery

deliveries_bp = Blueprint("deliveries", __name__)

ALLOWED_STATUSES = [
    "pending_request",
    "approved",
    "in_transit",
    "delivered",
    "received"
]


def is_admin():
    claims = get_jwt()
    return claims.get("is_admin", False)


# -------------------------
# CREATE DELIVERY REQUEST
# -------------------------
@deliveries_bp.post("/request")
@jwt_required()
def create_request():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    required_fields = [
        "document_name",
        "sender",
        "recipient",
        "pickup_location",
        "dropoff_location",
    ]

    for field in required_fields:
        if not data.get(field):
            return {"error": f"{field} is required"}, 400

    delivery = Delivery(
        document_name=data["document_name"],
        sender=data["sender"],
        recipient=data["recipient"],
        pickup_location=data["pickup_location"],
        dropoff_location=data["dropoff_location"],
        status="pending_request",
        requested_by_user_id=user_id
    )

    db.session.add(delivery)
    db.session.commit()

    return {
        "message": "Delivery request submitted successfully",
        "delivery": delivery.to_dict()
    }, 201


# -------------------------
# MY REQUESTS
# -------------------------
@deliveries_bp.get("/my-requests")
@jwt_required()
def get_my_requests():
    user_id = int(get_jwt_identity())

    deliveries = Delivery.query.filter_by(
        requested_by_user_id=user_id
    ).order_by(Delivery.created_at.desc()).all()

    return [d.to_dict() for d in deliveries], 200


# -------------------------
# GET SINGLE DELIVERY
# -------------------------
@deliveries_bp.get("/<int:delivery_id>")
@jwt_required()
def get_delivery(delivery_id):
    delivery = Delivery.query.get_or_404(delivery_id)
    return delivery.to_dict(), 200


# -------------------------
# CONFIRM RECEIVED
# -------------------------
@deliveries_bp.put("/<int:delivery_id>/received")
@jwt_required()
def confirm_received(delivery_id):
    user_id = int(get_jwt_identity())

    delivery = Delivery.query.get_or_404(delivery_id)

    if delivery.requested_by_user_id != user_id:
        return {"error": "Not allowed"}, 403

    if delivery.status != "delivered":
        return {"error": "Only delivered items can be confirmed"}, 400

    delivery.status = "received"
    delivery.received_confirmed = True
    delivery.received_by_user_id = user_id
    delivery.received_at = datetime.utcnow()

    db.session.commit()

    return {
        "message": "Delivery marked as received",
        "delivery": delivery.to_dict()
    }, 200


# -------------------------
# ADMIN - GET ALL
# -------------------------
@deliveries_bp.get("/admin/all")
@jwt_required()
def get_all_requests():
    if not is_admin():
        return {"error": "Admin access required"}, 403

    deliveries = Delivery.query.order_by(
        Delivery.created_at.desc()
    ).all()

    return [d.to_dict() for d in deliveries], 200


# -------------------------
# ADMIN - UPDATE
# -------------------------
@deliveries_bp.put("/admin/<int:delivery_id>")
@jwt_required()
def admin_update_delivery(delivery_id):
    if not is_admin():
        return {"error": "Admin access required"}, 403

    delivery = Delivery.query.get_or_404(delivery_id)
    data = request.get_json() or {}

    for field in [
        "document_name",
        "sender",
        "recipient",
        "pickup_location",
        "dropoff_location",
        "robot_id",
    ]:
        if field in data:
            setattr(delivery, field, data[field])

    if "status" in data:
        if data["status"] not in ALLOWED_STATUSES:
            return {"error": "Invalid status"}, 400
        delivery.status = data["status"]

    db.session.commit()

    return {
        "message": "Updated successfully",
        "delivery": delivery.to_dict()
    }, 200


# -------------------------
# ADMIN - DELETE
# -------------------------
@deliveries_bp.delete("/admin/<int:delivery_id>")
@jwt_required()
def admin_delete_delivery(delivery_id):
    if not is_admin():
        return {"error": "Admin access required"}, 403

    delivery = Delivery.query.get_or_404(delivery_id)

    db.session.delete(delivery)
    db.session.commit()

    return {"message": "Deleted successfully"}, 200