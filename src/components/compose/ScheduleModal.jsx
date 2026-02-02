import React, { useState, useEffect } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button } from "@chakra-ui/react";
import { formatDateInTimezone } from "../../utils/timezones";
import "./ScheduleModal.css";

export const ScheduleModal = ({
  isOpen,
  onClose,
  onConfirm,
  timezone = 'UTC',
  bestTimes = [],
  hasRealData = false
}) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (isOpen && !selectedDate) {
      // Default to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setSelectedDate(tomorrow);
      setSelectedTime('09:00');
    }
  }, [isOpen]);

  const handleDateClick = (date) => {
    const newDate = new Date(selectedDate || new Date());
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    setSelectedDate(newDate);
  };

  const handleTimeChange = (e) => {
    const time = e.target.value;
    setSelectedTime(time);

    const [hours, minutes] = time.split(':');
    const newDate = new Date(selectedDate || new Date());
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    setSelectedDate(newDate);
  };

  const handleQuickSelectBestTime = (bestTime) => {
    const timeHour = parseInt(bestTime.time.split(':')[0]);
    const isPM = bestTime.time.includes('PM');
    const is12Hour = timeHour === 12;
    let hour24 = isPM ? (is12Hour ? 12 : timeHour + 12) : (is12Hour ? 0 : timeHour);

    // Find next occurrence of this day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(bestTime.day);
    const today = new Date();
    const currentDayIndex = today.getDay();

    let daysUntilTarget = targetDayIndex - currentDayIndex;
    if (daysUntilTarget <= 0) daysUntilTarget += 7;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    targetDate.setHours(hour24, 0, 0, 0);

    setSelectedDate(targetDate);
    setSelectedTime(`${hour24.toString().padStart(2, '0')}:00`);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onConfirm(selectedDate);
    }
  };

  const handleCancel = () => {
    setSelectedDate(null);
    setSelectedTime('09:00');
    onClose();
  };

  // Generate calendar days
  const generateCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCalendarMonth(newMonth);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const calendar = generateCalendar();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="2xl" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.6)" backdropFilter="blur(4px)" />
      <ModalContent className="schedule-modal-geist">
        <ModalHeader className="schedule-modal-header">
          Schedule Post
          <div className="schedule-modal-subtitle">
            Choose when your post goes live
          </div>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody className="schedule-modal-body">
          <div className="schedule-grid">
            {/* Left: Calendar */}
            <div className="calendar-section">
              {/* Month navigation */}
              <div className="calendar-header">
                <button
                  className="calendar-nav-btn"
                  onClick={() => navigateMonth(-1)}
                  aria-label="Previous month"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="calendar-month">
                  {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </div>
                <button
                  className="calendar-nav-btn"
                  onClick={() => navigateMonth(1)}
                  aria-label="Next month"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Day names */}
              <div className="calendar-weekdays">
                {dayNames.map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="calendar-days">
                {calendar.map((day, idx) => (
                  <button
                    key={idx}
                    className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''} ${isSelected(day.date) ? 'selected' : ''} ${isPast(day.date) ? 'past' : ''}`}
                    onClick={() => !isPast(day.date) && handleDateClick(day.date)}
                    disabled={isPast(day.date)}
                  >
                    {day.date.getDate()}
                  </button>
                ))}
              </div>

              {/* Time input */}
              <div className="time-selector">
                <label className="time-label">Time</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={handleTimeChange}
                  className="time-input"
                />
              </div>
            </div>

            {/* Right: Best Times */}
            <div className="best-times-section">
              <div className="best-times-header">
                <div className="best-times-title">Suggested Times</div>
                <div className="best-times-source">
                  {hasRealData ? 'Your data' : 'Industry avg'}
                </div>
              </div>

              <div className="best-times-list">
                {bestTimes.slice(0, 5).map((time, idx) => (
                  <button
                    key={idx}
                    className={`best-time-card ${idx === 0 ? 'top-pick' : ''}`}
                    onClick={() => handleQuickSelectBestTime(time)}
                  >
                    <div className="best-time-content">
                      <div className="best-time-main">
                        <span className="best-time-rank">#{idx + 1}</span>
                        <div className="best-time-info">
                          <div className="best-time-day">{time.day}</div>
                          <div className="best-time-time">{time.time}</div>
                        </div>
                      </div>
                      {time.avgEngagement && (
                        <div className="best-time-stats">
                          {time.avgEngagement} avg
                        </div>
                      )}
                    </div>
                    <div className="best-time-score">
                      <div className="score-bar-bg">
                        <div className="score-bar-fill" style={{ width: `${time.score}%` }}></div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected datetime display */}
          {selectedDate && (
            <div className="selected-datetime">
              <div className="selected-datetime-label">Scheduled for</div>
              <div className="selected-datetime-value">
                {formatDateInTimezone(selectedDate, timezone)}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="schedule-modal-footer">
          <Button variant="ghost" onClick={handleCancel} className="btn-ghost">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            isDisabled={!selectedDate}
            className="btn-primary"
          >
            Confirm Schedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
