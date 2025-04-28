const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));

mongoose
  .connect("mongodb+srv://midnightdemise123:Krx9o8Xha5IohFck@qurbani.m0nasnp.mongodb.net/", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.listen(5000, () => console.log("Server running on port 5000")))
  .catch((err) => console.error("MongoDB connection error:", err));