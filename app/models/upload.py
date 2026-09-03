from app import db
from datetime import datetime

class Upload(db.Model):
    __tablename__ = 'tblUpload'

    UploadID = db.Column(db.Integer, primary_key=True)
    BusinessID = db.Column(db.Integer, db.ForeignKey('tblBusiness.BusinessID'), nullable=False)
    FileName = db.Column(db.String(255), nullable=False)
    RowsImported = db.Column(db.Integer, default=0)
    UploadedAt = db.Column(db.DateTime, default=datetime.utcnow)
    Status = db.Column(db.String(20), default='success')

    def __repr__(self):
        return f'<Upload {self.FileName}>'