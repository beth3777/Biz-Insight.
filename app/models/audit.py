from app import db
from datetime import datetime

class AuditLog(db.Model):
    __tablename__ = 'tblAuditLog'

    LogID = db.Column(db.Integer, primary_key=True)
    UserID = db.Column(db.Integer, db.ForeignKey('tblUser.UserID'),
                       nullable=False)
    BusinessID = db.Column(db.Integer, nullable=False)
    Action = db.Column(db.String(100), nullable=False)
    Details = db.Column(db.String(500))
    IPAddress = db.Column(db.String(50))
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='audit_logs', lazy=True)

    def __repr__(self):
        return f'<AuditLog {self.Action}>'