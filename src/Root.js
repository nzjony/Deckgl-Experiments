import React from 'react';
import Renderer from './Renderer';
const MAPBOX_ACCESS_TOKEN  = 'pk.eyJ1IjoiZ2FsbGlja2d1bm5lciIsImEiOiJjanliaWs1MGwwM2o1M2dxYTA4cjNscXR4In0.NRBmABrmd87kEEVaYGvxqg';

class Root extends React.Component{

  constructor ( props ) {
    super( props );
    this.renderer = new Renderer();
    this.renderer.start(); 
  }    

  render() {
    return (<div/>);
  }
}
export default Root;
