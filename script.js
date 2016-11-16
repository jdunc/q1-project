//everything before the onReady is boilerplate GoogleMap API unless comments say otherwise
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
  //template of array of objects that contain article information
  // var articles = [
  //   {
  //     title: ,
  //     description: ,
  //     link: ,
  //     imageUrl: ,
  //     emotion: ,
  //     color: ,
  //     locations: [ [lat, long] ] ,
  //   }
  // ]
  //call to bing for trending topics
  $.ajax({
    url: `https://api.cognitive.microsoft.com/bing/v5.0/news/trendingtopics`,
    // beforeSend: function(xhr){xhr.setRequestHeader('Ocp-Apim-Subscription-Key', '8540eb4d23b7423ba14487c5b24b50e7');},
    headers: {
      'Ocp-Apim-Subscription-Key': '8540eb4d23b7423ba14487c5b24b50e7'
    },
    dataType: 'json',
    type: "GET",
    success: function(response) {
      console.log('trending',response);
    },
    error: function(xhr) {
      console.log('error',xhr);
    }
  }); //end of ajax call for trending topics

  $('.searchSubmit').click( //on clicking the search button, exectute this function
    function(){
      var $search = $('.searchText').val();
      console.log($search);
      //make call to bing news search
      $.ajax({
        url: `https://api.cognitive.microsoft.com/bing/v5.0/news/search?q=${$search}&count=10&offset=0&mkt=en-us&safeSearch=Moderate`,
        headers: {
          'Ocp-Apim-Subscription-Key': '8540eb4d23b7423ba14487c5b24b50e7'
        },
        dataType: 'json',
        type: "GET",
        success: function(response) {
          console.log(response);
          appendResults(response);
        },
        error: function(xhr) {
          console.log('error',xhr);
        }
      }); //end of ajax search word call
    } //end of onclick function
  )//end of on clicking search
}) //end of on document ready
//add the results to the page in a simple bootstrap div pattern
function appendResults(results){
  for (var i = 0; i < results.value.length; i++) {
    var url = results.value[0].url;
    $('.results').append(`
      <div class="row">
      <div class="article col-sm-8">
      <h1><a href="${results.value[i].url}">${results.value[i].name}</a></h1>
      <p>${results.value[i].description}</p>
      </div>
      <div class="articleImage col-sm-4" >
      </div>
      </div>
      `);
      //the first ajax call here identifies and stores the URL of the article, the url given by bing is a redirect
      $.ajax({
        type: "GET",
        url: `http://galvanize-cors-proxy.herokuapp.com/${url}`,
        success: function(data, status, xhr) {
          var location = xhr.getResponseHeader('Location');
          console.log(xhr.getResponseHeader('X-Final-Url'));
          var alchemyURL = xhr.getResponseHeader('X-Final-Url');
          //this ajax call sends the url of the article to alchemy api where it is analyzed for locations and for emotional values
          $.ajax({
            url: `https://watson-api-explorer.mybluemix.net/alchemy-api/calls/url/URLGetCombinedData?apikey=c1a9930232197e836a43483c82066f757e11235a&url=${alchemyURL}&outputMode=json&extract=doc-emotion,entities`,
            dataType: 'json',
            type: "POST",
            success: function(data2) {
              console.log('alchemy',data2);
              var joy = data2['emotions']['joy'];
              var sadness = data2['emotions']['sadness'];
              var anger = data2['emotions']['anger'];
              var disgust = data2['emotions']['disgust'];
              var fear = data2['emotions']['fear'];
              console.log(joy, sadness, anger, disgust, fear);
              //this loop checks all of the identified entities to see if they are a location,  if it's a location, identify location name, soon to identify location coordinates
              for (var i = 0; i < data2['entities'].length; i++) {
                if(data2['entities'][i].disambiguated.subtype[0] === Location){
                  console.log('location is' , data2['entities'][i].disambiguated.name);
                }
              }
            },
            error: function(xhr) {
              console.log('error',xhr);
            }
          }); //end of watson ajax call
        } //end of getting redirected url function
      }); //end of ajax function to get new url
      // <img src="${results.value[i].image.thumbnail.contentUrl}" />
    }
  }
