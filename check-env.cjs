const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.local');

console.log('Checking .env.local at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('.env.local exists.');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('Error loading .env.local:', result.error);
    } else {
        console.log('.env.local loaded.');
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (key) {
            console.log('SUPABASE_SERVICE_ROLE_KEY is present (length: ' + key.length + ')');
        } else {
            console.log('SUPABASE_SERVICE_ROLE_KEY is MISSING after loading file.');
        }
    }
} else {
    console.log('.env.local NOT found.');
}
