import React from "react";
import "./DashboardContent.css";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube, FaReddit, FaTelegram, FaPinterest } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import { SiSnapchat } from "react-icons/si";
import { FaBluesky } from "react-icons/fa6";

export const DashboardContent = () => {
  const socialAccounts = [
    { name: "Facebook", icon: FaFacebookF, connected: false, color: "#1877F2" },
    { name: "LinkedIn", icon: FaLinkedinIn, connected: false, color: "#0A66C2" },
    { name: "Instagram", icon: FaInstagram, connected: false, color: "#E4405F" },
    { name: "Snapchat", icon: SiSnapchat, connected: false, color: "#FFFC00" },
    { name: "Youtube", icon: FaYoutube, connected: false, color: "#FF0000" },
    { name: "Telegram", icon: FaTelegram, connected: false, color: "#0088cc" },
    { name: "Tiktok", icon: FaTiktok, connected: false, color: "#000000" },
    { name: "Pinterest", icon: FaPinterest, connected: false, color: "#BD081C" },
    { name: "Reddit", icon: FaReddit, connected: false, color: "#FF4500" },
    { name: "BlueSky", icon: FaBluesky, connected: false, color: "#1185FE" }
  ];

  return (
    <div className="dashboard-content">
      {/* Header */}
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
        <p className="dashboard-subtitle">Overview of your social media performance</p>
      </div>

      {/* Top Stats Row */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">API Calls</div>
          <div className="stat-value">88</div>
          <div className="stat-period">This month</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Posts</div>
          <div className="stat-value">14</div>
          <div className="stat-period">This month</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Connected Accounts</div>
          <div className="stat-value">0</div>
          <div className="stat-period">Active</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-main-grid">
        {/* Left Column - Quick Actions and Recent Posts */}
        <div className="dashboard-left">
          {/* Quick Actions */}
          <div className="quick-actions-section">
            <div className="section-header">
              <h3 className="section-title">Quick Actions</h3>
              <p className="section-subtitle">Common tasks and shortcuts</p>
            </div>
            <div className="quick-actions-grid">
              <button className="action-btn primary">New Post</button>
              <button className="action-btn">AI Generate</button>
              <button className="action-btn">Hashtags</button>
              <button className="action-btn">Connect Accounts</button>
            </div>
          </div>

          {/* Recent Posts */}
          <div className="recent-posts-section">
            <div className="section-header">
              <h3 className="section-title">Recent Posts</h3>
              <p className="section-subtitle">Your latest social media activity</p>
            </div>
            <div className="recent-posts-list">
              <div className="post-item">
                <div className="post-icon instagram">
                  <FaInstagram size={20} />
                </div>
                <div className="post-content">
                  <div className="post-text">Testing Ayrshare web interface! #automation</div>
                  <div className="post-meta">
                    <span className="post-status success">Status: success</span>
                    <span className="post-platforms">1 platform</span>
                  </div>
                </div>
                <div className="post-date">12/22/2025</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Social Accounts */}
        <div className="dashboard-right">
          <div className="social-accounts-section">
            <div className="section-header">
              <h3 className="section-title">Social Accounts</h3>
              <p className="section-subtitle">Connected platforms</p>
            </div>
            <div className="social-accounts-list">
              {socialAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <div key={account.name} className="social-account-item">
                    <div className="account-info">
                      <div
                        className="account-icon"
                        style={{ backgroundColor: account.color }}
                      >
                        <Icon size={20} color="white" />
                      </div>
                      <div className="account-details">
                        <div className="account-name">{account.name}</div>
                        <div className="account-status">Not connected</div>
                      </div>
                    </div>
                    <span className="status-badge inactive">Inactive</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
