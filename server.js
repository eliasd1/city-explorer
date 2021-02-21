'use strict'

let express = require('express')
let app = express();
require("dotenv").config()

const PORT = process.env.PORT

app.get("/location", handleLocation);


app.listen(PORT, ()=>{
    console.log("Listening on port " + PORT);
})

function handleLocation(req, res){
    let searchQuery = req.query.city;
    getLocationData(searchQuery);
}

function getLocationData(searchQuery){
    let locationData = require("./data/location.json");
    console.log(locationData)
    let longitude = locationData[0].lon
}
