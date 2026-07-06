import { useState, useEffect, useRef } from 'react';

export const useFrameLoader = (frameUrls, chunkSize = 20) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [errors, setErrors] = useState([]);
  const framesRef = useRef([]);

  useEffect(() => {
    let isMounted = true;
    const total = frameUrls.length;
    
    if (total === 0) {
      const err = "Critical: frameUrls array is empty. import.meta.glob failed to find any files.";
      setErrors(prev => [...prev, err]);
      setIsLoaded(true);
      return;
    }

    framesRef.current = new Array(total).fill(null);
    let loadedCount = 0;

    const loadFrame = async (url, index) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        
        const blob = await response.blob();
        
        if (window.createImageBitmap) {
          const bitmap = await createImageBitmap(blob);
          return bitmap;
        } else {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              resolve(img);
            };
            img.onerror = () => {
              reject(new Error(`Image onload failed for ${url}`));
            };
            img.src = url;
          });
        }
      } catch (err) {
        setErrors(prev => [...prev, `Failed to load ${url}: ${err.message}`]);
        return null;
      }
    };

    const processChunk = async (startIndex) => {
      if (!isMounted) return;
      
      const endIndex = Math.min(startIndex + chunkSize, total);
      const chunkUrls = frameUrls.slice(startIndex, endIndex);
      
      const chunkPromises = chunkUrls.map((url, index) => {
        const absoluteIndex = startIndex + index;
        return loadFrame(url, absoluteIndex).then(frame => {
          if (isMounted && frame) {
            framesRef.current[absoluteIndex] = frame;
            loadedCount++;
            
            // Progressive rendering: immediately unlock UI when frame 0 is ready
            if (absoluteIndex === 0) {
              setFirstFrameReady(true);
            }
            
            if (loadedCount % 10 === 0 || loadedCount === total) {
              setLoadingProgress(Math.round((loadedCount / total) * 100));
            }
          }
        });
      });

      await Promise.all(chunkPromises);

      if (loadedCount >= total) {
        if (isMounted) setIsLoaded(true);
      } else if (isMounted) {
        requestAnimationFrame(() => {
          processChunk(endIndex);
        });
      }
    };

    processChunk(0);

    return () => {
      isMounted = false;
    };
  }, [frameUrls, chunkSize]);

  return { framesRef, loadingProgress, isLoaded, firstFrameReady, errors };
};
