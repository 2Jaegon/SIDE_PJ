import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AccretionDiscProps {
  className?: string;
}

export const AccretionDisc: React.FC<AccretionDiscProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();

    const getWidth = () => Math.max(container.clientWidth, 320);
    const getHeight = () => Math.max(container.clientHeight, 320);

    const camera = new THREE.PerspectiveCamera(
      42,
      getWidth() / getHeight(),
      0.1,
      100
    );
    // 황금 비율 앵글: 상단 강착원반의 타원 궤도와 하단 실제 해부학 조형 손/팔 전체가 안정적으로 조망
    camera.position.set(0, 0.65, 6.8);
    camera.lookAt(0, -0.55, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(getWidth(), getHeight());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------
    // 3. 고품질 부드러운 가우시안 파티클 텍스처
    // -------------------------------------------------------------
    const createParticleTexture = (colorInner: string, colorMid: string) => {
      const cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 64;
      const ctx = cvs.getContext('2d')!;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.24, colorInner);
      grad.addColorStop(0.58, colorMid);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cvs);
    };

    const goldParticleTexture = createParticleTexture(
      'rgba(255, 235, 185, 0.95)',
      'rgba(201, 164, 90, 0.40)'
    );

    const whiteParticleTexture = createParticleTexture(
      'rgba(245, 250, 255, 0.98)',
      'rgba(200, 222, 255, 0.38)'
    );

    // -------------------------------------------------------------
    // 4. 상단: 강착원반 천체 시스템 (Accretion Disc)
    // -------------------------------------------------------------
    const discGroup = new THREE.Group();
    discGroup.position.set(0, 0, 0);
    discGroup.rotation.x = 0.34; // 약 19.5도 시네마틱 틸트
    discGroup.rotation.z = -0.06;
    scene.add(discGroup);

    // 광자구 광륜 (Photon Ring) - 어두운 싱귤래리티 중심부를 감싸는 얇은 황금빛 링
    const ringGeo = new THREE.RingGeometry(0.32, 0.48, 64);
    const ringTexture = (() => {
      const cvs = document.createElement('canvas');
      cvs.width = 128;
      cvs.height = 128;
      const ctx = cvs.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 22, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.25, 'rgba(255, 225, 140, 0.90)');
      grad.addColorStop(0.65, 'rgba(201, 164, 90, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cvs);
    })();

    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.95,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    discGroup.add(ringMesh);

    // 강착원반 나선 파티클 (5,500개 입자)
    const DISC_PARTICLES = 5500;
    const discGeo = new THREE.BufferGeometry();
    const dPositions = new Float32Array(DISC_PARTICLES * 3);
    const dColors = new Float32Array(DISC_PARTICLES * 3);
    const dRadii = new Float32Array(DISC_PARTICLES);
    const dAngles = new Float32Array(DISC_PARTICLES);
    const dSpeeds = new Float32Array(DISC_PARTICLES);
    const dSpread = new Float32Array(DISC_PARTICLES);

    const cWhite = new THREE.Color(0xfffdf5);
    const cGold = new THREE.Color(0xd97757);
    const cAmber = new THREE.Color(0xb85333);
    const cDeep = new THREE.Color(0x3a1e16);

    for (let i = 0; i < DISC_PARTICLES; i++) {
      const u = Math.random();
      const r = 0.36 + Math.pow(u, 1.45) * 3.1;
      dRadii[i] = r;

      const armIndex = i % 3;
      const armOffset = (armIndex * 2 * Math.PI) / 3;
      const spiralAngle = Math.log(r / 0.36) * 2.3;
      const jitter = (Math.random() - 0.5) * (0.32 + r * 0.12);
      const angle = armOffset + spiralAngle + jitter;
      dAngles[i] = angle;

      // 케플러 궤도 속도 v ~ 1 / sqrt(r)
      dSpeeds[i] = (0.55 / Math.sqrt(r)) * (0.88 + Math.random() * 0.24);

      const thickness = 0.016 + (r / 3.5) * 0.10;
      const z = (Math.random() - 0.5) * thickness;
      dSpread[i] = z;

      dPositions[i * 3] = r * Math.cos(angle);
      dPositions[i * 3 + 1] = z;
      dPositions[i * 3 + 2] = r * Math.sin(angle);

      const t = (r - 0.36) / 3.1;
      const col = new THREE.Color();
      if (t < 0.18) {
        col.lerpColors(cWhite, cGold, t / 0.18);
      } else if (t < 0.6) {
        col.lerpColors(cGold, cAmber, (t - 0.18) / 0.42);
      } else {
        col.lerpColors(cAmber, cDeep, (t - 0.6) / 0.4);
      }

      dColors[i * 3] = col.r;
      dColors[i * 3 + 1] = col.g;
      dColors[i * 3 + 2] = col.b;
    }

    discGeo.setAttribute('position', new THREE.BufferAttribute(dPositions, 3));
    discGeo.setAttribute('color', new THREE.BufferAttribute(dColors, 3));

    const discMat = new THREE.PointsMaterial({
      size: 0.076,
      vertexColors: true,
      map: goldParticleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.92,
    });
    const discMesh = new THREE.Points(discGeo, discMat);
    discGroup.add(discMesh);

    // -------------------------------------------------------------
    // 5. 하단: 실제 인체 해부학 3D 조형 손 & 팔뚝 (Anatomical Particle Sculpture)
    //    18,000개의 섬세한 순백 성간 입자로 손가락 관절, 너클, 손바닥, 근육을 완벽히 재현
    // -------------------------------------------------------------
    const armGroup = new THREE.Group();
    // 손가락 관절과 엄지, 검지의 우아한 수직 라인이 가장 돋보이는 각도로 정렬
    armGroup.position.set(0, 0, 0);
    armGroup.rotation.y = -0.15;
    scene.add(armGroup);

    let handMesh: THREE.Points | null = null;
    let handGeo: THREE.BufferGeometry | null = null;
    let handMat: THREE.PointsMaterial | null = null;

    // 접점 성간 에너지 스파크 (Fingertip Cosmic Sparks)
    const sparkPts: number[] = [];
    const sparkCols: number[] = [];
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.01 + Math.random() * 0.16;
      sparkPts.push(
        Math.cos(angle) * dist,
        -0.015 + (Math.random() - 0.5) * 0.025,
        Math.sin(angle) * dist
      );
      sparkCols.push(1.0, 1.0, 1.05);
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparkPts), 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sparkCols), 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      map: whiteParticleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.92,
    });
    const sparkMesh = new THREE.Points(sparkGeo, sparkMat);
    armGroup.add(sparkMesh);

    // 바이너리 데이터로부터 실제 해부학 손 파티클 로드
    fetch('/models/hand_particles.bin')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load hand_particles.bin');
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const floatView = new Float32Array(buffer);
        const count = floatView.length / 6;
        const positions = floatView.subarray(0, count * 3);
        const normals = floatView.subarray(count * 3, count * 6);

        // 조명 벡터 (탑-프론트 사광)
        const Lx = 0.35, Ly = 0.65, Lz = 0.68;
        const Llen = Math.hypot(Lx, Ly, Lz);
        const nxL = Lx / Llen, nyL = Ly / Llen, nzL = Lz / Llen;

        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const nx = normals[i * 3];
          const ny = normals[i * 3 + 1];
          const nz = normals[i * 3 + 2];
          const dot = Math.max(0.18, nx * nxL + ny * nyL + nz * nzL);
          const b = 0.82 + 0.18 * dot;
          colors[i * 3] = b;
          colors[i * 3 + 1] = b;
          colors[i * 3 + 2] = Math.min(1.0, b * 1.02);
        }

        handGeo = new THREE.BufferGeometry();
        handGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        handGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        handMat = new THREE.PointsMaterial({
          size: 0.028, // 기둥 느낌을 지우고 실제 인체 피부처럼 조밀하고 섬세한 입자 크기
          vertexColors: true,
          map: whiteParticleTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.96,
        });

        handMesh = new THREE.Points(handGeo, handMat);
        armGroup.add(handMesh);
      })
      .catch((err) => {
        console.error('Error loading anatomical hand model:', err);
      });

    // -------------------------------------------------------------
    // 6. 독립 자율 애니메이션 루프
    // -------------------------------------------------------------
    let animId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const elapsed = currentTime * 0.001;

      // 상단 강착원반: 검지 끝 위에서 우아하게 독립 자율 회전
      discGroup.rotation.y = elapsed * 0.13;
      discGroup.rotation.x = 0.34 + Math.sin(elapsed * 0.22) * 0.015;
      discGroup.rotation.z = -0.06 + Math.cos(elapsed * 0.18) * 0.012;

      // 하단 실제 해부학 손: 생명체처럼 부드러운 미세 호흡 모션
      armGroup.position.y = Math.sin(elapsed * 1.5) * 0.008;
      armGroup.rotation.y = -0.15 + Math.sin(elapsed * 0.5) * 0.012;

      // 강착원반 케플러 궤도 입자 갱신
      const dPosAttr = discGeo.attributes.position as THREE.BufferAttribute;
      const dPos = dPosAttr.array as Float32Array;

      for (let i = 0; i < DISC_PARTICLES; i++) {
        dAngles[i] += dSpeeds[i] * delta * 0.85;
        const r = dRadii[i];
        const theta = dAngles[i];

        dPos[i * 3] = r * Math.cos(theta);
        dPos[i * 3 + 1] = dSpread[i] + Math.sin(theta * 2 + elapsed * 1.2) * 0.015;
        dPos[i * 3 + 2] = r * Math.sin(theta);
      }
      dPosAttr.needsUpdate = true;

      // 광자구 광륜 펄스
      const pulse = 1.0 + Math.sin(elapsed * 2.4) * 0.05;
      ringMesh.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // 7. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = getWidth();
      const h = getHeight();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Clean up
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      discGeo.dispose();
      discMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      if (handGeo) handGeo.dispose();
      if (handMat) handMat.dispose();
      goldParticleTexture.dispose();
      whiteParticleTexture.dispose();
      ringTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
};
