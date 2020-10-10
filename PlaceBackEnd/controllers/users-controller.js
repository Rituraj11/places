const { validationResult } = require('express-validator');
const bcrypt  = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');


const getUsers = async (req, res, next) => {
   let users;
   try{
        // users = await User.find({}, 'name email');
       users = await User.find({}, '-password');
   } catch(err) {
        return next( new HttpError('users fetching failed', 500) );
   }

   res.json({ users: users.map( user => user.toObject({ getters: true}) )} );
}

const signup = async (req, res, next) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next( new HttpError('Invalid input passed', 422) );
    }

    const { name, email, password} = req.body;

    let existingUser;
    try{
        existingUser = await User.findOne({ email: email });
    }catch (err) {
        return next( new HttpError('Signing up is failed, try again', 500) );
    }

    if(existingUser){
        return next( new HttpError('User id exists', 422) );
    }

    let hashedpassword;

    try{
        hashedpassword = await bcrypt.hash(password, 12);
    }catch(err){
        return next( new HttpError('Signing up is failed, try again', 500) ); 
    }

    const createUser = new User ({  
        name,
        email,
        image: req.file.path,
        password: hashedpassword,
        places: []
    });

    try{
        await createUser.save();
    } catch(err) {
        return next( new HttpError('signing up failed, try again', 500) );
    }

    let token;
    try{
        token = jwt.sign({ 
            userId: createUser.id, email: createUser.email}, 
            process.env.JWT_KEY,
            {expiresIn: '1h'}
        );
    }catch(err){
        return next( new HttpError('Signing up is failed, try again', 500) ); 
    }
    

    res.status(200).json({ userId: createUser.id, email: createUser.email, token: token });
}

const login = async (req, res, next) => {
    const {email, password} = req.body;

    let existingUser;
    try{
        existingUser = await User.findOne({ email: email });
    }catch (err) {
        return next( new HttpError('Logging in is failed, try again', 500) );
    }

    if(!existingUser){
        return next( new HttpError ('Invalid credentials', 401) );
    }

    let isValidPassowrd = false;

    try{
        isValidPassowrd = await bcrypt.compare(password, existingUser.password);
    }catch(err){
        return next( new HttpError('Logging in is failed, try again', 500) );
    }

    if(!isValidPassowrd){
        return next( new HttpError ('Invalid credentials', 401) );
    }
    
    let token;
    try{
        token = jwt.sign({ 
            userId: existingUser.id, email: existingUser.email}, 
            process.env.JWT_KEY,
            {expiresIn: '1h'}
        );
    }catch(err){
        return next( new HttpError('Logging in is failed, try again', 500) ); 
    }
    
    res.status(200).json({ userId: existingUser.id, email: existingUser.email, token: token });
    
}

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;