import {parse} from '@loaders.gl/core';
// eslint-disable-next-line import/no-unresolved
import {GLTFLoader} from '@loaders.gl/gltf';
import GL from '@luma.gl/constants';
import {AnimationLoop, Timeline} from '@luma.gl/engine';
import {
  Framebuffer,
  clear,
  Program,
  Texture2D,
  VertexArray,
  UniformBufferLayout,
  Buffer, log, lumaStats
} from '@luma.gl/webgl';
import {setParameters} from '@luma.gl/gltools';
import {createGLTFObjects, GLTFEnvironment, VRDisplay} from '@luma.gl/experimental';
import {Matrix4, radians} from 'math.gl';
import BloomEffect from './BloomEffect';


// Damaged helmet model used under creative commons: https://github.com/KhronosGroup/glTF-Sample-Models/tree/1ba47770292486e66ca1e1161857a6e5695c2631/2.0/DamagedHelmet
// Papermill textures used under Apache 2.0: https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/e2d487693fa2e6148bd29d05bc82586f5a002a45/LICENSE.md

const GLTF_BASE_URL =
  'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/luma.gl/examples/gltf/';
const GLTF_DEFAULT_MODEL = 'DamagedHelmet.glb';

// URL for animated model
// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/InterpolationTest/glTF-Binary/InterpolationTest.glb';

const LIGHT_SOURCES = {
  default: {
    directionalLights: [
      {
        color: [255, 255, 255],
        direction: [0.0, 0.5, 0.5],
        intensity: 1.0
      }
    ]
  },
  ambient: {
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  },
  directional1: {
    directionalLights: [
      {
        color: [255, 0, 0],
        direction: [1.0, 0.0, 0.0],
        intensity: 1.0
      }
    ],
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  },
  directional3: {
    directionalLights: [
      {
        color: [255, 0.0, 0.0],
        direction: [1.0, 0.0, 0.0],
        intensity: 1.0
      },
      {
        color: [0.0, 0.0, 255],
        direction: [0.0, 0.0, 1.0],
        intensity: 1.0
      },
      {
        color: [0.0, 255, 0.0],
        direction: [0.0, 1.0, 0.0],
        intensity: 1.0
      }
    ]
  },
  point1far: {
    pointLights: [
      {
        color: [255, 0, 0],
        position: [200.0, 0.0, 0.0],
        attenuation: [0, 0, 0.01],
        intensity: 1.0
      }
    ],
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  },
  point1near: {
    pointLights: [
      {
        color: [255, 0, 0],
        position: [10.0, 0.0, 0.0],
        attenuation: [0, 0, 0.01],
        intensity: 1.0
      }
    ],
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  }
};

const DEFAULT_OPTIONS = {
  pbrDebug: false,
  imageBasedLightingEnvironment: null,
  lights: false
};

async function loadGLTF(urlOrPromise, gl, options) {
  const data = typeof urlOrPromise === 'string' ? window.fetch(urlOrPromise) : urlOrPromise;  
  const gltf = await parse(data, GLTFLoader);
  const {scenes} = createGLTFObjects(gl, gltf);
  scenes[0].traverse((node, {worldMatrix}) => log.info(4, 'Using model: ', node)());
  return {scenes, gltf};
}

const vs = `#version 300 es
      #define SHADER_NAME quad.vs
      layout(location=0) in vec3 aPosition;
      void main() {
          gl_Position = vec4(aPosition, 1.0);
      }`;
const fs = `#version 300 es
      precision highp float;
      #define SHADER_NAME bloom.fs

      uniform sampler2D uScene;
      out vec4 fragColor;
      
      vec4 boxFilter(ivec2 coord){
        vec4 color;
        ivec2 resolution = textureSize(uScene, 0);
        for(int i = 0; i < 3; i++)
        {
          for(int j = 0; j<3; j++)
          {
            ivec2 sampleCoord;
            sampleCoord.x = (coord.x + (j-1)) % resolution.x;
            sampleCoord.y = (coord.y + (i-1)) % resolution.y;
            color += texelFetch(uScene, sampleCoord, 0)/9.0;
          }
        }
        return color;
      }

      void main() {
          ivec2 fragCoord = ivec2(gl_FragCoord.xy);
          //fragColor = texelFetch(uScene, fragCoord,0);

          fragColor = texelFetch(uScene, fragCoord,0) + boxFilter(fragCoord) * 4.0;
      }`;

export default class Renderer extends AnimationLoop {
  
  constructor(opts = {}) {
    super({
      ...opts,
      glOptions: {
        // Use to test gltf with webgl 1.0 and 2.0
        webgl1: true,
        webgl2: true,
        // alpha causes issues with some glTF demos
        alpha: false,
        width: '100vw',
        height: '100vh',
      }
    });

    const {modelFile = null, initialZoom = 2} = opts;
    this.scenes = [];
    this.animator = null;
    this.gl = null;
    this.modelFile = modelFile;

    this.mouse = {
      lastX: 0,
      lastY: 0
    };

    this.translate = initialZoom;
    this.rotation = [0, 0];
    this.rotationStart = [0, 0];

    this.u_ScaleDiffBaseMR = [0, 0, 0, 0];
    this.u_ScaleFGDSpec = [0, 0, 0, 0];    

    this.onInitialize = this.onInitialize.bind(this);
    this.onRender = this.onRender.bind(this);
    this._setDisplay(new VRDisplay());    
  }

  initalizeEventHandling(canvas) {
    let pointerIsDown = false;

    const pointerDown = (x, y) => {
      this.mouse.lastX = x;
      this.mouse.lastY = y;

      this.rotationStart[0] = this.rotation[0];
      this.rotationStart[1] = this.rotation[1];

      pointerIsDown = true;
    };

    const pointerMove = (x, y) => {
      if (!pointerIsDown) {
        return;
      }

      const dX = x - this.mouse.lastX;
      const dY = y - this.mouse.lastY;

      this.rotation[0] = this.rotationStart[0] + dY / 100;
      this.rotation[1] = this.rotationStart[1] + dX / 100;
    };

    canvas.addEventListener('wheel', e => {
      this.translate += e.deltaY / 10;
      if (this.translate < 0.5) {
        this.translate = 0.5;
      }
      e.preventDefault();
    });

    canvas.addEventListener('mousedown', e => {
      pointerDown(e.clientX, e.clientY);

      e.preventDefault();
    });

    canvas.addEventListener('mouseup', e => {
      pointerIsDown = false;
    });

    canvas.addEventListener('mousemove', e => {
      pointerMove(e.clientX, e.clientY);
    });    

    canvas.addEventListener('dragover', e => {
      e.dataTransfer.dropEffect = 'link';
      e.preventDefault();
    });    
  }

  _fileLoaded(loadResult) {
    Object.assign(this, loadResult);
  }

  onInitialize({gl, canvas}) {
    setParameters(gl, {
      depthTest: true,
      blend: false
    });

    this.loadOptions = DEFAULT_OPTIONS;    
    //this.loadOptions.imageBasedLightingEnvironment = this.environment;

    this.gl = gl;
    var url = GLTF_DEFAULT_MODEL;
    loadGLTF(GLTF_BASE_URL + url, this.gl, this.loadOptions).then(result =>
      this._fileLoaded(result)
    );
    this.initalizeEventHandling(canvas);

    this.effect = new BloomEffect(gl);

    const sceneFB = new Framebuffer(gl, {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      attachments: {
        [GL.COLOR_ATTACHMENT0]: new Texture2D(gl, {
          format: GL.RGBA,
          type: GL.UNSIGNED_BYTE,
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          mipmaps: false,
          parameters: {
            [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
            [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
            [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
            [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
          }
        }),
        [GL.DEPTH_ATTACHMENT]: new Texture2D(gl, {
          format: GL.DEPTH_COMPONENT16,
          type: GL.UNSIGNED_SHORT,
          dataFormat: GL.DEPTH_COMPONENT,
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          mipmaps: false,
          parameters: {
            [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
            [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
            [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
            [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
          }
        })
      }
    });

    // Postprocessing FBO doesn't need a depth attachment.
    const postprocessFB = new Framebuffer(gl, {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      depth: false
    });

    const bloomPassProgram = new Program(gl, {
      id: 'BLOOM_PASS',
      vs: vs,
      fs: fs
    });

    const quadVertexArray = new VertexArray(gl, {
      program: bloomPassProgram,
      attributes: {
        aPosition: new Buffer(gl, new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0]))
      }
    });
    return {sceneFB, postprocessFB, bloomPassProgram, quadVertexArray};
  }
  
  _rebuildModel() {
    // Clean and regenerate model so we have new "#defines"
    // TODO: Find better way to do this
    (this.gltf.meshes || []).forEach(mesh => delete mesh._mesh);
    (this.gltf.nodes || []).forEach(node => delete node._node);
    (this.gltf.bufferViews || []).forEach(bufferView => delete bufferView.lumaBuffers);

    this._deleteScenes();
    Object.assign(this, createGLTFObjects(this.gl, this.gltf, this.loadOptions));
  }

  _deleteScenes() {
    this.scenes.forEach(scene => scene.delete());
    this.scenes = [];

    lumaStats.get('Resource Counts').forEach(({name, count}) => {
      log.info(3, `${name}: ${count}`)();
    });
  }

  applyLight(model) {
    // TODO: only do this when light changes
    model.updateModuleSettings({
      lightSources: LIGHT_SOURCES[this.light || 'default']
    });
  }

  onRender({gl, time, aspect, viewMatrix, projectionMatrix, sceneFB, postprocessFB, bloomPassProgram, quadVertexArray}) {
    sceneFB.resize({width : gl.drawingBufferWidth, height: gl.drawingBufferHeight});
    postprocessFB.resize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    clear(gl, {color: [0.2, 0.2, 0.2, 1], depth: true, framebuffer: sceneFB});

    const [pitch, roll] = this.rotation;
    const cameraPos = [
      -this.translate * Math.sin(roll) * Math.cos(-pitch),
      -this.translate * Math.sin(-pitch),
      this.translate * Math.cos(roll) * Math.cos(-pitch)
    ];

    // TODO: find how to avoid using Array.from() to convert TypedArray to regular array
    const uView = new Matrix4(viewMatrix ? Array.from(viewMatrix) : null)
      .translate([0, 0, -this.translate])
      .rotateX(pitch)
      .rotateY(roll);

    const uProjection = projectionMatrix
      ? new Matrix4(Array.from(projectionMatrix))
      : new Matrix4().perspective({fov: radians(40), aspect, near: 0.1, far: 9000});

    if (!this.scenes.length) return false;

    let success = true;

    this.scenes[0].traverse((model, {worldMatrix}) => {
      // In glTF, meshes and primitives do no have their own matrix.
      const u_MVPMatrix = new Matrix4(uProjection).multiplyRight(uView).multiplyRight(worldMatrix);
      this.applyLight(model);
      success =
        success &&
        model.draw({
          uniforms: {
            u_Camera: cameraPos,
            u_MVPMatrix,
            u_ModelMatrix: worldMatrix,
            u_NormalMatrix: new Matrix4(worldMatrix).invert().transpose(),

            u_ScaleDiffBaseMR: this.u_ScaleDiffBaseMR,
            u_ScaleFGDSpec: this.u_ScaleFGDSpec
          },
          framebuffer: sceneFB,
          parameters: model.props.parameters
        });
    });

    //Apply bloom pass
    this.effect.render(sceneFB, gl);
    /*
    bloomPassProgram.setUniforms({
      uScene: sceneFB.color
    });

    bloomPassProgram.draw({
      vertexArray: quadVertexArray,
      drawMode: gl.TRIANGLE_STRIP,
      vertexCount: 4
    });*/

    return success;
  }
}
