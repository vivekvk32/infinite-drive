import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const root = document.querySelector("#game-root");
const scoreEl = document.querySelector("#score");
const distanceEl = document.querySelector("#distance");
const speedEl = document.querySelector("#speed");
const topScoreEl = document.querySelector("#top-score");
const topDistanceEl = document.querySelector("#top-distance");
const pauseButton = document.querySelector("#pause-button");
const leaderboardListEl = document.querySelector("#leaderboard-list");
const leaderboardEmptyEl = document.querySelector("#leaderboard-empty");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const saveForm = document.querySelector("#save-form");
const driverNameInput = document.querySelector("#driver-name");
const saveButton = document.querySelector("#save-button");
const saveStatusEl = document.querySelector("#save-status");
const actionButton = document.querySelector("#action-button");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1018, 48, 150);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.1,
  240,
);

const clock = new THREE.Clock();
const roadSegments = [];
const roadsideProps = [];
const obstacles = [];
const pickups = [];
const keys = { left: false, right: false };

const state = {
  running: false,
  paused: false,
  crashed: false,
  submitting: false,
  runSaved: false,
  baseSpeed: 24,
  speed: 0,
  maxSpeed: 62,
  acceleration: 1.6,
  score: 0,
  distance: 0,
  topScore: 0,
  topDistance: 0,
  spawnTimer: 0,
  pickupTimer: 0,
  propTimer: 0,
};

const track = {
  width: 11,
  laneX: [-3.2, 0, 3.2],
  segmentLength: 18,
  segmentCount: 12,
  visibleStart: -20,
};

driverNameInput.value = localStorage.getItem("arc-drive-driver-name") || "";

const car = buildCar();
car.position.set(0, 0.55, 7.5);
scene.add(car);

setupScene();
resetRun();
loadLeaderboard();
animate();

function setupScene() {
  scene.background = new THREE.Color(0x081018);

  const hemi = new THREE.HemisphereLight(0xffddb5, 0x102336, 1.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d3, 2.1);
  sun.position.set(14, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x4db8ff, 1.1);
  rim.position.set(-10, 8, -20);
  scene.add(rim);

  buildEnvironment();
  addSkyline();

  camera.position.set(0, 6.6, 15.5);
  camera.lookAt(0, 1.8, -6);
}

function buildEnvironment() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({
      color: 0x20331e,
      roughness: 1,
      metalness: 0,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  for (let i = 0; i < track.segmentCount; i += 1) {
    const segmentZ = track.visibleStart - i * track.segmentLength;
    const segment = createRoadSegment(segmentZ);
    roadSegments.push(segment);
    scene.add(segment.group);
  }
}

function createRoadSegment(z) {
  const group = new THREE.Group();
  group.position.z = z;

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(track.width, 0.18, track.segmentLength),
    new THREE.MeshStandardMaterial({
      color: 0x242a30,
      roughness: 0.96,
      metalness: 0.03,
    }),
  );
  road.position.y = 0.04;
  road.receiveShadow = true;
  group.add(road);

  const shoulderMaterial = new THREE.MeshStandardMaterial({
    color: 0x72512d,
    roughness: 0.98,
  });

  [-1, 1].forEach((direction) => {
    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.08, track.segmentLength),
      shoulderMaterial,
    );
    shoulder.position.set(direction * (track.width / 2 + 0.85), 0.02, 0);
    group.add(shoulder);
  });

  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff4cf,
    emissive: 0xffd48a,
    emissiveIntensity: 0.22,
    roughness: 0.55,
  });

  for (let i = 0; i < 4; i += 1) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.03, 2.2),
      markerMaterial,
    );
    marker.position.set(0, 0.15, -6.2 + i * 4.4);
    group.add(marker);
  }

  return { group };
}

function addSkyline() {
  const skyline = new THREE.Group();
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < 34; i += 1) {
    const height = 4 + Math.random() * 18;
    const tower = new THREE.Mesh(
      towerGeo,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.58 + Math.random() * 0.06, 0.2, 0.16),
        emissive: 0x11161d,
        roughness: 0.9,
      }),
    );
    const side = i % 2 === 0 ? -1 : 1;
    const spread = 12 + Math.random() * 30;
    tower.scale.set(2 + Math.random() * 4, height, 2 + Math.random() * 4);
    tower.position.set(side * spread, height / 2 - 0.1, -18 - Math.random() * 110);
    skyline.add(tower);
  }

  scene.add(skyline);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(7, 36, 36),
    new THREE.MeshBasicMaterial({
      color: 0xff8848,
      transparent: true,
      opacity: 0.18,
    }),
  );
  sun.position.set(0, 22, -95);
  scene.add(sun);
}

function buildCar() {
  const group = new THREE.Group();

  const paint = new THREE.MeshStandardMaterial({
    color: 0xff6c2f,
    metalness: 0.24,
    roughness: 0.38,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x161b22,
    metalness: 0.15,
    roughness: 0.75,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7bd8ff,
    emissive: 0x12394e,
    emissiveIntensity: 0.38,
    transparent: true,
    opacity: 0.78,
    roughness: 0.1,
    metalness: 0.3,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 4.2), paint);
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.9), glass);
  cabin.position.set(0, 1.55, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.42, 1.3), paint);
  hood.position.set(0, 1.08, 1.36);
  hood.castShadow = true;
  group.add(hood);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.35, 0.36), dark);
  bumper.position.set(0, 0.7, 2.18);
  bumper.castShadow = true;
  group.add(bumper);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.34), dark);
  spoiler.position.set(0, 1.3, -2.08);
  spoiler.castShadow = true;
  group.add(spoiler);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.46, 20);
  for (const x of [-1.18, 1.18]) {
    for (const z of [-1.35, 1.48]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.52, z);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff1b2 });
  for (const x of [-0.72, 0.72]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headlightMat);
    light.position.set(x, 0.98, 2.08);
    group.add(light);
  }

  return group;
}

function spawnObstacle() {
  const type = Math.random();
  let mesh;
  let hitbox;

  if (type < 0.4) {
    mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 1.3, 10),
      new THREE.MeshStandardMaterial({
        color: 0xff7b2f,
        emissive: 0x5d2100,
        emissiveIntensity: 0.22,
        roughness: 0.55,
      }),
    );
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.06, 10, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.1;
    mesh.add(band);
    hitbox = new THREE.Vector3(0.55, 0.75, 0.55);
  } else if (type < 0.75) {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.2, 0.9),
      new THREE.MeshStandardMaterial({
        color: 0xe3dfd0,
        roughness: 0.94,
      }),
    );
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.14, 0.2, 0.24),
      new THREE.MeshBasicMaterial({ color: 0xff7b2f }),
    );
    stripe.position.y = 0.16;
    mesh.add(stripe);
    hitbox = new THREE.Vector3(1.15, 0.7, 0.55);
  } else {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshStandardMaterial({
        color: 0x806244,
        roughness: 0.88,
      }),
    );
    hitbox = new THREE.Vector3(0.8, 0.8, 0.8);
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(randomLane(), hitbox.y, -130);
  scene.add(mesh);
  obstacles.push({ mesh, hitbox });
}

function spawnRoadsideProp() {
  const side = Math.random() > 0.5 ? 1 : -1;
  const cluster = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 1.3, 8),
    new THREE.MeshStandardMaterial({
      color: 0x5f4123,
      roughness: 0.95,
    }),
  );
  trunk.position.y = 0.65;
  cluster.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0x548543,
      roughness: 1,
    }),
  );
  canopy.position.y = 1.65;
  canopy.scale.y = 1.2;
  cluster.add(canopy);

  cluster.position.set(side * (8 + Math.random() * 12), 0, -140);
  scene.add(cluster);
  roadsideProps.push(cluster);
}

function spawnPickup() {
  const isDiamond = Math.random() > 0.72;
  const mesh = new THREE.Group();
  let hitbox;
  let value;

  if (isDiamond) {
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color: 0x77f6ff,
        emissive: 0x125a67,
        emissiveIntensity: 0.8,
        metalness: 0.45,
        roughness: 0.18,
      }),
    );
    diamond.castShadow = true;
    mesh.add(diamond);
    hitbox = new THREE.Vector3(0.65, 0.65, 0.65);
    value = 25;
  } else {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 0.16, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd54a,
        emissive: 0x7c5200,
        emissiveIntensity: 0.55,
        metalness: 0.7,
        roughness: 0.2,
      }),
    );
    coin.rotation.z = Math.PI / 2;
    coin.castShadow = true;
    mesh.add(coin);
    hitbox = new THREE.Vector3(0.7, 0.7, 0.35);
    value = 10;
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.06, 12, 28),
    new THREE.MeshBasicMaterial({
      color: isDiamond ? 0x93fbff : 0xfff0a0,
      transparent: true,
      opacity: 0.7,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  mesh.add(ring);

  const baseY = 1.65 + Math.random() * 0.35;
  mesh.position.set(randomLane(), baseY, -130);
  scene.add(mesh);
  pickups.push({
    mesh,
    hitbox,
    value,
    baseY,
    phase: Math.random() * Math.PI * 2,
  });
}

function resetRun() {
  state.running = false;
  state.paused = false;
  state.crashed = false;
  state.submitting = false;
  state.runSaved = false;
  state.speed = 0;
  state.score = 0;
  state.distance = 0;
  state.spawnTimer = 0;
  state.pickupTimer = 0;
  state.propTimer = 0;
  car.position.x = 0;
  car.position.y = 0.55;
  car.rotation.set(0, 0, 0);
  keys.left = false;
  keys.right = false;

  obstacles.splice(0).forEach(({ mesh }) => scene.remove(mesh));
  pickups.splice(0).forEach(({ mesh }) => scene.remove(mesh));
  roadsideProps.splice(0).forEach((prop) => scene.remove(prop));

  setSaveStatus("");
  saveButton.disabled = false;
  saveForm.classList.add("hidden");
  overlayTitle.textContent = "Press Start";
  overlayCopy.textContent = "Build distance, grab pickups, and survive the traffic ahead.";
  actionButton.textContent = "Start Run";
  overlay.classList.remove("hidden");
  updatePauseButton();
  updateHud();
}

function startRun() {
  if (state.running) {
    return;
  }

  const wasPaused = state.paused;
  state.running = true;
  state.paused = false;
  state.crashed = false;

  if (!wasPaused) {
    state.speed = state.baseSpeed;
  }

  updatePauseButton();
  overlay.classList.add("hidden");
}

function pauseRun() {
  if (!state.running || state.crashed) {
    return;
  }

  state.running = false;
  state.paused = true;
  overlayTitle.textContent = "Paused";
  overlayCopy.textContent = "The road is frozen. Resume when you are ready to drive again.";
  actionButton.textContent = "Resume Run";
  saveForm.classList.add("hidden");
  setSaveStatus("");
  overlay.classList.remove("hidden");
  updatePauseButton();
}

function endRun() {
  state.running = false;
  state.paused = false;
  state.crashed = true;
  state.runSaved = false;
  state.submitting = false;
  saveButton.disabled = false;
  overlayTitle.textContent = "Crash";
  overlayCopy.textContent = `You scored ${state.score} points and drove ${Math.floor(state.distance)} meters. Save the run to the leaderboard.`;
  actionButton.textContent = "Restart Run";
  saveForm.classList.remove("hidden");
  setSaveStatus("");
  overlay.classList.remove("hidden");
  updatePauseButton();
  window.setTimeout(() => driverNameInput.focus(), 0);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta() || 0.016, 0.033);

  if (state.running) {
    updateGame(delta);
  }

  updateCamera(delta);
  renderer.render(scene, camera);
}

function updateGame(delta) {
  state.speed = Math.min(state.maxSpeed, state.speed + state.acceleration * delta);
  state.distance += state.speed * delta;
  state.spawnTimer += delta;
  state.pickupTimer += delta;
  state.propTimer += delta;

  const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const lateralSpeed = 7.8 + state.speed * 0.055;
  car.position.x += steer * lateralSpeed * delta;
  car.position.x = THREE.MathUtils.clamp(car.position.x, -4.1, 4.1);

  car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, -steer * 0.2, 6 * delta);
  car.rotation.y = THREE.MathUtils.lerp(car.rotation.y, -steer * 0.1, 5 * delta);
  car.position.y = 0.55 + Math.sin(state.distance * 0.16) * 0.03;

  const moveBy = state.speed * delta;
  recycleRoad(moveBy);
  if (updateObstacles(moveBy)) {
    updateHud();
    return;
  }
  updatePickups(moveBy, delta);
  updateRoadsideProps(moveBy);

  if (state.spawnTimer >= Math.max(0.48, 1.26 - state.speed * 0.011)) {
    spawnObstacle();
    state.spawnTimer = 0;
  }

  if (state.pickupTimer >= 0.7) {
    spawnPickup();
    state.pickupTimer = 0;
  }

  if (state.propTimer >= 0.5) {
    spawnRoadsideProp();
    state.propTimer = 0;
  }

  updateHud();
}

function recycleRoad(moveBy) {
  for (const segment of roadSegments) {
    segment.group.position.z += moveBy;
    if (segment.group.position.z > track.segmentLength) {
      segment.group.position.z -= track.segmentLength * track.segmentCount;
    }
  }
}

function updateObstacles(moveBy) {
  const carBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(car.position.x, 1.05, car.position.z),
    new THREE.Vector3(2.15, 1.2, 4.05),
  );

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.mesh.position.z += moveBy;
    obstacle.mesh.rotation.y += deltaSpin(obstacle.mesh.position.x, moveBy);

    const obstacleBox = new THREE.Box3().setFromCenterAndSize(
      obstacle.mesh.position,
      obstacle.hitbox.clone().multiplyScalar(2),
    );

    if (carBox.intersectsBox(obstacleBox)) {
      endRun();
      return true;
    }

    if (obstacle.mesh.position.z > 22) {
      scene.remove(obstacle.mesh);
      obstacles.splice(i, 1);
    }
  }

  return false;
}

function updatePickups(moveBy, delta) {
  const carBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(car.position.x, 1.15, car.position.z),
    new THREE.Vector3(2.2, 1.5, 4.2),
  );

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    pickup.mesh.position.z += moveBy;
    pickup.phase += delta * 5.4;
    pickup.mesh.position.y = pickup.baseY + Math.sin(pickup.phase) * 0.25;
    pickup.mesh.rotation.y += delta * 3.2;
    pickup.mesh.rotation.z = Math.sin(pickup.phase * 0.6) * 0.18;

    const pickupBox = new THREE.Box3().setFromCenterAndSize(
      pickup.mesh.position,
      pickup.hitbox.clone().multiplyScalar(2),
    );

    if (carBox.intersectsBox(pickupBox)) {
      state.score += pickup.value;
      scene.remove(pickup.mesh);
      pickups.splice(i, 1);
      continue;
    }

    if (pickup.mesh.position.z > 22) {
      scene.remove(pickup.mesh);
      pickups.splice(i, 1);
    }
  }
}

function deltaSpin(seed, moveBy) {
  return moveBy * 0.018 * (seed > 0 ? 1 : -1);
}

function updateRoadsideProps(moveBy) {
  for (let i = roadsideProps.length - 1; i >= 0; i -= 1) {
    const prop = roadsideProps[i];
    prop.position.z += moveBy;
    if (prop.position.z > 24) {
      scene.remove(prop);
      roadsideProps.splice(i, 1);
    }
  }
}

function updateCamera(delta) {
  const targetX = car.position.x * 0.32;
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 3.2 * delta);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.5, 1.8 * delta);
  camera.lookAt(car.position.x * 0.25, 1.4, car.position.z - 11);
}

function updateHud() {
  scoreEl.textContent = `${state.score}`;
  distanceEl.textContent = `${Math.floor(state.distance)} m`;
  speedEl.textContent = `${Math.round(state.speed * 5.4)} km/h`;
  topScoreEl.textContent = `${state.topScore} pts`;
  topDistanceEl.textContent = `${state.topDistance} m`;
}

function updatePauseButton() {
  pauseButton.disabled = !state.running && !state.paused;
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
}

function setSaveStatus(message, isError = false) {
  saveStatusEl.textContent = message;
  saveStatusEl.style.color = isError ? "#ffb3b3" : "";
}

function applyLeaderboard(payload) {
  state.topScore = payload.topScore ? payload.topScore.score : 0;
  state.topDistance = payload.longestRun ? payload.longestRun.distance : 0;
  updateHud();

  leaderboardListEl.textContent = "";
  const entries = payload.entries || [];
  leaderboardEmptyEl.classList.toggle("hidden", entries.length > 0);

  for (const [index, entry] of entries.entries()) {
    const item = document.createElement("li");
    item.className = "leaderboard-item";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `#${index + 1}`;

    const summary = document.createElement("div");
    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.driverName;

    const meta = document.createElement("p");
    meta.className = "leaderboard-meta";
    meta.textContent = `${entry.distance} m driven`;
    summary.append(name, meta);

    const points = document.createElement("span");
    points.className = "leaderboard-points";
    points.textContent = `${entry.score} pts`;

    item.append(rank, summary, points);
    leaderboardListEl.append(item);
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard");
    if (!response.ok) {
      throw new Error("Failed to load leaderboard");
    }
    applyLeaderboard(await response.json());
  } catch (error) {
    leaderboardEmptyEl.textContent = "Leaderboard unavailable right now.";
    leaderboardEmptyEl.classList.remove("hidden");
  }
}

async function saveRun(event) {
  event.preventDefault();

  if (!state.crashed || state.runSaved || state.submitting) {
    return;
  }

  const driverName = driverNameInput.value.trim().slice(0, 24);
  if (!driverName) {
    setSaveStatus("Enter a driver name before saving.", true);
    return;
  }

  localStorage.setItem("arc-drive-driver-name", driverName);
  state.submitting = true;
  saveButton.disabled = true;
  setSaveStatus("Saving run...");

  try {
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverName,
        score: Math.floor(state.score),
        distance: Math.floor(state.distance),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not save run.");
    }

    state.runSaved = true;
    applyLeaderboard(payload.leaderboard);
    setSaveStatus("Saved to the leaderboard.");
  } catch (error) {
    setSaveStatus(error.message, true);
  } finally {
    state.submitting = false;
    saveButton.disabled = state.runSaved;
  }
}

function togglePause() {
  if (state.running) {
    pauseRun();
    return;
  }

  if (state.paused) {
    startRun();
  }
}

function randomLane() {
  return track.laneX[Math.floor(Math.random() * track.laneX.length)];
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", handleResize);

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.repeat) {
    return;
  }

  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    keys.left = true;
  }

  if (event.code === "ArrowRight" || event.code === "KeyD") {
    keys.right = true;
  }

  if (event.code === "KeyP" || event.code === "Escape") {
    togglePause();
  }

  if (event.code === "Space") {
    if (state.paused) {
      startRun();
      return;
    }

    if (!state.running) {
      if (state.crashed) {
        resetRun();
      }
      startRun();
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    keys.left = false;
  }

  if (event.code === "ArrowRight" || event.code === "KeyD") {
    keys.right = false;
  }
});

pauseButton.addEventListener("click", togglePause);
saveForm.addEventListener("submit", saveRun);

actionButton.addEventListener("click", () => {
  if (state.paused) {
    startRun();
    return;
  }

  if (state.crashed) {
    resetRun();
  }

  startRun();
});
