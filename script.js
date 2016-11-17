'use strict'
//everything before the onReady is boilerplate GoogleMap API unless comments say otherwise
var map;
function initMap() {
  var uluru = {lat: -25.363, lng: 131.044};
  var bounds = new google.maps.LatLngBounds();
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: uluru
  });
}


$(document).ready(function(){
  $('.results').hide();
  //call to bing for trending topics
  $.ajax({
    url: `https://api.cognitive.microsoft.com/bing/v5.0/news/trendingtopics`,
    headers: {
      'Ocp-Apim-Subscription-Key': '8540eb4d23b7423ba14487c5b24b50e7'
    },
    dataType: 'json',
    type: "GET",
    success: function(response) {
      addButtons(response['value']);
      console.log(response);
    },
    error: function(xhr) {
    }
  }); //end of ajax call for trending topics

  function addButtons(articles){
    for (var i = 0; i < 20; i++) {
      var headline = articles[i].name;
      $('.topicsList').append(`
        <li><a href="${articles[i].webSearchUrl}" target="_blank"><button>${headline}</button></a></li>
        `);
      }
    }//end of addButtons

    $('.searchSubmit').click( //on clicking the search button, exectute this function
      function(){
        var $search = $('.searchText').val();
        //make call to bing news search using custom $search term from the user input
        $.ajax({
          url: `https://api.cognitive.microsoft.com/bing/v5.0/news/search?q=${$search}&count=10&offset=0&mkt=en-us&safeSearch=Moderate`,
          headers: {
            'Ocp-Apim-Subscription-Key': '8540eb4d23b7423ba14487c5b24b50e7'
          },
          dataType: 'json',
          type: "GET",
          success: function(response) {
            logURLs(response);
          },
          error: function(xhr) {
            // console.log('error',xhr);
          }
        }); //end of ajax search word call
      } //end of onclick function
    )//end of on clicking search

    $('.e1').click(function(){
      $('.disgust').each(function(){
        $(this).hide();
      });
      $('.sadness').each(function(){
        $(this).hide();
      });
      $('.fear').each(function(){
        $(this).hide();
      });
      $('.joy').each(function(){
        $(this).show();
      });
      $('.anger').each(function(){
        $(this).hide();
      });
    });
    $('.e2').click(function(){
      $('.disgust').each(function(){
        $(this).hide();
      });
      $('.sadness').each(function(){
        $(this).hide();
      });
      $('.fear').each(function(){
        $(this).hide();
      });
      $('.joy').each(function(){
        $(this).hide();
      });
      $('.anger').each(function(){
        $(this).show();
      });
    });
    $('.e3').click(function(){
      $('.disgust').each(function(){
        $(this).hide();
      });
      $('.sadness').each(function(){
        $(this).hide();
      });
      $('.fear').each(function(){
        $(this).show();
      });
      $('.joy').each(function(){
        $(this).hide();
      });
      $('.anger').each(function(){
        $(this).hide();
      });
    });
    $('.e4').click(function(){
      $('.disgust').each(function(){
        $(this).show();
      });
      $('.sadness').each(function(){
        $(this).hide();
      });
      $('.fear').each(function(){
        $(this).hide();
      });

      $('.joy').each(function(){
        $(this).hide();
      });
      $('.anger').each(function(){
        $(this).hide();
      });
    });
    $('.e5').click(function(){
      $('.disgust').each(function(){
        $(this).hide();
      });
      $('.sadness').each(function(){
        $(this).show();
      });
      $('.fear').each(function(){
        $(this).hide();
      });

      $('.joy').each(function(){
        $(this).hide();
      });
      $('.anger').each(function(){
        $(this).hide();
      });
    });
    $('.chooseMap').click(function(){
      $('#map').show();
      $('.results').hide();
    });
    $('.chooseList').click(function(){
      $('#map').hide();
      $('.results').show();
    })
  }) //end of on document ready

  //add the results to the page in a simple bootstrap div pattern
  function logURLs(results){
    var articles = []; //articles will be added as objects to this array
    for (let i = 0; i < results.value.length; i++) {
      var article = {};
      article.title = results.value[i].name;
      article.description = results.value[i].description;
      article.link = results.value[i].url;
      articles.push(article);
    }//end of for loop
    createCalls(articles);
  }

  function createCalls(articles){
    var ajaxURLCalls = [];
    for (var i = 0; i < articles.length; i++) {
      ajaxURLCalls.push(new Promise(function(resolve,reject){
        $.ajax({
          type: "GET",
          url: `http://galvanize-cors-proxy.herokuapp.com/${articles[i].link}`
        }).then(function(data,status,xhr){
          resolve([data,status,xhr]);
        })
      }))
    }//end of for loop
    Promise.all(ajaxURLCalls).then(function(results){
      $(results).each(function(index){
        console.log(this[2].getResponseHeader('X-Final-Url'));
        articles[index].link = this[2].getResponseHeader('X-Final-Url');
      }); //end of the each loop to update articles array
      getAlchemy(articles);
    })
  }//end of createCalls

  function getAlchemy(articles){
    var alchemyCalls = [];
    for (var i = 0; i < articles.length; i++) {
      alchemyCalls.push(new Promise(function(resolve,reject){
        $.ajax({
          type: "POST",
          dataType: "json",
          url: `https://watson-api-explorer.mybluemix.net/alchemy-api/calls/url/URLGetCombinedData?apikey=47e6b24e093950f8af63a61638435f090f0e4bd2&url=${articles[i].link}&outputMode=json&extract=doc-emotion,entities`
        }).then(function(data){
          resolve([data]);
        })
      }))
    }//end of for loop
    Promise.all(alchemyCalls).then(function(results){
      $(arguments[0]).each(function(index){
        articles[index].emotions = [$(this)[0]['docEmotions']];
      });
      $(arguments[0]).each(function(index){
        var locations = []; //store all the coordinates identified within an article here!
        for (let j = 0; j < $(this)[0]['entities'].length; j++) {
          if($(this)[0]['entities'][j].disambiguated !== undefined){
            if($(this)[0]['entities'][j].disambiguated.geo !== undefined){
              // console.log('location is' , data2['entities'][i].disambiguated.geo);
              var coordinates = $(this)[0]['entities'][j].disambiguated.geo.split(' ');
              coordinates.join(',');
              locations.push(coordinates);
            }//end of geo if statement
          }//end of disambiguated if statement
        }//end of entities.length loop
        articles[index].locations = locations;
      })
      addColors(articles);
    })
  }//end of getAlchemy function

  function addColors(articles){
    $(articles).each(function(index){
      var joy = parseFloat(this['emotions'][0]['joy']);
      var sadness = parseFloat(this['emotions'][0]['sadness']);
      var anger = parseFloat(this['emotions'][0]['anger']);
      var disgust = parseFloat(this['emotions'][0]['disgust']);
      var fear = parseFloat(this['emotions'][0]['fear']);
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
      this.color = $rgbV;
    })
    console.log(articles);
    checkEmotions(articles);
  }

  function checkEmotions(articles){
    var totalJoy = 0;
    var totalFear = 0;
    var totalSadness = 0;
    var totalDisgust = 0;
    var totalAnger = 0;
    $(articles).each(function(){
      var joy = parseFloat(this['emotions'][0]['joy']);
      var sadness = parseFloat(this['emotions'][0]['sadness']);
      var anger = parseFloat(this['emotions'][0]['anger']);
      var disgust = parseFloat(this['emotions'][0]['disgust']);
      var fear = parseFloat(this['emotions'][0]['fear']);
      if (sadness >= joy && sadness >= fear && sadness >= disgust && sadness >= anger){
        totalSadness++;
        this.totalEmotion = 'sadness';
      }
      else if (joy >= sadness && joy >= fear && joy >= disgust && joy >= anger){
        totalJoy++;
        this.totalEmotion = 'joy';
      }
      else if (fear >= sadness && fear >= joy && fear >= disgust && fear >= anger){
        totalFear++;
        this.totalEmotion = 'fear';
      }
      else if (disgust >= sadness && disgust >= joy && disgust >= fear && disgust >= anger){
        totalDisgust++;
        this.totalEmotion = 'disgust';
      }
      else if (anger >= sadness && anger >= joy && anger >= fear && anger >= disgust){
        totalAnger++;
        this.totalEmotion = 'anger';
      }
    });
    $('.e1').html(`<h1>Joy</h1><p>${totalJoy}</p`);
    $('.e2').html(`<h1>Anger</h1><p>${totalAnger}</p`);
    $('.e3').html(`<h1>Fear</h1><p>${totalFear}</p`);
    $('.e4').html(`<h1>Disgust</h1><p>${totalDisgust}</p`);
    $('.e5').html(`<h1>Sadness</h1><p>${totalSadness}</p`);
    showList(articles)
    addToMap(articles);
  }

  function showList(articles){
    $(articles).each(function(index){
      $('.results').append(`
        <div class="row newsArticles ${this.totalEmotion}">
        <div class="article col-sm-8" style="background-color: ${this.color}">
        <h1><a href="${this.link}" class='noColor'>${this.title}</a></h1>
        <p>${this.description}</p>
        </div>
        <div class="articleImage col-sm-4" >
        </div>
        </div>
        `);
      })
    }

    function addToMap(articles){
      var markerArray = [];
      var bounds = new google.maps.LatLngBounds();
      $(articles).each(function(){
        console.log(this.locations, 'locations');
        this.content = `<div id="content"><h1>${this.title}</h1><p>${this.description}</p><a href="${this.link}" target="_blank" > View the aritlce here.</a></div>`;
        console.log(this.content, 'content');
        var tempContent = this.content;
        for (var i = 0; i < this.locations.length; i++) {
          var position = new google.maps.LatLng(this.locations[0][0], this.locations[0][1]);
          console.log('position',i,position);
          bounds.extend(position);
          var infoWindow = new google.maps.InfoWindow({
            content:tempContent
          });
          var marker = new google.maps.Marker({
            position: position,
            map: map,
            title: this.title,
            icon: {
              path: 'M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0',
              scale: 10,
              fillColor: this.color,
              fillOpacity: 100,
              strokeOpacity: 0,
              scale: 10,
            },
          });
          console.log('marker',marker);
          marker.addListener('click', function() {
            infoWindow.open(map, marker);
          });
        }
        map.fitBounds(bounds)
      });
    }
