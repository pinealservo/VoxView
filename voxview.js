//
// Globals
//
var scene, camera, renderer, controls, voxel, gui;

var voxmesh, wiremesh;

var initGui = function() {
  voxel = {
    material: new THREE.MeshBasicMaterial({ color: 0x00ff00,
                                            transparent: true,
                                            opacity: .2 }),
    corners: {
      topNW: new THREE.Vector3(0.5, 0.5, 0.5),
      topNE: new THREE.Vector3(0.5, 0.5, 0.5),
      topSE: new THREE.Vector3(0.5, 0.5, 0.5),
      topSW: new THREE.Vector3(0.5, 0.5, 0.5),
      botNW: new THREE.Vector3(0.5, 0.5, 0.5),
      botNE: new THREE.Vector3(0.5, 0.5, 0.5),
      botSE: new THREE.Vector3(0.5, 0.5, 0.5),
      botSW: new THREE.Vector3(0.5, 0.5, 0.5)
    }
  }

  gui = new dat.GUI();

  var corner;

  var tnw = gui.addFolder('topNW');
  corner = voxel.corners.topNW;
  tnw.add(corner, 'x', 0, 1);
  tnw.add(corner, 'y', 0, 1);
  tnw.add(corner, 'z', 0, 1);

  var tne = gui.addFolder('topNE');
  corner = voxel.corners.topNE;
  tne.add(corner, 'x', 0, 1);
  tne.add(corner, 'y', 0, 1);
  tne.add(corner, 'z', 0, 1);

  var tse = gui.addFolder('topSE');
  corner = voxel.corners.topSE;
  tse.add(corner, 'x', 0, 1);
  tse.add(corner, 'y', 0, 1);
  tse.add(corner, 'z', 0, 1);

  var tsw = gui.addFolder('topSW');
  corner = voxel.corners.topSW;
  tsw.add(corner, 'x', 0, 1);
  tsw.add(corner, 'y', 0, 1);
  tsw.add(corner, 'z', 0, 1);

  var bnw = gui.addFolder('botNW');
  corner = voxel.corners.botNW;
  bnw.add(corner, 'x', 0, 1);
  bnw.add(corner, 'y', 0, 1);
  bnw.add(corner, 'z', 0, 1);

  var bne = gui.addFolder('botNE');
  corner = voxel.corners.botNE;
  bne.add(corner, 'x', 0, 1);
  bne.add(corner, 'y', 0, 1);
  bne.add(corner, 'z', 0, 1);

  var bse = gui.addFolder('botSE');
  corner = voxel.corners.botSE;
  bse.add(corner, 'x', 0, 1);
  bse.add(corner, 'y', 0, 1);
  bse.add(corner, 'z', 0, 1);

  var bsw = gui.addFolder('botSW');
  corner = voxel.corners.botSW;
  bsw.add(corner, 'x', 0, 1);
  bsw.add(corner, 'y', 0, 1);
  bsw.add(corner, 'z', 0, 1);
}

var updateVertices = function(mesh, vox, center) {
  var geom = mesh.geometry;
  var cx = center.x, cy = center.y, cz = center.z;
  var v;

  v = vox.corners.topNW;
  geom.vertices[0].set(cx - v.x, cy + v.y, cz + v.z);

  v = vox.corners.topNE;
  geom.vertices[1].set(cx + v.x, cy + v.y, cz + v.z);

  v = vox.corners.topSE;
  geom.vertices[2].set(cx + v.x, cy + v.y, cz - v.z);

  v = vox.corners.topSW;
  geom.vertices[3].set(cx - v.x, cy + v.y, cz - v.z);

  v = vox.corners.botNW;
  geom.vertices[4].set(cx - v.x, cy - v.y, cz + v.z);

  v = vox.corners.botNE;
  geom.vertices[5].set(cx + v.x, cy - v.y, cz + v.z);

  v = vox.corners.botSE;
  geom.vertices[6].set(cx + v.x, cy - v.y, cz - v.z);

  v = vox.corners.botSW;
  geom.vertices[7].set(cx - v.x, cy - v.y, cz - v.z);

  geom.verticesNeedUpdate = true;
}

var meshFromVoxel = function(vox, center) {
  var geom = new THREE.Geometry();
  var cx = center.x, cy = center.y, cz = center.z;
  var corner, face, v;

  // Vertex 0
  // Top NW corner is offset in the -x, +y, +z direction
  v = vox.corners.topNW
  corner = new THREE.Vector3(cx - v.x, cy + v.y, cz + v.z);
  geom.vertices.push(corner);

  // Vertex 1
  // Top NE corner is offset in the +x, +y, +z direction
  v = vox.corners.topNE;
  corner = new THREE.Vector3(cx + v.x, cy + v.y, cz + v.z);
  geom.vertices.push(corner);

  // Vertex 2
  // Top SE corner is offset in the +x, +y, -z direction
  v = vox.corners.topSE;
  corner = new THREE.Vector3(cx + v.x, cy + v.y, cz - v.z);
  geom.vertices.push(corner);

  // Vertex 3
  // Top SW corner is offset in the -x, +y, -z direction
  v = vox.corners.topSW;
  corner = new THREE.Vector3(cx - v.x, cy + v.y, cz - v.z);
  geom.vertices.push(corner);

  // Vertex 4
  // Bottom NW corner is offset in the -x, -y, +z direction
  v = vox.corners.botNW;
  corner = new THREE.Vector3(cx - v.x, cy - v.y, cz + v.z);
  geom.vertices.push(corner);

  // Vertex 5
  // Bottom NE corner is offset in the +x, -y, +z direction
  v = vox.corners.botNE;
  corner = new THREE.Vector3(cx + v.x, cy - v.y, cz + v.z);
  geom.vertices.push(corner);

  // Vertex 6
  // Bottom SE corner is offset in the +x, -y, -z direction
  v = vox.corners.botSE;
  corner = new THREE.Vector3(cx + v.x, cy - v.y, cz - v.z);
  geom.vertices.push(corner);

  // Vertex 7
  // Bottom SW corner is offset in the -x, -y, -z direction
  v = vox.corners.botSW;
  corner = new THREE.Vector3(cx - v.x, cy - v.y, cz - v.z);
  geom.vertices.push(corner);

  // Top quad
  face = new THREE.Face3(0, 3, 2);
  geom.faces.push(face);
  face = new THREE.Face3(0, 2, 1);
  geom.faces.push(face);

  // North quad
  face = new THREE.Face3(0, 1, 4);
  geom.faces.push(face);
  face = new THREE.Face3(4, 1, 5);
  geom.faces.push(face);

  // East quad
  face = new THREE.Face3(1, 2, 5);
  geom.faces.push(face);
  face = new THREE.Face3(5, 2, 6);
  geom.faces.push(face);

  // South quad
  face = new THREE.Face3(2, 3, 7);
  geom.faces.push(face);
  face = new THREE.Face3(2, 7, 6);
  geom.faces.push(face);

  // West quad
  face = new THREE.Face3(3, 4, 7);
  geom.faces.push(face);
  face = new THREE.Face3(3, 0, 4);
  geom.faces.push(face);

  // Bottom quad
  face = new THREE.Face3(6, 7, 4);
  geom.faces.push(face);
  face = new THREE.Face3(6, 4, 5);
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
