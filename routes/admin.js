// routes/admin.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getDashboardStats,
  getRecentUsers,
  getRecentListings,
  getRecentReports,
  createReport,
  deleteReport,
  updateListing, // Add updateListing function
  deleteListing, // Add deleteListing function
} = require("../controllers/adminController");

// Protected routes for admin only
router.get("/stats", auth, getDashboardStats);
router.get("/recent-users", auth, getRecentUsers);
router.get("/recent-listings", auth, getRecentListings);
router.get("/recent-reports", auth, getRecentReports);
router.delete(
  "/reports/:reportId",
  auth,
  deleteReport // ← mount the new DELETE endpoint
);
router.post("/listings/:listingId/report", auth, createReport);
router.put("/listings/:listingId", auth, updateListing); // Update listing
router.delete("/listings/:listingId", auth, deleteListing); // Delete listing

module.exports = router;
