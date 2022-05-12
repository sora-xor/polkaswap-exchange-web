/* eslint-disable */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let container;
let camera;
let renderer;
let scene;
let bottle;

export default function init() {
  container = document.querySelector("#bottle");

  //Create scene
  scene = new THREE.Scene();

  const fov = 35;
  const aspect = container.clientWidth / container.clientHeight;
  const near = 0.1;
  const far = 1000;

  //Camera setup
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(1, 10, 180);

  const ambient = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 0, 0);
  scene.add(light);

  //Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  container.appendChild(renderer.domElement);

  //Load Model
  let loader = new GLTFLoader();
  loader.load("./models/bottle3/bottle.gltf", function(gltf) {
    scene.add(gltf.scene);
    bottle = gltf.scene.children[0];
    animate();

    window.addEventListener("resize", onWindowResize);
  });
}

function animate() {
  requestAnimationFrame(animate);
  bottle.rotation.y += 0.005;
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(container.clientWidth, container.clientHeight);
}
