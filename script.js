var map;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 7,
    center: {lat: -33.865427, lng: 151.196123},
    mapTypeId: 'terrain'
  });

  // Create a <script> tag and set the USGS URL as the source.
  var script = document.createElement('script');

  // This example uses a local copy of the GeoJSON stored at
  // http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojsonp
  script.src = 'https://developers.google.com/maps/documentation/javascript/examples/json/earthquake_GeoJSONP.js';
  document.getElementsByTagName('head')[0].appendChild(script);

}

function eqfeed_callback(results) {
  var heatmapData = [];
  for (var i = 0; i < results.features.length; i++) {
    var coords = results.features[i].geometry.coordinates;
    var latLng = new google.maps.LatLng(coords[1], coords[0]);
    heatmapData.push(latLng);
  }
  var heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapData,
    dissipating: false,
    map: map
  });
}
$(document).ready(function(){
  $('.searchSubmit').click( //on clicking search
    function(){
      var $search = $('.searchText').val();
      console.log($search);
      //make call to bing news search
      $.ajax({
        url: `https://api.cognitive.microsoft.com/bing/v5.0/news/search?q=${$search}&count=10&offset=0&mkt=en-us&safeSearch=Moderate`,
        // beforeSend: function(xhr){xhr.setRequestHeader('Ocp-Apim-Subscription-Key', '8540eb4d23b7423ba14487c5b24b50e7');},
        headers: {
          'Ocp-Apim-Subscription-Key': '8540eb4d23b7423ba14487c5b24b50e7'
        },
        dataType: 'json',
        type: "GET",
        success: function(response) {
          console.log(response);
          appendResults(response);
          console.log(response.value[0].url);
          var url = response.value[0].url;
          $.ajax({
              type: "GET",
              url: `
http://galvanize-cors-proxy.herokuapp.com/${url}`,
              success: function(data, status, xhr) {
                  var location = xhr.getResponseHeader('Location');
                  console.log('location', location);
                  console.log(data);
                  console.log(xhr);
              }
          });
          $.ajax({
            url: `https://watson-api-explorer.mybluemix.net/alchemy-api/calls/url/URLGetCombinedData?apikey=c1a9930232197e836a43483c82066f757e11235a&url=${url}&outputMode=json&extract=doc-emotion,entities`,
            dataType: 'json',
            type: "POST",
            success: function(data) {
              console.log(data);
            },
            error: function(xhr) {
              console.log('error',xhr);
            }
          });
        },
        error: function(xhr) {
          console.log('error',xhr);
        }
      }); //end of ajax call
    } //end of onclick function
  )//end of on clicking search
}) //end of on document ready
function appendResults(results){
  for (var i = 0; i < results.value.length; i++) {
    $('.results').append(`
      <div class="row">
        <div class="article col-sm-8">
          <h1><a href="${results.value[i].url}">${results.value[i].name}</a></h1>
          <p>${results.value[i].description}</p>
        </div>
        <div class="articleImage col-sm-4" >
        </div>
      </div>
      `)
      // <img src="${results.value[i].image.thumbnail.contentUrl}" />
  }
}
