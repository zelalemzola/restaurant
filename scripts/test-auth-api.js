const fetch = require('node-fetch');
require("dotenv").config({ path: ".env.local" });

async function testAuthAPI() {
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    console.log("=== Testing Better-Auth API ===");

    // Test with a known user
    const testEmail = "admin@restaurant.com";
    const testPassword = "admin123"; // This might not be the actual password

    try {
        console.log(`\nTesting sign-in for: ${testEmail}`);

        const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
            }),
        });

        const result = await response.text();
        console.log("Response status:", response.status);
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));
        console.log("Response body:", result);

    } catch (error) {
        console.error("Auth API test error:", error);
    }
}

testAuthAPI();