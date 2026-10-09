'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';

// Fix Leaflet default marker icon paths (webpack breaks them)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

function createColoredIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

/** Smoothly fly the map to a position when it changes */
function FlyToDevice({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 1.2 });
    }
  }, [position, map]);
  return null;
}

/** Fix map tiles not rendering properly by forcing a resize */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);
  return null;
}

function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  const diff = (Date.now() - timestamp) / 1000;
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function isOnline(timestamp) {
  if (!timestamp) return false;
  return (Date.now() - timestamp) < 120000; // 2 minutes
}

export default function MapDashboard() {
  const [devices, setDevices] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [showHistory, setShowHistory] = useState(true);
  const [history, setHistory] = useState({});
  const [trackUrl, setTrackUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  // Force re-render every 10s to update "last seen" times
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setTrackUrl(`${window.location.origin}/track`);
  }, []);

  // Subscribe to all devices
  useEffect(() => {
    const devicesRef = ref(db, 'devices');
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      setDevices(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to location history for all known devices
  const deviceIds = useMemo(() => Object.keys(devices), [devices]);

  useEffect(() => {
    if (deviceIds.length === 0) return;

    const unsubscribes = deviceIds.map((deviceId) => {
      const histRef = query(
        ref(db, `history/${deviceId}`),
        orderByChild('timestamp'),
        limitToLast(200)
      );
      return onValue(histRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const points = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
          setHistory((prev) => ({ ...prev, [deviceId]: points }));
        }
      });
    });

    return () => unsubscribes.forEach((fn) => fn());
  }, [deviceIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeviceClick = (deviceId) => {
    setSelectedDevice(deviceId);
    const device = devices[deviceId];
    if (device?.lat && device?.lng) {
      setFlyTo([device.lat, device.lng]);
    }
  };

  const copyTrackLink = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.querySelector('.track-link-box input');
      if (input) { input.select(); document.execCommand('copy'); }
    }
  };

  const deviceEntries = Object.entries(devices);
  const onlineCount = deviceEntries.filter(([, d]) => isOnline(d.timestamp)).length;

  return (
    <div className="dashboard">
      {/* ====== Sidebar ====== */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>📍 Phone Tracker</h1>
          <p>
            {deviceEntries.length} device{deviceEntries.length !== 1 ? 's' : ''}
            {onlineCount > 0 && <> · <span style={{ color: 'var(--success)' }}>{onlineCount} online</span></>}
          </p>
        </div>

        <div className="device-list">
          {deviceEntries.length === 0 ? (
            <div className="no-devices">
              <h3>No devices tracked yet</h3>
              <p>
                Open the tracking link below on any phone to start sharing its location in real-time.
              </p>
              <div className="share-link">{trackUrl || '...'}</div>
            </div>
          ) : (
            deviceEntries.map(([id, device], index) => (
              <div
                key={id}
                className={`device-card ${selectedDevice === id ? 'active' : ''}`}
                onClick={() => handleDeviceClick(id)}
              >
                <div className="device-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      className="color-dot"
                      style={{ background: COLORS[index % COLORS.length] }}
                    />
                    <span className="device-name">{device.name || 'Unknown Device'}</span>
                  </div>
                  <div className="device-status">
                    <span
                      className={`status-dot ${isOnline(device.timestamp) ? '' : 'offline'}`}
                    />
                    {isOnline(device.timestamp) ? 'Online' : 'Offline'}
                  </div>
                </div>
                <div className="device-coords">
                  {device.lat?.toFixed(6)}, {device.lng?.toFixed(6)}
                </div>
                <div className="device-time">
                  Last update: {formatTime(device.timestamp)}
                  {device.accuracy && (
                    <span style={{ marginLeft: 8 }}>· ±{Math.round(device.accuracy)}m</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div
          className="history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className={`toggle-switch ${showHistory ? 'active' : ''}`} />
          <span>Show route history</span>
        </div>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Share this link to track a phone:
          </div>
          <div className="track-link-box">
            <input readOnly value={trackUrl} />
            <button className="copy-btn" onClick={copyTrackLink}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* ====== Map ====== */}
      <div className="map-container">
        <MapContainer
          center={[20.5937, 78.9629]} // default: center of India
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <InvalidateSize />

          {flyTo && <FlyToDevice position={flyTo} />}

          {/* Device markers */}
          {deviceEntries.map(([id, device], index) =>
            device.lat && device.lng ? (
              <Marker
                key={id}
                position={[device.lat, device.lng]}
                icon={createColoredIcon(COLORS[index % COLORS.length])}
              >
                <Popup>
                  <div className="device-popup">
                    <h3>{device.name || 'Unknown'}</h3>
                    <p>📍 {device.lat?.toFixed(6)}, {device.lng?.toFixed(6)}</p>
                    <p>🕐 {formatTime(device.timestamp)}</p>
                    <p>{isOnline(device.timestamp) ? '🟢 Online' : '🔴 Offline'}</p>
                    {device.accuracy && <p>🎯 Accuracy: ±{Math.round(device.accuracy)}m</p>}
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}

          {/* Route history polylines */}
          {showHistory &&
            deviceEntries.map(([id], index) => {
              const points = history[id];
              if (!points || points.length < 2) return null;
              return (
                <Polyline
                  key={`trail-${id}`}
                  positions={points.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color: COLORS[index % COLORS.length],
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '8, 6',
                  }}
                />
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
}
