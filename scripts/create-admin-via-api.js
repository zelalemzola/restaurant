#!/usr/bin/env node

// Script to create admin user via BetterAuth API
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

async function createAdminViaAPI() {
    try {
        console.log('🚀 Creating admin user via BetterAuth API...');

        // First, let's try to sign up the admin user with a longer password
        const signUpResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@restaurant.com',
                password: 'admin123456', // Longer password to meet BetterAuth requirements
                name: 'Administrator',
                firstName: 'Admin',
                lastName: 'User'
            })
        });

        const signUpData = await signUpResponse.text();
        console.log('Sign up response status:', signUpResponse.status);
        console.log('Sign up response:', signUpData);

        if (signUpResponse.ok) {
            console.log('✅ Admin user created via API');

            // Now we need to update the role to admin
            console.log('🔧 Updating user role to admin...');

            const { MongoClient } = require('mongodb');
            const client = new MongoClient(process.env.MONGODB_URI);

            await client.connect();
            const db = client.db('restaurant-erp');

            const updateResult = await db.collection('user').updateOne(
                { email: 'admin@restaurant.com' },
                { $set: { role: 'admin' } }
            );

            await client.close();

            if (updateResult.modifiedCount > 0) {
                console.log('✅ Admin role updated successfully');
            }

            console.log('\n🎉 Admin user setup complete!');
            console.log('📧 Email: admin@restaurant.com');
            console.log('🔑 Password: admin123456');
            console.log('👑 Role: admin');

        } else {
            console.log('❌ Failed to create user via API');
            console.log('Response:', signUpData);

            // If user already exists, just update the role
            if (signUpData.includes('already exists') || signUpResponse.status === 400) {
                console.log('🔧 User might already exist, updating role...');

                const { MongoClient } = require('mongodb');
                const client = new MongoClient(process.env.MONGODB_URI);

                await client.connect();
                const db = client.db('restaurant-erp');

                const updateResult = await db.collection('user').updateOne(
                    { email: 'admin@restaurant.com' },
                    { $set: { role: 'admin' } }
                );

                await client.close();

                if (updateResult.modifiedCount > 0) {
                    console.log('✅ Admin role updated successfully');
                    console.log('\n🎉 Admin user ready!');
                    console.log('📧 Email: admin@restaurant.com');
                    console.log('🔑 Password: Try the original password or admin123456');
                    console.log('👑 Role: admin');
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Make sure the development server is running:');
        console.log('npm run dev');
    }
}

createAdminViaAPI().catch(console.error);