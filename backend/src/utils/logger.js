const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../logs/app.log');

// Ensure log directory exists
try {
  const dir = path.dirname(logFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch (e) {
  // Silent fallback
}

const writeLog = (level, message, meta = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  
  if (process.env.NODE_ENV === 'production') {
    // Structured JSON logging for production (standard in enterprise ELK/Datadog environments)
    const jsonStr = JSON.stringify(logEntry);
    console.log(jsonStr);
    try {
      fs.appendFileSync(logFile, jsonStr + '\n');
    } catch (e) {}
  } else {
    // Readable console logging for local development
    const metaStr = Object.keys(meta).length ? ` | Meta: ${JSON.stringify(meta)}` : '';
    console.log(`[${logEntry.timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
  }
};

const logger = {
  info: (msg, meta) => writeLog('info', msg, meta),
  warn: (msg, meta) => writeLog('warn', msg, meta),
  error: (msg, meta) => writeLog('error', msg, meta),
  debug: (msg, meta) => writeLog('debug', msg, meta),
};

module.exports = logger;
