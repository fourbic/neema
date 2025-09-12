const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path'); // Import path module
const connectDB = require('./config/db');
const { requireAuthAndLoadUser } = require('./middleware/auth'); // Import the middleware

// Initialize Express
const app = express();

// Connect to MongoDB
connectDB();

// Load Mongoose models
require('./models/User');
require('./models/SafetyIncident');
require('./models/CommunityThreat');
require('./models/SafetyAuditLog');

// Middleware
app.use(helmet());
// Configure CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8080', // Allow frontend URL from env or default to localhost
  'http://localhost:8081', // Allow alternate localhost port for development
  'https://neema.ch3ruiyotai.space' // Explicitly allow production frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    // For development/testing - allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // Allow cookies to be sent
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// --- Routes --- 

// Public routes (like health check)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Devices registration route (no auth required)
app.use('/api/devices', require('./routes/devices'));

// Mount the central API router
app.use('/api', require('./routes/index')); // Use the central router for all /api/* routes 

// Catch-all route to serve index.html for client-side routing (Commented out for development)
// app.get('*', (req, res) => {
//   // In production, this should point to the frontend build output (e.g., ../dist/index.html)
//   res.sendFile(path.join(__dirname, 'public', 'index.html')); 
// });

// --- Error Handling --- 
// Note: Clerk's default error handler might catch auth errors before this.
// Consider adding specific Clerk error handling if needed.
app.use((err, req, res, next) => {
  console.error("[Global Error Handler]");
  console.error(err);

  // Check for Clerk specific errors
  if (err.name === 'ClerkAPIError') {
      return res.status(err.status || 500).json({ message: err.message, errors: err.errors });
  }
  if (err.message && (err.message.toLowerCase().includes('unauthenticated') || err.message.toLowerCase().includes('unauthorized'))) {
       return res.status(401).json({ message: 'Authentication required.' });
  }

  // General error handling
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'ServerError',
    message: err.message || 'An unexpected error occurred'
  });
});

module.exports = app;