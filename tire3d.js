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
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06080f, 0.032);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 1.8, 8.8);

  scene.add(new THREE.AmbientLight(0xc0c8dc, 0.8));
  scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x1a1208, 0.9));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.55);
  key.position.set(3, 7, 4);
  scene.add(key);

  const loader = new THREE.TextureLoader();
  const loadTex = (url) =>
    new Promise((resolve) => {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });

  const BRANDS = [
    "assets/tires/tire-petlas.png",
    "assets/tires/tire-michelin.png",
    "assets/tires/tire-yokohama.png",
    "assets/tires/tire-continental.png",
    "assets/tires/tire-lassa.png",
  ];

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

  (async function boot() {
    const roadTex = await loadTex("assets/tires/road-asphalt.png");
    if (roadTex) {
      roadTex.wrapS = THREE.RepeatWrapping;
      roadTex.wrapT = THREE.RepeatWrapping;
      roadTex.repeat.set(2.2, 1.6);
    }

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex || null,
      color: roadTex ? 0xffffff : 0x10141c,
      roughness: 0.42,
      metalness: 0.4,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -1.1, -1.5);
    scene.add(road);

    const textures = (await Promise.all(BRANDS.map((f) => loadTex(f)))).filter(Boolean);
    const tires = [];
    const COUNT = 10;
    const GROUND = -0.15;

    function drop(mesh, i, staggered = false) {
      const side = i % 2 === 0 ? -1 : 1;
      const scale = 1.45 + (i % 3) * 0.22;
      mesh.scale.setScalar(scale);
      mesh.position.set(
        side * (1.2 + Math.random() * 3.4) + (Math.random() - 0.5) * 0.6,
        staggered ? 5.5 + i * 1.15 + Math.random() : 6.2 + Math.random() * 2.5,
        -3.2 + Math.random() * 3.8
      );
      mesh.rotation.set(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.8,
        Math.random() * Math.PI
      );
      mesh.userData = {
        vy: -0.2 - Math.random() * 0.8,
        vx: side * (0.35 + Math.random() * 0.55),
        spin: (Math.random() > 0.5 ? 1 : -1) * (1.4 + Math.random() * 1.6),
        bounce: 0,
        grounded: false,
        roll: side * (0.9 + Math.random() * 0.7),
      };
    }

    for (let i = 0; i < COUNT; i += 1) {
      const tex = textures[i % textures.length];
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      // şeffaf PNG lastik — arka plan yok, yukarıdan düşer
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat);
      drop(mesh, i, true);
      scene.add(mesh);
      tires.push(mesh);
    }

    const clock = new THREE.Clock();
    let last = performance.now();

    function frame(now) {
      const t = clock.getElapsedTime();
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      if (roadMat.map) roadMat.map.offset.y = (t * 0.28) % 1;

      tires.forEach((tire, i) => {
        const u = tire.userData;

        if (!u.grounded) {
          u.vy -= 9.2 * dt;
          tire.position.y += u.vy * dt;
          tire.position.x += u.vx * dt;
          tire.rotation.z += u.spin * dt;
          tire.rotation.y += 0.35 * dt;

          if (tire.position.y <= GROUND) {
            tire.position.y = GROUND;
            if (Math.abs(u.vy) > 2.4 && u.bounce < 2) {
              u.vy *= -0.32;
              u.bounce += 1;
            } else {
              u.vy = 0;
              u.grounded = true;
              tire.rotation.x = -0.12;
            }
          }
        } else {
          // yolda sağa/sola kayarak uzaklaş, sonra yukarıdan yeniden düş
          tire.position.x += u.roll * dt * 0.85;
          tire.rotation.z -= u.roll * dt * 1.1;
          if (Math.abs(tire.position.x) > 9.5 || tire.position.z > 4) {
            drop(tire, i, false);
          }
        }
      });

      camera.position.x = mouse.x * 0.45;
      camera.position.y = 1.8 + mouse.y * -0.2;
      camera.lookAt(0, 0.35, -0.8);

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();
}
