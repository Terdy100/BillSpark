/**
 * Generates a stable fingerprint for the current browser/device.
 * This is not 100% unique but helps in identifying the same device 
 * after a cache clear.
 */
export const getFingerprint = () => {
  const { userAgent, language, hardwareConcurrency, deviceMemory } = navigator;
  const { width, height, colorDepth } = window.screen;
  const components = [
    userAgent.replace(/\d+\.\d+\.\d+\.\d+/g, ''), // Strip version numbers for stability
    language,
    hardwareConcurrency || 'unknown',
    deviceMemory || 'unknown',
    width,
    height,
    colorDepth
  ];
  const str = components.join('|');
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fp_' + Math.abs(hash).toString(36);
};

/**
 * Gets or creates a device ID, with self-healing capabilities.
 * @param {Object} userMetadata - The user's metadata from Supabase
 */
export const getDeviceId = (userMetadata = {}) => {
  let id = localStorage.getItem('billspark_device_id');
  const fingerprint = getFingerprint();
  
  const knownDevices = userMetadata.devices || [];
  // devices can be strings (old format) or objects {id, fp} (new format)
  
  // If we have no ID in storage, try to recover using fingerprint
  if (!id) {
    const matchingDevice = knownDevices.find(d => 
      typeof d === 'object' && d.fp === fingerprint
    );
    
    if (matchingDevice) {
      id = matchingDevice.id;
      console.log('Recovered device ID from fingerprint:', id);
    } else {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      console.log('Generated new device ID:', id);
    }
    localStorage.setItem('billspark_device_id', id);
  }
  
  return { id, fingerprint };
};
