from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.delivery import Delivery
from app.models.user import User

deliveries_bp = Blueprint("deliveries", __name__)


@deliveries_bp.post("/request")
@jwt_required()
def create_request():
    user_id = int(get_jwt_identity())
    claims = get_jwt()

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
        "delivery": {
            "id": delivery.id,
            "document_name": delivery.document_name,
            "status": delivery.status,
            "requested_by_user_id": delivery.requested_by_user_id,
            "created_at": delivery.created_at.isoformat()
        }
    }, 201


@deliveries_bp.get("/my-requests")
@jwt_required()
def get_my_requests():
    user_id = int(get_jwt_identity())
    claims = get_jwt()

    deliveries = (
        Delivery.query
        .filter_by(requested_by_user_id=user_id)
        .order_by(Delivery.created_at.desc())
        .all()
    )

    return [
        {
            "id": d.id,
            "document_name": d.document_name,
            "sender": d.sender,
            "recipient": d.recipient,
            "pickup_location": d.pickup_location,
            "dropoff_location": d.dropoff_location,
            "status": d.status,
            "received_confirmed": d.received_confirmed,
            "received_at": d.received_at.isoformat() if d.received_at else None,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        }
        for d in deliveries
    ], 200


@deliveries_bp.get("/<int:delivery_id>")
@jwt_required()
def get_delivery(delivery_id):
    user_id = int(get_jwt_identity())
    delivery = Delivery.query.get_or_404(delivery_id)

    return {
        "id": delivery.id,
        "document_name": delivery.document_name,
        "sender": delivery.sender,
        "recipient": delivery.recipient,
        "pickup_location": delivery.pickup_location,
        "dropoff_location": delivery.dropoff_location,
        "status": delivery.status,
        "robot_id": delivery.robot_id,
        "requested_by_user_id": delivery.requested_by_user_id,
        "received_by_user_id": delivery.received_by_user_id,
        "received_confirmed": delivery.received_confirmed,
        "received_at": delivery.received_at.isoformat() if delivery.received_at else None,
        "created_at": delivery.created_at.isoformat(),
        "updated_at": delivery.updated_at.isoformat() if delivery.updated_at else None,
    }, 200


@deliveries_bp.put("/<int:delivery_id>/received")
@jwt_required()
def confirm_received(delivery_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()

    delivery = Delivery.query.get_or_404(delivery_id)

    if delivery.requested_by_user_id != user_id:
        return {"error": "You are not allowed to confirm this delivery"}, 403

    if delivery.status != "delivered":
        return {"error": "Only delivered requests can be marked as received"}, 400

    delivery.status = "received"
    delivery.received_confirmed = True
    delivery.received_by_user_id = user_id
    delivery.received_at = datetime.utcnow()

    db.session.commit()

    return {
        "message": "Delivery marked as received successfully",
        "delivery": {
            "id": delivery.id,
            "status": delivery.status,
            "received_confirmed": delivery.received_confirmed,
            "received_at": delivery.received_at.isoformat()
        }
    }, 200


@deliveries_bp.get("/admin/all")
@jwt_required()
def get_all_requests():
    # Allow any authenticated user to view all deliveries for now
    # (In production, you'd want to restrict this to admin/supervisor roles only)
    deliveries = Delivery.query.order_by(Delivery.created_at.desc()).all()

    return [
        {
            "id": d.id,
            "document_name": d.document_name,
            "sender": d.sender,
            "recipient": d.recipient,
            "pickup_location": d.pickup_location,
            "dropoff_location": d.dropoff_location,
            "status": d.status,
            "robot_id": d.robot_id,
            "requested_by_user_id": d.requested_by_user_id,
            "received_by_user_id": d.received_by_user_id,
            "received_confirmed": d.received_confirmed,
            "received_at": d.received_at.isoformat() if d.received_at else None,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        }
        for d in deliveries
    ], 200


@deliveries_bp.put("/admin/<int:delivery_id>")
@jwt_required()
def admin_update_delivery(delivery_id):
    claims = get_jwt()

    delivery = Delivery.query.get_or_404(delivery_id)
    data = request.get_json() or {}

    allowed_fields = [
        "document_name",
        "sender",
        "recipient",
        "pickup_location",
        "dropoff_location",
        "status",
        "robot_id"
    ]

    for field in allowed_fields:
        if field in data:
            setattr(delivery, field, data[field])

    db.session.commit()

    return {
        "message": "Delivery updated successfully",
        "delivery": {
            "id": delivery.id,
            "status": delivery.status,
            "robot_id": delivery.robot_id,
            "updated_at": delivery.updated_at.isoformat() if delivery.updated_at else None
        }
    }, 200


@deliveries_bp.delete("/admin/<int:delivery_id>")
@jwt_required()
def admin_delete_delivery(delivery_id):
    claims = get_jwt()

    delivery = Delivery.query.get_or_404(delivery_id)

    db.session.delete(delivery)
    db.session.commit()

    return {"message": "Delivery deleted successfully"}, 200
