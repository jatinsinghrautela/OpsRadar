const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Host runs talk to published Compose port, not the docker network hostname.
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    .replace('@postgres:5432', '@localhost:5433')
    .replace('@postgres:', '@localhost:');
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://opsradar:alert123@localhost:5433/opsradar';
}

module.exports = {};
