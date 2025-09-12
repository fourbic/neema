const express = require('express');
const router = express.Router();
const axios = require('axios');

// TODO: Ensure these are set in your environment variables
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5050/integrations/linkedin/callback';

// Base URL for LinkedIn API v2 (confirm specific endpoints needed)
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

// Helper to get Axios config with user's token
// Assumes user object with linkedinAccessToken is attached via auth middleware
const getAxiosConfig = (req) => {
  // TODO: Replace with actual logic to get user's LinkedIn access token
  const accessToken = req.dbUser?.integrations?.linkedin?.accessToken;
  if (!accessToken) {
    console.warn('No LinkedIn access token found for user.');
    throw new Error('LinkedIn token missing'); // Throw error to be caught by route handler
  }
  return {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0', // Often required
      'LinkedIn-Version': '202309' // Use a recent API version, check LinkedIn docs
    }
  };
};

// === Authentication Routes ===

// POST /integrations/linkedin/connect
router.post('/connect', (req, res) => {
  try {
     if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
       throw new Error('LinkedIn client ID or redirect URI not configured.');
    }
    // Define required scopes (adjust based on needed permissions)
    // Common scopes: r_liteprofile, r_emailaddress, w_member_social, r_organization_social, w_organization_social, rw_messaging (requires special approval)
    const scopes = [
        'r_liteprofile', 
        'r_emailaddress',
        'w_member_social' // Permission to post/comment/like on behalf of member
        // Add 'rw_messaging' ONLY if you have approval
        ].join('%20'); // URL-encode space

    // TODO: Implement state parameter for security
    const state = 'DCEeFWf45A53sdfKef424' // Generate a secure random state
    // TODO: Store the state temporarily (e.g., in session or cache) to verify on callback

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${scopes}`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Error initiating LinkedIn connection:', error);
    res.status(500).json({ message: 'Failed to initiate LinkedIn connection' });
  }
});

// POST /integrations/linkedin/callback
router.post('/callback', async (req, res) => {
  const { userId, code, state } = req.body;

  // TODO: Verify the received 'state' matches the one stored for the user
  // if (state !== storedState) { return res.status(403).json({ message: 'Invalid state parameter' }); }

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is required' });
  }
   if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_REDIRECT_URI) {
     console.error('LinkedIn OAuth environment variables not configured.');
     return res.status(500).json({ message: 'LinkedIn integration configuration error.' });
  }

  try {
    const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', LINKEDIN_REDIRECT_URI);
    params.append('client_id', LINKEDIN_CLIENT_ID);
    params.append('client_secret', LINKEDIN_CLIENT_SECRET);

    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in; // Usually in seconds
    // const refreshToken = response.data.refresh_token; // Might get refresh token depending on scopes/settings
    // const refreshTokenExpiresIn = response.data.refresh_token_expires_in;

    // TODO: IMPORTANT: Securely store the accessToken (and potentially refresh token) associated with the userId.
    // Calculate expiry time: Date.now() + expiresIn * 1000
    // Example: await UserModel.findByIdAndUpdate(userId, { linkedinAccessToken: accessToken, linkedinTokenExpiry: Date.now() + expiresIn * 1000 });
    // --- Store Token --- 
    const updatedUser = await User.findOneAndUpdate(
        { clerkId: userId },
        {
            $set: {
                'integrations.linkedin.connected': true,
                'integrations.linkedin.accessToken': accessToken,
                'integrations.linkedin.tokenExpiry': new Date(Date.now() + expiresIn * 1000)
            }
        },
        { new: true }
    );
    if (!updatedUser) {
        console.error(`Failed to find user ${userId} to store LinkedIn token.`);
        return res.status(404).json({ message: 'User not found while saving LinkedIn connection.' });
    }
    console.log(`Stored LinkedIn token for user ${userId}`);
    // --- End Store Token --- 

    res.json({ success: true });

  } catch (error) {
    console.error('Error completing LinkedIn OAuth callback:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to get LinkedIn access token' });
  }
});

// GET /integrations/linkedin/status
router.get('/status', async (req, res) => {
  try {
    const user = req.dbUser; // User is already loaded by middleware
    const connected = user?.integrations?.linkedin?.connected &&
                      user.integrations.linkedin.accessToken &&
                      user.integrations.linkedin.tokenExpiry > new Date();
    res.json({ connected });
  } catch (error) {
    console.error('Error checking LinkedIn status:', error);
    res.json({ connected: false });
  }
});

// POST /integrations/linkedin/disconnect
router.post('/disconnect', async (req, res) => {
  const { userId } = req.body;
  try {
    // Clear the stored LinkedIn token(s) for the user in your database
    await User.findOneAndUpdate({ clerkId: userId }, {
        $set: { 'integrations.linkedin.connected': false },
        $unset: { 'integrations.linkedin.accessToken': '', 'integrations.linkedin.tokenExpiry': '' }
    });
    console.log(`User ${userId} disconnected from LinkedIn.`);
    // Note: You might also want to make an API call to LinkedIn to revoke the token, if available.
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    res.status(500).json({ message: 'Failed to disconnect LinkedIn' });
  }
});

// === Data Routes ===
// Simple middleware to catch missing token error
router.use((req, res, next) => {
    // Skip for auth routes
    if (req.path.startsWith('/connect') || req.path.startsWith('/callback')) {
        return next();
    }
    try {
        req.axiosConfig = getAxiosConfig(req);
        next();
    } catch (error) {
        res.status(401).json({ message: 'LinkedIn integration not connected or token missing/expired.' });
    }
});

// GET /integrations/linkedin/profile - Get basic profile
router.get('/profile', async (req, res) => {
  try {
    // Endpoint for basic profile info (requires r_liteprofile scope)
    const response = await axios.get(`${LINKEDIN_API_BASE}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`, req.axiosConfig);
    // Map response to LinkedInProfile interface
    const profileData = response.data;
    const profile = {
        id: profileData.id,
        firstName: profileData.firstName?.localized?.en_US,
        lastName: profileData.lastName?.localized?.en_US,
        // Extract profile picture URL (may need checking based on actual API response structure)
        profilePicture: profileData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
        // Add headline, vanityName etc. if available and requested via projection
    };
    res.json(profile);
  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error fetching LinkedIn profile' });
  }
});

// GET /integrations/linkedin/connections - Placeholder (Requires special permission)
router.get('/connections', async (req, res) => {
  console.warn('Fetching LinkedIn connections API is restricted and requires special partner permissions.');
  // The standard API does NOT provide access to a user's full connection list.
  // You might be able to get *mutual* connections under certain programs.
  res.status(501).json({ message: 'Fetching LinkedIn connections is not implemented due to API restrictions.' });
});

// GET /integrations/linkedin/connections/search - Placeholder
router.get('/connections/search', async (req, res) => {
     console.warn('Searching LinkedIn connections API is restricted.');
     res.status(501).json({ message: 'Searching LinkedIn connections is not implemented due to API restrictions.' });
});


// === Content & Engagement (Requires w_member_social scope) ===

// GET /integrations/linkedin/feed - Placeholder (Complex)
router.get('/feed', async (req, res) => {
    console.warn("Fetching a user's LinkedIn feed via API is complex and may have limitations.");
    // This typically involves fetching posts from connections, companies followed etc. Requires multiple API calls and aggregation.
    // Refer to LinkedIn's Feed API documentation if available under your developer access level.
    res.status(501).json({ message: 'Fetching LinkedIn feed is not implemented.' });
});

// POST /integrations/linkedin/posts - Create a post
router.post('/posts', async (req, res) => {
  const { content, media } = req.body; // userId is implicit from token
  if (!content) {
      return res.status(400).json({ message: 'Post content is required.' });
  }

  try {
    // 1. Get the user's URN (needed for author field)
    const profileResponse = await axios.get(`${LINKEDIN_API_BASE}/me?projection=(id)`, req.axiosConfig);
    const userURN = `urn:li:person:${profileResponse.data.id}`;

    // 2. Construct the post body (check LinkedIn docs for current format)
    // Basic text post:
    let postBody = {
        author: userURN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text: content
                },
                shareMediaCategory: 'NONE' // Change if adding media
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS' // Or PUBLIC, etc.
        }
    };

    // TODO: Handle media uploads (images/videos) - this is a multi-step process involving registering assets first.
    if (media && media.length > 0) {
        console.warn('LinkedIn media posting requires asset registration - not fully implemented in this basic example.');
        // Simplified placeholder - refer to LinkedIn UGC Post API docs
        postBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE'; // Example if linking an article
        postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [{
            status: 'READY',
            originalUrl: media[0].url // Assumes article link for simplicity
        }];
         if (media[0].title) {
            postBody.specificContent['com.linkedin.ugc.ShareContent'].media[0].title = { text: media[0].title };
        }
    }

    // 3. Make the POST request to create the UGC Post
    const postResponse = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, postBody, req.axiosConfig);

    // 4. Return confirmation (the response contains the post ID)
    res.status(201).json({ id: postResponse.data.id /* The URN of the created post */ });

  } catch (error) {
    console.error('Error creating LinkedIn post:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error creating LinkedIn post' });
  }
});

// POST /integrations/linkedin/posts/comment - Placeholder
router.post('/posts/comment', async (req, res) => {
    const { postId, comment } = req.body;
    console.warn('LinkedIn commenting API requires specific URNs and structure.');
    // Need user URN, post URN (postId might need conversion)
    // Refer to Social Actions API or Comments API documentation.
    res.status(501).json({ message: 'Commenting on LinkedIn posts not fully implemented.' });
});

// POST /integrations/linkedin/posts/like - Placeholder
router.post('/posts/like', async (req, res) => {
    const { postId } = req.body;
    console.warn('LinkedIn liking API requires specific URNs.');
     // Need user URN, post URN (postId might need conversion)
    // Refer to Social Actions API or Reactions API documentation.
    res.status(501).json({ message: 'Liking LinkedIn posts not fully implemented.' });
});

// === Messaging (Requires special rw_messaging permission) ===

// GET /integrations/linkedin/conversations - Placeholder
router.get('/conversations', async (req, res) => {
    console.warn('LinkedIn Messaging API requires special approval.');
    res.status(501).json({ message: 'Fetching LinkedIn conversations requires approved Messaging API access.' });
});

// GET /integrations/linkedin/conversations/:conversationId/messages - Placeholder
router.get('/conversations/:conversationId/messages', async (req, res) => {
    console.warn('LinkedIn Messaging API requires special approval.');
    res.status(501).json({ message: 'Fetching LinkedIn messages requires approved Messaging API access.' });
});

// POST /integrations/linkedin/messages/send - Placeholder
router.post('/messages/send', async (req, res) => {
    console.warn('LinkedIn Messaging API requires special approval.');
    res.status(501).json({ message: 'Sending LinkedIn messages requires approved Messaging API access.' });
});

module.exports = router;
