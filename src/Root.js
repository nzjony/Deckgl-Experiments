import React from 'react';
import DeckGL from '@deck.gl/react';
import {ArcLayer} from '@deck.gl/layers';
import { MapView, MapViewEventNames, MapViewUtils } from "@here/harp-mapview";
import { GeoCoordinates } from "@here/harp-geoutils";
import { APIFormat, AuthenticationMethod, AuthenticationTypeMapboxV4, OmvDataSource } from "@here/harp-omv-datasource";
import loadCSV from './DataLoader';
import {Model, Buffer, Framebuffer, instrumentGLContext, withParameters} from '@luma.gl/core';
import {Deck} from '@deck.gl/core';

class Root extends React.Component{

  constructor ( props ) {
    super( props );
    this.map = null;
    this.deck = null;
    this.state = {          
      viewState: {
        latitude: 41.894683169437165,
        longitude: 12.507511269849497,
        bearing: 82,
        pitch: 54,
        zoom: 17,
        maxZoom: 21,
      },
      gl: {},
    };  
    this.initMapView(); 
  }

  onWebGLInitialized = (gl) => {
    console.log("gl-init");    
    this.setState({gl});
  }

  onViewStateChange = ( { viewState } ) => {
    const coords = new GeoCoordinates( viewState.latitude, viewState.longitude );
    this.mapView.lookAt( coords, MapViewUtils.calculateDistanceFromZoomLevel( { focalLength: this.mapView.focalLength }, viewState.zoom + 1 ), viewState.pitch, viewState.bearing );
    this.mapView.zoomLevel = viewState.zoom + 1;
    this.setState( { viewState } );
  }

  componentDidMount = () => {
    loadCSV('Mustang-Arc-2.csv', 'arc', true).then(data => {
      this.dataArr = data;
      this.forceUpdate();
    });
  }


  resizeFBO = () => {
    let width = window.innerWidth;
    let height = window.innerHeight;
    const gl = this.webglContext;

    /* global window */
    const dpr = window.devicePixelRatio;
    width = Math.round(width * dpr);
    height = Math.round(height * dpr);

    this.deckFbo.resize({width, height});
  }

  onLoad = () => {
    console.log('here');
    const gl = this.state.gl;
    instrumentGLContext(gl);
  
    this.buffer = new Buffer(gl, new Int8Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  
    this.model = new Model(gl, {
      vs: `
        attribute vec2 a_pos;
        varying vec2 v_texcoord;
        void main(void) {
            gl_Position = vec4(a_pos, 0.0, 1.0);
            v_texcoord = (a_pos + 1.0) / 2.0;
        }
      `,
      fs: `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_texcoord;
        void main(void) {
            vec4 rgba = texture2D(u_texture, v_texcoord);
            rgba.rgb *= rgba.a;
            gl_FragColor = rgba;
        }
      `,
      attributes: {
        a_pos: this.buffer
      },
      vertexCount: 4,
      drawMode: gl.TRIANGLE_STRIP
    }); 

    this.deckFbo = new Framebuffer(gl, {width: window.innerWidth, height: window.innerHeight});
    this.deck.setProps({ _framebuffer: this.deckFbo });

  }

  afterRender = ({gl}) => {
    let width = window.innerWidth;
    let height = window.innerHeight;
    const screenFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);

    /* global window */
    const dpr = window.devicePixelRatio;
    width = Math.round(width * dpr);
    height = Math.round(height * dpr);

    withParameters(
      gl,
      {
        blend: true,
        blendFunc: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
        framebuffer: screenFbo,
        viewport: [0, 0, width, height]
      },
      () => {
        this.model.setUniforms({u_texture: this.deckFbo}).draw();
      }
    );
  }

  initializeResources = () => {    
    this.deck = new Deck({

      style: {zIndex: 0},
      // The view state will be set dynamically to track the MapView current extent.
      viewState: this.state.viewState,

      onViewStateChange: this.onViewStateChange,
  
      // Input is handled by the ArcGIS API for JavaScript.
      controller: true,
      
      onBeforeRender: (gl) => { this.resizeFBO() },

      onAfterRender: this.afterRender,
      onWebGLInitialized: this.onWebGLInitialized,

      onLoad: this.onLoad,
      // We use the same WebGL context as the ArcGIS API for JavaScript.
      //gl,
  
      // We need depth testing in general; we don't know what layers might be added to the deck.
      parameters: {
        depthTest: true
      },
  
      // This deck renders into an auxiliary framebuffer.
      _framebuffer: this.deckFbo,
  
      /*_customRender: redrawReason => {
        if ( redrawReason === 'basemap redrawn' ) {
        // base map just redrew, due to e.g. tiles being loaded
        // render all layers without clearing the canvas
          this.deck._drawLayers( redrawReason, {clearCanvas: false});
        } else {
          // Triggered by other reasons - layer update, view state change, transition, etc.
          // Tell the base map to redraw first
          //this.mapView.update();
          //this.deck._drawLayers( redrawReason, { clearCanvas: false } );
        }
      },*/
    });
  }

  initMapView = () => {
    const mapCanvas = document.getElementById( 'mapCanvas' );
    const contextAttributes = {
			alpha: false,
			depth: true,
			stencil: true,
			antialias: false,
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			powerPreference: 'default',
			failIfMajorPerformanceCaveat: false,
			xrCompatible: true,
    };
    
    this.webglContext = mapCanvas.getContext( 'webgl', contextAttributes );

    const viewState = this.state.viewState;
    this.mapView = new MapView( {
      canvas: mapCanvas,
      //theme: "/resources/berlin_tilezen_day_reduced.json",
      //theme: 'https://unpkg.com/@here/harp-map-theme@latest/resources/berlin_tilezen_night_reduced.json',
      theme: 'https://assets.vector.hereapi.com/styles/berlin/base/harp.gl/tilezen?apikey=YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc',
      zoomLevel: viewState.zoom,
      decoderUrl: './harpgl-decoder.bundle.js',
      enableNativeWebglAntialias: true,      
    } );
    
    this.mapView.addEventListener( MapViewEventNames.AfterRender, () => {
      if ( this.deck ) { this.deck.redraw( 'basemap redrawn', true ); }
    } );

    const coords = new GeoCoordinates( viewState.latitude, viewState.longitude );
    this.mapView.setFovCalculation( { fov: 36, type: 'fixed' } );
    this.mapView.maxZoomLevel = 21;
    this.mapView.geoCenter = coords;
    this.mapView.lookAt( coords, MapViewUtils.calculateDistanceFromZoomLevel( { focalLength: this.mapView.focalLength }, viewState.zoom + 1 ), viewState.pitch, viewState.bearing );
    this.mapView.zoomLevel = viewState.zoom + 1;

    this.mapView.resize( mapCanvas.clientWidth, mapCanvas.clientHeight );

    const dataSource = new OmvDataSource( {
      baseUrl: 'https://vector.hereapi.com/v2/vectortiles/base/mc',
      apiFormat: APIFormat.XYZOMV,
      styleSetName: 'tilezen',
      authenticationCode: 'YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc',
      authenticationMethod: {
                method: AuthenticationMethod.QueryString,
                name: 'apikey',
            },
    } );
    this.mapView.addDataSource( dataSource );
    window.onresize = () => this.mapView.resize( window.innerWidth, window.innerHeight );
  }  

  onDeckGlLoad = () => {
    console.log("deck-load");
    this.deck.setProps( {

      parameters: {framebuffer: null},

      // Normally, when deck renders to the canvas, it will wipe the existing content and draw all layers.
      // This callback overrides the default behavior      
      _customRender: redrawReason => {
        if ( redrawReason === 'basemap redrawn' ) {
        // base map just redrew, due to e.g. tiles being loaded
        // render all layers without clearing the canvas
        this.deck._drawLayers( redrawReason, { clearCanvas: false } );
      } else {
        // Triggered by other reasons - layer update, view state change, transition, etc.
        // Tell the base map to redraw first
        this.mapView.update();       
        //this.deck._drawLayers( redrawReason, { clearCanvas: false } ); 
      }
      },
    } );
  }

  render() {
    let layers = [];
    layers.push( new ArcLayer({
      id: 'arc2',
      data: this.dataArr? this.dataArr: null,
      pickable: true,
      autoHighlight: true,
      getSourcePosition: d => [ d.srcLon, d.srcLat ],
      getTargetPosition: d => [ d.targetLon, d.targetLat ],
      getSourceColor: [180,0,0,255],
      getTargetColor: [180,0,0,255],
      widthScale: 3.0
    }));
    return (
      <div>
        <DeckGL
          style = {{zIndex: 0}}
          ref = {ref => { this.deck = ref && ref.deck}}
          viewState={this.state.viewState} 
          layers= {layers}
          controller = {true}
          onViewStateChange = {this.onViewStateChange}
          onLoad={ this.onDeckGlLoad }
          //onWebGLInitialized = {this.onWebGLInit}
          gl={ this.webglContext }
        >
        </DeckGL>
      </div>
    );
  }
  
}
export default Root;