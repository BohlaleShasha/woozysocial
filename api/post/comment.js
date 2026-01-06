const { setCors, getSupabase, parseBody } = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" });
  }

  // POST - Add a comment
  if (req.method === "POST") {
    try {
      const body = await parseBody(req);
      const { postId, workspaceId, userId, comment } = body;

      if (!postId || !workspaceId || !userId || !comment) {
        return res.status(400).json({
          error: "postId, workspaceId, userId, and comment are required"
        });
      }

      // Verify user is a member of the workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        return res.status(403).json({ error: "You are not a member of this workspace" });
      }

      // Create the comment
      const { data: newComment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          workspace_id: workspaceId,
          user_id: userId,
          comment: comment,
          is_system: false
        })
        .select(`
          id,
          comment,
          is_system,
          created_at,
          user_id
        `)
        .single();

      if (error) throw error;

      // Get user info
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email, avatar_url')
        .eq('id', userId)
        .single();

      res.status(200).json({
        success: true,
        comment: {
          ...newComment,
          user_profiles: userProfile
        }
      });

    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  }

  // GET - Get comments for a post
  else if (req.method === "GET") {
    try {
      const { postId, workspaceId, userId } = req.query;

      if (!postId) {
        return res.status(400).json({ error: "postId is required" });
      }

      // Verify user is a member if workspaceId provided
      if (workspaceId && userId) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .single();

        if (!membership) {
          return res.status(403).json({ error: "You are not a member of this workspace" });
        }
      }

      const { data: comments, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          comment,
          is_system,
          created_at,
          updated_at,
          user_id,
          user_profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      res.status(200).json({
        success: true,
        comments: comments || []
      });

    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  }

  // PUT - Update a comment
  else if (req.method === "PUT") {
    try {
      const body = await parseBody(req);
      const { commentId, userId, comment } = body;

      if (!commentId || !userId || !comment) {
        return res.status(400).json({
          error: "commentId, userId, and comment are required"
        });
      }

      // Verify user owns the comment
      const { data: existingComment } = await supabase
        .from('post_comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

      if (!existingComment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (existingComment.user_id !== userId) {
        return res.status(403).json({ error: "You can only edit your own comments" });
      }

      const { data: updatedComment, error } = await supabase
        .from('post_comments')
        .update({
          comment: comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        comment: updatedComment
      });

    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  }

  // DELETE - Delete a comment
  else if (req.method === "DELETE") {
    try {
      const { commentId, userId } = req.query;

      if (!commentId || !userId) {
        return res.status(400).json({
          error: "commentId and userId are required"
        });
      }

      // Verify user owns the comment
      const { data: existingComment } = await supabase
        .from('post_comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

      if (!existingComment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (existingComment.user_id !== userId) {
        return res.status(403).json({ error: "You can only delete your own comments" });
      }

      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      res.status(200).json({ success: true });

    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }

  else {
    res.status(405).json({ error: "Method not allowed" });
  }
};
