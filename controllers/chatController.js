const { default: Listing } = require('../models/Cattle');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get all chats for the authenticated user
 * @route   GET /api/chats
 * @access  Private
 */
const getUserChats = asyncHandler(async (req, res) => {
  // Find all chats where the current user is either buyer or seller
  const chats = await Chat.find({
    $or: [
      { buyer: req.user._id },
      { seller: req.user._id }
    ]
  })
    .populate('listing', 'title images')
    .populate('buyer', 'name profileImage')
    .populate('seller', 'name profileImage')
    .populate({
      path: 'latestMessage',
      populate: {
        path: 'sender',
        select: 'name _id'
      }
    })
    .sort({ updatedAt: -1 });

  // For each chat, calculate the number of unread messages for the current user
  const chatsWithUnreadCount = await Promise.all(
    chats.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        read: false,
        sender: { $ne: req.user._id } // Messages not sent by the current user
      });

      // Convert to plain object so we can add the unreadCount
      const chatObj = chat.toObject();
      chatObj.unreadCount = unreadCount;
      
      return chatObj;
    })
  );

  res.status(200).json(chatsWithUnreadCount);
});

/**
 * @desc    Get messages for a specific chat
 * @route   GET /api/chats/:chatId/messages
 * @access  Private
 */
const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  // Ensure the user is a participant in this chat
  const chat = await Chat.findOne({
    _id: chatId,
    $or: [
      { buyer: req.user._id },
      { seller: req.user._id }
    ]
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found or you are not authorized to view it');
  }

  // Get all messages for the chat
  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'name _id')
    .sort({ createdAt: 1 });

  res.status(200).json(messages);
});

/**
 * @desc    Create a new chat
 * @route   POST /api/chats
 * @access  Private
 */
const createChat = asyncHandler(async (req, res) => {
  const { listingId, sellerId } = req.body;

  if (!listingId || !sellerId) {
    res.status(400);
    throw new Error('Please provide listing ID and seller ID');
  }

  // Verify the listing exists
  const listing = await Listing.findById(listingId);
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }

  // Verify the seller exists
  const seller = await User.findById(sellerId);
  if (!seller) {
    res.status(404);
    throw new Error('Seller not found');
  }

  // Check if a chat already exists between this buyer and seller for this listing
  let chat = await Chat.findOne({
    listing: listingId,
    buyer: req.user._id,
    seller: sellerId
  });

  if (chat) {
    // Chat already exists, return it
    chat = await Chat.findById(chat._id)
      .populate('listing', 'title images')
      .populate('buyer', 'name profileImage')
      .populate('seller', 'name profileImage')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'name _id'
        }
      });

    // Add unreadCount to the response
    const unreadCount = await Message.countDocuments({
      chat: chat._id,
      read: false,
      sender: { $ne: req.user._id }
    });

    const chatObj = chat.toObject();
    chatObj.unreadCount = unreadCount;

    return res.status(200).json(chatObj);
  }

  // Create a new chat
  const newChat = await Chat.create({
    listing: listingId,
    buyer: req.user._id,
    seller: sellerId
  });

  // Populate the new chat details
  const populatedChat = await Chat.findById(newChat._id)
    .populate('listing', 'title images')
    .populate('buyer', 'name profileImage')
    .populate('seller', 'name profileImage');

  // Add unreadCount (will be 0 for a new chat)
  const chatObj = populatedChat.toObject();
  chatObj.unreadCount = 0;

  res.status(201).json(chatObj);
});

/**
 * @desc    Send a message in a chat
 * @route   POST /api/chats/:chatId/messages
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400);
    throw new Error('Please provide message content');
  }

  // Ensure the user is a participant in this chat
  const chat = await Chat.findOne({
    _id: chatId,
    $or: [
      { buyer: req.user._id },
      { seller: req.user._id }
    ]
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found or you are not authorized to send messages');
  }

  // Create new message
  const newMessage = await Message.create({
    chat: chatId,
    sender: req.user._id,
    content,
    read: false
  });

  // Update chat's latestMessage and updatedAt
  chat.latestMessage = newMessage._id;
  await chat.save();

  // Populate sender details in the response
  const populatedMessage = await Message.findById(newMessage._id)
    .populate('sender', 'name _id');

  res.status(201).json(populatedMessage);
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/chats/:chatId/read
 * @access  Private
 */
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  // Ensure the user is a participant in this chat
  const chat = await Chat.findOne({
    _id: chatId,
    $or: [
      { buyer: userId },
      { seller: userId }
    ]
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found or you are not authorized');
  }

  // Update all unread messages sent by other users
  await Message.updateMany(
    {
      chat: chatId,
      sender: { $ne: userId },
      read: false
    },
    {
      read: true
    }
  );

  res.status(200).json({ success: true, message: 'Messages marked as read' });
});

/**
 * Socket.io event handlers
 */
const setupSocketHandlers = (io, socket, userId) => {
  // Join user's room based on their ID
  socket.join(userId);

  // Handle marking messages as read
  socket.on('markMessagesAsRead', async ({ chatId, userId }) => {
    try {
      // Update messages in database
      await Message.updateMany(
        {
          chat: chatId,
          sender: { $ne: userId },
          read: false
        },
        {
          read: true
        }
      );

      // Find the other participant in the chat
      const chat = await Chat.findById(chatId);
      const recipientId = chat.buyer.toString() === userId 
        ? chat.seller.toString() 
        : chat.buyer.toString();

      // Notify the other user that messages have been read
      io.to(recipientId).emit('messagesRead', { chatId });
    } catch (error) {
      console.error('Socket error - markMessagesAsRead:', error.message);
    }
  });

  // Handle sending messages
  socket.on('sendMessage', async (messageData) => {
    try {
      // Find the chat to get the other participant
      const chat = await Chat.findById(messageData.chatId);
      if (!chat) return;

      // Determine recipient
      const recipientId = chat.buyer.toString() === userId 
        ? chat.seller.toString() 
        : chat.buyer.toString();

      // Emit to recipient's room
      socket.to(recipientId).emit('receiveMessage', messageData);
    } catch (error) {
      console.error('Socket error - sendMessage:', error.message);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Update online users list
    const onlineUsers = [...io.sockets.adapter.rooms.keys()].filter(
      room => room.length === 24 // Assuming MongoDB ObjectId is 24 chars
    );
    io.emit('getOnlineUsers', onlineUsers);
  });

  // Send current online users to all clients
  const onlineUsers = [...io.sockets.adapter.rooms.keys()].filter(
    room => room.length === 24 // Assuming MongoDB ObjectId is 24 chars
  );
  io.emit('getOnlineUsers', onlineUsers);
};

module.exports = {
  getUserChats,
  getChatMessages,
  createChat,
  sendMessage,
  markMessagesAsRead,
  setupSocketHandlers
};