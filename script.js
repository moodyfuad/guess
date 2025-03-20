// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnuIfrwNSMRBkj8DqEunFrui03P81snOA",
  authDomain: "guess-project-4ab53.firebaseapp.com",
  projectId: "guess-project-4ab53",
  storageBucket: "guess-project-4ab53.appspot.com",
  messagingSenderId: "227786408158",
  appId: "1:227786408158:web:0ee64f9f675d6daeb0824f",
  measurementId: "G-7RNKPPJ7H2"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentRoom;
let currentUser = { id: Date.now().toString() };
const categories = {
  'مشاهير': [
      { name: "عمرو دياب", image: "https://via.placeholder.com/150/FF0000/FFFFFF?text=Amr+Diab" },
      { name: "نيللي كريم", image: "https://via.placeholder.com/150/00FF00/FFFFFF?text=Nelly+Karam" },
      { name: "أحمد حلمي", image: "https://via.placeholder.com/150/0000FF/FFFFFF?text=Ahmed+Helmy" }
  ],
  'أطعمة': [
      { name: "كبسة", image: "https://via.placeholder.com/150/FFA500/FFFFFF?text=Kabsa" },
      { name: "شاورما", image: "https://via.placeholder.com/150/800080/FFFFFF?text=Shawarma" },
      { name: "كنافة", image: "https://via.placeholder.com/150/FFFF00/000000?text=Kunafa" }
  ]
};

async function joinRoom() {
  try {
      showLoading(true);
      const roomId = document.getElementById('roomId').value.trim();
      if (!roomId) throw new Error('يجب إدخال كود الغرفة');

      currentRoom = database.ref(`rooms/${roomId}`);
      const snapshot = await currentRoom.once('value');
      
      if (!snapshot.exists()) {
          await currentRoom.set({
              players: {},
              state: 'waiting',
              category: 'مشاهير'
          });
      }

      await currentRoom.child('players').child(currentUser.id).set({
          name: `Player ${Math.floor(Math.random() * 100)}`,
          ready: false,
          selection: null
      });

      setupRoomListeners();
      showGameScreen();
  } catch (error) {
      showError('lobbyError', error.message);
  } finally {
      showLoading(false);
  }
}

function setupRoomListeners() {
  currentRoom.child('players').on('value', snapshot => {
      const players = snapshot.val() || {};
      document.getElementById('playerCount').textContent = 
          `اللاعبون: ${Object.keys(players).length}/2`;
      
      if (Object.keys(players).length === 2) {
          startGame();
      }
  });
}

function startGame() {
  document.getElementById('gameBoard').classList.remove('hidden');
  loadGameItems();
}

function loadGameItems() {
  const category = 'مشاهير'; // Default category
  const items = categories[category];
  
  const container = document.getElementById('itemsContainer');
  container.innerHTML = items.map(item => `
      <div class="card" onclick="selectItem('${item.name}')">
          <img src="${item.image}" alt="${item.name}">
          <p>${item.name}</p>
      </div>
  `).join('');
}

function selectItem(itemName) {
  currentRoom.child(`players/${currentUser.id}/selection`).set(itemName);
  document.getElementById('chat').classList.remove('hidden');
}

async function submitGuess() {
  const guess = document.getElementById('guessInput').value.trim().toLowerCase();
  const players = (await currentRoom.child('players').once('value')).val();
  const opponentId = Object.keys(players).find(id => id !== currentUser.id);
  const opponentSelection = players[opponentId].selection.toLowerCase();

  if (guess === opponentSelection) {
      alert('!مبروك، لقد فزت');
      currentRoom.update({ state: 'finished' });
  } else {
      alert('!تخمين خاطئ، حاول مرة أخرى');
  }
}

// Utility functions
function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

function showError(elementId, message) {
  const errorEl = document.getElementById(elementId);
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function showGameScreen() {
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
}