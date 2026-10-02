const chatHistory = document.querySelector('#chatHistory');
const messageList = document.querySelector('#messageList');
const welcomeState = document.querySelector('#welcomeState');
const chatForm = document.querySelector('#chatForm');
const chatInput = document.querySelector('#chatInput');
const sendButton = document.querySelector('#sendMessage');
const toast = document.querySelector('#chatToast');

let activeChatId = null;
let currentUser = null;
let toastTimer;

async function apiRequest(path, options) {
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) window.location.assign('/login');
    throw new Error(result.error || 'Request failed');
  }
  return result;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function userInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

function renderHistory(chats) {
  chatHistory.replaceChildren();
  if (!chats.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'Your conversations will appear here.';
    chatHistory.append(empty);
    return;
  }
  chats.forEach((chat) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `history-item${chat.id === activeChatId ? ' active' : ''}`;
    item.dataset.chatId = chat.id;
    const icon = document.createElement('span');
    icon.className = 'history-item-icon';
    icon.textContent = '✧';
    const title = document.createElement('span');
    title.className = 'history-item-title';
    title.textContent = chat.title;
    item.append(icon, title);
    item.addEventListener('click', () => openChat(chat.id));
    chatHistory.append(item);
  });
}

function appendMessage(message) {
  const row = document.createElement('article');
  row.className = `message-row ${message.role === 'user' ? 'user' : 'assistant'}`;
  const avatar = document.createElement('span');
  avatar.className = 'message-avatar';
  avatar.textContent = message.role === 'user' ? userInitials(currentUser?.name || 'You') : '✧';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.append(document.createTextNode(message.content));
  const meta = document.createElement('small');
  meta.className = 'message-meta';
  meta.textContent = message.role === 'user' ? 'You' : 'FitBuddy AI Coach';
  bubble.append(meta);
  row.append(avatar, bubble);
  messageList.append(row);
}

function showWelcome() {
  messageList.replaceChildren(welcomeState);
  welcomeState.hidden = false;
  document.querySelector('#welcomeName').textContent = (currentUser?.name || 'there').split(/\s+/)[0];
}

async function loadChatIndex() {
  const result = await apiRequest('/api/chats');
  currentUser = result.user;
  document.querySelector('#sidebarUserName').textContent = currentUser.name;
  document.querySelector('#sidebarUserId').textContent = `ID ${currentUser.id}`;
  document.querySelector('#sidebarAvatar').textContent = userInitials(currentUser.name);
  document.querySelector('#welcomeName').textContent = currentUser.name.split(/\s+/)[0];
  renderHistory(result.chats);
  if (result.chats.length) {
    await openChat(result.chats[0].id, result.chats);
  } else {
    const created = await apiRequest('/api/chats', { method: 'POST' });
    activeChatId = created.chat.id;
    renderHistory([{ ...created.chat, messageCount: 0 }]);
    showWelcome();
    chatInput.focus();
  }
}

async function openChat(chatId, knownChats) {
  const result = await apiRequest(`/api/chats/${encodeURIComponent(chatId)}/messages`);
  activeChatId = result.chat.id;
  renderHistory(knownChats || (await apiRequest('/api/chats')).chats);
  if (!result.chat.messages.length) {
    showWelcome();
    return;
  }
  welcomeState.hidden = true;
  messageList.replaceChildren();
  result.chat.messages.forEach(appendMessage);
  messageList.scrollTop = messageList.scrollHeight;
}

async function createNewChat() {
  try {
    const result = await apiRequest('/api/chats', { method: 'POST' });
    activeChatId = result.chat.id;
    const list = await apiRequest('/api/chats');
    renderHistory(list.chats);
    showWelcome();
    chatInput.value = '';
    chatInput.focus();
  } catch (error) {
    showToast(error.message);
  }
}

async function sendMessage(message) {
  if (!activeChatId) await createNewChat();
  if (!activeChatId) return;
  sendButton.disabled = true;
  const previousLabel = sendButton.textContent;
  sendButton.textContent = '…';
  try {
    const result = await apiRequest(`/api/chats/${encodeURIComponent(activeChatId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
    activeChatId = result.chat.id;
    welcomeState.hidden = true;
    messageList.replaceChildren();
    result.chat.messages.forEach(appendMessage);
    messageList.scrollTop = messageList.scrollHeight;
    const chats = await apiRequest('/api/chats');
    renderHistory(chats.chats);
  } catch (error) {
    chatInput.value = chatInput.value || message;
    showToast(error.message);
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = previousLabel;
    chatInput.focus();
  }
}

document.querySelector('#newChat').addEventListener('click', createNewChat);

document.querySelectorAll('.prompt-card').forEach((button) => {
  button.addEventListener('click', () => {
    chatInput.value = button.dataset.prompt;
    chatInput.focus();
    chatInput.form.requestSubmit();
  });
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  chatInput.value = '';
  sendMessage(message);
});

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

document.querySelector('#logout').addEventListener('click', async () => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  } catch (error) {
    showToast(error.message);
  }
});

loadChatIndex().catch((error) => showToast(error.message));
