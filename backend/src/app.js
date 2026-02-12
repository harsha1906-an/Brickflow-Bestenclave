const express = require('express');

const cors = require('cors');
const compression = require('compression');

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

const fileUpload = require('express-fileupload');
// create our Express app
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// Handle redundant /api/api/ prefixes from cached clients
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  console.log('Incoming Request:', req.method, req.url);
  next();
});

// Here our API Routes

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/api', adminAuth.isValidAuthToken, villaApiRouter);
app.use('/api', adminAuth.isValidAuthToken, villaProgressApiRouter);
app.use('/api', adminAuth.isValidAuthToken, labourApiRouter);
app.use('/api', adminAuth.isValidAuthToken, attendanceApiRouter);
app.use('/api', adminAuth.isValidAuthToken, reportingApiRouter);
app.use('/api', adminAuth.isValidAuthToken, bookingApiRouter);
app.use('/api/chat', adminAuth.isValidAuthToken, chatApiRouter);
app.use('/api/analytics', adminAuth.isValidAuthToken, analyticsApiRouter);
app.use('/download', adminAuth.isValidAuthToken, coreDownloadRouter);
app.use('/public', corePublicRouter);

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
