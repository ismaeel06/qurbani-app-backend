const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { 
  getUserChats, 
  getChatMessages, 
  createChat,
  sendMessage,
  markMessagesAsRead
} = require('../controllers/chatController');

// Get all chats for the authenticated user
router.get('/', auth, getUserChats);

// Get messages for a specific chat
router.get('/:chatId/messages', auth, getChatMessages);

// Create a new chat
router.post('/', auth, createChat);

// Send a message in a chat
router.post('/:chatId/messages', auth, sendMessage);

// Mark messages as read (socket handler in chatController will use this function)
// This route is optional as it's mainly handled through sockets
router.put('/:chatId/read', auth, markMessagesAsRead);

module.exports = router;