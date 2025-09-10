# 🚀 Chemical Inventory System - Quick Reference Guide

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Common API Calls](#common-api-calls)
3. [Unit Conversion Examples](#unit-conversion-examples)
4. [Manufacturing Examples](#manufacturing-examples)
5. [Database Queries](#database-queries)
6. [Error Codes](#error-codes)
7. [Development Commands](#development-commands)

---

## 🚀 Quick Start

### **1. Start the Backend**
```bash
cd chemical-inventory-app/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **2. Test the API**
```bash
# Health check
curl http://localhost:8000/health

# API docs
open http://localhost:8000/docs
```

### **3. Database Setup**
```bash
# Run admin setup script
python scripts/setup_admin_user.py

# Check database connection
python -c "from app.database import check_database_connection; check_database_connection()"
```

---

## 🔌 Common API Calls

### **Authentication**
```bash
# Get user status
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  http://localhost:8000/user/status

# Get full user profile
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  http://localhost:8000/user/me
```

### **Chemical Management**
```bash
# Get all chemicals
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  "http://localhost:8000/chemicals?skip=0&limit=100"

# Create new chemical
curl -X POST -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Chemical", "unit": "g", "available_qty": 1000.0, "threshold_qty": 100.0}' \
  http://localhost:8000/chemicals
```

### **Manufacturing Operations**
```bash
# Check feasibility
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  "http://localhost:8000/manufacturing/feasibility/1?target_quantity=2&target_unit=kg"

# Manufacture product
curl -X POST -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  "http://localhost:8000/manufacturing/manufacture/1?target_quantity=2&target_unit=kg&note=Test batch"
```

---

## 🔄 Unit Conversion Examples

### **Mass Conversions**
```python
from app.services.unit_converter import UnitConverter

# Convert 2kg to grams
grams = UnitConverter.convert(2.0, "kg", "g")
print(f"2kg = {grams}g")  # Output: 2kg = 2000.0g

# Convert 500g to kg
kg = UnitConverter.convert(500.0, "g", "kg")
print(f"500g = {kg}kg")   # Output: 500g = 0.5kg

# Convert 1lb to grams
grams = UnitConverter.convert(1.0, "lb", "g")
print(f"1lb = {grams}g")  # Output: 1lb = 453.592g
```

### **Volume Conversions**
```python
# Convert 1.5 liters to milliliters
ml = UnitConverter.convert(1.5, "l", "ml")
print(f"1.5l = {ml}ml")   # Output: 1.5l = 1500.0ml

# Convert 1000ml to liters
liters = UnitConverter.convert(1000.0, "ml", "l")
print(f"1000ml = {liters}l")  # Output: 1000ml = 1.0l
```

### **Get Unit Information**
```python
# Get information about kg
kg_info = UnitConverter.get_unit_info("kg")
print(kg_info)
# Output: {
#   "unit": "kg", "type": "mass", "supported": true,
#   "is_base_unit": false, "conversion_factor": 1000.0,
#   "common_units": ["mg", "g", "kg", "lb", "oz"]
# }
```

---

## 🏭 Manufacturing Examples

### **Check Manufacturing Feasibility**
```python
from app.services.inventory_service import InventoryService

# Check if we can make 2kg of product ID 1
feasibility = inventory_service.check_manufacturing_feasibility(
    product_id=1,
    target_quantity=2.0,
    target_unit="kg"
)

if feasibility["feasible"]:
    print(f"Can manufacture {feasibility['target_quantity']}{feasibility['target_unit']}")
    print(f"Scale factor: {feasibility['scale_factor']:.3f}")
else:
    print(f"Cannot manufacture: {feasibility['error']}")
```

### **Manufacture Product**
```python
# Manufacture 1.5kg of product ID 1
result = inventory_service.manufacture_product(
    product_id=1,
    target_quantity=1.5,
    target_unit="kg",
    manufactured_by=user_id,
    note="Production batch for Q1"
)

print(f"Manufactured: {result['quantity_produced']}{result['target_unit']}")
print(f"Components consumed: {result['components_consumed']}")
```

---

## 🗄️ Database Queries

### **Get Chemical Stock**
```sql
-- Get all chemicals with stock info
SELECT 
    c.name,
    c.available_qty,
    c.unit,
    c.threshold_qty,
    c.is_manufactured
FROM chemicals c
ORDER BY c.name;

-- Get low stock chemicals
SELECT 
    c.name,
    c.available_qty,
    c.threshold_qty,
    c.unit
FROM chemicals c
WHERE c.available_qty <= c.threshold_qty;
```

### **Get Product Formulations**
```sql
-- Get complete formulation for product ID 1
SELECT 
    cp.name as product_name,
    cp.base_composition_qty,
    cp.unit as product_unit,
    c.name as component_name,
    f.quantity_required,
    f.unit as component_unit,
    ROUND((f.quantity_required / cp.base_composition_qty) * 100, 2) as percentage
FROM chemical_products cp
JOIN formulations f ON cp.id = f.product_id
JOIN chemicals c ON f.component_chemical_id = c.id
WHERE cp.id = 1
ORDER BY f.quantity_required DESC;
```

### **Get Stock Movements**
```sql
-- Get recent stock movements
SELECT 
    sm.timestamp,
    c.name as chemical_name,
    sm.change_type,
    sm.quantity_changed,
    sm.unit,
    sm.action
FROM stock_movements sm
JOIN chemicals c ON sm.chemical_id = c.id
ORDER BY sm.timestamp DESC
LIMIT 50;

-- Get stock movements for specific chemical
SELECT 
    sm.timestamp,
    sm.change_type,
    sm.quantity_changed,
    sm.unit,
    sm.action,
    sm.reference_type
FROM stock_movements sm
WHERE sm.chemical_id = 1
ORDER BY sm.timestamp DESC;
```

### **Get Manufacturing Summary**
```sql
-- Get products that can be manufactured
SELECT 
    cp.id,
    cp.name,
    cp.base_composition_qty,
    cp.unit,
    c.available_qty as current_stock,
    c.threshold_qty
FROM chemical_products cp
JOIN chemicals c ON cp.chemical_id = c.id
WHERE c.is_manufactured = true;
```

---

## 🚨 Error Codes

### **HTTP Status Codes**
| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid parameters, business rule violations |
| 401 | Unauthorized | Missing or invalid Firebase token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Validation Error | Invalid request body |
| 500 | Internal Error | System failure |

### **Common Error Messages**
```json
// Unit conversion error
{
  "detail": "Unit conversion error: Cannot convert kg to l. Cannot convert between different unit types: kg (mass) to l (volume)"
}

// Insufficient stock
{
  "detail": "Insufficient stock for manufacturing: [{'chemical_name': 'Sodium Chloride', 'available': 100.0, 'required': 500.0}]"
}

// Product not found
{
  "detail": "Product with ID 999 not found"
}
```

---

## 🛠️ Development Commands

### **Database Operations**
```bash
# Check database schema
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(engine)"

# Run migrations
python migrations/update_chemical_system.py

# Fix missing columns
python fix_missing_columns.py

# Setup admin user
python scripts/setup_admin_user.py
```

### **Testing**
```bash
# Test unit conversion
python -c "from app.services.unit_converter import UnitConverter; print(UnitConverter.convert(2, 'kg', 'g'))"

# Test database connection
python -c "from app.database import check_database_connection; check_database_connection()"

# Test API endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/health
```

### **Code Quality**
```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

---

## 📱 Frontend Integration

### **React Components**
```javascript
// Check manufacturing feasibility
const checkFeasibility = async (productId, targetQuantity, targetUnit) => {
  const response = await fetch(
    `/manufacturing/feasibility/${productId}?target_quantity=${targetQuantity}&target_unit=${targetUnit}`,
    {
      headers: { Authorization: `Bearer ${firebaseToken}` }
    }
  );
  return response.json();
};

// Manufacture product
const manufactureProduct = async (productId, targetQuantity, targetUnit, note) => {
  const response = await fetch(
    `/manufacturing/manufacture/${productId}?target_quantity=${targetQuantity}&target_unit=${targetUnit}&note=${note}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${firebaseToken}` }
    }
  );
  return response.json();
};
```

---

## 🔧 Configuration

### **Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/chemical_inventory

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
```

### **Database Configuration**
```python
# app/database.py
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/chemical_inventory")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

---

## 📚 Related Documentation

- **Full API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Database Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **System Architecture**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- **Installation Guide**: [../README.md](../README.md)

---

## 🆘 Quick Troubleshooting

### **Common Issues**

#### **1. Database Connection Failed**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check database URL
echo $DATABASE_URL

# Test connection
python -c "from app.database import check_database_connection; check_database_connection()"
```

#### **2. Firebase Authentication Failed**
```bash
# Check Firebase credentials
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_PRIVATE_KEY_ID

# Verify token format
# Token should be a valid Firebase ID token from frontend
```

#### **3. Unit Conversion Errors**
```python
# Check supported units
from app.services.unit_converter import UnitConverter
print(UnitConverter.get_unit_info("kg"))

# Verify unit types match
UnitConverter.can_convert("kg", "g")  # Should return True
UnitConverter.can_convert("kg", "l")  # Should return False
```

#### **4. Manufacturing Fails**
```python
# Check stock availability
from app.services.inventory_service import InventoryService
feasibility = inventory_service.check_manufacturing_feasibility(
    product_id=1, target_quantity=1.0, target_unit="kg"
)
print(feasibility)
```

---

## 📞 Support

For quick help:
1. Check this reference guide
2. Review error messages carefully
3. Check the full documentation
4. Examine code comments
5. Contact development team

---

*This quick reference guide provides common operations and examples. For detailed information, refer to the full documentation files.*

