/**
* ##Marching cube code inspired from##
* http://stemkoski.github.io/Three.js/Marching-Cubes.html
* &
* http://paulbourke.net/geometry/polygonise/
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../lib/three.d.ts" />
/// <reference path="../lib/jquery.d.ts"/>
/// <reference path="../lib/underscore.d.ts"/>
/// <reference path="./Sculpting2.ts"/>
/// <reference path="./StackRendering.ts"/>

var GUIUTILS;
(function (GUIUTILS) {
    var Button = (function () {
        function Button(id, name, tooltip, command) {
            this.Id = id;
            this.Name = name;
            this.Tooltip = tooltip;
            this.Command = command;
        }
        return Button;
    })();
    GUIUTILS.Button = Button;

    var GUI = (function () {
        function GUI() {
            this.buttons = ko.observableArray();
            ko.applyBindings(this, $('#buttons')[0]);
        }
        GUI.prototype.onButtonClick = function (b) {
            b.Command.execute();
        };

        GUI.prototype.addButton = function (button) {
            this.buttons.push(button);
            console.log();
        };
        return GUI;
    })();
    GUIUTILS.GUI = GUI;

    var InfoViewModel = (function () {
        function InfoViewModel() {
            this.CursorPos = ko.observable();
            this.CursorLvl = ko.observable();
            this.DebugMsg = ko.observable();
        }
        return InfoViewModel;
    })();
    GUIUTILS.InfoViewModel = InfoViewModel;
})(GUIUTILS || (GUIUTILS = {}));

var Geometry;
(function (Geometry) {
    var Line = (function () {
        function Line(start, end) {
            this.start = start;
            this.end = end;
        }
        Line.prototype.getDirection = function () {
            var temp = new THREE.Vector3();
            temp.subVectors(this.end, this.start).normalize;
            return temp;
        };

        Line.prototype.equals = function (other) {
            if (other.start.equals(this.start) && other.end.equals(this.end))
                return true;
            return false;
        };
        return Line;
    })();
    Geometry.Line = Line;

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

        // Author  : Cyrille Ka
        // Source  : http://stackoverflow.com/a/328122
        // Purpose : determine if a point lies between two points on a line segment
        // Additional reference: http://www.mathworks.com/matlabcentral/newsreader/view_thread/170200
        GeometryHelper.isBetween = function (a, b, c) {
            var epsilon = 0.001;

            // (b - c) x (a - b) = 0
            var b_minus_c = new THREE.Vector3();
            b_minus_c.subVectors(b, c);
            var a_minus_b = new THREE.Vector3();
            a_minus_b.subVectors(b, a);
            var cross = new Geometry.Vector3Extended();
            cross.crossVectors(b_minus_c, a_minus_b);
            if (Math.abs(cross.x) > epsilon || Math.abs(cross.y) > epsilon || Math.abs(cross.z) > epsilon)
                return false;

            var b_minus_a = new THREE.Vector3();
            b_minus_a.subVectors(b, a);
            var c_minus_a = new THREE.Vector3();
            c_minus_a.subVectors(c, a);
            var dot = b_minus_a.dot(c_minus_a);
            if (dot < 0)
                return false;

            var lengthSqrd = Math.pow(b_minus_a.length(), 2);
            if (dot > lengthSqrd)
                return false;

            return true;
        };

        GeometryHelper.shortestDistanceBetweenTwoVector3 = function (point, v1, v2) {
            var distance1 = point.distanceTo(v1);
            var distance2 = point.distanceTo(v2);

            if (distance1 < distance2)
                return distance1;
            else
                return distance2;
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

        MeshExtended.prototype.calculateNormal = function (inverted) {
            this.geometry.computeCentroids();
            this.geometry.computeFaceNormals();
            this.geometry.computeVertexNormals();

            var vector1 = new THREE.Vector3();
            var vector2 = new THREE.Vector3();
            var crossedVector = new THREE.Vector3();

            if (inverted === 1) {
                vector1.subVectors(this.positionRef[2].position, this.positionRef[0].position);
                vector2.subVectors(this.positionRef[1].position, this.positionRef[0].position);
                crossedVector.crossVectors(vector2, vector1).normalize().multiplyScalar(-5);
            } else if (inverted === 0) {
                vector1.subVectors(this.positionRef[2].position, this.positionRef[0].position);
                vector2.subVectors(this.positionRef[1].position, this.positionRef[0].position);
                crossedVector.crossVectors(vector2, vector1).normalize().multiplyScalar(5);
            }

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

        MeshExtended.prototype.toggleNormalVisibility = function () {
            this._line.visible = this._line.visible !== true;
        };
        return MeshExtended;
    })(THREE.Mesh);
    Geometry.MeshExtended = MeshExtended;

    var Vector3Extended = (function (_super) {
        __extends(Vector3Extended, _super);
        function Vector3Extended(x, y, z) {
            var _x = (x === undefined) ? 0 : x;
            var _y = (y === undefined) ? 0 : y;
            var _z = (z === undefined) ? 0 : z;

            _super.call(this, _x, _y, _z);
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

    

    var ConcreteIterator = (function () {
        function ConcreteIterator(array) {
            this.collection = array;
            this.position = 0;
        }
        ConcreteIterator.prototype.hasNext = function () {
            return this.position < this.collection.length ? true : false;
        };

        ConcreteIterator.prototype.next = function () {
            try  {
                var result = this.collection[this.position];
                this.position++;
                return result;
            } catch (e) {
                throw "Out of range exception";
            }

            return undefined;
        };
        return ConcreteIterator;
    })();

    var Collection = (function () {
        function Collection() {
            this._array = [];
        }
        Collection.prototype.add = function (item) {
            this._array.push(item);
        };

        Collection.prototype.addUnique = function (item) {
            if (this._array.length === 0) {
                this._array.push(item);
            } else {
                if (!this.contains(item, function (a, b) {
                    if (a.equals(b))
                        return true;
                    else
                        return false;
                })) {
                    this._array.push(item);
                }
            }
        };

        Collection.prototype.get = function (i) {
            return this._array[i];
        };

        Collection.prototype.length = function () {
            return this._array.length;
        };

        Collection.prototype.makeUnique = function () {
            var uniq = new Collection();

            for (var i = 0; i < this._array.length; i++) {
                if (!uniq.contains(this._array[i], function (a, b) {
                    if (a.equals(b))
                        return true;
                    else
                        return false;
                })) {
                    uniq.add(this._array[i]);
                }
            }

            var iter = uniq.createInterator();
            this._array = [];

            while (iter.hasNext()) {
                this._array.push(iter.next());
            }
        };

        Collection.prototype.createInterator = function () {
            return new ConcreteIterator(this._array);
        };

        Collection.prototype.contains = function (value, equalsFunction) {
            if (this._array.length > 0) {
                for (var i = 0; i < this._array.length; i++) {
                    if (equalsFunction(value, this._array[i]))
                        return true;
                }
            }
            return false;
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
            this._containedInRayLine = new Geometry.Collection();
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
            this._value = Math.abs(this._position.distanceTo(position));
        };

        VoxelCornerInfo.prototype.isPointContainedInAnyRayLines = function (allTheHorizontalLines, allTheVerticalLines) {
            var result = false;

            for (var i = 0; i < allTheVerticalLines.length(); i++) {
                if (Geometry.GeometryHelper.isBetween(allTheVerticalLines.get(i).start, allTheVerticalLines.get(i).end, this.getPosition()) === true) {
                    this._containedInRayLine.addUnique(allTheVerticalLines.get(i));
                    result = true;
                }
            }
            for (var i = 0; i < allTheHorizontalLines.length(); i++) {
                if (Geometry.GeometryHelper.isBetween(allTheHorizontalLines.get(i).start, allTheHorizontalLines.get(i).end, this.getPosition()) === true) {
                    this._containedInRayLine.addUnique(allTheHorizontalLines.get(i));
                    result = true;
                }
            }
            return result;
        };

        VoxelCornerInfo.prototype.isPointContainedInRayLine = function (rayline) {
            if (!rayline) {
                console.log();
            }

            if (Geometry.GeometryHelper.isBetween(rayline.start, rayline.end, this.getPosition()) === true) {
                return true;
            }

            return false;
        };

        VoxelCornerInfo.prototype.getAllContainingRayLines = function () {
            return this._containedInRayLine;
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
            this._mesh = new THREE.Mesh;
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
            // find the mesh in the scene and replace it with new mesh
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

        VoxelState2.prototype.calculateVoxelVertexValuesFromJSONPixelDataFile = function (voxpos, voxlvl, data) {
            //this._verts.p0.setValue(0);
            var forTheBtm = data[voxlvl][voxpos];
            var forTheTop = data[voxlvl + 1][voxpos];

            // var dat = forTheBtm.cornerdata[0].px[0];
            this._verts.p0.setValue(forTheBtm.cornerdata[0].px);
            this._verts.p1.setValue(forTheBtm.cornerdata[1].px);
            this._verts.p2.setValue(forTheBtm.cornerdata[3].px);
            this._verts.p3.setValue(forTheBtm.cornerdata[2].px);

            this._verts.p4.setValue(forTheTop.cornerdata[0].px);
            this._verts.p5.setValue(forTheTop.cornerdata[1].px);
            this._verts.p6.setValue(forTheTop.cornerdata[3].px);
            this._verts.p7.setValue(forTheTop.cornerdata[2].px);

            console.log();
        };

        VoxelState2.prototype.setVertexValues = function () {
            // Not used
        };

        VoxelState2.prototype.resetVoxelValues = function () {
            this._verts.p0.setIsInside(false);
            this._verts.p1.setIsInside(false);
            this._verts.p2.setIsInside(false);
            this._verts.p3.setIsInside(false);
            this._verts.p4.setIsInside(false);
            this._verts.p5.setIsInside(false);
            this._verts.p6.setIsInside(false);
            this._verts.p7.setIsInside(false);

            this._verts.p0.setValue(1000);
            this._verts.p1.setValue(1000);
            this._verts.p2.setValue(1000);
            this._verts.p3.setValue(1000);
            this._verts.p4.setValue(1000);
            this._verts.p5.setValue(1000);
            this._verts.p6.setValue(1000);
            this._verts.p7.setValue(1000);
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

        VoxelState2.prototype.toggleMesh = function () {
            this._mesh.visible = this._mesh.visible !== true;
        };
        return VoxelState2;
    })();
    Voxel.VoxelState2 = VoxelState2;

    var Level = (function () {
        function Level() {
            this._level = [];
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
        function VoxelWorld(worldSize, voxelSize, scene, data) {
            this._sceneRef = scene;
            this._worldSize = worldSize;
            this._voxelSize = voxelSize;

            this._worldVoxelArray = [];
            this._worldSlim = [];
            this._levelSlim = [];
            this._stride = worldSize / voxelSize;
            this._voxelPerLevel = Math.pow(this._stride, 2);
            this._numberlevels = Math.sqrt(this._voxelPerLevel);
            this._labels = [];

            if (data)
                this._data = data;

            this.buildWorldVoxelPositionArray();
        }
        VoxelWorld.prototype.getWorldVoxelArray = function () {
            return this._worldVoxelArray;
        };

        VoxelWorld.prototype.getSlimWorldVoxelArray = function () {
            return this._worldSlim;
        };

        VoxelWorld.prototype.getLevel = function (level) {
            return this._worldVoxelArray[level];
        };

        VoxelWorld.prototype.getStride = function () {
            return this._stride;
        };

        VoxelWorld.prototype.getNumberOfVoxelsPerLevel = function () {
            return this._voxelPerLevel;
        };

        VoxelWorld.prototype.getNumberOfLevelsInVoxelWorld = function () {
            return this._numberlevels;
        };

        //if data
        VoxelWorld.prototype.buildWorldVoxelPositionArray = function () {
            var voxCounter = 0, lvlCounter = 0;
            this._level = new Level;
            this._start = new THREE.Vector3(-this._worldSize / 2, -this._worldSize / 2, -this._worldSize / 2);

            var x = this._start.x, z = this._start.z, y = this._start.y;

            while (y < this._worldSize / 2) {
                voxCounter = 0;

                while (z < this._worldSize / 2) {
                    while (x < this._worldSize / 2) {
                        var voxel = new VoxelState2(new THREE.Vector3(x + this._voxelSize / 2, y + this._voxelSize / 2, z + this._voxelSize / 2), this._voxelSize);
                        voxel.calculateVoxelVertexPositions();
                        if (this._data)
                            voxel.calculateVoxelVertexValuesFromJSONPixelDataFile(voxCounter, lvlCounter, this._data);
                        voxel.setConnectedTos();
                        this._level.addToLevel(voxel);

                        this._levelSlim.push({
                            // this is a voxel
                            p0: { value: voxel.getVerts().p0.getValue(), position: voxel.getVerts().p0.getPosition() },
                            p1: { value: voxel.getVerts().p1.getValue(), position: voxel.getVerts().p1.getPosition() },
                            p2: { value: voxel.getVerts().p2.getValue(), position: voxel.getVerts().p2.getPosition() },
                            p3: { value: voxel.getVerts().p3.getValue(), position: voxel.getVerts().p3.getPosition() },
                            p4: { value: voxel.getVerts().p4.getValue(), position: voxel.getVerts().p4.getPosition() },
                            p5: { value: voxel.getVerts().p5.getValue(), position: voxel.getVerts().p5.getPosition() },
                            p6: { value: voxel.getVerts().p6.getValue(), position: voxel.getVerts().p6.getPosition() },
                            p7: { value: voxel.getVerts().p7.getValue(), position: voxel.getVerts().p7.getPosition() },
                            geometry: null
                        });

                        //this._sceneRef.add(voxel);
                        x += this._voxelSize;
                        voxCounter++;
                    }

                    z += this._voxelSize;
                    x = this._start.x;
                }

                this._worldVoxelArray.push(this._level);
                this._worldSlim.push(this._levelSlim);
                this._levelSlim = [];
                this._level = new Level;

                y += this._voxelSize;
                x = this._start.x;
                z = this._start.z;

                lvlCounter++;
            }
        };

        VoxelWorld.prototype.setNewVoxelWorldDataValues = function (data) {
            this._worldSlim = [];

            for (var level = 0; level < this._worldVoxelArray.length; level++) {
                for (var voxel = 0; voxel < this._worldVoxelArray[level].getAllVoxelsAtThisLevel().length; voxel++) {
                    var vox = this._worldVoxelArray[level].getVoxel(voxel);
                    vox.calculateVoxelVertexValuesFromJSONPixelDataFile(voxel, level, data);

                    this._levelSlim.push({
                        // this is a voxel
                        p0: { value: vox.getVerts().p0.getValue(), position: vox.getVerts().p0.getPosition() },
                        p1: { value: vox.getVerts().p1.getValue(), position: vox.getVerts().p1.getPosition() },
                        p2: { value: vox.getVerts().p2.getValue(), position: vox.getVerts().p2.getPosition() },
                        p3: { value: vox.getVerts().p3.getValue(), position: vox.getVerts().p3.getPosition() },
                        p4: { value: vox.getVerts().p4.getValue(), position: vox.getVerts().p4.getPosition() },
                        p5: { value: vox.getVerts().p5.getValue(), position: vox.getVerts().p5.getPosition() },
                        p6: { value: vox.getVerts().p6.getValue(), position: vox.getVerts().p6.getPosition() },
                        p7: { value: vox.getVerts().p7.getValue(), position: vox.getVerts().p7.getPosition() },
                        geometry: null
                    });
                }

                this._worldSlim.push(this._levelSlim);
                this._levelSlim = [];
            }
        };

        // Author: ekeneijeoma
        // Source: https://gist.github.com/ekeneijeoma/1186920
        // Used for creating helper labels
        VoxelWorld.prototype.createLabel = function (text, position, size, color, backGroundColor, visibile, backgroundMargin) {
            if (!backgroundMargin)
                backgroundMargin = 5;

            var canvas = document.createElement("canvas");

            var context = canvas.getContext("2d");
            context.font = size + "pt Arial";

            var textWidth = context.measureText(text).width;

            canvas.width = (textWidth + backgroundMargin) * 2;
            canvas.height = (size + backgroundMargin) * 2;
            context = canvas.getContext("2d");
            context.font = size + "pt Arial";

            if (backGroundColor) {
                context.fillStyle = "rgba(" + backGroundColor.r + "," + backGroundColor.g + "," + backGroundColor.b + "," + backGroundColor.a + ")";
                context.fillRect(canvas.width / 2 - textWidth / 2 - backgroundMargin / 2, canvas.height / 2 - size / 2 - +backgroundMargin / 2, textWidth + backgroundMargin, size + backgroundMargin);
            }

            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = color;
            context.fillText(text, canvas.width / 4, canvas.height / 4);

            // context.strokeStyle = "black";
            // context.strokeRect(0, 0, canvas.width, canvas.height);
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;

            var material = new THREE.MeshBasicMaterial({
                map: texture, transparent: true, opacity: 0.7, color: 0xFF0000
            });

            var mesh = new THREE.Mesh(new THREE.PlaneGeometry(canvas.width / 2, canvas.height / 2), material);

            // mesh.overdraw = tr
            // ue;
            // = THREE.DoubleSide;
            mesh.position.x = position.x;
            mesh.position.y = position.y;
            mesh.position.z = position.z;

            mesh.visible = visibile;

            this._labels.push(mesh);
            return mesh;
        };

        VoxelWorld.prototype.clearLabels = function () {
            for (var i = 0; i < this._labels.length; i++) {
                this._sceneRef.remove(this._sceneRef.getObjectById(this._labels[i].id, true));
            }
            this._labels = [];
        };

        VoxelWorld.prototype.update = function (camera, visible) {
            for (var i = 0; i < this._labels.length; i++) {
                this._labels[i].lookAt(camera.position);
                this._labels[i].visible = visible;
            }
        };

        VoxelWorld.projectIntoVolume = function (projectiondirections, projectionOriginations, controllerSphereReference) {
            var linesToDraw = new Array();

            for (var b = 0; b < projectiondirections.length; b++) {
                var ray = new THREE.Raycaster(projectionOriginations[b], projectiondirections[b].normalize(), 0, Infinity);
                var result = [];
                for (var i = 0; i < controllerSphereReference.length; i++) {
                    result = result.concat(controllerSphereReference[i].getOctreeForFaces().search(ray.ray.origin, ray.far, true, ray.ray.direction));
                }
                var intersections = ray.intersectOctreeObjects(result);
                if (intersections.length > 0) {
                    var sortedArray = intersections.sort(function (p1, p2) {
                        return p1.distance - p2.distance;
                    });

                    // entry exit store line
                    var entry, exit;
                    for (var i = 0; i < sortedArray.length; i++) {
                        var object = sortedArray[i].object;
                        var face = object.getNormal();
                        var facing = projectiondirections[b].dot(face);
                        var inside;

                        if (facing < 0) {
                            inside = true;
                            exit = sortedArray[i].point;
                            if (entry)
                                linesToDraw.push(new Geometry.Line(entry, exit));
                            entry = null, exit = null;
                        } else {
                            inside = false;
                            entry = sortedArray[i].point;
                        }
                    }
                }
            }

            return linesToDraw;
        };

        VoxelWorld.prototype.toggleVolumeVisibility = function () {
            _.each(this._worldVoxelArray, function (level) {
                var voxs = level.getAllVoxelsAtThisLevel();
                _.each(voxs, function (vox) {
                    vox.toggleMesh();
                });
            });
        };
        return VoxelWorld;
    })();
    Voxel.VoxelWorld = VoxelWorld;

    var MarchingCubeRendering = (function () {
        function MarchingCubeRendering() {
        }
        //Marching cube algorithm that evaluates per voxel
        MarchingCubeRendering.processWorkerRequest = function (data) {
            var exceptionCount = 0;

            for (var i = 0; i < data.data.length; i++) {
                for (var x = 0; x < data.data[i].length; x++) {
                    var vox = new Voxel.VoxelState2(new THREE.Vector3, 0);

                    //console.log(JSON.stringify(data.voxelInfo.getVerts().p0.getValue()));
                    vox.getVerts().p0.setPostion(data.data[i][x].p0.position);
                    vox.getVerts().p1.setPostion(data.data[i][x].p1.position);
                    vox.getVerts().p2.setPostion(data.data[i][x].p2.position);
                    vox.getVerts().p3.setPostion(data.data[i][x].p3.position);

                    vox.getVerts().p4.setPostion(data.data[i][x].p4.position);
                    vox.getVerts().p5.setPostion(data.data[i][x].p5.position);
                    vox.getVerts().p6.setPostion(data.data[i][x].p6.position);
                    vox.getVerts().p7.setPostion(data.data[i][x].p7.position);

                    vox.getVerts().p0.setValue(data.data[i][x].p0.value);
                    vox.getVerts().p1.setValue(data.data[i][x].p1.value);
                    vox.getVerts().p2.setValue(data.data[i][x].p2.value);
                    vox.getVerts().p3.setValue(data.data[i][x].p3.value);

                    vox.getVerts().p4.setValue(data.data[i][x].p4.value);
                    vox.getVerts().p5.setValue(data.data[i][x].p5.value);
                    vox.getVerts().p6.setValue(data.data[i][x].p6.value);
                    vox.getVerts().p7.setValue(data.data[i][x].p7.value);

                    var geo = Voxel.MarchingCubeRendering.MarchingCube(vox, data.threshold);
                    data.data[i][x].geometry = geo;
                }
            }

            //console.log(exceptionCount);
            return data.data;
        };

        MarchingCubeRendering.MarchingCube = function (voxel, isolevel) {
            //console.log(JSON.stringify(voxel));
            var vertexlist = [];

            var cubeIndex = 0;

            //console.log(voxel.getVerts().p0.getValue());
            if (voxel.getVerts().p0.getValue() <= isolevel) {
                cubeIndex |= 1;
                voxel.getVerts().p0.setIsInside(true);
            }
            if (voxel.getVerts().p1.getValue() <= isolevel) {
                cubeIndex |= 2;
                voxel.getVerts().p1.setIsInside(true);
            }
            if (voxel.getVerts().p2.getValue() <= isolevel) {
                cubeIndex |= 4;
                voxel.getVerts().p2.setIsInside(true);
            }
            if (voxel.getVerts().p3.getValue() <= isolevel) {
                cubeIndex |= 8;
                voxel.getVerts().p3.setIsInside(true);
            }
            if (voxel.getVerts().p4.getValue() <= isolevel) {
                cubeIndex |= 16;
                voxel.getVerts().p4.setIsInside(true);
            }
            if (voxel.getVerts().p5.getValue() <= isolevel) {
                cubeIndex |= 32;
                voxel.getVerts().p5.setIsInside(true);
            }
            if (voxel.getVerts().p6.getValue() <= isolevel) {
                cubeIndex |= 64;
                voxel.getVerts().p6.setIsInside(true);
            }
            if (voxel.getVerts().p7.getValue() <= isolevel) {
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

            return this.computeVoxelMesh(vertexlist, cubeIndex);
        };

        MarchingCubeRendering.MarchingCubeCustom = function (voxelRef, horizontalLines, verticalLines, worldSize, blockSize, material) {
            // Top Slice 4, 5, 6, 7
            // Bottom Slice 0, 1, 2, 3
            // Near 0, 1, 4, 5
            // Far 2, 3, 6, 7
            var vertexlist = [];

            var cubeIndex = 0;

            if (voxelRef.getVerts().p0.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 1;
                voxelRef.getVerts().p0.setIsInside(true);
            }
            if (voxelRef.getVerts().p1.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 2;
                voxelRef.getVerts().p1.setIsInside(true);
            }
            if (voxelRef.getVerts().p2.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 4;
                voxelRef.getVerts().p2.setIsInside(true);
            }
            if (voxelRef.getVerts().p3.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 8;
                voxelRef.getVerts().p3.setIsInside(true);
            }
            if (voxelRef.getVerts().p4.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 16;
                voxelRef.getVerts().p4.setIsInside(true);
            }
            if (voxelRef.getVerts().p5.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 32;
                voxelRef.getVerts().p5.setIsInside(true);
            }
            if (voxelRef.getVerts().p6.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 64;
                voxelRef.getVerts().p6.setIsInside(true);
            }
            if (voxelRef.getVerts().p7.isPointContainedInAnyRayLines(horizontalLines, verticalLines)) {
                cubeIndex |= 128;
                voxelRef.getVerts().p7.setIsInside(true);
            }

            // then perform custom vertex interpolation where we walk along a line and determine where the transition from inside to
            // outside takes place and we mark (may need to do some interpolation) where that vertex should go.
            var bits = THREE.edgeTable[cubeIndex];

            //if (bits === 0 ) continue;
            if (bits & 1) {
                vertexlist[0] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p0, voxelRef.getVerts().p1); // p0 p1 H
            }
            if (bits & 2) {
                vertexlist[1] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p1, voxelRef.getVerts().p2); // 1 2 H
            }
            if (bits & 4) {
                vertexlist[2] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p2, voxelRef.getVerts().p3); // 2 3 H
            }
            if (bits & 8) {
                vertexlist[3] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p3, voxelRef.getVerts().p0); // 3 0 H
            }
            if (bits & 16) {
                vertexlist[4] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p4, voxelRef.getVerts().p5); // 4 5 H
            }
            if (bits & 32) {
                vertexlist[5] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p5, voxelRef.getVerts().p6); // 5 6 H
            }
            if (bits & 64) {
                vertexlist[6] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p6, voxelRef.getVerts().p7); // 6 7 H
            }
            if (bits & 128) {
                vertexlist[7] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p7, voxelRef.getVerts().p4); // 7 4 H
            }
            if (bits & 256) {
                vertexlist[8] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p0, voxelRef.getVerts().p4); // 0 4 V
            }
            if (bits & 512) {
                vertexlist[9] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p1, voxelRef.getVerts().p5); // 1 5 V
            }
            if (bits & 1024) {
                vertexlist[10] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p2, voxelRef.getVerts().p6); // 2 6 V
            }
            if (bits & 2048) {
                vertexlist[11] = MarchingCubeRendering.CalculateAValueForEachVertexPassedIn(voxelRef.getVerts().p3, voxelRef.getVerts().p7); // 3 7 V
            }

            return new THREE.Mesh(this.computeVoxelMesh(vertexlist, cubeIndex), material);
        };

        MarchingCubeRendering.computeVoxelMesh = function (vertexlist, cubeIndex) {
            var geometry = new THREE.Geometry();
            var vertexIndex = 0;

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

                geometry.vertices.push(vertexlist[index1]);
                geometry.vertices.push(vertexlist[index2]);
                geometry.vertices.push(vertexlist[index3]);

                var face = new THREE.Face3(vertexIndex, vertexIndex + 1, vertexIndex + 2);
                geometry.faces.push(face);
                geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1)]);
                vertexIndex += 3;
                i += 3;
            }

            geometry.computeCentroids();
            geometry.computeFaceNormals();
            geometry.computeVertexNormals();

            return geometry;
        };

        MarchingCubeRendering.CalculateAValueForEachVertexPassedIn = function (c1, c2) {
            var array = new Geometry.Collection();

            // Find common matching line which:
            // is parallel
            // and at least one point is contained on that line
            var direction = new THREE.Vector3();
            direction.subVectors(c2.getPosition(), c1.getPosition());
            direction.normalize();

            // x - x -> Horizontal
            if (direction.angleTo(new THREE.Vector3(1, 0, 0)) * (180 / Math.PI) === 0 || direction.angleTo(new THREE.Vector3(1, 0, 0)) * (180 / Math.PI) === 180) {
                if (c1.getIsInside()) {
                    var iter = c1.getAllContainingRayLines().createInterator();
                    while (iter.hasNext()) {
                        var el = iter.next();
                        var angle = el.getDirection().angleTo(direction) * (180 / Math.PI);
                        if (angle === 0 || angle === 180) {
                            array.addUnique(el);
                        }
                    }
                }

                if (c2.getIsInside()) {
                    var iter = c2.getAllContainingRayLines().createInterator();
                    while (iter.hasNext()) {
                        var el = iter.next();
                        var angle = el.getDirection().angleTo(direction) * (180 / Math.PI);
                        if (angle === 0 || angle === 180) {
                            array.addUnique(el);
                        }
                    }
                }
            }

            // z - z -> Horizontal
            if (direction.angleTo(new THREE.Vector3(0, 0, 1)) * (180 / Math.PI) === 0 || direction.angleTo(new THREE.Vector3(0, 0, 1)) * (180 / Math.PI) === 180) {
                if (c1.getIsInside()) {
                    var iter = c1.getAllContainingRayLines().createInterator();
                    while (iter.hasNext()) {
                        var el = iter.next();
                        var angle = el.getDirection().angleTo(direction) * (180 / Math.PI);
                        if (angle === 0 || angle === 180) {
                            array.addUnique(el);
                        }
                    }
                }

                if (c2.getIsInside()) {
                    var iter = c2.getAllContainingRayLines().createInterator();
                    while (iter.hasNext()) {
                        var el = iter.next();
                        var angle = el.getDirection().angleTo(direction) * (180 / Math.PI);
                        if (angle === 0 || angle === 180) {
                            array.addUnique(el);
                        }
                    }
                }
            }

            // or
            // y - y -> Vertical
            if (direction.angleTo(new THREE.Vector3(0, 1, 0)) * (180 / Math.PI) === 0 || direction.angleTo(new THREE.Vector3(0, 1, 0)) * (180 / Math.PI) === 180) {
                if (c1.getIsInside()) {
                    var iter = c1.getAllContainingRayLines().createInterator();
                    while (iter.hasNext()) {
                        var el = iter.next();
                        var angle = el.getDirection().angleTo(direction) * (180 / Math.PI);
                        if (angle === 0 || angle === 180) {
                            array.addUnique(el);
                        }
                    }
                }

                if (c2.getIsInside()) {
                    var iter = c2.getAllContainingRayLines().createInterator();
                    while (iter.hasNext()) {
                        var el = iter.next();
                        var angle = el.getDirection().angleTo(direction) * (180 / Math.PI);
                        if (angle === 0 || angle === 180) {
                            array.addUnique(el);
                        }
                    }
                }
            }

            if (array.length() > 0) {
                c1.setValue(Math.abs(Geometry.GeometryHelper.shortestDistanceBetweenTwoVector3(c1.getPosition(), array.get(0).start, array.get(0).end)));
                if (c1.getIsInside())
                    c1.setValue(c1.getValue() * -1);

                c2.setValue(Math.abs(Geometry.GeometryHelper.shortestDistanceBetweenTwoVector3(c2.getPosition(), array.get(0).start, array.get(0).end)));
                if (c2.getIsInside())
                    c2.setValue(c2.getValue() * -1);
            }

            //return MarchingCubeRendering.VertexInterpolate(0, c1.getPosition(), c2.getPosition(), c1.getValue(), c2.getValue());
            return MarchingCubeRendering.VertexInterpolateCustom(0, c1, c2);
        };

        MarchingCubeRendering.VertexInterpolateCustom = function (threshold, corner1, corner2) {
            // do magic here !!!
            if (corner1.getIsInside() && corner1.getValue() != 1000 && !corner2.getIsInside() && corner2.getValue() === 1000) {
                var multiplier = (corner1.getValue() < 0) ? 1 : -1;
                var length = Math.abs(corner1.getPosition().distanceTo(corner2.getPosition()));
                var newValue2 = length - Math.abs(corner1.getValue()) * multiplier;
                corner2.setValue(newValue2);
            }

            if (corner2.getIsInside() && corner2.getValue() != 1000 && !corner1.getIsInside() && corner1.getValue() === 1000) {
                var multiplier = (corner2.getValue() < 0) ? 1 : -1;
                var length = Math.abs(corner2.getPosition().distanceTo(corner1.getPosition()));
                var newValue1 = length - Math.abs(corner2.getValue()) * multiplier;
                corner1.setValue(newValue1);
            }

            if (corner1.getIsInside() && corner1.getValue() === 1000 && !corner2.getIsInside() && corner2.getValue() != 1000) {
                var multiplier = (corner2.getValue() < 0) ? -1 : 1;
                var length = Math.abs(corner2.getPosition().distanceTo(corner1.getPosition()));
                var newValue1 = length - Math.abs(corner2.getValue()) * multiplier;
                corner1.setValue(newValue1);
            }

            if (corner2.getIsInside() && corner2.getValue() === 1000 && !corner1.getIsInside() && corner1.getValue() != 1000) {
                var multiplier = (corner1.getValue() < 0) ? -1 : 1;
                var length = Math.abs(corner2.getPosition().distanceTo(corner1.getPosition()));
                var newValue2 = length - Math.abs(corner1.getValue()) * multiplier;
                corner2.setValue(newValue2);
            }

            if (corner1.getIsInside() && corner1.getValue() === 1000 && !corner2.getIsInside() && corner2.getValue() === 1000)
                return corner1.getPosition();

            if (!corner1.getIsInside() && corner1.getValue() === 1000 && corner2.getIsInside() && corner2.getValue() === 1000)
                return corner2.getPosition();

            if (corner1.getValue() === 1000 || corner2.getValue() === 1000)
                return corner1.getPosition();

            var mu = (threshold - corner1.getValue()) / (corner2.getValue() - corner1.getValue());

            var p = new THREE.Vector3();

            //if (Math.abs(threshold - corner1.getValue()) < 0.01)
            //  return corner1.getPosition(); // this was 1
            //if (Math.abs(threshold - corner2.getValue()) < 0.01)
            //  return corner2.getPosition(); // this was 2
            //if (Math.abs(corner1.getValue() - corner2.getValue()) < 0.01)
            //  return corner1.getPosition(); // this Was 1
            p.x = corner1.getPosition().x + mu * (corner2.getPosition().x - corner1.getPosition().x);
            p.y = corner1.getPosition().y + mu * (corner2.getPosition().y - corner1.getPosition().y);
            p.z = corner1.getPosition().z + mu * (corner2.getPosition().z - corner1.getPosition().z);

            return p;
        };

        // Author : Paul Bourke
        // Source : http://paulbourke.net/geometry/polygonise/
        // Purpose: Interpolate between two points and determine vector position based on threshold
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
    var JQueryHelper = (function () {
        function JQueryHelper() {
        }
        JQueryHelper.GetScreenWH = function (id) {
            var wh = [];
            var w = $(id).width();
            var h = $(id).height();
            wh.push(w, h);
            return wh;
        };

        JQueryHelper.AppendToScene = function (id, renderer) {
            $(id).append(renderer.domElement);
        };
        return JQueryHelper;
    })();
    Helper.JQueryHelper = JQueryHelper;
})(Helper || (Helper = {}));

var Imaging;
(function (Imaging) {
    var CanvasRender = (function () {
        function CanvasRender() {
        }
        CanvasRender.prototype.drawCanvas = function (name, arrayOfLines, translateTo, orientation, drawGrid, worldSize, blockSize) {
            var trans = Geometry.GeometryHelper.vectorBminusVectorA(new THREE.Vector3(0, 0, 0), translateTo);

            //var trans2 = Geometry.GeometryHelper.vectorBminusVectorA(new THREE.Vector3())
            var lines2D = [];

            for (var i = 0; i < arrayOfLines.length; i++) {
                //var pt3entry = new THREE.Vector3().addVectors(arrayOfLines[i].start, trans);
                //var pt3exit = new THREE.Vector3().addVectors(arrayOfLines[i].end, trans);
                if (orientation === 0) {
                    var line = new Geometry.Line(new Geometry.Vector3Extended(arrayOfLines[i].start.x, arrayOfLines[i].start.y, arrayOfLines[i].start.z), new Geometry.Vector3Extended(arrayOfLines[i].end.x, arrayOfLines[i].end.y, arrayOfLines[i].end.z));
                    line.start.x += worldSize / 2;
                    line.start.z *= -1;
                    line.start.z -= worldSize / 2;

                    line.end.x += worldSize / 2;
                    line.end.z *= -1;
                    line.end.z -= worldSize / 2;

                    var pt2entry = new THREE.Vector2(Math.abs(line.start.x), Math.abs(line.start.z));
                    var pt2exit = new THREE.Vector2(Math.abs(line.end.x), Math.abs(line.end.z));
                } else {
                    var line = new Geometry.Line(new Geometry.Vector3Extended(arrayOfLines[i].start.x, arrayOfLines[i].start.y, arrayOfLines[i].start.z), new Geometry.Vector3Extended(arrayOfLines[i].end.x, arrayOfLines[i].end.y, arrayOfLines[i].end.z));
                    line.start.x += worldSize / 2;
                    line.start.y -= worldSize / 2;

                    line.end.x += worldSize / 2;
                    line.end.y -= worldSize / 2;

                    var pt2entry = new THREE.Vector2(Math.abs(line.start.x), Math.abs(line.start.y));
                    var pt2exit = new THREE.Vector2(Math.abs(line.end.x), Math.abs(line.end.y));
                }

                lines2D.push({ entry: pt2entry, exit: pt2exit });
            }

            var canvas = document.createElement('canvas');
            canvas.width = worldSize;
            canvas.height = worldSize;

            if (canvas.getContext) {
                ctx = canvas.getContext('2d');

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.beginPath();

                if (drawGrid) {
                    ctx.lineWidth = 1;
                    for (var i = 0; i <= canvas.width; i += blockSize) {
                        ctx.moveTo(i, 0);
                        ctx.lineTo(i, canvas.height + 0.5);
                        ctx.moveTo(0, i);
                        ctx.lineTo(canvas.width + 0.5, i);
                        ctx.strokeStyle = "white";
                        ctx.stroke();
                        ctx.fill();
                    }
                }

                ctx.fillStyle = 'white';
                ctx.font = "bold 12px sans-serif";
                ctx.fillText(name, 10, 20);

                ctx.fill();
                ctx.closePath();

                var ctx = canvas.getContext('2d');

                for (var a = 0; a < lines2D.length; a++) {
                    ctx.beginPath();
                    ctx.moveTo(lines2D[a].entry.x, lines2D[a].entry.y);
                    ctx.lineTo(lines2D[a].exit.x, lines2D[a].exit.y);
                    ctx.strokeStyle = "red";
                    ctx.stroke();
                    ctx.fill();
                    ctx.closePath();
                }
            }

            return canvas;
        };

        CanvasRender.prototype.drawImage = function (canvasID, imageToSuperImpose) {
            var canvas = document.getElementById(canvasID);
            var f = imageToSuperImpose.height / imageToSuperImpose.width;
            var newHeight = canvas.width * f;
            canvas.getContext('2d').drawImage(imageToSuperImpose, 0, 0, imageToSuperImpose.width, imageToSuperImpose.height, 0, 0, canvas.width, newHeight);
        };

        // Same as above but cant overload like typ OO method as this being compiled to JS and JS doesnt recognise types
        CanvasRender.prototype.drawImage2 = function (canvas, imageToSuperImpose) {
            var f = imageToSuperImpose.height / imageToSuperImpose.width;
            var newHeight = canvas.width * f;
            canvas.getContext('2d').drawImage(imageToSuperImpose, 0, 0, imageToSuperImpose.width, imageToSuperImpose.height, 0, 0, canvas.width, newHeight);
        };

        CanvasRender.prototype.drawAllImages = function (arrayOfHorizontalSlices, arrayOfVerticalSlices, horizontalElemID, verticalElemID) {
            var _this = this;
            var elem = document.getElementById(horizontalElemID);

            _.each(arrayOfHorizontalSlices, function (slice) {
                var i = slice;

                var canvasL = document.createElement('canvas');
                canvasL.width = 400;
                canvasL.height = 400;
                var canvasR = document.createElement('canvas');
                canvasR.width = 400;
                canvasR.height = 400;

                _this.drawImage2(canvasL, i.bottom);
                elem.appendChild(canvasL);

                _this.drawImage2(canvasR, i.top);
                elem.appendChild(canvasR);

                var br = document.createElement('br');
                elem.appendChild(br);
            });

            elem = document.getElementById(verticalElemID);

            _.each(arrayOfVerticalSlices, function (slice) {
                var i = slice;

                var canvasL = document.createElement('canvas');
                canvasL.width = 400;
                canvasL.height = 400;

                var canvasR = document.createElement('canvas');
                canvasR.width = 400;
                canvasR.height = 400;

                _this.drawImage2(canvasL, i.near);
                elem.appendChild(canvasL);

                _this.drawImage2(canvasR, i.far);
                elem.appendChild(canvasR);

                var br = document.createElement('br');
                elem.appendChild(br);
            });
        };

        CanvasRender.prototype.clearAllImages = function (horizontalElemID, verticalElemID) {
            $('#' + horizontalElemID).empty();
            $('#' + verticalElemID).empty();
        };
        return CanvasRender;
    })();
    Imaging.CanvasRender = CanvasRender;
})(Imaging || (Imaging = {}));

var Controller;
(function (Controller) {
    var ControlSphere = (function () {
        function ControlSphere(id, segments, radius, scene, size, velocity, mass) {
            this._id = id;
            this._n = segments;
            this._m = segments;
            this._radius = radius;
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
                this._faces[i].visible = this._faces[i].visible !== true;
                this._faces[i].toggleNormalVisibility();
            }

            for (var i = 0; i < this._nodes.length; i++) {
                this._nodes[i].visible = this._nodes[i].visible !== true;
            }
        };

        ControlSphere.prototype.generateSphereVerticesandLineConnectors = function () {
            var points = [];
            var lines = [];
            for (var m = 0; m < this._m + 1; m++)
                for (var n = 0; n < this._n; n++) {
                    // Author : Jonathan
                    // Source : http://stackoverflow.com/a/4082020
                    // Purpose: Generate vertices for the purpose of generating a sphere
                    var x = (Math.sin(Math.PI * m / this._m) * Math.cos(2 * Math.PI * n / this._n)) * this._radius;
                    var y = (Math.sin(Math.PI * m / this._m) * Math.sin(2 * Math.PI * n / this._n)) * this._radius;
                    var z = (Math.cos(Math.PI * m / this._m)) * this._radius;

                    var p = new Geometry.Vector3Extended(x, y, z);

                    points.push(p);
                }

            for (var s = 0; s < points.length - this._n; s++) {
                var lineGeo = new THREE.Geometry();
                lineGeo.vertices.push(points[s], points[s + this._n]);

                lineGeo.computeLineDistances();

                var lineMaterial = new THREE.LineBasicMaterial({ color: 0xCC0000 });
                var line = new THREE.Line(lineGeo, lineMaterial);

                lines.push(line);
            }

            // Draw lines along latitude
            var count = 0;
            for (var s = this._n; s < points.length - this._n; s++) {
                var a, b;

                if (count === this._n - 1) {
                    a = points[s];
                    b = points[s - this._n + 1];
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
            var unique = points.slice(this._n - 1, points.length - this._n + 1);

            this._sphereSkeleton = { points: unique, lines: lines };
        };

        ControlSphere.prototype.generateSphere = function () {
            if (!this._alreadyGenerated) {
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
                this._alreadyGenerated = true;
            }
        };

        ControlSphere.prototype.calculateFaces = function () {
            var positions = [];

            _.each(this._nodes, function (item) {
                positions.push({ id: item.getId(), position: item.getNodePosition() });
            });

            Implementation.Sculpt2.Worker.postMessage({ id: this._id, command: "calculateMeshFacePositions", particles: JSON.stringify(positions), segments: this._n });
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
                geom.vertices.push(new THREE.Vector3(item.a.pos.x, item.a.pos.y, item.a.pos.z), new THREE.Vector3(item.b.pos.x, item.b.pos.y, item.b.pos.z), new THREE.Vector3(item.c.pos.x, item.c.pos.y, item.c.pos.z));
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

        ControlSphere.prototype.update = function (inverted) {
            if (this._faces) {
                _.each(this._faces, function (face) {
                    face.updateVertices();
                    face.calculateNormal(inverted);
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
//# sourceMappingURL=Utils2.js.map
