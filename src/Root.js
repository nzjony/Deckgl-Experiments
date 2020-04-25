import React from 'react';
import DeckGL from '@deck.gl/react';
import StaticMap from 'react-map-gl';
import { MapView, MapViewEventNames } from "@here/harp-mapview";
import { GeoCoordinates } from "@here/harp-geoutils";
import { APIFormat, AuthenticationMethod, AuthenticationTypeMapboxV4, OmvDataSource } from "@here/harp-omv-datasource";
const MAPBOX_ACCESS_TOKEN  = 'pk.eyJ1IjoiZ2FsbGlja2d1bm5lciIsImEiOiJjanliaWs1MGwwM2o1M2dxYTA4cjNscXR4In0.NRBmABrmd87kEEVaYGvxqg';

class Root extends React.Component{

  constructor ( props ) {
    super( props );
    this.map = null;
    this.deck = null;
    this.state = {          
      viewState: {
        latitude: 1.3573826031424348,
        longitude: 103.8107810050596,
        bearing: 82.88571428571427,
        pitch: 54.2394018203309,
        zoom: 11.357119568576978,
        maxZoom: 21,
      },
      gl: {},
    };

    this.mapCanvas = document.getElementById("mapCanvas");
    this.mapView = new MapView({
      canvas: mapCanvas,
      theme: "https://assets.vector.hereapi.com/styles/berlin/base/harp.gl/tilezen?apikey=YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc",      
      decoderUrl: "./harpgl-decoder.bundle.js"
    });
    this.mapView.camera.position.set(0, 0, 800);
    this.mapView.geoCenter = new GeoCoordinates(40.70398928, -74.01319808, 0);
    this.mapView.resize(this.mapCanvas.clientWidth, this.mapCanvas.clientHeight);

    const dataSource = new OmvDataSource({
      baseUrl: "https://vector.hereapi.com/v2/vectortiles/base/mc",
      apiFormat: APIFormat.XYZOMV,
      styleSetName: "tilezen",
      authenticationCode: "YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc",
      authenticationMethod: {
                method: AuthenticationMethod.QueryString,
                name: "apkey"
            },
    });
    this.mapView.addDataSource(dataSource);
    window.onresize = () => this.mapView.resize(window.innerWidth, window.innerHeight);
    //this.mapView.addEventListener(MapViewEventNames.Resize, () => { this.mapView.resize(this.mapCanvas.clientWidth, this.mapCanvas.clientHeight) })
  }

  onWebGLInitialized = (gl) => {
    this.setState({gl});
  }

  onViewStateChange = ( { viewState } ) => {
      this.setState( { viewState } );
  }

  render() {
    const {gl} = this.state;
    let layers = [];
    console.log(this.mapView);
    return (<div/>);
   /* return (
        <div>
            <DeckGL
              //ref = {ref => { this.deck = ref && ref.deck}}
              viewState={this.state.viewState} 
              layers= {layers}
              controller = {true}
              onViewStateChange = {this.onViewStateChange}
              //onWebGLInitialized = {this.onWebGLInitialized}
              />
        </div>
    );*/
  }
}
export default Root;
