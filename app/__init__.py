from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    login_manager.login_view = 'auth.login'

    from .models.user import User
    from .models.business import Business
    from .models.product import Product
    from .models.transaction import Transaction
    from .models.forecast import Forecast
    from .models.upload import Upload
    from .models.audit import AuditLog

    from .routes.auth import auth
    from .routes.dashboard import dashboard
    from .routes.data_upload import data_upload
    from .routes.forecast import forecast
    from .routes.reports import reports
    from .routes.notifications import notifications
    from .routes.inventory import inventory
    from .routes.staff import staff_bp
    from .routes.settings import settings_bp
    from .routes.data_entry import data_entry
    from .routes.audit import audit_bp
    
    app.register_blueprint(audit_bp)
    app.register_blueprint(data_entry)
    app.register_blueprint(settings_bp)
    app.register_blueprint(inventory)
    app.register_blueprint(notifications)
    app.register_blueprint(auth)
    app.register_blueprint(dashboard)
    app.register_blueprint(data_upload)
    app.register_blueprint(forecast)
    app.register_blueprint(reports)
    app.register_blueprint(staff_bp)
   
   # Serve index page
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    # Register 404 handler
    @app.errorhandler(404)
    def page_not_found(e):
        return app.send_static_file('404.html'), 404

    return app

    return app
