#!/usr/bin/env node

// Script to update user role for development/testing
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-erp';

async function updateUserRole() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db('restaurant-erp');
        const usersCollection = db.collection('user');

        // Get all users
        const users = await usersCollection.find({}).toArray();
        console.log('Current users:');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} - Role: ${user.role || 'user'}`);
        });

        if (users.length === 0) {
            console.log('No users found in the database.');
            return;
        }

        // Update the first user to admin role (or you can specify email)
        const userToUpdate = users[0]; // Update first user

        const result = await usersCollection.updateOne(
            { _id: userToUpdate._id },
            { $set: { role: 'admin' } }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ Successfully updated ${userToUpdate.email} to admin role`);
        } else {
            console.log('❌ Failed to update user role');
        }

    } catch (error) {
        console.error('Error updating user role:', error);
    } finally {
        await client.close();
    }
}

// Run the script
updateUserRole().catch(console.error);