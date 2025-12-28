#!/usr/bin/env node

// Script to create admin user for the restaurant ERP system
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('Please make sure .env.local file exists with MONGODB_URI');
    process.exit(1);
}

async function createAdminUser() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('Connecting to MongoDB Atlas...');
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('restaurant-erp');
        const usersCollection = db.collection('user');

        // Check if admin user already exists
        const existingAdmin = await usersCollection.findOne({ email: 'admin@restaurant.com' });

        if (existingAdmin) {
            console.log('Admin user already exists. Updating role to admin...');

            const updateResult = await usersCollection.updateOne(
                { email: 'admin@restaurant.com' },
                {
                    $set: {
                        role: 'admin',
                        name: 'Administrator',
                        firstName: 'Admin',
                        lastName: 'User'
                    }
                }
            );

            if (updateResult.modifiedCount > 0) {
                console.log('✅ Admin user role updated successfully');
            } else {
                console.log('ℹ️  Admin user already has correct settings');
            }
            return;
        }

        // Hash the password
        console.log('Creating admin user...');
        const hashedPassword = await bcrypt.hash('admin', 12);

        // Create admin user
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

        // Insert user
        const userResult = await usersCollection.insertOne(adminUser);
        console.log('✅ Admin user created with ID:', userResult.insertedId);

        // Create account record for authentication
        const accountsCollection = db.collection('account');
        const accountRecord = {
            userId: userResult.insertedId,
            accountId: `email:admin@restaurant.com`,
            providerId: 'credential',
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await accountsCollection.insertOne(accountRecord);
        console.log('✅ Admin account credentials created');

        console.log('\n🎉 Admin user setup complete!');
        console.log('📧 Email: admin@restaurant.com');
        console.log('🔑 Password: admin');
        console.log('👑 Role: admin');
        console.log('\nYou can now sign in with these credentials.');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Connection Tips:');
            console.log('- Make sure your MongoDB Atlas cluster is running');
            console.log('- Check your internet connection');
            console.log('- Verify the MONGODB_URI in .env.local is correct');
        }
    } finally {
        await client.close();
    }
}

// Run the script
createAdminUser().catch(console.error);