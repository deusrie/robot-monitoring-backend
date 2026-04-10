from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from app.extensions import db
from app.models.robot import Robot

robots_bp = Blueprint("robots", __name__)


@robots_bp.get("/")
@jwt_required()
def get_robots():
    robots = Robot.query.order_by(Robot.id.asc()).all()

    return [
        {
            "id": robot.id,
            "name": robot.name,
            "status": robot.status,
            "battery_level": robot.battery_level,
            "location": robot.location,
            "temperature": robot.temperature,
            "is_charging": robot.is_charging,
            "obstacle_detected": robot.obstacle_detected,
            "line_tracking": robot.line_tracking,
            "updated_at": robot.updated_at.isoformat() if robot.updated_at else None
        }
        for robot in robots
    ], 200


@robots_bp.post("/")
@jwt_required()
def create_robot():
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    data = request.get_json() or {}

    name = data.get("name")
    if not name:
        return {"error": "name is required"}, 400

    existing_robot = Robot.query.filter_by(name=name).first()
    if existing_robot:
        return {"error": "Robot name already exists"}, 409

    robot = Robot(
        name=name,
        status=data.get("status", "offline"),
        battery_level=data.get("battery_level", 100.0),
        location=data.get("location"),
        temperature=data.get("temperature"),
        is_charging=data.get("is_charging", False),
        obstacle_detected=data.get("obstacle_detected", False),
        line_tracking=data.get("line_tracking")
    )

    db.session.add(robot)
    db.session.commit()

    return {
        "message": "Robot created successfully",
        "robot": {
            "id": robot.id,
            "name": robot.name,
            "status": robot.status,
            "battery_level": robot.battery_level,
            "location": robot.location,
            "temperature": robot.temperature,
            "is_charging": robot.is_charging,
            "obstacle_detected": robot.obstacle_detected,
            "line_tracking": robot.line_tracking
        }
    }, 201


@robots_bp.get("/<int:robot_id>")
@jwt_required()
def get_robot(robot_id):
    robot = Robot.query.get_or_404(robot_id)

    return {
        "id": robot.id,
        "name": robot.name,
        "status": robot.status,
        "battery_level": robot.battery_level,
        "location": robot.location,
        "temperature": robot.temperature,
        "is_charging": robot.is_charging,
        "obstacle_detected": robot.obstacle_detected,
        "line_tracking": robot.line_tracking,
        "updated_at": robot.updated_at.isoformat() if robot.updated_at else None
    }, 200


@robots_bp.put("/<int:robot_id>")
@jwt_required()
def update_robot(robot_id):
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    robot = Robot.query.get_or_404(robot_id)
    data = request.get_json() or {}

    allowed_fields = [
        "name",
        "status",
        "battery_level",
        "location",
        "temperature",
        "is_charging",
        "obstacle_detected",
        "line_tracking"
    ]

    for field in allowed_fields:
        if field in data:
            setattr(robot, field, data[field])

    db.session.commit()

    return {
        "message": "Robot updated successfully",
        "robot": {
            "id": robot.id,
            "name": robot.name,
            "status": robot.status,
            "battery_level": robot.battery_level,
            "location": robot.location,
            "temperature": robot.temperature,
            "is_charging": robot.is_charging,
            "obstacle_detected": robot.obstacle_detected,
            "line_tracking": robot.line_tracking,
            "updated_at": robot.updated_at.isoformat() if robot.updated_at else None
        }
    }, 200


@robots_bp.delete("/<int:robot_id>")
@jwt_required()
def delete_robot(robot_id):
    claims = get_jwt()

    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403

    robot = Robot.query.get_or_404(robot_id)

    db.session.delete(robot)
    db.session.commit()

    return {"message": "Robot deleted successfully"}, 200
