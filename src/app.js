import React from 'react';
import ReactDOM from 'react-dom';

import Root from './Root';

ReactDOM.render( <Root />, document.getElementById( 'root' ) );
/*
import { MapView } from "@here/harp-mapview";
import { GeoCoordinates } from "@here/harp-geoutils";
import { APIFormat, AuthenticationMethod, AuthenticationTypeMapboxV4, OmvDataSource } from "@here/harp-omv-datasource";

const mapCanvas = document.getElementById("mapCanvas");
const mapView = new MapView({
  canvas: mapCanvas,
  theme: "https://assets.vector.hereapi.com/styles/berlin/base/harp.gl/tilezen?apikey=YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc",
  // note, this URL may vary depending on configuration of webpack
  // for this example, it is assumed that app is server from project root
  //maxVisibleDataSourceTiles: 40, 
  //tileCacheSize: 100,
  decoderUrl: "./harpgl-decoder.bundle.js"
  // note, this URL may vary depending on configuration of webpack
  // for this example, it is assumed that webpack emits bundles to project root
});

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
mapView.addDataSource(dataSource);

mapView.camera.position.set(0, 0, 800);
mapView.geoCenter = new GeoCoordinates(40.70398928, -74.01319808, 0);
mapView.resize(mapCanvas.clientWidth, mapCanvas.clientHeight);*/