/**
* Created by wtarrant on 28/02/14.
*/
/// <reference path="../lib/knockout.d.ts" />
/// <reference path="../lib/underscore.d.ts" />
/// <reference path="Utils2.ts" />

//declare module THREE { export var Octree }
var ImageStackRenderingImplementation;
(function (ImageStackRenderingImplementation) {
    var ToggleGridCommand = (function () {
        function ToggleGridCommand(stackRender) {
            this._stackRender = stackRender;
        }
        ToggleGridCommand.prototype.execute = function () {
            this._stackRender.toggleGrid();
        };
        return ToggleGridCommand;
    })();
    ImageStackRenderingImplementation.ToggleGridCommand = ToggleGridCommand;

    var ImageItem = (function () {
        function ImageItem(src, caption) {
            this.src = src;
            this.caption = caption;
        }
        return ImageItem;
    })();
    ImageStackRenderingImplementation.ImageItem = ImageItem;

    var StackRenderer = (function () {
        function StackRenderer(gui) {
            this._worldSize = 400;
            this._blockSize = 20;
            this._gridColor = 0x25F500;
            this._lblVisibility = true;
            this._gui = gui;
            this.info = new GUIUTILS.InfoViewModel();
            ko.applyBindings(this.info, $('#info')[0]);
            this.initialise();
            this.animate();
        }
        StackRenderer.prototype.initialise = function () {
            var _this = this;
            this._clock = new THREE.Clock();

            try  {
                StackRenderer.Worker = new Worker('../src/worker2.js');
                StackRenderer.Worker.addEventListener('message', this.onMessageReceived.bind(this), false); // listen for callbacks
            } catch (e) {
                alert("Unable to load worker");
            }

            StackRenderer.GlobalControlsEnabled = true;
            this._renderingElement = document.getElementById('webgl');
            this._stats = new Stats();
            this._stats.setMode(0);
            document.getElementById('fps').appendChild(this._stats.domElement);

            var divWH = Helper.JQueryHelper.GetScreenWH('#webgl');
            this._screenWidth = divWH[0];
            this._screenHeight = divWH[1];

            if (!Detector.webgl)
                Detector.addGetWebGLMessage();

            this._scene = new THREE.Scene();

            this.initialiseCamera();

            var pointColor = 0xFFFFFF;
            this.initialiseSpotLighting(pointColor, 7000);

            this._renderer = new THREE.WebGLRenderer();
            this._renderer.setClearColor(new THREE.Color(0xEEEfff), 1);
            this._renderer.setSize(this._screenWidth, this._screenHeight);

            var gridCreator = new Geometry.GridCreator(this._worldSize, this._blockSize, this._gridColor);
            var gridGeometryH = gridCreator.buildAxisAligned2DGrids();
            var gridGeometryV = gridCreator.buildAxisAligned2DGrids();
            this._grid = gridCreator.build3DGrid(gridGeometryH, gridGeometryV);
            if (this._blockSize >= 10) {
                this._scene.add(this._grid.liH);
                this._scene.add(this._grid.liV);
            }

            this._gui.addButton(new GUIUTILS.Button('Toggle', 'Toggle Grid', 'Allows the grid to be toggled on or off', new ToggleGridCommand(this)));

            var axisHelper = new THREE.AxisHelper(20);
            axisHelper.position = new THREE.Vector3(-1 * this._worldSize / 2 - 20, -1 * this._worldSize / 2 - 20, -1 * this._worldSize / 2 - 20);
            this._scene.add(axisHelper);

            Helper.JQueryHelper.AppendToScene('#webgl', this._renderer);

            this._phongMaterial = new THREE.MeshPhongMaterial();
            this._phongMaterial.specular = new THREE.Color(0X9FCFF);
            this._phongMaterial.color = new THREE.Color(0x7375C7);
            this._phongMaterial.emissive = new THREE.Color(0X006063);
            this._phongMaterial.shininess = 10;
            this._phongMaterial.side = THREE.DoubleSide;

            $.ajax({
                dataType: "json",
                url: '../data/' + $('#dataType :selected').text().toLowerCase() + '/data.json',
                success: function (data) {
                    _this._voxelWorld = new Voxel.VoxelWorld(_this._worldSize, _this._blockSize, _this._scene, data);
                    var slim = _this._voxelWorld.getSlimWorldVoxelArray();
                    ImageStackRenderingImplementation.StackRenderer.Worker.postMessage({ command: "calculateVoxelGeometry", data: slim, threshold: parseInt($('#amount').text()) });
                }
            });

            this.ImageItems = ko.observableArray([]);
            ko.applyBindings(this, $('#images')[0]);

            this.draw();
        };

        StackRenderer.prototype.initialiseCamera = function () {
            this._camera = new THREE.PerspectiveCamera(45, this._screenWidth / this._screenHeight, 0.1, 1500);
            this._camera.position = new THREE.Vector3(0, 200, 600);
            this._camera.lookAt(this._scene.position);
            this._cameraControls = new THREE.OrbitControls(this._camera, this._renderingElement);
            this._cameraControls.domElement = this._renderingElement;
            this._scene.add(this._camera);
        };

        StackRenderer.prototype.initialiseSpotLighting = function (distance, pointcolor) {
            var spot = new THREE.SpotLight();
            spot.color = new THREE.Color(pointcolor);
            spot.position = new THREE.Vector3(0, 0, distance);
            spot.castShadow = true;
            spot.target = new THREE.Object3D();
            this._scene.add(spot);

            spot = new THREE.SpotLight();
            spot.color = new THREE.Color(pointcolor);
            spot.position = new THREE.Vector3(0, 0, -distance);
            spot.castShadow = true;
            spot.target = new THREE.Object3D();

            // spot.distance = distance/2;
            this._scene.add(spot);

            spot = new THREE.SpotLight();
            spot.color = new THREE.Color(pointcolor);
            spot.position = new THREE.Vector3(-distance, 0, 0);
            spot.castShadow = true;
            spot.target = new THREE.Object3D();
            this._scene.add(spot);

            spot = new THREE.SpotLight();
            spot.color = new THREE.Color(pointcolor);
            spot.position = new THREE.Vector3(distance, 0, 0);
            spot.castShadow = true;
            spot.target = new THREE.Object3D();
            this._scene.add(spot);

            spot = new THREE.SpotLight();
            spot.color = new THREE.Color(pointcolor);
            spot.position = new THREE.Vector3(0, -distance, 0);
            spot.castShadow = true;
            spot.target = new THREE.Object3D();
            this._scene.add(spot);

            spot = new THREE.SpotLight();
            spot.color = new THREE.Color(pointcolor);
            spot.position = new THREE.Vector3(0, distance, 0);
            spot.castShadow = true;
            spot.target = new THREE.Object3D();
            this._scene.add(spot);
        };

        StackRenderer.prototype.updateGridColor = function (val) {
            this._gridColor = parseInt(("0x" + val), 16);
            this._grid.liH.material.color.setHex(this._gridColor);
            this._grid.liV.material.color.setHex(this._gridColor);
        };

        StackRenderer.prototype.animate = function () {
            window.requestAnimationFrame(this.animate.bind(this));
            this.update();
            this.draw();
            this._stats.update();
        };

        StackRenderer.prototype.update = function () {
            if (StackRenderer.GlobalControlsEnabled) {
                this._cameraControls.enabled = true;
                this._cameraControls.update();
            } else {
                this._cameraControls.enabled = false;
            }

            if (this._voxelWorld) {
                this._voxelWorld.update(this._camera, this._lblVisibility);
                //this.MoveCursorCommand();
            }
        };

        StackRenderer.prototype.draw = function () {
            this._renderer.render(this._scene, this._camera);
        };

        StackRenderer.prototype.toggleGrid = function () {
            if (this._grid.liH.visible) {
                this._grid.liH.visible = false;
                this._grid.liV.visible = false;
            } else {
                this._grid.liH.visible = true;
                this._grid.liV.visible = true;
            }
        };

        StackRenderer.prototype.toggleMesh = function () {
            this._controlSphere.toggleVisibility();
            this._controlSphereInner.toggleVisibility();
        };

        StackRenderer.prototype.regenerateWithNewThreshold = function () {
            if (this._voxelWorld) {
                var slim = this._voxelWorld.getSlimWorldVoxelArray();
                ImageStackRenderingImplementation.StackRenderer.Worker.postMessage({ command: "calculateVoxelGeometry", data: slim, threshold: parseInt($('#amount').text()) });
            }
        };

        StackRenderer.prototype.loadDataImages = function (images) {
            this.ImageItems.removeAll();
            this.ImageItems.valueHasMutated();

            for (var i = 0; i < 21; i++) {
                this.ImageItems.push(new ImageItem('../data/' + images.toLowerCase() + '/' + i.toString() + '.jpg', i.toString()));
            }
        };

        StackRenderer.prototype.dataTypeSelectionChange = function (selection) {
            var _this = this;
            var file = 'spiral';

            if (selection === 'Perlin') {
                file = 'perlin';
            } else if (selection === 'Orb') {
                file = 'orb';
            } else if (selection === 'Spiral') {
                file = 'spiral';
            }

            $.ajax({
                dataType: "json",
                url: '../data/' + file + '/data.json',
                success: function (data) {
                    _this._voxelWorld.setNewVoxelWorldDataValues(data);
                    var slim = _this._voxelWorld.getSlimWorldVoxelArray();
                    ImageStackRenderingImplementation.StackRenderer.Worker.postMessage({ command: "calculateVoxelGeometry", data: slim, threshold: parseInt($('#amount').text()) });
                }
            });
        };

        StackRenderer.prototype.onMessageReceived = function (e) {
            if (e.data.commandReturn === 'calculatedVoxelGeometry') {
                this.setMesh(e.data.data);
            }
        };

        StackRenderer.prototype.setMesh = function (data) {
            for (var lvl = 0; lvl < data.length; lvl++) {
                for (var vox = 0; vox < data[lvl].length; vox++) {
                    if (data[lvl][vox].geometry) {
                        var geometry = new THREE.Geometry();
                        geometry.vertices = data[lvl][vox].geometry.vertices;
                        geometry.faces = data[lvl][vox].geometry.faces;
                        geometry.faceVertexUvs = data[lvl][vox].geometry.faceVertexUvs;

                        var m = new THREE.Mesh(geometry, this._phongMaterial);
                        this._voxelWorld.getLevel(lvl).getVoxel(vox).setMesh(this._scene, m);
                    }
                }
            }

            $('#loading').hide();
        };
        return StackRenderer;
    })();
    ImageStackRenderingImplementation.StackRenderer = StackRenderer;
})(ImageStackRenderingImplementation || (ImageStackRenderingImplementation = {}));
//# sourceMappingURL=StackRendering.js.map
