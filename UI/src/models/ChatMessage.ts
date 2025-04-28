import mongoose, { Schema, Model } from 'mongoose';

export interface IChatMessage {
  chatId: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  chatId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add composite index for efficient message retrieval
ChatMessageSchema.index({ chatId: 1, timestamp: 1 });

// Check if the model is already defined to prevent OverwriteModelError in development with hot reloading
const ChatMessage: Model<IChatMessage> = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage; 