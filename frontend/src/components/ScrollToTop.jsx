import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      let retries = 0;
      const interval = setInterval(() => {
        const element = document.getElementById(hash.replace('#', ''))
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
          clearInterval(interval)
        }
        retries++;
        if (retries >= 10) { // Try for 1 second (10 * 100ms)
          clearInterval(interval)
        }
      }, 100)
    } else {
      // Scroll to top on route change
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [pathname, hash])

  return null
}

export default ScrollToTop
