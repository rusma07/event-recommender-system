const UserEventInteraction = require('../models/UserEventInteraction');
const Event = require('../models/Event');

// Get recommendations for a user based on similar users' liked events
exports.getCollaborativeRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Find events liked by the user
    const userLikes = await UserEventInteraction.find({ user: userId, liked: true }).select('event');
    const likedEventIds = userLikes.map(i => i.event.toString());

    // 2. Find other users who liked the same events
    const otherUsers = await UserEventInteraction.find({
      event: { $in: likedEventIds },
      user: { $ne: userId },
      liked: true
    }).select('user');

    const otherUserIds = [...new Set(otherUsers.map(i => i.user.toString()))];

    // 3. Find events liked by these other users, excluding events already liked by current user
    const recommendations = await UserEventInteraction.find({
      user: { $in: otherUserIds },
      liked: true,
      event: { $nin: likedEventIds }
    }).select('event');

    // Get unique recommended event IDs
    const recommendedEventIds = [...new Set(recommendations.map(r => r.event.toString()))];

    // 4. Fetch event details
    const recommendedEvents = await Event.find({ _id: { $in: recommendedEventIds } }).limit(10);

    res.json(recommendedEvents);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
