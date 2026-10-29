const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

require('./setupEnv');

const { runMigrations } = require('../migrate');
const { bootstrapAdmin } = require('../services/bootstrap');
const { User } = require('../models/user');

describe('bootstrap admin', () => {
  before(async () => {
    await runMigrations();
  });

  it('is idempotent and leaves an admin account', async () => {
    const first = await bootstrapAdmin();
    assert.ok(first.username);
    const second = await bootstrapAdmin();
    assert.equal(second.created, false);

    const admin = await User.findOne({ where: { is_admin: true } });
    assert.ok(admin);
  });
});
