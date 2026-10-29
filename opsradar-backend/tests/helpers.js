const request = require('supertest');
const assert = require('node:assert/strict');

/**
 * Ensure lab inventory exists and return that server's ingest API key.
 * Prefer existing cli1-server; otherwise create minimal country/app/server.
 */
async function ensureIngestFixture(app, adminToken) {
  let servers = await request(app)
    .get('/servers')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(servers.status, 200);

  let target = servers.body.find((s) => s.name === 'cli1-server');
  if (!target) {
    // Ensure country
    const countries = await request(app)
      .get('/countries')
      .set('Authorization', `Bearer ${adminToken}`);
    if (!countries.body?.length) {
      await request(app)
        .post('/countries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ country_code: 'US', country_name: 'United States' });
    }

    // Ensure app
    const apps = await request(app)
      .get('/applications')
      .set('Authorization', `Bearer ${adminToken}`);
    if (!apps.body?.some((a) => a.name === 'monitor')) {
      await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ app_name: 'monitor', description: 'lab' });
    }

    // Ensure group exists (seeded in lab; create if API allows)
    const groups = await request(app)
      .get('/groups')
      .set('Authorization', `Bearer ${adminToken}`);
    if (groups.status === 200 && !groups.body?.some((g) => g.group_name === 'techops')) {
      await request(app)
        .post('/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ group_name: 'techops', description: 'lab' });
    }

    const created = await request(app)
      .post('/servers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        server_name: 'cli1-server',
        ip_address: '127.0.0.1',
        country_name: 'United States',
        app_name: 'monitor'
      });
    assert.equal(created.status, 201);
    assert.ok(created.body.ingest_api_key);
    return {
      serverId: created.body.id,
      serverName: created.body.name,
      apiKey: created.body.ingest_api_key
    };
  }

  const keyRes = await request(app)
    .post(`/servers/${target.id}/rotate-ingest-key`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(keyRes.status, 200);
  assert.ok(keyRes.body.ingest_api_key);
  return {
    serverId: target.id,
    serverName: target.name,
    apiKey: keyRes.body.ingest_api_key
  };
}

async function adminLogin(app) {
  const login = await request(app).post('/login').send({ username: 'admin', password: 'admin123' });
  // Bootstrap default may be ChangeMeNow! on fresh DBs
  if (login.status === 200 && login.body.token) {
    return login.body.token;
  }
  if (login.status === 200 && login.body.change_token) {
    // must change password — use change flow is heavy; try bootstrap password
  }
  const login2 = await request(app)
    .post('/login')
    .send({ username: 'admin', password: 'ChangeMeNow!' });
  if (login2.status === 200 && login2.body.token) return login2.body.token;
  if (login2.status === 200 && login2.body.change_token) {
    // For tests against bootstrap admin still needing password change, fulfill change
    const changed = await request(app)
      .post('/change-password')
      .set('X-Change-Token', login2.body.change_token)
      .send({ new_password: 'admin123' });
    assert.equal(changed.status, 200);
    assert.ok(changed.body.token);
    return changed.body.token;
  }
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  return login.body.token;
}

module.exports = { ensureIngestFixture, adminLogin };
