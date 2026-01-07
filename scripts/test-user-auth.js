const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

async function testUserAuth() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db("restaurant-erp");

        console.log("=== Testing User Authentication Flow ===");

        // Check existing collections
        const collections = await db.listCollections().toArray();
        console.log("Available collections:", collections.map(c => c.name));

        // Check user collection structure
        const users = await db.collection("user").find({}).limit(5).toArray();
        console.log("\nUser collection sample:", JSON.stringify(users, null, 2));

        // Check account collection structure
        const accounts = await db.collection("account").find({}).limit(5).toArray();
        console.log("\nAccount collection sample:", JSON.stringify(accounts, null, 2));

        // Test password hashing consistency
        const testPassword = "testpass123";
        const hash1 = await bcrypt.hash(testPassword, 12);
        const hash2 = await bcrypt.hash(testPassword, 12);

        console.log("\n=== Password Hashing Test ===");
        console.log("Original password:", testPassword);
        console.log("Hash 1:", hash1);
        console.log("Hash 2:", hash2);
        console.log("Hash 1 validates:", await bcrypt.compare(testPassword, hash1));
        console.log("Hash 2 validates:", await bcrypt.compare(testPassword, hash2));

        // Check for any users with missing account records
        const usersWithoutAccounts = await db.collection("user").aggregate([
            {
                $lookup: {
                    from: "account",
                    localField: "_id",
                    foreignField: "userId",
                    as: "accounts"
                }
            },
            {
                $match: {
                    accounts: { $size: 0 }
                }
            }
        ]).toArray();

        console.log("\n=== Users without account records ===");
        console.log("Count:", usersWithoutAccounts.length);
        if (usersWithoutAccounts.length > 0) {
            console.log("Users:", JSON.stringify(usersWithoutAccounts, null, 2));
        }

    } catch (error) {
        console.error("Test error:", error);
    } finally {
        await client.close();
    }
}

testUserAuth();