import express from 'express';
const router = express.Router();
import { auth } from '../middleware/auth.js';
import * as locationController from '../controllers/locationController.js';

// All routes require authentication
router.use(auth);

/**
 * @route   POST /api/location/update
 * @desc    Update user's live location
 * @access  Private
 */
router.post('/update', locationController.updateLocation);

/**
 * @route   GET /api/location/nearby
 * @desc    Get nearby riders with friend/stranger filtering
 * @access  Private
 */
router.get('/nearby', locationController.getNearbyRiders);

/**
 * @route   GET /api/location/rider/:riderId
 * @desc    Get specific rider's location (if visible)
 * @access  Private
 */
router.get('/rider/:riderId', locationController.getRiderLocation);

/**
 * @route   PUT /api/location/visibility
 * @desc    Update location visibility settings
 * @access  Private
 */
router.put('/visibility', locationController.updateVisibility);

/**
 * @route   DELETE /api/location
 * @desc    Stop sharing location
 * @access  Private
 */
router.delete('/', locationController.deleteLocation);

/**
 * @route   GET /api/location/status
 * @desc    Get own location sharing status
 * @access  Private
 */
router.get('/status', locationController.getLocationStatus);

export default router;
