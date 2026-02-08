import { body, param, query, validationResult } from 'express-validator'

// Middleware to handle validation errors
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    })
  }
  next()
}

// ========================================
// FRIEND REQUEST VALIDATORS
// ========================================

export const validateFriendRequest = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Message too long (max 200 characters)'),
  validate
]

export const validateRequestId = [
  param('id')
    .isMongoId().withMessage('Invalid request ID'),
  validate
]

// ========================================
// MESSAGE VALIDATORS
// ========================================

export const validateSendMessage = [
  body('recipientId')
    .notEmpty().withMessage('Recipient ID is required')
    .isMongoId().withMessage('Invalid recipient ID'),
  body('content')
    .notEmpty().withMessage('Message content is required')
    .trim()
    .isLength({ min: 1, max: 5000 }).withMessage('Message must be 1-5000 characters'),
  body('contentType')
    .optional()
    .isIn(['text', 'image', 'video', 'audio', 'file', 'location']).withMessage('Invalid content type'),
  body('mediaUrl')
    .optional()
    .isURL().withMessage('Invalid media URL'),
  body('location')
    .optional()
    .custom((value) => {
      if (!value.latitude || !value.longitude) {
        throw new Error('Location must have latitude and longitude')
      }
      return true
    }),
  validate
]

export const validateConversationParams = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  validate
]

export const validateMessageId = [
  param('messageId')
    .isMongoId().withMessage('Invalid message ID'),
  validate
]

// ========================================
// GROUP VALIDATORS
// ========================================

export const validateCreateGroup = [
  body('name')
    .notEmpty().withMessage('Group name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Group name must be 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description too long (max 500 characters)'),
  body('type')
    .optional()
    .isIn(['private', 'public']).withMessage('Type must be private or public'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City name too long'),
  body('route')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Route too long'),
  body('members')
    .optional()
    .isArray().withMessage('Members must be an array')
    .custom((members) => {
      if (members.length > 256) {
        throw new Error('Maximum 256 members allowed')
      }
      return true
    }),
  validate
]

export const validateGroupId = [
  param('groupId')
    .isMongoId().withMessage('Invalid group ID'),
  validate
]

export const validateAddMember = [
  param('groupId')
    .isMongoId().withMessage('Invalid group ID'),
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID'),
  validate
]

export const validateUpdateGroup = [
  param('groupId')
    .isMongoId().withMessage('Invalid group ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Group name must be 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description too long'),
  validate
]

// ========================================
// COMMUNITY VALIDATORS
// ========================================

export const validateCreateCommunity = [
  body('name')
    .notEmpty().withMessage('Community name is required')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Community name must be 3-100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Community name can only contain letters, numbers, spaces, hyphens and underscores'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
  body('type')
    .optional()
    .isIn(['city', 'topic', 'route', 'event', 'general']).withMessage('Invalid community type'),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed')
      }
      return tags.every(tag => typeof tag === 'string' && tag.length <= 30)
    }).withMessage('Each tag must be a string with max 30 characters'),
  body('rules')
    .optional()
    .isArray().withMessage('Rules must be an array')
    .custom((rules) => {
      if (rules.length > 20) {
        throw new Error('Maximum 20 rules allowed')
      }
      return true
    }),
  validate
]

export const validateCommunityId = [
  param('communityId')
    .isMongoId().withMessage('Invalid community ID'),
  validate
]

export const validateCommunityQuery = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query too long'),
  query('type')
    .optional()
    .isIn(['city', 'topic', 'route', 'event', 'general']).withMessage('Invalid type'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  validate
]

// ========================================
// POST VALIDATORS
// ========================================

export const validateCreatePost = [
  body('communityId')
    .notEmpty().withMessage('Community ID is required')
    .isMongoId().withMessage('Invalid community ID'),
  body('title')
    .notEmpty().withMessage('Title is required')
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('content')
    .notEmpty().withMessage('Content is required')
    .trim()
    .isLength({ min: 10, max: 10000 }).withMessage('Content must be 10-10000 characters'),
  body('contentType')
    .optional()
    .isIn(['text', 'image', 'video', 'link']).withMessage('Invalid content type'),
  body('mediaUrls')
    .optional()
    .isArray().withMessage('Media URLs must be an array')
    .custom((urls) => {
      if (urls.length > 10) {
        throw new Error('Maximum 10 media files allowed')
      }
      return true
    }),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed')
      }
      return true
    }),
  body('isVlog')
    .optional()
    .isBoolean().withMessage('isVlog must be boolean'),
  body('isSafetyAlert')
    .optional()
    .isBoolean().withMessage('isSafetyAlert must be boolean'),
  validate
]

export const validatePostId = [
  param('postId')
    .isMongoId().withMessage('Invalid post ID'),
  validate
]

export const validateReaction = [
  param('postId')
    .isMongoId().withMessage('Invalid post ID'),
  body('reactionType')
    .notEmpty().withMessage('Reaction type is required')
    .isIn(['fire', 'heart', 'eyes', 'road', 'warning']).withMessage('Invalid reaction type'),
  validate
]

export const validateComment = [
  param('postId')
    .isMongoId().withMessage('Invalid post ID'),
  body('content')
    .notEmpty().withMessage('Comment content is required')
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
  body('parentCommentId')
    .optional()
    .isMongoId().withMessage('Invalid parent comment ID'),
  body('mentions')
    .optional()
    .isArray().withMessage('Mentions must be an array'),
  validate
]

export const validateFeedParams = [
  param('communityId')
    .isMongoId().withMessage('Invalid community ID'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  query('filter')
    .optional()
    .isIn(['hot', 'new', 'top', 'vlogs', 'safety']).withMessage('Invalid filter'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'views', 'reactions']).withMessage('Invalid sort field'),
  validate
]
