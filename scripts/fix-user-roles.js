// Script to fix user roles for users created before the role assignment fix
const { MongoClient } = require('mongodb');

async function fixUserRoles() {
    const client = new MongoClient('mongodb+srv://zola:zola@cluster0.8oaktx9.mongodb.net/restaurant-erp');

    try {
        await client.connect();
        const db = client.db('restaurant-erp');

        console.log('Connected to MongoDB');
        console.log('Fixing user roles...\n');

        // Define the correct roles for specific users (you can modify this as needed)
        const userRoleUpdates = [
            { email: 'man@gmail.com', role: 'manager', firstName: 'Manager', lastName: 'User' },
            { email: 'jackie@gmail.com', role: 'user', firstName: 'Jackie', lastName: 'J' },
            { email: 'obsen@gmail.com', role: 'admin', firstName: 'Obsen', lastName: 'Roba' },
            { email: 'leul@gmail.com', role: 'user', firstName: 'Leul', lastName: 'Mesfin' },
        ];

        for (const update of userRoleUpdates) {
            const result = await db.collection('user').updateOne(
                { email: update.email },
                {
                    $set: {
                        role: update.role,
                        firstName: update.firstName,
                        lastName: update.lastName,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount > 0) {
                console.log(`✓ Updated ${update.email}: role=${update.role}, firstName=${update.firstName}, lastName=${update.lastName}`);
            } else {
                console.log(`✗ User not found: ${update.email}`);
            }
        }

        console.log('\n=== Updated Users ===');
        const users = await db.collection('user').find({}).toArray();
        users.forEach(user => {
            console.log(`${user.email}: ${user.role} (${user.firstName} ${user.lastName})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

fixUserRoles();