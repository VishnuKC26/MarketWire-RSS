import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle } from 'lucide-react';

const SCHEDULED_HOURS = [11, 17, 23]; // 11 AM, 5 PM, 11 PM in 24h format

export default function ScheduleTracker({ lastUpdated }) {
  const [now, setNow] = useState(new Date());
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);
  const [activeSlot, setActiveSlot] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Determine the next check time
    let nextCheckHour = SCHEDULED_HOURS[0];
    let nextCheckDate = new Date(now);
    
    // Find next schedule hour
    let found = false;
    for (let i = 0; i < SCHEDULED_HOURS.length; i++) {
      if (hours < SCHEDULED_HOURS[i]) {
        nextCheckHour = SCHEDULED_HOURS[i];
        found = true;
        break;
      }
    }

    if (!found) {
      // Next check is tomorrow at the first scheduled hour
      nextCheckHour = SCHEDULED_HOURS[0];
      nextCheckDate.setDate(now.getDate() + 1);
    }

    nextCheckDate.setHours(nextCheckHour, 0, 0, 0);

    // Calculate time diff in ms
    const diff = nextCheckDate - now;
    
    // Formatting countdown
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diff % (1000 * 60)) / 1000);

    let countdownStr = '';
    if (diffHours > 0) countdownStr += `${diffHours}h `;
    countdownStr += `${diffMinutes}m ${diffSeconds}s`;
    setCountdown(countdownStr);

    // Calculate progress bar percent (percentage of time elapsed between previous slot and next slot)
    // Find previous slot hour
    let prevCheckHour = SCHEDULED_HOURS[SCHEDULED_HOURS.length - 1];
    let prevCheckDate = new Date(now);

    let prevFound = false;
    for (let i = SCHEDULED_HOURS.length - 1; i >= 0; i--) {
      if (hours >= SCHEDULED_HOURS[i]) {
        prevCheckHour = SCHEDULED_HOURS[i];
        prevFound = true;
        break;
      }
    }

    if (!prevFound) {
      // Previous check was yesterday at the last scheduled hour
      prevCheckHour = SCHEDULED_HOURS[SCHEDULED_HOURS.length - 1];
      prevCheckDate.setDate(now.getDate() - 1);
    }
    prevCheckDate.setHours(prevCheckHour, 0, 0, 0);

    const totalWindowMs = nextCheckDate - prevCheckDate;
    const elapsedMs = now - prevCheckDate;
    const percent = Math.min(100, Math.max(0, (elapsedMs / totalWindowMs) * 100));
    setProgress(percent);

    // active slot check
    setActiveSlot(prevCheckHour);

  }, [now]);

  // Render a human-friendly label for 24h format
  const formatTimeSlot = (hour) => {
    if (hour === 11) return '11:00 AM';
    if (hour === 17) return '5:00 PM';
    if (hour === 23) return '11:00 PM';
    return `${hour}:00`;
  };

  const getSlotStatus = (hour) => {
    // If it is the current active/last passed slot
    if (activeSlot === hour) return 'active';
    
    // If it is completed today
    const currentHour = now.getHours();
    if (currentHour >= hour) return 'completed';
    
    return 'pending';
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="schedule-widget">
      <div className="schedule-header">
        <span>Daily Schedule</span>
        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      
      <div className="schedule-times">
        {SCHEDULED_HOURS.map((hour) => {
          const status = getSlotStatus(hour);
          return (
            <div 
              key={hour} 
              className={`time-slot ${status === 'active' ? 'active' : ''} ${status === 'completed' ? 'completed' : ''}`}
              title={status === 'completed' ? 'Checked for this window' : status === 'active' ? 'Current reading window' : 'Upcoming window'}
            >
              {status === 'completed' && <CheckCircle size={10} style={{ display: 'inline', marginRight: '2px', verticalAlign: 'middle' }} />}
              {formatTimeSlot(hour)}
            </div>
          );
        })}
      </div>

      <div className="countdown-bar-wrapper">
        <div className="countdown-bar" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="countdown-text">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Next check:</span>
        <span style={{ fontWeight: '600', color: 'var(--accent-gold)' }}>{countdown}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Sync Time:</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '500' }}>{formatDate(lastUpdated)}</span>
      </div>
    </div>
  );
}
