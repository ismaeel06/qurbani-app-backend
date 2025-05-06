const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create index on chat field for faster queries
messageSchema.index({ chat: 1 });

// Create compound index for faster queries on unread messages
messageSchema.index({ chat: 1, read: 1, sender: 1 });

module.exports = mongoose.model('Message', messageSchema);