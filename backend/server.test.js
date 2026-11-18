const request = require('supertest');
const { app } = require('./server');

describe('Campus Commons API', () => {
  it('returns service health without requiring a signed-in account', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.database).toBe('MySQL');
  });

  it('requires a session to view shared resources', async () => {
    const response = await request(app).get('/api/resources');
    expect(response.statusCode).toBe(401);
  });

  it('validates sign-in fields before connecting to the database', async () => {
    const response = await request(app).post('/api/auth/login').send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/email and password/i);
  });
});
