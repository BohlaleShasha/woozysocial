const {
  setCors,
  getSupabase,
  parseBody,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID
} = require("../_utils");

/**
 * /api/media/assets
 * GET   - List assets for a workspace (with optional filters)
 * PATCH - Update asset metadata (tags, description, file_name)
 * DELETE - Delete an asset by ID (single or bulk via assetIds)
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabase();

  // GET - List assets
  if (req.method === "GET") {
    try {
      const { workspaceId, userId, type, search, limit = '50', offset = '0' } = req.query;

      if (!workspaceId) {
        return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
      }
      if (!isValidUUID(workspaceId)) {
        return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
      }

      let query = supabase
        .from('media_assets')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      // Filter by type
      if (type === 'image') {
        query = query.like('file_type', 'image/%');
      } else if (type === 'video') {
        query = query.like('file_type', 'video/%');
      }

      // Search by file name or tags
      if (search) {
        query = query.or(`file_name.ilike.%${search}%,tags.cs.{${search}}`);
      }

      // Pagination
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offsetNum = parseInt(offset) || 0;
      query = query.range(offsetNum, offsetNum + limitNum - 1);

      const { data, error, count } = await query;

      if (error) {
        logError('media.assets.list', error, { workspaceId });
        return sendError(res, "Failed to fetch assets", ErrorCodes.DATABASE_ERROR);
      }

      return sendSuccess(res, { assets: data || [], total: count || 0 });
    } catch (error) {
      logError('media.assets.list', error);
      return sendError(res, "Internal server error", ErrorCodes.INTERNAL_ERROR);
    }
  }

  // PATCH - Update asset metadata
  if (req.method === "PATCH") {
    try {
      const body = await parseBody(req);
      const { assetId, workspaceId, tags, description, file_name } = body;

      if (!assetId || !workspaceId) {
        return sendError(res, "assetId and workspaceId are required", ErrorCodes.VALIDATION_ERROR);
      }

      if (!isValidUUID(workspaceId)) {
        return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
      }

      const updates = {};
      if (tags !== undefined) updates.tags = tags;
      if (description !== undefined) updates.description = description;
      if (file_name !== undefined) updates.file_name = file_name;

      if (Object.keys(updates).length === 0) {
        return sendError(res, "No fields to update", ErrorCodes.VALIDATION_ERROR);
      }

      const { data: asset, error } = await supabase
        .from('media_assets')
        .update(updates)
        .eq('id', assetId)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) {
        logError('media.assets.update', error, { assetId });
        return sendError(res, "Failed to update asset", ErrorCodes.DATABASE_ERROR);
      }

      return sendSuccess(res, { asset });
    } catch (error) {
      logError('media.assets.update', error);
      return sendError(res, "Internal server error", ErrorCodes.INTERNAL_ERROR);
    }
  }

  // DELETE - Delete asset(s)
  if (req.method === "DELETE") {
    try {
      const { assetId, workspaceId, assetIds } = req.query;

      if (!workspaceId) {
        return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
      }

      if (!isValidUUID(workspaceId)) {
        return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
      }

      // Support bulk delete via comma-separated assetIds
      const idsToDelete = assetIds ? assetIds.split(',') : (assetId ? [assetId] : []);

      if (idsToDelete.length === 0) {
        return sendError(res, "assetId or assetIds is required", ErrorCodes.VALIDATION_ERROR);
      }

      // Get assets to find storage paths
      const { data: assets, error: fetchError } = await supabase
        .from('media_assets')
        .select('id, storage_path')
        .eq('workspace_id', workspaceId)
        .in('id', idsToDelete);

      if (fetchError || !assets || assets.length === 0) {
        return sendError(res, "No assets found", ErrorCodes.NOT_FOUND);
      }

      // Delete from storage
      const storagePaths = assets.map(a => a.storage_path).filter(Boolean);
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('media-assets')
          .remove(storagePaths);

        if (storageError) {
          logError('media.assets.delete.storage', storageError, { idsToDelete });
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_assets')
        .delete()
        .eq('workspace_id', workspaceId)
        .in('id', idsToDelete);

      if (dbError) {
        logError('media.assets.delete.db', dbError, { idsToDelete });
        return sendError(res, "Failed to delete assets", ErrorCodes.DATABASE_ERROR);
      }

      return sendSuccess(res, { deleted: true, count: assets.length });
    } catch (error) {
      logError('media.assets.delete', error);
      return sendError(res, "Internal server error", ErrorCodes.INTERNAL_ERROR);
    }
  }

  return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
};
