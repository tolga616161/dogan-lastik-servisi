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
  scene.fog = new THREE.FogExp2(0x07090f, 0.042);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.6, 7.2);

  scene.add(new THREE.AmbientLight(0xb0bdd4, 0.55));
  scene.add(new THREE.HemisphereLight(0xd7e3ff, 0x1a140c, 1.05));

  const key = new THREE.DirectionalLight(0xffe1a8, 2.2);
  key.position.set(3, 8, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8eb7ff, 1.1);
  fill.position.set(-5, 3, -2);
  scene.add(fill);

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
    { name: "PETLAS", file: "assets/tires/tire-petlas.png", color: "#ffb020" },
    { name: "MICHELIN", file: "assets/tires/tire-michelin.png", color: "#ffd36a" },
    { name: "YOKOHAMA", file: "assets/tires/tire-yokohama.png", color: "#e8eef7" },
    { name: "CONTINENTAL", file: "assets/tires/tire-continental.png", color: "#f0a0a0" },
    { name: "LASSA", file: "assets/tires/tire-lassa.png", color: "#ff5a5a" },
  ];

  function makeLogoTexture(name, color) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = "rgba(8,10,14,0.72)";
    roundRect(ctx, 48, 48, 928, 160, 28);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    roundRect(ctx, 48, 48, 928, 160, 28);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "bold 92px Arial Black, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 512, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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

  (async function boot() {
    const roadTex = await loadTex("assets/tires/road-asphalt.png");
    if (roadTex) {
      roadTex.wrapS = THREE.RepeatWrapping;
      roadTex.wrapT = THREE.RepeatWrapping;
      roadTex.repeat.set(2, 6);
    }

    // rotating / scrolling road
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex || null,
      color: roadTex ? 0xffffff : 0x12151c,
      roughness: 0.35,
      metalness: 0.55,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 28), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0.8, -1.15, -2);
    scene.add(road);

    // road edge glow lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffb020 });
    [-3.2, 3.2].forEach((x) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 28), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0.8 + x, -1.14, -2);
      scene.add(line);
    });

    const center = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.55 })
    );
    center.rotation.x = -Math.PI / 2;
    center.position.set(0.8, -1.139, -2);
    scene.add(center);

    const tireCards = [];

    for (let i = 0; i < BRANDS.length; i += 1) {
      const brand = BRANDS[i];
      const tex = await loadTex(brand.file);
      const group = new THREE.Group();

      if (tex) {
        // punch white-ish background toward transparent-ish look via material
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.08,
          side: THREE.DoubleSide,
          depthWrite: true,
        });
        const card = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 2.35), mat);
        group.add(card);
      } else {
        const fallback = new THREE.Mesh(
          new THREE.TorusGeometry(0.9, 0.32, 20, 48),
          new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.4, metalness: 0.3 })
        );
        fallback.rotation.y = Math.PI / 2;
        group.add(fallback);
      }

      const logo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.42),
        new THREE.MeshBasicMaterial({
          map: makeLogoTexture(brand.name, brand.color),
          transparent: true,
          depthWrite: false,
        })
      );
      logo.position.set(0, 1.35, 0.02);
      group.add(logo);

      const lane = (i % 3) - 1;
      group.position.set(0.8 + lane * 2.1, 4 + i * 1.35, -1.2 - (i % 3) * 0.8);
      group.userData = {
        vy: 0,
        spin: 0.8 + Math.random() * 1.2,
        bounce: 0,
        grounded: false,
        baseX: group.position.x,
        phase: i * 1.1,
        roll: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random()),
      };
      scene.add(group);
      tireCards.push(group);
    }

    // soft rain
    const rainCount = 700;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    const rainSpeed = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i += 1) {
      rainPos[i * 3] = (Math.random() - 0.5) * 18;
      rainPos[i * 3 + 1] = Math.random() * 10;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      rainSpeed[i] = 6 + Math.random() * 7;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({
        color: 0xb8d4ff,
        size: 0.03,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    scene.add(rain);

    const clock = new THREE.Clock();
    let last = performance.now();
    const groundY = -0.05;

    function frame(now) {
      const t = clock.getElapsedTime();
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      // scrolling road
      if (roadMat.map) {
        roadMat.map.offset.y = (t * 0.35) % 1;
      }
      center.position.z = -2 + Math.sin(t * 2) * 0.02;

      tireCards.forEach((card, idx) => {
        const u = card.userData;
        if (!u.grounded) {
          u.vy -= 9.5 * dt;
          card.position.y += u.vy * dt;
          card.rotation.z += u.spin * dt;
          card.rotation.y += 0.4 * dt;
          if (card.position.y <= groundY) {
            card.position.y = groundY;
            if (Math.abs(u.vy) > 2.2 && u.bounce < 2) {
              u.vy = -u.vy * 0.35;
              u.bounce += 1;
            } else {
              u.vy = 0;
              u.grounded = true;
              card.rotation.z = 0;
              card.rotation.x = -0.08;
            }
          }
        } else {
          // roll along moving road
          card.position.z += u.roll * dt * 0.55;
          card.rotation.x -= u.roll * dt * 0.9;
          card.position.x = u.baseX + Math.sin(t * 0.7 + u.phase) * 0.08;
          if (card.position.z > 4.5) {
            // respawn fall
            card.position.z = -4.8 - Math.random() * 1.5;
            card.position.y = 5 + Math.random() * 2;
            u.vy = -0.2;
            u.grounded = false;
            u.bounce = 0;
            card.rotation.set(0, Math.random() * 0.6, Math.random());
          }
        }

        // keep logos facing camera-ish
        const logo = card.children[1];
        if (logo) logo.lookAt(camera.position);
      });

      const rp = rain.geometry.attributes.position.array;
      for (let i = 0; i < rainCount; i += 1) {
        rp[i * 3 + 1] -= rainSpeed[i] * dt;
        rp[i * 3] -= dt * 0.8;
        if (rp[i * 3 + 1] < -1.2) {
          rp[i * 3 + 1] = 8 + Math.random() * 3;
          rp[i * 3] = (Math.random() - 0.5) * 18;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;

      camera.position.x = mouse.x * 0.45;
      camera.position.y = 2.6 + mouse.y * -0.25;
      camera.lookAt(0.7, 0.3, -0.5);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();
}
