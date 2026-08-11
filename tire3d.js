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
  scene.fog = new THREE.FogExp2(0x06080f, 0.034);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(0, 1.5, 8.6);

  scene.add(new THREE.AmbientLight(0xc0c8dc, 0.75));
  scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x1a1208, 0.95));

  const key = new THREE.DirectionalLight(0xffe2b0, 1.6);
  key.position.set(3, 6, 4);
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
      roadTex.repeat.set(2.2, 1.4);
    }

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex || null,
      color: roadTex ? 0xffffff : 0x10141c,
      roughness: 0.42,
      metalness: 0.4,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -1.05, -1.2);
    scene.add(road);

    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffd36a,
      transparent: true,
      opacity: 0.4,
    });
    for (let i = -4; i <= 4; i += 1) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.08), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(i * 2.6, -1.04, -0.3);
      scene.add(dash);
    }

    const textures = (await Promise.all(BRANDS.map((f) => loadTex(f)))).filter(Boolean);
    const tires = [];
    const COUNT = 12;

    function spawn(mesh, i, first = false) {
      const fromLeft = i % 2 === 0;
      const speed = 1.2 + (i % 5) * 0.25;
      const scale = 1.35 + (i % 3) * 0.2;
      mesh.scale.setScalar(scale);
      mesh.position.set(
        first ? (fromLeft ? -10 - i * 1.2 : 10 + i * 1.2) : fromLeft ? -12 - Math.random() * 2 : 12 + Math.random() * 2,
        -0.05 + Math.random() * 0.35,
        -2.6 + Math.random() * 3.2
      );
      mesh.rotation.set(0, fromLeft ? 0.35 : -0.35, Math.random() * 0.2 - 0.1);
      mesh.userData = {
        fromLeft,
        speed: fromLeft ? speed : -speed,
        spin: (fromLeft ? -1 : 1) * (1.6 + Math.random()),
        bob: Math.random() * Math.PI * 2,
        baseY: mesh.position.y,
      };
    }

    for (let i = 0; i < COUNT; i += 1) {
      const tex = textures[i % textures.length];
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      // şeffaf PNG lastik — yazı/plaka yok, beyaz kutu yok
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), mat);
      spawn(mesh, i, true);
      scene.add(mesh);
      tires.push(mesh);
    }

    const clock = new THREE.Clock();
    let last = performance.now();

    function frame(now) {
      const t = clock.getElapsedTime();
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      if (roadMat.map) roadMat.map.offset.x = (t * 0.16) % 1;

      tires.forEach((tire, i) => {
        const u = tire.userData;
        tire.position.x += u.speed * dt;
        tire.rotation.z += u.spin * dt * 0.55;
        tire.position.y = u.baseY + Math.sin(t * 1.5 + u.bob) * 0.06;
        // hafif 3D dönüş
        tire.rotation.y = (u.fromLeft ? 0.25 : -0.25) + Math.sin(t * 0.5 + u.bob) * 0.12;

        if (u.fromLeft && tire.position.x > 12.5) spawn(tire, i);
        else if (!u.fromLeft && tire.position.x < -12.5) spawn(tire, i);
      });

      camera.position.x = mouse.x * 0.5;
      camera.position.y = 1.5 + mouse.y * -0.18;
      camera.lookAt(0, 0.2, -0.5);

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();
}
