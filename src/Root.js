import React from 'react';
import DeckGL from '@deck.gl/react';
import StaticMap from 'react-map-gl';
import {MapboxLayer} from '@deck.gl/mapbox';
import MapboxModelLayer from './MapboxModelLayer';
import * as three from 'three';

const MAPBOX_ACCESS_TOKEN  = 'pk.eyJ1IjoiZ2FsbGlja2d1bm5lciIsImEiOiJjanliaWs1MGwwM2o1M2dxYTA4cjNscXR4In0.NRBmABrmd87kEEVaYGvxqg';

const satellitedish = 'https://docs.mapbox.com/mapbox-gl-js/assets/34M_17/34M_17.gltf';
const modelUrl = './sponza/sponza.gltf';
class Root extends React.Component{

  constructor ( props ) {
    super( props );
    this.map = null;
    this.deck = null;
    this.mapboxLayers = [];
    this.mapboxLayers.push(new MapboxModelLayer("radio-station", satellitedish));
    this.state = {          
      viewState: {
        latitude: -35.3981,
        longitude: 148.9819,
        bearing: 45,
        pitch: 45,
        zoom: 18,
        maxZoom: 21,
      },
      gl: {},
    };
  }
  
  onMapLoad = () => {    
    this.map.addLayer(new MapboxLayer({ id: 'outline', deck: this.deck}));
    this.mapboxLayers[0].loadLayer(this.map);
    this.forceUpdate();
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
    return (
        <div>
            <DeckGL
              ref = {ref => { this.deck = ref && ref.deck}}
              viewState={this.state.viewState} 
              layers= {layers}
              controller = {true}
              onViewStateChange = {this.onViewStateChange}
              onWebGLInitialized = {this.onWebGLInitialized}
              >
            { gl && (
              <StaticMap
                ref = {ref => { this.map = ref && ref.getMap()}}
                gl = {gl}
                mapStyle="mapbox://styles/mapbox/dark-v9"
                mapboxApiAccessToken= {MAPBOX_ACCESS_TOKEN}
                onLoad = {this.onMapLoad}
              />
            )}
            </DeckGL>
        </div>
    );
  }
}
export default Root;
