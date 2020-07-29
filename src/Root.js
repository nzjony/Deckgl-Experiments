import React from 'react';
import DeckGL from '@deck.gl/react';
import {ArcLayer, IconLayer} from '@deck.gl/layers';
import { MapView, MapViewEventNames, MapViewUtils, FixedClipPlanesEvaluator, TopViewClipPlanesEvaluator, InterpolatedClipPlanesEvaluator, TiltViewClipPlanesEvaluator } from "@here/harp-mapview";
import { GeoCoordinates } from "@here/harp-geoutils";
import { APIFormat, AuthenticationMethod, AuthenticationTypeMapboxV4, OmvDataSource } from "@here/harp-omv-datasource";
import loadCSV from './DataLoader';
import {Model, Buffer, Framebuffer, instrumentGLContext, withParameters} from '@luma.gl/core';
import {Deck} from '@deck.gl/core';
import { MapControls } from "@here/harp-map-controls";

class Root extends React.Component{

  constructor ( props ) {
    super( props );
    this.map = null;
    this.deck = null;
    this.state = {          
      viewState: {
        latitude:  1.3778398134133185,
        longitude: 103.8857512606223,
        bearing: -152.9661117325789,
        pitch: 55.768917935319195,
        zoom:  16.76407108308305,
        maxZoom: 21,
      },
      near: 0.1,
      far: 3,
      gl: {},
    };  
   this.initMapView(); 
  }

  onWebGLInitialized = (gl) => {
    console.log("gl-init");
    //For testing of passing deck's context to harp
    //this.initMapView(gl);    
    this.setState({gl});
  }

  onViewStateChange = ( { viewState } ) => {
    const coords = new GeoCoordinates( viewState.latitude, viewState.longitude );
    this.mapView.lookAt( coords, MapViewUtils.calculateDistanceFromZoomLevel( { focalLength: this.mapView.focalLength }, viewState.zoom + 1 ), viewState.pitch, viewState.bearing );
    this.mapView.zoomLevel = viewState.zoom + 1;
    const viewport = this.deck.getViewports()[0];
    const height = viewport.height;
    let {near, far} = viewport.projectionProps;
    
    //far = far * height / 2 * viewport.zoom / viewport.metersPerPixel;

    //Pass updated near/far values from deck to harp.   
    this.mapView.updateCameras({
      near: near,
      far: far,
      minimum: 0.1,
      maximum: 100000,
    });
    this.setState( { viewState, near, far} );
  }

  componentDidMount = () => {
    loadCSV('icon.csv', 'icon', true).then(data => {
     // loadCSV('arc.csv', 'arc', true).then(data => {
      this.dataArr = data;
      this.forceUpdate();
    });
  }  

  initMapView = (gl) => {
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
      //context: gl,

      //Throws error if intially far value set to low values like 3. If set to high values 1000+ initially and changed to low values later through `updateCameras` error doesn't occur.
      clipPlanesEvaluator: new FixedClipPlanesEvaluator(0.1, 3),

      //clipPlanesEvaluator: new InterpolatedClipPlanesEvaluator(0.1, 0.1, 35, 300),
      theme: 'https://assets.vector.hereapi.com/styles/berlin/base/harp.gl/tilezen?apikey=YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc',
      zoomLevel: viewState.zoom,
      decoderUrl: './harpgl-decoder.bundle.js',
    } );

    //For testing without deckgl
    //MapControls.create(this.mapView);

    this.mapView.addEventListener( MapViewEventNames.AfterRender, () => {
      if ( this.deck ) { this.deck.redraw( 'basemap redrawn', true ); }
    } );

    const coords = new GeoCoordinates( viewState.latitude, viewState.longitude );
    this.mapView.setFovCalculation( { fov: 37, type: 'fixed' } );
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
    const viewport = this.deck.getViewports()[0];
    const {near, far} = viewport.projectionProps;

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
    this.setState( { near, far } );
  }

  render() {
    let layers = [];   
    layers.push( new IconLayer( {
      id: 'icon-layer',
      data: this.dataArr? this.dataArr: null,
      pickable: true,
      autoHighlight: true,
      billboard: true,
      getIcon: d => ( {
          url: d.icon,
          width: 300,
          height: 300,
          mask: false,
        } ),
      getSize: d => ( 35 + Math.floor( 35 * Math.random() * 0.65 ) ),
      getPosition: d => [ d.lon, d.lat ]
    }));

    return (
      <div>
        <DeckGL
          ref = {ref => { this.deck = ref && ref.deck}}
          viewState={this.state.viewState} 
          layers= {layers}
          controller = {true}
          onViewStateChange = {this.onViewStateChange}
          onLoad={ this.onDeckGlLoad }
          //onWebGLInitialized = {this.onWebGLInitialized}
          gl={ this.webglContext }
          parameters = {{
            depthTest: true
          }}
        >
        </DeckGL>
      </div>
    );
  }
  
}
export default Root;