#!/usr/bin/env node

// Script to fix admin user for BetterAuth compatibility
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixAdminUser() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('restaurant-erp');

        // Delete existing admin records
        console.log('🧹 Cleaning up existing admin records...');
        await db.collection('user').deleteOne({ email: 'admin@restaurant.com' });
        await db.collection('account').deleteOne({ accountId: 'email:admin@restaurant.com' });

        // Create user record first
        console.log('👤 Creating user record...');
        const usersCollection = db.collection('user');
        const adminUser = {
            email: 'admin@restaurant.com',
            name: 'Administrator',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            emailVerified: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const userResult = await usersCollection.insertOne(adminUser);
        console.log('✅ User created with ID:', userResult.insertedId);

        // Hash password with bcrypt (same as BetterAuth uses)
        const hashedPassword = await bcrypt.hash('admin', 12);
        console.log('🔐 Password hashed');

        // Create account record with correct BetterAuth format
        console.log('🔑 Creating account record...');
        const accountsCollection = db.collection('account');

        // BetterAuth expects specific format for credential accounts
        const accountRecord = {
            userId: userResult.insertedId,
            accountId: `email:admin@restaurant.com`, // This should match the email
            providerId: 'credential', // This is correct for email/password
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await accountsCollection.insertOne(accountRecord);
        console.log('✅ Account record created');

        // Verify the records
        console.log('\n🔍 Verifying records...');
        const verifyUser = await usersCollection.findOne({ email: 'admin@restaurant.com' });
        const verifyAccount = await accountsCollection.findOne({ accountId: 'email:admin@restaurant.com' });

        console.log('User ID:', verifyUser._id.toString());
        console.log('Account User ID:', verifyAccount.userId.toString());
        console.log('IDs match:', verifyUser._id.toString() === verifyAccount.userId.toString());

        console.log('\n🎉 Admin user fixed!');
        console.log('📧 Email: admin@restaurant.com');
        console.log('🔑 Password: admin');
        console.log('👑 Role: admin');
        console.log('\nTry logging in now!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

fixAdminUser().catch(console.error);