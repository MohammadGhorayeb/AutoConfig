import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  jobTitle?: string;
  isActive: boolean;
  isPasswordTemporary: boolean;
  createdBy?: mongoose.Types.ObjectId;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

// Check if the model already exists to prevent OverwriteModelError
const UserSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
    },
    jobTitle: {
      type: String,
      maxlength: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPasswordTemporary: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (this: IUser, next) {
  try {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Use a more reliable approach to prevent model compilation errors
let User: mongoose.Model<IUser>;

try {
  // Try to get the existing model
  User = mongoose.model<IUser>('User');
} catch (error) {
  // Model doesn't exist, create it
  User = mongoose.model<IUser>('User', UserSchema);
}

export default User; 