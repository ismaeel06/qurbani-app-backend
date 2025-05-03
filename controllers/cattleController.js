// controllers/CattleController.js
import Listing from '../models/Cattle.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Get all listings with filters
export const getAllListings = async (req, res) => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      location,
      sort = 'newest',
      page = 1,
      limit = 10
    } = req.query;


    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (location) filter.location = location;
    
    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Determine sort order
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'price_low':
        sortOption = { price: 1 };
        break;
      case 'price_high':
        sortOption = { price: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query with pagination
    const listings = await Listing.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('seller', 'name profileImage createdAt');

    
    // Get total count for pagination
    const total = await Listing.countDocuments(filter);

    res.status(200).json({ 
      listings, 
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });



  } catch (error) {
    console.error("Error in getAllListings:", error);
    res.status(500).json({ message: "Failed to fetch listings", error: error.message });
  }
};

// Get featured listings
export const getFeaturedListings = async (req, res) => {
  try {
    // You can determine "featured" based on various criteria
    // Here we're simply getting the newest listings
    const featuredListings = await Listing.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('seller', 'name profileImage createdAt');

    res.status(200).json(featuredListings);
  } catch (error) {
    console.error("Error in getFeaturedListings:", error);
    res.status(500).json({ message: "Failed to fetch featured listings", error: error.message });
  }
};

// Get single listing by ID
export const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await Listing.findById(id)
      .populate('seller', 'name profileImage createdAt');

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error("Error in getListingById:", error);
    res.status(500).json({ message: "Failed to fetch listing", error: error.message });
  }
};

// Create new listing
export const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      price,
      location,
      age,
      weight,
      features,
      imageUrls
    } = req.body;

    // Parse features if it's sent as a string
    const parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
    // Process uploaded images
    // Create new listing
    const newListing = new Listing({
      title,
      description,
      category,
      price: Number(price),
      location,
      age: age ? Number(age) : undefined,
      weight: weight ? Number(weight) : undefined,
      features: parsedFeatures || [],
      images: JSON.parse(imageUrls),
      seller: req.user._id,
    });


    const savedListing = await newListing.save();

    console.log(savedListing)
    
    // Populate seller info before sending response
    const populatedListing = await Listing.findById(savedListing._id)
      .populate('seller', 'name profileImage createdAt');

    res.status(201).json(populatedListing);
  } catch (error) {
    console.error("Error in createListing:", error);
    res.status(500).json({ message: "Failed to create listing", error: error.message });
  }
};

// Update listing
export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    // Find listing and check ownership
    const listing = await Listing.findById(id);
    
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user is the owner of the listing
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own listings" });
    }

    const {
      title,
      description,
      category,
      price,
      location,
      age,
      weight,
      features
    } = req.body;

    // Parse features if it's sent as a string
    const parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;

    // Update listing data
    listing.title = title || listing.title;
    listing.description = description || listing.description;
    listing.category = category || listing.category;
    listing.price = price ? Number(price) : listing.price;
    listing.location = location || listing.location;
    listing.age = age ? Number(age) : listing.age;
    listing.weight = weight ? Number(weight) : listing.weight;
    listing.features = parsedFeatures || listing.features;

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Remove old images from storage if there were any
      if (listing.images && listing.images.length > 0) {
        listing.images.forEach(imageUrl => {
          const imagePath = path.join(process.cwd(), 'public', imageUrl);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
      
      // Add new images
      listing.images = req.files.map(file => `/uploads/${file.filename}`);
    }

    // Save updated listing
    const updatedListing = await listing.save();

    // Populate seller info before sending response
    const populatedListing = await Listing.findById(updatedListing._id)
      .populate('seller', 'name profileImage createdAt');

    res.status(200).json(populatedListing);
  } catch (error) {
    console.error("Error in updateListing:", error);
    res.status(500).json({ message: "Failed to update listing", error: error.message });
  }
};

// Delete listing
export const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    // Find listing and check ownership
    const listing = await Listing.findById(id);
    
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user is the owner of the listing
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own listings" });
    }

    // Delete images from storage
    if (listing.images && listing.images.length > 0) {
      listing.images.forEach(imageUrl => {
        const imagePath = path.join(process.cwd(), 'public', imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    // Delete the listing
    await Listing.findByIdAndDelete(id);

    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error in deleteListing:", error);
    res.status(500).json({ message: "Failed to delete listing", error: error.message });
  }
};

// Toggle favorite listing
export const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    // Check if listing exists
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if listing is already in favorites
    const favoriteIndex = user.favorites.indexOf(id);
    
    if (favoriteIndex === -1) {
      // Add to favorites
      user.favorites.push(id);
      await user.save();
      res.status(200).json({ message: "Added to favorites", isFavorite: true });
    } else {
      // Remove from favorites
      user.favorites.splice(favoriteIndex, 1);
      await user.save();
      res.status(200).json({ message: "Removed from favorites", isFavorite: false });
    }
  } catch (error) {
    console.error("Error in toggleFavorite:", error);
    res.status(500).json({ message: "Failed to toggle favorite", error: error.message });
  }
};

// Get user's listings
export const getUserListings = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(userId)
    const listings = await Listing.find({ seller: userId })
      .sort({ createdAt: -1 })
      .populate('seller', 'name profileImage createdAt');

    res.status(200).json(listings);
  } catch (error) {
    console.error("Error in getUserListings:", error);
    res.status(500).json({ message: "Failed to fetch user listings", error: error.message });
  }
};

// Get user's favorite listings
export const getFavoriteListings = async (req, res) => {
  try {
    const userId = req.user._id;

    // First get the user with favorites
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all favorite listings
    const favorites = await Listing.find({ _id: { $in: user.favorites } })
      .sort({ createdAt: -1 })
      .populate('seller', 'name profileImage createdAt');



    res.status(200).json(favorites);
  } catch (error) {
    console.error("Error in getFavoriteListings:", error);
    res.status(500).json({ message: "Failed to fetch favorite listings", error: error.message });
  }
};