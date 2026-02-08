import React from 'react'
import { VideoCameraIcon } from '@heroicons/react/24/outline'

const Vlogs = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <VideoCameraIcon className="w-24 h-24 mx-auto text-slate-400 dark:text-slate-600 mb-6" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Rider Vlogs
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Share your riding experiences, adventures, and stories with the community
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
            Coming soon...
          </p>
        </div>
      </div>
    </div>
  )
}

export default Vlogs
