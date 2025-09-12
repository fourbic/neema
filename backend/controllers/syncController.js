const User = require('../models/User');

// @desc    Sync data for a user
// @route   POST /api/sync
// @access  Private
const syncData = async (req, res) => {
  const { userId, deviceId, timestamp } = req.body;

  if (!userId || !deviceId || !timestamp) {
    return res.status(400).json({ message: 'Missing required fields for sync' });
  }

  try {
    // For now, we'll just acknowledge the sync request and return success.
    // In the future, this is where you would put your actual sync logic.
    console.log(`Sync request received for user ${userId} from device ${deviceId}`);

    // You might want to update the user's last seen status or device activity

    res.status(200).json({ success: true, message: 'Sync acknowledged' });

  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({ message: 'Server error during sync' });
  }
};

module.exports = {
  syncData,
};
