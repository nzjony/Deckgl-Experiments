import React from 'react';
import {MapboxLayer} from '@deck.gl/mapbox';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
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
    this.camera = {};
    this.scene = {};
    this.renderer = {};
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
    
    // use the Mapbox GL JS map canvas for THREE.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true
    });
    
    this.renderer.autoClear = false;
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
    this.renderer.render(this.scene, this.camera);
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