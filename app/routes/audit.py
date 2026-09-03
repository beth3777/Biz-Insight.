from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.models.audit import AuditLog
from app.models.user import User
from app.utils import owner_required

audit_bp = Blueprint('audit_bp', __name__)

ACTION_ICONS = {
    'LOGIN':          ('fa-sign-in-alt',       'info'),
    'FILE_UPLOAD':    ('fa-upload',             'success'),
    'DELETE_UPLOAD':  ('fa-trash',              'danger'),
    'STAFF_CREATED':  ('fa-user-plus',          'success'),
    'STAFF_DELETED':  ('fa-user-minus',         'danger'),
    'STAFF_TOGGLED':  ('fa-user-lock',          'warning'),
    'TRANSACTION':    ('fa-plus-circle',        'success'),
    'SETTINGS':       ('fa-cog',                'info'),
    'FORECAST':       ('fa-chart-line',         'info'),
    'REPORT_EXPORT':  ('fa-file-excel',         'success'),
}


@audit_bp.route('/api/audit')
@login_required
@owner_required
def get_audit_log():
    from app.models.business import Business
    business = Business.query.filter_by(
        UserID=current_user.UserID
    ).first()
    if not business:
        return jsonify({'logs': []})

    page = request.args.get('page', 1, type=int)
    per_page = 50

    logs = AuditLog.query.filter_by(
        BusinessID=business.BusinessID
    ).order_by(
        AuditLog.CreatedAt.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'logs': [{
            'id': log.LogID,
            'user': log.user.UserName if log.user else 'Unknown',
            'role': log.user.Role if log.user else 'unknown',
            'action': log.Action,
            'details': log.Details,
            'ip': log.IPAddress,
            'timestamp': log.CreatedAt.strftime('%d/%m/%Y %H:%M:%S'),
            'icon': ACTION_ICONS.get(log.Action, ('fa-circle', 'info'))[0],
            'color': ACTION_ICONS.get(log.Action, ('fa-circle', 'info'))[1]
        } for log in logs.items],
        'total': logs.total,
        'pages': logs.pages,
        'current_page': page
    })