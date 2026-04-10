from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from app.extensions import db
from app.models.robot import Robot
from app.models.telemetry import Telemetry

telemetry_bp = Blueprint("telemetry", __name__)


@telemetry_bp.post("/")
@jwt_required()
def add_telemetry():
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    data = request.get_json() or {}

    robot_id = data.get("robot_id")
    if not robot_id:
        return {"error": "robot_id is required"}, 400

    robot = Robot.query.get(robot_id)
    if not robot:
        return {"error": "Robot not found"}, 404

    telemetry = Telemetry(
        robot_id=robot_id,
        battery_level=data.get("battery_level", robot.battery_level),
        temperature=data.get("temperature"),
        location=data.get("location"),
        speed=data.get("speed"),
        obstacle_detected=data.get("obstacle_detected", False),
        line_tracking=data.get("line_tracking")
    )

    robot.battery_level = telemetry.battery_level
    robot.temperature = telemetry.temperature
    robot.location = telemetry.location
    robot.obstacle_detected = telemetry.obstacle_detected
    robot.line_tracking = telemetry.line_tracking
    robot.status = data.get("status", robot.status)
    robot.is_charging = data.get("is_charging", robot.is_charging)

    db.session.add(telemetry)
    db.session.commit()

    return {
        "message": "Telemetry recorded successfully",
        "telemetry": {
            "id": telemetry.id,
            "robot_id": telemetry.robot_id,
            "battery_level": telemetry.battery_level,
            "temperature": telemetry.temperature,
            "location": telemetry.location,
            "speed": telemetry.speed,
            "obstacle_detected": telemetry.obstacle_detected,
            "line_tracking": telemetry.line_tracking,
            "timestamp": telemetry.timestamp.isoformat()
        },
        "robot": {
            "id": robot.id,
            "status": robot.status,
            "battery_level": robot.battery_level,
            "location": robot.location,
            "temperature": robot.temperature,
            "is_charging": robot.is_charging,
            "obstacle_detected": robot.obstacle_detected,
            "line_tracking": robot.line_tracking
        }
    }, 201


@telemetry_bp.get("/<int:robot_id>")
@jwt_required()
def get_robot_telemetry(robot_id):
    robot = Robot.query.get(robot_id)
    if not robot:
        return {"error": "Robot not found"}, 404

    telemetry_records = (
        Telemetry.query
        .filter_by(robot_id=robot_id)
        .order_by(Telemetry.timestamp.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": t.id,
            "robot_id": t.robot_id,
            "battery_level": t.battery_level,
            "temperature": t.temperature,
            "location": t.location,
            "speed": t.speed,
            "obstacle_detected": t.obstacle_detected,
            "line_tracking": t.line_tracking,
            "timestamp": t.timestamp.isoformat()
        }
        for t in telemetry_records
    ], 200


@telemetry_bp.get("/latest/<int:robot_id>")
@jwt_required()
def get_latest_telemetry(robot_id):
    robot = Robot.query.get(robot_id)
    if not robot:
        return {"error": "Robot not found"}, 404

    latest = (
        Telemetry.query
        .filter_by(robot_id=robot_id)
        .order_by(Telemetry.timestamp.desc())
        .first()
    )

    if not latest:
        return {"error": "No telemetry data found for this robot"}, 404

    return {
        "id": latest.id,
        "robot_id": latest.robot_id,
        "battery_level": latest.battery_level,
        "temperature": latest.temperature,
        "location": latest.location,
        "speed": latest.speed,
        "obstacle_detected": latest.obstacle_detected,
        "line_tracking": latest.line_tracking,
        "timestamp": latest.timestamp.isoformat()
    }, 200
