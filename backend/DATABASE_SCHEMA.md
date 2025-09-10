# 🗄️ Chemical Inventory System - Database Schema Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Relationship Diagrams](#relationship-diagrams)
4. [Data Flow](#data-flow)
5. [Key Concepts](#key-concepts)
6. [Schema Details](#schema-details)
7. [Indexes and Constraints](#indexes-and-constraints)
8. [Sample Data](#sample-data)

---

## 🎯 Overview

The Chemical Inventory System uses a **unified chemical management approach** where:
- **`chemicals`** table is the **central hub** for all stock management
- **`chemical_products`** table defines **manufacturable products** and their base compositions
- **`formulations`** table contains **recipes** referencing chemicals from the `chemicals` table
- **`stock_movements`** table tracks **all quantity changes** for audit and compliance

### 🏗️ Architecture Principles
1. **Single Source of Truth**: All chemical stock is managed in the `chemicals` table
2. **Unified Stock Management**: Raw chemicals and manufactured products share the same stock system
3. **Proportional Scaling**: Formulations scale proportionally based on target quantities
4. **Automatic Unit Conversion**: System handles unit conversions internally
5. **Complete Audit Trail**: Every stock change is recorded with context

---

## 🗂️ Core Tables

### 1. **`roles`** - User Role Definitions
```sql
CREATE TABLE roles (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
```

**Purpose**: Defines user roles and permissions
**Key Roles**:
- `1` - ADMIN (Full system access)
- `2` - LAB_STAFF (Lab operations)
- `3` - PRODUCT_TEAM (Manufacturing)
- `4` - ACCOUNT_TEAM (Purchasing)
- `5` - ALL_USERS (Basic access)

### 2. **`users`** - User Accounts
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL,  -- Firebase UID
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),            -- Optional
    role_id INTEGER NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: User authentication and role management
**Key Fields**:
- `uid`: Firebase authentication identifier
- `role_id`: Links to `roles.id`
- `is_approved`: Admin approval status
- `last_seen`: Online status tracking

### 3. **`chemicals`** - Central Chemical Stock Management
```sql
CREATE TABLE chemicals (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    unit VARCHAR(50) NOT NULL,           -- g, kg, ml, l, etc.
    available_qty FLOAT DEFAULT 0.0,    -- Current stock
    threshold_qty FLOAT DEFAULT 0.0,    -- Low stock alert
    is_manufactured BOOLEAN DEFAULT FALSE, -- Raw vs manufactured
    last_purchase TIMESTAMP,            -- Last purchase date
    updated_at TIMESTAMP
);
```

**Purpose**: **Single source of truth** for all chemical stock
**Key Concepts**:
- **Raw Chemicals**: `is_manufactured = FALSE` (purchased from suppliers)
- **Manufactured Chemicals**: `is_manufactured = TRUE` (produced in-house)
- **Unified Stock**: Both types share the same stock management system

### 4. **`chemical_products`** - Product Definitions
```sql
CREATE TABLE chemical_products (
    id INTEGER PRIMARY KEY,
    chemical_id INTEGER NOT NULL,        -- Links to chemicals.id
    name VARCHAR(255) UNIQUE NOT NULL,   -- Product name (e.g., OSR16124)
    base_composition_qty FLOAT NOT NULL, -- Base recipe total (e.g., 100.15g)
    unit VARCHAR(50) NOT NULL,           -- Unit for base composition
    note TEXT,                           -- Product description
    created_by INTEGER NOT NULL,         -- User who created
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP
);
```

**Purpose**: Defines **manufacturable products** and their base compositions
**Key Concepts**:
- **Base Composition**: The "100%" recipe (e.g., 100.15g = 100%)
- **Proportional Scaling**: All formulations scale relative to this base
- **No Stock Management**: This table only defines products, doesn't track stock

### 5. **`formulations`** - Chemical Recipes
```sql
CREATE TABLE formulations (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,         -- Links to chemical_products.id
    component_chemical_id INTEGER NOT NULL, -- Links to chemicals.id
    quantity_required FLOAT NOT NULL,    -- Amount needed for base recipe
    unit VARCHAR(50) NOT NULL,           -- Unit for this component
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: Defines **recipes** for manufacturing products
**Key Concepts**:
- **Component References**: Each component points to a chemical in the `chemicals` table
- **Absolute Quantities**: `quantity_required` is the absolute amount for 100% recipe
- **Proportional Scaling**: Quantities scale proportionally with target production

### 6. **`stock_movements`** - Stock Change Audit Trail
```sql
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY,
    chemical_id INTEGER NOT NULL,        -- Links to chemicals.id
    change_type VARCHAR(20) NOT NULL,    -- INCREASE or DECREASE
    quantity_changed FLOAT NOT NULL,     -- Amount changed
    unit VARCHAR(50) NOT NULL,           -- Unit for the change
    action VARCHAR(255) NOT NULL,        -- Description of action
    reference_id INTEGER,                -- Related record ID
    reference_type VARCHAR(50),          -- Type of related record
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: **Complete audit trail** of all stock changes
**Key Concepts**:
- **Every Change**: Records every stock increase/decrease
- **Context Tracking**: Links changes to specific actions (purchase, manufacturing, etc.)
- **Compliance**: Essential for regulatory compliance and traceability

### 7. **`purchases`** - Chemical Purchases
```sql
CREATE TABLE purchases (
    id INTEGER PRIMARY KEY,
    chemical_id INTEGER NOT NULL,        -- Links to chemicals.id
    quantity FLOAT NOT NULL,             -- Purchased quantity
    unit VARCHAR(50) NOT NULL,           -- Unit for purchase
    amount DECIMAL(10,2),                -- Purchase cost
    supplier VARCHAR(255),               -- Supplier name
    purchase_date TIMESTAMP,             -- Date of purchase
    created_by INTEGER NOT NULL          -- User who recorded purchase
);
```

**Purpose**: Tracks chemical purchases and costs
**Key Concepts**:
- **Cost Tracking**: Records purchase amounts for financial reporting
- **Supplier Management**: Tracks chemical sources
- **Stock Updates**: Purchases automatically increase `chemicals.available_qty`

### 8. **`alerts`** - System Alerts
```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    chemical_id INTEGER NOT NULL,        -- Links to chemicals.id
    alert_type VARCHAR(50) NOT NULL,     -- LOW_STOCK, EXPIRED, etc.
    message TEXT NOT NULL,               -- Alert description
    is_active BOOLEAN DEFAULT TRUE,      -- Active status
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP                -- When resolved
);
```

**Purpose**: System-wide alerting for stock issues
**Key Concepts**:
- **Low Stock Alerts**: Triggered when `available_qty <= threshold_qty`
- **Manufacturing Alerts**: OTP expiration, insufficient components
- **Alert Management**: Track alert status and resolution

### 9. **`notifications`** - User Notifications
```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,            -- Links to users.id
    title VARCHAR(255) NOT NULL,         -- Notification title
    message TEXT NOT NULL,               -- Notification content
    is_read BOOLEAN DEFAULT FALSE,       -- Read status
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: User-specific notifications and alerts
**Key Concepts**:
- **Personalized Alerts**: User-specific notifications
- **Read Tracking**: Track which notifications have been read
- **Real-time Updates**: Keep users informed of system changes

### 10. **`activity_logs`** - System Activity Tracking
```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,                     -- Links to users.id (nullable for system events)
    action VARCHAR(100) NOT NULL,        -- Action performed
    description TEXT,                    -- Detailed description
    old_value TEXT,                      -- Previous state (JSON)
    new_value TEXT,                      -- New state (JSON)
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**Purpose**: **Complete system audit trail**
**Key Concepts**:
- **User Actions**: Track all user activities
- **System Events**: Record automated system changes
- **Change History**: Maintain complete change history for compliance

---

## 🔗 Relationship Diagrams

### **Core Relationships**
```
users (1) ←→ (1) roles
    ↓
chemical_products (1) ←→ (1) chemicals
    ↓
formulations (many) ←→ (1) chemical_products
    ↓
chemicals (1) ←→ (many) formulations
```

### **Stock Management Flow**
```
purchases → chemicals.available_qty (INCREASE)
manufacturing → chemicals.available_qty (DECREASE for components)
manufacturing → chemicals.available_qty (INCREASE for products)
stock_movements ← records all changes
```

### **Manufacturing Process**
```
1. User requests: "Make 2kg of OSR16124"
2. System calculates: scale_factor = 2000g / 100.15g = 19.97
3. System scales all formulation components proportionally
4. System checks stock availability for scaled quantities
5. System consumes components and produces product
6. System records all stock movements and activities
```

---

## 🌊 Data Flow

### **Chemical Purchase Flow**
```
1. User records purchase in `purchases` table
2. System increases `chemicals.available_qty`
3. System records `stock_movements` entry
4. System creates `activity_logs` entry
5. System checks if stock exceeds threshold
6. System creates/updates `alerts` if needed
```

### **Manufacturing Flow**
```
1. User requests manufacturing with target quantity/unit
2. System converts target to base units
3. System calculates scale factor
4. System checks component stock availability
5. System validates feasibility
6. System executes manufacturing:
   - Decreases component stock
   - Increases product stock
   - Records all stock movements
   - Logs all activities
7. System updates alerts and notifications
```

### **Stock Monitoring Flow**
```
1. System continuously monitors `chemicals.available_qty`
2. System compares with `chemicals.threshold_qty`
3. System creates `alerts` for low stock
4. System sends `notifications` to relevant users
5. System tracks alert resolution
```

---

## 🎯 Key Concepts

### **1. Unified Chemical Management**
- **Single Table**: All chemicals (raw + manufactured) in `chemicals` table
- **Shared Stock**: Both types use the same stock management system
- **Flexible References**: Formulations can reference any chemical

### **2. Proportional Scaling**
- **Base Recipe**: 100% recipe defined in `chemical_products.base_composition_qty`
- **Scale Factor**: `target_quantity / base_composition_qty`
- **Proportional Components**: All components scale by the same factor

### **3. Unit Conversion**
- **Automatic Conversion**: System handles unit conversions internally
- **Base Units**: All calculations use base units for accuracy
- **User Flexibility**: Users can input quantities in any supported unit

### **4. Complete Audit Trail**
- **Every Change**: All stock changes recorded in `stock_movements`
- **Context Tracking**: Changes linked to specific actions
- **User Attribution**: All changes attributed to specific users
- **Compliance Ready**: Meets regulatory requirements

---

## 📊 Schema Details

### **Indexes for Performance**
```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_uid ON users(uid);

-- Chemicals table
CREATE INDEX idx_chemicals_name ON chemicals(name);
CREATE INDEX idx_chemicals_manufactured ON chemicals(is_manufactured);
CREATE INDEX idx_chemicals_stock ON chemicals(available_qty, threshold_qty);

-- Formulations table
CREATE INDEX idx_formulations_product ON formulations(product_id);
CREATE INDEX idx_formulations_component ON formulations(component_chemical_id);

-- Stock movements table
CREATE INDEX idx_stock_movements_chemical ON stock_movements(chemical_id);
CREATE INDEX idx_stock_movements_timestamp ON stock_movements(timestamp);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
```

### **Foreign Key Constraints**
```sql
-- Users → Roles
ALTER TABLE users ADD CONSTRAINT fk_users_role 
    FOREIGN KEY (role_id) REFERENCES roles(id);

-- Chemical Products → Chemicals
ALTER TABLE chemical_products ADD CONSTRAINT fk_products_chemical 
    FOREIGN KEY (chemical_id) REFERENCES chemicals(id);

-- Formulations → Chemical Products
ALTER TABLE formulations ADD CONSTRAINT fk_formulations_product 
    FOREIGN KEY (product_id) REFERENCES chemical_products(id);

-- Formulations → Chemicals
ALTER TABLE formulations ADD CONSTRAINT fk_formulations_component 
    FOREIGN KEY (component_chemical_id) REFERENCES chemicals(id);

-- Stock Movements → Chemicals
ALTER TABLE stock_movements ADD CONSTRAINT fk_movements_chemical 
    FOREIGN KEY (chemical_id) REFERENCES chemicals(id);
```

---

## 📝 Sample Data

### **Sample Roles**
```sql
INSERT INTO roles (id, name) VALUES 
(1, 'ADMIN'),
(2, 'LAB_STAFF'),
(3, 'PRODUCT_TEAM'),
(4, 'ACCOUNT_TEAM'),
(5, 'ALL_USERS');
```

### **Sample Users**
```sql
INSERT INTO users (uid, email, first_name, last_name, role_id, is_approved) VALUES 
('firebase_uid_1', 'admin@company.com', 'Admin', 'User', 1, TRUE),
('firebase_uid_2', 'lab@company.com', 'Lab', 'Technician', 2, TRUE),
('firebase_uid_3', 'prod@company.com', 'Production', 'Manager', 3, TRUE);
```

### **Sample Chemicals**
```sql
-- Raw chemicals
INSERT INTO chemicals (name, unit, available_qty, threshold_qty, is_manufactured) VALUES 
('Sodium Chloride', 'g', 5000.0, 100.0, FALSE),
('Water', 'ml', 10000.0, 500.0, FALSE),
('Acetic Acid', 'ml', 2000.0, 200.0, FALSE);

-- Manufactured chemicals
INSERT INTO chemicals (name, unit, available_qty, threshold_qty, is_manufactured) VALUES 
('OSR16124', 'g', 250.0, 50.0, TRUE),
('WRCD9374', 'g', 150.0, 30.0, TRUE);
```

### **Sample Chemical Products**
```sql
INSERT INTO chemical_products (chemical_id, name, base_composition_qty, unit, note, created_by) VALUES 
(4, 'OSR16124', 100.15, 'g', 'Industrial cleaning solution', 1),
(5, 'WRCD9374', 75.25, 'g', 'Water treatment chemical', 1);
```

### **Sample Formulations**
```sql
INSERT INTO formulations (product_id, component_chemical_id, quantity_required, unit) VALUES 
-- OSR16124 recipe (100.15g total)
(1, 1, 20.0, 'g'),      -- 20g Sodium Chloride (25%)
(1, 2, 60.09, 'ml'),    -- 60.09ml Water (75%)

-- WRCD9374 recipe (75.25g total)
(2, 1, 15.0, 'g'),      -- 15g Sodium Chloride (20%)
(2, 3, 60.2, 'ml');     -- 60.2ml Acetic Acid (80%)
```

---

## 🔧 Database Operations

### **Stock Updates**
```sql
-- Increase stock (purchase)
UPDATE chemicals 
SET available_qty = available_qty + 1000.0, 
    updated_at = NOW() 
WHERE id = 1;

-- Decrease stock (consumption)
UPDATE chemicals 
SET available_qty = available_qty - 500.0, 
    updated_at = NOW() 
WHERE id = 1;
```

### **Manufacturing Queries**
```sql
-- Get product formulation
SELECT f.*, c.name as component_name, c.unit as component_unit
FROM formulations f
JOIN chemicals c ON f.component_chemical_id = c.id
WHERE f.product_id = 1;

-- Check stock availability
SELECT c.name, c.available_qty, c.unit,
       f.quantity_required * 2.0 as required_qty
FROM formulations f
JOIN chemicals c ON f.component_chemical_id = c.id
WHERE f.product_id = 1;
```

### **Stock Movement Tracking**
```sql
-- Get recent stock movements
SELECT sm.*, c.name as chemical_name
FROM stock_movements sm
JOIN chemicals c ON sm.chemical_id = c.id
ORDER BY sm.timestamp DESC
LIMIT 50;

-- Get stock changes for specific chemical
SELECT * FROM stock_movements 
WHERE chemical_id = 1 
ORDER BY timestamp DESC;
```

---

## 📋 Best Practices

### **1. Data Integrity**
- Always use transactions for multi-table operations
- Validate units before calculations
- Check stock availability before consumption
- Maintain referential integrity with foreign keys

### **2. Performance**
- Use appropriate indexes for frequent queries
- Paginate large result sets
- Cache frequently accessed data
- Monitor query performance

### **3. Security**
- Validate all user inputs
- Use parameterized queries
- Implement proper authentication
- Log all sensitive operations

### **4. Maintenance**
- Regular database backups
- Monitor table sizes and growth
- Clean up old activity logs
- Update statistics regularly

---

## 🔗 Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Installation Guide](../README.md)
- [Unit Conversion System](./app/services/unit_converter.py)
- [Manufacturing Service](./app/services/inventory_service.py)

---

## 📞 Support

For questions about the database schema or system architecture, refer to:
1. This documentation
2. API documentation
3. Code comments in model files
4. Database migration scripts

