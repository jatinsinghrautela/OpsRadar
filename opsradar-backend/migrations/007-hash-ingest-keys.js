'use strict';

const crypto = require('crypto');
const { DataTypes } = require('sequelize');

function hashKey(plaintext) {
  return crypto.createHash('sha256').update(String(plaintext), 'utf8').digest('hex');
}

function prefixKey(plaintext) {
  return String(plaintext).slice(0, 8);
}

async function up(queryInterface) {
  const desc = await queryInterface.describeTable('Servers');

  if (!desc.ingest_api_key_hash) {
    await queryInterface.addColumn('Servers', 'ingest_api_key_hash', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
  }
  if (!desc.ingest_api_key_prefix) {
    await queryInterface.addColumn('Servers', 'ingest_api_key_prefix', {
      type: DataTypes.STRING(16),
      allowNull: true
    });
  }

  const refreshed = await queryInterface.describeTable('Servers');
  if (refreshed.ingest_api_key) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT server_id, ingest_api_key FROM "Servers" WHERE ingest_api_key IS NOT NULL`
    );
    for (const row of rows) {
      const key = row.ingest_api_key;
      // Already migrated shape (hash-looking) should be re-keyed; plaintext hex keys are 64 chars
      const hash = hashKey(key);
      const prefix = prefixKey(key);
      await queryInterface.sequelize.query(
        `UPDATE "Servers"
         SET ingest_api_key_hash = :hash, ingest_api_key_prefix = :prefix
         WHERE server_id = :id`,
        { replacements: { hash, prefix, id: row.server_id } }
      );
    }

    try {
      await queryInterface.removeIndex('Servers', 'servers_ingest_api_key_uidx');
    } catch (_) {
      /* ignore */
    }
    await queryInterface.removeColumn('Servers', 'ingest_api_key');
  }

  // Ensure every server has a hash (servers that had null plaintext)
  const [missing] = await queryInterface.sequelize.query(
    `SELECT server_id FROM "Servers" WHERE ingest_api_key_hash IS NULL`
  );
  for (const row of missing) {
    const plaintext = crypto.randomBytes(32).toString('hex');
    await queryInterface.sequelize.query(
      `UPDATE "Servers"
       SET ingest_api_key_hash = :hash, ingest_api_key_prefix = :prefix
       WHERE server_id = :id`,
      {
        replacements: {
          hash: hashKey(plaintext),
          prefix: prefixKey(plaintext),
          id: row.server_id
        }
      }
    );
  }

  try {
    await queryInterface.addIndex('Servers', ['ingest_api_key_hash'], {
      unique: true,
      name: 'servers_ingest_api_key_hash_uidx'
    });
  } catch (_) {
    /* may already exist */
  }
}

async function down(queryInterface) {
  const desc = await queryInterface.describeTable('Servers');

  if (!desc.ingest_api_key) {
    await queryInterface.addColumn('Servers', 'ingest_api_key', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
  }

  // Cannot restore original plaintext from hash — mint new keys on rollback
  const [rows] = await queryInterface.sequelize.query(`SELECT server_id FROM "Servers"`);
  for (const row of rows) {
    const key = crypto.randomBytes(32).toString('hex');
    await queryInterface.sequelize.query(
      `UPDATE "Servers" SET ingest_api_key = :key WHERE server_id = :id`,
      { replacements: { key, id: row.server_id } }
    );
  }

  try {
    await queryInterface.removeIndex('Servers', 'servers_ingest_api_key_hash_uidx');
  } catch (_) {
    /* ignore */
  }

  const after = await queryInterface.describeTable('Servers');
  if (after.ingest_api_key_hash) {
    await queryInterface.removeColumn('Servers', 'ingest_api_key_hash');
  }
  if (after.ingest_api_key_prefix) {
    await queryInterface.removeColumn('Servers', 'ingest_api_key_prefix');
  }

  try {
    await queryInterface.addIndex('Servers', ['ingest_api_key'], {
      unique: true,
      name: 'servers_ingest_api_key_uidx'
    });
  } catch (_) {
    /* ignore */
  }
}

module.exports = { up, down };
