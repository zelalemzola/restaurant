const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

async function fixExistingUsers() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db("restaurant-erp");

        console.log("=== Fixing Existing User Authentication Records ===");

        // Get all users
        const allUsers = await db.collection("user").find({}).toArray();
        console.log(`Found ${allUsers.length} total users`);

        // Check each user for proper account records
        const usersNeedingFix = [];

        for (const user of allUsers) {
            const properAccount = await db.collection("account").findOne({
                userId: user._id,
                providerId: "credential",
                accountId: { $regex: "^email:" }
            });

            if (!properAccount) {
                usersNeedingFix.push(user);
            }
        }

        console.log(`Found ${usersNeedingFix.length} users without proper account records`);

        if (usersNeedingFix.length === 0) {
            console.log("✓ All users have proper account records");
            return;
        }

        // Fix each user
        for (const user of usersNeedingFix) {
            console.log(`\nFixing user: ${user.email} (ID: ${user._id})`);

            try {
                // Check if there's an existing account with wrong format
                const existingAccount = await db.collection("account").findOne({
                    userId: user._id,
                    providerId: "credential"
                });

                if (existingAccount) {
                    console.log(`  - Found existing account with ID: ${existingAccount.accountId}`);

                    // Update the account to use proper format
                    await db.collection("account").updateOne(
                        { _id: existingAccount._id },
                        {
                            $set: {
                                accountId: `email:${user.email}`,
                                updatedAt: new Date()
                            }
                        }
                    );

                    console.log(`  ✓ Updated account format for ${user.email}`);
                } else {
                    console.log(`  - No existing account found, user needs password reset`);
                    console.log(`  - Creating placeholder account (user will need password reset)`);

                    // Create a placeholder account with a random password
                    // The user will need to reset their password
                    const placeholderPassword = Math.random().toString(36).substring(2, 15);
                    const hashedPassword = await bcrypt.hash(placeholderPassword, 12);

                    await db.collection("account").insertOne({
                        userId: user._id,
                        accountId: `email:${user.email}`,
                        providerId: "credential",
                        password: hashedPassword,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        needsPasswordReset: true // Custom flag to indicate password reset needed
                    });

                    console.log(`  ✓ Created placeholder account for ${user.email} (needs password reset)`);
                }

            } catch (userError) {
                console.error(`  ✗ Failed to fix user ${user.email}:`, userError.message);
            }
        }

        // Verify the fixes
        console.log("\n=== Verification ===");
        const remainingIssues = [];

        for (const user of allUsers) {
            const properAccount = await db.collection("account").findOne({
                userId: user._id,
                providerId: "credential",
                accountId: { $regex: "^email:" }
            });

            if (!properAccount) {
                remainingIssues.push(user);
            }
        }

        if (remainingIssues.length === 0) {
            console.log("✓ All users now have proper account records");
        } else {
            console.log(`✗ ${remainingIssues.length} users still have issues`);
            remainingIssues.forEach(user => {
                console.log(`  - ${user.email} (ID: ${user._id})`);
            });
        }

    } catch (error) {
        console.error("Fix script error:", error);
    } finally {
        await client.close();
    }
}

fixExistingUsers();