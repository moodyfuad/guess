// إعداد Gun.js (لن تحتاج إلى إعداد إضافي)
const gun = Gun();

// تعريف مسار اللعبة (يمكن اعتبار "rooms" قاعدة بياناتنا)
const gameDB = gun.get('rooms');

// الحالة العامة للعبة
let gameState = {
  room: null,
  player: null,   // "player1" أو "player2"
  category: "",
  selectionName: "",
  imageUrl: "",
  question: "",
  guess: "",
  opponent: {}    // بيانات الخصم
};

const container = document.getElementById("game-container");

// دالة لتحديث المحتوى داخل الحاوية
function render(html) {
  container.innerHTML = html;
}

// المرحلة الأولى: دخول رقم الغرفة
function renderRoomScreen() {
  render(`
    <h1>أدخل كلمة مرور الغرفة</h1>
    <div class="center">
      <input type="text" id="room-input" placeholder="مثلاً: 12345">
      <button id="room-btn">دخول الغرفة</button>
    </div>
  `);
  document.getElementById("room-btn").addEventListener("click", () => {
    const roomPass = document.getElementById("room-input").value.trim();
    if (roomPass === "") return;
    joinRoom(roomPass);
  });
}

// الانضمام إلى غرفة أو إنشاء غرفة جديدة
function joinRoom(roomPass) {
  gameState.room = roomPass;
  const roomRef = gameDB.get(roomPass);

  // قراءة بيانات الغرفة
  roomRef.once((data) => {
    if (!data) {
      // إنشاء غرفة جديدة وتعيين اللاعب1
      roomRef.put({ player1: null, player2: null });
      gameState.player = "player1";
      roomRef.get("player1").put({ uid: Gun.text.random() });
    } else {
      // إذا كان player1 موجود، قم بتعيين اللاعب الثاني
      if (!data.player1) {
        gameState.player = "player1";
        roomRef.get("player1").put({ uid: Gun.text.random() });
      } else if (!data.player2) {
        gameState.player = "player2";
        roomRef.get("player2").put({ uid: Gun.text.random() });
      } else {
        alert("الغرفة ممتلئة!");
        return;
      }
    }
    listenRoomChanges();
    renderSetupScreen();
  });
}

// الاستماع للتغييرات في بيانات الغرفة
function listenRoomChanges() {
  const roomRef = gameDB.get(gameState.room);
  roomRef.map().on((data, key) => {
    if (key === gameState.player) return; // تجاهل بيانات اللاعب الحالي
    gameState.opponent = data || {};
    // إذا تم اختيار الصورة، السؤال والتخمين من الخصم، انتقل للمراحل المناسبة
    if (gameState.opponent.imageUrl) {
      console.log("تم اختيار صورة الخصم");
    }
    if (gameState.opponent.guess) {
      checkResults();
    }
  });
}

// المرحلة الثانية: إعداد اللعبة (إدخال الفئة واسم الاختيار)
function renderSetupScreen() {
  render(`
    <h1>إعداد اللعبة</h1>
    <div class="center">
      <input type="text" id="category-input" placeholder="أدخل الفئة (طعام، ممثل، معدات مطبخ...)" >
      <input type="text" id="selectionName-input" placeholder="أدخل اسم اختيارك">
      <button id="setup-btn">متابعة</button>
    </div>
  `);
  document.getElementById("setup-btn").addEventListener("click", () => {
    const category = document.getElementById("category-input").value.trim();
    const selName = document.getElementById("selectionName-input").value.trim();
    if (category === "" || selName === "") return;
    gameState.category = category;
    gameState.selectionName = selName;
    renderSelectionScreen();
  });
}

// المرحلة الثالثة: اختيار الصورة من ثلاث خيارات (باستخدام Unsplash)
function renderSelectionScreen() {
  render(`<h1>اختر صورتك</h1><div class="flex-container" id="images-container"></div>`);
  const containerDiv = document.getElementById("images-container");
  for (let i = 0; i < 3; i++) {
    // استخدام Unsplash لجلب صورة بناءً على الفئة مع إضافة معامل عشوائي للحصول على صور مختلفة
    const imgUrl = `https://source.unsplash.com/200x200/?${encodeURIComponent(gameState.category)}&sig=${Math.random()}`;
    const card = document.createElement("div");
    card.className = "image-card";
    card.innerHTML = `<img src="${imgUrl}" alt="خيار الصورة ${i+1}">`;
    card.addEventListener("click", () => selectImage(imgUrl));
    containerDiv.appendChild(card);
  }
}

// عند اختيار الصورة، حفظ بيانات الاختيار في قاعدة البيانات
function selectImage(imgUrl) {
  gameState.imageUrl = imgUrl;
  const roomRef = gameDB.get(gameState.room);
  roomRef.get(gameState.player).put({
    category: gameState.category,
    selectionName: gameState.selectionName,
    imageUrl: imgUrl
  });
  renderWaitingSelection();
}

// الانتظار حتى يختار الخصم صورته
function renderWaitingSelection() {
  render(`<h1>انتظر حتى يكمل الخصم اختياره...</h1>`);
  // ننتظر حتى تظهر بيانات صورة الخصم (يتم مراقبتها بواسطة listenRoomChanges)
  const interval = setInterval(() => {
    if (gameState.opponent && gameState.opponent.imageUrl) {
      clearInterval(interval);
      renderQuestionScreen();
    }
  }, 1000);
}

// المرحلة الرابعة: كل لاعب يكتب سؤالاً موجهًا للاعب الخصم
function renderQuestionScreen() {
  render(`
    <h1>أدخل سؤالك للاعب الخصم</h1>
    <div class="center">
      <p>صورتك:</p>
      <img src="${gameState.imageUrl}" width="150" height="150" style="border-radius:8px;">
      <p><strong>${gameState.selectionName}</strong></p>
      <input type="text" id="question-input" placeholder="اكتب سؤالك">
      <button id="question-btn">إرسال السؤال</button>
    </div>
  `);
  document.getElementById("question-btn").addEventListener("click", () => {
    const question = document.getElementById("question-input").value.trim();
    if (question === "") return;
    gameState.question = question;
    const roomRef = gameDB.get(gameState.room);
    roomRef.get(gameState.player).put({ question: question });
    renderWaitingQuestion();
  });
}

// الانتظار حتى يُرسل الخصم السؤال
function renderWaitingQuestion() {
  render(`<h1>انتظر حتى يرسل الخصم سؤاله...</h1>`);
  const interval = setInterval(() => {
    if (gameState.opponent && gameState.opponent.question) {
      clearInterval(interval);
      renderGuessScreen();
    }
  }, 1000);
}

// المرحلة الخامسة: كل لاعب يشاهد سؤال الخصم ويدخل تخمينه لاسم اختيار الخصم
function renderGuessScreen() {
  render(`
    <h1>أدخل تخمينك لاسم اختيار الخصم</h1>
    <div class="center">
      <p>سؤال الخصم: <strong>${gameState.opponent.question}</strong></p>
      <input type="text" id="guess-input" placeholder="اكتب تخمينك">
      <button id="guess-btn">إرسال التخمين</button>
    </div>
  `);
  document.getElementById("guess-btn").addEventListener("click", () => {
    const guess = document.getElementById("guess-input").value.trim();
    if (guess === "") return;
    gameState.guess = guess;
    const roomRef = gameDB.get(gameState.room);
    roomRef.get(gameState.player).put({ guess: guess });
    renderWaitingGuess();
  });
}

// الانتظار حتى يُرسل الخصم تخمينه، ثم التحقق من النتيجة
function renderWaitingGuess() {
  render(`<h1>انتظر حتى يُرسل الخصم تخمينه...</h1>`);
  const interval = setInterval(() => {
    if (gameState.opponent && gameState.opponent.guess) {
      clearInterval(interval);
      checkResults();
    }
  }, 1000);
}

// التحقق من النتائج: من يخمن بشكل صحيح يفوز
function checkResults() {
  const myGuess = gameState.guess.trim().toLowerCase();
  const oppGuess = (gameState.opponent.guess || "").trim().toLowerCase();
  const mySelection = gameState.selectionName.trim().toLowerCase();
  const oppSelection = (gameState.opponent.selectionName || "").trim().toLowerCase();

  let result = "";
  if (myGuess === oppSelection && oppGuess !== mySelection) {
    result = "أنت الفائز!";
  } else if (oppGuess === mySelection && myGuess !== oppSelection) {
    result = "الخصم هو الفائز!";
  } else if (myGuess === oppSelection && oppGuess === mySelection) {
    result = "تعادل: كلاكما أخطأ/أجاب صحيح معاً!";
  } else {
    result = "لم يخمن أحد بشكل صحيح!";
  }
  renderResult(result);
}

// عرض النتائج مع تفاصيل الاختيارات والتخمينات
function renderResult(resultText) {
  const roomRef = gameDB.get(gameState.room);
  // عرض النتائج
  render(`
    <h1>النتيجة</h1>
    <div class="flex-container">
      <div class="center">
        <h2>أنت</h2>
        <img src="${gameState.imageUrl}" width="150" height="150" style="border-radius:8px;">
        <p>اختيارك: ${gameState.selectionName}</p>
        <p>تخمينك: ${gameState.guess}</p>
      </div>
      <div class="center">
        <h2>الخصم</h2>
        <img src="${gameState.opponent.imageUrl || 'https://via.placeholder.com/150'}" width="150" height="150" style="border-radius:8px;">
        <p>اختياره: ${gameState.opponent.selectionName || "غير متوفر"}</p>
        <p>تخمينه: ${gameState.opponent.guess || "غير متوفر"}</p>
      </div>
    </div>
    <h2>${resultText}</h2>
    <div class="center"><button id="restart-btn">إعادة اللعب</button></div>
  `);
  document.getElementById("restart-btn").addEventListener("click", () => {
    // إعادة ضبط بيانات اللاعب في الغرفة لإعادة اللعبة
    roomRef.get(gameState.player).put({
      category: "",
      selectionName: "",
      imageUrl: "",
      question: "",
      guess: ""
    });
    // إعادة تعيين حالة اللعبة محليًا
    gameState.category = "";
    gameState.selectionName = "";
    gameState.imageUrl = "";
    gameState.question = "";
    gameState.guess = "";
    renderSetupScreen();
  });
}

// بدء اللعبة بعرض شاشة إدخال كلمة مرور الغرفة
renderRoomScreen();
