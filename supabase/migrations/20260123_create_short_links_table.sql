-- Create short_links table for link shortening and click tracking
CREATE TABLE IF NOT EXISTS short_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  short_code VARCHAR(10) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookup by short_code
CREATE INDEX IF NOT EXISTS idx_short_links_short_code ON short_links(short_code);
CREATE INDEX IF NOT EXISTS idx_short_links_workspace_id ON short_links(workspace_id);

-- Create link_clicks table for detailed click tracking
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_link_id UUID REFERENCES short_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(100),
  city VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_short_link_id ON link_clicks(short_link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);

-- RLS Policies
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view short_links in their workspace
CREATE POLICY "Users can view workspace short links"
  ON short_links FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create short links in their workspace
CREATE POLICY "Users can create workspace short links"
  ON short_links FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can view link clicks for their workspace's links
CREATE POLICY "Users can view link clicks for workspace links"
  ON link_clicks FOR SELECT
  USING (
    short_link_id IN (
      SELECT id FROM short_links WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Allow service role full access (for API endpoint)
CREATE POLICY "Service role has full access to short_links"
  ON short_links FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to link_clicks"
  ON link_clicks FOR ALL
  USING (true)
  WITH CHECK (true);
