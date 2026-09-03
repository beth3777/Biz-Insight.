from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.utils import owner_required

settings_bp = Blueprint('settings_bp', __name__)


@settings_bp.route('/api/settings', methods=['GET'])
@login_required
@owner_required
def get_settings():
    business = Business.query.filter_by(
        UserID=current_user.UserID
    ).first()
    return jsonify({
        'username': current_user.UserName,
        'email': current_user.UserEmail,
        'business_name': business.BusinessName if business else '',
        'business_industry': business.BusinessIndustry if business else '',
        'business_currency': business.BusinessCurrency if business else 'KES'
    })


@settings_bp.route('/api/settings/business', methods=['POST'])
@login_required
@owner_required
def update_business():
    data = request.get_json()
    business = Business.query.filter_by(
        UserID=current_user.UserID
    ).first()

    if not business:
        return jsonify({'error': 'Business not found'}), 404

    if data.get('business_name'):
        business.BusinessName = data['business_name'].strip()
    if data.get('business_industry'):
        business.BusinessIndustry = data['business_industry'].strip()
    if data.get('business_currency'):
        business.BusinessCurrency = data['business_currency'].strip()

    db.session.commit()
    return jsonify({'success': True,
                    'message': 'Business details updated successfully'})


@settings_bp.route('/api/settings/password', methods=['POST'])
@login_required
@owner_required
def update_password():
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    current_user.set_password(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Password updated successfully'})