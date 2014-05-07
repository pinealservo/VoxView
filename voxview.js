//
// Globals
//
var scene, camera, renderer, controls, voxel, gui;
var projector, mouse = { x: 0, y: 0}, INTERSECTED;

var voxObject, tooltipSprite;

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
CORNER_DIRECTION[TOP    + SOUTH + EAST] = new THREE.Vector3(1, 1, -1);
CORNER_DIRECTION[BOTTOM + SOUTH + EAST] = new THREE.Vector3(1, -1, -1);
CORNER_DIRECTION[TOP    + NORTH + EAST] = new THREE.Vector3(-1, 1, -1);
CORNER_DIRECTION[BOTTOM + NORTH + EAST] = new THREE.Vector3(-1, -1, -1);
CORNER_DIRECTION[TOP    + SOUTH + WEST] = new THREE.Vector3(1, 1, 1);
CORNER_DIRECTION[BOTTOM + SOUTH + WEST] = new THREE.Vector3(1, -1, 1);
CORNER_DIRECTION[TOP    + NORTH + WEST] = new THREE.Vector3(-1, 1, 1);
CORNER_DIRECTION[BOTTOM + NORTH + WEST] = new THREE.Vector3(-1, -1, 1);

voxel = {
  material: new THREE.MeshBasicMaterial({ color: 0x00ff00,
					  transparent: true,
					  opacity: .2 }),
  corners: []
}

var initialState = window.location.search.substring(1).split("&");

for (var i = 0; i < 8; i++) {
  if (initialState && initialState[i]) {
    var coordinate = initialState[i].split(",");
    voxel.corners[i] = new THREE.Vector3(
      Math.abs(parseFloat(coordinate[0])),
      Math.abs(parseFloat(coordinate[1])),
      Math.abs(parseFloat(coordinate[2])));
  } else {
    voxel.corners[i] = new THREE.Vector3(0.5, 0.5, 0.5);
  }
}

var initGui = function() {
  gui = new dat.GUI();

  for (var i = 0; i < 8; i++) {
    var folder = gui.addFolder(CORNER_NAME[i]);
    var corner = voxel.corners[i];
    folder.add(corner, 'x', 0, 1);
    folder.add(corner, 'y', 0, 1);
    folder.add(corner, 'z', 0, 1);
  }

}

var updateVertices = function(mesh, vox, center) {
  var v;
  var voxelLink = document.getElementById('voxelLink');
  var newHref = window.location.href.split("?")[0];

  for (var i = 0; i < 8; i++) {
    v = vox.corners[i].clone();
    v.multiply(CORNER_DIRECTION[i]).add(center);
    mesh.vertices[i].copy(v);
    if (voxelLink) {
      newHref += (i == 0 ? '?' : '&');
      newHref += Math.round(v.x * 100) / 100 + "," +
                 Math.round(v.y * 100) / 100 + "," +
                 Math.round(v.z * 100) / 100;
    }
  }

  if (voxelLink) {
    voxelLink.href = newHref;
  }

  mesh.traverse(function (m) { if (m.geometry) { m.geometry.verticesNeedUpdate = true;} });
}

var meshFromVoxel = function(vox, center) {
  var voxObj = new THREE.Object3D();
  var fullGeom = new THREE.Geometry();
  var cx = center.x, cy = center.y, cz = center.z;
  var verts, geom, corner, face, quad, v;

  verts = []
  for(var i = 0; i < 8; i++) {
    var v = vox.corners[i].clone();
    verts.push(v.multiply(CORNER_DIRECTION[i]).add(center));
  }
  voxObj.vertices = verts;
  fullGeom.vertices = verts;

  var makeFace = function(a1,a2,a3,b1,b2,b3,name) {
    geom = new THREE.Geometry();
    geom.vertices = verts;

    face = new THREE.Face3(a1, a2, a3);
    geom.faces.push(face);
    fullGeom.faces.push(face);

    face = new THREE.Face3(b1, b2, b3);
    geom.faces.push(face);
    fullGeom.faces.push(face);

    quad = new THREE.Mesh(geom, vox.material.clone());
    quad.name = name;
    voxObj.children.push(quad);
  }

  // Top quad
  makeFace(TOP + SOUTH + EAST,    TOP + NORTH + EAST,    TOP + NORTH + WEST,
           TOP + SOUTH + EAST,    TOP + NORTH + WEST,    TOP + SOUTH + WEST,
           "Top");

  // South quad
  makeFace(TOP + SOUTH + EAST,    BOTTOM + SOUTH + WEST, BOTTOM + SOUTH + EAST,
           TOP + SOUTH + EAST,    TOP + SOUTH + WEST,    BOTTOM + SOUTH + WEST,
           "South");

  // East quad
  makeFace(TOP + SOUTH + EAST,    BOTTOM + NORTH + EAST, TOP + NORTH + EAST,
           TOP + SOUTH + EAST,    BOTTOM + SOUTH + EAST, BOTTOM + NORTH + EAST,
           "East");

  // Bottom quad
  makeFace(BOTTOM + NORTH + WEST, BOTTOM + NORTH + EAST, BOTTOM + SOUTH + EAST,
           BOTTOM + NORTH + WEST, BOTTOM + SOUTH + EAST, BOTTOM + SOUTH + WEST,
           "Bottom");

  // North quad
  makeFace(BOTTOM + NORTH + WEST, TOP + NORTH + WEST,    TOP + NORTH + EAST,
           BOTTOM + NORTH + WEST, TOP + NORTH + EAST,    BOTTOM + NORTH + EAST,
           "North");

  // West quad
  makeFace(BOTTOM + NORTH + WEST, TOP + SOUTH + WEST,    TOP + NORTH + WEST,
           BOTTOM + NORTH + WEST, BOTTOM + SOUTH + WEST, TOP + SOUTH + WEST,
           "West");

  voxObj.fullMesh = new THREE.Mesh(fullGeom, vox.material.clone());
  voxObj.wireMesh = new THREE.WireframeHelper(voxObj.fullMesh);
  voxObj.wireMesh.material.color.set(vox.material.color);

  return voxObj;
}

//
// Main definitions
//

var initTooltipSprite = function() {
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');

  context.font = "Bold 36px Arial";
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.fillText("VoxView", 0, 20);

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  var spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    useScreenCoordinates: true
  });
  var sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(200, 100, 1.0);
  sprite.position.set(80, 200, 0);

  return {
    sprite: sprite,
    context: context,
    texture: texture
  }
}

var init = function () {
  //
  // Set up Scene
  //
  scene = new THREE.Scene();
  sceneOrtho = new THREE.Scene();

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

  cameraOrtho = new THREE.OrthographicCamera(
    -DISPLAY_WIDTH/2, DISPLAY_WIDTH/2,
    DISPLAY_HEIGHT/2, -DISPLAY_HEIGHT/2, 1, 10
  );
  cameraOrtho.position.z = 10;

  //
  // Renderer
  //
  if ( Detector.webgl )
    renderer = new THREE.WebGLRenderer({ antialias: true });
  else
    renderer = new THREE.CanvasRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  document.body.appendChild(renderer.domElement);

  //
  // Controls
  //
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.userPanSpeed = 0.1;

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
  scene.add(vox);
  scene.add(vox.wireMesh);

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

  tooltipSprite = initTooltipSprite();
  sceneOrtho.add(tooltipSprite.sprite);

  projector = new THREE.Projector();
  document.addEventListener('mousemove', onDocumentMouseMove, false);

  return vox;
}

function onDocumentMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

var render = function() {
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(sceneOrtho, cameraOrtho);
}

var update = function () {
  var v = voxObject;
  controls.update();

  updateVertices(v, voxel, new THREE.Vector3(0, 0, 0));

  scene.remove(v.wireMesh);
  v.wireMesh = new THREE.WireframeHelper(v.fullMesh);
  v.wireMesh.material.color.set(v.fullMesh.material.color);
  scene.add(v.wireMesh);


  var vector = new THREE.Vector3( mouse.x, mouse.y, 1);
  projector.unprojectVector(vector, camera);

  var ray = new THREE.Raycaster(camera.position,
                                vector.sub(camera.position).normalize());

  var intersects = ray.intersectObjects(v.children);
  if (intersects.length > 0) {
    var iobj = intersects[0].object;

    if (iobj != INTERSECTED) {
      if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
      INTERSECTED = iobj;
      INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
      INTERSECTED.material.color.setHex(0xffff00);

      var tt = tooltipSprite;
      if (iobj.name) {
        var toolText = iobj.name;
        var textWidth = tt.context.measureText(toolText).width;
        tt.context.clearRect(0, 0, 640, 480);
        tt.context.fillStyle = "rgba(255,255,255,1)";
        tt.context.fillText(toolText, 4, 30);
        tt.texture.needsUpdate = true;
      } else {
        tt.context.clearRect(0, 0, 300, 300);
        tt.texture.needsUpdate = true;
      }
    }
  } else { // no intersections
    if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
    INTERSECTED = null;
    var tt = tooltipSprite;
    tt.context.clearRect(0, 0, 300, 300);
    tt.texture.needsUpdate = true;
  }
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
voxObject = init();

// Start animation loop
animate();
