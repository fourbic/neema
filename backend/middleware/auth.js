const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User'); // Adjust path if needed

// Clerk middleware options (customize only if needed)
// Most deployments do not require options here unless using multi-tenant or advanced JWT settings.
// See: https://clerk.com/docs/reference/server/clerk-express-require-auth
const clerkAuthOptions = {
  // Example: restrict to specific authorized parties (audiences)
  // authorizedParties: ['your-frontend-app-domain'],
  // Example: override API key (usually not needed)
  // apiKey: process.env.CLERK_SECRET_KEY,
};

// Clerk authentication only (protects route, attaches req.auth)
const clerkAuth = ClerkExpressRequireAuth(clerkAuthOptions);

// Middleware to verify Clerk session and load user from DB
const loadUserFromClerk = async (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    // Should not happen if ClerkExpressRequireAuth runs first, but good practice
    return res.status(401).json({ message: 'Unauthorized: No authentication data found.' });
  }

  const clerkId = req.auth.userId;
  try {
    // Find the user in your database using the Clerk ID
    // Use .select('+integrations.google.refreshToken ...') to explicitly load hidden fields
    const user = await User.findOne({ clerkId: clerkId })
                           .select('+integrations.google.refreshToken +integrations.notion.accessToken +integrations.linkedin.accessToken +integrations.linkedin.tokenExpiry');

    if (!user) {
      // This case might happen if Clerk webhook for user creation hasn't run yet
      // or if there's an issue. 
      // Option 1: Try to create the user on-the-fly (requires fetching data from Clerk API)
      // const clerkUser = await clerkClient.users.getUser(clerkId); 
      // const newUser = await User.findOrCreateFromClerk(clerkUser);
      // req.dbUser = newUser; // Attach the newly created user

      // Option 2: Return an error indicating user setup is incomplete
      console.warn(`User with Clerk ID ${clerkId} found in session but not in database.`);
      return res.status(404).json({ message: 'User profile not found in database. Setup might be incomplete.' });
    }

    // Attach the database user object (including tokens) to the request
    req.dbUser = user;
    next(); // Proceed to the next middleware or route handler

  } catch (error) {
    console.error('Error loading user from database:', error);
    res.status(500).json({ message: 'Internal server error while fetching user data.' });
  }
};

// Combined middleware: Clerk auth + DB user loading
const requireAuthAndLoadUser = [clerkAuth, loadUserFromClerk];

/**
 * Exports:
 * - clerkAuth: Only Clerk JWT/session validation (use for simple auth)
 * - loadUserFromClerk: Attach DB user to req (use after clerkAuth)
 * - requireAuthAndLoadUser: [clerkAuth, loadUserFromClerk] as a convenience array
 */
module.exports = {
  clerkAuth,
  loadUserFromClerk,
  requireAuthAndLoadUser
};
