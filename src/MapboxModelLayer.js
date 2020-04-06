import React from 'react';
import {MapboxLayer} from '@deck.gl/mapbox';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import mapboxgl from 'mapbox-gl';

class MapboxModelLayer {
  constructor(id, url) {
    this.url = url;
    this.id = id;
    this.map = null;
    this.origin = [148.9819, -35.3981];
    this.alt = 10;
    this.rotations = [Math.PI / 2, 0, 0];
    this.mercCoord = mapboxgl.MercatorCoordinate.fromLngLat(this.origin, this.alt);
    
    // transformation parameters to position, rotate and scale the 3D model onto the map
    this.modelTransform = {
      translateX: this.mercCoord.x,
      translateY: this.mercCoord.y,
      translateZ: this.mercCoord.z,
      rotateX: this.rotations[0],
      rotateY: this.rotations[1],
      rotateZ: this.rotations[2],     
      scale: 4 * this.mercCoord.meterInMercatorCoordinateUnits()
    };
    this.camera = null;
    this.scene = null;
    this.renderer = null;
    this.compose = null;
  }

  onAdd = (map, gl) => {
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();
    
    // create two THREE.js lights to illuminate the model
    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(0, -70, 100).normalize();
    this.scene.add(directionalLight);
    
    var directionalLight2 = new THREE.DirectionalLight(0xffffff);
    directionalLight2.position.set(0, 70, 100).normalize();
    this.scene.add(directionalLight2);
    
    // use the THREE.js GLTF loader to add the 3D model to the THREE.js scene
    var loader = new GLTFLoader();
    loader.load(this.url, (gltf) => {
      this.scene.add(gltf.scene);
      }
    );
    this.scene.background = null;
    // use the Mapbox GL JS map canvas for THREE.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true
    });
    //document.body.appendChild( this.renderer.domElement );

    this.renderer.autoClear = false;
    this.composer = new EffectComposer( this.renderer );
    //this.composer.renderToScreen = false;
    this.composer.addPass(new RenderPass(this.scene, this.camera, null, new THREE.Color(1,0,0), 0.6));    
    //this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1280, 720), 2, 0.5, 0.85));    
    //this.composer.addPass(new AfterimagePass(0.9));
  }

  onRender = (gl, matrix) => {
    let rotX = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(1, 0, 0),
      this.modelTransform.rotateX
    );

    var rotY = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 1, 0),
      this.modelTransform.rotateY
    );
    var rotZ = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 0, 1),
      this.modelTransform.rotateZ
    );
    
    var m = new THREE.Matrix4().fromArray(matrix);
    var l = new THREE.Matrix4()
    .makeTranslation(this.modelTransform.translateX, this.modelTransform.translateY, this.modelTransform.translateZ)
    .scale(new THREE.Vector3(this.modelTransform.scale, -this.modelTransform.scale, this.modelTransform.scale))
    .multiply(rotX).multiply(rotY).multiply(rotZ);
    
    this.camera.projectionMatrix = m.multiply(l);
    this.renderer.state.reset();
    //this.renderer.setClearColor(new THREE.Color(0,1,0), 1);
    //this.renderer.setClearAlpha(1);
    //this.renderer.clear();
    this.composer.render();
    //this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }

  loadLayer = (map) =>
  {
    this.map = map;
    map.addLayer({
      id: this.id,
      type: 'custom',
      renderingMode: '3d',
      onAdd: this.onAdd,
      render: this.onRender,
    })
  }
}

export default MapboxModelLayer;