import { useState, useCallback, useEffect, useRef } from 'react';
import * as api from '../api/client';

export function useRideMatch() {
  const [drivers, setDrivers] = useState([]);
  const [mode, setMode] = useState('add-driver'); // 'add-driver' | 'add-passenger' | 'find-nearest' | 'search-radius' | 'delete-driver'
  const [matchResult, setMatchResult] = useState(null); // Can be single object or array
  const [passengerPos, setPassengerPos] = useState(null); // Keep this as {x, y} or change to point array? Let's keep it {x, y} for canvas, but send point array to API.
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  
  // Search parameters
  const [kValue, setKValue] = useState(3);
  const [radiusValue, setRadiusValue] = useState(100);

  const healthInterval = useRef(null);

  // Check connection periodically
  useEffect(() => {
    const check = async () => {
      const ok = await api.healthCheck();
      setConnected(ok);
    };
    check();
    healthInterval.current = setInterval(check, 3000);
    return () => clearInterval(healthInterval.current);
  }, []);

  // Refresh driver list
  const refreshDrivers = useCallback(async () => {
    try {
      const result = await api.listDrivers();
      if (result.status === 'ok') {
        setDrivers(result.drivers || []);
      }
    } catch (err) {
      console.error('Failed to refresh drivers:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshDrivers();
  }, [refreshDrivers]);

  // Handle canvas click
  const handleCanvasClick = useCallback(async (x, y) => {
    setLoading(true);
    try {
      if (mode === 'add-driver') {
        const result = await api.addDriver([x, y]);
        if (result.status === 'ok') {
          await refreshDrivers();
        }
      } else if (mode === 'delete-driver') {
        const clickedDriver = drivers.find(d => {
          const dx = d.point[0] - x;
          const dy = d.point[1] - y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          return dist < 20; // Slightly larger hit area for easier deletion
        });

        if (clickedDriver) {
          await api.removeDriver(clickedDriver.point);
          await refreshDrivers();
          setMatchResult(prev => {
            if (!prev) return null;
            if (Array.isArray(prev)) {
              const filtered = prev.filter(res => !(res.point[0] === clickedDriver.point[0] && res.point[1] === clickedDriver.point[1]));
              return filtered.length > 0 ? filtered : null;
            } else if (prev.point[0] === clickedDriver.point[0] && prev.point[1] === clickedDriver.point[1]) {
              return null;
            }
            return prev;
          });
        }
      } else if (mode === 'add-passenger') {
        setPassengerPos({ x, y });
        setMatchResult(null);
      } else if (mode === 'find-nearest') {
        setPassengerPos({ x, y });
        const result = await api.findNearest([x, y]);
        if (result.status === 'ok') {
          setMatchResult({
            point: result.point,
            distance: result.distance,
          });
        }
      } else if (mode === 'search-radius') {
        setPassengerPos({ x, y });
        const result = await api.findRange([x, y], radiusValue);
        if (result.status === 'ok') {
          setMatchResult(result.results || []);
        }
      }
    } catch (err) {
      console.error('Canvas click error:', err);
    } finally {
      setLoading(false);
    }
  }, [mode, kValue, radiusValue, refreshDrivers, drivers]);

  // Remove a driver directly (if we ever had a list UI)
  const handleRemoveDriver = useCallback(async (point) => {
    setLoading(true);
    try {
      await api.removeDriver(point);
      await refreshDrivers();
      setMatchResult(prev => {
        if (!prev) return null;
        if (Array.isArray(prev)) {
          const filtered = prev.filter(res => !(res.point[0] === point[0] && res.point[1] === point[1]));
          return filtered.length > 0 ? filtered : null;
        } else if (prev.point[0] === point[0] && prev.point[1] === point[1]) {
          return null;
        }
        return prev;
      });
    } catch (err) {
      console.error('Remove driver error:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshDrivers]);

  // Clear all
  const handleClear = useCallback(async () => {
    setLoading(true);
    try {
      await api.clearAll();
      setDrivers([]);
      setMatchResult(null);
      setPassengerPos(null);
    } catch (err) {
      console.error('Clear error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerFindNearest = useCallback(async () => {
    if (!passengerPos) return;
    setLoading(true);
    try {
      const result = await api.findNearest([passengerPos.x, passengerPos.y]);
      if (result.status === 'ok') {
        setMatchResult({
          point: result.point,
          distance: result.distance,
        });
      }
    } catch (err) {
      console.error('Find nearest error:', err);
    } finally {
      setLoading(false);
    }
  }, [passengerPos]);

  const triggerSearchRadius = useCallback(async () => {
    if (!passengerPos) return;
    setLoading(true);
    try {
      const result = await api.findRange([passengerPos.x, passengerPos.y], radiusValue);
      if (result.status === 'ok') {
        setMatchResult(result.results || []);
      }
    } catch (err) {
      console.error('Search radius error:', err);
    } finally {
      setLoading(false);
    }
  }, [passengerPos, radiusValue]);

  // Auto-trigger range search when radius changes
  useEffect(() => {
    if (mode === 'search-radius' && passengerPos) {
      triggerSearchRadius();
    }
  }, [radiusValue, mode, passengerPos, triggerSearchRadius]);

  return {
    drivers,
    mode,
    setMode,
    matchResult,
    passengerPos,
    loading,
    connected,
    kValue,
    setKValue,
    radiusValue,
    setRadiusValue,
    handleCanvasClick,
    handleRemoveDriver,
    handleClear,
    triggerFindNearest,
    triggerSearchRadius,
  };
}

