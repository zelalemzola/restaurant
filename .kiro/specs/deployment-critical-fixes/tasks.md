# Implementation Plan

- [x] 1. Fix Select component infinite loop issue

  - Optimize SelectTrigger component with memoization to prevent recursive state updates
  - Add useCallback hooks for event handlers in stock levels page
  - Implement error boundary around Select components for graceful error recovery
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Extend stock monitoring to all product types

  - [x] 2.1 Update stock level calculation logic to include all product types

    - Modify stock status calculation to check all products with quantity tracking
    - Remove type-specific filtering that limits monitoring to "stock" products only
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Implement universal low stock detection

    - Update low stock detection logic to work across all product types
    - Add configurable stock tracking per product type
    - _Requirements: 2.2, 2.3_

  - [x] 2.3 Add restocking functionality for all monitored products

    - Extend restocking interface to support all product types
    - Update stock adjustment dialogs to handle different product types
    - _Requirements: 2.4, 2.5_

- [x] 3. Integrate cost prices as restaurant expenses

  - [x] 3.1 Create cost expense recording system

    - Implement automatic expense entry creation when cost prices are updated
    - Add cost expense model and database operations
    - _Requirements: 3.1, 3.2_

  - [x] 3.2 Update cost displays throughout the system

    - Modify all cost-related components to show cost prices as expenses
    - Update financial dashboards to include cost price data
    - _Requirements: 3.2, 3.4, 3.5_

  - [x] 3.3 Implement cost-based profit margin calculations

    - Update profit margin calculations to use cost price as base cost
    - Integrate cost price data into financial reporting
    - _Requirements: 3.3, 3.4_

- [ ]\* 4. Add comprehensive error handling and validation

  - [ ]\* 4.1 Implement error boundaries for critical components

    - Add error boundaries around Select components and stock monitoring
    - Create fallback UI components for error states
    - _Requirements: 1.3_

  - [ ]\* 4.2 Add validation for cost price operations
    - Implement validation for cost price updates and expense recording
    - Add transaction rollback for failed cost operations
    - _Requirements: 3.1_

- [ ]\* 5. Create unit tests for critical functionality

  - [ ]\* 5.1 Test Select component optimization

    - Write tests for Select component rendering without infinite loops
    - Test callback optimization and state management
    - _Requirements: 1.1, 1.2_

  - [ ]\* 5.2 Test universal stock monitoring

    - Write tests for stock status calculation across all product types
    - Test low stock detection and notification functionality
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]\* 5.3 Test cost expense integration
    - Write tests for cost expense recording and validation
    - Test cost price integration with financial reporting
    - _Requirements: 3.1, 3.2, 3.3_
