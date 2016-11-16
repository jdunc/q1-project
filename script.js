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
      //make call to bing news search using custom $search term from the user input
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
  var articles = []; //articles will be added as objects to this array
  for (var i = 0; i < results.value.length; i++) {
    var url = results.value[i].url;
    // $('.results').append(`
    //   <div class="row">
    //   <div class="article col-sm-8">
    //   <h1><a href="${results.value[i].url}">${results.value[i].name}</a></h1>
    //   <p>${results.value[i].description}</p>
    //   </div>
    //   <div class="articleImage col-sm-4" >
    //   </div>
    //   </div>
    //   `);
    var tempURL = results.value[i].url;
    var tempName = results.value[i].name;
    var tempDescription = results.value[i].description;
    var $rgbV;

    //the first ajax call here identifies and stores the URL of the article, the url given by bing is a redirect
    $.ajax({
      type: "GET",
      url: `http://galvanize-cors-proxy.herokuapp.com/${url}`,
      success: function(data, status, xhr) {
        var location = xhr.getResponseHeader('Location');
        console.log(xhr.getResponseHeader('X-Final-Url'));
        var alchemyURL = xhr.getResponseHeader('X-Final-Url');

        //this next ajax call sends the url of the article to alchemy api where it is analyzed for locations and for emotional values
        $.ajax({
          url: `https://watson-api-explorer.mybluemix.net/alchemy-api/calls/url/URLGetCombinedData?apikey=c1a9930232197e836a43483c82066f757e11235a&url=${alchemyURL}&outputMode=json&extract=doc-emotion,entities`,
          dataType: 'json',
          type: "POST",
          success: function(data2) {
            var article = {};
            console.log('alchemy',data2);
            var joy = parseFloat(data2['docEmotions']['joy']);
            var sadness = parseFloat(data2['docEmotions']['sadness']);
            var anger = parseFloat(data2['docEmotions']['anger']);
            var disgust = parseFloat(data2['docEmotions']['disgust']);
            var fear = parseFloat(data2['docEmotions']['fear']);
            console.log(joy, sadness, anger, disgust, fear);
            //this loop checks all of the identified entities to see if they are a location,  if it's a location, identify location coordinates
            var locations = []; //store all the coordinates identified within an article here!
            for (var i = 0; i < data2['entities'].length; i++) {
              if(data2['entities'][i].disambiguated !== undefined){
                if(data2['entities'][i].disambiguated.geo !== undefined){
                  console.log('location is' , data2['entities'][i].disambiguated.geo);
                  var coordinates = data2['entities'][i].disambiguated.geo.split(' ');
                  coordinates.join(',');
                  locations.push(coordinates);
                }//end of geo if statement
              }//end of disambiguated if statement
            }//end of entities.length loop

            //now going to create the color of the emotion based on Plutchik's emotional color wheel
            var total = joy + sadness + fear + disgust + anger;
            var joyP = joy / total ;
            var sadP = sadness / total;
            var fearP = fear / total;
            var disP = disgust / total;
            var angP = anger / total;
            var redV = (joyP + angP) * 255;
            var greenV = (joyP + fearP + angP) * 255;
            var blueV = (sadP + disP) * 255;
            if (sadness >= joy && sadness >= fear && sadness >= disgust && sadness >= anger){
              var tempRed = parseInt(255*angP + 255*joyP + 128*disP);
              var tempGreen = parseInt(255*joyP + 255*fearP);
              var tempBlue = parseInt(255 - 255*sadP);
              var $rgbV = "rgb(" + tempBlue + "," + tempBlue + "," + 255 + ")";
            }
            else if (joy >= sadness && joy >= fear && joy >= disgust && joy >= anger){
              var tempRed = parseInt(255 - 255*joyP);
              var tempGreen = parseInt(255*joyP);
              var tempBlue = parseInt(255*sadP + 255*disP);
              var $rgbV = "rgb(" + 255 + "," + 255 + "," + tempRed + ")";
            }
            else if (fear >= sadness && fear >= joy && fear >= disgust && fear >= anger){
              var tempRed = parseInt(255 - 255*fearP);
              var $rgbV = "rgb(" + tempRed + "," + 255 + "," + tempRed + ")";
            }
            else if (disgust >= sadness && disgust >= joy && disgust >= fear && disgust >= anger){
              var tempRed = parseInt(128 - 128*disP + 128);
              var tempGreen = parseInt(255*joyP + 255*fearP);
              var tempBlue = parseInt(255 - 255*disP);
              var $rgbV = "rgb(" + tempRed + "," + tempBlue + "," + 255 + ")";
            }
            else if (anger >= sadness && anger >= joy && anger >= fear && anger >= disgust){
              var tempGreen = parseInt(255 - 255*angP);
              $rgbV = "rgb(" + 255 + "," + tempGreen + "," + tempGreen + ")";
            }
            else{var $rgbV = "rgb(" + Math.round(redV) + "," + Math.round(greenV) + "," + Math.round(blueV) + ")";}
            article.title = tempName;
            article.description = tempDescription;
            article.link = tempURL;
            article.emotion = [joy, sadness, anger, disgust, fear];
            article.color = $rgbV;
            article.locations = locations;
            articles.push(article);
            console.log($rgbV);
            console.log('locations array', locations);
            $('.results').append(`
              <div class="row">
              <div class="article col-sm-8" style="background-color: ${article.color}">
              <h1><a href="${article.link}" class='noColor'>${article.title}</a></h1>
              <p>${article.description}</p>
              </div>
              <div class="articleImage col-sm-4" >
              </div>
              </div>
              `);
            }, //end of success function for alchemy call
            error: function(xhr) {
              console.log('error',xhr);
            }
          }); //end of watson ajax call
        } //end of getting redirected url function
      }); //end of ajax function to get new url
      // <img src="${results.value[i].image.thumbnail.contentUrl}" />
    }
    console.log('articles array of objects', articles);
    //here I'll append the results to the results div
  }
