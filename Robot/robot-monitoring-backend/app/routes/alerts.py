from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from app.extensions import db
from app.models.alert import Alert
from app.models.robot import Robot

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.get("/")
@jwt_required()
def get_alerts():
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    alerts = Alert.query.order_by(Alert.created_at.desc()).all()

    return [
        {
            "id": alert.id,
            "robot_id": alert.robot_id,
            "alert_type": alert.alert_type,
            "message": alert.message,
            "severity": alert.severity,
            "is_resolved": alert.is_resolved,
            "created_at": alert.created_at.isoformat()
        }
        for alert in alerts
    ], 200


@alerts_bp.post("/")
@jwt_required()
def create_alert():
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    data = request.get_json() or {}

    robot_id = data.get("robot_id")
    alert_type = data.get("alert_type")
    message = data.get("message")
    severity = data.get("severity", "medium")

    if not robot_id or not alert_type or not message:
        return {"error": "robot_id, alert_type, and message are required"}, 400

    robot = Robot.query.get(robot_id)
    if not robot:
        return {"error": "Robot not found"}, 404

    alert = Alert(
        robot_id=robot_id,
        alert_type=alert_type,
        message=message,
        severity=severity
    )

    db.session.add(alert)
    db.session.commit()

    return {
        "message": "Alert created successfully",
        "alert": {
            "id": alert.id,
            "robot_id": alert.robot_id,
            "alert_type": alert.alert_type,
            "message": alert.message,
            "severity": alert.severity,
            "is_resolved": alert.is_resolved,
            "created_at": alert.created_at.isoformat()
        }
    }, 201


@alerts_bp.get("/<int:alert_id>")
@jwt_required()
def get_alert(alert_id):
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    alert = Alert.query.get_or_404(alert_id)

    return {
        "id": alert.id,
        "robot_id": alert.robot_id,
        "alert_type": alert.alert_type,
        "message": alert.message,
        "severity": alert.severity,
        "is_resolved": alert.is_resolved,
        "created_at": alert.created_at.isoformat()
    }, 200


@alerts_bp.put("/<int:alert_id>/resolve")
@jwt_required()
def resolve_alert(alert_id):
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    alert = Alert.query.get_or_404(alert_id)
    alert.is_resolved = True

    db.session.commit()

    return {
        "message": "Alert marked as resolved",
        "alert": {
            "id": alert.id,
            "is_resolved": alert.is_resolved
        }
    }, 200


@alerts_bp.delete("/<int:alert_id>")
@jwt_required()
def delete_alert(alert_id):
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    alert = Alert.query.get_or_404(alert_id)

    db.session.delete(alert)
    db.session.commit()

    return {"message": "Alert deleted successfully"}, 200
