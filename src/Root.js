import React from 'react';
import DeckGL from '@deck.gl/react';
import {ArcLayer} from '@deck.gl/layers';
import StaticMap from 'react-map-gl';
import { MapView, MapViewEventNames, MapViewUtils } from "@here/harp-mapview";
import { GeoCoordinates } from "@here/harp-geoutils";
import { APIFormat, AuthenticationMethod, AuthenticationTypeMapboxV4, OmvDataSource } from "@here/harp-omv-datasource";
import { MapControls } from "@here/harp-map-controls";
import loadCSV from './DataLoader';

const MAPBOX_ACCESS_TOKEN  = 'pk.eyJ1IjoiZ2FsbGlja2d1bm5lciIsImEiOiJjanliaWs1MGwwM2o1M2dxYTA4cjNscXR4In0.NRBmABrmd87kEEVaYGvxqg';

class Root extends React.Component{

  constructor ( props ) {
    super( props );
    this.map = null;
    this.deck = null;
    this.state = {          
      viewState: {
        latitude: 37.773972,
        longitude: -122.431297,
        bearing: 82,
        pitch: 54,
        zoom: 11,
        maxZoom: 21,
      },
      gl: {},
    };  
    this.initMapView();  
  }

  onWebGLInitialized = (gl) => {
    this.setState({gl});
  }

  initMapView = () => {
    this.mapCanvas = document.getElementById("mapCanvas");
    const viewState = this.state.viewState;
    this.mapView = new MapView({
      canvas: document.getElementById("mapCanvas"),
      theme: "https://assets.vector.hereapi.com/styles/berlin/base/harp.gl/tilezen?apikey=YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc",
      zoomLevel: viewState.zoom,
      decoderUrl: "./harpgl-decoder.bundle.js"
    });

    this.mapView.setFovCalculation({fov: 36, type: 'fixed'});
    this.mapView.maxZoomLevel = 21;
    console.log(viewState.zoom);
    const coords = new GeoCoordinates(viewState.latitude, viewState.longitude);
    this.mapView.geoCenter = coords;
    //this.mapView.setCameraGeolocationAndZoom(coords, viewState.zoom);   
    this.mapView.lookAt(coords, MapViewUtils.calculateDistanceFromZoomLevel({focalLength: this.mapView.focalLength}, viewState.zoom+1), viewState.pitch, viewState.bearing);
    this.mapView.zoomLevel = viewState.zoom+1;
    
    //MapViewUtils.setRotation(this.mapView, viewState.bearing + 180, viewState.pitch);

    //this.mapView.camera.position.set(0, 0, 800);
    //this.mapView.geoCenter = new GeoCoordinates(37.773972, -122.431297);
    this.mapView.resize(this.mapCanvas.clientWidth, this.mapCanvas.clientHeight);
    
    const dataSource = new OmvDataSource({
      baseUrl: "https://vector.hereapi.com/v2/vectortiles/base/mc",
      apiFormat: APIFormat.XYZOMV,
      styleSetName: "tilezen",
      authenticationCode: "YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc",
      authenticationMethod: {
                method: AuthenticationMethod.QueryString,
                name: "apikey"
            },
    });
    this.mapView.addDataSource(dataSource);    
    window.onresize = () => this.mapView.resize(window.innerWidth, window.innerHeight);
    MapControls.create(this.mapView);
  }
  onViewStateChange = ( { viewState } ) => {
    //console.log(`bearing:${viewState.bearing}`);
    //console.log(`pitch:${viewState.pitch}`);
    const coords = new GeoCoordinates(viewState.latitude, viewState.longitude);
    //this.mapView.geoCenter = coords;
    this.mapView.lookAt(coords, MapViewUtils.calculateDistanceFromZoomLevel({focalLength: this.mapView.focalLength}, viewState.zoom+1), viewState.pitch, viewState.bearing);
    this.mapView.zoomLevel = viewState.zoom+1;
    //this.mapView.setCameraGeolocationAndZoom(coords, viewState.zoom, viewState.bearing, viewState.pitch);
    //MapViewUtils.setRotation(this.mapView, viewState.bearing + 180, 0);
    this.setState( { viewState } );
  }

  componentDidMount = () => {
    loadCSV('arc.csv', 'arc', true).then(data => {
      this.dataArr = data;
      this.forceUpdate();
    });
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
              style = {{zIndex: 0, backgroundColor: '#333', background: 'transparent'}}
              //ref = {ref => { this.deck = ref && ref.deck}}
              viewState={this.state.viewState} 
              layers= {layers}
              controller = {true}
              onViewStateChange = {this.onViewStateChange}
              //onWebGLInitialized = {this.onWebGLInitialized}
              >
              </DeckGL>
        </div>
    );
  }
}
export default Root;
/*
<StaticMap      
  mapStyle="mapbox://styles/mapbox/dark-v9"
  mapboxApiAccessToken= {MAPBOX_ACCESS_TOKEN}
/>
*/