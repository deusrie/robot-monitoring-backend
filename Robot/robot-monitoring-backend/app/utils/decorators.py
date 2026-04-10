from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from flask import jsonify


def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()

            if claims.get("role") != "admin":
                return jsonify({"error": "Admin access required"}), 403

            return fn(*args, **kwargs)
        return decorated_function
    return wrapper
