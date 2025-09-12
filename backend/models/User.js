const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true // Index for faster lookups
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    // required: true // Consider if this is always available from Clerk sync
  },
  lastName: {
    type: String
  },
  profileImageUrl: {
    type: String
  },
  preferences: {
    theme: {
      type: String,
      default: 'light'
    },
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
    // Add other user preferences here
  },
  // Safety-related fields
  safetyProfile: {
    type: Schema.Types.ObjectId,
    ref: 'SafetyProfile'
  },
  safetySettings: {
    emergencyMode: { type: Boolean, default: false },
    lastSafetyCheck: { type: Date, default: Date.now },
    safetyScore: { type: Number, min: 0, max: 10, default: 5 }
  },
  // Store integration tokens and status directly here
  integrations: {
    google: {
      connected: { type: Boolean, default: false },
      // Store only the refresh token for Google Calendar/Gmail as access tokens are short-lived
      refreshToken: { type: String, select: false }, // select: false hides it by default
      // You might store scopes granted here if needed
      // scopes: [String],
    },
    notion: {
      connected: { type: Boolean, default: false },
      accessToken: { type: String, select: false }, // Store the access token from Notion OAuth
      botId: { type: String },
      workspaceId: { type: String },
      workspaceName: { type: String },
      workspaceIcon: { type: String },
      ownerInfo: { type: Object } // Store user info from Notion owner object if needed
    },
    linkedin: {
      connected: { type: Boolean, default: false },
      accessToken: { type: String, select: false },
      tokenExpiry: { type: Date, select: false } // LinkedIn tokens expire
      // Add refresh token and its expiry if applicable
    }
    // Add other integrations like Trello etc.
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manages createdAt and updatedAt
  // Ensure virtuals are included if you use them (e.g., for fullName)
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Optional: Method to check if a specific integration is connected and valid
UserSchema.methods.isIntegrationConnected = function(integrationName) {
  if (!this.integrations?.[integrationName]?.connected) {
    return false;
  }
  // Add checks for token validity if needed (e.g., expiry for LinkedIn)
  if (integrationName === 'linkedin' && this.integrations.linkedin.tokenExpiry && this.integrations.linkedin.tokenExpiry < new Date()) {
      console.log(`LinkedIn token expired for user ${this.clerkId}`);
      return false;
  }
  // For Google, having a refresh token implies connection possibility
  if (integrationName === 'google' && !this.integrations.google.refreshToken) {
      return false;
  }
  // For Notion, having an access token implies connection
  if (integrationName === 'notion' && !this.integrations.notion.accessToken) {
       return false;
  }
  return true;
};

// Find or create user based on Clerk info (useful for webhooks or middleware)
UserSchema.statics.findOrCreateFromClerk = async function(clerkUser) {
  if (!clerkUser || !clerkUser.id) {
    throw new Error('Invalid Clerk user data provided.');
  }
  let user = await this.findOne({ clerkId: clerkUser.id });
  if (!user) {
    // Extract primary email address
    const primaryEmail = clerkUser.email_addresses?.find(e => e.id === clerkUser.primary_email_address_id)?.email_address;
    if (!primaryEmail) {
        console.warn(`Clerk user ${clerkUser.id} does not have a primary email address.`);
        // Decide how to handle this case - maybe skip user creation or use a placeholder
    }
    user = new this({
      clerkId: clerkUser.id,
      email: primaryEmail || `placeholder-${clerkUser.id}@example.com`, // Use placeholder if no email
      firstName: clerkUser.first_name,
      lastName: clerkUser.last_name,
      profileImageUrl: clerkUser.image_url,
      integrations: {}, // Initialize empty integrations object
      preferences: {}, // Initialize preferences
    });
    await user.save();
    console.log(`Created new user in DB for Clerk ID: ${clerkUser.id}`);
  } else {
    // Optionally, update user fields if they changed in Clerk
    let needsUpdate = false;
    const primaryEmail = clerkUser.email_addresses?.find(e => e.id === clerkUser.primary_email_address_id)?.email_address;
    if (primaryEmail && user.email !== primaryEmail) { user.email = primaryEmail; needsUpdate = true; }
    if (clerkUser.first_name && user.firstName !== clerkUser.first_name) { user.firstName = clerkUser.first_name; needsUpdate = true; }
    if (clerkUser.last_name && user.lastName !== clerkUser.last_name) { user.lastName = clerkUser.last_name; needsUpdate = true; }
    if (clerkUser.image_url && user.profileImageUrl !== clerkUser.image_url) { user.profileImageUrl = clerkUser.image_url; needsUpdate = true; }
    
    if (needsUpdate) {
        await user.save();
        console.log(`Updated user in DB for Clerk ID: ${clerkUser.id}`);
    }
  }
  return user;
};

module.exports = mongoose.model('User', UserSchema);
