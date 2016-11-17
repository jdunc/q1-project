
jQuery(function($) {    // Asynchronously Load the map API
    var script = document.createElement('script');
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyD852s2ys19v7rqgEvDMNefDKMIY9q-Upo&callback=initMap";
    document.body.appendChild(script);

});

  function initMap() {
    console.log('initMap called');
    var map;
    var bounds = new google.maps.LatLngBounds();
    map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 43.1610300, lng: -77.6109219},
      zoom: 12
    });

    /*    var marker = new google.maps.Marker({
    position: {lat: 43.1610300, lng: -77.6109219},
    title: 'Hello World!',
    icon: {
    path: 'M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0',
    scale: 10,
    fillColor: 'green',
    fillOpacity: 100,
    strokeOpacity: 0,
    scale: 10,
  },
});

marker.setMap(map); */
var markerArray = []; //[title, lat, long, color]
var urlArray = [];
var coordArray = [];

//Yahoo rss feed parser api call url
var pagingURL = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D'https%3A%2F%2Fnews.google.com%2Fnews%3Fcf%3Dall%26hl%3Den%26pz%3D1%26ned%3Dus%26geo%3D14627%26output%3Drss'&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys";

console.log('getMoreData started');
console.log('trying to GET MORE from: ' + pagingURL);

//retreive existing articles from database and store in urlArray
$.ajax({
  method: "POST",
  url: "emap_process_download.php"
})
.done(function( msg ) {
  var parsed = [];
  var markerArray = []; //[title, lat, long, color]

  //console.log('first database article name raw info:' + (msg) );
  var msg2 = decodeURIComponent(msg);
  var splitting = msg2.split("<br>");
  for(var i = 0; i < (splitting.length - 1); i++){
    parsed.push(JSON.parse(splitting[i]));
  };
  for (i = 0; i < parsed.length; i++){
    var tempURL = parsed[i].url;
    urlArray.push(tempURL);
  };


  // call the Yahoo api url above
  $.get(pagingURL, function(data){
    //loop through the results to return the URLs of the news articles from google local news
    for(i=0; i< data.query.results.body.rss.channel.item.length; i++ ){
      var content1 = data.query.results.body.rss.channel.item[i].content ;
      var content1_split = new String();

      //takes the text and extracts the part after url=,
      var content1_split = content1.split("url=");
      //console.log(content1_split[1]);
      var thisURL_pre = content1_split[1];

      //decodes the text to show symbols instead of for example %3D is returned and then converted to =
      var thisURL = decodeURIComponent(thisURL_pre);
      //console.log(urlArray);

      //if the url doesn't already exist in the database, then call to alchemy for NLP results
      if($.inArray(thisURL, urlArray) == -1){
        console.log('this is a new url: ' + thisURL + ' run alchemy and save to db now');
        $.get('http://gateway-a.watsonplatform.net/calls/url/URLGetCombinedData', {'apikey' : 'd0cc2c96178ae1a1a488c16e4ec500c923bbcb78', url: thisURL, 'extract': 'entity, relation, doc-emotion', 'sourceText': 'cleaned', 'outputMode' : 'json'}, function(response){
          console.log('alchemy api happening');
          console.log(response);
          console.log(decodeURIComponent('alechmy processed the url: ' + response.url));
          var sendvar_pre = JSON.stringify(response);
          var sendvar = encodeURIComponent(sendvar_pre);
          $.ajax({
            method: "POST",
            url: "emap_process.php",
            data: {
              url: response.url,
              json: sendvar,
            }
          })
          .done(function( msg ) {
            console.log('php results:' + (msg) );
          });
          //console.log(response);
        }, "json"); //end of alchemy request results about specific article
      } //end of if not in URL array
    } // end of cycling through yahoo results
  });  //end call to yahoo api
  $.ajax({
    method: "POST",
    url: "emap_process_download.php"
  })
  .done(function( msg ) {
    console.log('database info received including any potentially new articles, now parsing');
    var parsed = [];
    //console.log('php results:' + (msg) );
    var msg2 = decodeURIComponent(msg);
    var splitting = msg2.split("<br>");
    for(var i = 0; i < (splitting.length - 1); i++){
      parsed.push(JSON.parse(splitting[i]));
    };
    console.log('now parse');
    for(i = 0; i < parsed.length; i++){
      if(typeof parsed[i].docEmotions != 'undefined'){

      //console.log(parsed[i]);
      var joy = parseFloat(parsed[i].docEmotions.joy);
      //console.log('joy value is: ' + joy);
      var sadness = parseFloat(parsed[i].docEmotions.sadness);
      //  console.log('sadness value is: ' + sadness);
      var fear = parseFloat(parsed[i].docEmotions.fear);
      //  console.log('fear value is: ' + fear);
      var disgust = parseFloat(parsed[i].docEmotions.disgust);
      //console.log('disgust value is: ' + disgust);
      var anger = parseFloat(parsed[i].docEmotions.anger);
      //  console.log('anger value is: ' + anger);
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
        var $rgbV = "rgb(" + 255 + "," + tempGreen + "," + tempGreen + ")";
      }
      else{var $rgbV = "rgb(" + Math.round(redV) + "," + Math.round(greenV) + "," + Math.round(blueV) + ")";}
      //  console.log('rgb is ' + rgbV);
      for(j=0; j< parsed[i].entities.length; j++){
        console.log('checking for geo coords...');
        //var $geo = response.entities[j].disambiguated.geo;
        if(typeof parsed[i].entities[j].disambiguated != 'undefined'){
          if(typeof parsed[i].entities[j].disambiguated.geo != 'undefined'){
            console.log('coords found: ');
            console.log(parsed[i].entities[j].disambiguated.geo);
            var latlong = parsed[i].entities[j].disambiguated.geo;
            var latlong_split = latlong.split(" ");
            var $lat = parseFloat(latlong_split[0]);
            var $long = parseFloat(latlong_split[1]);
            var entityName = parsed[i].entities[j].text;
            console.log('lattitude is: ' + $lat);
            console.log('longitude is: ' + $long);
            console.log('name is: ' + parsed[i].entities[j].text);
            var contentString = '<div id="content">'+
            '<h1>' + entityName + '</h1><p>' + parsed[i].relations[0].sentence + '</p><a href="' + parsed[i].url + '" target="_blank" > View the aritlce here.</a></div>';
            console.log('color value is: ' + $rgbV);
            /*  Different infoWindow option after loop
            var infowindow = new google.maps.InfoWindow({
            content: contentString
          });

          */
          var thisColor = 'rgb(255,255,0)';
          var markerValues = [entityName, contentString, $lat, $long, $rgbV];
          console.log('name from marker values: ' + markerValues[0]);
          /*
          markerArray[counting][0] = entityName;
          markerArray[counting][1] = contentString;
          markerArray[counting][2] = $lat;
          markerArray[counting][3] = $long;
          markerArray[counting][3] = $rgbV;
          counting++;
          */
          markerArray.push(markerValues);

        } //end of coordinate required section
      }
    }; //end of cycling through entities within specific article
  }
  } // end of parsed.length loop
  console.log("markerArray values are: " + markerArray[0][0]);
  var infoWindow = new google.maps.InfoWindow(), marker, i;
console.log('made an infowindow var');
  // adapted from http://wrightshq.com/playground/placing-multiple-markers-on-a-google-map-using-api-3/
  // "Loop through our array of markers & place each one on the map"

  for(i=0; i< markerArray.length; i++){
    console.log('checking coords');
    var tempCoords = markerArray[i][2] + ',' + markerArray[i][3];
    fixCoords(tempCoords);
    function fixCoords(tempCoords){
      console.log('received: ' + tempCoords)
      if($.inArray(tempCoords, coordArray) == -1){
        coordArray.push(tempCoords);
        console.log('coords not found, so keeping');
        var tempTemp = tempCoords.split(",");
        markerArray[i][2] = tempTemp[0];
        markerArray[i][3] = tempTemp[1];
      }
      else{
        var tempTemp = tempCoords.split(",");
        var rand1 = parseFloat(Math.random() * .1 - .05);
        var rand…
