/**
 * Created by William on 25/01/14.
 *
 * ##Marching cube code inspired from##
 * http://stemkoski.github.io/Three.js/Marching-Cubes.html
 * &
 * http://paulbourke.net/geometry/polygonise/
 */

function Sphere(x, y, z, r) {
    this.radius = r;
    this.center = new THREE.Vector3(x, y, z);
}

Sphere.prototype.isColliding = function (position) {
    var dist = this.center.distanceTo(position);
    if (dist < this.radius)
        return true;

    return false;
}

function SpotLight(options) {
    this.color = (typeof options.color === 'undefined') ? "#ffffff" : options.color;
    this.position = (typeof options.position === 'undefined') ? new THREE.Vector3(0, 0, 0) : options.position;
    this.shouldCastShadow = (typeof options.shouldCastShadow === 'undefined') ? false : options.shouldCastShadow;
    this.target = (typeof options.target === 'undefined') ? new THREE.Object3D() : options.target;

    this.spotLight = new THREE.SpotLight(this.color);
    this.spotLight.position.set(this.position.x, this.position.y, this.position.z);
    this.spotLight.castShadow = this.shouldCastShadow;
    this.spotLight.target = this.target;

    return this.spotLight;
}

function AmbientLight(options) {
    this.color = (typeof  options.color === 'undefined') ? '#0c0c0c' : options.color;

    this.ambientLight = new THREE.AmbientLight(this.color);

    return this.ambientLight;
}

function DirectionalLight(options) {
    this.color = (typeof options.color === 'undefined') ? '#ffffff' : options.color;
    this.intensity = (typeof options.intensity === 'undefined') ? 5 : options.intensity;
    this.shouldCastShadow = (typeof options.shouldCastShadow === 'undefined') ? false : options.shouldCastShadow;

    this.directionalLight = new THREE.DirectionalLight(this.color);
    this.directionalLight.intensity = this.intensity;
    this.directionalLight.castShadow = this.shouldCastShadow;

    return this.directionalLight;
};

function LightFactory() {
}

LightFactory.prototype.lightClass = SpotLight;

LightFactory.prototype.createLight = function (options) {
    if (options.lightType === "spot") {
        this.lightClass = SpotLight;
    }
    else if (options.lightType === 'directional') {
        this.lightClass = DirectionalLight;
    }
    else if (options.lightType === 'ambient') {
        this.lightClass = AmbientLight;
    }
    else {
        throw "Light factory does not contain this type";
    }

    return new this.lightClass(options);
};

function getScreenWidthHeight(id) {
    var width = $(id).width();
    var height = $(id).height();
    return [width, height];
};

function appendToScene(id, render) {
    $(id).append(render.domElement);
};

function build3DGrid(geometryH, geometryV, gridColor) {
    //Build 3d grid
    var geometryH = geometryH;
    var geometryV = geometryV;

    var gridMaterial = new THREE.LineBasicMaterial({ color: gridColor, opacity: 0.5 });

    var lineH = new THREE.Line(geometryH, gridMaterial);
    var lineV = new THREE.Line(geometryV, gridMaterial);

    lineH.type = THREE.LinePieces;
    lineV.type = THREE.LinePieces;
    lineV.rotation.x = Math.PI / 2;

    return {liH: lineH, liV: lineV};
}

function buildAxisAligned2DGrids(wSize, bSize) {
    var geometry = new THREE.Geometry();
    var size = wSize / 2;
    var step = bSize;

    for (var i = -size; i <= size; i += step) {
        for (var level = -size; level <= size; level += step) {
            geometry.vertices.push(new THREE.Vector3(-size, level, i));
            geometry.vertices.push(new THREE.Vector3(size, level, i));
            geometry.vertices.push(new THREE.Vector3(i, level, -size));
            geometry.vertices.push(new THREE.Vector3(i, level, size));
        }
    }
    return geometry;
}

function buildVoxelPositionArray(wSize, bSize) {

    var levelVoxelArray = [];
    var worldVoxelArray = [];

    var start = new THREE.Vector3(-wSize / 2, -wSize / 2, -wSize / 2); // lower left back corner
    var x = start.x, z = start.z, y = start.y;

    while (y < wSize / 2) {
        while (z < wSize / 2) {

            while (x < wSize / 2) {

                var voxel = new VoxelState();
                voxel.centerPosition = new THREE.Vector3(x + bSize / 2, y + bSize / 2, z + bSize / 2);

                levelVoxelArray.push(voxel);

                x += bSize;
            }

            z += bSize;
            x = start.x;
        }

        worldVoxelArray.push(levelVoxelArray);
        levelVoxelArray = [];
        y += bSize;
        x = start.x;
        z = start.z;
    }

    return worldVoxelArray;
}

function calculateVoxelValuesToSphereCenter(voxelCorners, sphere) {
    return {
        v0: evaluateVertexValueToSphereCenter(voxelCorners.p0, sphere),
        v1: evaluateVertexValueToSphereCenter(voxelCorners.p1, sphere),
        v2: evaluateVertexValueToSphereCenter(voxelCorners.p2, sphere),
        v3: evaluateVertexValueToSphereCenter(voxelCorners.p3, sphere),
        v4: evaluateVertexValueToSphereCenter(voxelCorners.p4, sphere),
        v5: evaluateVertexValueToSphereCenter(voxelCorners.p5, sphere),
        v6: evaluateVertexValueToSphereCenter(voxelCorners.p6, sphere),
        v7: evaluateVertexValueToSphereCenter(voxelCorners.p7, sphere)
    }
}

function evaluateVertexValueToSphereCenter(p, sphere) {
    return p.distanceTo(sphere.center);
}

function calculateVoxelVertexPositions(voxCenter, bSize) {
    return {
        p0: new THREE.Vector3(voxCenter.x - bSize / 2, voxCenter.y - bSize / 2, voxCenter.z - bSize / 2),  //   -1, -1, -1 = 0
        p1: new THREE.Vector3(voxCenter.x + bSize / 2, voxCenter.y - bSize / 2, voxCenter.z - bSize / 2),  //    1, -1, -1 = 1
        p2: new THREE.Vector3(voxCenter.x + bSize / 2, voxCenter.y - bSize / 2, voxCenter.z + bSize / 2),  //    1, -1 , 1 = 2
        p3: new THREE.Vector3(voxCenter.x - bSize / 2, voxCenter.y - bSize / 2, voxCenter.z + bSize / 2),  //   -1, -1 , 1 = 3
        p4: new THREE.Vector3(voxCenter.x - bSize / 2, voxCenter.y + bSize / 2, voxCenter.z - bSize / 2),  //   -1,  1, -1 = 4
        p5: new THREE.Vector3(voxCenter.x + bSize / 2, voxCenter.y + bSize / 2, voxCenter.z - bSize / 2),  //    1,  1, -1 = 5
        p6: new THREE.Vector3(voxCenter.x + bSize / 2, voxCenter.y + bSize / 2, voxCenter.z + bSize / 2),  //    1,  1,  1 = 6
        p7: new THREE.Vector3(voxCenter.x - bSize / 2, voxCenter.y + bSize / 2, voxCenter.z + bSize / 2)  //   -1,  1,  1 = 7
    }
}


// Marching cube algorithm that evaluates per voxel
function MarchingCube(voxel, verts, values, threshold, material) {
    var geometry = new THREE.Geometry();
    var vertexIndex = 0;
    var vlist = new Array(12);

    var cubeIndex = 0;

    if (values.v0 < threshold) {
        cubeIndex |= 1;
        voxel.verts.backLowerLeft.inside = true;
        voxel.verts.backLowerLeft.position = verts.p0;
    }   //0
    if (values.v1 < threshold) {
        cubeIndex |= 2;
        voxel.verts.backLowerRight.inside = true;
        voxel.verts.backLowerRight.position = verts.p1;
    }  //1
    if (values.v2 < threshold) {
        cubeIndex |= 4;
        voxel.verts.frontLowerRight.inside = true;
        voxel.verts.frontLowerRight.position = verts.p2;
    } //2
    if (values.v3 < threshold) {
        cubeIndex |= 8;
        voxel.verts.frontLowerLeft.inside = true;
        voxel.verts.frontLowerLeft.position = verts.p3;
    }  //3
    if (values.v4 < threshold) {
        cubeIndex |= 16;
        voxel.verts.backUpperLeft.inside = true;
        voxel.verts.backUpperLeft.position = verts.p4;
    }   //4
    if (values.v5 < threshold) {
        cubeIndex |= 32;
        voxel.verts.backUpperRight.inside = true;
        voxel.verts.backUpperRight.position = verts.p5;
    }  //5
    if (values.v6 < threshold) {
        cubeIndex |= 64;
        voxel.verts.frontUpperRight.inside = true;
        voxel.verts.frontUpperRight.position = verts.p6;
    } //6
    if (values.v7 < threshold) {
        cubeIndex |= 128;
        voxel.verts.frontUpperLeft.inside = true;
        voxel.verts.frontUpperLeft.position = verts.p7;
    }  //7

    var bits = THREE.edgeTable[ cubeIndex ];
    //if (bits === 0 ) continue;

    if (bits & 1) {
        vlist[0] = vertexInterpolation(threshold, verts.p0, verts.p1, values.v0, values.v1);
    }
    if (bits & 2) {
        vlist[1] = vertexInterpolation(threshold, verts.p1, verts.p2, values.v1, values.v2);
    }
    if (bits & 4) {
        vlist[2] = vertexInterpolation(threshold, verts.p2, verts.p3, values.v2, values.v3);
    }
    if (bits & 8) {
        vlist[3] = vertexInterpolation(threshold, verts.p3, verts.p0, values.v3, values.v0);
    }
    if (bits & 16) {
        vlist[4] = vertexInterpolation(threshold, verts.p4, verts.p5, values.v4, values.v5);
    }
    if (bits & 32) {
        vlist[5] = vertexInterpolation(threshold, verts.p5, verts.p6, values.v5, values.v6);
    }
    if (bits & 64) {
        vlist[6] = vertexInterpolation(threshold, verts.p6, verts.p7, values.v6, values.v7);
    }
    if (bits & 128) {
        vlist[7] = vertexInterpolation(threshold, verts.p7, verts.p4, values.v7, values.v4);
    }
    if (bits & 256) {
        vlist[8] = vertexInterpolation(threshold, verts.p0, verts.p4, values.v0, values.v4);
    }
    if (bits & 512) {
        vlist[9] = vertexInterpolation(threshold, verts.p1, verts.p5, values.v1, values.v5);
    }
    if (bits & 1024) {
        vlist[10] = vertexInterpolation(threshold, verts.p2, verts.p6, values.v2, values.v6);
    }
    if (bits & 2048) {
        vlist[11] = vertexInterpolation(threshold, verts.p3, verts.p7, values.v3, values.v7);
    }

    // The following is from Lee Stemkoski's example and
    // deals with construction of the polygons and adding to
    // the scene.
    // http://stemkoski.github.io/Three.js/Marching-Cubes.html
    // construct triangles -- get correct vertices from triTable.
    var i = 0;
    cubeIndex <<= 4;  // multiply by 16...
    // "Re-purpose cubeindex into an offset into triTable."
    //  since each row really isn't a row.
    // the while loop should run at most 5 times,
    //   since the 16th entry in each row is a -1.
    while (THREE.triTable[ cubeIndex + i ] != -1) {
        var index1 = THREE.triTable[cubeIndex + i];
        var index2 = THREE.triTable[cubeIndex + i + 1];
        var index3 = THREE.triTable[cubeIndex + i + 2];
        geometry.vertices.push(vlist[index1].clone());
        geometry.vertices.push(vlist[index2].clone());
        geometry.vertices.push(vlist[index3].clone());
        var face = new THREE.Face3(vertexIndex, vertexIndex + 1, vertexIndex + 2);
        geometry.faces.push(face);
        geometry.faceVertexUvs[ 0 ].push([ new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1) ]);
        vertexIndex += 3;
        i += 3;
    }

    geometry.computeCentroids();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    voxel.geometry = geometry;
    voxel.material = material;
    return voxel;
}

function VoxelState() {

    THREE.Mesh.apply(this, arguments);

    //this.voxMesh = null;
    this.centerPosition;

    this.verts = {
        backLowerLeft: { inside: false, node: false, position: new THREE.Vector3 },
        backLowerRight: { inside: false, node: false, position: new THREE.Vector3 },
        backUpperLeft: { inside: false, node: false, position: new THREE.Vector3 },
        backUpperRight: { inside: false, node: false, position: new THREE.Vector3 },

        frontLowerLeft: { inside: false, node: false, position: new THREE.Vector3 },
        frontLowerRight: { inside: false, node: false, position: new THREE.Vector3 },
        frontUpperLeft: { inside: false, node: false, position: new THREE.Vector3 },
        frontUpperRight: { inside: false, node: false, position: new THREE.Vector3 }
    };
}

VoxelState.prototype = Object.create(THREE.Mesh.prototype);
VoxelState.prototype.constructor = VoxelState;

function vertexInterpolation(threshold, p1, p2, val_1, val_2) {
    var mu = (threshold - val_1) / (val_2 - val_1);

    var p = new THREE.Vector3();

    if (Math.abs(threshold - val_1) < 0.00001)
        return p1;
    if (Math.abs(threshold - val_2) < 0.00001)
        return p2;
    if (Math.abs(p1 - val_2) < 0.0001)
        return p1;

    p.x = p1.x + mu * (p2.x - p1.x);
    p.y = p1.y + mu * (p2.y - p1.y);
    p.z = p1.z + mu * (p2.z - p1.z);

    return p;
}

function Spring(scene, node1, node2, strength, length) {
    this.node1 = node1;
    this.node2 = node2;
    this.length = length;
    this.distance = this.node1.position.distanceTo(this.node2.position);
    this.strength = strength;
    this.lineGeo = new THREE.Geometry();

    this.lineGeo.vertices.push(
        this.node1.position,
        this.node2.position);
    this.lineGeo.computeLineDistances();
    this.lineGeo.dynamic = true;

    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xCC0000 });
    this.line = new THREE.Line(this.lineGeo, this.lineMaterial);
    this.line.visible = true;
    scene.add(this.line);
}

Spring.prototype.update = function (delta) {

    var force = (this.length - this.getDistance()) * this.strength;

    var a1 = force / this.node1.mass;
    var a2 = force / this.node2.mass;

    var n1 = new THREE.Vector3,
        n2 = new THREE.Vector3;

    n1.subVectors(this.node1.position, this.node2.position).normalize().multiplyScalar(a1);
    n2.subVectors(this.node2.position, this.node1.position).normalize().multiplyScalar(a2);

    this.node1.move(delta, n1);
    this.node2.move(delta, n2);

    this.lineGeo.vertices[0] = this.node1.position;
    this.lineGeo.vertices[1] = this.node2.position;

    this.lineGeo.verticesNeedUpdate = true;
};

Spring.prototype.getDistance = function () {
    return this.node1.position.distanceTo(this.node2.position);
};


function Node() {
    THREE.Mesh.apply(this, arguments);

    this.mass;
    this.velocity;
    this.neigbourNodes = [];

    this.verticesNeedUpdate = true;
    this.normalsNeedUpdate = true;

    this.move = function (delta, force) {
        this.velocity.add(force);
        this.velocity.multiplyScalar(delta);
        this.position.add(this.velocity);
    };

}

Node.prototype = Object.create(THREE.Mesh.prototype);
Node.prototype.constructor = Node;

function radiusAtHeightOfSphere(height, radius) {
    return Math.sqrt(height * (2 * radius - height));
};

function calculateIntersection(x1, y1, x2, y2, r) {

    // if 1 solution

    // if 2 solution

    // if no solution


    return { x1: x1Intersection, y1: y1Intersection, x2: x2Intersection, y2: y2Intersection};
}

function procedurallyGenerateSphere(radius, lats, longs) {
    // http://stackoverflow.com/a/9084491
    var coords = [];
    var lineCoords = [];
    var t = new Array();


    for (var s = 0; s <= lats; s++) {
        t[s] = new Array();
    }

    var i, j;
    for (i = 0; i <= lats; i++) {
        var lat0 = Math.PI * (-0.5 + (i - 1) / lats);
        var z0 = Math.sin(lat0);
        var zr0 = Math.cos(lat0);

        var lat1 = Math.PI * ( -0.5 + i / lats);
        var z1 = Math.sin(lat1);
        var zr1 = Math.cos(lat1);

        for (j = 0; j < longs; j++) {
            var lng = 2 * Math.PI * (j - 1) / longs;
            var x = Math.cos(lng);
            var y = Math.sin(lng);

            var p1 = new THREE.Vector3(Math.round(x * zr0 * radius), Math.round(y * zr0 * radius), Math.round(z0 * radius));
            var p2 = new THREE.Vector3(Math.round(x * zr1 * radius), Math.round(y * zr1 * radius), Math.round(z1 * radius));

            coords.push(p1, p2);

            t[i][j] = (p1);

            lineCoords.push({a: p1, b: p2});
        }
    }

    var line;
    for (var c = 0; c < t.length; c++) {
        for (var b = 0; b < t[c].length; b++) {
            //var lineGeo = new THREE.Geometry();

            var v1 = t[c][b];
            var v2 = (b + 1 === t[c].length) ? t[c][0] : t[c][b + 1];

            lineCoords.push({a: v1, b: v2});
        }
    }

    // This is horrible code
    // to ensure coords are unique
    // I should be addressing this at the root
    // but I enjoy digging holes, some day I will learn
    var stringifiedCoords = [];
    var uniqueCoords = [];
    _.each(coords, function (elem) {
        stringifiedCoords.push(JSON.stringify(elem))
    });
    var unique = _.unique(stringifiedCoords);
    stringifiedCoords.clear();
    _.each(unique, function (elem) {
        stringifiedCoords.push(JSON.parse(elem))
    });
    _.each(stringifiedCoords, function (elem) {
        uniqueCoords.push(new THREE.Vector3(elem.x, elem.y, elem.z))
    });

    var stringifiedLines = [];
    _.each(lineCoords, function (elem) {
        stringifiedLines.push(JSON.stringify(elem))
    });
    unique.clear();
    unique = _.unique(stringifiedLines);
    stringifiedLines.clear();
    _.each(unique, function (elem) {
        stringifiedLines.push(JSON.parse(elem))
    });


    lineCoords.clear();

    _.each(stringifiedLines, function (elem) {

        var v1 = new THREE.Vector3(elem.a.x, elem.a.y, elem.a.z);
        var v2 = new THREE.Vector3(elem.b.x, elem.b.y, elem.b.z);

        var lineGeo = new THREE.Geometry();
        lineGeo.vertices.push(
            v1,
            v2);

        lineGeo.computeLineDistances();

        var lineMaterial = new THREE.LineBasicMaterial({ color: 0xCC0000 });
        var line = new THREE.Line(lineGeo, lineMaterial);

        lineCoords.push(line);

    });


    return { lines: lineCoords, uniqueCoord: uniqueCoords };
}

function calculateShortestDistanceFromPointToLine(p, s, f) {
    // http://paulbourke.net/geometry/pointlineplane/
    var lineMag = new THREE.Vector2();
    lineMag.subVectors(f, s);
    var len = lineMag.length();


    var u = (((p.x - s.x ) * (f.x - s.x)) + ((p.y - s.y) * (f.y - s.y))) / (Math.pow(len, 2));

    var x = s.x + u * ( f.x - s.x);
    var y = s.y + u * ( f.y - s.y);

    var poc = new THREE.Vector2(x, y);
    var l = (poc.sub(p)).length();

    return { poc: poc, distance: l};
}

function getEquationOfPlaneFromThreePoints(pt1, pt2, pt3) {
    // http://paulbourke.net/geometry/pointlineplane/
    var aX = pt1.y * (pt2.z - pt3.z) + pt2.y * (pt3.z - pt1.z) + pt3.y * (pt1.z - pt2.z);
    var bY = pt1.z * (pt2.x - pt3.x) + pt2.z * (pt3.x - pt1.x) + pt3.z * (pt1.x - pt2.x);
    var cZ = pt1.x * (pt2.y - pt3.y) + pt2.x * (pt3.y - pt1.y) + pt3.x * (pt1.y - pt2.y);
    var d = pt1.x * (pt2.y * pt3.z - pt3.y * pt2.z) + pt2.x * (pt3.y * pt1.z - pt1.y * pt3.z ) + pt3.x * (pt1.y * pt2.z - pt2.y * pt1.z);
    return { aX: aX, bY: bY, cZ: cZ, d: d};
}

Array.prototype.clear = function () {
    while (this.length > 0) {
        this.pop();
    }
}