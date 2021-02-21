'use strict'

let express = require('express')
let cors = require("cors");

let app = express();
require("dotenv").config()

const PORT = process.env.PORT
app.use(cors());


app.get("/location", handleLocation);

app.get("/weather", handleWeather);

app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })

app.listen(PORT, ()=>{
    console.log("Listening on port " + PORT);
})


function CityLocation(searchQuery, displayName, lat, lon){
    this.search_query = searchQuery;
    this.formatted_query = displayName;
    this.latitude = lat;
    this.longitude = lon;
}
function Weather(forecast, time){
    this.forecast = forecast;
    this.time = time;
}
function handleLocation(req, res){
    let searchQuery = req.query.city;
    let regex = /^[a-zA-Z\s]*$/g
    if(searchQuery === undefined || !regex.test(searchQuery)){
        res.status(500).send(errorHandler())
    } else{
        let locationObject = getLocationData(searchQuery);
        res.status(200).send(locationObject);
    }
    
}

function getLocationData(searchQuery){
    let locationData = require("./data/location.json");
    let latitude = locationData[0].lat;
    let longitude = locationData[0].lon;
    let displayName = locationData[0].display_name;
    let responseObject = new CityLocation(searchQuery, displayName, latitude, longitude)
    return responseObject;
}

function handleWeather(req, res){
    res.status(200).send(getWeatherData());
}

function getWeatherData(){
    let weatherData = require("./data/weather.json").data;
    let weatherArr = []
    weatherData.forEach(day =>{
        weatherArr.push(new Weather(day.weather.description, new Date(day.datetime).toDateString()));
    })
    return weatherArr;
}

function errorHandler(){
    return{
        status:500,
        textResponse: "Sorry, something went wrong"
    }
}
