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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.15, 6.2);

  const hemi = new THREE.HemisphereLight(0xffe2a8, 0x10131c, 1.15);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffc14d, 2.1);
  key.position.set(4, 3, 5);
  scene.add(key);

  const rimLight = new THREE.DirectionalLight(0x6ea8ff, 0.85);
  rimLight.position.set(-5, -1, 2);
  scene.add(rimLight);

  const tires = [];

  function makeTire(scale = 1) {
    const group = new THREE.Group();

    const rubber = new THREE.MeshStandardMaterial({
      color: 0x14161c,
      roughness: 0.78,
      metalness: 0.18,
    });
    const sidewall = new THREE.MeshStandardMaterial({
      color: 0x1c1f28,
      roughness: 0.62,
      metalness: 0.25,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0xb8bec9,
      roughness: 0.28,
      metalness: 0.92,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xffb020,
      roughness: 0.4,
      metalness: 0.55,
      emissive: 0xff8a00,
      emissiveIntensity: 0.25,
    });

    const carcass = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.34, 28, 72), rubber);
    carcass.rotation.x = Math.PI / 2;
    group.add(carcass);

    const wallL = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 16, 64), sidewall);
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

    // tread blocks
    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x0d0f14,
      roughness: 0.9,
      metalness: 0.05,
    });
    for (let i = 0; i < 28; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.28), treadMat);
      const a = (i / 28) * Math.PI * 2;
      block.position.set(Math.cos(a) * 1.28, Math.sin(a) * 0.02, Math.sin(a) * 1.28);
      block.lookAt(0, 0, 0);
      group.add(block);
    }

    group.scale.setScalar(scale);
    return group;
  }

  const main = makeTire(1.35);
  main.position.set(1.55, 0.1, 0);
  scene.add(main);
  tires.push({ mesh: main, spin: 0.55, bob: 0.12, phase: 0, baseY: 0.1 });

  const back = makeTire(0.72);
  back.position.set(-2.1, 0.85, -2.2);
  back.rotation.z = 0.4;
  scene.add(back);
  tires.push({ mesh: back, spin: -0.35, bob: 0.18, phase: 1.4, baseY: 0.85 });

  const far = makeTire(0.48);
  far.position.set(-0.6, -1.15, -3.1);
  far.rotation.z = -0.5;
  scene.add(far);
  tires.push({ mesh: far, spin: 0.7, bob: 0.1, phase: 2.2, baseY: -1.15 });

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
    tires.forEach((item) => {
      item.mesh.rotation.x = t * item.spin;
      item.mesh.rotation.y = Math.sin(t * 0.35 + item.phase) * 0.25;
      item.mesh.position.y = item.baseY + Math.sin(t * 0.9 + item.phase) * item.bob;
    });
    camera.position.x = mouse.x * 0.35;
    camera.position.y = 0.15 + mouse.y * -0.2;
    camera.lookAt(0.4, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
