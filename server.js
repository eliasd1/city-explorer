'use strict'

let express = require('express')
let cors = require("cors");

let app = express();
require("dotenv").config()

const PORT = process.env.PORT
app.use(cors());

app.get("/location", handleLocation);


app.listen(PORT, ()=>{
    console.log("Listening on port " + PORT);
})

function CityLocation(searchQuery, displayName, lat, lon){
    this.search_query = searchQuery;
    this.formatted_query = displayName;
    this.latitude = lat;
    this.longitude = lon;
}
function handleLocation(req, res){
    let searchQuery = req.query.city;
    let locationObject = getLocationData(searchQuery);
    res.status(200).send(locationObject);
}

function getLocationData(searchQuery){
    let locationData = require("./data/location.json");
    let latitude = locationData[0].lat;
    let longitude = locationData[0].lon;
    let displayName = locationData[0].display_name;
    let responseObject = new CityLocation(searchQuery, displayName, latitude, longitude)
    return responseObject;
}
