# BizInsight DSS 📊

### Data-Driven Decision Support System for Kenyan SMEs

BizInsight DSS is a web-based Decision Support System designed to help Kenyan small and medium-sized businesses transform their business data into actionable insights.

The system allows business owners to upload and manage business data, monitor key performance indicators, forecast future sales, track inventory, generate reports, manage staff access, and maintain an audit trail.

---

## 🚀 Project Overview

Many small businesses rely on paper records, M-Pesa statements, spreadsheets, and intuition to make business decisions.

BizInsight DSS was developed to provide SME owners with a simple platform for understanding their business performance and making more informed decisions using their existing business data.

The system was developed with the Kenyan SME environment in mind, including support for KES currency and Kenyan public holidays for sales forecasting.

---

## ✨ Key Features

### 📊 KPI Dashboard
Provides an overview of important business performance indicators including:

- Sales performance
- Business KPIs
- Product performance
- Revenue trends
- Business summaries

### 🤖 AI-Powered Sales Forecasting

Uses Facebook Prophet to generate:

- 30-day sales forecasts
- 60-day sales forecasts
- 90-day sales forecasts
- Forecast confidence intervals
- Trend classifications

The forecasting pipeline also processes business data before forecasting by handling missing dates and extreme values.

### 📦 Inventory Tracking

Provides inventory insights based on product sales activity and sales velocity to help business owners monitor stock levels.

### 📁 Data Import

Business data can be uploaded using:

- CSV files
- Excel files

Uploaded data is processed and stored in PostgreSQL.

### 📄 Reports

The system allows users to generate and export business reports in:

- Excel
- PDF

### 👥 Role-Based Access Control

The system supports different user roles:

**Owner**
- Access to financial and business information
- Dashboard
- Forecasting
- Reports
- Staff management
- Audit logs

**Staff**
- Access to permitted operational functionality
- Restricted access to sensitive owner information

### 🔔 Notifications

Provides business notifications and alerts to help users identify important events.

### 📝 Audit Logging

Important system and user activities are recorded through an audit trail to improve accountability and traceability.

---

## 🛠️ Technology Stack

### Backend
- Python
- Flask
- Flask-SQLAlchemy

### Database
- PostgreSQL 16

### Frontend
- HTML5
- CSS3
- JavaScript
- Chart.js

### Data & AI
- Pandas
- Facebook Prophet

### Security
- Authentication
- Password hashing with bcrypt
- Role-Based Access Control (RBAC)
- Audit logging

---

## 🏗️ System Architecture

BizInsight DSS follows a three-tier architecture.

```text
┌─────────────────────────────┐
│       Presentation Layer    │
│                             │
│ HTML5 • CSS3 • JavaScript   │
│          Chart.js           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Application Layer     │
│                             │
│           Flask             │
│                             │
│ • Authentication            │
│ • Business Logic            │
│ • KPI Engine                │
│ • Forecast Engine           │
│ • Data Processing           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Data Layer         │
│                             │
│       PostgreSQL 16         │
│                             │
│ • Users                     │
│ • Businesses                │
│ • Products                  │
│ • Transactions              │
│ • Forecasts                 │
│ • Audit Logs                │
└─────────────────────────────┘
```

---

## 🔮 Forecasting Pipeline

The sales forecasting process follows several stages:

```text
Business Data
      ↓
Data Validation
      ↓
Missing Date Handling
      ↓
Outlier Processing
      ↓
Forecast Preparation
      ↓
Facebook Prophet
      ↓
30 / 60 / 90 Day Forecast
      ↓
Forecast Statistics
      ↓
Dashboard Visualization
```

The forecasting system incorporates Kenyan public holidays and applies constraints to prevent unrealistic negative predictions.

---

## 🔐 Security

Security was considered throughout the application.

The system includes:

- User authentication
- Password hashing
- Owner and Staff roles
- Server-side authorization
- Protected owner functionality
- Audit logging
- Access restrictions for sensitive information

---

## 🧪 Testing

The application was tested using structured test cases covering:

- Authentication
- Data upload
- Forecasting
- Reports
- Staff management
- Database operations
- System outputs

### Testing Results

**25 test cases were executed and all 25 passed.**

```text
Test Cases: 25
Passed:     25
Failed:      0
```

All 13 documented functional requirements were implemented and verified.

---

## 📈 Example Use Case

A Kenyan SME owner can:

1. Register and create a business account.
2. Upload historical sales data.
3. View business KPIs through the dashboard.
4. Identify top-performing products.
5. Generate future sales forecasts.
6. Monitor inventory.
7. Generate business reports.
8. Add staff members with restricted permissions.
9. Review activity through the audit log.

---

## 📚 What I Learned

Developing BizInsight DSS gave me practical experience in:

- Full-stack web development
- Python and Flask
- PostgreSQL database design
- Data processing
- Data visualization
- AI-assisted sales forecasting
- Authentication
- Role-Based Access Control
- Software testing
- Report generation
- System architecture
- Requirements analysis
- Technical documentation

The project also strengthened my understanding of how software can be designed around real business problems rather than simply focusing on technical functionality.

---

## 🔭 Future Improvements

Potential future improvements include:

- M-Pesa PDF statement parsing
- M-Pesa Daraja API integration
- Improved mobile responsiveness
- Email-based business summaries
- Automated restock recommendations
- What-if business modelling
- Long-term forecast accuracy evaluation

---

## 👩‍💻 Developer

**Beth Wanjiru Kimaku**

BBIT Student | Software Development & QA Enthusiast

### Connect With Me

- GitHub: [Add your GitHub profile]
- LinkedIn: [Add your LinkedIn profile]
- Email: [Add your email]

---

## 📌 Project Status

**Completed**

BizInsight DSS was developed as a final-year software development project and includes a functional web application, database, forecasting engine, authentication, role-based access control, reporting, inventory functionality, notifications, and audit logging.