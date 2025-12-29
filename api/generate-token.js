const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const userId = '19f564c8-4ba3-4352-a9eb-36ff7d266e93';
const email = 'admin@farmaciademp.com.br';
const role = 'MASTER';
const tenantId = 'e9675bde-126b-429a-a150-533e055e7cc0';

// Token expires in 30 days
const payload = {
  userId,
  email,
  role,
  tenantId,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
};

const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

console.log(token);
