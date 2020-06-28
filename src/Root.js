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

      //parameters: {framebuffer: null},

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