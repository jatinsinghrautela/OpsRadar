function log(level, message, fields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...fields
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  info: (message, fields) => log('info', message, fields),
  warn: (message, fields) => log('warn', message, fields),
  error: (message, fields) => log('error', message, fields)
};
