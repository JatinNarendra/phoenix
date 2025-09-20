"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

// The main particle sphere component
export function ParticleSphere() {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Particles count={250} />
      <OrbitControls enableZoom={true} enablePan={true} />
    </Canvas>
  )
}

// The particles component
function Particles({ count = 250 }) {
  const points = useRef<THREE.Points>(null)

  // Create particles with initial positions on a sphere
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const radius = 3

    for (let i = 0; i < count; i++) {
      // Create points on a sphere using spherical coordinates
      const phi = Math.acos(-1 + (2 * i) / count)
      const theta = Math.sqrt(count * Math.PI) * phi

      positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi)
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi)
      positions[i * 3 + 2] = radius * Math.cos(phi)
    }

    return positions
  }, [count])

  // Create particle colors
  const particlesColors = useMemo(() => {
    const colors = new Float32Array(count * 3)
    const phoenixColors = [
      new THREE.Color(0x8c0002), // Dark red
      new THREE.Color(0xbf0004), // Red
      new THREE.Color(0xfa4931), // Bright red
      new THREE.Color(0xff3333), // Vibrant red
      new THREE.Color(0xff0000), // Pure red
    ]

    for (let i = 0; i < count; i++) {
      // Randomly select a phoenix color
      const color = phoenixColors[Math.floor(Math.random() * phoenixColors.length)]

      // Add slight variation to make it more dynamic (but keep it in the red range)
      const hue = Math.random() * 0.05 - 0.025
      const saturation = Math.random() * 0.1

      color.offsetHSL(hue, saturation, 0)

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return colors
  }, [count])

  // Animation properties for each particle
  const particleProps = useMemo(() => {
    return Array.from({ length: count }, () => ({
      // Random rotation axis for each particle
      rotationAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      // Quadruple the rotation speed
      rotationSpeed: Math.random() * 0.01 + 0.004,
      // Random phase offset for varied movement
      phaseOffset: Math.random() * Math.PI * 2,
    }))
  }, [count])

  // Animation loop
  useFrame(({ clock }) => {
    if (!points.current) return

    const positions = points.current.geometry.attributes.position.array as Float32Array
    const time = clock.getElapsedTime() // Quadruple the overall time speed
    const radius = 3
    const tempVector = new THREE.Vector3()

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const props = particleProps[i]

      // Get current position
      tempVector.set(positions[i3], positions[i3 + 1], positions[i3 + 2])

      // Apply rotation around individual axis
      tempVector.applyAxisAngle(props.rotationAxis, props.rotationSpeed * (time + props.phaseOffset))

      // Add some wave-like movement (quadrupled speed)
      const waveAmplitude = 0.1
      const waveFrequency = 1.6 // Quadrupled frequency
      const wave = Math.sin(time * waveFrequency + props.phaseOffset) * waveAmplitude

      // Project back to sphere surface with wave effect
      tempVector.normalize().multiplyScalar(radius + wave)

      // Update position
      positions[i3] = tempVector.x
      positions[i3 + 1] = tempVector.y
      positions[i3 + 2] = tempVector.z
    }

    points.current.geometry.attributes.position.needsUpdate = true

    // Quadruple the rotation speed of the entire particle system
    points.current.rotation.y = time * 0.04
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={particlesPosition} 
          itemSize={3}
          args={[particlesPosition, 3]} 
        />
        <bufferAttribute 
          attach="attributes-color" 
          count={count} 
          array={particlesColors} 
          itemSize={3}
          args={[particlesColors, 3]} 
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

const PhoenixParticleLoader = () => {
  return (
    <>
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 999
        }}
      />
      <div 
        style={{ 
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: '300px',
          zIndex: 1000,
          borderRadius: '50%',
          overflow: 'hidden'
        }}
      >
        <ParticleSphere />
      </div>
    </>
  )
}

export default PhoenixParticleLoader; 