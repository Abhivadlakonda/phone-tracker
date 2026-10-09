'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { ref, set, push } from 'firebase/database';
import Link from 'next/link';

function generateId() {
  return 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export default function TrackPage() {
  const [deviceName, setDeviceName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const [error, setError] = useState('');
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const watchIdRef = useRef(null);

  // Load or generate device ID from localStorage
  useEffect(() => {
    let id = localStorage.getItem('tracker_device_id');
    if (!id) {
      id = generateId();
      localStorage.setItem('tracker_device_id', id);
    }
    setDeviceId(id);

    const savedName = localStorage.getItem('tracker_device_name');
    if (savedName) setDeviceName(savedName);
  }, []);

  const sendLocation = useCallback(
    async (position) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
      const timestamp = Date.now();

      setCurrentPos({ lat: latitude, lng: longitude, accuracy, altitude, speed, heading });
      setUpdateCount((prev) => prev + 1);
      setLastUpdate(new Date());

      try {
        // Update current device location
        await set(ref(db, `devices/${deviceId}`), {
          name: deviceName || 'Unknown Device',
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || null,
          altitude: altitude || null,
          speed: speed || null,
          heading: heading || null,
          timestamp,
        });

        // Append to location history
        await push(ref(db, `history/${deviceId}`), {
          lat: latitude,
          lng: longitude,
          timestamp,
        });
      } catch (err) {
        console.error('Firebase write error:', err);
      }
    },
    [deviceId, deviceName]
  );

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    if (!deviceName.trim()) {
      setError('Please enter a device name.');
      return;
    }

    localStorage.setItem('tracker_device_name', deviceName);
    setError('');
    setIsTracking(true);
    setUpdateCount(0);

    // Use watchPosition for continuous live tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => sendLocation(position),
      (err) => {
        switch (err.code) {
          case 1:
            setError('Location permission denied. Please allow location access in your browser settings.');
            break;
          case 2:
            setError('Location unavailable. Make sure GPS is enabled on your device.');
            break;
          case 3:
            setError('Location request timed out. Retrying...');
            break;
          default:
            setError(`Location error: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="track-page">
      <div className="track-card">
        <h1>📱 Track This Phone</h1>
        <p className="subtitle">Share your live location with the dashboard</p>

        {error && <div className="error-box">{error}</div>}

        {!isTracking ? (
          <>
            <div className="form-group">
              <label>Device Name</label>
              <input
                type="text"
                placeholder="e.g., Mom's Phone, Delivery Van"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startTracking()}
              />
            </div>

            <button className="btn btn-primary" onClick={startTracking}>
              📍 Start Tracking
            </button>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none' }}>
                ← Open Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="tracking-active">
              <span className="status-dot" />
              Tracking Active — {deviceName}
            </div>

            {currentPos && (
              <div className="tracking-status">
                <div className="status-line">
                  <span className="label">Latitude</span>
                  <span className="value">{currentPos.lat.toFixed(6)}</span>
                </div>
                <div className="status-line">
                  <span className="label">Longitude</span>
                  <span className="value">{currentPos.lng.toFixed(6)}</span>
                </div>
                <div className="status-line">
                  <span className="label">Accuracy</span>
                  <span className="value">±{currentPos.accuracy?.toFixed(0) || '?'}m</span>
                </div>
                {currentPos.speed != null && currentPos.speed > 0 && (
                  <div className="status-line">
                    <span className="label">Speed</span>
                    <span className="value">{(currentPos.speed * 3.6).toFixed(1)} km/h</span>
                  </div>
                )}
                {currentPos.altitude != null && (
                  <div className="status-line">
                    <span className="label">Altitude</span>
                    <span className="value">{currentPos.altitude.toFixed(0)}m</span>
                  </div>
                )}
                <div className="status-line">
                  <span className="label">Updates Sent</span>
                  <span className="value">{updateCount}</span>
                </div>
                <div className="status-line">
                  <span className="label">Last Update</span>
                  <span className="value">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
                  </span>
                </div>
                <div className="status-line">
                  <span className="label">Device ID</span>
                  <span className="value" style={{ fontSize: '0.7rem' }}>{deviceId}</span>
                </div>
              </div>
            )}

            <button className="btn btn-danger" onClick={stopTracking} style={{ marginTop: 16 }}>
              ⏹ Stop Tracking
            </button>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none' }}>
                ← Open Dashboard
              </Link>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          ⚠️ Location is shared only while this page is open.
          <br />
          Keep this tab active for continuous tracking.
        </div>
      </div>
    </div>
  );
}
