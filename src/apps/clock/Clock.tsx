import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppProps } from '../../types';
import './Clock.css';

type ClockMode = 'clock' | 'timer' | 'stopwatch';

export const Clock: React.FC<AppProps> = () => {
  const [mode, setMode] = useState<ClockMode>('clock');
  const [time, setTime] = useState(new Date());

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);

  // Stopwatch state
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Both counters are derived from the wall clock, not from counting ticks:
  // browsers throttle timers (to once a second in a background tab), so a
  // stopwatch that added 10 ms per tick ran up to 100x slow.

  // Timer logic: remember when the current run ends, and re-derive the
  // remaining seconds from that on every tick.
  const timerEndsAt = useRef<number | null>(null);
  useEffect(() => {
    if (!timerRunning || timerRemaining <= 0) {
      timerEndsAt.current = null;
      return;
    }
    if (timerEndsAt.current === null) timerEndsAt.current = Date.now() + timerRemaining * 1000;
    const endsAt = timerEndsAt.current;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimerRemaining(left);
      if (left === 0) setTimerRunning(false);
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
    // timerRemaining is deliberately absent: it is what this effect writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning]);

  // Stopwatch logic: elapsed = what it showed when started + time since.
  const stopwatchBase = useRef(0);
  const stopwatchStartedAt = useRef(0);
  useEffect(() => {
    if (!stopwatchRunning) return;
    stopwatchStartedAt.current = Date.now();
    const interval = setInterval(() => {
      setStopwatchTime(stopwatchBase.current + (Date.now() - stopwatchStartedAt.current));
    }, 31);
    return () => {
      clearInterval(interval);
      stopwatchBase.current += Date.now() - stopwatchStartedAt.current;
    };
  }, [stopwatchRunning]);

  const startTimer = useCallback(() => {
    const totalSeconds = timerMinutes * 60 + timerSeconds;
    if (totalSeconds > 0) {
      setTimerRemaining(totalSeconds);
      setTimerRunning(true);
    }
  }, [timerMinutes, timerSeconds]);

  const formatTimerTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatStopwatchTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const addLap = useCallback(() => {
    setLaps((prev) => [stopwatchTime, ...prev]);
  }, [stopwatchTime]);

  const resetStopwatch = useCallback(() => {
    setStopwatchRunning(false);
    stopwatchBase.current = 0;
    setStopwatchTime(0);
    setLaps([]);
  }, []);

  // Analog clock calculations
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const hourRotation = (hours + minutes / 60) * 30;
  const minuteRotation = (minutes + seconds / 60) * 6;
  const secondRotation = seconds * 6;

  return (
    <div className="clock-app">
      <div className="clock-app__tabs">
        <button
          className={`clock-app__tab ${mode === 'clock' ? 'is-selected' : ''}`}
          onClick={() => setMode('clock')}
        >
          Clock
        </button>
        <button
          className={`clock-app__tab ${mode === 'timer' ? 'is-selected' : ''}`}
          onClick={() => setMode('timer')}
        >
          Timer
        </button>
        <button
          className={`clock-app__tab ${mode === 'stopwatch' ? 'is-selected' : ''}`}
          onClick={() => setMode('stopwatch')}
        >
          Stopwatch
        </button>
      </div>

      <div className="clock-app__content">
        {mode === 'clock' && (
          <div className="clock-app__clock">
            <div className="clock-app__analog">
              <div className="clock-app__face">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="clock-app__mark"
                    style={{ transform: `rotate(${i * 30}deg)` }}
                  />
                ))}
                <div
                  className="clock-app__hand clock-app__hand--hour"
                  style={{ transform: `rotate(${hourRotation}deg)` }}
                />
                <div
                  className="clock-app__hand clock-app__hand--minute"
                  style={{ transform: `rotate(${minuteRotation}deg)` }}
                />
                <div
                  className="clock-app__hand clock-app__hand--second"
                  style={{ transform: `rotate(${secondRotation}deg)` }}
                />
                <div className="clock-app__center" />
              </div>
            </div>
            <div className="clock-app__digital">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="clock-app__date">
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        )}

        {mode === 'timer' && (
          <div className="clock-app__timer">
            {!timerRunning && timerRemaining === 0 ? (
              <div className="clock-app__timer-setup">
                <div className="clock-app__timer-inputs">
                  <div className="clock-app__timer-input-group">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="clock-app__timer-input"
                    />
                    <span className="clock-app__timer-label">min</span>
                  </div>
                  <span className="clock-app__timer-separator">:</span>
                  <div className="clock-app__timer-input-group">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timerSeconds}
                      onChange={(e) => setTimerSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="clock-app__timer-input"
                    />
                    <span className="clock-app__timer-label">sec</span>
                  </div>
                </div>
                <button className="clock-app__btn is-primary" onClick={startTimer}>
                  Start
                </button>
              </div>
            ) : (
              <div className="clock-app__timer-running">
                <div className="clock-app__timer-display">{formatTimerTime(timerRemaining)}</div>
                <div className="clock-app__timer-controls">
                  {timerRunning ? (
                    <button
                      className="clock-app__btn"
                      onClick={() => setTimerRunning(false)}
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      className="clock-app__btn is-primary"
                      onClick={() => setTimerRunning(true)}
                    >
                      Resume
                    </button>
                  )}
                  <button
                    className="clock-app__btn"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerRemaining(0);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'stopwatch' && (
          <div className="clock-app__stopwatch">
            <div className="clock-app__stopwatch-display">{formatStopwatchTime(stopwatchTime)}</div>
            <div className="clock-app__stopwatch-controls">
              {stopwatchRunning ? (
                <>
                  <button className="clock-app__btn" onClick={() => setStopwatchRunning(false)}>
                    Stop
                  </button>
                  <button className="clock-app__btn" onClick={addLap}>
                    Lap
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="clock-app__btn is-primary"
                    onClick={() => setStopwatchRunning(true)}
                  >
                    {stopwatchTime > 0 ? 'Resume' : 'Start'}
                  </button>
                  {stopwatchTime > 0 && (
                    <button className="clock-app__btn" onClick={resetStopwatch}>
                      Reset
                    </button>
                  )}
                </>
              )}
            </div>
            {laps.length > 0 && (
              <div className="clock-app__laps">
                {laps.map((lap, index) => (
                  <div key={index} className="clock-app__lap">
                    <span>Lap {laps.length - index}</span>
                    <span>{formatStopwatchTime(lap)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clock;
