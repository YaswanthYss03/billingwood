# 📦 Advanced Inventory Management - Professional Plan

## Overview

Advanced Inventory Management is a comprehensive suite of **Professional Plan** features designed to optimize inventory operations for F&B and retail businesses. All features are protected by subscription guards and available only to Professional and Enterprise plan users.

---

## ✅ Implementation Status

| Feature | Backend | Frontend | Status |
|---------|---------|----------|---------|
| Vendor Management | ✅ Complete | ⏳ Pending | Backend Ready |
| Smart Reordering Alerts | ✅ Complete | ⏳ Pending | Backend Ready |
| Purchase Order Workflow | ✅ Complete | ⏳ Pending | Backend Ready |
| Recipe/BOM Management | ✅ Complete | ⏳ Pending | Backend Ready |
| Wastage Tracking | ✅ Complete | ⏳ Pending | Backend Ready |
| Expiry Alerts | ✅ Complete | ⏳ Pending | Backend Ready |

**Backend Compilation:** ✅ Success (0 errors)  
**Database Migration:** ✅ Applied  
**Feature Guards:** ✅ Configured

---

## 🏗️ Database Schema Changes

### New Models

#### 1. Vendor (Professional Plan)
```prisma
model Vendor {
  id              String    @id @default(uuid())
  tenantId        String
  name            String
  contactPerson   String?
  phone           String?
  email           String?
  address         String?
  city            String?
  state           String?
  pincode         String?
  gstNumber       String?
  panNumber       String?
  paymentTerms    String?   @default("NET_30")
  creditLimit     Decimal?
  bankName        String?
  accountNumber   String?
  ifscCode        String?
  notes           String?
  tags            String[]
  isActive        Boolean   @default(true)
  purchases       Purchase[]
}
```

#### 2. Recipe (BOM/F&B)
```prisma
model Recipe {
  id              String    @id @default(uuid())
  tenantId        String
  finishedGoodId  String    // The final product
  name            String
  description     String?
  yieldQuantity   Decimal   @default(1)
  yieldUnit       String    @default("PCS")
  preparationTime Int?
  isActive        Boolean   @default(true)
  ingredients     RecipeIngredient[]
}
```

#### 3. RecipeIngredient
```prisma
model RecipeIngredient {
  id              String    @id @default(uuid())
  recipeId        String
  ingredientId    String    // Raw material item
  quantity        Decimal
  unit            String
  wastagePercent  Decimal   @default(0)
  notes           String?
}
```

#### 4. WastageLog (Professional Plan)
```prisma
model WastageLog {
  id              String        @id @default(uuid())
  tenantId        String
  itemId          String
  batchId         String?
  quantity        Decimal
  reason          WastageReason // EXPIRED, DAMAGED, SPILLAGE, THEFT, OTHER
  description     String?
  estimatedValue  Decimal
  recordedBy      String        // User ID
  recordedAt      DateTime      @default(now())
}
```

### Enhanced Models

#### Purchase Model Updates
```prisma
model Purchase {
  // NEW FIELDS
  vendorId        String?       // Professional Plan
  orderedDate     DateTime?     // Professional Plan
  expectedDate    DateTime?     // Professional Plan
  
  // UPDATED STATUS
  status          PurchaseStatus // DRAFT | ORDERED | RECEIVED | CANCELLED
}
```

#### Item Model Updates
```prisma
model Item {
  // NEW FIELDS
  isComposite     Boolean   @default(false)  // Recipe item?
  reorderLevel    Decimal?                   // Alert threshold
  reorderQuantity Decimal?                   // Suggested purchase qty
  
  // NEW RELATIONS
  recipes         Recipe[]
  recipeIngredients RecipeIngredient[]
  wastageLogs     WastageLog[]
}
```

---

## 🎯 Features & API Endpoints

### 1. Vendor Management

**Feature Guard:** `@RequireFeature('vendorManagement')`  
**Access:** Professional & Enterprise Plans  
**Module:** `VendorsModule`

#### Endpoints

**Create Vendor**
```
POST /api/v1/vendors
Body: CreateVendorDto
```

**Get All Vendors**
```
GET /api/v1/vendors
Query: ?includeInactive=true
```

**Get Vendor by ID**
```
GET /api/v1/vendors/:id
Includes: Last 10 purchases
```

**Get Vendor Statistics**
```
GET /api/v1/vendors/:id/stats
Returns: Total purchases, total amount, last purchase
```

**Update Vendor**
```
PATCH /api/v1/vendors/:id
Body: UpdateVendorDto
```

**Toggle Active Status**
```
PATCH /api/v1/vendors/:id/toggle-active
```

**Delete Vendor**
```
DELETE /api/v1/vendors/:id
Note: Blocks deletion if vendor has purchases
```

#### CreateVendorDto
```typescript
{
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTerms?: string;     // "NET_30", "NET_60", "COD"
  creditLimit?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  notes?: string;
  tags?: string[];
}
```

---

### 2. Smart Reordering

**Feature Guard:** `@RequireFeature('smartReordering')`  
**Access:** Professional & Enterprise Plans  
**Module:** `InventoryModule` (Enhanced)

#### Endpoints

**Get Reorder Alerts**
```
GET /api/v1/inventory/reorder-alerts
Returns: Items below reorder level with urgency classification
```

**Response:**
```json
[
  {
    "item": {
      "id": "uuid",
      "name": "Coffee Beans",
      "sku": "COF-001",
      "unit": "KG"
    },
    "currentStock": 5,
    "reorderLevel": 10,
    "suggestedPurchaseQuantity": 50,
    "salesVelocity": {
      "period": "Last 30 days",
      "totalSold": 45,
      "averageDailySales": 1.5,
      "projectedMonthlySales": 45
    },
    "daysOfStockRemaining": 3,
    "urgency": "CRITICAL"  // CRITICAL | HIGH | MEDIUM
  }
]
```

**Urgency Levels:**
- **CRITICAL:** ≤3 days of stock remaining
- **HIGH:** 4-7 days of stock remaining
- **MEDIUM:** 8-14 days of stock remaining

**Get Sales Velocity**
```
GET /api/v1/inventory/sales-velocity/:itemId
Query: ?days=30
```

**Get Suggested Purchase Quantity**
```
GET /api/v1/inventory/suggested-purchase/:itemId
Query: ?daysOfSupply=30
```

---

### 3. Purchase Order Workflow

**Feature Guard:** `@RequireFeature('purchaseOrders')`  
**Access:** Professional & Enterprise Plans  
**Module:** `PurchasesModule` (Enhanced)

#### Enhanced Workflow

**DRAFT → ORDERED → RECEIVED**

1. **Create Draft PO**
```
POST /api/v1/purchases
Body: {
  vendorId?: string,        // Professional Plan
  supplierName?: string,
  invoiceNumber?: string,
  purchaseDate?: Date,
  expectedDate?: Date,      // Professional Plan
  items: [
    {
      itemId: string,
      quantity: number,
      costPrice: number
    }
  ]
}
```

2. **Send PO to Vendor** (Professional Plan)
```
POST /api/v1/purchases/:id/send-order
Changes status: DRAFT → ORDERED
Sets orderedDate
```

3. **Receive Goods (GRN)**
```
POST /api/v1/purchases/:id/receive
Changes status: ORDERED → RECEIVED
Creates inventory batches
```

**Response includes:**
- Purchase details
- Vendor information
- Created inventory batches
- Total amount

---

### 4. Recipe/BOM Management (F&B)

**Feature Guard:** `@RequireFeature('recipeManagement')`  
**Access:** Professional & Enterprise Plans  
**Module:** `RecipesModule`

#### Endpoints

**Create Recipe**
```
POST /api/v1/recipes
Body: CreateRecipeDto
```

**CreateRecipeDto:**
```typescript
{
  finishedGoodId: string;    // The final product (e.g., Pizza)
  name: string;              // "Margherita Pizza Recipe"
  description?: string;
  yieldQuantity?: number;    // Default: 1
  yieldUnit?: string;        // Default: "PCS"
  preparationTime?: number;  // Minutes
  ingredients: [
    {
      ingredientId: string;   // Raw material (e.g., Cheese)
      quantity: number;       // 200 (grams)
      unit: string;           // "G"
      wastagePercent?: number;// 5% wastage
      notes?: string;
    }
  ]
}
```

**Get All Recipes**
```
GET /api/v1/recipes
```

**Get Recipe by ID**
```
GET /api/v1/recipes/:id
```

**Get Recipe by Finished Good**
```
GET /api/v1/recipes/finished-good/:finishedGoodId
```

**Calculate Recipe Cost**
```
GET /api/v1/recipes/:id/cost
Returns: Total cost, cost per unit, ingredient breakdown
```

**Check Ingredient Availability**
```
GET /api/v1/recipes/finished-good/:finishedGoodId/check-availability
Query: ?quantity=10
Returns: Available status, shortages if any
```

**Update Recipe**
```
PATCH /api/v1/recipes/:id
Body: UpdateRecipeDto
```

**Delete Recipe**
```
DELETE /api/v1/recipes/:id
Removes isComposite flag from finished good
```

#### Auto-Deduction Logic

When a recipe item is sold via billing, the system **automatically deducts** ingredients using FIFO:

```typescript
// Called during bill creation in transaction
await recipesService.deductIngredientsForSale(
  tenantId,
  finishedGoodId,
  quantity,
  transaction
);
```

**Example:**
- Sell 1 Margherita Pizza
- System deducts:
  - 200g Cheese (from oldest batch)
  - 150g Dough (from oldest batch)
  - 50ml Tomato Sauce (from oldest batch)

**Failure Handling:**
- If insufficient ingredients → Throws error before creating bill
- Transaction ensures atomicity (all or nothing)

---

### 5. Wastage Tracking

**Feature Guard:** `@RequireFeature('wastageTracking')`  
**Access:** Professional & Enterprise Plans  
**Module:** `WastageModule`

#### Endpoints

**Record Wastage**
```
POST /api/v1/wastage
Body: {
  itemId: string;
  batchId?: string;         // Optional specific batch
  quantity: number;
  reason: WastageReason;    // EXPIRED | DAMAGED | SPILLAGE | THEFT | OTHER
  description?: string;
  estimatedValue: number;
}
```

**Behavior:**
- If `batchId` specified → Deducts from that batch
- If no `batchId` → Deducts from oldest batches (FIFO)
- Updates inventory automatically
- Records user who logged wastage

**Get Wastage Logs**
```
GET /api/v1/wastage
Query: ?startDate=2024-01-01&endDate=2024-01-31&reason=EXPIRED
```

**Get Wastage Summary**
```
GET /api/v1/wastage/summary
Query: ?days=30
```

**Response:**
```json
{
  "period": "Last 30 days",
  "totalWastageLogs": 15,
  "totalValue": 5400.50,
  "byReason": [
    {
      "reason": "EXPIRED",
      "count": 8,
      "value": 3200.00
    },
    {
      "reason": "DAMAGED",
      "count": 4,
      "value": 1500.00
    },
    {
      "reason": "SPILLAGE",
      "count": 3,
      "value": 700.50
    }
  ]
}
```

---

### 6. Expiry Alerts

**Feature Guard:** `@RequireFeature('wastageTracking')`  
**Access:** Professional & Enterprise Plans  
**Module:** `WastageModule`

#### Endpoints

**Get Items Expiring Soon**
```
GET /api/v1/wastage/expiring
Query: ?daysThreshold=30
```

**Response:**
```json
[
  {
    "batchId": "uuid",
    "batchNumber": "BATCH-2024-001",
    "item": {
      "id": "uuid",
      "name": "Fresh Milk",
      "sku": "MLK-001",
      "unit": "L",
      "price": 60.00
    },
    "currentQuantity": 20,
    "expiryDate": "2024-03-01T00:00:00Z",
    "daysUntilExpiry": 5,
    "urgency": "HIGH",
    "estimatedValue": 1200.00,
    "suggestedDiscount": 0.2  // 20% discount
  }
]
```

**Urgency Levels:**
- **CRITICAL:** ≤3 days until expiry (suggest 0% discount - dispose)
- **HIGH:** 4-7 days (suggest 20% discount)
- **MEDIUM:** 8-14 days (suggest 10% discount)
- **LOW:** 15-30 days (suggest 5% discount)

**Get Already Expired Items**
```
GET /api/v1/wastage/expired
```

**Response:**
```json
[
  {
    "batchId": "uuid",
    "batchNumber": "BATCH-2024-002",
    "item": {
      "id": "uuid",
      "name": "Yogurt",
      "sku": "YOG-001",
      "unit": "KG"
    },
    "currentQuantity": 5,
    "expiryDate": "2024-02-10T00:00:00Z",
    "daysExpired": 9,
    "estimatedLoss": 250.00
  }
]
```

---

## 🔐 Subscription Plan Configuration

### Starter Plan
```typescript
{
  // Basic inventory only
  fifoTracking: true,
  batchTracking: true,
  expiryManagement: true,
  
  // Professional features DISABLED
  vendorManagement: false,
  smartReordering: false,
  purchaseOrders: false,
  recipeManagement: false,
  wastageTracking: false
}
```

### Professional Plan
```typescript
{
  // All basic inventory
  fifoTracking: true,
  batchTracking: true,
  expiryManagement: true,
  
  // Professional features ENABLED
  vendorManagement: true,       ✅
  smartReordering: true,        ✅
  purchaseOrders: true,         ✅
  recipeManagement: true,       ✅
  wastageTracking: true         ✅
}
```

### Enterprise Plan
```typescript
{
  // All Professional features
  // PLUS unlimited locations, users, API access
}
```

---

## 📊 Business Use Cases

### Use Case 1: Restaurant with Recipe Management

**Scenario:** Pizza restaurant wants to track ingredient costs and auto-deduct

**Setup:**
1. Create raw material items (Cheese, Dough, Sauce)
2. Create finished good item (Margherita Pizza)
3. Create recipe linking pizza to ingredients

**Workflow:**
1. Customer orders 1 Pizza → Cashier bills it
2. System checks ingredient availability
3. If available → Creates bill + auto-deducts ingredients via FIFO
4. If shortage → Shows error: "Insufficient Cheese. Required: 200g, Available: 150g"

**Benefits:**
- Accurate cost tracking per dish
- Prevents selling items without ingredients
- Automatic raw material deduction

---

### Use Case 2: Retail Store with Smart Reordering

**Scenario:** Grocery store wants automated reorder alerts

**Setup:**
1. Set reorder level for each item (e.g., 10 units)
2. Set reorder quantity (e.g., 50 units)

**Workflow:**
1. System monitors daily sales velocity
2. When stock drops below reorder level → Alert generated
3. Alert shows:
   - Current stock: 8 units
   - Days remaining: 5 days
   - Suggested purchase: 50 units (15 days supply)
   - Urgency: HIGH

**Benefits:**
- Never run out of stock
- Data-driven purchase decisions
- Optimized inventory levels

---

### Use Case 3: F&B with Expiry Management

**Scenario:** Dairy products store with perishable goods

**Workflow:**
1. Daily check expiring items endpoint
2. Items expiring in 7 days → Apply 20% discount
3. Items expired → Record wastage
4. Generate monthly wastage report

**Benefits:**
- Reduce wastage through discounts
- Track financial impact of wastage
- Identify problematic items/suppliers

---

## 🧪 Testing Checklist

- [x] Backend compiles successfully
- [x] Database migration applied
- [x] Feature guards configured
- [ ] Test vendor CRUD operations
- [ ] Test PO workflow (DRAFT → ORDERED → RECEIVED)
- [ ] Test recipe creation with ingredient deduction
- [ ] Test wastage recording and reporting
- [ ] Test expiry alerts with different thresholds
- [ ] Test smart reordering alerts
- [ ] Test sales velocity calculation
- [ ] Verify Starter plan cannot access Professional features
- [ ] Verify Professional plan has full access

---

## 🚀 Frontend Development Roadmap

### High Priority

1. **Vendor Management UI**
   - Vendor list with search/filter
   - Vendor form (create/edit)
   - Vendor details page with purchase history

2. **Smart Reordering Dashboard**
   - Reorder alerts widget on dashboard
   - Sales velocity charts
   - Suggested purchase quantities

3. **Purchase Order Enhancement**
   - Vendor dropdown in PO creation
   - "Send to Vendor" button (Professional)
   - Expected delivery date picker

### Medium Priority

4. **Recipe Management UI**
   - Recipe builder with ingredient selector
   - Cost calculation display
   - Availability checker before selling

5. **Wastage & Expiry Dashboard**
   - Expiring items list with urgency badges
   - Quick wastage recording form
   - Wastage reports and charts

### Low Priority

6. **Advanced Features**
   - Vendor performance analytics
   - Recipe profitability analysis
   - Wastage trend analysis

---

## 📝 Migration Guide for Existing Tenants

### For Starter Plan Users

**Current State:** Can use basic inventory without issues  
**No Action Required:** Starter plan features continue to work

### For Professional Plan Users

**New Features Available:**
1. Create vendors and link to purchases
2. Set reorder levels on items
3. Create recipes for composite items
4. Record wastage with classification
5. Monitor expiring items

**Recommended Steps:**
1. Set up vendors for existing suppliers
2. Configure reorder levels for frequently ordered items
3. Create recipes for F&B composite items
4. Start recording wastage for better accounting

---

## 🔧 Configuration

### Enable Features for a Tenant

```typescript
// Update tenant subscription
await prisma.tenant.update({
  where: { id: tenantId },
  data: {
    subscriptionPlan: 'PROFESSIONAL',
    subscriptionStatus: 'ACTIVE'
  }
});
```

### Set Reorder Levels

```typescript
// Update item with reorder thresholds
await prisma.item.update({
  where: { id: itemId },
  data: {
    reorderLevel: new Decimal(10),      // Alert when below 10
    reorderQuantity: new Decimal(50)    // Suggest buying 50
  }
});
```

---

## 📞 Support & Documentation

**Backend Documentation:** [ANALYTICS_FEATURES.md](./ANALYTICS_FEATURES.md)  
**API Base URL:** `/api/v1`  
**Authentication:** Required for all endpoints  
**Subscription Plan:** Professional or Enterprise

---

## ✅ Summary

Advanced Inventory Management brings enterprise-grade inventory control to Professional plan users:

| Feature | Impact |
|---------|--------|
| **Vendor Management** | Centralized supplier tracking |
| **Smart Reordering** | Never run out of stock |
| **PO Workflow** | Professional purchase order process |
| **Recipe/BOM** | Accurate costing for F&B |
| **Wastage Tracking** | Financial loss monitoring |
| **Expiry Alerts** | Reduce spoilage through discounts |

**Status:** ✅ Backend Complete | ⏳ Frontend Pending  
**Compilation:** ✅ Success (0 errors)  
**Next Steps:** Build frontend UI components

---

*Last Updated:* February 19, 2026  
*Version:* 1.0.0  
*Plan Requirement:* Professional & Enterprise
