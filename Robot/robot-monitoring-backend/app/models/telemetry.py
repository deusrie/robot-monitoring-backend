from datetime import datetime
from app.extensions import db


class Telemetry(db.Model):
    __tablename__ = "telemetry"

    id = db.Column(db.Integer, primary_key=True)
    robot_id = db.Column(db.Integer, db.ForeignKey("robots.id"), nullable=False)
    battery_level = db.Column(db.Float, nullable=False)
    temperature = db.Column(db.Float, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    speed = db.Column(db.Float, nullable=True)
    obstacle_detected = db.Column(db.Boolean, default=False)
    line_tracking = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
