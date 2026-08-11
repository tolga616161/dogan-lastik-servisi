import * as THREE from "three";

const canvas = document.getElementById("tire-canvas");
if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  if (canvas) canvas.style.display = "none";
} else {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, 0.2, 9.5);

  scene.add(new THREE.AmbientLight(0x9aa8c0, 0.55));
  const key = new THREE.DirectionalLight(0xffe0a8, 1.15);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6a8cff, 0.45);
  fill.position.set(-4, 1, -2);
  scene.add(fill);

  function makeTire(scale = 1) {
    const g = new THREE.Group();
    const rubber = new THREE.Mesh(
      new THREE.TorusGeometry(0.95 * scale, 0.34 * scale, 18, 42),
      new THREE.MeshStandardMaterial({
        color: 0x12151c,
        roughness: 0.55,
        metalness: 0.18,
      })
    );
    rubber.rotation.y = Math.PI / 2;
    g.add(rubber);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52 * scale, 0.52 * scale, 0.16 * scale, 28),
      new THREE.MeshStandardMaterial({
        color: 0x2c3342,
        roughness: 0.3,
        metalness: 0.72,
      })
    );
    rim.rotation.z = Math.PI / 2;
    g.add(rim);

    const hub = new THREE.Mesh(
      new THREE.CircleGeometry(0.22 * scale, 24),
      new THREE.MeshStandardMaterial({
        color: 0x1a1e28,
        roughness: 0.45,
        metalness: 0.4,
      })
    );
    hub.position.z = 0.09 * scale;
    g.add(hub);
    return g;
  }

  const tires = [];
  const COUNT = 6;
  for (let i = 0; i < COUNT; i += 1) {
    const scale = 0.7 + (i % 3) * 0.12;
    const tire = makeTire(scale);
    const side = i % 2 === 0 ? -1 : 1;
    tire.position.set(side * (2.2 + (i % 3) * 0.9), -0.6 + (i % 3) * 0.85, -1.5 - (i % 4) * 0.55);
    tire.rotation.y = side * 0.55;
    tire.userData = {
      spin: (side > 0 ? -1 : 1) * (0.25 + (i % 3) * 0.08),
      bob: i * 1.1,
      baseY: tire.position.y,
      drift: side * (0.08 + (i % 3) * 0.03),
      baseX: tire.position.x,
    };
    // abartısız görünüm
    tire.traverse((o) => {
      if (o.material) {
        o.material.transparent = true;
        o.material.opacity = 0.42;
      }
    });
    scene.add(tire);
    tires.push(tire);
  }

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
    tires.forEach((tire) => {
      const u = tire.userData;
      tire.rotation.z += u.spin * 0.016;
      tire.position.y = u.baseY + Math.sin(t * 0.7 + u.bob) * 0.12;
      tire.position.x = u.baseX + Math.sin(t * 0.25 + u.bob) * 0.18;
      tire.rotation.y = Math.sin(t * 0.2 + u.bob) * 0.15 + (u.drift > 0 ? 0.4 : -0.4);
    });
    camera.position.x = mouse.x * 0.25;
    camera.position.y = 0.2 + mouse.y * -0.1;
    camera.lookAt(0, 0.1, -1);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
