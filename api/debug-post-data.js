const {
  setCors,
  getSupabase,
  sendSuccess,
  sendError,
  ErrorCodes
} = require("./_utils");

/**
 * DEBUG ENDPOINT - Check post data in database
 * GET /api/debug-post-data?workspaceId={workspaceId}&caption={caption}
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  try {
    const { workspaceId, caption } = req.query;

    if (!workspaceId) {
      return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
    }

    const supabase = getSupabase();
    if (!supabase) {
      return sendError(res, "Database unavailable", ErrorCodes.CONFIG_ERROR);
    }

    let query = supabase
      .from('posts')
      .select('id, caption, content, ayr_post_id, status, platforms, posted_at, created_at, analytics')
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted')
      .not('ayr_post_id', 'is', null)
      .order('posted_at', { ascending: false })
      .limit(10);

    if (caption) {
      query = query.ilike('caption', `%${caption}%`);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return sendError(res, error.message, ErrorCodes.INTERNAL_ERROR);
    }

    console.log('=== POST DATA DEBUG ===');
    console.log('Found posts:', posts?.length || 0);

    if (posts && posts.length > 0) {
      posts.forEach(post => {
        console.log('---');
        console.log('Post ID:', post.id);
        console.log('Caption:', post.caption);
        console.log('Ayrshare Post ID:', post.ayr_post_id);
        console.log('Ayrshare Post ID Type:', typeof post.ayr_post_id);
        console.log('Ayrshare Post ID Length:', post.ayr_post_id?.length);
        console.log('Status:', post.status);
        console.log('Platforms:', post.platforms);
        console.log('Posted at:', post.posted_at);
        console.log('Has analytics:', post.analytics && Object.keys(post.analytics).length > 0 ? 'Yes' : 'No');
      });
    }

    return sendSuccess(res, {
      totalPosts: posts?.length || 0,
      posts: posts?.map(post => ({
        id: post.id,
        caption: post.caption,
        content: post.content,
        ayr_post_id: post.ayr_post_id,
        ayr_post_id_type: typeof post.ayr_post_id,
        ayr_post_id_length: post.ayr_post_id?.length,
        status: post.status,
        platforms: post.platforms,
        posted_at: post.posted_at,
        has_analytics: post.analytics && Object.keys(post.analytics).length > 0
      })) || []
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return sendError(res, error.message, ErrorCodes.INTERNAL_ERROR);
  }
};
