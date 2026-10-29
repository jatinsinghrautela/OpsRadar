const express = require('express');
const cors = require('cors');

function createApp() {
  const app = express();

  app.use(express.json());

  const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.use(cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Change-Token']
  }));

  app.use(require('./routes/health'));
  app.use(require('./routes/auth'));
  app.use(require('./routes/passwordReset'));
  app.use(require('./routes/alerts'));
  app.use(require('./routes/agents'));
  app.use(require('./routes/audit'));
  app.use(require('./routes/dashboard'));
  app.use(require('./routes/users'));
  app.use(require('./routes/permissions'));
  app.use(require('./routes/accessRequests'));
  app.use(require('./routes/notifications'));
  app.use(require('./routes/notificationPrefs'));
  app.use(require('./routes/groups'));
  app.use(require('./routes/servers'));
  app.use(require('./routes/countries'));
  app.use(require('./routes/applications'));

  return app;
}

module.exports = { createApp };
