const { setCors, getSupabase } = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabase();

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" });
  }

  // GET - Fetch notifications
  if (req.method === "GET") {
    try {
      const { userId, workspaceId, unreadOnly } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      if (unreadOnly === 'true') {
        query = query.eq('read', false);
      }

      const { data: notifications, error } = await query;

      if (error) {
        // Table might not exist
        console.error('Error fetching notifications:', error);
        return res.status(200).json({ notifications: [], unreadCount: 0 });
      }

      const unreadCount = notifications?.filter(n => !n.read).length || 0;

      res.status(200).json({
        notifications: notifications || [],
        unreadCount
      });
    } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }

  // POST - Mark notifications as read
  else if (req.method === "POST") {
    try {
      const { userId, notificationIds, markAllRead } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      if (markAllRead) {
        // Mark all notifications as read for this user
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false);

        if (error) throw error;

        return res.status(200).json({ success: true, message: "All notifications marked as read" });
      }

      if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', notificationIds)
          .eq('user_id', userId);

        if (error) throw error;

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "notificationIds or markAllRead is required" });
    } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  }

  else {
    res.status(405).json({ error: "Method not allowed" });
  }
};
