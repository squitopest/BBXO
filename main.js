import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. Setup Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color('#fff0f5'); // Pastel light pink background
scene.fog = new THREE.FogExp2('#fff0f5', 0.03);

const camera = new THREE.PerspectiveCamera(
  60, 
  window.innerWidth / window.innerHeight, 
  0.1, 
  1000
);
// Move camera a bit closer and higher
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Controls - Disabled zoom/pan to keep the scrollytelling fixed
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false;
controls.enablePan = false;

// 2. Load the 3D Rose Model
const roseContainer = new THREE.Group();
scene.add(roseContainer);

const loader = new GLTFLoader();

// Create the "Pretty in Pink" material for the override
const prettyPinkMaterial = new THREE.MeshStandardMaterial({
  color: 0xffb3c6,
  roughness: 0.6,
  metalness: 0.1,
  side: THREE.DoubleSide
});

loader.load(
  '/rose_scan.glb',
  (gltf) => {
    const model = gltf.scene;

    // Calculate bounding box to find the true center of the scan
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Create a Pivot Group. This allows us to rotate the rose perfectly around its center
    const pivotGroup = new THREE.Group();

    // Shift the raw model inside the pivot group so its true center is at (0,0,0)
    model.position.set(-center.x, -center.y, -center.z);
    pivotGroup.add(model);

    // Scale the pivot group to our zoomed out size
    const maxDim = Math.max(size.x, size.y, size.z);
    const desiredSize = 1.8; // Zoomed in more
    const scale = desiredSize / maxDim;
    pivotGroup.scale.set(scale, scale, scale);
    
    // Tilt the pivot group to show the bloom face (flipped)
    pivotGroup.rotation.x = Math.PI / 2.2; 
    pivotGroup.rotation.y = Math.PI; // Flip 180° to show the front

    // Traverse and update materials
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // We removed the material override to keep the original scan colors!
      }
    });

    roseContainer.add(pivotGroup);
    
    // Add a gentle floating animation to the container
    roseContainer.userData.floatOffset = Math.random() * Math.PI * 2;
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error('An error happened loading the GLTF', error);
  }
);

// 3. Soft Pastel Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// Fill light to soften shadows and add a pinkish hue
const fillLight = new THREE.DirectionalLight(0xffb3c6, 1.0);
fillLight.position.set(-5, 2, -5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
rimLight.position.set(0, 5, -10);
scene.add(rimLight);

// 4. Animation Loop
const clock = new THREE.Clock();

let currentScrollY = 0;
let targetScrollY = 0;

// Listen to scroll events
window.addEventListener('scroll', () => {
    targetScrollY = window.scrollY;
});

// Define the custom path matching the new E-Commerce HTML sections
// Hero (Top Left), Trust (Mid Right), Products Top (Mid Left), Products Bottom (Mid Right), Footer (Bottom Center)
const pathCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.5, 0.8, 0),    
  new THREE.Vector3(1.5, 0.0, 0),     
  new THREE.Vector3(-1.5, -0.8, 0),   
  new THREE.Vector3(1.5, -2.0, 0),    
  new THREE.Vector3(0, -3.2, 0)       
]);

function animate() {
  requestAnimationFrame(animate);
  
  const elapsedTime = clock.getElapsedTime();

  // Smooth scroll interpolation
  currentScrollY += (targetScrollY - currentScrollY) * 0.05;

  // Calculate scroll progress (0.0 to 1.0)
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  let progress = currentScrollY / maxScroll;
  progress = Math.max(0, Math.min(1, progress));

  // Move the rose along the drawn path!
  const currentPosition = pathCurve.getPointAt(progress);
  roseContainer.position.copy(currentPosition);

  // Spin like a record — always showing the bloom face to the camera
  roseContainer.rotation.z = (elapsedTime * 0.3) + (progress * Math.PI * 2);
  
  // Gentle floating effect added to the curve position
  if (roseContainer.children.length > 0) {
     roseContainer.position.y += Math.sin(elapsedTime * 1.5 + roseContainer.userData.floatOffset) * 0.1;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
