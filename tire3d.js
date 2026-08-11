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
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060910, 0.038);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0.1, 1.1, 6.4);

  scene.add(new THREE.AmbientLight(0x8a97b0, 0.4));
  scene.add(new THREE.HemisphereLight(0xc8d6ff, 0x1a140c, 0.9));

  const key = new THREE.DirectionalLight(0xffd089, 2.4);
  key.position.set(4.5, 5, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x7eb6ff, 1.1);
  fill.position.set(-5, 2.5, -2);
  scene.add(fill);

  const rimLight = new THREE.PointLight(0xffb020, 3.2, 14, 2);
  rimLight.position.set(2.2, 0.8, 2.4);
  scene.add(rimLight);

  const asphalt = new THREE.Mesh(
    new THREE.CircleGeometry(16, 72),
    new THREE.MeshStandardMaterial({
      color: 0x0a0d13,
      roughness: 0.16,
      metalness: 0.82,
    })
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = -1.2;
  scene.add(asphalt);

  function makePetlasSidewallTexture() {
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#12151c";
    ctx.fillRect(0, 0, c.width, c.height);

    // subtle groove rings
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let y = 40; y < 480; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.width, y);
      ctx.stroke();
    }

    const slots = 5;
    for (let i = 0; i < slots; i += 1) {
      const x = (i + 0.5) * (c.width / slots);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 128px Arial Black, Impact, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PETLAS", x, 200);

      ctx.fillStyle = "#ffb020";
      ctx.font = "bold 48px Arial, sans-serif";
      ctx.fillText("PETLAS", x, 290);

      ctx.fillStyle = "rgba(230,235,240,0.8)";
      ctx.font = "34px Arial, sans-serif";
      ctx.fillText("205/55R16 91V · TUBELESS", x, 360);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  function makeTreadTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0d1016";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#05070b";
    for (let x = 0; x < 512; x += 28) {
      ctx.fillRect(x, 0, 14, 512);
    }
    for (let y = 0; y < 512; y += 40) {
      ctx.fillRect(0, y, 512, 8);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const petlasTex = makePetlasSidewallTexture();
  const treadTex = makeTreadTexture();
  const tires = [];

  function makeCarTire(scale = 1) {
    const root = new THREE.Group();
    const g = new THREE.Group();
    root.add(g);
    root.userData.spinner = g;

    const rubber = new THREE.MeshStandardMaterial({
      map: treadTex,
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.28,
    });
    const sidewallMat = new THREE.MeshStandardMaterial({
      map: petlasTex,
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.22,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd5dae3,
      roughness: 0.2,
      metalness: 0.96,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0xffb020,
      roughness: 0.35,
      metalness: 0.55,
      emissive: 0xff8a00,
      emissiveIntensity: 0.22,
    });
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0x22262f,
      roughness: 0.45,
      metalness: 0.4,
    });

    // main carcass / tread
    const tread = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.38, 36, 96), rubber);
    tread.rotation.x = Math.PI / 2;
    g.add(tread);

    // outer shoulder rings
    const shoulder = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.1, 16, 80),
      new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.5, metalness: 0.25 })
    );
    shoulder.rotation.x = Math.PI / 2;
    g.add(shoulder);

    // Petlas sidewalls (both sides)
    const sideGeo = new THREE.CylinderGeometry(1.02, 1.02, 0.16, 64, 1, true);
    const sideL = new THREE.Mesh(sideGeo, sidewallMat);
    sideL.position.y = 0.22;
    g.add(sideL);
    const sideR = new THREE.Mesh(sideGeo, sidewallMat.clone());
    sideR.material.map = petlasTex;
    sideR.position.y = -0.22;
    sideR.rotation.y = Math.PI;
    g.add(sideR);

    // rim dish
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.2, 48), rimMat);
    g.add(disc);

    // rim lip
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.045, 12, 56), lipMat);
    lip.rotation.x = Math.PI / 2;
    g.add(lip);

    // 5-spoke alloy
    for (let i = 0; i < 5; i += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.18), rimMat);
      spoke.rotation.y = (i / 5) * Math.PI * 2;
      g.add(spoke);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 28), hubMat);
    g.add(hub);

    // center cap text ring suggestion
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.6 })
    );
    g.add(cap);

    // block tread for depth
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x080a10,
      roughness: 0.55,
      metalness: 0.15,
    });
    for (let i = 0; i < 36; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.24), blockMat);
      const a = (i / 36) * Math.PI * 2;
      block.position.set(Math.cos(a) * 1.34, Math.sin(a * 2) * 0.01, Math.sin(a) * 1.34);
      block.lookAt(0, 0, 0);
      g.add(block);
    }

    g.scale.setScalar(scale);
    // stand like a car tire
    g.rotation.z = Math.PI / 2;
    return root;
  }

  // hero Petlas tire
  const main = makeCarTire(1.55);
  main.position.set(1.85, -0.05, 0.35);
  main.rotation.y = -0.35;
  main.rotation.x = 0.08;
  scene.add(main);
  tires.push({ mesh: main, spin: 0.55 });

  const left = makeCarTire(0.85);
  left.position.set(-1.85, 0.35, -1.4);
  left.rotation.y = 0.55;
  left.rotation.x = -0.15;
  scene.add(left);
  tires.push({ mesh: left, spin: -0.4 });

  const back = makeCarTire(0.5);
  back.position.set(0.15, 1.15, -3.1);
  back.rotation.y = -0.8;
  scene.add(back);
  tires.push({ mesh: back, spin: 0.7 });

  // floating Petlas brand plate
  function makeBrandPlate(text) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = "rgba(8,10,14,0.75)";
    ctx.fillRect(40, 40, 944, 176);
    ctx.strokeStyle = "#ffb020";
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, 944, 176);
    ctx.fillStyle = "#ffb020";
    ctx.font = "bold 110px Arial Black, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), mat);
  }
  const petlasPlate = makeBrandPlate("PETLAS");
  petlasPlate.position.set(-0.2, 2.05, -0.6);
  scene.add(petlasPlate);

  // soft rain
  const rainCount = 900;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  const rainSpeed = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i += 1) {
    rainPos[i * 3] = (Math.random() - 0.5) * 20;
    rainPos[i * 3 + 1] = Math.random() * 11;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    rainSpeed[i] = 5.5 + Math.random() * 6;
  }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({
      color: 0xb9d3ff,
      size: 0.03,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  scene.add(rain);

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
  let last = performance.now();

  function frame(now) {
    const t = clock.getElapsedTime();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // smooth roll on tire axle
    tires.forEach((item, idx) => {
      const spinner = item.mesh.userData.spinner;
      if (spinner) spinner.rotation.x += item.spin * dt;
      item.mesh.rotation.y += Math.sin(t * 0.2 + idx) * 0.0008;
    });

    const pos = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i += 1) {
      pos[i * 3 + 1] -= rainSpeed[i] * dt;
      pos[i * 3] -= dt * 0.9;
      if (pos[i * 3 + 1] < -1.2) {
        pos[i * 3 + 1] = 8 + Math.random() * 3;
        pos[i * 3] = (Math.random() - 0.5) * 20;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;

    rimLight.intensity = 2.8 + Math.sin(t * 2) * 0.35;
    petlasPlate.position.y = 2.05 + Math.sin(t * 1.1) * 0.06;
    petlasPlate.lookAt(camera.position);

    camera.position.x = 0.1 + mouse.x * 0.35;
    camera.position.y = 1.1 + mouse.y * -0.18;
    camera.lookAt(0.7, 0.05, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
