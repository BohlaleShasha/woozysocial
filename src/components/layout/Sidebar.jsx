import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Sidebar.css";

export const Sidebar = () => {
  const location = useLocation();
  const { profile } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Brand Profile", path: "/brand-profile" },
    { name: "Compose", path: "/compose" },
    { name: "Schedule", path: "/schedule" },
    { name: "Posts", path: "/posts" },
    { name: "Assets", path: "/assets" },
    { name: "Social Inbox", path: "/social-inbox" },
    { name: "Team", path: "/team" },
    { name: "Settings", path: "/settings" }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt="Logo" className="sidebar-logo-image" />
          ) : (
            <div className="sidebar-logo-text">[LOGO]</div>
          )}
        </div>

        <div className="sidebar-menu">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`menu-item ${location.pathname === item.path ? "active" : ""}`}
            >
              <div className="menu-item-text">{item.name}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
