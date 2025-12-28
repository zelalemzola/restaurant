# Requirements Document

## Introduction

A comprehensive Enterprise Resource Planning (ERP) system designed specifically for restaurants to manage inventory, track sales, monitor costs, and analyze profitability. The system enables restaurant owners to efficiently manage raw materials with custom metrics, track stock levels with automated notifications, record sales transactions, and maintain comprehensive financial oversight of their operations.

## Glossary

- **Restaurant_ERP_System**: The complete web-based application for restaurant management
- **Stock_Item**: Raw materials or ingredients stored in inventory (flour, oil, etc.)
- **Sellable_Item**: Products that can be sold to customers (cakes, dishes, beverages)
- **Combination_Item**: Items that function as both stock and sellable products (bags of flour sold retail)
- **Product_Group**: Categories for organizing items (Food, Beverages, Dishes, etc.)
- **Custom_Metric**: User-defined units of measurement (kg, liters, pieces, custom units)
- **Min_Stock_Level**: Threshold quantity that triggers low stock notifications
- **Payment_Method**: Method used by customers (CBE, Abyssinia, Zemen, Awash, Telebirr, Cash, POS)
- **Cost_Operation**: Business expenses including rent, salaries, and one-time costs
- **Stock_Transaction**: Any change in inventory levels (additions or deductions)
- **Sales_Transaction**: Record of items sold to customers with payment details

## Requirements

### Requirement 1

**User Story:** As a restaurant owner, I want to organize my inventory into groups and add products with custom measurements, so that I can efficiently categorize and track all my raw materials and products.

#### Acceptance Criteria

1. THE Restaurant_ERP_System SHALL allow users to create Product_Groups with custom names
2. WHEN creating a product, THE Restaurant_ERP_System SHALL allow users to assign it to a Product_Group
3. THE Restaurant_ERP_System SHALL allow users to define Custom_Metrics for each product
4. THE Restaurant_ERP_System SHALL store quantity, Custom_Metric, Min_Stock_Level, and cost price for each Stock_Item
5. THE Restaurant_ERP_System SHALL allow users to specify whether an item is Stock_Item, Sellable_Item, or Combination_Item

### Requirement 2

**User Story:** As a restaurant manager, I want to receive notifications when stock levels are low, so that I can reorder supplies before running out.

#### Acceptance Criteria

1. WHEN a Stock_Item quantity falls to or below its Min_Stock_Level, THE Restaurant_ERP_System SHALL generate a low stock notification
2. THE Restaurant_ERP_System SHALL display all active notifications on a dedicated notifications page
3. THE Restaurant_ERP_System SHALL show current stock levels for all items on a stock levels page
4. THE Restaurant_ERP_System SHALL highlight items below Min_Stock_Level with visual indicators

### Requirement 3

**User Story:** As a restaurant staff member, I want to record when I use raw materials, so that the system maintains accurate inventory levels.

#### Acceptance Criteria

1. THE Restaurant_ERP_System SHALL provide a spend page listing all Stock_Items and Combination_Items
2. WHEN a user records material usage, THE Restaurant_ERP_System SHALL decrease the item quantity accordingly
3. THE Restaurant_ERP_System SHALL create a Stock_Transaction record for each usage entry
4. THE Restaurant_ERP_System SHALL prevent negative stock quantities and display warnings for insufficient stock

### Requirement 4

**User Story:** As a cashier, I want to record sales transactions with payment methods, so that we can track revenue and customer payment preferences.

#### Acceptance Criteria

1. THE Restaurant_ERP_System SHALL display all Sellable_Items and Combination_Items on a sales page
2. WHEN recording a sale, THE Restaurant_ERP_System SHALL allow selection of multiple products and quantities
3. THE Restaurant_ERP_System SHALL require selection of a Payment_Method for each Sales_Transaction
4. WHEN a Combination_Item is sold, THE Restaurant_ERP_System SHALL automatically decrease its stock quantity
5. THE Restaurant_ERP_System SHALL calculate total sale amount using predefined selling prices

### Requirement 5

**User Story:** As a restaurant owner, I want to track all operational costs including rent, salaries, and one-time expenses, so that I can calculate accurate profit and loss.

#### Acceptance Criteria

1. THE Restaurant_ERP_System SHALL allow users to enter monthly recurring Cost_Operations like rent and salaries
2. THE Restaurant_ERP_System SHALL allow users to enter one-time Cost_Operations with custom descriptions
3. THE Restaurant_ERP_System SHALL store the date, amount, and description for each Cost_Operation
4. THE Restaurant_ERP_System SHALL categorize costs as recurring or one-time expenses

### Requirement 6

**User Story:** As a restaurant owner, I want to view comprehensive analytics and dashboard insights, so that I can make informed business decisions about profitability and operations.

#### Acceptance Criteria

1. THE Restaurant_ERP_System SHALL display a dashboard with key performance indicators including daily sales, low stock alerts, and recent transactions
2. THE Restaurant_ERP_System SHALL provide an analytics page showing profit and loss calculations over selectable time periods
3. THE Restaurant_ERP_System SHALL calculate profits by subtracting cost prices and Cost_Operations from sales revenue
4. THE Restaurant_ERP_System SHALL display sales trends, popular products, and payment method distribution
5. THE Restaurant_ERP_System SHALL show inventory turnover rates and stock usage patterns

### Requirement 7

**User Story:** As a restaurant owner, I want the system to handle dual-purpose items correctly, so that items used as both raw materials and retail products are managed accurately.

#### Acceptance Criteria

1. WHEN creating a Combination_Item, THE Restaurant_ERP_System SHALL require both cost price and selling price
2. THE Restaurant_ERP_System SHALL display Combination_Items in both stock management and sales interfaces
3. WHEN a Combination_Item is sold, THE Restaurant_ERP_System SHALL update both sales records and inventory levels
4. THE Restaurant_ERP_System SHALL calculate profit margins for Combination_Items using both cost and selling prices

### Requirement 8

**User Story:** As a restaurant manager, I want to manage user access and maintain data security, so that sensitive business information is protected.

#### Acceptance Criteria

1. THE Restaurant_ERP_System SHALL require user authentication before accessing any functionality
2. THE Restaurant_ERP_System SHALL maintain audit logs of all Stock_Transactions and Sales_Transactions
3. THE Restaurant_ERP_System SHALL allow role-based access control for different user types
4. THE Restaurant_ERP_System SHALL backup data regularly to prevent loss of critical business information
