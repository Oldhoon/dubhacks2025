import * as THREE from "three";

function createOrbTexture(diameter = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const radius = diameter / 2;
  const gradient = ctx.createRadialGradient(radius * 0.75, radius * 0.75, radius * 0.1, radius, radius, radius);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.4, "rgba(120,200,255,0.9)");
  gradient.addColorStop(1, "rgba(0,60,130,0.8)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export function createOrbGame(canvas, { onAdd } = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("createOrbGame requires a <canvas> element.");
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio ?? 1);
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();

  const orbTextureCanvas = createOrbTexture();
  const orbTexture = orbTextureCanvas ? new THREE.CanvasTexture(orbTextureCanvas) : null;
  const orbMaterial = new THREE.SpriteMaterial({
    map: orbTexture ?? undefined,
    color: orbTexture ? 0xffffff : 0x58b3ff,
  });
  const orb = new THREE.Sprite(orbMaterial);
  orb.scale.set(80, 80, 1);
  orb.position.set(0, 0, 0);
  scene.add(orb);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 10;

  const pressed = new Set();
  const speed = 220; // pixels per second
  const directionNames = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  function handleKeyDown(event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      if (event.repeat) {
        return;
      }
      event.preventDefault();
      pressed.add(event.key);
      if (typeof onAdd === "function") {
        const direction = directionNames[event.key];
        onAdd(`    // Player nudged the orb ${direction}`);
      }
    }
  }

  function handleKeyUp(event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      pressed.delete(event.key);
    }
  }

  let frameId = 0;
  let lastTime = performance.now();
  const state = {
    width: 1,
    height: 1,
  };

  function clampOrb() {
    const halfW = Math.max(0, state.width / 2 - orb.scale.x / 2);
    const halfH = Math.max(0, state.height / 2 - orb.scale.y / 2);
    orb.position.x = THREE.MathUtils.clamp(orb.position.x, -halfW, halfW);
    orb.position.y = THREE.MathUtils.clamp(orb.position.y, -halfH, halfH);
  }

  function resizeRendererToDisplaySize() {
    const pixelRatio = renderer.getPixelRatio();
    const width = Math.floor(canvas.clientWidth);
    const height = Math.floor(canvas.clientHeight);
    if (width === 0 || height === 0) {
      return false;
    }

    const needResize =
      canvas.width !== Math.floor(width * pixelRatio) ||
      canvas.height !== Math.floor(height * pixelRatio);

    if (needResize) {
      renderer.setSize(width, height, false);

      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
    }

    if (needResize || state.width !== width || state.height !== height) {
      state.width = width;
      state.height = height;
      clampOrb();
    }

    return needResize;
  }

  function step(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    resizeRendererToDisplaySize();

    let moveX = 0;
    let moveY = 0;
    if (pressed.has("ArrowLeft")) moveX -= 1;
    if (pressed.has("ArrowRight")) moveX += 1;
    if (pressed.has("ArrowUp")) moveY += 1;
    if (pressed.has("ArrowDown")) moveY -= 1;

    if (moveX !== 0 || moveY !== 0) {
      const invLen = 1 / Math.hypot(moveX, moveY);
      moveX *= invLen;
      moveY *= invLen;
      orb.position.x += moveX * speed * delta;
      orb.position.y += moveY * speed * delta;
      clampOrb();
    }

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(step);
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  resizeRendererToDisplaySize();
  frameId = requestAnimationFrame(step);

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    orbTexture?.dispose();
    orbMaterial.dispose();
    renderer.dispose();
  };
}
