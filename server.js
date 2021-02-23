'use strict'

let express = require('express');
let cors = require("cors");
let superagent = require("superagent");
let app = express();
let pg = require("pg");
require("dotenv").config()

const PORT = process.env.PORT
let client = new pg.Client(process.env.DATABASE_URL);
app.use(cors());


app.get("/location", handleLocation);

app.get("/weather", handleWeather);

app.get("/parks", handleParks)

app.get("*", handle404);

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log("Listening on port " + PORT);
    })
})

function CityLocation(searchQuery, displayName, lat, lon) {
    this.search_query = searchQuery;
    this.formatted_query = displayName;
    this.latitude = lat;
    this.longitude = lon;
}
function Weather(forecast, time) {
    this.forecast = forecast;
    this.time = time;
}
function Park(name, address, fee, description, url) {
    this.name = name;
    this.address = address;
    this.fee = fee;
    this.description = description;
    this.url = url;
}

function handleLocation(req, res) {
    try {
        let searchQuery = req.query.city;
        getLocationData(searchQuery).then(data => {
            res.status(200).send(data);
        });
    } catch (error) {
        res.status(500).send(errorHandler())
    }
}

function handleWeather(req, res) {
    getWeatherData(req.query.latitude, req.query.longitude).then(data => {
        res.status(200).send(data)
    })
}

function handleParks(req, res) {
    getParksData(req.query.search_query).then(data => {
        res.status(200).send(data);
    })
}

function getLocationData(searchQuery) {
    const searchValue = [searchQuery];
    let dbFindQuery = `SELECT * FROM city WHERE city_name = $1;`
    return client.query(dbFindQuery, searchValue).then(data =>{
        if(data.rows.length > 0){
            return new CityLocation(data.rows[0].city_name, data.rows[0].display_name, data.rows[0].latitude, data.rows[0].longitude);
        } else{
            let url = "https://eu1.locationiq.com/v1/search.php"
            const query = {
                key: process.env.GEO_CODE_KEY,
                q: searchQuery,
                limit: 1,
                format: "json"
            }
            return superagent.get(url).query(query).then(data => {
                try {
                    let latitude = data.body[0].lat;
                    let longitude = data.body[0].lon;
                    let displayName = data.body[0].display_name;
                    let safeValues = [searchQuery, displayName,latitude, longitude]
                    let dbAddQuery = `INSERT INTO city(city_name, display_name, latitude, longitude) VALUES($1,$2,$3,$4);`;
                    client.query(dbAddQuery, safeValues).then(data =>{
                        console.log("Data bas been added ", data)
                    }).catch(error => console.log(error));
                    let responseObject = new CityLocation(searchQuery, displayName, latitude, longitude)
                    return responseObject;
                } catch {
                    console.log("Somethhing is wrong")
                }

            }).catch(error => console.log(error))
        }
    }).catch(error => console.log(error))
    
}



function getWeatherData(lat, lon) {
    let url = "https://api.weatherbit.io/v2.0/forecast/daily"
    const query = {
        lat: lat,
        lon: lon,
        key: process.env.WEATHER_API_KEY,
    }
    return superagent.get(url).query(query).then(weatherObj => {
        try {
            return weatherObj.body.data.map(day => new Weather(day.weather.description, new Date(day.datetime).toDateString()));
        } catch {
            console.log("Something is wrong")
        }
    }).catch(error => console.log(error));
}

function getParksData(searchQuery) {
    let url = "https://developer.nps.gov/api/v1/parks"
    const query = {
        q: searchQuery,
        api_key: process.env.PARKS_API_KEY
    }
    return superagent.get(url).query(query).then(parks => {
        try {
            return parks.body.data.map(park => {
                return new Park(park.fullName, `${park.addresses[0].line1}, ${park.addresses[0].city}, ${park.addresses[0].stateCode} ${park.addresses[0].postalCode}`, "0.00", park.description, park.url)
            })
        } catch {
            console.log("Something went wrong here")
        }
    }).catch(error => console.log(error))
}
function errorHandler() {
    return {
        status: 500,
        textResponse: "Sorry, something went wrong"
    }
}
function handle404(req, res) {
    res.status(404).send("Path not found");
}
