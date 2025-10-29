<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import * as THREE from "three";
import {resizeRendererToDisplaySize} from "./utils";

const {ipcRenderer} = window.require?.("electron") ?? {};
const container = ref<HTMLElement | null>(null);
let scene, camera, renderer;
let solarSystem, marsOrbit, earthOrbit, moonOrbit;

const setupExitHandlers = () => {
  let active = false;
  const handleExit = () => {
    if (!active) return;
    ipcRenderer?.send?.("close-screensaver");
  };

  setTimeout(() => (active = true), 1000);

  window.addEventListener("keydown", handleExit);
  window.addEventListener("click", handleExit);
  window.addEventListener("mousemove", handleExit);
  window.addEventListener("touchstart", handleExit);

  return () => {
    window.removeEventListener("keydown", handleExit);
    window.removeEventListener("click", handleExit);
    window.removeEventListener("mousemove", handleExit);
    window.removeEventListener("touchstart", handleExit);
  };
};

const createStarfield = () => {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 10000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 2000;
    positions[i + 1] = (Math.random() - 0.5) * 2000;
    positions[i + 2] = (Math.random() - 0.5) * 2000;
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({color: 0xffffff, size: 1, sizeAttenuation: true});
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
};

const render = () => {
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  solarSystem.rotation.y += 0.002;
  earthOrbit.rotation.y += 0.009;
  marsOrbit.rotation.y += 0.01;
  moonOrbit.rotation.y += 0.05;

  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

onMounted(() => {
  const cleanupExitHandlers = setupExitHandlers();

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  container.value!.appendChild(renderer.domElement);

  const fov = 40, aspect = 2, near = 0.1, far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 30, 50);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#000011");

  createStarfield();

  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const loader = new THREE.TextureLoader();

  const sunMaterial = new THREE.MeshBasicMaterial({
    map: loader.load("./sun.jpg"),
  });
  const earthMaterial = new THREE.MeshBasicMaterial({
    map: loader.load("./earth.jpg"),
  });
  const moonMaterial = new THREE.MeshBasicMaterial({
    map: loader.load("./moon.jpg"),
  });
  const marsMaterial = new THREE.MeshBasicMaterial({
    map: loader.load("./mars.jpg"),
  });

  const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
  solarSystem = new THREE.Object3D();
  scene.add(solarSystem);

  const sunMesh = new THREE.Mesh(sphereGeometry, sunMaterial);
  sunMesh.scale.set(4, 4, 4);
  solarSystem.add(sunMesh);

  const marsMesh = new THREE.Mesh(sphereGeometry, marsMaterial);
  marsOrbit = new THREE.Object3D();
  marsMesh.position.x = 20;
  marsMesh.scale.set(1.5, 1.5, 1.5);
  marsOrbit.add(marsMesh);
  scene.add(marsOrbit);

  earthOrbit = new THREE.Object3D();
  scene.add(earthOrbit);

  const earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
  earthMesh.position.x = 12;
  earthMesh.scale.set(1.2, 1.2, 1.2);
  earthOrbit.add(earthMesh);

  moonOrbit = new THREE.Object3D();
  earthMesh.add(moonOrbit);
  const moonMesh = new THREE.Mesh(sphereGeometry, moonMaterial);
  moonMesh.position.x = 3;
  moonMesh.scale.set(0.4, 0.4, 0.4);
  moonOrbit.add(moonMesh);

  requestAnimationFrame(render);

  onUnmounted(cleanupExitHandlers);
});
</script>

<template>
  <div ref="container" class="viewer"></div>
</template>

<style scoped>
.viewer {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  cursor: none;
  overflow: hidden;
  background: black;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
