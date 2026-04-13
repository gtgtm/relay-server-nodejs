const request = require('supertest');
const express = require('express');
const healthRoutes = require('../routes/health');

describe('Health Check Endpoint', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api', healthRoutes);
  });

  test('GET /api/health should return 200 with status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('cameras');
    expect(response.body).toHaveProperty('node_version');
  });

  test('GET /api/health should include uptime', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body).toHaveProperty('uptime');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThan(0);
  });
});
