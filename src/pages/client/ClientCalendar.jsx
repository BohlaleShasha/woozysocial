import React, { useState, useEffect } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { baseURL } from "../../utils/constants";
import "./ClientCalendar.css";

export const ClientCalendar = () => {
  const { activeWorkspace } = useWorkspace();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPosts, setSelectedPosts] = useState([]);

  useEffect(() => {
    fetchPosts();
  }, [activeWorkspace, currentDate]);

  const fetchPosts = async () => {
    if (!activeWorkspace) return;

    try {
      setLoading(true);
      const res = await fetch(
        `${baseURL}/api/post/pending-approvals?workspaceId=${activeWorkspace.id}`
      );

      if (res.ok) {
        const data = await res.json();
        const allPosts = [
          ...(data.grouped?.pending || []),
          ...(data.grouped?.changes_requested || []),
          ...(data.grouped?.approved || []),
          ...(data.grouped?.rejected || [])
        ];
        setPosts(allPosts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getPostsForDate = (date) => {
    if (!date) return [];
    return posts.filter((post) => {
      if (!post.scheduled_at) return false;
      const postDate = new Date(post.scheduled_at);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getStatusColor = (status, approvalStatus) => {
    if (approvalStatus === 'rejected') return '#ef4444';
    if (approvalStatus === 'approved') return '#10b981';
    if (status === 'pending_approval') return '#f59e0b';
    if (status === 'changes_requested') return '#f97316';
    return '#6b7280';
  };

  const handleDateClick = (date) => {
    if (!date) return;
    const datePosts = getPostsForDate(date);
    setSelectedDate(date);
    setSelectedPosts(datePosts);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedPosts([]);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedPosts([]);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="client-calendar">
      <div className="calendar-header">
        <h1>Content Calendar</h1>
        <p>View all scheduled posts at a glance.</p>
      </div>

      <div className="calendar-container">
        {/* Calendar */}
        <div className="calendar-main">
          <div className="calendar-nav">
            <button className="nav-btn" onClick={prevMonth}>←</button>
            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <button className="nav-btn" onClick={nextMonth}>→</button>
          </div>

          <div className="calendar-grid">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}

            {/* Calendar days */}
            {days.map((date, index) => {
              const datePosts = date ? getPostsForDate(date) : [];
              const isToday = date &&
                date.toDateString() === new Date().toDateString();
              const isSelected = date && selectedDate &&
                date.toDateString() === selectedDate.toDateString();

              return (
                <div
                  key={index}
                  className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${datePosts.length > 0 ? 'has-posts' : ''}`}
                  onClick={() => handleDateClick(date)}
                >
                  {date && (
                    <>
                      <span className="day-number">{date.getDate()}</span>
                      {datePosts.length > 0 && (
                        <div className="day-posts">
                          {datePosts.slice(0, 3).map((post, i) => (
                            <div
                              key={post.id}
                              className="post-dot"
                              style={{ backgroundColor: getStatusColor(post.status, post.approval_status) }}
                              title={post.caption?.substring(0, 50)}
                            />
                          ))}
                          {datePosts.length > 3 && (
                            <span className="more-posts">+{datePosts.length - 3}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
              <span>Pending Approval</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#10b981' }} />
              <span>Approved</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#f97316' }} />
              <span>Changes Requested</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
              <span>Rejected</span>
            </div>
          </div>
        </div>

        {/* Selected Date Posts */}
        <div className="calendar-sidebar">
          {selectedDate ? (
            <>
              <h3>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              {selectedPosts.length === 0 ? (
                <div className="no-posts">No posts scheduled for this day.</div>
              ) : (
                <div className="sidebar-posts">
                  {selectedPosts.map((post) => (
                    <div key={post.id} className="sidebar-post">
                      <div
                        className="post-status-bar"
                        style={{ backgroundColor: getStatusColor(post.status, post.approval_status) }}
                      />
                      <div className="sidebar-post-content">
                        <div className="post-time">{formatTime(post.scheduled_at)}</div>
                        <div className="post-caption">
                          {post.caption?.substring(0, 100) || 'No caption'}
                          {post.caption?.length > 100 && '...'}
                        </div>
                        <div className="post-platforms">
                          {post.platforms?.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <span className="selection-icon">📅</span>
              <p>Click on a day to see scheduled posts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
