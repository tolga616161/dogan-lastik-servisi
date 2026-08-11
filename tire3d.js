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
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0.4, 9.2);

  scene.add(new THREE.AmbientLight(0xffffff, 1));

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

  // Sadece şeffaf PNG lastikler + marka logoları (yol/beyaz kutu yok)
  const TIRE_PNGS = [
    "assets/tires/tire-petlas.png",
    "assets/tires/tire-michelin.png",
    "assets/tires/tire-yokohama.png",
    "assets/tires/tire-continental.png",
    "assets/tires/tire-lassa.png",
    "assets/tires/tire-truck.png",
    "assets/tires/tire-bus.png",
  ];

  const BRAND_PNGS = [
    "assets/brands/petlas.png",
    "assets/brands/michelin.png",
    "assets/brands/yokohama.png",
    "assets/brands/continental.png",
    "assets/brands/lassa.png",
    "assets/brands/bridgestone.png",
    "assets/brands/goodyear.png",
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

  function makeSprite(tex, w, h) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  }

  (async function boot() {
    const tireTex = (await Promise.all(TIRE_PNGS.map(loadTex))).filter(Boolean);
    const brandTex = (await Promise.all(BRAND_PNGS.map(loadTex))).filter(Boolean);
    const items = [];

    function dropTire(mesh, i, first = false) {
      const side = i % 2 === 0 ? -1 : 1;
      const scale = 1.2 + (i % 4) * 0.2;
      mesh.scale.setScalar(scale);
      mesh.position.set(
        side * (0.8 + Math.random() * 3.8),
        first ? 4.5 + i * 1.1 : 6 + Math.random() * 3,
        -2.5 + Math.random() * 4
      );
      mesh.rotation.set(0, (Math.random() - 0.5) * 0.7, Math.random() * Math.PI);
      mesh.userData = {
        kind: "tire",
        vy: -0.4 - Math.random() * 0.6,
        vx: side * (0.2 + Math.random() * 0.5),
        spin: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.4),
        bounce: 0,
        grounded: false,
        roll: side * (0.7 + Math.random() * 0.8),
        idx: i,
      };
    }

    function placeBrand(mesh, i, first = false) {
      const fromLeft = i % 2 === 0;
      mesh.scale.setScalar(0.85 + (i % 3) * 0.12);
      mesh.position.set(
        first ? (fromLeft ? -9 - i : 9 + i) : fromLeft ? -11 : 11,
        1.2 + (i % 4) * 0.7,
        -1 + (i % 3) * 0.5
      );
      mesh.userData = {
        kind: "brand",
        fromLeft,
        speed: (fromLeft ? 1 : -1) * (0.55 + Math.random() * 0.35),
        bob: Math.random() * Math.PI * 2,
        baseY: mesh.position.y,
        idx: i,
      };
    }

    for (let i = 0; i < 10; i += 1) {
      const mesh = makeSprite(tireTex[i % tireTex.length], 2.15, 2.15);
      dropTire(mesh, i, true);
      scene.add(mesh);
      items.push(mesh);
    }

    for (let i = 0; i < brandTex.length; i += 1) {
      const mesh = makeSprite(brandTex[i], 2.8, 0.8);
      placeBrand(mesh, i, true);
      scene.add(mesh);
      items.push(mesh);
    }

    const GROUND = -1.5;
    let last = performance.now();
    const clock = new THREE.Clock();

    function frame(now) {
      const t = clock.getElapsedTime();
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      items.forEach((mesh) => {
        const u = mesh.userData;
        if (u.kind === "tire") {
          if (!u.grounded) {
            u.vy -= 8.8 * dt;
            mesh.position.y += u.vy * dt;
            mesh.position.x += u.vx * dt;
            mesh.rotation.z += u.spin * dt;
            if (mesh.position.y <= GROUND) {
              mesh.position.y = GROUND;
              if (Math.abs(u.vy) > 2 && u.bounce < 2) {
                u.vy *= -0.3;
                u.bounce += 1;
              } else {
                u.vy = 0;
                u.grounded = true;
              }
            }
          } else {
            mesh.position.x += u.roll * dt * 0.9;
            mesh.rotation.z -= u.roll * dt;
            if (Math.abs(mesh.position.x) > 10) dropTire(mesh, u.idx, false);
          }
        } else {
          mesh.position.x += u.speed * dt;
          mesh.position.y = u.baseY + Math.sin(t * 1.3 + u.bob) * 0.12;
          if (u.fromLeft && mesh.position.x > 11) placeBrand(mesh, u.idx, false);
          if (!u.fromLeft && mesh.position.x < -11) placeBrand(mesh, u.idx, false);
        }
      });

      camera.position.x = mouse.x * 0.4;
      camera.position.y = 0.4 + mouse.y * -0.15;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();
}
