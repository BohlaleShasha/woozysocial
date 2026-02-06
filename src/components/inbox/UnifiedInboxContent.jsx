import React, { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useInbox } from "../../hooks/useInbox";
import { CommentsPanel } from "./CommentsPanel";
import { MessagesPanel } from "./MessagesPanel";
import "./UnifiedInboxContent.css";

const TABS = {
  COMMENTS: "comments",
  MESSAGES: "messages"
};

export const UnifiedInboxContent = () => {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const [searchParams, setSearchParams] = useSearchParams();

  // Read active tab from URL query param, default to comments
  const activeTab = searchParams.get("tab") === TABS.MESSAGES ? TABS.MESSAGES : TABS.COMMENTS;

  // useInbox runs at this level so polling persists across tab switches
  const inboxData = useInbox(workspaceId);

  const switchTab = useCallback((tab) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const handleRefresh = useCallback(() => {
    if (activeTab === TABS.MESSAGES) {
      inboxData.refresh();
    }
    // Comments panel handles its own refresh internally
  }, [activeTab, inboxData]);

  if (!workspaceId) {
    return (
      <div className="unified-inbox-container">
        <div className="unified-empty-state">
          <div className="empty-icon">📭</div>
          <p className="empty-text">No Workspace Selected</p>
          <p className="empty-subtext">Please select or create a workspace to view your inbox.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-inbox-container">
      {/* Header */}
      <div className="unified-inbox-header">
        <div className="unified-inbox-header-left">
          <h1 className="unified-inbox-title">Social Inbox</h1>
          <p className="unified-inbox-subtitle">
            Manage comments and direct messages across your social platforms
          </p>
        </div>
        <div className="unified-inbox-header-right">
          {activeTab === TABS.MESSAGES && (
            <>
              <button
                className="unified-refresh-btn"
                onClick={handleRefresh}
                disabled={inboxData.loading}
              >
                {inboxData.loading ? "Syncing..." : "Refresh"}
              </button>
              <div className="unified-inbox-stats">
                <div className="unified-stat-badge">
                  <span className="unified-stat-number">{inboxData.conversations.length}</span>
                  <span className="unified-stat-label">Total</span>
                </div>
                <div className="unified-stat-badge unread">
                  <span className="unified-stat-number">{inboxData.totalUnread}</span>
                  <span className="unified-stat-label">Unread</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="unified-inbox-tabs">
        <button
          className={`unified-inbox-tab ${activeTab === TABS.COMMENTS ? "active" : ""}`}
          onClick={() => switchTab(TABS.COMMENTS)}
        >
          Comments
        </button>
        <button
          className={`unified-inbox-tab ${activeTab === TABS.MESSAGES ? "active" : ""}`}
          onClick={() => switchTab(TABS.MESSAGES)}
        >
          Messages
          {inboxData.totalUnread > 0 && (
            <span className="unified-tab-badge">{inboxData.totalUnread}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="unified-inbox-content">
        {activeTab === TABS.COMMENTS ? (
          <CommentsPanel />
        ) : (
          <MessagesPanel inboxData={inboxData} />
        )}
      </div>
    </div>
  );
};
