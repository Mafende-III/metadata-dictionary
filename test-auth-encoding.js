// Simple test to verify base64 encoding for DHIS2 authentication
const username = 'bmafende';
const password = 'your-password-here'; // Replace with actual password for testing

console.log('🔧 Authentication Encoding Test');
console.log('================================');

// Method 1: Node.js Buffer (what our app uses)
const nodeToken = Buffer.from(`${username}:${password}`).toString('base64');
console.log('Node.js Buffer method:', nodeToken);

// Method 2: Manual base64 (alternative approach)
const manualToken = btoa(`${username}:${password}`);
console.log('btoa method (if available):', typeof btoa !== 'undefined' ? manualToken : 'btoa not available in Node.js');

// Method 3: What curl would generate
console.log('\nCurl equivalent:');
console.log(`curl -H "Authorization: Basic ${nodeToken}" \\`);
console.log('     https://197.243.28.37/hmis/api/me');

// Method 4: Test with known working credentials
const testUsername = 'admin';
const testPassword = 'district';
const testToken = Buffer.from(`${testUsername}:${testPassword}`).toString('base64');
console.log('\nTest with common DHIS2 credentials:');
console.log(`Username: ${testUsername}`);
console.log(`Password: ${testPassword}`);
console.log(`Token: ${testToken}`);

// Method 5: Decode to verify
console.log('\nDecoding test:');
const decoded = Buffer.from(nodeToken, 'base64').toString('utf8');
console.log(`Decoded: ${decoded}`);
console.log(`Expected: ${username}:${password}`);
console.log(`Match: ${decoded === `${username}:${password}`}`); 