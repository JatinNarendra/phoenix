"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { getPhoenixImage, getBadgeImage } from "../utility/imageHelpers";
import { levelConfig } from "../utility/stageConfig";

interface PhoenixLevelUpLoaderProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
  newLevel: number;
}

const PhoenixParticles = ({ newLevel }: { newLevel: number }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleGeometryRef = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    if (!particleGeometryRef.current) return;

    // Calculate particle count based on level
    const baseParticleCount = 1000;
    const levelMultiplier = Math.min(3, 1 + newLevel * 0.2); // Scales up to 3x particles at level 10
    const particleCount = Math.floor(baseParticleCount * levelMultiplier);

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    // Get level-specific configuration
    const currentLevelConfig = levelConfig[newLevel];
    const prevLevelConfig = levelConfig[newLevel - 1] || levelConfig[1];

    // Calculate intensity based on level requirements
    const sparkIncrease =
      currentLevelConfig.sparkRequired - prevLevelConfig.sparkRequired;
    const baseIntensity = Math.min(1, 0.5 + sparkIncrease / 100000);

    // Simplified color palette with only red, orange, and yellow tones
    const flameColors = [
      { r: 1, g: 0.8, b: 0 }, // Bright yellow
      { r: 1, g: 0.6, b: 0 }, // Orange
      { r: 1, g: 0.3, b: 0 }, // Deep orange
      { r: 1, g: 0.2, b: 0 }, // Bright red
      { r: 1, g: 0.1, b: 0 }, // Pure red
    ];

    // Enhanced particle distribution
    for (let i = 0; i < particleCount; i++) {
      // Create more complex particle patterns based on level
      const radius = Math.random() * (8 + newLevel * 0.5); // Increased spread for higher levels
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      // Add spiral pattern for higher levels
      const spiralOffset = newLevel >= 5 ? Math.sin(theta * newLevel) * 0.5 : 0;

      positions[i * 3] =
        radius * Math.sin(phi) * Math.cos(theta) + spiralOffset;
      positions[i * 3 + 1] =
        radius * Math.sin(phi) * Math.sin(theta) - 2 + spiralOffset;
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Enhanced color selection
      const colorIndex = Math.floor(Math.random() * flameColors.length);
      const selectedColor = flameColors[colorIndex];

      // Add color variation and intensity based on level
      const levelBoost = (newLevel / 10) * 1.5;
      const intensityBase = 1.2;
      colors[i * 3] =
        selectedColor.r *
        baseIntensity *
        (intensityBase + Math.random() * 0.4 + levelBoost);
      colors[i * 3 + 1] =
        selectedColor.g *
        baseIntensity *
        (intensityBase + Math.random() * 0.4 + levelBoost);
      colors[i * 3 + 2] =
        selectedColor.b *
        baseIntensity *
        (intensityBase + Math.random() * 0.4 + levelBoost);

      // Vary particle sizes based on level with increased base size
      scales[i] = Math.random() * (3 + newLevel * 0.3);
    }

    particleGeometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometryRef.current.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );
    particleGeometryRef.current.setAttribute(
      "scale",
      new THREE.BufferAttribute(scales, 1)
    );
  }, [newLevel]);

  useFrame((state) => {
    if (!particlesRef.current || !particleGeometryRef.current) return;

    // Rotate the entire particle system
    particlesRef.current.rotation.x += 0.001;
    particlesRef.current.rotation.y += 0.002;

    const time = state.clock.getElapsedTime();
    const positions = particleGeometryRef.current.attributes.position;
    const scales = particleGeometryRef.current.attributes.scale;
    const colors = particleGeometryRef.current.attributes.color;

    // Safety check to ensure all attributes are properly initialized
    if (!positions || !scales || !colors || !positions.count) return;

    // Animate particles
    for (let i = 0; i < positions.count; i++) {
      // Enhanced pulsing scale effect with variation
      const pulseSpeed = 0.1 + (i % 5) * 0.02;
      scales.array[i] = Math.abs(Math.sin(time + i * pulseSpeed)) * 2.5 + 0.5;

      // Enhanced color fluctuation with red persistence
      const flicker = 0.95 + Math.sin(time * 2 + i) * 0.15;
      const redBoost = Math.max(0.8, Math.sin(time + i * 0.1) * 0.2 + 0.9);

      colors.array[i * 3] *= flicker * redBoost; // R - enhanced red
      colors.array[i * 3 + 1] *= flicker * 0.95; // G - slightly reduced
      colors.array[i * 3 + 2] *= flicker * 0.9; // B - further reduced

      // Add trailing effect by modifying positions
      const trailFactor = Math.sin(time * 0.5 + i * 0.1) * 0.1;
      positions.array[i * 3] += trailFactor;
      positions.array[i * 3 + 1] += Math.abs(trailFactor) * 0.5;
    }

    positions.needsUpdate = true;
    scales.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry ref={particleGeometryRef} />
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={1}
      />
    </points>
  );
};

const PhoenixLevelUpLoader: React.FC<PhoenixLevelUpLoaderProps> = ({
  isVisible,
  onAnimationComplete,
  newLevel,
}) => {
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [badgeLoaded, setBadgeLoaded] = useState(false);

  useEffect(() => {
    console.log("PhoenixLevelUpLoader mounted with:", { isVisible, newLevel });
  }, [isVisible, newLevel]);

  useEffect(() => {
    // Preload both images with enhanced error handling
    const backgroundImage = new Image();
    const badgeImage = new Image();

    const backgroundSrc = getPhoenixImage(newLevel);
    const badgeSrc = getBadgeImage(newLevel);

    backgroundImage.src = backgroundSrc;
    badgeImage.src = badgeSrc;

    console.log("Loading images:", {
      background: backgroundSrc,
      badge: badgeSrc,
      isProduction: process.env.NODE_ENV === "production",
    });

    backgroundImage.onload = () => {
      console.log("Background image loaded successfully");
      setBackgroundLoaded(true);
    };
    badgeImage.onload = () => {
      console.log("Badge image loaded successfully");
      setBadgeLoaded(true);
    };

    // Enhanced error handlers with fallback
    backgroundImage.onerror = (e) => {
      console.error("Failed to load background image:", backgroundSrc, e);
      // Try fallback image
      backgroundImage.src = "/assets/homebackground/phoenix1.png";
      backgroundImage.onload = () => {
        console.log("Fallback background image loaded");
        setBackgroundLoaded(true);
      };
    };
    badgeImage.onerror = (e) => {
      console.error("Failed to load badge image:", badgeSrc, e);
      // Try fallback image
      badgeImage.src = "/assets/homebackground/badge1.png";
      badgeImage.onload = () => {
        console.log("Fallback badge image loaded");
        setBadgeLoaded(true);
      };
    };
  }, [newLevel]);

  useEffect(() => {
    // Only complete animation when both images are loaded
    if (backgroundLoaded && badgeLoaded) {
      console.log("Both images loaded, starting animation");
      const timer = setTimeout(() => {
        console.log("Animation complete");
        onAnimationComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [backgroundLoaded, badgeLoaded, onAnimationComplete]);

  if (!isVisible) {
    console.log("Component not visible, returning null");
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-60" />

      <div className="relative z-10 flex flex-col items-center">
        <Canvas
          camera={{ position: [0, 0, 5] }}
          style={{ width: "100vw", height: "100vh", position: "absolute" }}
        >
          <PhoenixParticles newLevel={newLevel} />
        </Canvas>

        {/* Fancy Level Up Text with Flame Effects */}
        <div className="text-center z-20">
          <div className="leveling-up-text">Leveling Up...</div>
          <div className="new-level-text">Level {newLevel}</div>
          <div className="level-title-text">
            {levelConfig[newLevel]?.title || "Phoenix"}
          </div>
        </div>
      </div>

      <style jsx>{`
        .leveling-up-text {
          font-family: "Cinzel", serif;
          font-size: 1.4rem;
          font-weight: bold;
          color: #ffd700;
          text-shadow: 0 0 4px #ff4800, 0 0 8px #ff4800, 0 0 12px #ff4800,
            0 0 16px #ff4800, 0 -1px 0 #fff, 1px -1px 0 #fff, 1px 0 0 #fff,
            1px 1px 0 #fff;
          animation: flameFlicker 2s infinite, floatText 3s ease-in-out infinite;
          margin-bottom: 0.5rem;
          position: relative;
          letter-spacing: 2px;
          margin-top: 60vh;
        }

        .new-level-text {
          font-family: "Cinzel", serif;
          font-size: 1.8rem;
          font-weight: bold;
          background: linear-gradient(
            to bottom,
            #fff 5%,
            #ffd700 40%,
            #ff4800 60%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 6px #ff4800, 0 0 12px #ff4800, 0 0 24px #ff4800;
          animation: phoenixPulse 2s infinite;
          position: relative;
          letter-spacing: 3px;
        }

        .level-title-text {
          font-family: "Cinzel", serif;
          font-size: 1.2rem;
          margin-top: 0.5rem;
          color: #ffd700;
          text-shadow: 0 0 4px #ff4800, 0 0 8px #ff4800;
          animation: flameFlicker 2s infinite;
          letter-spacing: 1px;
        }

        .leveling-up-text::before,
        .new-level-text::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle,
            rgba(255, 72, 0, 0.1) 0%,
            transparent 70%
          );
          animation: rotateFire 10s linear infinite;
          pointer-events: none;
        }

        .leveling-up-text::after,
        .new-level-text::after {
          content: "";
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 120%;
          height: 10px;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 72, 0, 0.6) 0%,
            transparent 70%
          );
          filter: blur(4px);
        }

        @keyframes flameFlicker {
          0%,
          100% {
            opacity: 0.95;
            transform: scale(1) rotate(0deg);
          }
          25% {
            opacity: 0.9;
            transform: scale(0.98) rotate(-0.5deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.02) rotate(0.5deg);
          }
          75% {
            opacity: 0.9;
            transform: scale(0.99) rotate(-0.25deg);
          }
        }

        @keyframes floatText {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes phoenixPulse {
          0%,
          100% {
            transform: scale(1);
            text-shadow: 0 0 6px #ff4800, 0 0 12px #ff4800, 0 0 24px #ff4800;
          }
          50% {
            transform: scale(1.02);
            text-shadow: 0 0 8px #ff4800, 0 0 16px #ff4800, 0 0 32px #ff4800;
          }
        }

        @keyframes rotateFire {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Add flame particles effect */
        .leveling-up-text::after,
        .new-level-text::after {
          animation: flameParticles 2s infinite;
        }

        @keyframes flameParticles {
          0%,
          100% {
            opacity: 0.6;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateX(-50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default PhoenixLevelUpLoader;
