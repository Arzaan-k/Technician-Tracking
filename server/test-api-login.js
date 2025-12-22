import fetch from 'node-fetch';

async function testAPILogin() {
    try {
        console.log('🧪 Testing Login API Endpoint\n');

        const API_URL = 'http://localhost:3000/api/auth/login';
        const credentials = {
            email: 'admin@loctrack.com',
            password: 'password123'
        };

        console.log('📡 Sending POST request to:', API_URL);
        console.log('📧 Email:', credentials.email);
        console.log('🔑 Password:', credentials.password);
        console.log('');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        console.log('📊 Response Status:', response.status, response.statusText);

        const data = await response.json();

        if (response.ok) {
            console.log('✅ LOGIN SUCCESSFUL!\n');
            console.log('🎫 Token:', data.token.substring(0, 30) + '...');
            console.log('👤 User Info:');
            console.log('   ID:', data.user.id);
            console.log('   Email:', data.user.email);
            console.log('   Name:', data.user.firstName, data.user.lastName);
            console.log('   Role:', data.user.role);
        } else {
            console.log('❌ LOGIN FAILED!\n');
            console.log('Error:', data.error || data);
            console.log('\n🔧 Troubleshooting:');
            console.log('   1. Make sure the server is running (npm run dev:server)');
            console.log('   2. Check if the database has the user');
            console.log('   3. Verify the password hash is correct');
        }

    } catch (error) {
        console.error('❌ Request Error:', error.message);
        console.log('\n💡 Is the server running? Start it with:');
        console.log('   cd server && npm run dev');
    }
}

testAPILogin();
