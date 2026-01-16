#!/usr/bin/env node

/**
 * Test script to manually trigger low stock notifications
 * and verify notification creation
 */

async function testNotifications() {
    console.log('🔔 Testing Notifications System\n');

    try {
        // Trigger low stock check
        console.log('1. Triggering low stock check...');
        const checkResponse = await fetch('http://localhost:3000/api/notifications/check-low-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const checkData = await checkResponse.json();
        console.log('✅ Low stock check result:', JSON.stringify(checkData, null, 2));

        // Fetch notifications
        console.log('\n2. Fetching notifications...');
        const notifResponse = await fetch('http://localhost:3000/api/notifications?userId=system');
        const notifData = await notifResponse.json();

        console.log('✅ Notifications fetched:');
        console.log(`   Total: ${notifData.data?.notifications?.length || 0}`);
        console.log(`   Unread: ${notifData.data?.unreadCount || 0}`);

        if (notifData.data?.notifications?.length > 0) {
            console.log('\n📋 Notification Details:');
            notifData.data.notifications.forEach((notif, index) => {
                console.log(`   ${index + 1}. ${notif.title}`);
                console.log(`      Type: ${notif.type}`);
                console.log(`      Read: ${notif.read}`);
                console.log(`      UserId: ${notif.userId}`);
            });
        }

        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testNotifications();
