// routes/userRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// All routes require authentication
router.use(authMiddleware);

// Profile routes
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.delete('/profile', UserController.deleteAccount);

// Avatar routes
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar);

// Stats and history routes
router.get('/stats', UserController.getUserStats);
router.get('/match-history', UserController.getMatchHistory);

module.exports = router;