//
// VoxView module object
//

var VoxView = { };

VoxView.VERSION = [0, 0, 1];

// Set up VoxView.CORNER
( function() {

  var dirs = {
    top:    { val: 0, dir: 1,  name: 'top' },
    bottom: { val: 2, dir: -1, name: 'bot' },
    south:  { val: 0, dir: 1,  name: 'S'   },
    north:  { val: 1, dir: -1, name: 'N'   },
    east:   { val: 0, dir: -1, name: 'E'   },
    west:   { val: 4, dir: 1,  name: 'W'   }
  };

  var corners = {};
  var makeCorner = function(y, x, z) {
    var fullname = y.name + x.name + z.name;
    var idx = y.val + x.val + z.val;
    var corner = {
      name: fullname,
      index: idx,
      dir: new THREE.Vector3(x.dir, y.dir, z.dir)
    };
    corners[fullname] = corner;
    corners[idx]  = corner;
  }

  makeCorner(dirs.top, dirs.south, dirs.east);
  makeCorner(dirs.bottom, dirs.south, dirs.east);
  makeCorner(dirs.top, dirs.north, dirs.east);
  makeCorner(dirs.bottom, dirs.north, dirs.east);
  makeCorner(dirs.top, dirs.south, dirs.west);
  makeCorner(dirs.bottom, dirs.south, dirs.west);
  makeCorner(dirs.top, dirs.north, dirs.west);
  makeCorner(dirs.bottom, dirs.north, dirs.west);

  VoxView.CORNER = corners;
}() );


//
// UnitVoxel model object
//

VoxView.UnitVoxel = function(params) {
  this.material = params.material || new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: .2
  });

  if (params.corners) {
    this.corners = params.corners
  } else {
    this.corners = [];
    for (var i = 0; i < 8; i++) {
      this.corners[i] = new THREE.Vector3(0.5, 0.5, 0.5);
    }
  }
}

VoxView.UnitVoxel.prototype = {

  constructor: VoxView.UnitVoxel,

};

//
// VoxelObject3D view object
//

VoxView.VoxelObject3D = function(model, location) {
  THREE.Object3D.call(this);

  var center = location || new THREE.Vector3();

  var verts = [];
  for (var i = 0; i < 8; i++) {
    var v = model.corners[i].clone();
    verts.push(v.multiply(VoxView.CORNER[i].dir).add(center));
  }

  var fullGeom = new THREE.Geometry();
  fullGeom.vertices = verts;

  var voxObj = new THREE.Object3D();
  var makeFace = function(a1,a2,a3, b1,b2,b3, name) {
    var face, quad, geom = new THREE.Geometry();
    geom.vertices = verts;

    face = new THREE.Face3(a1.index, a2.index, a3.index);
    geom.faces.push(face);
    fullGeom.faces.push(face);

    face = new THREE.Face3(b1.index, b2.index, b3.index);
    geom.faces.push(face);
    fullGeom.faces.push(face);

    quad = new THREE.Mesh(geom, model.material.clone());
    quad.name = name;

    voxObj.add(quad);
  }

  var C = VoxView.CORNER;
  makeFace(C.topSE, C.topNE, C.topNW, C.topSE, C.topNW, C.topSW, "Top");
  makeFace(C.topSE, C.botSW, C.botSE, C.topSE, C.topSW, C.botSW, "South");
  makeFace(C.topSE, C.botNE, C.topNE, C.topSE, C.botSE, C.botNE, "East");
  makeFace(C.botNW, C.botNE, C.botSE, C.botNW, C.botSE, C.botSW, "Bottom");
  makeFace(C.botNW, C.topNW, C.topNE, C.botNW, C.topNE, C.botNE, "North");
  makeFace(C.botNW, C.topSW, C.topNW, C.botNW, C.botSW, C.topSW, "West");

  this.model = model;
  this.vertices = verts;
  this.faceMeshes = voxObj;
  this.fullMesh = new THREE.Mesh(fullGeom, model.material.clone());
  this.wireMesh = new THREE.WireframeHelper(this.fullMesh);
  this.wireMesh.material.color.set(model.material.color);

  this.add(this.faceMeshes);
  this.add(this.wireMesh);
}

VoxView.VoxelObject3D.prototype = Object.create(THREE.Object3D.prototype);

VoxView.VoxelObject3D.prototype.updateVertices = function(center) {
  var origin = center || new THREE.Vector3();
  for (var i = 0; i < 8; i++) {
    var v = this.model.corners[i].clone();
    v.multiply(VoxView.CORNER[i].dir).add(origin);
    this.vertices[i].copy(v);
  }

  this.traverse(function (m) {
    if (m.geometry) {
      m.geometry.verticesNeedUpdate = true;
    }
  });

  this.remove(this.wireMesh);
  this.wireMesh = new THREE.WireframeHelper(this.fullMesh);
  this.wireMesh.material.color.set(this.fullMesh.material.color);
  this.add(this.wireMesh);
}

VoxView.VoxelObject3D.prototype.selectControlPoint = function(ray) {
  var iobj = null;
  var intersects = ray.intersectObjects(this.faceMeshes.children);
  if (intersects.length > 0) {
    iobj = intersects[0].object;
  }
  return iobj;
}

VoxView.VoxelObject3D.prototype.startHoverEffect = function(obj) {
  var HOVER_COLOR = 0xffff00;
  obj.material.color.setHex(HOVER_COLOR);
}

VoxView.VoxelObject3D.prototype.stopHoverEffect = function(obj) {
  obj.material.color.set(this.fullMesh.material.color);
}

//
// VoxelGrid3D view object
//

VoxView.VoxelGrid3D = function () {
  THREE.Object3D.call(this);

  var SIZE = 1;
  var STEP = 1;
  var gridHelper;
  var gridAxis;

  gridAxis = new THREE.Object3D();
  gridAxis.name = "Y";
  gridAxis.visible = true;
  for (var i = 0; i < 3; i++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(0, i-1, 0);
    gridAxis.add(gridHelper);
  }
  this.yAxis = gridAxis;

  gridAxis = new THREE.Object3D();
  gridAxis.name = "Z";
  gridAxis.visible = true;
  for (var j = 0; j < 3; j++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(0, 0, j-1);
    gridHelper.rotation.x = Math.PI/2;
    gridAxis.add(gridHelper);
  }
  this.zAxis = gridAxis;

  gridAxis = new THREE.Object3D();
  gridAxis.name = "X";
  gridAxis.visible = true;
  for (var k = 0; k < 3; k++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(k-1, 0, 0);
    gridHelper.rotation.z = Math.PI/2;
    gridAxis.add(gridHelper);
  }
  this.xAxis = gridAxis;

  this.add(this.xAxis);
  this.add(this.yAxis);
  this.add(this.zAxis);
  this.visible = true;
}

VoxView.VoxelGrid3D.prototype = Object.create(THREE.Object3D.prototype);

VoxView.VoxelGrid3D.prototype.update = function() {
  this.remove(this.xAxis);
  this.remove(this.yAxis);
  this.remove(this.zAxis);

  if (this.visible) {
    if (this.xAxis.visible) {
      this.add(this.xAxis);
    }
    if (this.yAxis.visible) {
      this.add(this.yAxis);
    }
    if (this.zAxis.visible) {
      this.add(this.zAxis);
    }
  }
}

//
// TooltipSprite object
//

VoxView.TooltipSprite = function() {
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');

  context.font = "Bold 36px Arial";

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  var spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    useScreenCoordinates: true
  });
  var sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(200, 100, 1.0);
  sprite.position.set(80, 200, 0);

  this.sprite = sprite;
  this.context = context;
  this.texture = texture;
  this.textFillStyle = "rgba(255,255,255,1)";
}

VoxView.TooltipSprite.prototype = {};

VoxView.TooltipSprite.prototype.setText = function(toolText) {
  var textWidth = this.context.measureText(toolText).width;
  this.context.clearRect(0, 0, 640, 480);
  this.context.fillStyle = this.textFillStyle;
  this.context.fillText(toolText, 4, 30);
  this.texture.needsUpdate = true;
}

VoxView.TooltipSprite.prototype.clear = function() {
  this.context.clearRect(0, 0, 640, 480);
  this.texture.needsUpdate = true;
}

//
// VoxView Application object
//

VoxView.VoxViewApp = function (paramObj) {
  var params = paramObj || {};

  //
  // Scenes
  //
  var scene = new THREE.Scene();
  var sceneOrtho = new THREE.Scene();

  //
  // Cameras
  //
  var DISPLAY_WIDTH = params.width || window.innerWidth;
  var DISPLAY_HEIGHT = params.height || window.innerHeight;
  var VIEW_ANGLE = 75;
  var ASPECT_RATIO = DISPLAY_WIDTH / DISPLAY_HEIGHT;
  var NEAR = 0.1;
  var FAR = 10000;

  var camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT_RATIO, NEAR, FAR);
  camera.position.set(3, 2, 1);
  camera.lookAt(scene.position);

  // The orthographic camera is for the tooltip sprite
  var cameraOrtho = new THREE.OrthographicCamera(
    -DISPLAY_WIDTH/2, DISPLAY_WIDTH/2,
    DISPLAY_HEIGHT/2, -DISPLAY_HEIGHT/2, NEAR, FAR
  );
  cameraOrtho.position.z = 10;

  //
  // Renderer
  //
  var renderer;
  if ( Detector.webgl )
    renderer = new THREE.WebGLRenderer({ antialias: true });
  else
    renderer = new THREE.CanvasRenderer();
  renderer.setSize(DISPLAY_WIDTH, DISPLAY_HEIGHT);
  renderer.autoClear = false;

  var domContainer = params.container || document.body;
  domContainer.appendChild(renderer.domElement);

  //
  // Lights
  //
  var light = new THREE.AmbientLight( 0xffffff );
  scene.add(light);

  //
  // Geometry
  //

  // Visible Geometry
  var model = new VoxView.UnitVoxel({corners: params.cornerLocs});
  var vox = new VoxView.VoxelObject3D(model);

  scene.add(vox);

  // Voxel Grid Geometry
  var gridobj = new VoxView.VoxelGrid3D();

  scene.add(gridobj);

  //
  // Controls
  //
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  var tooltipSprite = new VoxView.TooltipSprite();
  var projector = new THREE.Projector();
  var mouse = { x: 0, y: 0};

  controls.userPanSpeed = 0.1;
  sceneOrtho.add(tooltipSprite.sprite);

  var onDocumentMouseMove = function(event) {
    var coords = VoxView.relMouseCoords(event, renderer.domElement);

    mouse.x = (coords.x / DISPLAY_WIDTH) * 2 - 1;
    mouse.y = - (coords.y / DISPLAY_HEIGHT) * 2 + 1;
  }

  document.addEventListener('mousemove', onDocumentMouseMove, false);

  VoxView.initGui(model, gridobj);

  //
  // Initialize attributes
  //
  this.model = model;

  this.scene = scene;
  this.sceneOrtho = sceneOrtho;
  this.camera = camera
  this.cameraOrtho = cameraOrtho;
  this.renderer = renderer;

  this.vox = vox;
  this.grid = gridobj;
  this.tooltipSprite = tooltipSprite;

  this.controls = controls;

  this.projector = projector;
  this.INTERSECTED = null;
  this.mouse = mouse;
}

VoxView.VoxViewApp.prototype = {};

VoxView.VoxViewApp.prototype.render = function () {
  var r = this.renderer;
  r.clear();
  r.render(this.scene, this.camera);
  r.clearDepth();
  r.render(this.sceneOrtho, this.cameraOrtho);
}

VoxView.VoxViewApp.prototype.checkMouseOver = function(x, y) {
  var vector = new THREE.Vector3(x, y, 1);
  this.projector.unprojectVector(vector, this.camera);

  var ray = new THREE.Raycaster(this.camera.position,
                                vector.sub(this.camera.position).normalize());

  var iobj = this.vox.selectControlPoint(ray);

  if (iobj) {

    // update tooltip if ray intersects a different object
    if (iobj != this.INTERSECTED) {
      if (this.INTERSECTED) {
        this.vox.stopHoverEffect(this.INTERSECTED);
      }
      this.INTERSECTED = iobj;

      this.vox.startHoverEffect(iobj);

      if (iobj.name) {
        this.tooltipSprite.setText(iobj.name);
      } else {
        this.tooltipSprite.clear();
      }

    }

    // do nothing if ray intersects the same object

  } else {

    // no intersections, so clear any intersected record
    if (this.INTERSECTED) {
      this.vox.stopHoverEffect(this.INTERSECTED);
      this.tooltipSprite.clear();
    }
    this.INTERSECTED = null;

  }
}

VoxView.VoxViewApp.prototype.update = function () {
  this.controls.update();

  this.grid.update();

  this.vox.updateVertices();

  this.checkMouseOver(this.mouse.x, this.mouse.y);

  VoxView.writeQueryString(this.model);
}

VoxView.VoxViewApp.prototype.animate = function () {
  var app = this;
  var next = function () {
    requestAnimationFrame(next);
    app.render();
    app.update();
  }
  requestAnimationFrame(next);
}

//
// Static helpers
//

// queryString is the URL component after the '?'
VoxView.readQueryString = function(queryString) {
  var initialState = queryString.split("&");
  var corners = [];
  for (var i = 0; i < 8; i++) {
    if (initialState && initialState[i]) {
      var coordinate = initialState[i].split(",");
      corners[i] = new THREE.Vector3(
        Math.abs(parseFloat(coordinate[0])),
        Math.abs(parseFloat(coordinate[1])),
        Math.abs(parseFloat(coordinate[2]))
      );
    } else {
      corners[i] = new THREE.Vector3(0.5, 0.5, 0.5);
    }
  }
  return corners;
}

VoxView.writeQueryString = function(model) {
  var voxelLink = document.getElementById('voxelLink');
  var newHref = window.location.href.split("?")[0];

  if (voxelLink) {
    for (var i = 0; i < 8; i++) {
      var v = model.corners[i];
      newHref += (i == 0 ? '?' : '&');
      newHref += Math.round(v.x * 100) / 100 + "," +
                 Math.round(v.y * 100) / 100 + "," +
                 Math.round(v.z * 100) / 100;
    }
    voxelLink.href = newHref;
  }
}

VoxView.relMouseCoords = function(event, domObj) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = domObj;

  totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
  totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return { x: canvasX, y: canvasY };
}

VoxView.initGui = function(model, grid) {
  gui = new dat.GUI();

  for (var i = 0; i < 8; i++) {
    var folder = gui.addFolder(VoxView.CORNER[i].name);
    var corner = model.corners[i];
    folder.add(corner, 'x', 0, 1);
    folder.add(corner, 'y', 0, 1);
    folder.add(corner, 'z', 0, 1);
  }
  var gridFolder = gui.addFolder("Voxel Grid");
  gridFolder.add(grid, 'visible');

}

// DO IT!
//

// Initialize scene elements
