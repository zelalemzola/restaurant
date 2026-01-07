// Check which users exist in the database
const { MongoClient } = require('mongodb');

async function checkUsers() {
    const client = new MongoClient('mongodb+srv://zola:zola@cluster0.8oaktx9.mongodb.net/restaurant-erp');

    try {
        await client.connect();
        const db = client.db('restaurant-erp');

        console.log('=== All Users in Database ===');
        const allUsers = await db.collection('user').find({}).toArray();
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ID: ${user._id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Role: ${user.role || 'NOT SET'}`);
            console.log('---');
        });

        console.log(`Total users: ${allUsers.length}`);

        // Check the specific user ID from the error
        const problemUserId = '6956d1b70de7e2582f9c2471';
        console.log(`\nChecking for user ID: ${problemUserId}`);

        const foundUser = await db.collection('user').findOne({ _id: problemUserId });
        console.log('User exists:', foundUser ? 'YES' : 'NO');

        if (foundUser) {
            console.log('Found user:', foundUser);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkUsers();