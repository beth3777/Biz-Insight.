import pandas as pd
import numpy as np
from prophet import Prophet
from app.models.transaction import Transaction
from sqlalchemy import func


def generate_forecast(business_id, periods, db):
    try:
        # Get historical sales data — sales ONLY, never expenses
        results = db.session.query(
            Transaction.TransactionDate,
            func.sum(Transaction.TransactionAmount).label('total')
        ).filter(
            Transaction.BusinessID == business_id,
            Transaction.TransactionType == 'sale'
        ).group_by(
            Transaction.TransactionDate
        ).order_by(
            Transaction.TransactionDate
        ).all()

        if len(results) < 10:
            return {
                'success': False,
                'error': 'Not enough data. Please upload at least 10 days of sales data.'
            }

        # Build dataframe
        df = pd.DataFrame({
            'ds': pd.to_datetime([r.TransactionDate for r in results]),
            'y': [float(r.total) for r in results]
        })

        # ── FIX 1: Fill missing dates with 0 so Prophet
        # sees a complete time series ──
        full_range = pd.date_range(
            start=df['ds'].min(),
            end=df['ds'].max(),
            freq='D'
        )
        df = df.set_index('ds').reindex(full_range, fill_value=0).reset_index()
        df.columns = ['ds', 'y']

        # ── FIX 2: Set a floor of 0 so predictions
        # never go negative ──
        df['floor'] = 0
        df['cap'] = df['y'].max() * 2.5  # Reasonable ceiling

        # ── FIX 3: Remove outliers that could distort
        # the trend (values beyond 3 standard deviations) ──
        mean = df['y'].mean()
        std = df['y'].std()
        df['y'] = df['y'].clip(
            lower=0,
            upper=mean + (3 * std)
        )

        # ── FIX 4: Use logistic growth which respects
        # the floor and cap ──
        model = Prophet(
            growth='logistic',
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.80,  # 80% confidence — less extreme bounds
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05,  # Less aggressive trend changes
        )

        # Add Kenyan public holidays
        model.add_country_holidays(country_name='KE')
        model.fit(df)

        # Build future dataframe with floor and cap
        future = model.make_future_dataframe(periods=periods, freq='D')
        future['floor'] = 0
        future['cap'] = df['y'].max() * 2.5
        forecast_df = model.predict(future)

        # ── FIX 5: Clip all predictions to be >= 0 ──
        forecast_df['yhat'] = forecast_df['yhat'].clip(lower=0)
        forecast_df['yhat_lower'] = forecast_df['yhat_lower'].clip(lower=0)
        forecast_df['yhat_upper'] = forecast_df['yhat_upper'].clip(lower=0)

        # Split historical vs future
        last_historical_date = df['ds'].max()
        future_only = forecast_df[
            forecast_df['ds'] > last_historical_date
        ].copy()

        # Only return actual data days for historical
        # (skip the zero-filled gaps in display)
        actual_df = df[df['y'] > 0].copy()

        # Build trend description for the UI
        first_half = df['y'].iloc[:len(df)//2].mean()
        second_half = df['y'].iloc[len(df)//2:].mean()
        avg_predicted = future_only['yhat'].mean()

        if avg_predicted > second_half * 1.1:
            trend = 'upward'
        elif avg_predicted < second_half * 0.9:
            trend = 'downward'
        else:
            trend = 'stable'

        return {
            'success': True,
            'historical_dates': actual_df['ds'].dt.strftime('%Y-%m-%d').tolist(),
            'historical_values': actual_df['y'].round(2).tolist(),
            'dates': future_only['ds'].dt.strftime('%Y-%m-%d').tolist(),
            'predicted': future_only['yhat'].round(2).tolist(),
            'lower': future_only['yhat_lower'].round(2).tolist(),
            'upper': future_only['yhat_upper'].round(2).tolist(),
            'trend': trend,
            'data_points': len(actual_df),
            'avg_historical': round(float(actual_df['y'].mean()), 2),
            'avg_predicted': round(float(future_only['yhat'].mean()), 2)
        }

    except Exception as e:
        return {'success': False, 'error': str(e)}