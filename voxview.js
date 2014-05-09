//
// VoxView module object
//

var VoxView = { }

VoxView.VERSION = [0, 0, 1];

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
  var children = []

  var center = location || new THREE.Vector3();
  var CORNERS = VoxView.CORNER;

  var verts = [];
  for (var i = 0; i < 8; i++) {
    var v = model.corners[i].clone();
    verts.push(v.multiply(CORNERS[i].dir).add(center));
  }

  var fullGeom = new THREE.Geometry();
  fullGeom.vertices = verts;

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
    children.push(quad);
  }

  makeFace(CORNERS.topSE, CORNERS.topNE, CORNERS.topNW,
           CORNERS.topSE, CORNERS.topNW, CORNERS.topSW, "Top");
  makeFace(CORNERS.topSE, CORNERS.botSW, CORNERS.botSE,
           CORNERS.topSE, CORNERS.topSW, CORNERS.botSW, "South");
  makeFace(CORNERS.topSE, CORNERS.botNE, CORNERS.topNE,
           CORNERS.topSE, CORNERS.botSE, CORNERS.botNE, "East");
  makeFace(CORNERS.botNW, CORNERS.botNE, CORNERS.botSE,
           CORNERS.botNW, CORNERS.botSE, CORNERS.botSW, "Bottom");
  makeFace(CORNERS.botNW, CORNERS.topNW, CORNERS.topNE,
           CORNERS.botNW, CORNERS.topNE, CORNERS.botNE, "North");
  makeFace(CORNERS.botNW, CORNERS.topSW, CORNERS.topNW,
           CORNERS.botNW, CORNERS.botSW, CORNERS.topSW, "West");

  this.children = children;
  this.model = model;
  this.vertices = verts;
  this.fullMesh = new THREE.Mesh(fullGeom, model.material.clone());
  this.wireMesh = new THREE.WireframeHelper(this.fullMesh);
  this.wireMesh.material.color.set(model.material.color);
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
}

//
// VoxView Application object
//

VoxView.VoxViewApp = function () {
  //
  // Set up Scene
  //
  this.scene = new THREE.Scene();
  this.sceneOrtho = new THREE.Scene();

  //
  // Camera
  //
  var DISPLAY_WIDTH = window.innerWidth;
  var DISPLAY_HEIGHT = window.innerHeight;
  var VIEW_ANGLE = 75;
  var ASPECT_RATIO = DISPLAY_WIDTH / DISPLAY_HEIGHT;
  var NEAR = 0.1;
  var FAR = 10000;

  this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT_RATIO, NEAR, FAR);
  this.camera.position.set(3, 2, 1);
  this.camera.lookAt(this.scene.position);

  this.cameraOrtho = new THREE.OrthographicCamera(
      -DISPLAY_WIDTH/2, DISPLAY_WIDTH/2,
    DISPLAY_HEIGHT/2, -DISPLAY_HEIGHT/2, 1, 10
  );
  this.cameraOrtho.position.z = 10;

  //
  // Renderer
  //
  if ( Detector.webgl )
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
  else
    this.renderer = new THREE.CanvasRenderer();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  this.renderer.autoClear = false;

  document.body.appendChild(this.renderer.domElement);

  //
  // Controls
  //
  this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  this.controls.userPanSpeed = 0.1;

  //
  // Lights
  //
  var light = new THREE.AmbientLight( 0xffffff );
  this.scene.add( light );

  //
  // Geometry
  //

  // Visible Geometry
  var geometry, material, wirematerial, multimaterial, cube;
  var initialState = window.location.search.substring(1);
  var cornerLocs = initialState ?
    VoxView.readQueryString(initialState) :
    undefined;
  this.model = new VoxView.UnitVoxel({corners: cornerLocs});
  this.vox = new VoxView.VoxelObject3D(this.model);
  this.scene.add(this.vox);
  this.scene.add(this.vox.wireMesh);

  // Voxel Grid Geometry
  var SIZE = 1;
  var STEP = 1;
  var gridHelper;
  for (var i = 0; i < 3; i++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(0, i-1, 0);
    this.scene.add(gridHelper);
  }
  for (var j = 0; j < 3; j++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(0, 0, j-1);
    gridHelper.rotation.x = Math.PI/2;
    this.scene.add(gridHelper);
  }
  for (var k = 0; k < 3; k++) {
    gridHelper = new THREE.GridHelper(SIZE, STEP);
    gridHelper.position = new THREE.Vector3(k-1, 0, 0);
    gridHelper.rotation.z = Math.PI/2;
    this.scene.add(gridHelper);
  }

//  this.tooltipSprite = initTooltipSprite();
//  this.sceneOrtho.add(tooltipSprite.sprite);

  this.projector = new THREE.Projector();
  this.INTERSECTED = null;

  var mouse = { x: 0, y: 0};
  this.mouse = mouse;
  var onDocumentMouseMove = function(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  }

  document.addEventListener('mousemove', onDocumentMouseMove, false);

  VoxView.initGui(this.model);
}

VoxView.VoxViewApp.prototype = {

  render: function () {
    var r = this.renderer;
    r.clear();
    r.render(this.scene, this.camera);
    r.clearDepth();
    r.render(this.sceneOrtho, this.cameraOrtho);
  },

  update: function () {
    var v = this.vox;
    this.controls.update();

    v.updateVertices();

    this.scene.remove(v.wireMesh);
    v.wireMesh = new THREE.WireframeHelper(v.fullMesh);
    v.wireMesh.material.color.set(v.fullMesh.material.color);
    this.scene.add(v.wireMesh);


    var vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 1);
    this.projector.unprojectVector(vector, this.camera);

    var ray = new THREE.Raycaster(this.camera.position,
                                  vector.sub(this.camera.position).normalize());

    var intersects = ray.intersectObjects(v.children);
    if (intersects.length > 0) {
      var iobj = intersects[0].object;

      if (iobj != this.INTERSECTED) {
        if (this.INTERSECTED) this.INTERSECTED.material.color.setHex(this.INTERSECTED.currentHex);
        this.INTERSECTED = iobj;
        this.INTERSECTED.currentHex = this.INTERSECTED.material.color.getHex();
        this.INTERSECTED.material.color.setHex(0xffff00);
/*
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
*/
      }
    } else { // no intersections
      if (this.INTERSECTED) this.INTERSECTED.material.color.setHex(this.INTERSECTED.currentHex);
      this.INTERSECTED = null;
/*
      var tt = tooltipSprite;
      tt.context.clearRect(0, 0, 300, 300);
      tt.texture.needsUpdate = true;
*/
    }

  },

  animate: function () {
    var app = this;
    var next = function () {
      requestAnimationFrame(next);
      app.render();
      app.update();
    }
    requestAnimationFrame(next);
  }

};

//
// TooltipSprite object
//

VoxView.TooltipSprite = function() {
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

  this.sprite = sprite;
  this.context = context;
  this.texture = texture;
}

VoxView.TooltipSprite.prototype = {};

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

  for (var i = 0; i < 8; i++) {
    var v = model.corners[i].clone();
    v.multiply(VoxView.CORNER[i].dir).add(center);
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
}


VoxView.initGui = function(model) {
  gui = new dat.GUI();

  for (var i = 0; i < 8; i++) {
    var folder = gui.addFolder(VoxView.CORNER[i].name);
    var corner = model.corners[i];
    folder.add(corner, 'x', 0, 1);
    folder.add(corner, 'y', 0, 1);
    folder.add(corner, 'z', 0, 1);
  }

}

// DO IT!
//

// Initialize scene elements
voxObject = new VoxView.VoxViewApp();

// Start animation loop
voxObject.animate();
