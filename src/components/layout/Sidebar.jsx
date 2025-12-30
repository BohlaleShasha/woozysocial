import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

export const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Compose", path: "/compose" },
    { name: "Posts", path: "/posts" },
    { name: "Team", path: "/team" },
    { name: "Settings", path: "/settings" }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">[LOGO]</div>
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
