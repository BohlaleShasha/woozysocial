import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { NotificationBell } from "../NotificationBell";
import "./ClientHeader.css";

export const ClientHeader = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="client-header">
      <div className="client-header-left">
        <h1 className="client-header-title">Client Portal</h1>
        {activeWorkspace && (
          <span className="client-header-workspace">{activeWorkspace.name}</span>
        )}
      </div>

      <div className="client-header-right">
        <NotificationBell />

        <div className="client-user-info">
          <div className="client-user-avatar">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="client-user-details">
            <span className="client-user-email">{user?.email}</span>
            <span className="client-user-role">Client</span>
          </div>
        </div>

        <button className="client-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};
