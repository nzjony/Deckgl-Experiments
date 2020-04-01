import React from 'react';
import DeckGL from '@deck.gl/react';
import StaticMap from 'react-map-gl';
import {MapboxLayer} from '@deck.gl/mapbox';
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
  }
  
  onMapLoad = () => {
    this.map.addLayer(new MapboxLayer({ id: 'outline', deck: this.deck}));
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
