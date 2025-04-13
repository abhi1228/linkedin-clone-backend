import bcrypt from 'bcrypt';
import User from '../models/user.model.js';
import Profile from '../models/profile.model.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import fs from "fs";
import Connection from '../models/connections.model.js';

const convertUserDataToPdf=async (userData)=>{
    const doc=new PDFDocument();

    const outputPath=crypto.randomBytes(16).toString("hex")+".pdf";
    const stream=fs.createWriteStream("uploads/"+ outputPath);
   // console.log(userData);
    doc.pipe(stream);
    doc.image(`uploads/${userData.userId.profilePicture}`,{align:"center",width:100});
    doc.moveDown(6);
    doc.fontSize(14).text(`Name:${userData.userId.name}`);
    doc.fontSize(14).text(`UserName:${userData.userId.username}`);
    doc.fontSize(14).text(`Email:${userData.userId.email}`);
    doc.fontSize(14).text(`Bio:${userData.userId.bio || "N/A"}`);
    doc.fontSize(14).text(`Current Position:${userData.userId.currentPosition}`);
    doc.moveDown();
    doc.fontSize(14).text("PastWork:")
    userData.pastWork.forEach((work,index)=>{
        doc.moveDown(0.5); // spacing between jobs
        doc.fontSize(14).text(`Company Name:${work.company}`);
        doc.fontSize(14).text(`Position:${work.position}`);
        doc.fontSize(14).text(`Years:${work.years}`);

    })

    doc.end()

    return outputPath;
}


export const register=async (req,res)=>{
    try{
        const {name,email,username,password}=req.body;
        if(!name || !email || !username || !password){
            return res.status(400).json({message:"All fields are required"});
        }
        const user = await User.findOne({email} );
        if(user){
           return  res.status(400).json({message:"User already exists"});
        }

        const hashedPassword=await bcrypt.hash(password,10);
        const newUser=new User({
            name,
            email,
            username,
            password:hashedPassword
        });
        newUser.save();

        const profile=new Profile({
            userId:newUser._id
        });

        profile.save();

        return res.status(201).json({messsage:"User created successfully"})

    }catch(error){
        return res.status(500).json({message:error.message});
    }
}

export const login=async (req,res)=>{

    try {
        const {email,password}=req.body;

        if(!email || !password){
            return res.status(400).json({message:"All fields are required"});
        }

        const user=await User.findOne({email});

        if(!user){
            return  res.status(400).json({message:"User does not exists"});
        }

        const isMatch=await bcrypt.compare(password,user.password);

        if(!isMatch){
            return  res.status(400).json({message:"Invalid Credentials"});
        }

        const token=crypto.randomBytes(32).toString("hex");
        await User.updateOne({_id:user._id},{token});

        return res.status(200).json({message:"Login successful",token})


    } catch (error) {
        return res.status(500).json({message:error.message});
    }

}

export const uploadProfilePicture=async (req,res)=>{
    const {token}=req.body;
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded!" });
    }
    try {
        const user=await User.findOne({token});

        if(!user){
            return res.status(400).json({message:"User does not exists"});
        }

        user.profilePicture=req.file.filename;
        await user.save();

        return res.status(200).json({message:"Profile picture updated"});
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const updateUserProfile=async (req,res)=>{

    try {

        const {token,...newUserData}=req.body;

        const user=await User.findOne({token});

        if(!user){
            return res.status(400).json({message:"User  not found"});
        }

        const {username,email}=newUserData;

        const existingUser=await User.findOne({$or:[{username,email}]});

        if(existingUser && existingUser._id.toString() !== user._id.toString()){
            return res.status(400).json({message:"Username or email already exists"});
        }
        Object.assign(user,newUserData);
        await user.save();
        return res.status(200).json({message:"User Profile Updated "});
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const getUserAndProfile=async (req,res)=>{
   
    
    try {
        const {token}=req.query;
        console.log(token);
        const user=await User.findOne({token});
        
        if(!user){
            return res.status(400).json({message:"User does not exists"});
        }

        const userProfile=await Profile.findOne({userId:user._id})
        .populate("userId","name email username profilePicture");
       
        return res.json({userProfile});
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const updateProfileData =async (req,res)=>{
    try {
        const {token,...newProfileData}=req.body;
        const user=await User.findOne({token});
        if(!user){
            return res.status(400).json({message:"User does not exists"});
        }
        const profile_to_update=await Profile.findOne({userId:user._id});

        Object.assign(profile_to_update,newProfileData);

        await profile_to_update.save();
        return res.status(200).json({message:"Profile updated successfully"});

        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const getAllUserProfile =async (req,res)=>{
    try {
        const profiles=await Profile.find({ userId: { $ne: null } }).populate("userId","name email username profilePicture");
        console.log("userProfileList:",profiles);
        return res.json({profiles});
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const downloadProfile =async (req,res)=>{
    try {
        const {id}=req.query;
        const userProfile=await Profile.findOne({userId:id}).populate("userId","name email username profilePicture");
        let outputPath =await convertUserDataToPdf(userProfile);
        return res.json({"message":outputPath});
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const sendConnectionRequest = async (req,res)=>{
    const {token,connectionId}=req.body;

    try {

        const user=await User.findOne({token});

        if(!user){
            return res.status(400).json({message:"User does not exists"});
        }
        const connectionUser=await User.findOne({_id:connectionId});

        const existingRequest=await Connection.findOne({
            userId:user._id,
            connectionId:connectionUser._id
        });

        if(existingRequest){
            return res.status(400).json({message:"Request already send"});
        }

        const request=new Connection({
            userId:user._id,
            connectionId:connectionId
        });

        request.save();
        return res.json({message:"Request send"});

        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const getMyConnectionRequest=async(req,res)=>{
    const {token}=req.query;

    try {
        const user=await User.findOne({token});

        if(!user){
            return res.status(400).json({message:"User not found"});
        }

        const connection=await Connection.find({userId:user._id}).populate("connectionId","name username email profilePicture");

        return res.json(connection);
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const whatAreMyConnection=async(req,res)=>{
    const {token}=req.query;
    
    try {
        const user=await User.findOne({token});

        if(!user){
            return res.status(400).json({message:"User not found"});
        }

        const connection=await Connection.find({connectionId:user._id}).populate("userId","name username email profilePicture");
        //console.log(connection);
        return res.json(connection);
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const acceptConnectionRequest=async(req,res)=>{
    const {token,requestId,action_type}=req.query;
            
        console.log(requestId);
    try {
        const user=await User.findOne({token});

        if(!user){
            return res.status(400).json({message:"User not found"});
        }

        const connection=await Connection.findOne({_id:requestId});

        if(!connection){
            return res.status(400).json({message:"Connection not found"});
        }
        if(action_type === "accept"){
            connection.status_accepted=true;
        }else{
            connection.status_accepted=false;
        }
        console.log(connection);
        await connection.save();
        return res.json({message:"Request updated"});
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}


export const getUserProfileAndUserBasedOnUserName=async(req,res)=>{
        const {username}=req.query;

        try {
            const user=await User.findOne({username});
            if(!user){
                return res.status(404).json({message:"User not found"});
            }

            const userProfile=await Profile.findOne({userId:user._id})
            .populate('userId',"name username email profilePicture");
        

            return res.status(200).json({"profile":userProfile});
            
        } catch (error) {
            return res.status(500).json({message:error.message});
        }
}