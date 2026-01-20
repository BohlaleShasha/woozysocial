// Test the create-account function locally to see the actual error
require('dotenv').config();
const handler = require('./api/signup/create-account.js');

// Mock request and response
const req = {
  method: 'POST',
  headers: {
    'x-api-key': process.env.API_SECRET_KEY
  },
  body: {
    fullName: 'Test User Local',
    email: `testlocal${Date.now()}@example.com`,
    password: 'password123',
    workspaceName: 'Test Workspace',
    selectedTier: 'pro'
  }
};

const res = {
  headersSent: false,
  statusCode: 200,
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    console.log('Response Status:', this.statusCode);
    console.log('Response Body:', JSON.stringify(data, null, 2));
    this.headersSent = true;
    return this;
  },
  end() {
    this.headersSent = true;
    return this;
  }
};

console.log('Testing create-account endpoint locally...\n');
console.log('Request email:', req.body.email);
console.log('---\n');

handler(req, res).then(() => {
  console.log('\n--- Test Complete ---');
  process.exit(res.statusCode === 200 ? 0 : 1);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
