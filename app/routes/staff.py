from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.user import User
from app.models.business import Business
from app.utils import owner_required

staff_bp = Blueprint('staff_bp', __name__)


@staff_bp.route('/api/staff', methods=['GET'])
@login_required
@owner_required
def get_staff():
    business_id = current_user.get_business_id()

    staff_members = User.query.filter_by(
        BusinessID=business_id,
        Role='staff'
    ).all()

    return jsonify({
        'staff': [{
            'id': s.UserID,
            'username': s.UserName,
            'email': s.UserEmail,
            'is_active': s.IsActive,
            'created_at': s.CreatedAt.strftime('%d/%m/%Y')
        } for s in staff_members]
    })


@staff_bp.route('/api/staff', methods=['POST'])
@login_required
@owner_required
def create_staff():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400

    if User.query.filter_by(UserEmail=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    if User.query.filter_by(UserName=username).first():
        return jsonify({'error': 'Username already taken'}), 400

    business_id = current_user.get_business_id()

    new_staff = User(
        UserName=username,
        UserEmail=email,
        Role='staff',
        BusinessID=business_id,
        IsActive=True
    )
    new_staff.set_password(password)
    db.session.add(new_staff)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Staff account created for {username}',
        'staff': {
            'id': new_staff.UserID,
            'username': new_staff.UserName,
            'email': new_staff.UserEmail,
            'is_active': new_staff.IsActive,
            'created_at': new_staff.CreatedAt.strftime('%d/%m/%Y')
        }
    })


@staff_bp.route('/api/staff/<int:staff_id>/toggle', methods=['POST'])
@login_required
@owner_required
def toggle_staff(staff_id):
    business_id = current_user.get_business_id()

    staff_member = User.query.filter_by(
        UserID=staff_id,
        BusinessID=business_id,
        Role='staff'
    ).first()

    if not staff_member:
        return jsonify({'error': 'Staff member not found'}), 404

    staff_member.IsActive = not staff_member.IsActive
    db.session.commit()

    status = 'enabled' if staff_member.IsActive else 'disabled'
    return jsonify({
        'success': True,
        'message': f'Account {status} for {staff_member.UserName}',
        'is_active': staff_member.IsActive
    })


@staff_bp.route('/api/staff/<int:staff_id>', methods=['DELETE'])
@login_required
@owner_required
def delete_staff(staff_id):
    business_id = current_user.get_business_id()

    staff_member = User.query.filter_by(
        UserID=staff_id,
        BusinessID=business_id,
        Role='staff'
    ).first()

    if not staff_member:
        return jsonify({'error': 'Staff member not found'}), 404

    db.session.delete(staff_member)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Staff account deleted'})