from flask import Flask
from app.config import Config
from app.extensions import db, migrate, jwt, bcrypt, cors, socketio


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app)
    socketio.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.robots import robots_bp
    from app.routes.deliveries import deliveries_bp
    from app.routes.telemetry import telemetry_bp
    from app.routes.alerts import alerts_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(robots_bp, url_prefix="/api/robots")
    app.register_blueprint(deliveries_bp, url_prefix="/api/deliveries")
    app.register_blueprint(telemetry_bp, url_prefix="/api/telemetry")
    app.register_blueprint(alerts_bp, url_prefix="/api/alerts")

    @app.route("/")
    def home():
        return {"message": "Robot Monitoring Backend API is running"}

    return app
