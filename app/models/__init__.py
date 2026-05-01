# app/models/__init__.py

from app.extensions import db

from app.models.user import User
from app.models.robot import Robot
from app.models.telemetry import Telemetry
from app.models.alert import Alert
