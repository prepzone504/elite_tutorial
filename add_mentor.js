const fs = require('fs');
const path = require('path');

const cssPath = 'public/module/dashboard/dashboard.css';
let css = fs.readFileSync(cssPath, 'utf8');

if (!css.includes('.mentor-overlay')) {
  css += `
/* =========================================
   MENTOR DOPAMINE
========================================= */
.mentor-overlay {
  position: fixed;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  padding: 16px 20px;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.4);
  width: 90%;
  max-width: 450px;
  opacity: 0;
  transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.mentor-overlay.visible {
  top: 20px;
  opacity: 1;
}

.mentor-avatar {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  border: 3px solid #60a5fa;
  object-fit: cover;
  box-shadow: 0 4px 15px rgba(37,99,235,0.2);
  flex-shrink: 0;
  animation: floatAvatar 3s ease-in-out infinite;
  background: #fff;
}

@keyframes floatAvatar {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.mentor-bubble {
  position: relative;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 16px;
  border-top-left-radius: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  color: #1e293b;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  flex-grow: 1;
}

.mentor-bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: -8px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 8px 10px 0;
  border-color: transparent #f8fafc transparent transparent;
}

.mentor-text {
  display: inline;
}

.mentor-cursor {
  display: inline-block;
  width: 6px;
  height: 1.1em;
  background-color: #60a5fa;
  vertical-align: middle;
  margin-left: 2px;
  animation: blinkCursor 0.8s infinite;
}

@keyframes blinkCursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
`;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Added Mentor CSS.');
}

// Update HTML
const htmlPath = 'public/module/dashboard/dashboard.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove mokeyz - replace welcome-illustration content with nothing, just to clean it out 
// OR just leave rings but remove emoji. The user said "remove mokeyz" maybe meaning the illus-emoji which might have been a monkey before?
html = html.replace('<div class="illus-emoji">🎓</div>', '');
// If there was something else called mokeyz:
html = html.replace(/mokeyz/gi, '');

if (!html.includes('mentor-overlay')) {
  const mentorHtml = `
  <!-- Mentor Dopamine Overlay -->
  <div id="mentor-overlay" class="mentor-overlay">
    <img id="mentor-avatar" class="mentor-avatar" src="../../assets/imo_images/imo_idle.png" alt="Mentor Dopamine">
    <div class="mentor-bubble">
      <span id="mentor-text" class="mentor-text"></span><span id="mentor-cursor" class="mentor-cursor"></span>
    </div>
  </div>
`;

  // Insert right after <body>
  html = html.replace('<body>', '<body>\n' + mentorHtml);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Added Mentor HTML.');
}

// Update JS
const jsPath = 'public/module/dashboard/dashboard.js';
let js = fs.readFileSync(jsPath, 'utf8');

if (!js.includes('initMentorDopamine')) {
  const mentorJs = `
  /* ─────────────────────────────────────────
     MENTOR DOPAMINE
  ───────────────────────────────────────── */
  function initMentorDopamine() {
    const overlay = document.getElementById('mentor-overlay');
    const avatar = document.getElementById('mentor-avatar');
    const textEl = document.getElementById('mentor-text');
    const cursor = document.getElementById('mentor-cursor');

    if (!overlay || !avatar || !textEl) return;

    let count = parseInt(localStorage.getItem('mentor_dashboard_count') || '0', 10);
    count++;
    localStorage.setItem('mentor_dashboard_count', count.toString());

    // Show on first visit or every 5th visit
    if (count === 1 || count % 5 === 0) {
      const quotes = [
        "I am Mentor Dopamine, I will guide you towards your exam, your success is our success.",
        "Keep pushing forward! Every study session brings you closer to your goals.",
        "Believe in yourself! You have the power to ace this exam.",
        "Stay focused and stay positive. You've got this!",
        "Small steps every day lead to big results. Keep studying!",
        "Your dedication today will be your success tomorrow.",
        "Don't stop when you're tired, stop when you're done."
      ];

      // Use intro quote on first visit, or random later
      const msg = count === 1 ? quotes[0] : quotes[Math.floor(Math.random() * quotes.length)];

      setTimeout(() => {
        overlay.classList.add('visible');
        avatar.src = "../../assets/imo_images/imo_talking.png";
        
        let i = 0;
        textEl.textContent = "";
        cursor.style.display = 'inline-block';

        const typeInterval = setInterval(() => {
          textEl.textContent += msg.charAt(i);
          i++;
          if (i >= msg.length) {
            clearInterval(typeInterval);
            avatar.src = "../../assets/imo_images/imo_idle.png";
            cursor.style.display = 'none';

            // Disappear after 3 seconds
            setTimeout(() => {
              overlay.classList.remove('visible');
            }, 3000);
          }
        }, 45);

      }, 800); // Slight delay after load for smoothness
    }
  }

  initMentorDopamine();
`;

  // Insert right after DOMContentLoaded
  js = js.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n" + mentorJs);
  fs.writeFileSync(jsPath, js, 'utf8');
  console.log('Added Mentor JS.');
}

console.log('Done.');
