from functools import wraps
from flask import jsonify
from flask_login import current_user

def owner_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        if not current_user.is_owner():
            return jsonify({'error': 'Access denied. Owner only.'}), 403
        if not current_user.IsActive:
            return jsonify({'error': 'Account disabled'}), 403
        return f(*args, **kwargs)
    return decorated_function

def staff_or_owner_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        if not current_user.IsActive:
            return jsonify({'error': 'Account disabled'}), 403
        return f(*args, **kwargs)
    return decorated_function

def log_action(db, user, business_id, action, details='', request=None):
    """Call this anywhere to record an audit log entry."""
    try:
        from app.models.audit import AuditLog
        ip = request.remote_addr if request else 'unknown'
        entry = AuditLog(
            UserID=user.UserID,
            BusinessID=business_id,
            Action=action,
            Details=details,
            IPAddress=ip
        )
        db.session.add(entry)
        db.session.commit()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] {e}")