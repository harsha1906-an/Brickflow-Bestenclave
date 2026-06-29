const express = require('express');

const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const cookieParser = require('cookie-parser');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');


const villaApiRouter = require('./routes/appRoutes/villaApi');
const villaProgressApiRouter = require('./routes/appRoutes/villaProgressApi');
const labourApiRouter = require('./routes/appRoutes/labourApi');
const attendanceApiRouter = require('./routes/appRoutes/attendanceApi');
const reportingApiRouter = require('./routes/appRoutes/reportingApi');
const bookingApiRouter = require('./routes/appRoutes/bookingApi');
const chatApiRouter = require('./routes/appRoutes/chatRoutes');
const analyticsApiRouter = require('./routes/appRoutes/analyticsApi');
const whatsappApiRouter = require('./routes/appRoutes/whatsappRoutes');
const cronController = require('@/controllers/appControllers/cronController');

// create our Express app
const app = express();

// Trust proxy if we're behind a reverse proxy (e.g. AWS ALB, Nginx)
app.set('trust proxy', 1);

// Set security HTTP headers
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN === 'true' ? true : (process.env.CORS_ORIGIN || true),
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

app.use(compression());

// Handle redundant /api/api/ prefixes from cached clients
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  console.log('Incoming Request:', req.method, req.url);
  next();
});

// Manual Cron Trigger (PUBLIC for testing)
// WARNING: Remove or secure with a secret key in production
app.get('/api/cron/daily-summary', async (req, res) => {
  try {
    const { email, secret } = req.query;

    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid or missing cron secret key.',
      });
    }

    await cronController.runDailySummary(email);
    return res.status(200).json({
      success: true,
      message: `Daily summary triggered manually${email ? ' to ' + email : ''}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Here our API Routes

const { tenantMiddleware } = require('@/middlewares/tenantContext');

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, erpApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, villaApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, villaProgressApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, labourApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, attendanceApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, reportingApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, bookingApiRouter);
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, require('./routes/appRoutes/auditLogApi'));
app.use('/api', adminAuth.isValidAuthToken, tenantMiddleware, require('./routes/appRoutes/billApi'));
app.use('/api/chat', adminAuth.isValidAuthToken, tenantMiddleware, chatApiRouter);
app.use('/api/analytics', adminAuth.isValidAuthToken, tenantMiddleware, analyticsApiRouter);
app.use('/api/whatsapp', adminAuth.isValidAuthToken, tenantMiddleware, whatsappApiRouter);
app.use('/download', adminAuth.isValidAuthToken, tenantMiddleware, coreDownloadRouter);
app.use('/api/download', adminAuth.isValidAuthToken, tenantMiddleware, coreDownloadRouter);
app.use('/public', corePublicRouter);

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
