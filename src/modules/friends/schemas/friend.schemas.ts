import * as mongoose from 'mongoose';

interface IFollow {
  userId: string;
  relationshipId: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

interface IFriend extends IFollow{
  sender: string;
}

const FRIEND_MODEL = 'friends';
const FOLLOW_MODEL = 'follows';

const FriendsSchema = new mongoose.Schema(
  {
    _id: String,
    userId: String,
    sender: String,
    relationshipId: String,
    status: String,  
    createdAt: Number,
    updatedAt: Number,
  }
);
const FollowsSchema = new mongoose.Schema(
  {
    _id: String,
    userId: String,
    relationshipId: String,
    status: String,  
    createdAt: Number,
    updatedAt: Number,
  }
);

FriendsSchema.index({ 
    userId: "text",
    sender: "text",
    relationshipId: "text",
    status: "text",
})
FollowsSchema.index({ 
    userId: "text",
    relationshipId: "text",
    status: "text",
})

export { 
  FriendsSchema, 
  FRIEND_MODEL, 

  IFriend, 
  IFollow,
  
  FollowsSchema,
  FOLLOW_MODEL
 };
