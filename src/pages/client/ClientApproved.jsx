import React, { useState, useEffect } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { baseURL } from "../../utils/constants";
import "./ClientApproved.css";

export const ClientApproved = () => {
  const { activeWorkspace } = useWorkspace();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, approved, rejected

  useEffect(() => {
    fetchPosts();
  }, [activeWorkspace]);

  const fetchPosts = async () => {
    if (!activeWorkspace) return;

    try {
      setLoading(true);
      const res = await fetch(
        `${baseURL}/api/post/pending-approvals?workspaceId=${activeWorkspace.id}`
      );

      if (res.ok) {
        const data = await res.json();
        const approvedPosts = data.grouped?.approved || [];
        const rejectedPosts = data.grouped?.rejected || [];
        setPosts([...approvedPosts, ...rejectedPosts]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (filter === "all") return true;
    if (filter === "approved") return post.approval_status === "approved";
    if (filter === "rejected") return post.approval_status === "rejected";
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: "📸",
      facebook: "📘",
      twitter: "🐦",
      linkedin: "💼",
      tiktok: "🎵",
      youtube: "📺",
      pinterest: "📌"
    };
    return icons[platform.toLowerCase()] || "📱";
  };

  return (
    <div className="client-approved">
      <div className="approved-header">
        <div className="header-content">
          <h1>Post History</h1>
          <p>View your approved and rejected posts.</p>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            ✅ Approved
          </button>
          <button
            className={`filter-btn ${filter === "rejected" ? "active" : ""}`}
            onClick={() => setFilter("rejected")}
          >
            ❌ Rejected
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading post history...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No posts found in your history.</p>
        </div>
      ) : (
        <div className="posts-grid">
          {filteredPosts.map((post) => (
            <div key={post.id} className="history-card">
              {post.media_urls?.length > 0 && (
                <div className="card-media">
                  <img src={post.media_urls[0]} alt="Post media" />
                </div>
              )}

              <div className="card-content">
                <div className="card-status">
                  <span className={`status-badge ${post.approval_status}`}>
                    {post.approval_status === "approved" ? "✅ Approved" : "❌ Rejected"}
                  </span>
                </div>

                <div className="card-caption">
                  {post.caption?.substring(0, 150) || "No caption"}
                  {post.caption?.length > 150 && "..."}
                </div>

                <div className="card-platforms">
                  {post.platforms?.map((p) => (
                    <span key={p} className="platform-icon" title={p}>
                      {getPlatformIcon(p)}
                    </span>
                  ))}
                </div>

                <div className="card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Scheduled:</span>
                    <span className="meta-value">{formatDate(post.scheduled_at)}</span>
                  </div>
                  {post.reviewed_at && (
                    <div className="meta-item">
                      <span className="meta-label">Reviewed:</span>
                      <span className="meta-value">{formatDate(post.reviewed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
