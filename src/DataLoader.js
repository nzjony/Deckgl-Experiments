import * as d3 from 'd3';

export default function loadCSV ( csv, layerType, isFile) {
    let path = '';
    if ( isFile ) { path = `./Data/${ csv }`; }
    let cols = [];
    if ( layerType === 'arc' || layerType === 'line' ) {
      cols = [
        { name: 'srcLat', isOptional: false },
        { name: 'srcLon', isOptional: false },
        { name: 'targetLat', isOptional: false },
        { name: 'targetLon', isOptional: false },
        { name: 'srcPopupText', isOptional: true },
        { name: 'targetPopupText', isOptional: true },
      ];
    } 
    else if ( layerType === 'hexagon' || layerType === 'scatterplot' ) {
      cols = [
        { name: 'lat', isOptional: false },
        { name: 'lon', isOptional: false },
        { name: 'popupText', isOptional: true },
      ];
      if ( layerType === 'scatterplot-alert' ) {
        cols.push( { name: 'deviceName', isOptional: false } );
        cols.push( { name: 'deviceType', isOptional: false } );
        cols.push( { name: 'alertMessage', isOptional: false } );
        cols.push( { name: 'isTrigger', isOptional: false } );
      }      
    } 
    else if ( layerType === 'icon' ) {
      cols = [
        { name: 'lat', isOptional: false },
        { name: 'lon', isOptional: false },
        { name: 'icon', isOptional: false },
        { name: 'popupText', isOptional: true },        
      ];
    }

    const rowAccessor = d => {
      const obj = {};
      for ( let i = 0; i < cols.length; i += 1 ) {

        // break if column not present
        if ( !Object.prototype.hasOwnProperty.call( d, cols[ i ].name ) && !cols[ i ].isOptional ) { return null; }
        if ( !Object.prototype.hasOwnProperty.call( d, cols[ i ].name ) && cols[ i ].isOptional ) { continue; }
        obj[ cols[ i ].name ] = d[ cols[ i ].name ];
      }

      d3.autoType( obj );

      if ( layerType === 'arc' || layerType === 'line' || layerType === 'arc-bundle' || layerType === 'arc-scatter' ) { obj.tilt = Math.random() * 10.0 - 5.0; }
      if ( layerType === 'arc-bundle' || layerType === 'arc-scatter' ) { obj.outOfRange = 0; }
      return obj;
    };

    // Return promise
    if ( isFile ) { return d3.csv( path, rowAccessor ); }

    // Return data array
    return d3.csvParse( csv, rowAccessor );
  }