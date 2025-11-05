import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const NotificationToast = ({ notification, onClose, onClick }) => {
  if (!notification) return null

  const getIcon = () => {
    switch (notification.type) {
      case 'message':
        return <ChatBubbleLeftIcon className="w-6 h-6 text-blue-400" />
      case 'emergency':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
      case 'resolved':
        return <CheckCircleIcon className="w-6 h-6 text-green-400" />
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, x: 50 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-20 right-4 z-[200] max-w-sm"
      >
        <div
          onClick={onClick}
          className="bg-dark-800 border-l-4 border-neon-cyan rounded-lg shadow-2xl p-4 cursor-pointer hover:bg-dark-700 transition-colors"
          style={{
            borderLeftColor: notification.type === 'emergency' ? '#ef4444' : 
                            notification.type === 'resolved' ? '#22c55e' : '#00ffff'
          }}
        >
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {notification.avatar ? (
                <img
                  src={notification.avatar}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center">
                  {getIcon()}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">
                    {notification.title}
                  </h4>
                  <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                  }}
                  className="ml-2 text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Action hint */}
              <p className="text-xs text-neon-cyan mt-2 flex items-center">
                <span>Click to view</span>
                <span className="ml-1">→</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-0.5 bg-neon-cyan"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default NotificationToast
