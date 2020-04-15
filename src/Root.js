import React from 'react';
import DeckGL from '@deck.gl/react';
import StaticMap from 'react-map-gl';
import {MapboxLayer} from '@deck.gl/mapbox';
import {IconLayer, ArcLayer} from '@deck.gl/layers';
import {PostProcessEffect} from '@deck.gl/core';
import loadCSV from './DataLoader';
import {BloomPass} from './BloomEffect';
import {brightnessContrast} from '@luma.gl/shadertools';

const MAPBOX_ACCESS_TOKEN  = 'pk.eyJ1IjoiZ2FsbGlja2d1bm5lciIsImEiOiJjanliaWs1MGwwM2o1M2dxYTA4cjNscXR4In0.NRBmABrmd87kEEVaYGvxqg';
const bloom = new PostProcessEffect(BloomPass);

class Root extends React.Component{

  constructor ( props ) {
    super( props );
    this.map = null;
    this.deck = null;
    this.state = {          
      viewState: {
        latitude: 37.75,
        longitude: -122.9,
        bearing: 82.88571428571427,
        pitch: 54.2394018203309,
        zoom: 11.357119568576978,
        maxZoom: 21,
      },
      gl: {},
    };    
  }
  
  componentDidMount = () => {
    loadCSV('arc2.csv', 'arc', true).then(data => {
      this.dataArr = data;
      this.forceUpdate();
    });

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
              ref = {ref => { this.deck = ref && ref.deck}}
              viewState={this.state.viewState} 
              layers= {layers}
              controller = {true}
              onViewStateChange = {this.onViewStateChange}
              effects = {[bloom]}
              //onWebGLInitialized = {this.onWebGLInitialized}
              >
            {// gl && (
              <StaticMap
                ref = {ref => { this.map = ref && ref.getMap()}}
                //gl = {gl}
                mapStyle="mapbox://styles/mapbox/dark-v9"
                mapboxApiAccessToken= {MAPBOX_ACCESS_TOKEN}
                //onLoad = {this.onMapLoad}
              />
            //)
            }
            </DeckGL>
        </div>
    );
  }
}
export default Root;
