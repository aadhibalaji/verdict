"use client";

import React, { useRef, useEffect, Suspense } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Builds a stylized gavel silhouette: a barrel-shaped head sitting on a
// slender handle, merged into a single BufferGeometry so the existing
// wireframe/noise shader can run across the whole shape as one mesh.
function createGavelGeometry() {
  // Head: a horizontal cylinder, like a rolling pin — NOT stacked on the
  // same vertical axis as the handle. Real gavel heads are elongated:
  // longer along their axis than they are wide.
  const headLength = 1.6;
  const headRadius = 0.34;
  const headGeometry = new THREE.CylinderGeometry(headRadius, headRadius, headLength, 40, 8);
  headGeometry.rotateZ(Math.PI / 2); // lay it on its side so the axis runs horizontal
  headGeometry.translate(0, 0.55, 0);

  // Handle: slightly tapered, subtle flare toward the grip end, meets the
  // head at its center from below.
  const handleGeometry = new THREE.CylinderGeometry(0.11, 0.16, 2.2, 28, 10);
  handleGeometry.translate(0, -0.85, 0);

  const merged = mergeGeometries([headGeometry, handleGeometry]);
  merged.computeVertexNormals();
  return merged;
}

function createSoundBlockGeometry() {
  // Squat, wide cylinder — the block the gavel strikes
  return new THREE.CylinderGeometry(0.62, 0.7, 0.3, 40, 4);
}

export function GavelArtScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3.4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const geometry = createGavelGeometry();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointLightPos: { value: new THREE.Vector3(0, 0, 5) },
        color: { value: new THREE.Color("#e4c170") },
        impactPulse: { value: 0 },
      },
      vertexShader: `
                uniform float time;
                varying vec3 vNormal;
                varying vec3 vPosition;

                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                float snoise(vec3 v) {
                    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                    vec3 i = floor(v + dot(v, C.yyy));
                    vec3 x0 = v - i + dot(i, C.xxx);
                    vec3 g = step(x0.yzx, x0.xyz);
                    vec3 l = 1.0 - g;
                    vec3 i1 = min(g.xyz, l.zxy);
                    vec3 i2 = max(g.xyz, l.zxy);
                    vec3 x1 = x0 - i1 + C.xxx;
                    vec3 x2 = x0 - i2 + C.yyy;
                    vec3 x3 = x0 - D.yyy;
                    i = mod289(i);
                    vec4 p = permute(permute(permute(
                                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                    float n_ = 0.142857142857;
                    vec3 ns = n_ * D.wyz - D.xzx;
                    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                    vec4 x_ = floor(j * ns.z);
                    vec4 y_ = floor(j - 7.0 * x_);
                    vec4 x = x_ * ns.x + ns.yyyy;
                    vec4 y = y_ * ns.x + ns.yyyy;
                    vec4 h = 1.0 - abs(x) - abs(y);
                    vec4 b0 = vec4(x.xy, y.xy);
                    vec4 b1 = vec4(x.zw, y.zw);
                    vec4 s0 = floor(b0) * 2.0 + 1.0;
                    vec4 s1 = floor(b1) * 2.0 + 1.0;
                    vec4 sh = -step(h, vec4(0.0));
                    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
                    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
                    vec3 p0 = vec3(a0.xy, h.x);
                    vec3 p1 = vec3(a0.zw, h.y);
                    vec3 p2 = vec3(a1.xy, h.z);
                    vec3 p3 = vec3(a1.zw, h.w);
                    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
                    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
                    m = m * m;
                    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
                }

                void main() {
                    vNormal = normal;
                    vPosition = position;
                    // Lower amplitude / higher frequency than the original blob:
                    // this reads as a subtle "energy shimmer" on the surface
                    // instead of deforming the gavel silhouette out of shape.
                    float displacement = snoise(position * 3.5 + time * 0.5) * 0.045;
                    vec3 newPosition = position + normal * displacement;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }`,
      fragmentShader: `
                uniform vec3 color;
                uniform vec3 pointLightPos;
                uniform float impactPulse;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vec3 normal = normalize(vNormal);
                    vec3 lightDir = normalize(pointLightPos - vPosition);
                    float diffuse = max(dot(normal, lightDir), 0.0);

                    float fresnel = 1.0 - dot(normal, vec3(0.0, 0.0, 1.0));
                    fresnel = pow(fresnel, 2.0);

                    vec3 finalColor = color * diffuse + color * fresnel * 0.5;
                    finalColor *= 1.0 + impactPulse * 0.8;

                    gl_FragColor = vec4(finalColor, 1.0);
                }`,
      wireframe: true,
    });
    // Lifts the gavel + block up off-center so they sit above the title
    // text, which is anchored to the bottom of the hero section.
    const rig = new THREE.Group();
    rig.position.set(0, 1.4, 0);
    scene.add(rig);

    // Shrinks the whole gavel + block so its silhouette clears the title
    // text at the bottom of the section, regardless of camera/swing angle.
    const scaleRig = new THREE.Group();
    scaleRig.scale.set(0.85, 0.85, 0.85);
    rig.add(scaleRig);

    const pivotX = 1.3; // shifts the whole gavel group to the right
    const pivotY = -1.95; // bottom tip of the handle in mesh-local space
    const armLength = 2.5; // approx pivot-to-head-center distance
    const idleAngle = -0.7; // small gap, leaning left toward the block
    const strikeAngle = -0.85; // slightly further left — this is where it touches
    const raisedAngle = 1.4; // ~120° swing back to the right from idle

    const gavelPivot = new THREE.Group();
    gavelPivot.position.set(pivotX, pivotY, 0); // pivot at the grip end, not the head/handle junction
    scaleRig.add(gavelPivot);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -pivotY, 0); // cancels the pivot offset so nothing visually jumps
    gavelPivot.add(mesh);

    // Invisible, generously-sized proxy for pointer hit-testing — the real
    // gavel geometry (thin handle, narrow head) is too small a target to
    // reliably grab.
    const hitboxGeometry = new THREE.BoxGeometry(2.4, 3.0, 0.8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.set(0, -0.5, 0);
    mesh.add(hitbox);

    const blockGeometry = createSoundBlockGeometry();
    const blockMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#9c7a3c"),
      wireframe: true,
    });
    const blockHalfHeight = 0.15; // half the block's actual height
    const soundBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    soundBlock.position.set(
      pivotX + Math.sin(strikeAngle) * armLength,
      pivotY + Math.cos(strikeAngle) * armLength - blockHalfHeight,
      0
    );
    scaleRig.add(soundBlock);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 5);
    lightRef.current = pointLight;
    scene.add(pointLight);

    let state: "idle" | "dragging" | "falling" | "returning" = "idle";
    let angle = idleAngle; // current tilt, in radians
    let targetAngle = idleAngle; // where drag is pulling angle toward, eased in animate()
    let velocity = 0; // angular velocity, for the drop
    let impactFlash = 0;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function toNDC(e: PointerEvent) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    // Projects the pointer into the z=0 plane the gavel swings in, so drag
    // tracking is based on where the cursor actually is in world space
    // rather than raw screen-space mouse delta.
    function pointerWorldPosition(e: PointerEvent) {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const dist = (0 - camera.position.z) / dir.z;
      return camera.position.clone().add(dir.multiplyScalar(dist));
    }

    const handlePointerDown = (e: PointerEvent) => {
      toNDC(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(hitbox);
      if (state === "idle" && hits.length > 0) {
        state = "dragging";
        currentMount.style.cursor = "grabbing";
      }
    };

    const handlePointerMoveDrag = (e: PointerEvent) => {
      if (state !== "dragging") return;
      const worldPos = pointerWorldPosition(e);
      const dx = worldPos.x - pivotX;
      const dy = worldPos.y - pivotY;
      targetAngle = Math.max(idleAngle, Math.min(raisedAngle, Math.atan2(dx, -dy))); // clamp within the allowed swing
      velocity = 0;
    };

    const handlePointerUp = () => {
      if (state === "dragging") {
        state = "falling";
        velocity = 0;
        currentMount.style.cursor = "grab";
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMoveDrag);
    window.addEventListener("pointerup", handlePointerUp);
    currentMount.style.cursor = "grab";

    let frameId: number;
    const animate = (t: number) => {
      material.uniforms.time.value = t * 0.0003;

      if (state === "dragging") {
        angle += (targetAngle - angle) * 0.35; // higher = snappier, lower = smoother/laggier
      } else if (state === "falling") {
        velocity -= 0.006; // gravity, pulling toward strikeAngle
        angle += velocity;
        if (angle <= strikeAngle) {
          angle = strikeAngle;
          velocity *= -0.25; // small bounce off the block
          if (Math.abs(velocity) < 0.002) state = "returning";
          impactFlash = 1;
        }
      } else if (state === "returning") {
        angle += (idleAngle - angle) * 0.08; // ease back up to the idle gap
        if (Math.abs(idleAngle - angle) < 0.005) {
          angle = idleAngle;
          state = "idle";
        }
      }

      gavelPivot.rotation.z = angle;

      impactFlash *= 0.9;
      material.uniforms.impactPulse.value = impactFlash;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate(0);

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      const vec = new THREE.Vector3(x, y, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(dist));
      lightRef.current?.position.copy(pos);
      material.uniforms.pointLightPos.value = pos;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMoveDrag);
      window.removeEventListener("pointerup", handlePointerUp);
      currentMount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      hitboxGeometry.dispose();
      hitboxMaterial.dispose();
      blockGeometry.dispose();
      blockMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />;
}

export function GavelHero({
  eyebrow = "",
  title = "Verdict",
  description = "Verdict helps you cut through the noise and get to a clear decision, fast.",
  ctaHref,
  ctaLabel = "Enter the courtroom",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section
      role="banner"
      className="relative w-full h-screen bg-black text-white overflow-hidden"
    >
      <Suspense fallback={<div className="w-full h-full bg-black" />}>
        <GavelArtScene />
      </Suspense>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent z-10 pointer-events-none" />

      <div className="relative z-20 flex flex-col items-center justify-end h-full pb-20 md:pb-32 text-center px-4 pointer-events-none">
        {eyebrow && (
          <h2 className="text-sm font-mono tracking-widest text-[#e4c170]/80 uppercase">
            {eyebrow}
          </h2>
        )}
        <h1 className="mt-4 text-6xl md:text-8xl font-bold tracking-tight font-display">
          {title}
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-base md:text-lg leading-relaxed text-white/70">
          {description}
        </p>
        {ctaHref && (
          <a
            href={ctaHref}
            className="mt-8 inline-block rounded-full border border-[#e4c170]/40 px-6 py-2 text-sm font-mono tracking-wide text-[#e4c170] hover:bg-[#e4c170]/10 transition-colors pointer-events-auto"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}
