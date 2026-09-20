import * as THREE from "https://esm.sh/three@0.180.0";
import { OBJLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const scenes = new WeakMap();

function createFallbackModel(scene) {
	const material = new THREE.MeshStandardMaterial({
		color: 0x6f552e,
		roughness: 0.45,
		metalness: 0.35
	});
	const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), material);
	head.position.y = 1.05;
	const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 8, 16), material);
	body.position.y = 0.35;
	const cape = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.25, 4), new THREE.MeshStandardMaterial({
		color: 0x1f271d,
		roughness: 0.6,
		metalness: 0.2
	}));
	cape.position.set(0, 0.45, -0.18);
	cape.rotation.y = Math.PI / 4;
	const fallback = new THREE.Group();
	fallback.add(head, body, cape);
	fallback.position.y = -1.15;
	scene.add(fallback);
	return fallback;
}

function loadLokiObject(scene) {
	return new Promise((resolve) => {
		const loader = new OBJLoader();
		loader.load(
			"./loki.obj",
			(object) => {
				const bounds = new THREE.Box3().setFromObject(object);
				const size = bounds.getSize(new THREE.Vector3());
				const center = bounds.getCenter(new THREE.Vector3());
				const largestDimension = Math.max(size.x, size.y, size.z) || 1;
				const fitScale = 3.4 / largestDimension;

				object.scale.setScalar(fitScale);
				object.position.set(
					-center.x * fitScale,
					-center.y * fitScale,
					-center.z * fitScale
				);
				object.traverse((child) => {
					if (!child.isMesh) return;
					child.castShadow = true;
					child.receiveShadow = true;
					child.material = new THREE.MeshStandardMaterial({
						vertexColors: true,
						roughness: 0.45,
						metalness: 0.35
					});
				});
				scene.add(object);
				resolve(object);
			},
			undefined,
			() => resolve(createFallbackModel(scene))
		);
	});
}

export async function initLokiScene(container) {
	if (scenes.has(container)) return scenes.get(container);

	container.replaceChildren();
	container.classList.add("three-model-stage");

	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
	camera.position.set(0, 1.5, 5);

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.setSize(container.clientWidth, container.clientHeight);
	container.appendChild(renderer.domElement);

	scene.add(new THREE.AmbientLight(0xffd27a, 2));
	const keyLight = new THREE.DirectionalLight(0xffb52e, 4);
	keyLight.position.set(4, 6, 5);
	keyLight.castShadow = true;
	scene.add(keyLight);
	const greenLight = new THREE.PointLight(0x668f4b, 15, 10);
	greenLight.position.set(-4, 2, 3);
	scene.add(greenLight);

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.minDistance = 2;
	controls.maxDistance = 10;
	controls.target.set(0, 0, 0);

	const model = await loadLokiObject(scene);
	const resize = () => {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(container.clientWidth, container.clientHeight);
	};
	const observer = new ResizeObserver(resize);
	observer.observe(container);

	const animate = () => {
		if (!document.body.contains(container)) {
			observer.disconnect();
			renderer.dispose();
			return;
		}
		requestAnimationFrame(animate);
		controls.update();
		renderer.render(scene, camera);
	};
	animate();

	const instance = { scene, camera, renderer, controls, model };
	scenes.set(container, instance);
	return instance;
}

window.initLokiScene = initLokiScene;
