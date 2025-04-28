import mongoose, { Schema, Model } from 'mongoose';

export interface IMessage {
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface IChat {
  userId: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  updatedAt: Date;
}

const MessageSchema = new mongoose.Schema<IMessage>({
  content: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ChatSchema = new Schema<IChat>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  lastMessage: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Check if the model is already defined to prevent OverwriteModelError in development with hot reloading
const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat; 