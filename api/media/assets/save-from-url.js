const {
  setCors,
  getSupabase,
  parseBody,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID
} = require("../../_utils");

// Storage caps per tier (in bytes)
const STORAGE_CAPS = {
  free: 0,
  solo: 500 * 1024 * 1024,
  pro: 2 * 1024 * 1024 * 1024,
  pro_plus: 5 * 1024 * 1024 * 1024,
  agency: 10 * 1024 * 1024 * 1024
};

/**
 * POST /api/media/assets/save-from-url
 * Saves an existing media URL (from post-media bucket) into the asset library.
 * Downloads the file and re-uploads to media-assets bucket.
 *
 * Body: { url, workspaceId, userId, fileName }
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  try {
    const body = await parseBody(req);
    const { url, workspaceId, userId, fileName } = body;

    if (!url || !workspaceId) {
      return sendError(res, "url and workspaceId are required", ErrorCodes.VALIDATION_ERROR);
    }

    if (!isValidUUID(workspaceId)) {
      return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
    }

    const supabase = getSupabase();

    // Check if this URL is already saved as an asset
    const { data: existing } = await supabase
      .from('media_assets')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('public_url', url)
      .maybeSingle();

    if (existing) {
      return sendSuccess(res, { asset: existing, alreadySaved: true });
    }

    // Check storage cap before downloading
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('subscription_tier')
      .eq('id', workspaceId)
      .single();

    const tier = workspace?.subscription_tier || 'free';
    const effectiveTier = (tier === 'development' || tier === 'testing') ? 'agency' : tier;
    const capBytes = STORAGE_CAPS[effectiveTier] || STORAGE_CAPS.free;

    if (capBytes === 0) {
      return sendError(res, "Asset library is not available on your current plan", ErrorCodes.VALIDATION_ERROR);
    }

    const { data: currentAssets } = await supabase
      .from('media_assets')
      .select('file_size')
      .eq('workspace_id', workspaceId);

    const currentUsage = (currentAssets || []).reduce((sum, a) => sum + (a.file_size || 0), 0);

    // Download the file from the URL
    const response = await fetch(url);
    if (!response.ok) {
      return sendError(res, "Failed to download media file", ErrorCodes.EXTERNAL_API_ERROR);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    const fileSize = buffer.length;

    // Enforce storage cap
    if (currentUsage + fileSize > capBytes) {
      return sendError(res, "Storage limit exceeded. Delete unused assets or upgrade your plan.", ErrorCodes.VALIDATION_ERROR);
    }

    // Generate storage path
    const ext = fileName ? fileName.split('.').pop() : contentType.split('/')[1] || 'jpg';
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const storagePath = `${workspaceId}/${safeName}`;

    // Upload to media-assets bucket
    const { error: uploadError } = await supabase.storage
      .from('media-assets')
      .upload(storagePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logError('media.assets.saveFromUrl.upload', uploadError, { workspaceId });
      return sendError(res, "Failed to save to asset library", ErrorCodes.INTERNAL_ERROR);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media-assets')
      .getPublicUrl(storagePath);

    // Save metadata to database
    const { data: asset, error: dbError } = await supabase
      .from('media_assets')
      .insert([{
        workspace_id: workspaceId,
        file_name: fileName || safeName,
        file_type: contentType,
        file_size: fileSize,
        storage_path: storagePath,
        public_url: publicUrl,
        uploaded_by: userId || null
      }])
      .select()
      .single();

    if (dbError) {
      logError('media.assets.saveFromUrl.db', dbError, { workspaceId });
      return sendError(res, "Failed to save asset metadata", ErrorCodes.DATABASE_ERROR);
    }

    return sendSuccess(res, { asset });
  } catch (error) {
    logError('media.assets.saveFromUrl', error);
    return sendError(res, "Internal server error", ErrorCodes.INTERNAL_ERROR);
  }
};
