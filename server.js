const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { createServer } = require("http");
const { Server } = require("socket.io");
const User = require("./models/User");
const Chat = require("./models/Chat");
const Message = require("./models/Message");

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Replace with your frontend URL in production
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000 // Increase timeout to 60 seconds
});

// Track online users
const onlineUsers = new Map();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/listings", require("./routes/cattle"));

app.use("/api/chats", require("./routes/chat"));

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user._id} (${socket.user.name})`);
  
  // Add user to online users map
  onlineUsers.set(socket.user._id.toString(), socket.id);
  io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));

  // Join room for each of the user's chats
  socket.on("joinChats", async () => {
    try {
      const chats = await Chat.find({
        $or: [{ buyer: socket.user._id }, { seller: socket.user._id }]
      });
      
      chats.forEach(chat => {
        socket.join(chat._id.toString());
        console.log(`User ${socket.user._id} joined chat ${chat._id}`);
      });
    } catch (error) {
      console.error("Error joining chats:", error);
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async ({ chatId, message }) => {
    try {
      console.log(`User ${socket.user._id} sending message to chat ${chatId}`);
      
      // Verify user is part of this chat
      const chat = await Chat.findOne({
        _id: chatId,
        $or: [{ buyer: socket.user._id }, { seller: socket.user._id }]
      });
      
      if (!chat) {
        throw new Error("Unauthorized access to chat");
      }

      // If message comes from socket directly rather than REST API
      if (typeof message === "string" || !message._id) {
        // Create new message
        const newMessage = new Message({
          chat: chatId,
          sender: socket.user._id,
          content: message.content || message,
          read: false
        });

        await newMessage.save();

        // Update chat's last message
        chat.lastMessage = newMessage._id;
        chat.updatedAt = new Date();
        await chat.save();

        const messageWithSender = {
          ...newMessage.toObject(),
          sender: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          }
        };

        // Emit to all participants in the chat room
        io.to(chatId.toString()).emit("receiveMessage", messageWithSender);
        
        // Notify chat list update
        io.emit("chatUpdated", chatId);
      } 
      // If the message already has an ID, it was created via REST API
      else {
        // Just emit it to others in the chat
        io.to(chatId.toString())
          .emit("receiveMessage", message);
        
        // Notify chat list update
        io.emit("chatUpdated", chatId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("messageError", { error: error.message });
    }
  });

  // Handle marking messages as read
  socket.on("markMessagesAsRead", async ({ chatId, userId }) => {
    try {
      // Verify user is part of this chat
      const chat = await Chat.findOne({
        _id: chatId,
        $or: [{ buyer: userId }, { seller: userId }]
      });
      
      if (!chat) {
        throw new Error("Unauthorized access to chat");
      }

      // Update all unread messages from other user
      await Message.updateMany(
        {
          chat: chatId,
          sender: { $ne: userId },
          read: false
        },
        { $set: { read: true } }
      );

      // Notify other participants
      io.to(chatId.toString()).emit("messagesRead", { chatId });

    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user._id}`);
    onlineUsers.delete(socket.user._id.toString());
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
  });
});

mongoose
  .connect(process.env.MONGODB_URI || "mongodb+srv://midnightdemise123:Krx9o8Xha5IohFck@qurbani.m0nasnp.mongodb.net/", { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  })
  .then(() => {
    httpServer.listen(process.env.PORT || 5000, () => 
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => console.error("MongoDB connection error:", err));
=======
app.use("/api/
        ", require("./routes/admin"));

mongoose
  .connect(
    "mongodb+srv://midnightdemise123:Krx9o8Xha5IohFck@qurbani.m0nasnp.mongodb.net/",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() =>
    app.listen(5000, () => console.log("Server running on port 5000"))
  )
  .catch((err) => console.error("MongoDB connection error:", err));
