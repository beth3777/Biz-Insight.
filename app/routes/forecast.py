from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.services.forecast_engine import generate_forecast
from app.utils import owner_required

forecast = Blueprint('forecast', __name__)


@forecast.route('/api/forecast/generate', methods=['POST'])
@login_required
@owner_required
def generate():
    business = Business.query.filter_by(
        UserID=current_user.UserID
    ).first()

    if not business:
        return jsonify({'error': 'No business found'}), 404

    data = request.get_json()
    periods = data.get('periods', 30)

    # Cap periods to reasonable range
    periods = max(7, min(int(periods), 90))

    result = generate_forecast(business.BusinessID, periods, db)

    if result['success']:
        return jsonify({
            'success': True,
            'dates': result['dates'],
            'predicted': result['predicted'],
            'lower': result['lower'],
            'upper': result['upper'],
            'historical_dates': result['historical_dates'],
            'historical_values': result['historical_values'],
            'trend': result['trend'],
            'data_points': result['data_points'],
            'avg_historical': result['avg_historical'],
            'avg_predicted': result['avg_predicted']
        })
    else:
        return jsonify({'error': result['error']}), 400