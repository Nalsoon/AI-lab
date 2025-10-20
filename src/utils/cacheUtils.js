// Cache management utilities
export const clearAppCache = () => {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear any cached data in memory
    if (window.caches) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    console.log('App cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

export const clearSupabaseCache = () => {
  try {
    // Clear Supabase specific cache
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('sb-')
    );
    
    supabaseKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Supabase cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing Supabase cache:', error);
    return false;
  }
};

export const getCacheInfo = () => {
  const localStorageSize = JSON.stringify(localStorage).length;
  const sessionStorageSize = JSON.stringify(sessionStorage).length;
  
  return {
    localStorageKeys: Object.keys(localStorage).length,
    sessionStorageKeys: Object.keys(sessionStorage).length,
    localStorageSize,
    sessionStorageSize,
    totalSize: localStorageSize + sessionStorageSize
  };
};
