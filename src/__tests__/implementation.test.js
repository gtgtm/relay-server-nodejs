const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const constants = require('../config/constants');
const { User, Device } = require('../models');

describe('Authentication & JWT Implementation', () => {
  let testUser;
  let token;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'testpassword123',
      name: 'Test User',
      role: 'user',
    });
  });

  afterAll(async () => {
    if (testUser) await testUser.destroy();
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'newuser@example.com',
        password: 'securepass123',
        name: 'New User',
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('newuser@example.com');

      // Cleanup
      const user = await User.findOne({ where: { email: 'newuser@example.com' } });
      if (user) await user.destroy();
    });

    it('should reject duplicate email', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Duplicate',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('registered');
    });

    it('should reject short password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'short@example.com',
        password: 'short',
        name: 'Short Pass',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login and return token', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'testpassword123',
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('test@example.com');

      // Store token for subsequent tests
      token = response.body.data.token;
    });

    it('should reject wrong password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('JWT Middleware', () => {
    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe(401);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should accept valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('test@example.com');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid JWT', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('token');

      // New token should be valid
      const newResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${response.body.data.token}`);

      expect(newResponse.status).toBe(200);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logout');
    });
  });
});

describe('Device Management', () => {
  let token;
  let deviceId;

  beforeAll(async () => {
    // Create user and get token
    const user = await User.create({
      email: 'device-test@example.com',
      password: 'testpass123',
      role: 'user',
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'device-test@example.com',
      password: 'testpass123',
    });

    token = loginResponse.body.data.token;
  });

  describe('POST /api/devices/register', () => {
    it('should register new device', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Camera',
          role: 'camera',
          deviceType: 'iOS',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Test Camera');
      expect(response.body.data.role).toBe('camera');

      deviceId = response.body.data.deviceId;
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Device',
          role: 'invalid',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/devices', () => {
    it('should list user devices', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/devices/:id', () => {
    it('should get device details', async () => {
      const response = await request(app)
        .get(`/api/devices/${deviceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.deviceId).toBe(deviceId);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .get('/api/devices/nonexistent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/devices/:id', () => {
    it('should update device', async () => {
      const response = await request(app)
        .put(`/api/devices/${deviceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Camera' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Camera');
    });
  });

  describe('POST /api/devices/:id/heartbeat', () => {
    it('should record heartbeat', async () => {
      const response = await request(app)
        .post(`/api/devices/${deviceId}/heartbeat`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('lastHeartbeat');
    });
  });

  describe('DELETE /api/devices/:id', () => {
    it('should delete device', async () => {
      const response = await request(app)
        .delete(`/api/devices/${deviceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/devices/${deviceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });
  });
});

describe('Response Format Consistency', () => {
  it('should have consistent error response format', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'invalid@example.com',
      password: 'wrong',
    });

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  });

  it('should have consistent success response format', async () => {
    const response = await request(app).get('/');

    expect(response.body).toHaveProperty('message');
  });
});

describe('CORS Configuration', () => {
  it('should set CORS headers', async () => {
    const response = await request(app).get('/');

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
