"use client";

import { Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { HalfFloatType, type Group, type InstancedMesh, type Mesh } from "three";
import * as THREE from "three";

const PALETTE = ["#4263eb", "#6d84f2", "#0f9fad", "#3ec4d0", "#8ea0f6"];

type NodeItem = { position: THREE.Vector3; scale: number; color: THREE.Color };
type RungItem = { position: THREE.Vector3; quaternion: THREE.Quaternion; length: number };

type HelixModel = {
  tubeA: THREE.TubeGeometry;
  tubeB: THREE.TubeGeometry;
  curveA: THREE.CatmullRomCurve3;
  curveB: THREE.CatmullRomCurve3;
  nodes: NodeItem[];
  rungs: RungItem[];
  particles: Float32Array;
  particleColors: Float32Array;
};

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = cameraPosition - worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), 1.7);
    vec3 violet = vec3(0.26, 0.39, 0.92);
    vec3 blue = vec3(0.18, 0.42, 0.95);
    vec3 cyan = vec3(0.06, 0.62, 0.68);
    float t = vUv.x;
    vec3 color = mix(violet, blue, smoothstep(0.0, 0.5, t));
    color = mix(color, cyan, smoothstep(0.4, 1.0, t));
    float flow = 0.72 + 0.28 * sin(t * 46.0 - uTime * 1.5);
    color *= flow;
    color += vec3(0.82, 0.92, 1.0) * fres * 0.72;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function hash(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function buildHelix(): HelixModel {
  const turns = 2.45;
  const height = 3.05;
  const radius = 0.68;
  const steps = 120;
  const strandA: THREE.Vector3[] = [];
  const strandB: THREE.Vector3[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = (t - 0.5) * height;
    const angle = t * Math.PI * 2 * turns;
    strandA.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    strandB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
  }

  const curveA = new THREE.CatmullRomCurve3(strandA);
  const curveB = new THREE.CatmullRomCurve3(strandB);
  const tubeA = new THREE.TubeGeometry(curveA, 340, 0.02, 12, false);
  const tubeB = new THREE.TubeGeometry(curveB, 340, 0.02, 12, false);
  const nodes: NodeItem[] = [];
  const rungs: RungItem[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= steps; i += 7) {
    const t = i / steps;
    const color = new THREE.Color(PALETTE[Math.min(PALETTE.length - 1, Math.round(t * (PALETTE.length - 1)))]);
    const major = i % 14 === 0;
    nodes.push({ position: strandA[i], scale: major ? 0.086 : 0.05, color });
    nodes.push({
      position: strandB[i],
      scale: major ? 0.078 : 0.046,
      color: color.clone().offsetHSL(0.03, 0.04, 0.06),
    });
    if (major) {
      const a = strandA[i];
      const b = strandB[i];
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(b, a);
      const length = dir.length();
      rungs.push({
        position: mid,
        quaternion: new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()),
        length,
      });
      nodes.push({ position: mid, scale: 0.03, color: new THREE.Color("#e8f8ff") });
    }
  }

  const count = 280;
  const particles = new Float32Array(count * 3);
  const particleColors = new Float32Array(count * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const radiusJitter = 0.25 + hash(i) * 1.15;
    const theta = hash(i + 19) * Math.PI * 2;
    const y = (hash(i + 41) - 0.5) * 3.3;
    particles[i * 3] = Math.cos(theta) * radiusJitter;
    particles[i * 3 + 1] = y;
    particles[i * 3 + 2] = Math.sin(theta) * radiusJitter * (0.72 + hash(i + 7) * 0.4);
    tint.set(PALETTE[i % PALETTE.length]);
    particleColors[i * 3] = tint.r;
    particleColors[i * 3 + 1] = tint.g;
    particleColors[i * 3 + 2] = tint.b;
  }

  return { tubeA, tubeB, curveA, curveB, nodes, rungs, particles, particleColors };
}

function useCircleTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.75)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function Nodes({ items }: { items: NodeItem[] }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const current = mesh.current;
    if (!current) return;
    const dummy = new THREE.Object3D();
    items.forEach((item, index) => {
      dummy.position.copy(item.position);
      dummy.scale.setScalar(item.scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      current.setMatrixAt(index, dummy.matrix);
      current.setColorAt(index, item.color);
    });
    current.instanceMatrix.needsUpdate = true;
    if (current.instanceColor) current.instanceColor.needsUpdate = true;
  }, [items]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]}>
      <sphereGeometry args={[1, 18, 18]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Rungs({ items }: { items: RungItem[] }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const current = mesh.current;
    if (!current) return;
    const dummy = new THREE.Object3D();
    items.forEach((item, index) => {
      dummy.position.copy(item.position);
      dummy.quaternion.copy(item.quaternion);
      dummy.scale.set(1, item.length, 1);
      dummy.updateMatrix();
      current.setMatrixAt(index, dummy.matrix);
    });
    current.instanceMatrix.needsUpdate = true;
  }, [items]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]}>
      <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
      <meshBasicMaterial color="#9ecbff" transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}

function Strands({ tubeA, tubeB, still }: { tubeA: THREE.TubeGeometry; tubeB: THREE.TubeGeometry; still: boolean }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader,
        fragmentShader,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    if (!still) material.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <>
      <mesh geometry={tubeA} material={material} />
      <mesh geometry={tubeB} material={material} />
    </>
  );
}

function Pulses({ curveA, curveB, still }: { curveA: THREE.CatmullRomCurve3; curveB: THREE.CatmullRomCurve3; still: boolean }) {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = still ? 0.42 : (clock.elapsedTime * 0.07) % 1;
    a.current?.position.copy(curveA.getPointAt(t));
    b.current?.position.copy(curveB.getPointAt((t + 0.5) % 1));
  });
  return (
    <>
      <mesh ref={a}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshBasicMaterial color="#f7fbff" toneMapped={false} />
      </mesh>
      <mesh ref={b}>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshBasicMaterial color="#bff6ff" toneMapped={false} />
      </mesh>
    </>
  );
}

const SATELLITES = [
  { radius: 1.18, speed: 0.26, lift: 0.28, phase: 0.2, color: "#4263eb", size: 0.07 },
  { radius: 1.36, speed: -0.2, lift: -0.18, phase: 1.4, color: "#0f9fad", size: 0.055 },
  { radius: 1.05, speed: 0.32, lift: 0.46, phase: 2.2, color: "#6d84f2", size: 0.06 },
  { radius: 1.48, speed: 0.15, lift: -0.4, phase: 3.1, color: "#3ec4d0", size: 0.045 },
];

function Satellites({ still }: { still: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const root = group.current;
    if (!root) return;
    const time = still ? 0.8 : clock.elapsedTime;
    root.children.forEach((child, index) => {
      const sat = SATELLITES[index];
      const angle = sat.phase + time * sat.speed;
      child.position.set(Math.cos(angle) * sat.radius, Math.sin(angle * 0.85) * sat.lift, Math.sin(angle) * sat.radius);
      child.rotation.y += still ? 0 : 0.01;
    });
  });
  return (
    <group ref={group}>
      {SATELLITES.map((sat) => (
        <mesh key={sat.color + sat.phase}>
          <octahedronGeometry args={[sat.size, 0]} />
          <meshBasicMaterial color={sat.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Rings({ still }: { still: boolean }) {
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (still) return;
    if (outer.current) outer.current.rotation.z += delta * 0.08;
    if (inner.current) inner.current.rotation.z -= delta * 0.11;
  });
  return (
    <>
      <mesh ref={outer} rotation={[Math.PI / 2.35, 0.25, 0.2]}>
        <torusGeometry args={[1.22, 0.006, 12, 140]} />
        <meshBasicMaterial color="#8ea0f6" transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh ref={inner} rotation={[1.15, 0.8, 0.4]}>
        <torusGeometry args={[0.98, 0.005, 12, 120]} />
        <meshBasicMaterial color="#4263eb" transparent opacity={0.4} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.4, 0.2, 1.1]}>
        <torusGeometry args={[1.42, 0.004, 12, 140]} />
        <meshBasicMaterial color="#3ec4d0" transparent opacity={0.28} toneMapped={false} />
      </mesh>
    </>
  );
}

function Core({ still }: { still: boolean }) {
  const body = (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshBasicMaterial color="#d9e8ff" wireframe transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshBasicMaterial color="#7cf3ff" toneMapped={false} />
      </mesh>
      <mesh rotation={[0.6, 0.4, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
  if (still) return body;
  return (
    <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.35}>
      {body}
    </Float>
  );
}

function Particles({ positions, colors }: { positions: Float32Array; colors: Float32Array }) {
  const texture = useCircleTexture();
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!texture) return null;
  return (
    <points geometry={geometry}>
      <pointsMaterial map={texture} size={0.045} vertexColors transparent opacity={0.85} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function Instrument({ pointer, still }: { pointer: React.RefObject<{ x: number; y: number }>; still: boolean }) {
  const model = useMemo(buildHelix, []);
  const group = useRef<Group>(null);
  const spin = useRef(0.35);
  useEffect(
    () => () => {
      model.tubeA.dispose();
      model.tubeB.dispose();
    },
    [model],
  );
  useFrame((state, delta) => {
    const point = pointer.current;
    if (!point || !group.current) return;
    if (!still) spin.current += delta * 0.15;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, spin.current + point.x * 0.7, 3.4, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -0.06 + point.y * 0.34, 3.4, delta);
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, point.x * 0.32, 2.6, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, 0.12 - point.y * 0.2, 2.6, delta);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={group}>
      <Strands tubeA={model.tubeA} tubeB={model.tubeB} still={still} />
      <Rungs items={model.rungs} />
      <Nodes items={model.nodes} />
      <Pulses curveA={model.curveA} curveB={model.curveB} still={still} />
      <Rings still={still} />
      <Satellites still={still} />
      <Core still={still} />
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, 2.85, 10]} />
        <meshBasicMaterial color="#c5dcff" transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <Particles positions={model.particles} colors={model.particleColors} />
    </group>
  );
}

export function IntelligenceScene({
  pointer,
  still,
  onReady,
}: {
  pointer: React.RefObject<{ x: number; y: number }>;
  still: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.08, 4.85], fov: 30 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        requestAnimationFrame(() => onReady?.());
      }}
    >
      <Instrument pointer={pointer} still={still} />
      <EffectComposer frameBufferType={HalfFloatType} multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.42} luminanceThreshold={0.72} luminanceSmoothing={0.28} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
