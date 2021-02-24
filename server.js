'use strict'

let express = require('express');
let cors = require("cors");
let superagent = require("superagent");
let app = express();
let pg = require("pg");
require("dotenv").config()
app.use(cors());
const PORT = process.env.PORT

const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });



app.get("/location", handleLocation);

app.get("/weather", handleWeather);

app.get("/parks", handleParks)

app.get("/movies", handleMovies)

app.get("/yelp", handleYelp)

app.get("*", handle404);

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log("Listening on port " + PORT);
    })
}).catch(error => console.log("error occured ", error))

function CityLocation(locationData) {
    this.search_query = locationData.city_name;
    this.formatted_query = locationData.display_name;
    this.latitude = locationData.latitude;
    this.longitude = locationData.longitude;
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
function Movie(movieData){
    this.title = movieData.title;
    this.overview =movieData.overview;
    this.average_votes = movieData.average_votes;
    this.image_url = "https://image.tmdb.org/t/p/w500" + movieData.poster_path;
    this.popularity = movieData.popularity;
    this.released_on = movieData.released_on;
}

function Business(businessData){
    this.name = businessData.name;
    this.image_url = businessData.image_url;
    this.price = businessData.price;
    this.rating = businessData.rating;
    this.url = businessData.url;
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
function handleMovies(req, res){
    getMoviesData(req.query.search_query).then(data =>{
        res.status(200).send(data);
    })
}
function handleYelp(req,res){
    getYelpData(req.query.search_query, req.query.page).then(data =>{
        res.status(200).send(data)
    })
}
function getLocationData(searchQuery) {
    return checkIfExists(searchQuery).then(data =>{
        if(data){
            return data;
        }
        return getDataFromAPI(searchQuery).then(data => data).catch(error => console.log(error))
    })
}

function checkIfExists(searchQuery){
    let dbFindQuery = `SELECT * FROM city WHERE city_name = $1;`
    return client.query(dbFindQuery, [searchQuery]).then(data =>{
        if(data.rows.length > 0){
            return new CityLocation(data.rows[0]);
        }
    }).catch(error => console.log(error))
}
function getDataFromAPI(searchQuery){
    let url = "https://eu1.locationiq.com/v1/search.php"
    const query = {
        key: process.env.GEO_CODE_KEY,
        q: searchQuery,
        limit: 1,
        format: "json"
    }
    return superagent.get(url).query(query).then(data => {
        try {
            let safeValues = [searchQuery, data.body[0].display_name, data.body[0].lat, data.body[0].lon]
            let dbAddQuery = `INSERT INTO city(city_name, display_name, latitude, longitude) VALUES($1,$2,$3,$4) RETURNING *;`;
            return client.query(dbAddQuery, safeValues).then(data =>{
                return new CityLocation(data.rows[0]);
            }).catch(error => console.log(error));
        } catch {
            console.log("Somethhing is wrong")
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

function getMoviesData(searchQuery){
    let url = "https://api.themoviedb.org/3/search/movie";
    const query = {
        api_key: process.env.MOVIES_API_KEY,
        query: searchQuery
    }

    return superagent.get(url).query(query).then(movies =>{
        try{
            return movies.body.results.map(movie => new Movie(movie))
        } catch{
            console.log("Something went wrong")
        }
    }).catch(error => console.log(error));
}

function getYelpData(searchQuery, pageNumber){
    let url = "https://api.yelp.com/v3/businesses/search"
    const query = {
        location: searchQuery,
        limit:5,
        offset: (pageNumber - 1) * 5
    }
    return superagent.get(url).set("Authorization", `Bearer ${process.env.YELP_API_KEY}`).query(query).then(data =>{
        return data.body.businesses.map(business => new Business(business))
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
