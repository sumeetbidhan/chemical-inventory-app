# 🧪 Chemical Inventory System - API Documentation

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Chemical Management](#chemical-management)
4. [Manufacturing Operations](#manufacturing-operations)
5. [Stock Management](#stock-management)
6. [Formulations](#formulations)
7. [Unit Conversion System](#unit-conversion-system)
8. [Error Handling](#error-handling)

---

## 🔐 Authentication

### Firebase Token Authentication
All API endpoints require Firebase authentication. Include the Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

---

## 👥 User Management

### Get Current User Status
```http
GET /user/status
```

**Response:**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "first_name": "Admin",
  "last_name": "User",
  "role_id": 1,
  "is_approved": true,
  "last_seen": "2024-01-15T10:30:00Z"
}
```

### Get Full User Profile
```http
GET /user/me
```

**Response:**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "first_name": "Admin",
  "last_name": "User",
  "role_id": 1,
  "is_approved": true,
  "last_seen": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Register New User
```http
POST /register
```

**Request Body:**
```json
{
  "uid": "firebase_uid_here",
  "email": "newuser@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role_id": 5
}
```

**Response:**
```json
{
  "id": 2,
  "email": "newuser@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role_id": 5,
  "is_approved": false,
  "message": "User registered successfully. Pending admin approval."
}
```

---

## 🧪 Chemical Management

### Get All Chemicals
```http
GET /chemicals?skip=0&limit=100
```

**Response:**
```json
{
  "chemicals": [
    {
      "id": 1,
      "name": "Sodium Chloride",
      "unit": "g",
      "available_qty": 5000.0,
      "threshold_qty": 100.0,
      "is_manufactured": false,
      "last_purchase": "2024-01-10T00:00:00Z"
    },
    {
      "id": 2,
      "name": "OSR16124",
      "unit": "g",
      "available_qty": 250.0,
      "threshold_qty": 50.0,
      "is_manufactured": true,
      "last_purchase": null
    }
  ],
  "total": 2
}
```

### Create New Chemical
```http
POST /chemicals
```

**Request Body:**
```json
{
  "name": "Potassium Hydroxide",
  "unit": "g",
  "available_qty": 1000.0,
  "threshold_qty": 200.0,
  "is_manufactured": false
}
```

### Update Chemical Stock
```http
PATCH /chemicals/{chemical_id}
```

**Request Body:**
```json
{
  "available_qty": 1200.0,
  "threshold_qty": 250.0
}
```

---

## 🏭 Manufacturing Operations

### Check Manufacturing Feasibility
```http
GET /manufacturing/feasibility/{product_id}?target_quantity=2&target_unit=kg
```

**Example: Check if we can make 2kg of OSR16124**

**Response:**
```json
{
  "feasible": true,
  "product_name": "OSR16124",
  "target_quantity": 2.0,
  "target_unit": "kg",
  "scale_factor": 19.97,
  "base_composition": 100.15,
  "base_composition_unit": "g",
  "components": [
    {
      "chemical_id": 1,
      "chemical_name": "Sodium Chloride",
      "required_quantity": 399.4,
      "required_unit": "g",
      "available_quantity": 5000.0,
      "available_unit": "g",
      "sufficient": true,
      "proportion": 25.0
    },
    {
      "chemical_id": 3,
      "chemical_name": "Water",
      "required_quantity": 1198.2,
      "required_unit": "ml",
      "available_quantity": 10000.0,
      "available_unit": "ml",
      "sufficient": true,
      "proportion": 75.0
    }
  ],
  "insufficient_components": []
}
```

### Manufacture Product
```http
POST /manufacturing/manufacture/{product_id}?target_quantity=2&target_unit=kg&note=Production batch for Q1"
```

**Example: Manufacture 2kg of OSR16124**

**Response:**
```json
{
  "success": true,
  "message": "Successfully manufactured 2kg of OSR16124",
  "result": {
    "product_name": "OSR16124",
    "target_quantity": 2.0,
    "target_unit": "kg",
    "scale_factor": 19.97,
    "components_consumed": 2,
    "quantity_produced": 2.0,
    "stock_movements": 3
  }
}
```

### Get Manufacturing Summary
```http
GET /manufacturing/summary/{product_id}
```

**Response:**
```json
{
  "product_id": 1,
  "product_name": "OSR16124",
  "base_composition_qty": 100.15,
  "unit": "g",
  "total_components": 2,
  "components": [
    {
      "chemical_id": 1,
      "chemical_name": "Sodium Chloride",
      "quantity_required": 20.0,
      "unit": "g",
      "proportion_percentage": 25.0,
      "available_quantity": 5000.0,
      "sufficient_for_1x": true
    },
    {
      "chemical_id": 3,
      "chemical_name": "Water",
      "quantity_required": 60.09,
      "unit": "ml",
      "proportion_percentage": 75.0,
      "available_quantity": 10000.0,
      "sufficient_for_1x": true
    }
  ]
}
```

### Get All Manufacturable Products
```http
GET /manufacturing/products?skip=0&limit=50
```

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "OSR16124",
      "base_composition_qty": 100.15,
      "unit": "g",
      "note": "Industrial cleaning solution",
      "created_by": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "last_updated": "2024-01-15T10:30:00Z",
      "can_manufacture_1x": true,
      "insufficient_components": 0,
      "unit_conversion_supported": true,
      "supported_units": ["mg", "g", "kg", "lb", "oz"]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### Get Manufacturing Stock Status
```http
GET /manufacturing/stock-status
```

**Response:**
```json
{
  "total_chemicals": 15,
  "low_stock_chemicals": 3,
  "low_stock_details": [
    {
      "id": 5,
      "name": "Acetic Acid",
      "available_qty": 50.0,
      "threshold_qty": 100.0,
      "unit": "ml",
      "is_manufactured": false
    }
  ],
  "stock_overview": {
    "raw_chemicals": 12,
    "manufactured_chemicals": 3,
    "total_available": 25000.0,
    "total_threshold": 5000.0
  }
}
```

---

## 📦 Stock Management

### Get Stock Movements
```http
GET /stock-movements?skip=0&limit=100
```

**Response:**
```json
{
  "stock_movements": [
    {
      "id": 1,
      "chemical_id": 1,
      "change_type": "DECREASE",
      "quantity_changed": 399.4,
      "unit": "g",
      "action": "Manufacturing Consumption",
      "reference_id": 1,
      "reference_type": "manufacturing",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### Record Stock Movement
```http
POST /stock-movements
```

**Request Body:**
```json
{
  "chemical_id": 1,
  "change_type": "INCREASE",
  "quantity_changed": 1000.0,
  "unit": "g",
  "action": "Purchase",
  "reference_id": 5,
  "reference_type": "purchase"
}
```

---

## 🧬 Formulations

### Get Formulation Details
```http
GET /manufacturing/formulation/{product_id}
```

**Response:**
```json
{
  "product_id": 1,
  "product_name": "OSR16124",
  "base_composition_qty": 100.15,
  "unit": "g",
  "components": [
    {
      "chemical_id": 1,
      "chemical_name": "Sodium Chloride",
      "quantity_required": 20.0,
      "unit": "g",
      "proportion_percentage": 25.0
    },
    {
      "chemical_id": 3,
      "chemical_name": "Water",
      "quantity_required": 60.09,
      "unit": "ml",
      "proportion_percentage": 75.0
    }
  ]
}
```

---

## 🔄 Unit Conversion System

### Supported Unit Types

#### Mass Units
- **mg** (milligrams) - Base unit: g
- **g** (grams) - Base unit
- **kg** (kilograms) - Base unit: g
- **lb** (pounds) - Base unit: g
- **oz** (ounces) - Base unit: g

#### Volume Units
- **ml** (milliliters) - Base unit
- **l** (liters) - Base unit: ml
- **gal** (gallons) - Base unit: ml
- **qt** (quarts) - Base unit: ml
- **fl_oz** (fluid ounces) - Base unit: ml

#### Length Units
- **mm** (millimeters) - Base unit: cm
- **cm** (centimeters) - Base unit
- **m** (meters) - Base unit: cm
- **in** (inches) - Base unit: cm
- **ft** (feet) - Base unit: cm

#### Count Units
- **piece** - Base unit
- **unit** - Base unit
- **dozen** - Base unit: piece
- **hundred** - Base unit: piece

#### Percentage Units
- **%** (percentage) - Base unit
- **ppm** (parts per million) - Base unit: %
- **ppb** (parts per billion) - Base unit: %

### Unit Conversion Examples

#### Manufacturing with Different Units

**Example 1: User wants 2kg of OSR16124**
```http
POST /manufacturing/manufacture/1?target_quantity=2&target_unit=kg
```

**System automatically:**
1. Converts 2kg → 2000g (base unit)
2. Calculates scale_factor = 2000/100.15 = 19.97
3. Scales all components proportionally
4. Handles unit conversions for each component

**Example 2: User wants 1.5 liters of cleaning solution**
```http
POST /manufacturing/manufacture/2?target_quantity=1.5&target_unit=l
```

**System automatically:**
1. Converts 1.5l → 1500ml (base unit)
2. Calculates scale_factor = 1500/500 = 3.0
3. Scales all components proportionally

### Unit Conversion API

#### Get Unit Information
```http
GET /unit-converter/info/{unit}
```

**Example:**
```http
GET /unit-converter/info/kg
```

**Response:**
```json
{
  "unit": "kg",
  "type": "mass",
  "supported": true,
  "is_base_unit": false,
  "conversion_factor": 1000.0,
  "common_units": ["mg", "g", "kg", "lb", "oz"]
}
```

#### Convert Between Units
```http
POST /unit-converter/convert
```

**Request Body:**
```json
{
  "value": 2.0,
  "from_unit": "kg",
  "to_unit": "g"
}
```

**Response:**
```json
{
  "original_value": 2.0,
  "original_unit": "kg",
  "converted_value": 2000.0,
  "converted_unit": "g",
  "conversion_factor": 1000.0
}
```

---

## 🚨 Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "detail": "Unit conversion error: Cannot convert kg to l. Cannot convert between different unit types: kg (mass) to l (volume)"
}
```

#### 401 Unauthorized
```json
{
  "detail": "Invalid Firebase token"
}
```

#### 404 Not Found
```json
{
  "detail": "Product with ID 999 not found"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Manufacturing failed: Database connection error"
}
```

### Error Codes Reference

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid units, insufficient stock, validation errors |
| 401 | Unauthorized | Missing or invalid Firebase token |
| 403 | Forbidden | Insufficient permissions for admin operations |
| 404 | Not Found | Resource doesn't exist |
| 422 | Validation Error | Invalid request body or parameters |
| 500 | Internal Server Error | Database errors, system failures |

---

## 🔧 Testing Examples

### Test Unit Conversion
```bash
# Test mass conversion
curl -X POST "http://localhost:8000/unit-converter/convert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"value": 2.5, "from_unit": "kg", "to_unit": "g"}'

# Expected: {"converted_value": 2500.0, "converted_unit": "g"}
```

### Test Manufacturing Feasibility
```bash
# Check if we can make 3kg of OSR16124
curl -X GET "http://localhost:8000/manufacturing/feasibility/1?target_quantity=3&target_unit=kg" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Test Product Manufacturing
```bash
# Manufacture 1.5kg of OSR16124
curl -X POST "http://localhost:8000/manufacturing/manufacture/1?target_quantity=1.5&target_unit=kg&note=Test batch" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## 📝 Notes

1. **Unit Consistency**: The system automatically handles unit conversions, but all calculations are done in base units for accuracy.

2. **Scale Factor Calculation**: 
   - `scale_factor = target_quantity_in_base_unit / base_composition_in_base_unit`
   - This ensures proportional scaling of all components

3. **Stock Validation**: Before manufacturing, the system checks if sufficient stock exists for all components after unit conversion.

4. **Audit Trail**: All manufacturing operations are logged with detailed information for compliance and tracking.

5. **Error Handling**: Comprehensive error messages help users understand what went wrong and how to fix it.

---

## 🔗 Related Documentation

- [Database Schema Documentation](./DATABASE_SCHEMA.md)
- [Installation Guide](../README.md)
- [Frontend Integration Guide](../web-client/README.md)
