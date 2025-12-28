#!/usr/bin/env node

// Script to test product creation API
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;

async function testProductCreation() {
    const client = new MongoClient(MONGODB_URI);

    try {
        // Step 1: Get a product group ID
        await client.connect();
        const db = client.db('restaurant-erp');
        const productGroup = await db.collection('productgroups').findOne({});

        if (!productGroup) {
            console.log('❌ No product groups found. Please run: node scripts/setup-product-groups.js');
            return;
        }

        console.log('📦 Using product group:', productGroup.name);
        console.log('🆔 Group ID:', productGroup._id.toString());

        await client.close();

        // Step 2: Sign in to get session cookie
        console.log('\n🔐 Signing in as admin...');
        const signInResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@restaurant.com',
                password: 'admin123456'
            })
        });

        if (!signInResponse.ok) {
            console.log('❌ Failed to sign in');
            console.log('Response:', await signInResponse.text());
            return;
        }

        // Get cookies from sign-in response
        const cookies = signInResponse.headers.get('set-cookie');
        console.log('✅ Signed in successfully');

        // Step 3: Test product creation
        console.log('\n🚀 Testing product creation...');

        const testProduct = {
            name: 'Test Burger',
            groupId: productGroup._id.toString(),
            type: 'sellable',
            metric: 'pieces',
            currentQuantity: 10,
            minStockLevel: 5,
            sellingPrice: 12.99
        };

        console.log('📝 Product data:', JSON.stringify(testProduct, null, 2));

        const createResponse = await fetch(`${BASE_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies || ''
            },
            body: JSON.stringify(testProduct)
        });

        const responseText = await createResponse.text();
        console.log('\n📊 Response Status:', createResponse.status);
        console.log('📄 Response Body:', responseText);

        if (createResponse.ok) {
            console.log('✅ Product created successfully!');
        } else {
            console.log('❌ Product creation failed');

            // Try to parse error details
            try {
                const errorData = JSON.parse(responseText);
                if (errorData.error) {
                    console.log('🔍 Error Details:');
                    console.log('  Code:', errorData.error.code);
                    console.log('  Message:', errorData.error.message);
                    if (errorData.error.details) {
                        console.log('  Details:', JSON.stringify(errorData.error.details, null, 2));
                    }
                }
            } catch (e) {
                console.log('Could not parse error response as JSON');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the development server is running:');
            console.log('npm run dev');
        }
    } finally {
        if (client.topology && client.topology.isConnected()) {
            await client.close();
        }
    }
}

testProductCreation().catch(console.error);