from datetime import datetime
from app.extensions import db


class Robot(db.Model):
    __tablename__ = "robots"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.String(30), default="offline")
    battery_level = db.Column(db.Float, default=100.0)
    location = db.Column(db.String(255), nullable=True)
    temperature = db.Column(db.Float, nullable=True)
    is_charging = db.Column(db.Boolean, default=False)
    obstacle_detected = db.Column(db.Boolean, default=False)
    line_tracking = db.Column(db.String(50), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
