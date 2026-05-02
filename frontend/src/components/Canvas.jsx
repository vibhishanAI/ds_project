import { useRef, useEffect, useCallback } from 'react';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const GRID_SPACING = 50;

export default function Canvas({ 
  drivers, 
  matchResult, 
  passengerPos, 
  mode, 
  loading, 
  radius,
  onCanvasClick
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  
  const draw = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    timeRef.current = timestamp || 0;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0c1220');
    bgGrad.addColorStop(1, '#0a0e17');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Grid dots at intersections
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SPACING) {
      for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Range search circle
    if (mode === 'search-radius' && passengerPos) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(passengerPos.x, passengerPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.03)';
      ctx.beginPath();
      ctx.arc(passengerPos.x, passengerPos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connection lines (passenger → matched drivers)
    if (matchResult && passengerPos) {
      const results = Array.isArray(matchResult) ? matchResult : [matchResult];
      const dashOffset = (timeRef.current / 30) % 20;

      results.forEach(res => {
        // Glow line
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(passengerPos.x, passengerPos.y);
        ctx.lineTo(res.point[0], res.point[1]);
        ctx.stroke();

        // Dashed line
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -dashOffset;
        ctx.beginPath();
        ctx.moveTo(passengerPos.x, passengerPos.y);
        ctx.lineTo(res.point[0], res.point[1]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Draw drivers
    drivers.forEach((driver) => {
      const isMatched = matchResult && (
        Array.isArray(matchResult) 
          ? matchResult.some(res => res.point[0] === driver.point[0] && res.point[1] === driver.point[1])
          : (matchResult.point[0] === driver.point[0] && matchResult.point[1] === driver.point[1])
      );
      
      const pulseScale = isMatched ? 1 + Math.sin(timeRef.current / 200) * 0.15 : 1;

      // Outer glow
      if (isMatched) {
        const glowRadius = 24 * pulseScale;
        const glow = ctx.createRadialGradient(driver.point[0], driver.point[1], 0, driver.point[0], driver.point[1], glowRadius);
        glow.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(driver.point[0], driver.point[1], glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ring
      const ringRadius = (isMatched ? 14 : 10) * pulseScale;
      ctx.strokeStyle = isMatched ? 'rgba(59, 130, 246, 0.8)' : 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(driver.point[0], driver.point[1], ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dot
      const dotRadius = (isMatched ? 6 : 5) * pulseScale;
      const dotGrad = ctx.createRadialGradient(driver.point[0], driver.point[1], 0, driver.point[0], driver.point[1], dotRadius);
      if (isMatched) {
        dotGrad.addColorStop(0, '#60a5fa');
        dotGrad.addColorStop(1, '#3b82f6');
      } else {
        dotGrad.addColorStop(0, '#34d399');
        dotGrad.addColorStop(1, '#10b981');
      }
      ctx.fillStyle = dotGrad;
      ctx.beginPath();
      ctx.arc(driver.point[0], driver.point[1], dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Car icon
      ctx.fillStyle = isMatched ? '#dbeafe' : '#d1fae5';
      ctx.font = `${isMatched ? 14 : 12}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText('🚗', driver.point[0], driver.point[1] - ringRadius - 6);
    });

    // Draw passenger
    if (passengerPos) {
      const pulseFactor = 1 + Math.sin(timeRef.current / 150) * 0.1;

      // Glow
      const passGlow = ctx.createRadialGradient(passengerPos.x, passengerPos.y, 0, passengerPos.x, passengerPos.y, 20 * pulseFactor);
      passGlow.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
      passGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = passGlow;
      ctx.beginPath();
      ctx.arc(passengerPos.x, passengerPos.y, 20 * pulseFactor, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(passengerPos.x, passengerPos.y, 12 * pulseFactor, 0, Math.PI * 2);
      ctx.stroke();

      // Dot
      const passDot = ctx.createRadialGradient(passengerPos.x, passengerPos.y, 0, passengerPos.x, passengerPos.y, 5);
      passDot.addColorStop(0, '#fbbf24');
      passDot.addColorStop(1, '#f59e0b');
      ctx.fillStyle = passDot;
      ctx.beginPath();
      ctx.arc(passengerPos.x, passengerPos.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Icon
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('🧑', passengerPos.x, passengerPos.y - 18);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [drivers, matchResult, passengerPos, mode, radius]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    onCanvasClick(x, y);
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleClick}
        style={{ cursor: (mode === 'add-driver' ? 'crosshair' : (mode === 'delete-driver' ? 'not-allowed' : 'pointer')) }}
      />
      <div className="canvas-overlay">
        <span className={`dot ${mode === 'add-driver' ? 'green' : (mode === 'delete-driver' ? 'red' : 'orange')}`}></span>
        {mode === 'add-driver' ? 'Add Driver (Click)' : 
         mode === 'add-passenger' ? 'Place Passenger' :
         mode === 'find-nearest' ? 'Find Nearest (Click Canvas)' :
         mode === 'search-radius' ? 'Search Radius (Click Canvas)' :
         mode === 'delete-driver' ? 'Delete Driver (Click on Car)' : 'Mode Selected'}
      </div>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
}

