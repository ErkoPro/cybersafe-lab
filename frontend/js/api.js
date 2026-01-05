const API_BASE_URL = window.API_URL || null;

function getSessionId() {
  let sessionId = localStorage.getItem('cybersafe_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID() || Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('cybersafe_session_id', sessionId);
  }
  return sessionId;
}

async function trackAnalytics(module, action, metadata = {}) {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        module,
        action,
        metadata,
        sessionId: getSessionId()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}

async function savePasswordCheck(passwordData) {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/password/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...passwordData,
        sessionId: getSessionId()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

async function getStats(module = null, days = 30) {
  if (!API_BASE_URL) return null;
  try {
    let url = `${API_BASE_URL}/stats/overview?days=${days}`;
    if (module) {
      url = `${API_BASE_URL}/stats/modules/${module}?days=${days}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

async function checkAPIHealth() {
  if (!API_BASE_URL) return { connected: false };
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      return { connected: true, ...data };
    }
    return { connected: false };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

if (typeof window !== 'undefined') {
  window.CyberSafeAPI = {
    trackAnalytics,
    savePasswordCheck,
    getStats,
    checkAPIHealth,
    getSessionId
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let module = 'main';
    
    if (path.includes('password')) module = 'password';
    else if (path.includes('phishing')) module = 'phishing';
    else if (path.includes('2fa')) module = '2fa';
    else if (path.includes('data-breach')) module = 'data-breach';
    else if (path.includes('social-engineering')) module = 'social-engineering';
    else if (path.includes('https')) module = 'https';
    else if (path.includes('wifi')) module = 'wifi';
    else if (path.includes('malware')) module = 'malware';
    else if (path.includes('research')) module = 'research';
    
    trackAnalytics(module, 'view', {
      page: path,
      referrer: document.referrer
    });
  });
}
