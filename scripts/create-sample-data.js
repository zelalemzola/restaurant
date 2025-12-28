#!/usr/bin/env node

// Script to create sample data for testing
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function createSampleData() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('restaurant-erp');

        // Clear existing data
        console.log('🧹 Clearing existing sample data...');
        await db.collection('productgroups').deleteMany({});
        await db.collection('products').deleteMany({});

        // Create product groups
        console.log('📦 Creating product groups...');
        const groupsResult = await db.collection('productgroups').insertMany([
            {
                name: 'Beverages',
                description: 'Drinks and beverages',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Food Items',
                description: 'Food products and meals',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Raw Materials',
                description: 'Raw ingredients and materials',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        const beverageGroupId = groupsResult.insertedIds[0];
        const foodGroupId = groupsResult.insertedIds[1];
        const rawMaterialsGroupId = groupsResult.insertedIds[2];

        console.log('✅ Product groups created');

        // Create sample products
        console.log('🍕 Creating sample products...');
        await db.collection('products').insertMany([
            // Sellable beverages
            {
                name: 'Coca Cola',
                groupId: beverageGroupId,
                type: 'sellable',
                metric: 'bottle',
                currentQuantity: 0,
                minStockLevel: 0,
                costPrice: 1.50,
                sellingPrice: 3.00,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Fresh Orange Juice',
                groupId: beverageGroupId,
                type: 'sellable',
                metric: 'glass',
                currentQuantity: 0,
                minStockLevel: 0,
                costPrice: 2.00,
                sellingPrice: 4.50,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Coffee',
                groupId: beverageGroupId,
                type: 'sellable',
                metric: 'cup',
                currentQuantity: 0,
                minStockLevel: 0,
                costPrice: 1.00,
                sellingPrice: 2.50,
                createdAt: new Date(),
                updatedAt: new Date()
            },

            // Combination food items (require stock)
            {
                name: 'Margherita Pizza',
                groupId: foodGroupId,
                type: 'combination',
                metric: 'piece',
                currentQuantity: 10,
                minStockLevel: 2,
                costPrice: 8.00,
                sellingPrice: 15.00,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Chicken Burger',
                groupId: foodGroupId,
                type: 'combination',
                metric: 'piece',
                currentQuantity: 15,
                minStockLevel: 3,
                costPrice: 6.00,
                sellingPrice: 12.00,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Caesar Salad',
                groupId: foodGroupId,
                type: 'combination',
                metric: 'bowl',
                currentQuantity: 8,
                minStockLevel: 2,
                costPrice: 4.00,
                sellingPrice: 9.00,
                createdAt: new Date(),
                updatedAt: new Date()
            },

            // Stock items (raw materials)
            {
                name: 'Tomatoes',
                groupId: rawMaterialsGroupId,
                type: 'stock',
                metric: 'kg',
                currentQuantity: 50,
                minStockLevel: 10,
                costPrice: 2.00,
                sellingPrice: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Chicken Breast',
                groupId: rawMaterialsGroupId,
                type: 'stock',
                metric: 'kg',
                currentQuantity: 25,
                minStockLevel: 5,
                costPrice: 8.00,
                sellingPrice: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Flour',
                groupId: rawMaterialsGroupId,
                type: 'stock',
                metric: 'kg',
                currentQuantity: 100,
                minStockLevel: 20,
                costPrice: 1.50,
                sellingPrice: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        console.log('✅ Sample products created');

        console.log('\n🎉 Sample data created successfully!');
        console.log('\n📊 Summary:');
        console.log('- 3 Product Groups created');
        console.log('- 9 Products created:');
        console.log('  • 3 Sellable beverages (no stock required)');
        console.log('  • 3 Combination food items (with stock)');
        console.log('  • 3 Stock items (raw materials)');
        console.log('\n✨ You can now test:');
        console.log('- Product creation and listing');
        console.log('- POS system with sellable items');
        console.log('- Stock management');
        console.log('- Sales transactions');

    } catch (error) {
        console.error('❌ Error creating sample data:', error.message);
    } finally {
        await client.close();
    }
}

createSampleData().catch(console.error);