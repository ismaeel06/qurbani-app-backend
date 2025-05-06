const mongoose = require('mongoose');

const chatSchema = mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  },
  {
    timestamps: true
  }
);

// Create compound index to ensure uniqueness of buyer-seller-listing combination
chatSchema.index({ listing: 1, buyer: 1, seller: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);