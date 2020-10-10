const fs = require('fs');

const { json } = require('body-parser');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');


const HttpError = require('../models/http-error');
const getCoordesForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');



const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    
    let place;
    try{
        place = await Place.findById(placeId);
    }catch (err) {
        return next(new HttpError(' Something went wrong, Place not found ', 500));
    }

    console.log(place);
    if(!place){
        return next(new HttpError(' Couldnot find a place for the provided id', 404));
    }

    res.json({ place: place.toObject( { getters: true }) });
}

const getPlacesByUserId = async (req,res,next)=> {
    const userId = req.params.uid;
    
    let places;
    try{
        places = await Place.find({ creator: userId});
    } catch( err){
        return next(new HttpError(' Fetching places failed, please try again ', 500));
    }
    

    if(!places || places.length === 0){
        return next( new HttpError(' Couldnot find a places for the provided id', 404) );
    }

    res.json({ places: places.map( place => place.toObject({ getters: true}) ) });
}

const createPlace = async ( req, res, next) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next( new HttpError('Invalid input passed', 422) );
    }

    const{ title, description, address } = req.body;

    const coordinates = getCoordesForAddress();
    
    const createPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userData.userId
    });

    let user;
    try{
        user = await User.findById( req.userData.userId);
    } catch(err) {
        return next( new HttpError('Creating place failed, please try again', 500) );
    }

    if(!user){
        return next( new HttpError('Couldnot find the user for provided id', 404) );
    }


    try{

        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createPlace.save({ session: sess });
        user.places.push(createPlace);
        await user.save({ session: sess });
        await sess.commitTransaction();

    }catch{
        const error = new HttpError('Create place failed', 500 );
        return next(error);
    }

    res.status(201).json({createPlace});
}

const updatePlace = async (req, res, next) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next( new HttpError('Invalid input passed', 422) );
    }

    const{ title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try{
        place = await Place.findById(placeId) ;
    } catch(err){
        return next( new HttpError('Could not find place by this id', 404 ) );
    }

    place.title = title;
    place.description = description;

    try{
        await place.save();
    } catch(err){
        return next( new HttpError('Something went wrong, couldnot update', 500) );
    }

    if( place.creator.toString() !== req.userData.userId){
        return next( new HttpError('You are  not allowed to edit this place', 401) );
    }

    res.status(200).json({place: place.toObject({ getters: true}) });
}


const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;
  
    let place;
    try {
      place = await Place.findById(placeId).populate('creator');
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not delete place.',
        500
      );
      return next(error);
    }
  
    if (!place) {
      const error = new HttpError('Could not find place for this id.', 404);
      return next(error);
    }

    if( place.creator.id !== req.userData.userId){
        return next( new HttpError('You are  not allowed to edit this place', 401) );
    }

    const imagePath = place.image;
  
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      await place.remove({session: sess});
      place.creator.places.pull(place);
      await place.creator.save({session: sess});
      await sess.commitTransaction();
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not delete place.',
        500
      );
      return next(error);
    }
    
    fs.unlink(imagePath, err => {
        console.log(err);
    })

    res.status(200).json({ message: 'Deleted place.' });
  };


exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
