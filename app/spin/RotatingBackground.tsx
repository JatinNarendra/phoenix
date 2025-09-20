import React, { useRef, useEffect } from 'react';

// Add the RotatingBackground component
const RotatingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);

    const drawRotatingBackground = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotationRef.current);
      
      const numberOfSectors = 12;
      const angleIncrement = (Math.PI * 2) / numberOfSectors;
      const radius = Math.max(canvas.width, canvas.height) * 0.8;
      
      for (let i = 0; i < numberOfSectors; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, i * angleIncrement, (i + 1) * angleIncrement);
        ctx.closePath();
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        const baseColor = i % 2 === 0 ? 'rgba(0, 0, 0,' : 'rgba(80, 80, 80,';
        
        gradient.addColorStop(0, `${baseColor} 0.7)`);
        gradient.addColorStop(0.3, `${baseColor} 0.5)`);
        gradient.addColorStop(0.7, `${baseColor} 0.2)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      ctx.restore();
      rotationRef.current += 0.005;
      animationFrameIdRef.current = requestAnimationFrame(drawRotatingBackground);
    };

    drawRotatingBackground();

    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full"
      style={{ position: 'fixed' }}
    />
  );
};

export default RotatingBackground; 