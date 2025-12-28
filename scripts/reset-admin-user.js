#!/usr/bin/env node

// Script to reset and create admin user properly
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;

async function resetAdminUser() {
    const client = new MongoClient(MONGODB_URI);

    try {
        // Step 1: Clean up existing admin user
        console.log('🧹 Cleaning up existing admin user...');
        await client.connect();
        const db = client.db('restaurant-erp');

        await db.collection('user').deleteMany({ email: 'admin@restaurant.com' });
        await db.collection('account').deleteMany({ accountId: 'email:admin@restaurant.com' });
        await db.collection('session').deleteMany({ userId: { $exists: true } }); // Clean sessions

        console.log('✅ Existing records cleaned up');

        await client.close();

        // Step 2: Create new admin user via API
        console.log('🚀 Creating new admin user via BetterAuth API...');

        const signUpResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@restaurant.com',
                password: 'admin123456',
                name: 'Administrator'
            })
        });

        const signUpData = await signUpResponse.text();
        console.log('Sign up response status:', signUpResponse.status);

        if (signUpResponse.ok) {
            console.log('✅ Admin user created successfully via API');

            // Step 3: Update role to admin
            console.log('🔧 Updating user role to admin...');

            await client.connect();
            const updateResult = await db.collection('user').updateOne(
                { email: 'admin@restaurant.com' },
                {
                    $set: {
                        role: 'admin',
                        firstName: 'Admin',
                        lastName: 'User'
                    }
                }
            );

            if (updateResult.modifiedCount > 0) {
                console.log('✅ Admin role and details updated successfully');
            }

            console.log('\n🎉 Admin user setup complete!');
            console.log('📧 Email: admin@restaurant.com');
            console.log('🔑 Password: admin123456');
            console.log('👑 Role: admin');
            console.log('\n✨ You can now sign in with these credentials!');

        } else {
            console.log('❌ Failed to create user via API');
            console.log('Response:', signUpData);
            console.log('\n💡 Make sure the development server is running with: npm run dev');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 The development server is not running.');
            console.log('Please start it with: npm run dev');
            console.log('Then run this script again.');
        }
    } finally {
        if (client.topology && client.topology.isConnected()) {
            await client.close();
        }
    }
}

resetAdminUser().catch(console.error);