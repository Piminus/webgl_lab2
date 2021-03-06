'use strict';

let gl;                         // The webgl context.

let iAttribVertex;              // Location of the attribute variable in the shader program.
let iAttribTexture;             // Location of the attribute variable in the shader program.

let iColor;                     // Location of the uniform specifying a color for the primitive.
let iColorCoef;                 // Location of the uniform specifying a color for the primitive.
let iModelViewProjectionMatrix; // Location of the uniform matrix representing the combined transformation.
let iTextureMappingUnit;

let iVertexBuffer;              // Buffer to hold the values.
let iTexBuffer;                 // Buffer to hold the values.

let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.


let reverseLightDirectionLocation
let colorLocation
let normalLocation
let normalBuffer

var alpha = 0;
var beta = 0;
var gamma = 0;

let data = {frame: false,
			color: true,
			texture: false,
			anaglyph: true};
let worldViewProjectionLocation
let worldLocation

let scale = 1.0;
let convergence = 50;
let eyeSeparation = 0.06;
let FOV = Math.PI/8;
let nearClippingDistance = 8;

let AnaglyphCamera;

function degToRad(d) {
	return d * Math.PI / 180;
}
 
var degtorad = Math.PI / 180; // Degree-to-Radian conversion

function getRotationMatrix( alpha, beta, gamma ) {

  var _x = beta  ? beta  * degtorad : 0; // beta value
  var _y = gamma ? gamma * degtorad : 0; // gamma value
  var _z = alpha ? alpha * degtorad : 0; // alpha value

  var cX = Math.cos( _x );
  var cY = Math.cos( _y );
  var cZ = Math.cos( _z );
  var sX = Math.sin( _x );
  var sY = Math.sin( _y );
  var sZ = Math.sin( _z );

  //
  // ZXY rotation matrix construction.
  //

  var m11 = cZ * cY - sZ * sX * sY;
  var m12 = - cX * sZ;
  var m13 = cY * sZ * sX + cZ * sY;

  var m21 = cY * sZ + cZ * sX * sY;
  var m22 = cZ * cX;
  var m23 = sZ * sY - cZ * cY * sX;

  var m31 = - cX * sY;
  var m32 = sX;
  var m33 = cX * cY;

  return [
    m11,    m12,    m13, 0,
    m21,    m22,    m23, 0,
    m31,    m32,    m33, 0,
	0,      0,      0,   1
  ];

};
 
function drawPrimitive(primitiveType, color, vertices, normals, texCoords) {
    gl.uniform4fv(iColor, color);
    gl.uniform1f(iColorCoef, 0.0);

	gl.uniform3fv(reverseLightDirectionLocation, m4.normalize([0, 0, 1]));

    gl.enableVertexAttribArray(iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);

	gl.enableVertexAttribArray(normalLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0)
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    if (texCoords) {
        gl.enableVertexAttribArray(iAttribTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    } else {
        gl.disableVertexAttribArray(iAttribTexture);
        gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
        gl.uniform1f(iColorCoef, 1.0);
    }

    gl.drawArrays(primitiveType, 0, vertices.length / 3);
}

// Constructor function
function StereoCamera(  
        Convergence,
        EyeSeparation,
        AspectRatio,
        FOV,
        NearClippingDistance,
        FarClippingDistance
        )
{
	this.mConvergence            = Convergence;
	this.mEyeSeparation          = EyeSeparation;
	this.mAspectRatio            = AspectRatio;
	this.mFOV                    = FOV;
	this.mNearClippingDistance   = NearClippingDistance;
	this.mFarClippingDistance    = FarClippingDistance;
    
	this.mLeftProjectionMatrix = null;
	this.mRightProjectionMatrix = null;
	
	this.mLeftModelViewMatrix = null;
	this.mRightModelViewMatrix = null;
 
    this.ApplyLeftFrustum = function()
    {
        let top, bottom, left, right;
        top     = this.mNearClippingDistance * Math.tan(this.mFOV/2);
        bottom  = -top;
 
        let a = this.mAspectRatio * Math.tan(this.mFOV/2) * this.mConvergence;
        let b = a - this.mEyeSeparation/2;
        let c = a + this.mEyeSeparation/2;
 
        left    = -b * this.mNearClippingDistance/this.mConvergence;
        right   =  c * this.mNearClippingDistance/this.mConvergence;
 
        // Set the Projection Matrix 
        this.mLeftProjectionMatrix = m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
 
        // Displace the world to right 
        this.mLeftModelViewMatrix = m4.translation(this.mEyeSeparation/2, 0.0, 0.0);
    }
 
    this.ApplyRightFrustum = function()
    {
        let top, bottom, left, right;
        top     = this.mNearClippingDistance * Math.tan(this.mFOV/2);
        bottom  = -top;
 
        let a = this.mAspectRatio * Math.tan(this.mFOV/2) * this.mConvergence;
        let b = a - this.mEyeSeparation/2;
        let c = a + this.mEyeSeparation/2;
 
        left    =  -c * this.mNearClippingDistance/this.mConvergence;
        right   =   b * this.mNearClippingDistance/this.mConvergence;
 
        // Set the Projection Matrix
        this.mRightProjectionMatrix = m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
 
        // Displace the world to left  
        this.mRightModelViewMatrix = m4.translation(-this.mEyeSeparation/2, 0.0, 0.0);
    }
}

function getFunc(a, t, k){
	let r = 1;
	let c = 1;
	let d = 0.5;
	let teta = Math.PI/3;
	let a0 = 0;
	
	let x = (r * Math.cos(a) - (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) * Math.sin(a)) / k;
    let y = (r * Math.sin(a) + (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) * Math.cos(a)) / k;
    let z = (t * Math.sin(teta) + c * Math.sin(d * t) * Math.cos(teta)) / -k;
	return [x, y, z];
}


function getVector1(a, t, k){
	let delta = 0.01;
	let point1 = getFunc(a, t, k);
	let point2 = getFunc(a + delta, t, k);
	return [point2[0] - point1[0], point2[1] - point1[1], point2[2] - point1[2]];
}

function getVector2(a, t, k){
	let delta = 0.01;
	let point1 = getFunc(a, t, k);
	let point2 = getFunc(a, t + delta, k);
	return [point2[0] - point1[0], point2[1] - point1[1], point2[2] - point1[2]];
}

function onceVector(vec){
	let len = Math.hypot(vec[0], vec[1], vec[2]);
	return [vec[0] / len, vec[1] / len, vec[2] / len];
}

function normal(a, t, k){
	let vec1 = getVector1(a, t, k);
	let vec2 = getVector2(a, t, k);
	
	let x = vec1[1] * vec2[2] - vec1[2] * vec2[1];
	let y = vec1[2] * vec2[0] - vec1[0] * vec2[2];
    let z = vec1[0] * vec2[1] - vec1[1] * vec2[0];
    return onceVector([x, y, z]);
}

function revNormal(a, t, k){
	let vec = normal(a, t, k);
    return [-vec[0], -vec[1], -vec[2]];
}


function draw1(k, normal) {
	const step = Math.PI / 180 * 20;
	const size = Math.PI / 2;
	for (let t = -12; t <= 12; t += step) {
		let positions = [];	
		let normals = [];
	
		for (let a = 8; a <= 15 * size; a += step) {
			positions = positions.concat(getFunc(a, t, k));
			normals = normals.concat(normal(a, t, k));
			
			positions = positions.concat(getFunc(a, t + step, k));
			normals = normals.concat(normal(a, t + step, k));
		}	

		drawPrimitive(gl.TRIANGLE_STRIP, [0.6, 0.5, 0.7	, 1], positions, normals);
	}
}
function draw2() {
	gl.enableVertexAttribArray(iAttribTexture);
    gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]), gl.STREAM_DRAW);
    gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
		  
    draw1(15, revNormal)
    draw1(15.01, normal)
	
}
/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
	AnaglyphCamera = new StereoCamera(convergence, eyeSeparation, 1, FOV, nearClippingDistance, 12);
	AnaglyphCamera.ApplyLeftFrustum();
	AnaglyphCamera.ApplyRightFrustum();
	
    gl.clearColor(0.8, 0.8, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = AnaglyphCamera.mLeftProjectionMatrix;
	let scaleM = m4.scaling(scale, scale, scale);

    /* Get the view matrix from the SimpleRotator object.*/
    //let modelView = spaceball.getViewMatrix();
	let modelView = getRotationMatrix(alpha, beta, gamma);
	
    let rotateToPointZero = m4.axisRotation([-1., 0, 0], 1.57	);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(scaleM, modelView);
    let matAccum1 = m4.multiply(rotateToPointZero, matAccum0 );
    let matAccum2 = m4.multiply(translateToPointZero, matAccum1 );
	let matAccum3 = m4.multiply(AnaglyphCamera.mLeftModelViewMatrix, matAccum2);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum3);

    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniform1i(iTextureMappingUnit, 0);

	//gl.uniformMatrix4fv(worldViewProjectionLocation, false, matAccum0);
	gl.uniformMatrix4fv(worldLocation, false, matAccum1);
	
	if (data.anaglyph) {
		gl.colorMask(true, false, false, false);
		draw2();
		
		gl.clear(gl.DEPTH_BUFFER_BIT);
		
		projection = AnaglyphCamera.mRightProjectionMatrix;
		matAccum3 = m4.multiply(AnaglyphCamera.mRightModelViewMatrix, matAccum2);
		modelViewProjection = m4.multiply(projection, matAccum3);
		
		gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjection );
		
		gl.colorMask(false, true, true, false);
		draw2();
		gl.colorMask(true, true, true, true);
	}
	else {
		draw2();
	}
    gl.lineWidth(4);
    drawPrimitive(gl.LINES, [1, 0, 0, 1], [-2, 0, 0, 2, 0, 0]);
    drawPrimitive(gl.LINES, [0, 1, 0, 1], [0, -2, 0, 0, 2, 0]);
    drawPrimitive(gl.LINES, [0, 0, 1, 1], [0, 0, -2, 0, 0, 2]);
    gl.lineWidth(1);
}


/* Initialize the WebGL context. Called from init() */
function initWebGL() {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    iAttribVertex = gl.getAttribLocation(program, "vertex");
    iAttribTexture = gl.getAttribLocation(program, "texCoord");
	normalLocation = gl.getAttribLocation(program, "a_normal");

    iModelViewProjectionMatrix = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    iColor = gl.getUniformLocation(program, "color");
    iColorCoef = gl.getUniformLocation(program, "fColorCoef");
    iTextureMappingUnit = gl.getUniformLocation(program, "u_texture");
	colorLocation = gl.getUniformLocation(program, "u_color");
	reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");

	//worldViewProjectionLocation = gl.getUniformLocation(program, "u_worldViewProjection");
	worldLocation = gl.getUniformLocation(program, "u_world");

    iVertexBuffer = gl.createBuffer();
    iTexBuffer = gl.createBuffer();

	// ?????????????? ?????????? ?????? ????????????????
	normalBuffer = gl.createBuffer();
	// ?????????????????????? ?????? ?? ARRAY_BUFFER (?????????????? ????????????, ARRAY_BUFFER = normalBuffer)
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	
    LoadTexture();
	
	webglLessonsUI.setupSlider("#Convergence_distance", {value: convergence, slide: updateConvergence, min: 1, max: 100});
	webglLessonsUI.setupSlider("#Eye_separation_parameter", {value: eyeSeparation, slide: updateEyeSeparation, min: 0.01, max: 0.5, precision: 2, step: 0.01});
	webglLessonsUI.setupSlider("#Field_of_View", {value: FOV, slide: updateFOV, min: 0.01, max: 1, precision: 2, step: 0.01});
	webglLessonsUI.setupSlider("#Near_Clipping_distance", {value: nearClippingDistance, slide: updateNearClippingDistance, min: 1, max: 20, precision: 2, step: 0.01});
	
    gl.enable(gl.DEPTH_TEST);
}

function updateConvergence(event, ui) {
    convergence = ui.value;
    draw();
}

function updateEyeSeparation(event, ui) {
    eyeSeparation = ui.value;
    draw();
}

function updateFOV(event, ui) {
    FOV = ui.value;
    draw();
}

function updateNearClippingDistance(event, ui) {
    nearClippingDistance = ui.value;
    draw();
}

function LoadTexture() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 25, 55]));
    var image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = "https://webglfundamentals.org/webgl/resources/f-texture.png";
    image.addEventListener('load', () => {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);

        draw();
    });
}

function createProgram(gl, vShader, fShader) {
    const vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }

    const fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vsh);
    gl.attachShader(program, fsh);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(program));
    }

    return program;
}


function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initWebGL();  // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

	window.addEventListener("deviceorientation", function orient(event) {
      alpha = -event.alpha
	  beta = -event.beta
	  gamma = -event.gamma
	  draw();
	}, true);

    spaceball = new TrackballRotator(canvas, draw, 0);
	canvas.onmousewheel = function(event){
		scale +=(event.wheelDelta/120)/10.0;
		draw();
		return false;
	};

    draw();
}
