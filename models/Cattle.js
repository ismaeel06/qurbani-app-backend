// models/Listing.js
import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['goat', 'cow', 'buffalo', 'camel', 'sheep', 'other'],
    lowercase: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  age: {
    type: Number,
    min: [0, 'Age cannot be negative']
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  features: {
    type: [String],
    default: []
  },
  images: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one image is required'
    }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add text index for search functionality
listingSchema.index({ 
  title: 'text', 
  description: 'text',
  location: 'text'
});

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;