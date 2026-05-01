from datetime import datetime
from app.extensions import db


class Delivery(db.Model):
    __tablename__ = "deliveries"

    id = db.Column(db.Integer, primary_key=True)
    document_name = db.Column(db.String(150), nullable=False)
    sender = db.Column(db.String(100), nullable=False)

    # Foreign key to User for recipient
    recipient_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    recipient = db.relationship(
        "User",
        foreign_keys=[recipient_user_id],
        backref="received_deliveries"
    )

    pickup_location = db.Column(db.String(150), nullable=False)
    dropoff_location = db.Column(db.String(150), nullable=False)

    status = db.Column(db.String(30), default="pending_request")
    robot_id = db.Column(db.Integer, db.ForeignKey("robots.id"), nullable=True)

    requested_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    requested_by = db.relationship(
        "User",
        foreign_keys=[requested_by_user_id],
        backref="requested_deliveries"
    )

    received_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    received_by = db.relationship(
        "User",
        foreign_keys=[received_by_user_id],
        backref="confirmed_deliveries"
    )

    received_confirmed = db.Column(db.Boolean, default=False)
    received_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
