const fs = require('fs')
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const dotenv = require('dotenv');
const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');
const fileUpload = require('./middleware/file-upload');

const app = express();

dotenv.config()

app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads','images')) );

app.use( (req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','Origin, x-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE');
    next();
});

app.use('/api/places',placesRoutes);
app.use('/api/users', usersRoutes);

app.use((req,res,next) => {
    const error = new HttpError('Couldnot find this Route you have entered', 404);
    throw error;
});

app.use((error, req, res, next)=> {
    if(req.file){
        fs.unlink(req.file.path, err => {
            console.log(err);
        });
    }
    if(res.headerSent){
        return next(error);
    }

    res.status( error.code || 500)
    res.json({message: error.message || 'An unknown error occured !'})
});


mongoose
    .connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.y3dwi.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(5000);
    })
    .catch(err => {
        console.log(err);
    });
 