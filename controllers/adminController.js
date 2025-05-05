const User = require("../models/User");
const Listing = require("../models/Cattle");
const Report = require("../models/Report"); // Uncommented Report model

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();

    // Total listings
    const totalListings = await Listing.countDocuments();

    // Total reports (count all reports)
    const totalReports = await Report.countDocuments();

    res.status(200).json({
      totalUsers,
      totalListings,
      totalReports,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Error fetching stats" });
  }
};

// Update Listing
exports.updateListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const updates = req.body;

    // Ensure the data is valid
    const listing = await Listing.findByIdAndUpdate(listingId, updates, {
      new: true,
    });

    if (!listing) return res.status(404).json({ message: "Listing not found" });

    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: "Failed to update listing" });
  }
};

// Delete Listing
exports.deleteListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findByIdAndDelete(listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete listing" });
  }
};

// Get recent users
exports.getRecentUsers = async (req, res) => {
  try {
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt profileImage");

    console.log(recentUsers);

    res.status(200).json(recentUsers);
  } catch (error) {
    console.error("Error fetching recent users:", error);
    res.status(500).json({ message: "Error fetching recent users" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Optionally, you can add validation here like role check for admin users, etc.
    if (updates.password) delete updates.password; // Prevent changing the password via this route

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user); // Return the updated user data
  } catch (err) {
    res.status(500).json({ message: "Failed to update user" });
  }
};

// Get recent listings
exports.getRecentListings = async (req, res) => {
  try {
    const recentListings = await Listing.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("seller", "name profileImage");

    res.status(200).json(recentListings);
  } catch (error) {
    console.error("Error fetching recent listings:", error);
    res.status(500).json({ message: "Error fetching recent listings" });
  }
};

// DELETE /api/admin/reports/:reportId
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await Report.findByIdAndDelete(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.status(200).json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error("Error deleting report:", err);
    res.status(500).json({ message: "Failed to delete report" });
  }
};

// Get recent reports
exports.getRecentReports = async (req, res) => {
  try {
    const recentReports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("reportedItem", "title price location") // Populate the related Listing info
      .populate("reporter", "name email"); // Populate the reporter's info

    res.status(200).json(recentReports);
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    res.status(500).json({ message: "Error fetching recent reports" });
  }
};

// POST /api/admin/listings/:listingId/report
exports.createReport = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { type, reason } = req.body;
    const reporter = req.user.id;

    // create new Report
    const report = await Report.create({
      type,
      reason,
      reportedItem: listingId,
      reporter,
    });

    res.status(201).json(report);
  } catch (err) {
    console.error("Error creating report:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};
