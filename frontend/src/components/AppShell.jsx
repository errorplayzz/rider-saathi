import React, { useState } from 'react'
import { motion } from 'framer-motion'

const AppShell = ({ children, isDark = false }) => {
  const [initState, setInitState] = useState('ready') // Directly set to 'ready'

  return (
    <motion.div
      className="min-h-screen transition-colors duration-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  )
}

export default AppShell