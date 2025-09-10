# 🏗️ Chemical Inventory System - System Architecture

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Service Layer Architecture](#service-layer-architecture)
5. [API Layer Architecture](#api-layer-architecture)
6. [Authentication & Security](#authentication--security)
7. [Database Architecture](#database-architecture)
8. [Unit Conversion System](#unit-conversion-system)
9. [Manufacturing Workflow](#manufacturing-workflow)
10. [Error Handling & Logging](#error-handling--logging)
11. [Performance & Scalability](#performance--scalability)
12. [Deployment Architecture](#deployment-architecture)

---

## 🎯 System Overview

The Chemical Inventory System is a **FastAPI-based backend** that provides comprehensive chemical management, manufacturing operations, and stock tracking capabilities. The system follows a **layered architecture** pattern with clear separation of concerns.

### **Core Principles**
- **Unified Chemical Management**: Single system for raw and manufactured chemicals
- **Automatic Unit Conversion**: Seamless handling of different measurement units
- **Proportional Scaling**: Intelligent manufacturing based on target quantities
- **Complete Audit Trail**: Full tracking of all system changes
- **Role-Based Access Control**: Secure access based on user roles

---

## 🧩 Architecture Components

### **1. Presentation Layer (Frontend)**
```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │   Login     │ │   Admin     │ │   Manufacturing     │  │
│  │   Page      │ │  Dashboard  │ │     Interface       │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **2. API Gateway Layer (FastAPI)**
```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │   CORS      │ │  Middleware │ │   Error Handling    │  │
│  │ Middleware  │ │   Stack     │ │     Middleware      │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **3. Router Layer (API Endpoints)**
```
┌─────────────────────────────────────────────────────────────┐
│                    API Routers                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │   Auth      │ │   Admin     │ │   Manufacturing     │  │
│  │  Router     │ │   Router    │ │     Router          │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │  Chemical   │ │   Stock     │ │   User Router       │  │
│  │   Router    │ │   Router    │ │                     │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **4. Service Layer (Business Logic)**
```
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Inventory Service                       │  │
│  │  • Manufacturing Operations                         │  │
│  │  • Stock Management                                 │  │
│  │  • Feasibility Checking                             │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Unit Converter Service                 │  │
│  │  • Mass Conversions (mg, g, kg, lb, oz)           │  │
│  │  • Volume Conversions (ml, l, gal, qt)            │  │
│  │  • Length Conversions (mm, cm, m, in, ft)         │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **5. Data Access Layer (CRUD Operations)**
```
┌─────────────────────────────────────────────────────────────┐
│                   CRUD Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │   User      │ │  Chemical   │ │   Formulation       │  │
│  │    CRUD     │ │    CRUD     │ │      CRUD           │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │  Chemical   │ │   Stock     │ │   Activity Log      │  │
│  │  Product    │ │  Movement   │ │      CRUD           │  │
│  │    CRUD     │ │    CRUD     │ │                     │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **6. Database Layer (PostgreSQL)**
```
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │    Users    │ │  Chemicals  │ │   Formulations      │  │
│  │    Table    │ │    Table    │ │      Table          │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │   Stock     │ │   Activity  │ │   Other Tables      │  │
│  │ Movements   │ │     Logs    │ │                     │  │
│  │   Table     │ │    Table    │ │                     │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌊 Data Flow Architecture

### **1. User Authentication Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│  Firebase   │───▶│   Backend   │───▶│  Database   │
│   Login     │    │  Auth      │    │   Token     │    │   User      │
│             │    │             │    │ Validation  │    │  Creation   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### **2. Manufacturing Request Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│   API      │───▶│  Inventory  │───▶│  Database   │
│  Request    │    │  Router    │    │  Service    │    │  Updates    │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Response  │◀───│   Response  │◀───│   Result    │◀───│  Stock      │
│  Display    │    │   Format    │    │  Processing │    │  Changes    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### **3. Stock Monitoring Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Database   │───▶│   Alert     │───▶│  Notification│───▶│   Frontend  │
│   Changes   │    │  Service    │    │   Service   │    │   Display   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 🔧 Service Layer Architecture

### **1. Inventory Service (`inventory_service.py`)**
```python
class InventoryService:
    """
    Core business logic for inventory management and manufacturing
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # Manufacturing Operations
    def manufacture_product(self, product_id: int, target_quantity: float, 
                          target_unit: str, manufactured_by: int) -> Dict
    
    def check_manufacturing_feasibility(self, product_id: int, 
                                      target_quantity: float, 
                                      target_unit: str) -> Dict
    
    # Stock Management
    def update_stock(self, chemical_id: int, quantity: float, 
                    change_type: ChangeType) -> bool
    
    def get_stock_summary(self) -> Dict
    
    # Activity Logging
    def _log_activity(self, user_id: int, action: str, 
                     description: str, new_value: Dict = None)
```

**Key Responsibilities:**
- Manufacturing process orchestration
- Stock availability validation
- Unit conversion coordination
- Activity logging and audit trails

### **2. Unit Converter Service (`unit_converter.py`)**
```python
class UnitConverter:
    """
    Handles automatic unit conversions for chemical quantities
    """
    
    # Supported unit types
    CONVERSION_FACTORS = {
        UnitType.MASS: {"mg": 0.001, "g": 1.0, "kg": 1000.0, ...},
        UnitType.VOLUME: {"ml": 1.0, "l": 1000.0, "gal": 3785.41, ...},
        UnitType.LENGTH: {"mm": 0.1, "cm": 1.0, "m": 100.0, ...}
    }
    
    @classmethod
    def convert(cls, value: float, from_unit: str, to_unit: str) -> float
    
    @classmethod
    def convert_to_base_unit(cls, value: float, unit: str) -> Tuple[float, str]
    
    @classmethod
    def get_unit_info(cls, unit: str) -> Dict
```

**Key Responsibilities:**
- Automatic unit type detection
- Conversion factor management
- Base unit calculations
- Unit validation and error handling

---

## 🌐 API Layer Architecture

### **1. Router Structure**
```
app/
├── routers/
│   ├── __init__.py
│   ├── auth.py              # Authentication endpoints
│   ├── admin.py             # Admin operations
│   ├── user.py              # User management
│   ├── chemical.py          # Chemical CRUD
│   ├── manufacturing.py     # Manufacturing operations
│   ├── stock.py             # Stock management
│   └── activity.py          # Activity logging
```

### **2. Endpoint Patterns**
```python
@router.post("/manufacture/{product_id}")
def manufacture_product(
    product_id: int,
    target_quantity: float = Query(...),
    target_unit: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Standard endpoint pattern:
    1. Parameter validation
    2. Service layer call
    3. Error handling
    4. Response formatting
    """
```

### **3. Dependency Injection**
```python
# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication dependency
def get_current_user(
    token: dict = Depends(get_firebase_token),
    db: Session = Depends(get_db)
) -> User:
    # Firebase token validation
    # User retrieval from database
    return user
```

---

## 🔐 Authentication & Security

### **1. Firebase Integration**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│  Firebase   │───▶│   Backend   │
│   Token     │    │  Token      │    │  Validation │
│  Request    │    │  Validation │    │   & User    │
│             │    │             │    │  Retrieval  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### **2. Role-Based Access Control**
```python
# Role hierarchy
ROLES = {
    1: "ADMIN",           # Full system access
    2: "LAB_STAFF",       # Lab operations
    3: "PRODUCT_TEAM",    # Manufacturing
    4: "ACCOUNT_TEAM",    # Purchasing
    5: "ALL_USERS"        # Basic access
}

# Permission checking
def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
```

### **3. Security Features**
- **Firebase Token Validation**: Secure authentication
- **CORS Middleware**: Cross-origin request handling
- **Input Validation**: Pydantic schema validation
- **SQL Injection Protection**: SQLAlchemy ORM
- **Audit Logging**: Complete activity tracking

---

## 🗄️ Database Architecture

### **1. Database Design Principles**
```
┌─────────────────────────────────────────────────────────────┐
│                   Database Design                          │
│                                                             │
│  • Single Source of Truth (chemicals table)               │
│  • Normalized Structure (3NF compliance)                  │
│  • Referential Integrity (foreign key constraints)        │
│  • Audit Trail (complete change tracking)                 │
│  • Performance Optimization (strategic indexing)           │
└─────────────────────────────────────────────────────────────┘
```

### **2. Table Relationships**
```sql
-- Core relationships
users.role_id → roles.id
chemical_products.chemical_id → chemicals.id
formulations.product_id → chemical_products.id
formulations.component_chemical_id → chemicals.id
stock_movements.chemical_id → chemicals.id
purchases.chemical_id → chemicals.id
```

### **3. Data Integrity**
- **Foreign Key Constraints**: Maintain referential integrity
- **Check Constraints**: Validate data ranges and formats
- **Unique Constraints**: Prevent duplicate entries
- **Not Null Constraints**: Ensure required data

---

## 🔄 Unit Conversion System

### **1. Conversion Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                Unit Conversion Flow                        │
│                                                             │
│  1. User Input: "2kg"                                     │
│  2. Unit Detection: MASS type                             │
│  3. Base Unit Conversion: 2kg → 2000g                     │
│  4. Scale Factor Calculation: 2000g / 100.15g = 19.97     │
│  5. Component Scaling: All × 19.97                        │
│  6. Unit Harmonization: Convert to component units        │
└─────────────────────────────────────────────────────────────┘
```

### **2. Supported Unit Types**
```
MASS: mg, g, kg, lb, oz
VOLUME: ml, l, gal, qt, fl_oz
LENGTH: mm, cm, m, in, ft
COUNT: piece, unit, dozen, hundred
PERCENTAGE: %, ppm, ppb
```

### **3. Conversion Factors**
```python
# Example: Mass conversions (base unit: g)
CONVERSION_FACTORS = {
    "mg": 0.001,      # 1 mg = 0.001 g
    "g": 1.0,         # 1 g = 1 g (base unit)
    "kg": 1000.0,     # 1 kg = 1000 g
    "lb": 453.592,    # 1 lb = 453.592 g
    "oz": 28.3495     # 1 oz = 28.3495 g
}
```

---

## 🏭 Manufacturing Workflow

### **1. Complete Manufacturing Process**
```
┌─────────────────────────────────────────────────────────────┐
│                Manufacturing Workflow                      │
│                                                             │
│  1. User Request: "Make 2kg of OSR16124"                 │
│  2. Feasibility Check: Stock validation                   │
│  3. Unit Conversion: 2kg → 2000g                         │
│  4. Scale Calculation: 2000g / 100.15g = 19.97           │
│  5. Component Scaling: All × 19.97                       │
│  6. Stock Consumption: Decrease component stock           │
│  7. Product Production: Increase product stock            │
│  8. Audit Trail: Record all movements                     │
│  9. Activity Logging: User and system actions             │
└─────────────────────────────────────────────────────────────┘
```

### **2. Feasibility Validation**
```python
def check_manufacturing_feasibility(self, product_id: int, 
                                  target_quantity: float, 
                                  target_unit: str) -> Dict:
    """
    Comprehensive feasibility checking:
    1. Unit conversion validation
    2. Scale factor calculation
    3. Component stock availability
    4. Insufficient stock identification
    5. Detailed feasibility report
    """
```

### **3. Stock Management**
```python
def manufacture_product(self, product_id: int, target_quantity: float, 
                      target_unit: str, manufactured_by: int) -> Dict:
    """
    Manufacturing execution:
    1. Stock validation
    2. Component consumption
    3. Product production
    4. Movement recording
    5. Activity logging
    """
```

---

## 🚨 Error Handling & Logging

### **1. Error Handling Strategy**
```python
# Layered error handling
try:
    # Business logic
    result = inventory_service.manufacture_product(...)
except ValueError as e:
    # Business logic errors (insufficient stock, invalid units)
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    # System errors (database, network)
    logger.error(f"Manufacturing failed: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### **2. Logging Architecture**
```python
# Activity logging
def _log_activity(self, user_id: int, action: str, 
                 description: str, new_value: Dict = None):
    """
    Comprehensive activity tracking:
    1. User attribution
    2. Action description
    3. State changes
    4. Timestamp recording
    5. Context preservation
    """
```

### **3. Error Categories**
- **400 Bad Request**: Invalid input, business rule violations
- **401 Unauthorized**: Authentication failures
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **422 Validation Error**: Schema validation failures
- **500 Internal Error**: System failures

---

## ⚡ Performance & Scalability

### **1. Database Optimization**
```sql
-- Strategic indexing
CREATE INDEX idx_chemicals_name ON chemicals(name);
CREATE INDEX idx_formulations_product ON formulations(product_id);
CREATE INDEX idx_stock_movements_timestamp ON stock_movements(timestamp);

-- Query optimization
SELECT c.*, f.quantity_required 
FROM chemicals c
JOIN formulations f ON c.id = f.component_chemical_id
WHERE f.product_id = ?;
```

### **2. Caching Strategy**
```python
# Potential caching layers
CACHE_STRATEGIES = {
    "chemical_stock": "Redis cache for frequent stock queries",
    "formulation_cache": "In-memory cache for product recipes",
    "user_permissions": "Session-based permission caching"
}
```

### **3. Scalability Considerations**
- **Horizontal Scaling**: Multiple API instances behind load balancer
- **Database Scaling**: Read replicas for reporting queries
- **Async Operations**: Background processing for heavy operations
- **Connection Pooling**: Efficient database connection management

---

## 🚀 Deployment Architecture

### **1. Production Environment**
```
┌─────────────────────────────────────────────────────────────┐
│                   Production Architecture                  │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Load      │    │   API       │    │  PostgreSQL │    │
│  │  Balancer   │───▶│  Instances  │───▶│  Database   │    │
│  │             │    │  (Multiple) │    │             │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Redis     │    │   File      │    │   Log       │    │
│  │   Cache     │    │   Storage   │    │  Aggregator │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### **2. Environment Configuration**
```python
# Environment-based configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    DATABASE_URL = os.getenv("DATABASE_URL")
    REDIS_URL = os.getenv("REDIS_URL")
    LOG_LEVEL = "INFO"
else:
    DATABASE_URL = "postgresql://localhost/chemical_inventory"
    REDIS_URL = "redis://localhost:6379"
    LOG_LEVEL = "DEBUG"
```

### **3. Monitoring & Health Checks**
```python
# Health check endpoints
@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": check_database_connection(),
        "services": check_service_health()
    }
```

---

## 📊 System Metrics & Monitoring

### **1. Key Performance Indicators**
- **API Response Times**: Average response time per endpoint
- **Database Query Performance**: Slow query identification
- **Error Rates**: 4xx and 5xx error percentages
- **Stock Movement Volume**: Manufacturing and purchase activity
- **User Activity**: Active users and session duration

### **2. Monitoring Tools**
```python
# Potential monitoring integration
MONITORING_TOOLS = {
    "metrics": "Prometheus + Grafana",
    "logging": "ELK Stack (Elasticsearch, Logstash, Kibana)",
    "tracing": "Jaeger for distributed tracing",
    "alerting": "AlertManager for critical issues"
}
```

---

## 🔮 Future Enhancements

### **1. Planned Features**
- **Real-time Notifications**: WebSocket integration for live updates
- **Advanced Analytics**: Manufacturing efficiency reports
- **Mobile API**: Optimized endpoints for mobile applications
- **Batch Operations**: Bulk manufacturing and stock updates
- **Integration APIs**: Third-party system integration

### **2. Scalability Improvements**
- **Microservices**: Break down into smaller, focused services
- **Event-Driven Architecture**: Message queues for async processing
- **API Versioning**: Support for multiple API versions
- **Rate Limiting**: API usage throttling and quotas

---

## 📚 Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Installation Guide](../README.md)
- [Unit Conversion Guide](./app/services/unit_converter.py)
- [Manufacturing Guide](./app/services/inventory_service.py)

---

## 🆘 Support & Maintenance

### **1. Development Workflow**
- **Code Review**: All changes require peer review
- **Testing**: Unit tests for all business logic
- **Documentation**: Update docs with code changes
- **Deployment**: Automated deployment with rollback capability

### **2. Maintenance Procedures**
- **Database Backups**: Daily automated backups
- **Log Rotation**: Automated log management
- **Performance Monitoring**: Regular performance reviews
- **Security Updates**: Regular dependency updates

---

## 📞 Contact & Support

For system architecture questions or enhancement requests:
1. Review this documentation
2. Check API documentation
3. Examine code comments
4. Contact development team

---

*This document provides a comprehensive overview of the Chemical Inventory System architecture. For specific implementation details, refer to the individual component documentation and source code.*

