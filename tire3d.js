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
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06080f, 0.038);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(0, 1.35, 8.4);

  scene.add(new THREE.AmbientLight(0xb8c4dc, 0.62));
  scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x1a1208, 1.1));

  const key = new THREE.DirectionalLight(0xffe2b0, 2.15);
  key.position.set(4, 7, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8eb7ff, 1.05);
  fill.position.set(-6, 2.5, -1);
  scene.add(fill);

  const rim = new THREE.PointLight(0xffb020, 1.4, 18);
  rim.position.set(0, 1.2, 2);
  scene.add(rim);

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

  function make3DTire(mapTex, scale = 1) {
    const g = new THREE.Group();

    // rubber body
    const rubber = new THREE.Mesh(
      new THREE.TorusGeometry(0.92 * scale, 0.34 * scale, 26, 56),
      new THREE.MeshStandardMaterial({
        color: 0x12151c,
        roughness: 0.48,
        metalness: 0.22,
      })
    );
    rubber.rotation.y = Math.PI / 2;
    g.add(rubber);

    // rim disc
    const rimDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55 * scale, 0.55 * scale, 0.18 * scale, 40),
      new THREE.MeshStandardMaterial({
        color: 0x2a3140,
        roughness: 0.28,
        metalness: 0.75,
      })
    );
    rimDisc.rotation.z = Math.PI / 2;
    g.add(rimDisc);

    // brand tire photo (no text plate) — facing us for brand recognition
    if (mapTex) {
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.95 * scale, 48),
        new THREE.MeshBasicMaterial({
          map: mapTex,
          transparent: true,
          alphaTest: 0.12,
          side: THREE.DoubleSide,
          depthWrite: true,
        })
      );
      face.position.z = 0.12 * scale;
      g.add(face);

      const faceBack = face.clone();
      faceBack.position.z = -0.12 * scale;
      faceBack.rotation.y = Math.PI;
      g.add(faceBack);
    }

    return g;
  }

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
      metalness: 0.45,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -1.05, -1.2);
    scene.add(road);

    // lane markers only (no text)
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffd36a,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = -4; i <= 4; i += 1) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.1), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(i * 2.6, -1.04, -0.3);
      scene.add(dash);
    }

    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.55 });
    [-3.6, 3.6].forEach((z) => {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.06), edgeMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(0, -1.039, z);
      scene.add(edge);
    });

    const tires = [];
    const textures = await Promise.all(BRANDS.map((f) => loadTex(f)));

    // more tires for continuous left/right flow
    const COUNT = 10;
    for (let i = 0; i < COUNT; i += 1) {
      const tex = textures[i % textures.length];
      const scale = 0.72 + (i % 3) * 0.12;
      const tire = make3DTire(tex, scale);
      const fromLeft = i % 2 === 0;
      const speed = 1.35 + (i % 5) * 0.22;
      const laneZ = -2.8 + (i % 4) * 1.15;
      const y = -0.15 + (i % 3) * 0.04;

      tire.position.set(fromLeft ? -11 - i * 1.4 : 11 + i * 1.4, y, laneZ);
      tire.userData = {
        fromLeft,
        speed: fromLeft ? speed : -speed,
        spin: (fromLeft ? -1 : 1) * (2.2 + Math.random()),
        bob: Math.random() * Math.PI * 2,
        baseY: y,
        laneZ,
      };
      scene.add(tire);
      tires.push(tire);
    }

    // soft dust / spark particles (no text)
    const dustCount = 180;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      dustPos[i * 3] = (Math.random() - 0.5) * 22;
      dustPos[i * 3 + 1] = Math.random() * 3.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffc56a,
        size: 0.035,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    scene.add(dust);

    const clock = new THREE.Clock();
    let last = performance.now();

    function frame(now) {
      const t = clock.getElapsedTime();
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      if (roadMat.map) {
        roadMat.map.offset.x = (t * 0.18) % 1;
      }

      tires.forEach((tire) => {
        const u = tire.userData;
        tire.position.x += u.speed * dt;
        tire.rotation.z += u.spin * dt;
        tire.rotation.y = Math.sin(t * 0.4 + u.bob) * 0.18;
        tire.position.y = u.baseY + Math.sin(t * 1.6 + u.bob) * 0.05;

        // wrap: left→right / right→left continuous slide
        if (u.fromLeft && tire.position.x > 12) {
          tire.position.x = -12 - Math.random() * 3;
          tire.position.z = -2.8 + Math.random() * 3.4;
        } else if (!u.fromLeft && tire.position.x < -12) {
          tire.position.x = 12 + Math.random() * 3;
          tire.position.z = -2.8 + Math.random() * 3.4;
        }
      });

      const dp = dust.geometry.attributes.position.array;
      for (let i = 0; i < dustCount; i += 1) {
        dp[i * 3] += Math.sin(t + i) * dt * 0.35;
        dp[i * 3 + 1] += dt * 0.15;
        if (dp[i * 3 + 1] > 3.8) {
          dp[i * 3 + 1] = 0;
          dp[i * 3] = (Math.random() - 0.5) * 22;
        }
      }
      dust.geometry.attributes.position.needsUpdate = true;

      camera.position.x = mouse.x * 0.55;
      camera.position.y = 1.35 + mouse.y * -0.2;
      camera.lookAt(0, 0.15, -0.6);
      rim.intensity = 1.15 + Math.sin(t * 2.2) * 0.25;

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();
}
