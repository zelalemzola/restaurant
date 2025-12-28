#!/usr/bin/env node

// Script to set up default product groups
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const defaultProductGroups = [
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
    },
    {
        name: 'Supplies',
        description: 'Non-food items and restaurant supplies'
    }
];

async function setupProductGroups() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('restaurant-erp');
        const productGroupsCollection = db.collection('productgroups');

        // Check existing product groups
        const existingGroups = await productGroupsCollection.find({}).toArray();
        console.log(`📋 Found ${existingGroups.length} existing product groups`);

        if (existingGroups.length === 0) {
            console.log('🚀 Creating default product groups...');

            // Add timestamps to each group
            const groupsWithTimestamps = defaultProductGroups.map(group => ({
                ...group,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = await productGroupsCollection.insertMany(groupsWithTimestamps);
            console.log(`✅ Created ${result.insertedCount} product groups`);

            // Display created groups
            console.log('\n📦 Created Product Groups:');
            groupsWithTimestamps.forEach((group, index) => {
                console.log(`${index + 1}. ${group.name} - ${group.description}`);
            });

        } else {
            console.log('\n📦 Existing Product Groups:');
            existingGroups.forEach((group, index) => {
                console.log(`${index + 1}. ${group.name} - ${group.description || 'No description'}`);
            });
            console.log('\n✅ Product groups already exist, no action needed');
        }

        console.log('\n🎉 Product groups setup complete!');
        console.log('You can now create products and assign them to these groups.');

    } catch (error) {
        console.error('❌ Error setting up product groups:', error.message);
    } finally {
        await client.close();
    }
}

setupProductGroups().catch(console.error);