/// <reference path="../lib/three.d.ts" />
/// <reference path="../lib/jquery.d.ts"/>
/// <reference path="../lib/underscore.d.ts"/>
/// <reference path="./Sculpting2.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var Geometry;
(function (Geometry) {
    var GeometryHelper = (function () {
        function GeometryHelper() {
        }
        GeometryHelper.calculateDistanceBetweenTwoVector3 = function (origin, target) {
            var temp = GeometryHelper.vectorBminusVectorA(target, origin);
            return temp.length();
        };

        GeometryHelper.vectorBminusVectorA = function (b, a) {
            var temp = new THREE.Vector3();
            return temp.subVectors(b, a);
        };

        GeometryHelper.calculateShortestDistanceFromPointToLine = function (origin, start, finish) {
            var lineMag = new THREE.Vector3();
            lineMag.subVectors(finish, start);
            var len = lineMag.length();

            var u = (((origin.x - start.x) * (finish.x - start.x)) + ((origin.y - start.y) * (finish.y - start.y)) + ((origin.z - start.z) * (finish.z - start.z))) / (Math.pow(len, 2));

            var x = start.x + u * (finish.x - start.x);
            var y = start.y + u * (finish.y - start.y);
            var z = start.z + u * (finish.z - start.z);

            var poc = new THREE.Vector3(x, y, z);
            var l = (poc.sub(origin)).length();

            return l;
        };

        GeometryHelper.calculateShortestDistanceToPlane = function (origin, pointOnPlane, normal) {
            return Math.abs(GeometryHelper.vectorBminusVectorA(origin, pointOnPlane).dot(normal) / normal.length());
        };
        return GeometryHelper;
    })();
    Geometry.GeometryHelper = GeometryHelper;

    var MeshExtended = (function (_super) {
        __extends(MeshExtended, _super);
        function MeshExtended(scene, geo, mat) {
            _super.call(this);
            this.positionRef = [];
            this._scene = scene;
            this.geometry = geo;
            this.material = mat;
            this._normal = new THREE.Vector3();
            this._lineGeo = new THREE.Geometry();
            this._lineGeo.vertices.push(new THREE.Vector3, new THREE.Vector3);

            this._lineGeo.computeLineDistances();
            this._lineGeo.dynamic = true;
            this._lineMaterial = new THREE.LineBasicMaterial({ color: 0xCC0000 });
            this._line = new THREE.Line(this._lineGeo, this._lineMaterial);
            this._scene.add(this._line);

            this.geometry.verticesNeedUpdate = true;
            this.geometry.normalsNeedUpdate = true;
        }
        MeshExtended.prototype.updateVertices = function () {
            this.geometry.vertices = [];
            this.geometry.vertices.push(this.positionRef[0].position, this.positionRef[1].position, this.positionRef[2].position);
            this.geometry.verticesNeedUpdate = true;
            this.geometry.elementsNeedUpdate = true;

            // this.geometry.morphTargetsNeedUpdate = true;
            this.geometry.uvsNeedUpdate = true;
            this.geometry.normalsNeedUpdate = true;
            this.geometry.colorsNeedUpdate = true;
            this.geometry.tangentsNeedUpdate = true;
        };

        MeshExtended.prototype.calculateNormal = function () {
            this.geometry.computeCentroids();
            this.geometry.computeFaceNormals();
            this.geometry.computeVertexNormals();

            var vector1 = new THREE.Vector3();
            var vector2 = new THREE.Vector3();
            var crossedVector = new THREE.Vector3();

            vector1.subVectors(this.positionRef[2].position, this.positionRef[0].position);
            vector2.subVectors(this.positionRef[1].position, this.positionRef[0].position);
            crossedVector.crossVectors(vector2, vector1).normalize().multiplyScalar(5);

            var headOfNormal = new THREE.Vector3();
            headOfNormal.addVectors(this.geometry.faces[0].centroid, crossedVector);

            this._line.geometry.vertices[0] = this.geometry.faces[0].centroid;
            this._line.geometry.vertices[1] = headOfNormal;

            this._normal.subVectors(this._line.geometry.vertices[0], this._line.geometry.vertices[1]).normalize();

            this._lineGeo.verticesNeedUpdate = true;
        };

        MeshExtended.prototype.getNormal = function () {
            return this._normal;
        };
        return MeshExtended;
    })(THREE.Mesh);
    Geometry.MeshExtended = MeshExtended;

    

    var Vector3Extended = (function (_super) {
        __extends(Vector3Extended, _super);
        function Vector3Extended(x, y, z) {
            _super.call(this, x, y, z);
        }
        Vector3Extended.prototype.equalsWithinTolerence = function (other, tolerence) {
            var dist = this.distanceTo(other);
            return dist <= tolerence;
        };
        return Vector3Extended;
    })(THREE.Vector3);
    Geometry.Vector3Extended = Vector3Extended;

    var Node = (function (_super) {
        __extends(Node, _super);
        function Node(geom, mat) {
            _super.call(this);
            this.geometry = geom;
            this.material = mat;
            this._velocity = new THREE.Vector3();
            this._neighbourhoodNodes = new Collection();
        }
        Node.prototype.getId = function () {
            return this.id;
        };

        Node.prototype.getMass = function () {
            return this._mass;
        };

        Node.prototype.setMass = function (mass) {
            this._mass = mass;
        };

        Node.prototype.getVelocity = function () {
            return this._velocity;
        };

        Node.prototype.setVelocity = function (velocity) {
            this._velocity = velocity;
        };

        Node.prototype.addToNeigbourhoodNodes = function (node) {
            this._neighbourhoodNodes.add(node);
        };

        Node.prototype.getNeigbourhoodNodes = function () {
            return this._neighbourhoodNodes;
        };

        Node.prototype.getNodePosition = function () {
            return this.position;
        };

        Node.prototype.setNodePosition = function (position) {
            this.position = position;
        };

        Node.prototype.update = function (delta, force) {
            this.getVelocity().add(force);
            this.getVelocity().multiplyScalar(delta);
            this.getNodePosition().add(this._velocity);
        };
        return Node;
    })(THREE.Mesh);
    Geometry.Node = Node;

    var Spring = (function () {
        function Spring(scene, node1, node2, strength, length) {
            this._visible = false;
            this._node1 = node1;
            this._node2 = node2;
            this._length = length;
            this._strength = strength;
            this._distance = this._node1.getNodePosition().distanceTo(this._node2.getNodePosition());

            // Helper / Debug code
            this._lineGeo = new THREE.Geometry();
            this._lineGeo.vertices.push(this._node1.getNodePosition(), this._node2.getNodePosition());
            this._lineGeo.computeLineDistances();
            this._lineGeo.dynamic = true;

            var lineMAT = new THREE.LineBasicMaterial({ color: 0xCC0000 });
            this._line = new THREE.Line(this._lineGeo, lineMAT);
            this._line.visible = this._visible;

            scene.add(this._line);
        }
        Spring.prototype.update = function (delta) {
            var force = (this._length - this.getDistance()) * this._strength;

            var a1 = force / this._node1.getMass();
            var a2 = force / this._node2.getMass();

            var n1 = new THREE.Vector3, n2 = new THREE.Vector3;

            n1.subVectors(this._node1.getNodePosition(), this._node2.getNodePosition()).normalize().multiplyScalar(a1);
            n2.subVectors(this._node2.getNodePosition(), this._node1.getNodePosition()).normalize().multiplyScalar(a2);

            this._node1.update(delta, n1);
            this._node2.update(delta, n2);

            this._lineGeo.vertices[0] = this._node1.getNodePosition();
            this._lineGeo.vertices[1] = this._node2.getNodePosition();

            this._lineGeo.verticesNeedUpdate = true;
        };

        Spring.prototype.getDistance = function () {
            return this._node1.getNodePosition().distanceTo(this._node2.getNodePosition());
        };
        return Spring;
    })();
    Geometry.Spring = Spring;

    var Sphere2 = (function () {
        function Sphere2(x, y, z, r) {
            this.radius = r;
            this.center = new THREE.Vector3(x, y, z);
        }
        Sphere2.prototype.isColliding = function (position) {
            var distance = this.center.distanceTo(position);
            return distance < this.radius;
        };
        return Sphere2;
    })();
    Geometry.Sphere2 = Sphere2;

    var GridCreator = (function () {
        function GridCreator(wSize, bSize, gridColor) {
            this._geo = new THREE.Geometry();
            this._color = 0x25F500;
            this._gridMaterial = new THREE.LineBasicMaterial({ color: this._color, opacity: 0.5 });
            this._size = wSize / 2;
            this._blockSize = bSize;
            this._color = gridColor;
        }
        GridCreator.prototype.buildAxisAligned2DGrids = function () {
            for (var i = -this._size; i <= this._size; i += this._blockSize) {
                for (var level = -this._size; level <= this._size; level += this._blockSize) {
                    this._geo.vertices.push(new THREE.Vector3(-this._size, level, i));
                    this._geo.vertices.push(new THREE.Vector3(this._size, level, i));
                    this._geo.vertices.push(new THREE.Vector3(i, level, -this._size));
                    this._geo.vertices.push(new THREE.Vector3(i, level, this._size));
                }
            }
            return this._geo;
        };

        GridCreator.prototype.build3DGrid = function (geometryH, geometryV) {
            var lineH = new THREE.Line(geometryH, this._gridMaterial);
            var lineV = new THREE.Line(geometryV, this._gridMaterial);

            lineH.type = THREE.LinePieces;
            lineV.type = THREE.LinePieces;
            lineV.rotation.x = Math.PI / 2;

            return { liH: lineH, liV: lineV };
        };
        return GridCreator;
    })();
    Geometry.GridCreator = GridCreator;

    var Collection = (function () {
        function Collection() {
            this._array = [];
        }
        Collection.prototype.add = function (item) {
            this._array.push(item);
        };

        Collection.prototype.get = function (i) {
            return this._array[i];
        };

        Collection.prototype.length = function () {
            return this._array.length;
        };
        return Collection;
    })();
    Geometry.Collection = Collection;
})(Geometry || (Geometry = {}));

var Voxel;
(function (Voxel) {
    var VoxelCornerInfo = (function () {
        function VoxelCornerInfo(id) {
            this._id = id;
            this._inside = false;
            this._position = new THREE.Vector3(0, 0, 0);
            this._value = 0;
            this._connectedTo = [];
        }
        VoxelCornerInfo.prototype.getId = function () {
            return this._id;
        };

        VoxelCornerInfo.prototype.getIsInside = function () {
            return this._inside;
        };

        VoxelCornerInfo.prototype.setIsInside = function (isInside) {
            this._inside = isInside;
        };

        VoxelCornerInfo.prototype.setPostion = function (position) {
            this._position = position;
        };

        VoxelCornerInfo.prototype.getPosition = function () {
            return this._position;
        };

        VoxelCornerInfo.prototype.getValue = function () {
            return this._value;
        };

        VoxelCornerInfo.prototype.setValue = function (value) {
            this._value = value;
        };

        VoxelCornerInfo.prototype.getConnectedTo = function () {
            return this._connectedTo;
        };

        VoxelCornerInfo.prototype.setConnectedTo = function (points) {
            this._connectedTo = points;
        };

        VoxelCornerInfo.prototype.setVoxelValueAsDistanceToSpecifiedPosition = function (position) {
            this._value = this._position.distanceTo(position);
        };
        return VoxelCornerInfo;
    })();
    Voxel.VoxelCornerInfo = VoxelCornerInfo;

    var Verts = (function () {
        function Verts() {
            this.p0 = new VoxelCornerInfo('p0');
            this.p1 = new VoxelCornerInfo('p1');
            this.p2 = new VoxelCornerInfo('p2');
            this.p3 = new VoxelCornerInfo('p3');
            this.p4 = new VoxelCornerInfo('p4');
            this.p5 = new VoxelCornerInfo('p5');
            this.p6 = new VoxelCornerInfo('p6');
            this.p7 = new VoxelCornerInfo('p7');
        }
        return Verts;
    })();
    Voxel.Verts = Verts;

    var VoxelState2 = (function () {
        function VoxelState2(center, blockSize) {
            //super();
            this._mesh = null;
            this._centerPosition = center;
            this._blockSize = blockSize;
            this._verts = new Verts();
        }
        VoxelState2.prototype.getCenter = function () {
            return this._centerPosition;
        };

        VoxelState2.prototype.getVerts = function () {
            return this._verts;
        };

        VoxelState2.prototype.getMesh = function () {
            return this._mesh;
        };

        VoxelState2.prototype.setMesh = function (scene, mesh) {
            // find the mesh in the scene
            if (this._mesh != null) {
                scene.remove(scene.getObjectById(this._mesh.id, true));
                this._mesh = mesh;
                scene.add(this._mesh);
            } else {
                this._mesh = mesh;
                scene.add(this._mesh);
            }
        };

        VoxelState2.prototype.calculateVoxelVertexPositions = function () {
            this._verts.p0.setPostion(new THREE.Vector3(this._centerPosition.x - this._blockSize / 2, this._centerPosition.y - this._blockSize / 2, this._centerPosition.z - this._blockSize / 2)); //   -1, -1, -1 = 0
            this._verts.p1.setPostion(new THREE.Vector3(this._centerPosition.x + this._blockSize / 2, this._centerPosition.y - this._blockSize / 2, this._centerPosition.z - this._blockSize / 2)); //    1, -1, -1 = 1
            this._verts.p2.setPostion(new THREE.Vector3(this._centerPosition.x + this._blockSize / 2, this._centerPosition.y - this._blockSize / 2, this._centerPosition.z + this._blockSize / 2)); //    1, -1 , 1 = 2
            this._verts.p3.setPostion(new THREE.Vector3(this._centerPosition.x - this._blockSize / 2, this._centerPosition.y - this._blockSize / 2, this._centerPosition.z + this._blockSize / 2)); //   -1, -1 , 1 = 3
            this._verts.p4.setPostion(new THREE.Vector3(this._centerPosition.x - this._blockSize / 2, this._centerPosition.y + this._blockSize / 2, this._centerPosition.z - this._blockSize / 2)); //   -1,  1, -1 = 4
            this._verts.p5.setPostion(new THREE.Vector3(this._centerPosition.x + this._blockSize / 2, this._centerPosition.y + this._blockSize / 2, this._centerPosition.z - this._blockSize / 2)); //    1,  1, -1 = 5
            this._verts.p6.setPostion(new THREE.Vector3(this._centerPosition.x + this._blockSize / 2, this._centerPosition.y + this._blockSize / 2, this._centerPosition.z + this._blockSize / 2)); //    1,  1,  1 = 6
            this._verts.p7.setPostion(new THREE.Vector3(this._centerPosition.x - this._blockSize / 2, this._centerPosition.y + this._blockSize / 2, this._centerPosition.z + this._blockSize / 2)); //    -1,  1,  1 = 7
        };

        VoxelState2.prototype.setVertexValues = function () {
            // TODO
        };

        VoxelState2.prototype.setConnectedTos = function () {
            this._verts.p0.setConnectedTo([this._verts.p1, this._verts.p3, this._verts.p4]);
            this._verts.p1.setConnectedTo([this._verts.p0, this._verts.p2, this._verts.p5]);
            this._verts.p2.setConnectedTo([this._verts.p1, this._verts.p3, this._verts.p6]);
            this._verts.p3.setConnectedTo([this._verts.p0, this._verts.p2, this._verts.p7]);

            this._verts.p4.setConnectedTo([this._verts.p0, this._verts.p5, this._verts.p7]);
            this._verts.p5.setConnectedTo([this._verts.p1, this._verts.p4, this._verts.p6]);
            this._verts.p6.setConnectedTo([this._verts.p2, this._verts.p5, this._verts.p7]);
            this._verts.p7.setConnectedTo([this._verts.p3, this._verts.p4, this._verts.p6]);
        };
        return VoxelState2;
    })();
    Voxel.VoxelState2 = VoxelState2;

    var Level = (function () {
        function Level() {
            this._level = new Array();
        }
        Level.prototype.addToLevel = function (vox) {
            this._level.push(vox);
        };

        Level.prototype.getAllVoxelsAtThisLevel = function () {
            return this._level;
        };

        Level.prototype.getVoxel = function (voxel) {
            return this._level[voxel];
        };
        return Level;
    })();
    Voxel.Level = Level;

    var VoxelWorld = (function () {
        function VoxelWorld(worldSize, voxelSize, scene) {
            this._sceneRef = scene;
            this._worldSize = worldSize;
            this._voxelSize = voxelSize;

            this._worldVoxelArray = [];
            this._voxelPerLevel = Math.pow(worldSize / voxelSize, 2);
            this._numberlevels = Math.sqrt(this._voxelPerLevel);

            this.buildWorldVoxelPositionArray();
        }
        VoxelWorld.prototype.getWorldVoxelArray = function () {
            return this._worldVoxelArray;
        };

        VoxelWorld.prototype.getLevel = function (level) {
            return this._worldVoxelArray[level];
        };

        VoxelWorld.prototype.getNumberOfVoxelsPerLevel = function () {
            return this._voxelPerLevel;
        };

        VoxelWorld.prototype.getNumberOfLevelsInVoxelWorld = function () {
            return this._numberlevels;
        };

        VoxelWorld.prototype.buildWorldVoxelPositionArray = function () {
            this._level = new Level;
            this._start = new THREE.Vector3(-this._worldSize / 2, -this._worldSize / 2, -this._worldSize / 2);

            var x = this._start.x, z = this._start.z, y = this._start.y;

            while (y < this._worldSize / 2) {
                while (z < this._worldSize / 2) {
                    while (x < this._worldSize / 2) {
                        var voxel = new VoxelState2(new THREE.Vector3(x + this._voxelSize / 2, y + this._voxelSize / 2, z + this._voxelSize / 2), this._voxelSize);
                        voxel.calculateVoxelVertexPositions();
                        voxel.setConnectedTos();
                        this._level.addToLevel(voxel);

                        //this._sceneRef.add(voxel);
                        x += this._voxelSize;
                    }

                    z += this._voxelSize;
                    x = this._start.x;
                }

                this._worldVoxelArray.push(this._level);
                this._level = new Level;

                y += this._voxelSize;
                x = this._start.x;
                z = this._start.z;
            }
        };
        return VoxelWorld;
    })();
    Voxel.VoxelWorld = VoxelWorld;

    var MarchingCubeRendering = (function () {
        function MarchingCubeRendering() {
        }
        //Marching cube algorithm that evaluates per voxel
        MarchingCubeRendering.MarchingCube = function (voxel, isolevel, material) {
            var geometry = new THREE.Geometry();
            var vertexIndex = 0;
            var vertexlist = [];

            var cubeIndex = 0;

            if (voxel.getVerts().p0.getValue() < isolevel) {
                cubeIndex |= 1;
                voxel.getVerts().p0.setIsInside(true);
            }
            if (voxel.getVerts().p1.getValue() < isolevel) {
                cubeIndex |= 2;
                voxel.getVerts().p1.setIsInside(true);
            }
            if (voxel.getVerts().p2.getValue() < isolevel) {
                cubeIndex |= 4;
                voxel.getVerts().p2.setIsInside(true);
            }
            if (voxel.getVerts().p3.getValue() < isolevel) {
                cubeIndex |= 8;
                voxel.getVerts().p3.setIsInside(true);
            }
            if (voxel.getVerts().p4.getValue() < isolevel) {
                cubeIndex |= 16;
                voxel.getVerts().p4.setIsInside(true);
            }
            if (voxel.getVerts().p5.getValue() < isolevel) {
                cubeIndex |= 32;
                voxel.getVerts().p5.setIsInside(true);
            }
            if (voxel.getVerts().p6.getValue() < isolevel) {
                cubeIndex |= 64;
                voxel.getVerts().p6.setIsInside(true);
            }
            if (voxel.getVerts().p7.getValue() < isolevel) {
                cubeIndex |= 128;
                voxel.getVerts().p7.setIsInside(true);
            }

            var bits = THREE.edgeTable[cubeIndex];

            //if (bits === 0 ) continue;
            if (bits & 1) {
                vertexlist[0] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p0.getPosition(), voxel.getVerts().p1.getPosition(), voxel.getVerts().p0.getValue(), voxel.getVerts().p1.getValue());
            }
            if (bits & 2) {
                vertexlist[1] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p1.getPosition(), voxel.getVerts().p2.getPosition(), voxel.getVerts().p1.getValue(), voxel.getVerts().p2.getValue());
            }
            if (bits & 4) {
                vertexlist[2] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p2.getPosition(), voxel.getVerts().p3.getPosition(), voxel.getVerts().p2.getValue(), voxel.getVerts().p3.getValue());
            }
            if (bits & 8) {
                vertexlist[3] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p3.getPosition(), voxel.getVerts().p0.getPosition(), voxel.getVerts().p3.getValue(), voxel.getVerts().p0.getValue());
            }
            if (bits & 16) {
                vertexlist[4] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p4.getPosition(), voxel.getVerts().p5.getPosition(), voxel.getVerts().p4.getValue(), voxel.getVerts().p5.getValue());
            }
            if (bits & 32) {
                vertexlist[5] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p5.getPosition(), voxel.getVerts().p6.getPosition(), voxel.getVerts().p5.getValue(), voxel.getVerts().p6.getValue());
            }
            if (bits & 64) {
                vertexlist[6] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p6.getPosition(), voxel.getVerts().p7.getPosition(), voxel.getVerts().p6.getValue(), voxel.getVerts().p7.getValue());
            }
            if (bits & 128) {
                vertexlist[7] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p7.getPosition(), voxel.getVerts().p4.getPosition(), voxel.getVerts().p7.getValue(), voxel.getVerts().p4.getValue());
            }
            if (bits & 256) {
                vertexlist[8] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p0.getPosition(), voxel.getVerts().p4.getPosition(), voxel.getVerts().p0.getValue(), voxel.getVerts().p4.getValue());
            }
            if (bits & 512) {
                vertexlist[9] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p1.getPosition(), voxel.getVerts().p5.getPosition(), voxel.getVerts().p1.getValue(), voxel.getVerts().p5.getValue());
            }
            if (bits & 1024) {
                vertexlist[10] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p2.getPosition(), voxel.getVerts().p6.getPosition(), voxel.getVerts().p2.getValue(), voxel.getVerts().p6.getValue());
            }
            if (bits & 2048) {
                vertexlist[11] = MarchingCubeRendering.VertexInterpolate(isolevel, voxel.getVerts().p3.getPosition(), voxel.getVerts().p7.getPosition(), voxel.getVerts().p3.getValue(), voxel.getVerts().p7.getValue());
            }

            // The following is from Lee Stemkoski's example and
            // deals with construction of the polygons and adding to
            // the scene.
            // http://stemkoski.github.io/Three.js/Marching-Cubes.html
            // construct triangles -- get correct vertices from triTable.
            var i = 0;
            cubeIndex <<= 4; // multiply by 16...

            while (THREE.triTable[cubeIndex + i] != -1) {
                var index1 = THREE.triTable[cubeIndex + i];
                var index2 = THREE.triTable[cubeIndex + i + 1];
                var index3 = THREE.triTable[cubeIndex + i + 2];
                geometry.vertices.push(vertexlist[index1].clone());
                geometry.vertices.push(vertexlist[index2].clone());
                geometry.vertices.push(vertexlist[index3].clone());
                var face = new THREE.Face3(vertexIndex, vertexIndex + 1, vertexIndex + 2);
                geometry.faces.push(face);
                geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1)]);
                vertexIndex += 3;
                i += 3;
            }

            geometry.computeCentroids();
            geometry.computeFaceNormals();
            geometry.computeVertexNormals();

            return new THREE.Mesh(geometry, material);
        };

        MarchingCubeRendering.VertexInterpolate = function (threshold, p1pos, p2pos, v1Value, v2Value) {
            var mu = (threshold - v1Value) / (v2Value - v1Value);

            var p = new THREE.Vector3();

            if (Math.abs(threshold - v1Value) < 0.00001)
                return p1pos;
            if (Math.abs(threshold - v2Value) < 0.00001)
                return p2pos;
            if (Math.abs(v1Value - v2Value) < 0.00001)
                return p1pos;

            p.x = p1pos.x + mu * (p2pos.x - p1pos.x);
            p.y = p1pos.y + mu * (p2pos.y - p1pos.y);
            p.z = p1pos.z + mu * (p2pos.z - p1pos.z);

            return p;
        };
        return MarchingCubeRendering;
    })();
    Voxel.MarchingCubeRendering = MarchingCubeRendering;
})(Voxel || (Voxel = {}));

var Helper;
(function (Helper) {
    var jqhelper = (function () {
        function jqhelper() {
        }
        jqhelper.getScreenWH = function (id) {
            var wh = [];
            var w = $(id).width();
            var h = $(id).height();
            wh.push(w, h);
            return wh;
        };

        jqhelper.appendToScene = function (id, renderer) {
            $(id).append(renderer.domElement);
        };
        return jqhelper;
    })();
    Helper.jqhelper = jqhelper;
})(Helper || (Helper = {}));

var Controller;
(function (Controller) {
    var ControlSphere = (function () {
        function ControlSphere(segments, radius, scene, size, velocity, mass) {
            this.N = segments;
            this.M = segments;
            this.radius = radius;
            this._scene = scene;
            this._nodeSize = size;
            this._nodeVelocity = velocity;
            this._nodeMass = mass;
            this._nodes = [];
            this._faces = [];
            this._octreeForFaces = new THREE.Octree();
            this._octreeForNodes = new THREE.Octree();
        }
        ControlSphere.prototype.getNodes = function () {
            return this._nodes;
        };

        ControlSphere.prototype.getSphereSkeleton = function () {
            return this._sphereSkeleton;
        };

        ControlSphere.prototype.getOctreeForNodes = function () {
            return this._octreeForNodes;
        };

        ControlSphere.prototype.getOctreeForFaces = function () {
            return this._octreeForFaces;
        };

        ControlSphere.prototype.toggleVisibility = function () {
            for (var i = 0; i < this._faces.length; i++) {
                this._faces[i].visible = this._faces[i].visible === true ? false : true;
            }

            for (var i = 0; i < this._nodes.length; i++) {
                this._nodes[i].visible = this._nodes[i].visible === true ? false : true;
            }
        };

        ControlSphere.prototype.generateSphereVerticesandLineConnectors = function () {
            var points = [];
            var lines = [];
            for (var m = 0; m < this.M + 1; m++)
                for (var n = 0; n < this.N; n++) {
                    // http://stackoverflow.com/a/4082020
                    var x = (Math.sin(Math.PI * m / this.M) * Math.cos(2 * Math.PI * n / this.N)) * this.radius;
                    var y = (Math.sin(Math.PI * m / this.M) * Math.sin(2 * Math.PI * n / this.N)) * this.radius;
                    var z = (Math.cos(Math.PI * m / this.M)) * this.radius;

                    var p = new Geometry.Vector3Extended(x, y, z);

                    points.push(p);
                }

            for (var s = 0; s < points.length - this.N; s++) {
                var lineGeo = new THREE.Geometry();
                lineGeo.vertices.push(points[s], points[s + this.N]);

                lineGeo.computeLineDistances();

                var lineMaterial = new THREE.LineBasicMaterial({ color: 0xCC0000 });
                var line = new THREE.Line(lineGeo, lineMaterial);

                lines.push(line);
            }

            // Draw lines along latitude
            var count = 0;
            for (var s = this.N; s < points.length - this.N; s++) {
                var a, b;

                if (count === this.N - 1) {
                    a = points[s];
                    b = points[s - this.N + 1];
                    count = 0;
                } else {
                    a = points[s];
                    b = points[s + 1];
                    count++;
                }

                var lineGeo = new THREE.Geometry();
                lineGeo.vertices.push(a, b);

                lineGeo.computeLineDistances();

                var lineMaterial = new THREE.LineBasicMaterial({ color: 0xCC0000 });
                var line = new THREE.Line(lineGeo, lineMaterial);

                lines.push(line);
            }

            // trim start and end
            var unique = points.slice(this.N - 1, points.length - this.N + 1);

            this._sphereSkeleton = { points: unique, lines: lines };
        };

        ControlSphere.prototype.generateSphere = function () {
            this.generateSphereVerticesandLineConnectors();

            for (var i = 0; i < this._sphereSkeleton.points.length; i++) {
                var point = this._sphereSkeleton.points[i];
                var geometry = new THREE.SphereGeometry(this._nodeSize, 5, 5);
                var material = new THREE.MeshBasicMaterial({ color: 0x8888ff });
                var node = new Geometry.Node(geometry, material);
                node.setNodePosition(point);
                node.setVelocity(this._nodeVelocity);
                node.setMass(this._nodeMass);
                node.visible = true;
                this._scene.add(node);
                this._nodes.push(node);
                this._octreeForNodes.add(node);
            }

            this.calculateFaces();
        };

        ControlSphere.prototype.calculateFaces = function () {
            var positions = [];

            _.each(this._nodes, function (item) {
                positions.push({ id: item.getId(), position: item.getNodePosition() });
            });

            Implementation.Sculpt2.Worker.postMessage({ command: "calculateMeshFacePositions2", particles: JSON.stringify(positions), segments: this.N });
        };

        ControlSphere.calculateMeshFacePositions = function (particles, segments) {
            var particles = JSON.parse(particles);
            var listOfObjects = [];
            var beginningOfOtherPole = particles.length;
            var current = 0;

            while (current < beginningOfOtherPole) {
                if (current < segments) {
                    var theFirstPole = 0;
                    var theOtherPole = particles.length - 1;

                    if (current === segments - 1) {
                        listOfObjects.push({
                            a: { pos: particles[theFirstPole].position, nodeId: particles[theFirstPole].id },
                            b: { pos: particles[current + 1].position, nodeId: particles[current + 1].id },
                            c: { pos: particles[theFirstPole + 1].position, nodeId: particles[theFirstPole + 1].id }
                        });

                        listOfObjects.push({
                            a: { pos: particles[theOtherPole].position, nodeId: particles[theOtherPole].id },
                            b: { pos: particles[(particles.length - 1) - current - 1].position, nodeId: particles[(particles.length - 1) - current - 1].id },
                            c: { pos: particles[particles.length - 2].position, nodeId: particles[particles.length - 2].id }
                        });
                    } else {
                        listOfObjects.push({
                            a: { pos: particles[theFirstPole].position, nodeId: particles[theFirstPole].id },
                            b: { pos: particles[current + 1].position, nodeId: particles[current + 1].id },
                            c: { pos: particles[current + 2].position, nodeId: particles[current + 2].id }
                        });

                        listOfObjects.push({
                            a: { pos: particles[theOtherPole].position, nodeId: particles[theOtherPole].id },
                            b: { pos: particles[(particles.length - 1) - current - 1].position, nodeId: particles[(particles.length - 1) - current - 1].id },
                            c: { pos: particles[(particles.length - 1) - current - 2].position, nodeId: particles[(particles.length - 1) - current - 2].id }
                        });
                    }
                } else if (current >= segments + 1 && current < beginningOfOtherPole - 1) {
                    if (current % segments > 0) {
                        listOfObjects.push({
                            a: { pos: particles[current].position, nodeId: particles[current].id },
                            b: { pos: particles[current + 1].position, nodeId: particles[current + 1].id },
                            c: { pos: particles[current - segments].position, nodeId: particles[current - segments].id }
                        });
                        listOfObjects.push({
                            a: { pos: particles[current + 1].position, nodeId: particles[current + 1].id },
                            b: { pos: particles[current - (segments - 1)].position, nodeId: particles[current - (segments - 1)].id },
                            c: { pos: particles[current - segments].position, nodeId: particles[current - segments].id }
                        });
                    } else {
                        listOfObjects.push({
                            a: { pos: particles[current - segments].position, nodeId: particles[current - segments].id },
                            b: { pos: particles[current].position, nodeId: particles[current].id },
                            c: { pos: particles[current - segments + 1].position, nodeId: particles[current - segments + 1].id }
                        });
                        listOfObjects.push({
                            a: { pos: particles[current - segments].position, nodeId: particles[current - segments].id },
                            b: { pos: particles[current - segments + 1].position, nodeId: particles[current - segments + 1].id },
                            c: { pos: particles[current - (segments * 2) + 1].position, nodeId: particles[current - (segments * 2) + 1].id }
                        });
                    }
                }

                current++;
            }

            return listOfObjects;
        };

        ControlSphere.prototype.addFaces = function (verts) {
            var geom;
            for (var i = 0; i < verts.length; i++) {
                var item = verts[i];

                geom = new THREE.Geometry();
                geom.vertices.push(item.a.pos, item.b.pos, item.c.pos);
                geom.faces.push(new THREE.Face3(0, 1, 2));

                geom.computeCentroids();
                geom.computeFaceNormals();
                geom.computeVertexNormals();

                var mat = new THREE.MeshNormalMaterial({ color: 0xF50000 });
                mat.side = THREE.DoubleSide;

                //mat.visible = false;
                var object = new Geometry.MeshExtended(this._scene, geom, mat);
                object.positionRef.push(this._scene.getObjectById(item.a.nodeId, true), this._scene.getObjectById(item.b.nodeId, true), this._scene.getObjectById(item.c.nodeId, true));

                this._faces.push(object);
                this._scene.add(object);
                this._octreeForFaces.add(object);
            }
        };

        ControlSphere.prototype.update = function () {
            if (this._faces) {
                this._faces.forEach(function (face) {
                    face.updateVertices();
                    face.calculateNormal();
                });
            }

            if (this._octreeForFaces && this._octreeForNodes) {
                this._octreeForFaces.update();
                this._octreeForNodes.update();
            }
        };
        return ControlSphere;
    })();
    Controller.ControlSphere = ControlSphere;
})(Controller || (Controller = {}));

var BusinessLogic;
(function (BusinessLogic) {
    var Person = (function () {
        function Person(name) {
            this._name = name;
        }
        Person.prototype.getName = function () {
            return this._name;
        };
        return Person;
    })();
    BusinessLogic.Person = Person;

    var Employee = (function (_super) {
        __extends(Employee, _super);
        function Employee(name, jobRole, annualSalary) {
            _super.call(this, name);
            this._jobRole = jobRole;
            this._annualSalary = annualSalary;
        }
        Employee.prototype.getRole = function () {
            return this._jobRole;
        };

        Employee.prototype.getAnnualSalary = function () {
            return this._annualSalary;
        };

        Employee.prototype.getEmployeeDetails = function () {
            return "Name: " + this.getName() + "\nRole: " + this.getRole() + "\nAnnualSalary: " + this.getAnnualSalary();
        };
        return Employee;
    })(Person);
    BusinessLogic.Employee = Employee;
})(BusinessLogic || (BusinessLogic = {}));
//# sourceMappingURL=Utils2.js.map