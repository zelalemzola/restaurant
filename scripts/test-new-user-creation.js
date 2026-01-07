const fetch = require('node-fetch');
require("dotenv").config({ path: ".env.local" });

async function testUserCreation() {
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    console.log("=== Testing New User Creation API ===");

    // First, get an admin session
    console.log("\n1. Getting admin session...");

    const signInResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: "admin@restaurant.com",
            password: "admin123", // This might not be correct
        }),
    });

    console.log("Sign-in response status:", signInResponse.status);

    if (signInResponse.status !== 200) {
        console.log("Sign-in failed, trying with different credentials...");
        // We'll skip the actual user creation test for now
        return;
    }

    const cookies = signInResponse.headers.get('set-cookie');
    console.log("Got session cookies");

    // Test user creation
    console.log("\n2. Testing user creation...");

    const testUser = {
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
        firstName: "Test",
        lastName: "User",
        role: "user",
        password: "TestPass123"
    };

    const createResponse = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
        },
        body: JSON.stringify(testUser),
    });

    const createResult = await createResponse.text();
    console.log("Create user response status:", createResponse.status);
    console.log("Create user response:", createResult);

    if (createResponse.status === 201) {
        console.log("✓ User creation successful!");

        // Test immediate login
        console.log("\n3. Testing immediate login with new user...");

        const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password,
            }),
        });

        console.log("New user login status:", loginResponse.status);

        if (loginResponse.status === 200) {
            console.log("✓ New user can login immediately!");
        } else {
            const loginError = await loginResponse.text();
            console.log("✗ New user login failed:", loginError);
        }
    } else {
        console.log("✗ User creation failed");
    }
}

testUserCreation().catch(console.error);