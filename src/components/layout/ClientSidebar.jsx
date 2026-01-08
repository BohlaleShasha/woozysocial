import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./ClientSidebar.css";
import { useWorkspace } from "../../contexts/WorkspaceContext";

export const ClientSidebar = () => {
  const location = useLocation();
  const { activeWorkspace } = useWorkspace();

  const menuItems = [
    { name: "Dashboard", path: "/client/dashboard", icon: "📊" },
    { name: "Pending Approvals", path: "/client/approvals", icon: "⏳" },
    { name: "Approved Posts", path: "/client/approved", icon: "✅" },
    { name: "Calendar", path: "/client/calendar", icon: "📅" }
  ];

  return (
    <div className="client-sidebar">
      <div className="client-sidebar-content">
        <div className="client-sidebar-logo">
          <img src="/ChatGPT Image Dec 31, 2025, 04_19_09 PM.png" alt="Woozy Social" className="client-logo-image" />
        </div>

        <div className="client-workspace-info">
          <div className="client-workspace-label">CLIENT PORTAL</div>
          {activeWorkspace && (
            <div className="client-workspace-name">{activeWorkspace.name}</div>
          )}
        </div>

        <div className="client-sidebar-menu">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`client-menu-item ${location.pathname === item.path ? "active" : ""}`}
            >
              <span className="client-menu-icon">{item.icon}</span>
              <span className="client-menu-text">{item.name}</span>
            </Link>
          ))}
        </div>

        <div className="client-sidebar-footer">
          <div className="client-role-badge">
            <span className="role-icon">👤</span>
            <span className="role-text">Client Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};
