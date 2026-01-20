import { useState, useMemo } from 'react';
import { useCalendarStore } from '../../stores/calendarStore';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './Calendar.css';

export const Calendar: React.FC<AppProps> = () => {
  const { selectedDate, setSelectedDate, getEventsForDate, createEvent, deleteEvent } = useCalendarStore();
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }

    return days;
  }, [currentMonth, currentYear]);

  const goToPreviousMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateEvent = () => {
    if (newEventTitle.trim()) {
      const startDate = new Date(selectedDate);
      startDate.setHours(9, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(10, 0, 0, 0);

      createEvent({
        title: newEventTitle,
        startDate,
        endDate,
        allDay: false,
        color: '#a8b5c4',
      });

      setNewEventTitle('');
      setShowEventModal(false);
    }
  };

  const selectedDayEvents = getEventsForDate(selectedDate);
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-app">
      <div className="calendar-app__header">
        <div className="calendar-app__nav">
          <button className="calendar-app__nav-btn" onClick={goToPreviousMonth}>
            <Icon name="chevron-left" size={16} />
          </button>
          <h2 className="calendar-app__title">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button className="calendar-app__nav-btn" onClick={goToNextMonth}>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
        <button className="calendar-app__today-btn" onClick={goToToday}>
          Today
        </button>
      </div>

      <div className="calendar-app__main">
        <div className="calendar-app__grid">
          <div className="calendar-app__weekdays">
            {dayNames.map((day) => (
              <div key={day} className="calendar-app__weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-app__days">
            {daysInMonth.map((date, index) => (
              <div
                key={index}
                className={`calendar-app__day ${!date ? 'calendar-app__day--empty' : ''} ${date && isToday(date) ? 'calendar-app__day--today' : ''} ${date && isSelected(date) ? 'calendar-app__day--selected' : ''}`}
                onClick={() => date && handleDayClick(date)}
              >
                {date && (
                  <>
                    <span className="calendar-app__day-number">{date.getDate()}</span>
                    {getEventsForDate(date).length > 0 && (
                      <div className="calendar-app__day-dots">
                        {getEventsForDate(date).slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            className="calendar-app__day-dot"
                            style={{ background: event.color }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="calendar-app__sidebar">
          <div className="calendar-app__sidebar-header">
            <h3>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <button
              className="calendar-app__add-btn"
              onClick={() => setShowEventModal(true)}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
          <div className="calendar-app__events">
            {selectedDayEvents.length === 0 ? (
              <p className="calendar-app__no-events">No events</p>
            ) : (
              selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="calendar-app__event"
                  style={{ borderLeftColor: event.color }}
                >
                  <div className="calendar-app__event-title">{event.title}</div>
                  <div className="calendar-app__event-time">
                    {event.allDay
                      ? 'All day'
                      : `${event.startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                  </div>
                  <button
                    className="calendar-app__event-delete"
                    onClick={() => deleteEvent(event.id)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showEventModal && (
        <div className="calendar-app__modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="calendar-app__modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Event</h3>
            <input
              type="text"
              placeholder="Event title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="calendar-app__modal-input"
              autoFocus
            />
            <div className="calendar-app__modal-actions">
              <button
                className="calendar-app__modal-btn"
                onClick={() => setShowEventModal(false)}
              >
                Cancel
              </button>
              <button
                className="calendar-app__modal-btn calendar-app__modal-btn--primary"
                onClick={handleCreateEvent}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
