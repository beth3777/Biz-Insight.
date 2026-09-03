from app import db
from datetime import datetime

class Transaction(db.Model):
    __tablename__ = 'tblTransaction'

    TransactionID = db.Column(db.Integer, primary_key=True)
    BusinessID = db.Column(db.Integer, db.ForeignKey('tblBusiness.BusinessID'), nullable=False)
    ProductID = db.Column(db.Integer, db.ForeignKey('tblProduct.ProductID'), nullable=False)
    TransactionDate = db.Column(db.Date, nullable=False)
    TransactionAmount = db.Column(db.Numeric(10, 2), nullable=False)
    Quantity = db.Column(db.Integer, default=1)
    TransactionType = db.Column(db.String(20), default='sale')

    def __repr__(self):
        return f'<Transaction {self.TransactionID}>'