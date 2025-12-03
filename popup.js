// Puter Game Hub - Main Logic

let currentUser = null;
const CHAT_FILE = '/chat/messages.json';
const GAMES_DIR = '/games';
const GAMES_METADATA_FILE = '/games/metadata.json';

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  setupEventListeners();
});

// Check if user is already signed in
async function checkAuthStatus() {
  try {
    const isSignedIn = await puter.auth.isSignedIn();
    if (isSignedIn) {
      currentUser = await puter.auth.getUser();
      showAuthenticatedUI();
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('auth-btn').addEventListener('click', handleSignIn);
  document.getElementById('signout-btn').addEventListener('click', handleSignOut);
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('refresh-btn').addEventListener('click', loadMessages);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('upload-btn').addEventListener('click', uploadGame);
  document.getElementById('refresh-games-btn').addEventListener('click', loadGames);
}

// Authentication handlers
async function handleSignIn() {
  try {
    await puter.auth.signIn();
    currentUser = await puter.auth.getUser();
    showAuthenticatedUI();
  } catch (error) {
    console.error('Sign in error:', error);
    showStatus('upload-status', 'Sign in failed. Please try again.', 'error');
  }
}

async function handleSignOut() {
  try {
    await puter.auth.signOut();
    currentUser = null;
    showUnauthenticatedUI();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

function showAuthenticatedUI() {
  document.getElementById('auth-btn').classList.add('hidden');
  document.getElementById('user-info').classList.remove('hidden');
  document.getElementById('username').textContent = `👤 ${currentUser.username}`;
  document.getElementById('chat-section').classList.remove('hidden');
  document.getElementById('upload-section').classList.remove('hidden');
  document.getElementById('games-section').classList.remove('hidden');
  
  // Load initial data
  loadMessages();
  loadGames();
}

function showUnauthenticatedUI() {
  document.getElementById('auth-btn').classList.remove('hidden');
  document.getElementById('user-info').classList.add('hidden');
  document.getElementById('chat-section').classList.add('hidden');
  document.getElementById('upload-section').classList.add('hidden');
  document.getElementById('games-section').classList.add('hidden');
}

// Chat functionality
async function loadMessages() {
  try {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    // Try to read existing messages
    let messages = [];
    try {
      const blob = await puter.fs.read(CHAT_FILE);
      const text = await blob.text();
      messages = JSON.parse(text);
    } catch (error) {
      // File doesn't exist yet, create it
      await ensureChatFileExists();
    }
    
    displayMessages(messages);
  } catch (error) {
    console.error('Load messages error:', error);
    document.getElementById('chat-messages').innerHTML = 
      '<div class="error">Failed to load messages</div>';
  }
}

async function ensureChatFileExists() {
  try {
    // Create chat directory if it doesn't exist
    try {
      await puter.fs.mkdir('/chat');
    } catch (e) {
      // Directory might already exist
    }
    
    // Create empty messages file
    await puter.fs.write(CHAT_FILE, JSON.stringify([]));
  } catch (error) {
    console.error('Error creating chat file:', error);
  }
}

function displayMessages(messages) {
  const chatContainer = document.getElementById('chat-messages');
  
  if (messages.length === 0) {
    chatContainer.innerHTML = '<div class="no-messages">No messages yet. Be the first to chat!</div>';
    return;
  }
  
  chatContainer.innerHTML = messages.map(msg => `
    <div class="message">
      <div class="message-header">
        <span class="message-user">${msg.username}</span>
        <span class="message-time">${new Date(msg.timestamp).toLocaleString()}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
    </div>
  `).join('');
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  try {
    // Read existing messages
    let messages = [];
    try {
      const blob = await puter.fs.read(CHAT_FILE);
      const content = await blob.text();
      messages = JSON.parse(content);
    } catch (error) {
      await ensureChatFileExists();
    }
    
    // Add new message
    messages.push({
      username: currentUser.username,
      text: text,
      timestamp: new Date().toISOString()
    });
    
    // Save back to file
    await puter.fs.write(CHAT_FILE, JSON.stringify(messages, null, 2));
    
    // Clear input and reload
    input.value = '';
    displayMessages(messages);
  } catch (error) {
    console.error('Send message error:', error);
    showStatus('upload-status', 'Failed to send message', 'error');
  }
}

// Game upload and hosting
async function uploadGame() {
  const fileInput = document.getElementById('game-file');
  const gameNameInput = document.getElementById('game-name');
  const files = fileInput.files;
  
  if (files.length === 0) {
    showStatus('upload-status', 'Please select at least one file', 'error');
    return;
  }
  
  showStatus('upload-status', 'Uploading and hosting game...', 'info');
  
  try {
    // Generate game name
    const gameName = gameNameInput.value.trim() || `game-${Date.now()}`;
    const gameDir = `${GAMES_DIR}/${gameName}`;
    
    // Create games directory if it doesn't exist
    try {
      await puter.fs.mkdir(GAMES_DIR);
    } catch (e) {
      // Directory might already exist
    }
    
    // Create game directory
    await puter.fs.mkdir(gameDir);
    
    // Upload all files
    for (let file of files) {
      const content = await file.text();
      await puter.fs.write(`${gameDir}/${file.name}`, content);
    }
    
    // Check if index.html exists, if not create one
    let hasIndex = Array.from(files).some(f => f.name === 'index.html');
    if (!hasIndex) {
      const mainFile = files[0].name;
      const indexHtml = generateIndexHtml(mainFile, gameName);
      await puter.fs.write(`${gameDir}/index.html`, indexHtml);
    }
    
    // Host the game
    const subdomain = `game-${gameName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const site = await puter.hosting.create(subdomain, gameDir);
    
    // Save game metadata
    await saveGameMetadata({
      name: gameName,
      subdomain: site.subdomain,
      uploadDate: new Date().toISOString(),
      files: Array.from(files).map(f => f.name)
    });
    
    showStatus('upload-status', `Game hosted at: ${site.subdomain}.puter.site`, 'success');
    
    // Clear inputs and reload games
    fileInput.value = '';
    gameNameInput.value = '';
    loadGames();
  } catch (error) {
    console.error('Upload error:', error);
    showStatus('upload-status', `Upload failed: ${error.message}`, 'error');
  }
}

function generateIndexHtml(mainFile, gameName) {
  const ext = mainFile.split('.').pop().toLowerCase();
  
  if (ext === 'html') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${gameName}</title>
</head>
<body>
  <iframe src="${mainFile}" style="width:100%;height:100vh;border:none;"></iframe>
</body>
</html>`;
  }
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${gameName}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #1a1a2e;
      color: #eee;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    #game-container {
      max-width: 800px;
      width: 100%;
    }
    h1 {
      text-align: center;
      color: #00d4ff;
    }
  </style>
</head>
<body>
  <div id="game-container">
    <h1>${gameName}</h1>
    <div id="game"></div>
  </div>
  <script src="${mainFile}"></script>
</body>
</html>`;
}

async function saveGameMetadata(gameData) {
  try {
    let metadata = [];
    try {
      const blob = await puter.fs.read(GAMES_METADATA_FILE);
      const text = await blob.text();
      metadata = JSON.parse(text);
    } catch (error) {
      // File doesn't exist yet
    }
    
    metadata.push(gameData);
    await puter.fs.write(GAMES_METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Save metadata error:', error);
  }
}

async function loadGames() {
  try {
    const gamesContainer = document.getElementById('games-list');
    gamesContainer.innerHTML = '<div class="loading">Loading games...</div>';
    
    let metadata = [];
    try {
      const blob = await puter.fs.read(GAMES_METADATA_FILE);
      const text = await blob.text();
      metadata = JSON.parse(text);
    } catch (error) {
      // No games yet
    }
    
    if (metadata.length === 0) {
      gamesContainer.innerHTML = '<div class="no-games">No games uploaded yet</div>';
      return;
    }
    
    gamesContainer.innerHTML = metadata.map(game => `
      <div class="game-card">
        <div class="game-info">
          <h3>${escapeHtml(game.name)}</h3>
          <p class="game-date">Uploaded: ${new Date(game.uploadDate).toLocaleDateString()}</p>
          <p class="game-url">https://${game.subdomain}.puter.site</p>
        </div>
        <button class="btn btn-primary" onclick="playGame('${game.subdomain}')">Play</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load games error:', error);
    document.getElementById('games-list').innerHTML = 
      '<div class="error">Failed to load games</div>';
  }
}

function playGame(subdomain) {
  window.open(`https://${subdomain}.puter.site`, '_blank');
}

// Utility functions
function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-message ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      element.textContent = '';
      element.className = 'status-message';
    }, 5000);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
