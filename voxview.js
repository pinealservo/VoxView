//
// Globals
//
var scene, camera, renderer, controls, voxel, gui;

var voxmesh, wiremesh;

var TOP = 0, BOTTOM = 2,
    SOUTH = 0, NORTH = 1, 
    EAST = 0, WEST = 4;

var CORNER_NAME = [];
CORNER_NAME[TOP    + SOUTH + EAST] = 'topSE';
CORNER_NAME[BOTTOM + SOUTH + EAST] = 'botSE';
CORNER_NAME[TOP    + NORTH + EAST] = 'topNE';
CORNER_NAME[BOTTOM + NORTH + EAST] = 'botNE';
CORNER_NAME[TOP    + SOUTH + WEST] = 'topSW';
CORNER_NAME[BOTTOM + SOUTH + WEST] = 'botSW';
CORNER_NAME[TOP    + NORTH + WEST] = 'topNW';
CORNER_NAME[BOTTOM + NORTH + WEST] = 'botNW';

// y,x,z
var CORNER_DIRECTION = [];
CORNER_DIRECTION[TOP    + SOUTH + EAST] = [1, 1, -1];
CORNER_DIRECTION[BOTTOM + SOUTH + EAST] = [1, -1, -1];
CORNER_DIRECTION[TOP    + NORTH + EAST] = [-1, 1, -1];
CORNER_DIRECTION[BOTTOM + NORTH + EAST] = [-1, -1, -1];
CORNER_DIRECTION[TOP    + SOUTH + WEST] = [1, 1, 1];
CORNER_DIRECTION[BOTTOM + SOUTH + WEST] = [1, -1, 1];
CORNER_DIRECTION[TOP    + NORTH + WEST] = [-1, 1, 1];
CORNER_DIRECTION[BOTTOM + NORTH + WEST] = [-1, -1, 1];

voxel = {
  material: new THREE.MeshBasicMaterial({ color: 0x00ff00,
										  transparent: true,
										  opacity: .2 }),
  corners: []
}
for(var i = 0; i < 8; i++) {
  voxel.corners[i] = new THREE.Vector3(0.5, 0.5, 0.5);
}
  
var initGui = function() {
  
  gui = new dat.GUI();

  for(var i = 0; i < 8; i++) {
	var folder = gui.addFolder(CORNER_NAME[i]);
	var corner = voxel.corners[i];
	folder.add(corner, 'x', 0, 1);
	folder.add(corner, 'y', 0, 1);
	folder.add(corner, 'z', 0, 1);
  }
}

var updateVertices = function(mesh, vox, center) {
  var geom = mesh.geometry;
  var cx = center.x, cy = center.y, cz = center.z;
  var v;
  
  for(var i = 0; i < 8; i++) {
	var v = vox.corners[i];
	var d = CORNER_DIRECTION [i];
	geom.vertices[i].set(cx + d[0] * v.x, cy + d[1] * v.y, cz + d[2] * v.z);
  }

  geom.verticesNeedUpdate = true;
}

var meshFromVoxel = function(vox, center) {
  var geom = new THREE.Geometry();
  var cx = center.x, cy = center.y, cz = center.z;
  var corner, face, v;

  for(var i = 0; i < 8; i++) {
    var v = vox.corners[i];
    var d = CORNER_DIRECTION [i];
    corner = new THREE.Vector3(cx + d[0] * v.x, cy + d[1] * v.y, cz + d[2] * v.z);
    geom.vertices.push(corner);
  }

  // Top quad
  face = new THREE.Face3(TOP + SOUTH + EAST,    TOP + NORTH + EAST,    TOP + NORTH + WEST);
  geom.faces.push(face);
  face = new THREE.Face3(TOP + SOUTH + EAST,    TOP + NORTH + WEST,    TOP + SOUTH + WEST);
  geom.faces.push(face);

  // South quad
  face = new THREE.Face3(TOP + SOUTH + EAST,    BOTTOM + SOUTH + WEST, BOTTOM + SOUTH + EAST);
  geom.faces.push(face);
  face = new THREE.Face3(TOP + SOUTH + EAST,    TOP + SOUTH + WEST,    BOTTOM + SOUTH + WEST);
  geom.faces.push(face);

  // East quad
  face = new THREE.Face3(TOP + SOUTH + EAST,    BOTTOM + NORTH + EAST, TOP + NORTH + EAST);
  geom.faces.push(face);
  face = new THREE.Face3(TOP + SOUTH + EAST,    BOTTOM + SOUTH + EAST, BOTTOM + NORTH + EAST);
  geom.faces.push(face);

  // Bottom quad
  face = new THREE.Face3(BOTTOM + NORTH + WEST, BOTTOM + NORTH + EAST, BOTTOM + SOUTH + EAST);
  geom.faces.push(face);
  face = new THREE.Face3(BOTTOM + NORTH + WEST, BOTTOM + SOUTH + EAST, BOTTOM + SOUTH + WEST);
  geom.faces.push(face);

  // North quad
  face = new THREE.Face3(BOTTOM + NORTH + WEST, TOP + NORTH + WEST,    TOP + NORTH + EAST);
  geom.faces.push(face);
  face = new THREE.Face3(BOTTOM + NORTH + WEST, TOP + NORTH + EAST,    BOTTOM + NORTH + EAST);
  geom.faces.push(face);

  // West quad
  face = new THREE.Face3(BOTTOM + NORTH + WEST, TOP + SOUTH + WEST,    TOP + NORTH + WEST);
  geom.faces.push(face);
  face = new THREE.Face3(BOTTOM + NORTH + WEST, BOTTOM + SOUTH + WEST, TOP + SOUTH + WEST);
  geom.faces.push(face);

  geom.mergeVertices();

  return new THREE.Mesh(geom, vox.material);
}

//
// Main definitions
//
var init = function () {
  //
  // Set up Scene
  //
  scene = new THREE.Scene();

  //
  // Camera
  //
  var DISPLAY_WIDTH = window.innerWidth;
  var DISPLAY_HEIGHT = window.innerHeight;
  var VIEW_ANGLE = 75;
  var ASPECT_RATIO = DISPLAY_WIDTH / DISPLAY_HEIGHT;
  var NEAR = 0.1, FAR = 10000;

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT_RATIO, NEAR, FAR);
  camera.position.x = 3;
  camera.position.z = 1;
  camera.position.y = 2;
  camera.lookAt(scene.position);

  //
  // Renderer
  //
  if ( Detector.webgl )
    renderer = new THREE.WebGLRenderer({ antialias: true });
  else
    renderer = new THREE.CanvasRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //
  // Controls
  //
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  //
  // Lights
  //
  var light = new THREE.AmbientLight( 0xffffff );
  scene.add( light );

  //
  // Geometry
  //

  // Visible Geometry
  var geometry, material, wirematerial, multimaterial, cube;
  var origin = new THREE.Vector3(0, 0, 0);

  var vox = meshFromVoxel(voxel, origin);
  var wire = new THREE.WireframeHelper(vox);
  scene.add(vox);
  scene.add(wire);

  // Voxel Grid Geometry
  var SIZE = 1;
  var STEP = 1;
  var gridHelper;
  for (var i = 0; i < 3; i++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(0, i-1, 0);
    scene.add(gridHelper);
  }
  for (var j = 0; j < 3; j++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(0, 0, j-1);
    gridHelper.rotation.x = Math.PI/2;
    scene.add(gridHelper);
  }
  for (var k = 0; k < 3; k++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(k-1, 0, 0);
    gridHelper.rotation.z = Math.PI/2;
    scene.add(gridHelper);
  }

  return [vox, wire];
}

var render = function() {
  renderer.render(scene, camera);
}

var update = function () {
  controls.update();
  updateVertices(voxmesh, voxel, new THREE.Vector3(0, 0, 0));
  scene.remove(wiremesh);
  wiremesh = new THREE.WireframeHelper(voxmesh);
  wiremesh.material.color.set(voxmesh.material.color);

  scene.add(wiremesh);
}

var animate = function () {
  requestAnimationFrame(animate);

  render();
  update();
}

//
// DO IT!
//

// Initialize scene elements
initGui();
var meshes = init();
voxmesh = meshes[0];
wiremesh = meshes[1];

// Start animation loop
animate();
