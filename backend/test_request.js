const http = require('http');

const data = JSON.stringify({
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  role: 'manager'
});

const options = {
  hostname: 'localhost',
  port: 8888,
  path: '/api/register',
  method: 'OPTIONS',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 0,
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST'
  },
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
