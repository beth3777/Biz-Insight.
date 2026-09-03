from app import db
from datetime import datetime

class Forecast(db.Model):
    __tablename__ = 'tblForecast'

    ForecastID = db.Column(db.Integer, primary_key=True)
    BusinessID = db.Column(db.Integer, db.ForeignKey('tblBusiness.BusinessID'), nullable=False)
    ProductID = db.Column(db.Integer, db.ForeignKey('tblProduct.ProductID'), nullable=False)
    ForecastDate = db.Column(db.Date, nullable=False)
    PredictedSales = db.Column(db.Numeric(10, 2))
    ConfidenceLower = db.Column(db.Numeric(10, 2))
    ConfidenceUpper = db.Column(db.Numeric(10, 2))
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Forecast {self.ForecastID}>'