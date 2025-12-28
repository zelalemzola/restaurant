#!/usr/bin/env node

// Complete setup script for product creation
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const additionalProductGroups = [
    {
        name: 'Beverages',
        description: 'Drinks, juices, sodas, and other beverages'
    },
    {
        name: 'Main Dishes',
        description: 'Primary food items and entrees'
    },
    {
        name: 'Appetizers',
        description: 'Starters and small plates'
    },
    {
        name: 'Desserts',
        description: 'Sweet treats and desserts'
    },
    {
        name: 'Ingredients',
        description: 'Raw ingredients and cooking supplies'
    }
];

async function completeSetup() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('restaurant-erp');

        // Add more product groups
        console.log('📦 Adding additional product groups...');
        const productGroupsCollection = db.collection('productgroups');

        for (const group of additionalProductGroups) {
            const existing = await productGroupsCollection.findOne({ name: group.name });
            if (!existing) {
                await productGroupsCollection.insertOne({
                    ...group,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`  ✅ Added: ${group.name}`);
            } else {
                console.log(`  ⏭️  Exists: ${group.name}`);
            }
        }

        // List all product groups
        const allGroups = await productGroupsCollection.find({}).toArray();
        console.log('\n📋 Available Product Groups:');
        allGroups.forEach((group, index) => {
            console.log(`${index + 1}. ${group.name} (ID: ${group._id})`);
        });

        // Check admin user
        console.log('\n👤 Checking admin user...');
        const usersCollection = db.collection('user');
        const adminUser = await usersCollection.findOne({ email: 'admin@restaurant.com' });

        if (adminUser) {
            console.log('✅ Admin user exists');
            console.log(`   Role: ${adminUser.role}`);
            console.log(`   Email: ${adminUser.email}`);
        } else {
            console.log('❌ Admin user not found. Run: npm run create-admin');
        }

        console.log('\n🎉 Setup complete!');
        console.log('\n📝 To create a product, use these details:');
        console.log('   Name: Test Burger');
        console.log('   Group: Food (or any from the list above)');
        console.log('   Type: sellable');
        console.log('   Metric: pieces');
        console.log('   Current Quantity: 10');
        console.log('   Min Stock Level: 5');
        console.log('   Selling Price: 12.99');

        console.log('\n🔐 Admin Login:');
        console.log('   Email: admin@restaurant.com');
        console.log('   Password: admin123456');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

completeSetup().catch(console.error);