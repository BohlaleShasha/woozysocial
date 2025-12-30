import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LoginPage } from "./components/auth/LoginPage";
import { SignUpPage } from "./components/auth/SignUpPage";
import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { MainContent } from "./components/layout/MainContent";
import { DashboardContent } from "./components/DashboardContent";
import { ComposeContent } from "./components/ComposeContent";
import { PostsContent } from "./components/PostsContent";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="app-container">
                  <Sidebar />
                  <TopHeader />
                  <MainContent>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardContent />} />
                      <Route path="/compose" element={<ComposeContent />} />
                      <Route path="/posts" element={<PostsContent />} />
                      <Route path="/team" element={<div>Team Page - Coming Soon</div>} />
                      <Route path="/settings" element={<div>Settings Page - Coming Soon</div>} />
                    </Routes>
                  </MainContent>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
