const express = require('express');
const bodyParser = require('body-parser');                        
const route = require('./routes/route.js');
const { default: mongoose } = require('mongoose');
const app = express();                                                               
const dotenv = require("dotenv")
dotenv.config({ path:"./config.env" })
const defaultPORT = process.env.PORT
//const DB = process.env.DATABASE;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


mongoose.connect("mongodb+srv://rohankesarkar:rohan123@cluster0.sgev7.mongodb.net/group77", {
    useNewUrlParser: true
})
    .then(() => console.log("MongoDb is connected"))
    .catch(err => console.log(err))

app.use('/', route);


app.listen(process.env.PORT || 3000, function () {
    console.log('Express app running on port ' + (process.env.PORT || 3000))
});
