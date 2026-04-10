from datetime import datetime
from app.extensions import db


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    robot_id = db.Column(db.Integer, db.ForeignKey("robots.id"), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    severity = db.Column(db.String(20), default="medium")
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
