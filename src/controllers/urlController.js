const UrlModel = require('../Models/urlModel')
const validUrl = require('valid-url')
const shortid = require('shortid')



/////********************************************************Redis Connection************************************************* */

const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    11266,
  "redis-11266.c80.us-east-1-2.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("chRGSwUhbKJjbi1Z0dWVD3iMkfwIbPnF", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



// *************************************************************** Validation ************************************************************* //
const isValidBody = function (body) {
    return Object.keys(body).length > 0;
}

const isValid = function (value) {
    if (typeof value === 'undefined' || value === null) return false; 
    if (typeof value === 'string' && value.trim().length === 0) return false;
    return true
}



// ********************************************************** POST /url/shorten ********************************************************** //

const createUrl = async function(req,res) {
    try {
        const body = req.body
        // Validate body(body must be present)
        if(!isValidBody(body)) {
            return res.status(400).send({status: false, msg: "Body must not be empty"})
        }

        // Validate query(it must not be present)
        const query = req.query;
        if(isValidBody(query)) {
            return res.status(400).send({ status: false, msg: "Invalid parameters. Query must not be present"});
        }

        // Validate params(it must not be present)
        const params = req.params;
        if(isValidBody(params)) {
            return res.status(400).send({ status: false, msg: "Invalid parameters. Params must not be present"})
        }

        // longUrl must be present in body
        const longUrl = body.longUrl
        if(!isValid(longUrl)) { 
            return res.status(400).send({status: false, msg:"Please provide longUrl"})
        }

        let check = await GET_ASYNC(`${longUrl}`)
        if (check) {
            let response = JSON.parse(check)
            console.log("data is from cache")
            return res.status(200).send(response)
        }



        //Validation of longUrl            
         if(!/(:?^((https|http|HTTP|HTTPS){1}:\/\/)(([w]{3})[\.]{1}|)?([a-zA-Z0-9]{1,}[\.])[\w]*((\/){1}([\w@?^=%&amp;~+#-_.]+))*)$/.test(longUrl)) {
          //  if(!/(http|https|HTTP|HTTPS?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%.\+#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%\+.#?&//=]*)$/.test(longUrl)) {
            return res.status(400).send({status: false, message: `logoLink is not a valid URL`})
        }
    
        

            
        let url = await UrlModel.findOne({longUrl: longUrl}).select({longUrl:1, shortUrl:1, urlCode:1, _id:0})
        if(url) {
            await SET_ASYNC(`${longUrl}`, JSON.stringify(url))
            console.log(" data is from mongodb")
            return res.status(200).send({status: true, data: url})
        } 
    

        const baseUrl = 'http://localhost:3000/'
        // Validation of baseUrl
        if(!validUrl.isUri(baseUrl)) {
            return res.status(401).send({ status: false, msg: "Invalid baseUrl"})
        }
        //let urlCode= shortid.generate()
        let urlCode = (Math.random() + 1).toString(36).substring(7);

        // To create shortUrl from longUrl. We have to combine baseUrl with the urlCode.
        let shortUrl = baseUrl +  urlCode.toLowerCase()


       let input = {longUrl, shortUrl, urlCode}
        
       const finalurl = await UrlModel.create(input)
        const createdUrl = {longUrl:finalurl.longUrl, shortUrl:finalurl.shortUrl, urlCode:finalurl.urlCode}
        
        return res.status(201).send({status: true, data: createdUrl})
        
    }
    catch (err) {
        console.log("This is the error :", err.message)
        return res.status(500).send({ msg: "Error", error: err.message })
    }
}

module.exports.createUrl = createUrl



// ************************************************************* GET /:urlCode ************************************************************* //

const getUrl = async function(req,res) {
    try {
        const urlCode = req.params.urlCode
        // Validate params(it must be present)
        if(!isValid(urlCode.trim().toLowerCase())) {
            return res.status(400).send({status: false, msg: "Please provide urlCode"})
        }

        
        // Validate body(it must not be present)
        if(isValidBody(req.body)) {
            return res.status(400).send({status: false, msg: "Body should not be present"})
        }

        // Validate query(it must not be present)
        const query = req.query;
        if(isValidBody(query)) {
            return res.status(400).send({ status: false, msg: "Invalid parameters. Query must not be present"});
        }


        let check = await GET_ASYNC(`${urlCode}`);
        if(check) {
            let response = JSON.parse(check);
            console.log("from cache");
            return res.status(302).redirect(response.longUrl)
        }


        const url = await UrlModel.findOne({urlCode: urlCode})
        if(url) {
            await SET_ASYNC(`${urlCode}`, JSON.stringify(url));
            console.log("from mongoDB");
            return res.status(302).redirect(url.longUrl);
        } else{
            return res.status(404).send({status: false, msg: "No urlCode matches"})
        }
    }
    catch (err) {
        console.log("This is the error :", err.message)
        return res.status(500).send({status: false, msg:err.message })
    }
}

module.exports.getUrl = getUrl