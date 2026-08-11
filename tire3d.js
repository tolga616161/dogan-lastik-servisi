import * as THREE from "three";

const canvas = document.getElementById("tire-canvas");
if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  if (canvas) canvas.style.display = "none";
} else {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070b14, 0.045);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(0.2, 1.35, 7.2);

  // rainy night workshop lights
  scene.add(new THREE.AmbientLight(0x6a7a99, 0.35));

  const hemi = new THREE.HemisphereLight(0x9eb6ff, 0x1a1208, 0.85);
  scene.add(hemi);

  const work = new THREE.SpotLight(0xffc14d, 38, 22, Math.PI / 5.5, 0.45, 1.2);
  work.position.set(3.2, 6.2, 3.5);
  work.target.position.set(1.2, 0, 0);
  scene.add(work);
  scene.add(work.target);

  const cool = new THREE.DirectionalLight(0x7eb6ff, 1.35);
  cool.position.set(-6, 4, -2);
  scene.add(cool);

  const groundGlow = new THREE.PointLight(0xffb020, 2.4, 12, 2);
  groundGlow.position.set(1.4, 0.6, 1.2);
  scene.add(groundGlow);

  // wet asphalt
  const asphalt = new THREE.Mesh(
    new THREE.CircleGeometry(18, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0b0e14,
      roughness: 0.18,
      metalness: 0.78,
    })
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = -1.35;
  scene.add(asphalt);

  // road stripe
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffb020,
      emissive: 0xff8a00,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.2,
    })
  );
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(-0.4, -1.34, -1.5);
  scene.add(stripe);

  const tires = [];

  function makeTire(scale = 1, wet = true) {
    const group = new THREE.Group();

    const rubber = new THREE.MeshStandardMaterial({
      color: 0x10131a,
      roughness: wet ? 0.35 : 0.78,
      metalness: wet ? 0.45 : 0.18,
    });
    const sidewall = new THREE.MeshStandardMaterial({
      color: 0x1a1e28,
      roughness: wet ? 0.32 : 0.62,
      metalness: 0.35,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0xc9d0db,
      roughness: 0.22,
      metalness: 0.95,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xffb020,
      roughness: 0.35,
      metalness: 0.6,
      emissive: 0xff8a00,
      emissiveIntensity: 0.35,
    });

    const carcass = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.34, 30, 80), rubber);
    carcass.rotation.x = Math.PI / 2;
    group.add(carcass);

    const wallL = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 18, 70), sidewall);
    wallL.rotation.x = Math.PI / 2;
    wallL.position.y = 0.18;
    group.add(wallL);
    const wallR = wallL.clone();
    wallR.position.y = -0.18;
    group.add(wallR);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.22, 48), rim);
    group.add(disc);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 32), accent);
    group.add(hub);

    for (let i = 0; i < 5; i += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.15), rim);
      spoke.rotation.y = (i / 5) * Math.PI * 2;
      group.add(spoke);
    }

    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x090b10,
      roughness: 0.55,
      metalness: 0.2,
    });
    for (let i = 0; i < 32; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.26), treadMat);
      const a = (i / 32) * Math.PI * 2;
      block.position.set(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3);
      block.lookAt(0, 0, 0);
      group.add(block);
    }

    group.scale.setScalar(scale);
    return group;
  }

  function makeJack() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({
      color: 0x8a909c,
      roughness: 0.35,
      metalness: 0.9,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xffb020,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0xff8a00,
      emissiveIntensity: 0.2,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.55), metal);
    base.position.y = -1.2;
    g.add(base);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), accent);
    arm.position.set(0, -0.55, 0);
    g.add(arm);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 20), metal);
    pad.position.y = 0.05;
    g.add(pad);
    return g;
  }

  function makeWrench() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xb7bec9,
      roughness: 0.28,
      metalness: 0.95,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.35, 12), mat);
    shaft.rotation.z = Math.PI / 2.6;
    g.add(shaft);
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 10, 20), mat);
    head.position.set(0.55, 0.28, 0);
    g.add(head);
    return g;
  }

  const main = makeTire(1.45);
  main.position.set(1.7, -0.05, 0.4);
  main.rotation.z = 0.15;
  scene.add(main);
  tires.push({ mesh: main, spin: 0.42, bob: 0.04, phase: 0, baseY: -0.05, sway: 0.08 });

  const mid = makeTire(0.78);
  mid.position.set(-1.7, 0.55, -1.6);
  mid.rotation.z = -0.55;
  scene.add(mid);
  tires.push({ mesh: mid, spin: -0.28, bob: 0.1, phase: 1.2, baseY: 0.55, sway: 0.12 });

  const far = makeTire(0.42);
  far.position.set(0.2, 1.35, -3.4);
  far.rotation.z = 0.7;
  scene.add(far);
  tires.push({ mesh: far, spin: 0.55, bob: 0.08, phase: 2.1, baseY: 1.35, sway: 0.1 });

  const jack = makeJack();
  jack.position.set(0.15, 0, 1.1);
  scene.add(jack);

  const wrench = makeWrench();
  wrench.position.set(-0.9, -0.55, 1.6);
  wrench.rotation.y = 0.4;
  scene.add(wrench);

  // rain particles
  const rainCount = 1400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  const rainSpeed = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i += 1) {
    rainPos[i * 3] = (Math.random() - 0.5) * 22;
    rainPos[i * 3 + 1] = Math.random() * 12;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 1;
    rainSpeed[i] = 6 + Math.random() * 8;
  }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0xb7d4ff,
    size: 0.035,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const rain = new THREE.Points(rainGeo, rainMat);
  scene.add(rain);

  // ground splash sparks / droplets
  const splashCount = 180;
  const splashGeo = new THREE.BufferGeometry();
  const splashPos = new Float32Array(splashCount * 3);
  for (let i = 0; i < splashCount; i += 1) {
    splashPos[i * 3] = (Math.random() - 0.5) * 10;
    splashPos[i * 3 + 1] = -1.28 + Math.random() * 0.08;
    splashPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  splashGeo.setAttribute("position", new THREE.BufferAttribute(splashPos, 3));
  const splash = new THREE.Points(
    splashGeo,
    new THREE.PointsMaterial({
      color: 0xffd27a,
      size: 0.05,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  scene.add(splash);

  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    tires.forEach((item) => {
      item.mesh.rotation.x = t * item.spin;
      item.mesh.rotation.y = Math.sin(t * 0.28 + item.phase) * item.sway;
      item.mesh.position.y = item.baseY + Math.sin(t * 0.85 + item.phase) * item.bob;
    });

    jack.position.y = Math.sin(t * 1.4) * 0.03;
    wrench.rotation.z = Math.sin(t * 1.1) * 0.08;

    work.intensity = 34 + Math.sin(t * 3.2) * 3.5;
    groundGlow.intensity = 2.1 + Math.sin(t * 2.4) * 0.4;

    const pos = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i += 1) {
      pos[i * 3 + 1] -= rainSpeed[i] * dt;
      pos[i * 3] -= dt * 1.2;
      if (pos[i * 3 + 1] < -1.35) {
        pos[i * 3 + 1] = 8 + Math.random() * 4;
        pos[i * 3] = (Math.random() - 0.5) * 22;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 1;
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;

    const sp = splash.geometry.attributes.position.array;
    for (let i = 0; i < splashCount; i += 1) {
      sp[i * 3 + 1] = -1.28 + Math.abs(Math.sin(t * 8 + i)) * 0.05;
    }
    splash.geometry.attributes.position.needsUpdate = true;
    splash.material.opacity = 0.22 + Math.sin(t * 5) * 0.1;

    camera.position.x = 0.2 + mouse.x * 0.45;
    camera.position.y = 1.35 + mouse.y * -0.25;
    camera.lookAt(0.55, 0.1, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
