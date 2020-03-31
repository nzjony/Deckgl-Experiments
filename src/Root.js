import React from 'react';
import DeckGL from '@deck.gl/react';
import StaticMap from 'react-map-gl';
const MAPBOX_ACCESS_TOKEN  = 'pk.eyJ1IjoiZ2FsbGlja2d1bm5lciIsImEiOiJjanliaWs1MGwwM2o1M2dxYTA4cjNscXR4In0.NRBmABrmd87kEEVaYGvxqg';

class Root extends React.Component{
    constructor ( props ) {
        super( props );
        this.state = {          
          viewState: {
            latitude: 1.3573826031424348,
            longitude: 103.8107810050596,
            bearing: 82.88571428571427,
            pitch: 54.2394018203309,
            zoom: 11.357119568576978,
            maxZoom: 21,
          },          
        };
    }
    
    onViewStateChange = ( { viewState } ) => {
        this.setState( { viewState } );
    }

    render() {
        let layers = [];
        return (
            <div>
                <DeckGL
                    viewState={this.state.viewState} 
                    layers= {layers}
                    controller = {true}
                    onViewStateChange = {this.onViewStateChange}>                
                <StaticMap 
                   mapStyle="mapbox://styles/mapbox/dark-v9"
                   mapboxApiAccessToken= {MAPBOX_ACCESS_TOKEN} 
                />
                </DeckGL>
            </div>
        );
    }
}
export default Root;
