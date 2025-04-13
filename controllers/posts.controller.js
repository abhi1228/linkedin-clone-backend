import Comment from "../models/comments.model.js";
import Post from "../models/posts.model.js";
import User from "../models/user.model.js";

export const activeCheck = (req,res)=>{
    res.status(200).json({message:"running"})
}

export const createPost=async(req,res)=>{
    const {token , postData}=req.body;
    console.log(req.body,req.file);
    try {
        const user=await User.findOne({token});
        if(!user){
            return res.status(400).json({messsage:"User not found"});
        }

        const post =new Post({
            userId:user.id,
            body:req.body.body,
            media:req.file !=undefined ? req.file.filename : "",
            fileType:req.file !=undefined ? req.file.mimetype.split("/")[1] : ""
        });

        await post.save();

        return res.status(201).json({message:"Post created successfully"})

        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const getAllPost=async(req,res)=>{
   
    try {
      
        const posts=await Post.find().populate("userId","name username email profilePicture");

        return res.status(200).json({posts})

        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const deletePost=async(req,res)=>{
    const {token , post_id}=req.body;
    //console.log("post delete hit",token,post_id)
    try {
        const user=await User.findOne({token});
        if(!user){
            return res.status(400).json({messsage:"User not found"});
        }

        const post=await Post.findOne({_id:post_id});
        if(!post){
            return res.status(400).json({messsage:"Post not found"});
        }

        if(post.userId.toString() !== user._id.toString()){
            return res.status(400).json({message:"Unauthorized"});
        }
        //console.log(token,post_id);
       await  Post.deleteOne({_id:post_id});

        return res.status(200).json({message:"Post deleted"});
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const commentPost=async(req,res)=>{
    const {token , post_id ,commentBody}=req.body;
    console.log("commnet input:",token,post_id,commentBody)
    try {
        const user=await User.findOne({token}).select("_id");
        if(!user){
            return res.status(400).json({messsage:"User not found"});
        }

        const post=await Post.findOne({_id:post_id});
        if(!post){
            return res.status(400).json({messsage:"Post not found"});
        }

        const comment=new Comment({
            userId:user._id,
            postId:post_id,
            body:commentBody
        })

        await comment.save();
        
        return res.status(200).json({message:"Comment Added"})

        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const get_comments_by_post=async(req,res)=>{
    const {post_id}=req.query;
    try {
        console.log("query_post:",req.query);
        const post=await Post.findOne({_id:post_id});
        if(!post){
            return res.status(400).json({messsage:"Post not found"});
        }
      
        const comments=await Comment.find({postId:post_id}).populate("userId","username name profilePicture");

        return res.status(200).json({comments:comments.reverse()})

        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const delete_comment_of_user=async(req,res)=>{
    const {token,comment_id}=req.body;
    try {

        const user=await User.findOne({token}).select("_id");
        if(!user){
            return res.status(400).json({messsage:"User not found"});
        }
      
        const comment=await Comment.find({_id:comment_id});

        if(comment.userId.toString() !== user._id.toString()){
            return res.status(400).json({messsage:"Unauthorized to delete"});
        }

        await comment.deleteOne();

        return res.status(200).json({message:"Commnet deleted"})

        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}

export const increment_likes=async(req,res)=>{
    const {post_id}=req.body;

    try {
        const post=await Post.findOne({_id:post_id});

        if(!post){
            return res.status(400).json({messsage:"Post not found"});
        }

        post.likes +=1;
            
        post.save();
        //console.log("like done")
        return res.json({message:"Likes incremented"})
            
        
    } catch (error) {
        return res.status(500).json({message:error.message});
    }
}