const map = new harp.MapView({
   canvas: document.getElementById("mapCanvas"),
   theme: "https://unpkg.com/@here/harp-map-theme@latest/resources/berlin_tilezen_night_reduced.json",
   target: new harp.GeoCoordinates(37.773972, -122.431297), //San Francisco,
   zoomLevel: 13
});
const controls = new harp.MapControls(map);

window.onresize = () => map.resize(window.innerWidth, window.innerHeight);

const omvDataSource = new harp.OmvDataSource({
   baseUrl: "https://vector.hereapi.com/v2/vectortiles/base/mc",
   apiFormat: harp.APIFormat.XYZOMV,
   styleSetName: "tilezen",
   authenticationCode: "YZXUgJpknqSz7OH05fKRJBz6k9lKFRe4m5KYtNMjPxc",
   authenticationMethod: {
         method: harp.AuthenticationMethod.QueryString,
         name: "apikey"
   }
});
map.addDataSource(omvDataSource);