#!/usr/bin/env node

// Script to debug admin user creation
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function debugAdminUser() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('restaurant-erp');

        // Check user collection
        const usersCollection = db.collection('user');
        const adminUser = await usersCollection.findOne({ email: 'admin@restaurant.com' });
        console.log('\n📋 User record:');
        console.log(adminUser);

        // Check account collection
        const accountsCollection = db.collection('account');
        const adminAccount = await accountsCollection.findOne({
            accountId: 'email:admin@restaurant.com'
        });
        console.log('\n🔐 Account record:');
        console.log(adminAccount);

        // Check all collections
        const collections = await db.listCollections().toArray();
        console.log('\n📚 Available collections:');
        collections.forEach(col => console.log(`- ${col.name}`));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

debugAdminUser().catch(console.error);