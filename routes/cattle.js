const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { 
  getAllListings, 
  getFeaturedListings, 
  getListingById, 
  createListing, 
  updateListing, 
  deleteListing, 
  toggleFavorite, 
  getUserListings, 
  getFavoriteListings 
} = require("../controllers/cattleController");
const upload = require("../config/multer");



// Public routes
router.get("/", getAllListings);
router.get("/featured", getFeaturedListings);
router.get("/:id", getListingById);

// Protected routes (require authentication)
router.post("/", auth,upload.array("images"), createListing);
router.put("/:id", auth, upload.array("images"), updateListing);
router.delete("/:id", auth, deleteListing);
router.post("/:id/favorite", auth, toggleFavorite);
router.get("/user/listings", auth, getUserListings);
router.get("/user/favorites", auth, getFavoriteListings);

module.exports = router;