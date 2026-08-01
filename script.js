let QUIZ_DATA_SETS = {};

        // --- REWARD SYSTEM DATA & LOGIC ---
        const phrases = {
            tier1: ["Khá lắm!", "Tốt!", "Chính xác!", "Hay lắm!"],
            tier2: ["Tuyệt vời!", "Quá đỉnh!", "Phong độ lắm!", "Siêu!"],
            tier3: ["Không thể tin nổi!", "Bạn là thiên tài!", "Xuất sắc!", "Đỉnh cao!"],
            tier4: ["THẦN THÁNH!", "VÔ ĐỐI!", "TUYỆT ĐỐI!", "BẤT BẠI!"]
        };

        const wrongPhrases = {
            tier1: ["Tiếc quá!", "Suýt đúng!", "Cẩn thận nhé!", "Sai rồi!"], 
            tier2: ["Đừng nản!", "Bình tĩnh nào!", "Hít thở sâu!", "Cố lên bạn ơi!"], 
            tier3: ["Thất bại là mẹ thành công!", "Không được bỏ cuộc!", "Vững tin lên!", "Cơ hội vẫn còn!"] 
        };

        function getRandomPhrase(array) {
            return array[Math.floor(Math.random() * array.length)];
        }

        
                const backgroundMusic = null;
                const correctAnswerSound = new Audio('./sounds/correct.mp3');
                const incorrectAnswerSound = new Audio('./sounds/incorrect.mp3');
            
        const ICONS = {
            volumeOn: '<svg viewBox="0 0 24 24"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"></path></svg>',
            volumeOff: '<svg viewBox="0 0 24 24"><path d="M12,4L7,9H3V15H7L12,20V4M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,13.91 18.1,15.61 16.8,16.8L14,14V7.97C15.5,8.71 16.5,10.23 16.5,12C16.5,12.33 16.44,12.65 16.34,12.94L14.38,10.98L14,10.61V3.23Z M21.46,23.96L19.7,22.2C18.3,23.32 16.55,24 14.75,24C10.75,24 7.15,21.81 4.55,19.21L2.48,17.14L3.9,15.73L21.46,23.96Z"></path></svg>'
        };

        let appState = { 
            currentUser: '', playerID: '', currentQuiz: [], quizTopic: '', originalQuizOrder: [], 
            currentQuestionIndex: 0, score: 0, isShuffled: false, userAnswers: [], trueFalseAnswers: {}, isQuizStarted: false, 
            quizStartTime: null, currentScreen: null, shuffledQuizMap: [], shuffledOptionsMap: [], 
            feedbackTimeoutId: null,
            isMasterMuted: false, isMusicMuted: false, isCorrectSoundMuted: false, isIncorrectSoundMuted: false,
            isAutoAdvanceEnabled: false,
            combo: 0, wrongCount: 0, borderTimeout: null
        };

        // --- MODULE HISTORY SYSTEM ---
        const HistoryManager = {
            getKey() { return 'quiz_history_' + appState.currentUser; },
            getHistory() {
                try {
                    return JSON.parse(localStorage.getItem(this.getKey()) || '[]');
                } catch(e) { return []; }
            },
            saveHistory(historyItem) {
                let history = this.getHistory();
                history.unshift(historyItem); // Lên đầu danh sách
                if (history.length > 10) history = history.slice(0, 10); // Tối đa 10 bài
                localStorage.setItem(this.getKey(), JSON.stringify(history));
            },
            deleteHistory(id) {
                let history = this.getHistory();
                history = history.filter(item => item.id !== id);
                localStorage.setItem(this.getKey(), JSON.stringify(history));
                renderHistoryScreen();
            }
        };

        // --- MODULE AUTO SAVE/RESUME ---
        const ResumeManager = {
            getKey() { return 'quiz_resume_' + appState.currentUser; },
            saveState() {
                if (!appState.isQuizStarted) return;
                const state = {
                    quizTopic: appState.quizTopic,
                    originalQuizOrder: appState.originalQuizOrder,
                    currentQuiz: appState.currentQuiz,
                    shuffledQuizMap: appState.shuffledQuizMap,
                    shuffledOptionsMap: appState.shuffledOptionsMap,
                    currentQuestionIndex: appState.currentQuestionIndex,
                    userAnswers: appState.userAnswers,
                    trueFalseAnswers: appState.trueFalseAnswers,
                    score: appState.score,
                    isShuffled: appState.isShuffled,
                    combo: appState.combo,
                    wrongCount: appState.wrongCount
                };
                localStorage.setItem(this.getKey(), JSON.stringify(state));
            },
            clearState() {
                localStorage.removeItem(this.getKey());
            },
            checkAndPrompt() {
                const saved = localStorage.getItem(this.getKey());
                if (saved) {
                    document.getElementById('resume-modal').style.display = 'block';
                } else {
                    showScreen('home-screen');
                }
            }
        };

        function resumeQuiz() {
            try {
                const saved = JSON.parse(localStorage.getItem(ResumeManager.getKey()));
                Object.assign(appState, saved);
                appState.isQuizStarted = true;
                
                document.getElementById('resume-modal').style.display = 'none';
                showScreen('quiz-section');
                document.getElementById('quiz-title').textContent = appState.quizTopic;
                document.getElementById('results-container').style.display = 'none';
                document.getElementById('quiz-controls').style.display = 'block';
                document.getElementById('submit-early-btn').style.display = 'inline-block';
                document.getElementById('exit-btn').style.display = 'inline-block';
                document.getElementById('fixed-action-bar').style.display = 'flex';
                document.querySelector('.container').classList.add('pb-safe');
                
                renderProgressBar();
                updateProgressBar();
                syncSettingsUI(); 
                controlBackgroundMusic();
                displayQuestion();
            } catch (e) {
                console.error("Lỗi khi resume data", e);
                discardResume();
            }
        }

        function discardResume() {
            ResumeManager.clearState();
            document.getElementById('resume-modal').style.display = 'none';
            showScreen('home-screen');
        }

        function exitAndClearState() {
            ResumeManager.clearState();
            showScreen('home-screen');
        }

        
function flattenQuizData(nestedQuestions) {
    const flat = [];
    function traverse(nodes, parentGroupId) {
        for (const node of nodes) {
            if (node.type === 'n' && node.subQuestions) {
                if (!node.passage && node.materials && node.materials.length > 0) {
                    node.passage = node.materials.map(m => m.content).join('\n\n');
                }
                const runtimeGroupId = parentGroupId || node.id || 'groupId-' + Date.now();
                node.subQuestions.forEach(child => {
                    if (!child.passage) child.passage = node.passage;
                    child.groupId = runtimeGroupId;
                    child.section = child.section || node.section;
                });
                traverse(node.subQuestions, runtimeGroupId);
            } else {
                if (node.options && (!node.lua_chon || node.lua_chon.length === 0)) {
                    node.lua_chon = node.options.map(opt => {
                        const isCorrect = node.correctAnswers && node.correctAnswers.includes(opt.id);
                        return isCorrect ? '*' + opt.content : opt.content;
                    });
                }
                if (node.correctAnswers && (!node.dap_an_dung || node.dap_an_dung.length === 0)) {
                    node.dap_an_dung = node.options ? node.options.filter(o => node.correctAnswers.includes(o.id)).map(o => o.content) : [];
                }
                flat.push(node);
            }
        }
    }
    traverse(nestedQuestions);
    return flat;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('data.json');
        if (!res.ok) throw new Error('Cannot load data');
        const rawData = await res.json();
        for(const k in rawData) {
            QUIZ_DATA_SETS[k] = flattenQuizData(rawData[k]);
        }
        if (typeof populateQuizSelector === 'function') populateQuizSelector();
    } catch(e) {
        alert('Lỗi tải data.json! Nếu chạy trực tiếp trên máy tính, vui lòng dùng Live Server để vượt CORS.');
        console.error(e);
        return;
    }
 
            initEventListeners(); 
            checkLogin(); 
        });
        
        function checkLogin() { 
            const savedUser = localStorage.getItem('quizAppUser'); 
            if (savedUser) { 
                appState.currentUser = savedUser; 
                document.getElementById('user-greeting').textContent = `Xin chào, ${appState.currentUser}!`; 
                ResumeManager.checkAndPrompt(); // Thay vì show màn home thẳng
            } else { 
                showScreen('login-screen'); 
            } 
        }
        
        function initEventListeners() {
            document.getElementById('login-btn').addEventListener('click', () => { 
                const username = document.getElementById('username-input').value.trim(); 
                if (username) { 
                    appState.currentUser = username; 
                    localStorage.setItem('quizAppUser', username); 
                    document.getElementById('user-greeting').textContent = `Xin chào, ${appState.currentUser}!`; 
                    ResumeManager.checkAndPrompt();
                } else { 
                    alert('Vui lòng nhập tên của bạn.'); 
                } 
            });
            document.getElementById('menu-shuffle-btn').addEventListener('click', toggleShuffle);

            const settingsIcon = document.getElementById('settings-icon-container');
            const settingsPanel = document.getElementById('settings-panel');
            const masterVolumeBtn = document.getElementById('master-volume-btn');
            let isLongPress = false;
            let pressTimer;

            settingsIcon.addEventListener('click', () => {
                settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
            });

            const handleMasterVolumeClick = () => {
                appState.isMasterMuted = !appState.isMasterMuted;
                appState.isMusicMuted = appState.isMasterMuted;
                appState.isCorrectSoundMuted = appState.isMasterMuted;
                appState.isIncorrectSoundMuted = appState.isMasterMuted;
                syncSettingsUI();
                controlBackgroundMusic();
            };

            masterVolumeBtn.addEventListener('mousedown', () => { isLongPress = false; pressTimer = setTimeout(() => { isLongPress = true; document.getElementById('detailed-audio-settings').style.display = 'block'; }, 500); });
            masterVolumeBtn.addEventListener('mouseup', () => { clearTimeout(pressTimer); if (!isLongPress) handleMasterVolumeClick(); });
            masterVolumeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); isLongPress = false; pressTimer = setTimeout(() => { isLongPress = true; document.getElementById('detailed-audio-settings').style.display = 'block'; }, 500); });
            masterVolumeBtn.addEventListener('touchend', (e) => { e.preventDefault(); clearTimeout(pressTimer); if (!isLongPress) handleMasterVolumeClick(); });

            document.getElementById('music-toggle').addEventListener('change', (e) => { appState.isMusicMuted = !e.target.checked; controlBackgroundMusic(); syncSettingsUI(); });
            document.getElementById('correct-sound-toggle').addEventListener('change', (e) => { appState.isCorrectSoundMuted = !e.target.checked; syncSettingsUI(); });
            document.getElementById('incorrect-sound-toggle').addEventListener('change', (e) => { appState.isIncorrectSoundMuted = !e.target.checked; syncSettingsUI(); });
            document.getElementById('auto-advance-toggle').addEventListener('change', (e) => { appState.isAutoAdvanceEnabled = e.target.checked; });
        }

        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
            appState.currentScreen = screenId;
            
            const settingsIcon = document.getElementById('settings-icon-container');
            if (screenId === 'quiz-section') {
                settingsIcon.style.display = 'block';
            } else {
                settingsIcon.style.display = 'none';
                document.getElementById('settings-panel').style.display = 'none';
            }
            
            if (screenId !== 'quiz-section') {
                document.getElementById('fixed-action-bar').style.display = 'none';
                document.querySelector('.container').classList.remove('pb-safe');
                resetEffects(); 
            }
        }
        
        // --- HISTORY RENDER LOGIC ---
        function showHistoryScreen() {
            renderHistoryScreen();
            showScreen('history-screen');
        }

        function renderHistoryScreen() {
            const container = document.getElementById('history-list-container');
            const history = HistoryManager.getHistory();
            
            if (history.length === 0) {
                container.innerHTML = '<div class="no-history">Chưa có dữ liệu làm bài.</div>';
                return;
            }

            container.innerHTML = history.map(item => {
                const dateObj = new Date(item.date);
                const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const dateString = dateObj.toLocaleDateString('vi-VN');
                
                const pctCorrect = item.total ? Math.round((item.correct / item.total) * 100) : 0;
                const pctWrong = item.total ? Math.round((item.wrong / item.total) * 100) : 0;
                const pctSkipped = 100 - pctCorrect - pctWrong;
                
                return `
                <div class="history-item">
                    <div class="history-header">
                        <span>${timeString} - ${dateString}</span>
                        <span>
                            <span style="color: var(--success-color);">Đúng: ${pctCorrect}%</span> | 
                            <span style="color: var(--danger-color);">Sai: ${pctWrong}%</span>
                        </span>
                    </div>
                    <div style="font-weight: bold; color: var(--primary-color); margin-bottom: 10px;">
                        ${item.topic}
                    </div>
                    
                    <div class="history-stats">
                        <span style="color: var(--success-color);">✓ Đúng: ${item.correct}</span>
                        <span style="color: var(--danger-color);">✗ Sai: ${item.wrong}</span>
                        <span style="color: #888;">◯ Chưa làm: ${item.skipped}</span>
                    </div>
                    
                    <div class="history-bar">
                        <div class="h-bar-green" style="width: ${pctCorrect}%"></div>
                        <div class="h-bar-red" style="width: ${pctWrong}%"></div>
                        <div class="h-bar-gray" style="width: ${pctSkipped}%"></div>
                    </div>
                    
                    <div class="history-actions">
                        <button class="btn-h-retry-wrong" onclick="retryHistoryWrong(${item.id})">Làm lại câu sai</button>
                        <button class="btn-h-retry-all" onclick="retryHistoryAll(${item.id})">Làm lại toàn bộ</button>
                        <button class="btn-h-delete" onclick="HistoryManager.deleteHistory(${item.id})" title="Xóa">Xóa</button>
                    </div>
                </div>
                `;
            }).join('');
        }

        function retryHistoryWrong(id) {
            const item = HistoryManager.getHistory().find(i => i.id === id);
            if (!item || item.wrongQuestions.length === 0) {
                alert('Không có câu sai nào trong bài này để làm lại!');
                return;
            }
            startQuizSubset(item.topic + ' (Làm lại câu sai)', 'Câu sai', item.wrongQuestions);
        }

        function retryHistoryAll(id) {
            const item = HistoryManager.getHistory().find(i => i.id === id);
            if (!item) return;
            // Topic được lưu dưới dạng "Topic - Subset". Ta bóc tách ra.
            const parts = item.topic.split(' - ');
            const baseTopic = parts[0];
            const subsetLabel = parts.slice(1).join(' - ') || 'Toàn bộ';
            startQuizSubset(baseTopic, subsetLabel, item.quizData);
        }

        function populateQuizSelector() {
            const selector = document.getElementById('quiz-part-selector');
            if(!selector) return;
            const container = document.getElementById('quiz-part-selector-container');
            const keys = Object.keys(QUIZ_DATA_SETS);
            
            if (keys.length > 1) {
                if(container) container.style.display = 'block';
                selector.innerHTML = '';
                keys.forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = key;
                    selector.appendChild(opt);
                });
            } else {
                if (container) container.style.display = 'none';
            }

            renderSubOptions();
        }

        function toggleChunksList() {
            const body = document.getElementById('chunks-body');
            const icon = document.getElementById('chunks-collapse-icon');
            if(body.style.display === 'none') {
                body.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                body.style.display = 'none';
                icon.style.transform = 'none';
            }
        }

        function renderSubOptions() {
            const selector = document.getElementById('quiz-part-selector');
            let selectedTopic = Object.keys(QUIZ_DATA_SETS)[0]; 
            if (selector && selector.options.length > 0) {
                selectedTopic = selector.value;
            }
            const quizData = QUIZ_DATA_SETS[selectedTopic]; 
            if (!quizData) return;

            const sectionsList = document.getElementById('sections-list');
            if (sectionsList) {
                sectionsList.innerHTML = '';
                
                const btnAll = document.createElement('button');
                btnAll.className = 'btn';
                btnAll.style.backgroundColor = 'var(--success-color)';
                btnAll.textContent = 'Bắt Đầu (Toàn Bộ)';
                btnAll.onclick = () => startQuizSubset(selectedTopic, 'Toàn Bộ', quizData);
                sectionsList.appendChild(btnAll);

                const sections = [...new Set(quizData.map(q => q.section).filter(Boolean))];
                sections.forEach(secName => {
                    const secData = quizData.filter(q => q.section === secName);
                    if (secData.length > 0) {
                        const btnSec = document.createElement('button');
                        btnSec.className = 'btn';
                        btnSec.style.backgroundColor = 'var(--primary-color)';
                        btnSec.textContent = 'Bắt Đầu: ' + secName + ' (' + secData.length + ' câu)';
                        btnSec.onclick = () => startQuizSubset(selectedTopic, secName, secData);
                        sectionsList.appendChild(btnSec);
                    }
                });
            }

            renderChunksList(quizData, selectedTopic);
        }

        let lastValidChunkSize = 20;

        function renderChunksList(quizData, selectedTopic) {
            const chunksList = document.getElementById('chunks-list');
            const chunkSizeInput = document.getElementById('chunk-size-input');
            if (!chunksList || !chunkSizeInput) return;

            let chunkSize = parseInt(chunkSizeInput.value, 10);
            if (isNaN(chunkSize) || chunkSize <= 0) {
                chunkSize = lastValidChunkSize;
            } else {
                lastValidChunkSize = chunkSize;
            }

            chunksList.innerHTML = '';
            const totalQuestions = quizData.length;
            let start = 0;
            
            while (start < totalQuestions) {
                const end = Math.min(start + chunkSize, totalQuestions);
                const chunkData = quizData.slice(start, end);
                
                const btnChunk = document.createElement('button');
                btnChunk.className = 'btn btn-secondary';
                btnChunk.style.padding = '8px';
                btnChunk.style.fontSize = '14px';
                btnChunk.textContent = 'Câu ' + (start + 1) + ' - ' + end;
                
                const label = 'Câu ' + (start + 1) + ' - ' + end;
                btnChunk.onclick = () => startQuizSubset(selectedTopic, label, chunkData);
                chunksList.appendChild(btnChunk);
                
                start += chunkSize;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const sizeInput = document.getElementById('chunk-size-input');
            if (sizeInput) {
                const handleUpdate = () => {
                    const parsed = parseInt(sizeInput.value, 10);
                    if (isNaN(parsed) || parsed <= 0) {
                        alert('Không phải số hợp lệ!');
                        sizeInput.value = lastValidChunkSize;
                    } else {
                        lastValidChunkSize = parsed;
                    }
                    
                    const selector = document.getElementById('quiz-part-selector');
                    let selectedTopic = Object.keys(QUIZ_DATA_SETS)[0]; 
                    if (selector && selector.options.length > 0) {
                        selectedTopic = selector.value;
                    }
                    const quizData = QUIZ_DATA_SETS[selectedTopic];
                    if (quizData) {
                        renderChunksList(quizData, selectedTopic);
                    }
                };

                sizeInput.addEventListener('change', handleUpdate);
                sizeInput.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') handleUpdate();
                });
            }
        });

        function startQuizSubset(baseTopic, subsetLabel, subsetData) {
            appState.quizTopic = baseTopic + ' - ' + subsetLabel;
            appState.originalQuizOrder = JSON.parse(JSON.stringify(subsetData)); 
            showScreen('quiz-section'); 
            document.getElementById('quiz-title').textContent = appState.quizTopic; 
            startQuiz(); 
        }

        function startQuizFromMenu() {
            const selector = document.getElementById('quiz-part-selector');
            let selectedTopic = Object.keys(QUIZ_DATA_SETS)[0]; 
            if (selector && selector.options.length > 0) {
                selectedTopic = selector.value;
            }
            startQuizSubset(selectedTopic, 'Toàn Bộ', QUIZ_DATA_SETS[selectedTopic]);
        }
        
        function startQuiz() {
            appState.score = 0; appState.currentQuestionIndex = 0; appState.userAnswers = []; appState.trueFalseAnswers = {}; appState.isQuizStarted = true; appState.quizStartTime = Date.now(); appState.shuffledQuizMap = []; appState.shuffledOptionsMap = [];
            appState.combo = 0;
            appState.wrongCount = 0;
            resetEffects();
            document.getElementById('combo-display').style.display = 'none';
            
            const quizData = appState.originalQuizOrder;
            if (appState.isShuffled) {
                const shuffleableIndices = quizData.map((q, i) => (q.groupId ? null : i)).filter((i) => i !== null);
                for (let i = shuffleableIndices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffleableIndices[i], shuffleableIndices[j]] = [shuffleableIndices[j], shuffleableIndices[i]];
                }
                const newTempQuiz = [];
                const newTempQuizMap = [];
                let shuffleableIndexPointer = 0;
                for (let i = 0; i < quizData.length; i++) {
                    if (quizData[i].groupId) { newTempQuiz[i] = quizData[i]; newTempQuizMap[i] = i; } else {
                        const originalIndex = shuffleableIndices[shuffleableIndexPointer];
                        newTempQuiz[i] = quizData[originalIndex];
                        newTempQuizMap[i] = originalIndex;
                        shuffleableIndexPointer++;
                    }
                }
                appState.currentQuiz = newTempQuiz.map(q => ({...q}));
                appState.shuffledQuizMap = newTempQuizMap;
            } else {
                appState.currentQuiz = [...quizData];
                appState.shuffledQuizMap = quizData.map((_, i) => i);
            }
            
            appState.userAnswers = new Array(appState.currentQuiz.length).fill(null);
            
            ResumeManager.saveState(); // SAVE INIT STATE

            renderProgressBar();
            updateProgressStats();

            document.getElementById('results-container').style.display = 'none';
            document.getElementById('quiz-controls').style.display = 'block';
            document.getElementById('submit-early-btn').style.display = 'inline-block';
            document.getElementById('exit-btn').style.display = 'inline-block';
            
            document.getElementById('fixed-action-bar').style.display = 'flex';
            document.querySelector('.container').classList.add('pb-safe');
            
            syncSettingsUI(); 
            controlBackgroundMusic();
            displayQuestion();
        }

        function retryWrongQuestions() {
            const currentQList = appState.currentQuiz;
            const userAns = appState.userAnswers;
            
            const wrongQuestions = currentQList.filter((q, index) => {
                const answerEntry = userAns[index];
                return !answerEntry || !answerEntry.isCorrect;
            });

            if (wrongQuestions.length === 0) {
                alert("Chúc mừng! Bạn đã làm đúng tất cả, không có câu sai để làm lại.");
                return;
            }

            // Set state cho scope làm lại
            appState.originalQuizOrder = JSON.parse(JSON.stringify(wrongQuestions));
            appState.quizTopic += " (Làm lại câu sai)";
            document.getElementById('quiz-title').textContent = appState.quizTopic; 
            
            appState.currentQuiz = wrongQuestions.map(q => ({...q})); 
            appState.score = 0;
            appState.currentQuestionIndex = 0;
            appState.userAnswers = new Array(appState.currentQuiz.length).fill(null);
            appState.trueFalseAnswers = {};
            appState.shuffledOptionsMap = []; 
            
            appState.combo = 0;
            appState.wrongCount = 0;
            resetEffects();
            document.getElementById('combo-display').style.display = 'none';

            if (appState.isShuffled) {
                appState.shuffledQuizMap = appState.currentQuiz.map((_, i) => i); 
            }

            appState.isQuizStarted = true;
            ResumeManager.saveState(); // AUTO SAVE INIT

            document.getElementById('results-container').style.display = 'none';
            document.getElementById('quiz-controls').style.display = 'block';
            document.getElementById('submit-early-btn').style.display = 'inline-block';
            document.getElementById('exit-btn').style.display = 'inline-block';
            
            renderProgressBar();
            updateProgressStats();
            document.getElementById('fixed-action-bar').style.display = 'flex';
            document.querySelector('.container').classList.add('pb-safe');

            displayQuestion();
        }

        function syncSettingsUI() {
            document.getElementById('master-volume-btn').innerHTML = appState.isMasterMuted ? ICONS.volumeOff : ICONS.volumeOn;
            document.getElementById('music-toggle').checked = !appState.isMusicMuted;
            document.getElementById('correct-sound-toggle').checked = !appState.isCorrectSoundMuted;
            document.getElementById('incorrect-sound-toggle').checked = !appState.isIncorrectSoundMuted;
            document.getElementById('auto-advance-toggle').checked = appState.isAutoAdvanceEnabled;
        }

        function controlBackgroundMusic() {
            if (!backgroundMusic) return;
            if (appState.isQuizStarted && !appState.isMasterMuted && !appState.isMusicMuted) {
                backgroundMusic.loop = true;
                backgroundMusic.play().catch(e => console.log("Lỗi phát nhạc nền:", e));
            } else {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
        }

        function renderProgressBar() {
            const barContainer = document.getElementById('progress-bar-visual');
            barContainer.innerHTML = '';
            const total = appState.currentQuiz.length;
            for (let i = 0; i < total; i++) {
                const segment = document.createElement('div');
                segment.className = 'progress-segment';
                segment.id = `prog-seg-${i}`;
                barContainer.appendChild(segment);
            }
        }

        function updateProgressBar() {
            appState.userAnswers.forEach((ans, index) => {
                if (ans) {
                    const seg = document.getElementById(`prog-seg-${index}`);
                    if (seg) {
                        seg.className = 'progress-segment ' + (ans.isCorrect ? 'correct' : 'incorrect');
                    }
                }
            });
            const total = appState.currentQuiz.length;
            for (let i = 0; i < total; i++) {
                const seg = document.getElementById(`prog-seg-${i}`);
                if (seg) {
                    if (i === appState.currentQuestionIndex) seg.classList.add('active'); else seg.classList.remove('active');
                }
            }
            updateProgressStats();
        }

        function updateProgressStats() {
            const total = appState.currentQuiz.length;
            let correct = 0; 
            let incorrect = 0;

            appState.userAnswers.forEach(ans => { 
                if (ans) { 
                    if (ans.isCorrect) correct++; else incorrect++; 
                } 
            });

            const correctPercent = total > 0 ? Math.round((correct / total) * 100) : 0;
            const incorrectPercent = total > 0 ? Math.round((incorrect / total) * 100) : 0;

            document.getElementById('stat-correct-ratio').textContent = `${correct}/${total}`;
            document.getElementById('stat-correct-percent').textContent = `${correctPercent}%`;
            
            document.getElementById('stat-incorrect-ratio').textContent = `${incorrect}/${total}`;
            document.getElementById('stat-incorrect-percent').textContent = `${incorrectPercent}%`;
        }

        function resetEffects() {
            clearTimeout(appState.borderTimeout);
            const container = document.getElementById('main-container');
            container.classList.remove('border-correct', 'border-wrong');
            container.style.animation = 'none';
            container.offsetHeight; 
            container.style.animation = null; 
        }

        function triggerRewardEffect(isCorrect) {
            resetEffects();
            const container = document.getElementById('main-container');
            const comboBadge = document.getElementById('combo-display');
            let message = "";
            let color = "";
            let isRainbow = false;

            if (isCorrect) {
                appState.combo++;
                appState.wrongCount = 0;
                
                container.classList.add('border-correct');
                appState.borderTimeout = setTimeout(() => { container.classList.remove('border-correct'); }, 600);

                if (appState.combo <= 2) {
                    message = getRandomPhrase(phrases.tier1); color = "#43a047"; 
                    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 }, colors: ['#43a047', '#81c784'] });
                } else if (appState.combo <= 5) {
                    message = getRandomPhrase(phrases.tier2); color = "#d81b60";
                    confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 }, colors: ['#d81b60', '#f48fb1'] });
                } else if (appState.combo <= 8) {
                    message = getRandomPhrase(phrases.tier3); color = "#ef6c00";
                    confetti({ particleCount: 100, spread: 90, origin: { y: 0.8 }, colors: ['#ef6c00', '#ffcc80'] });
                } else {
                    message = getRandomPhrase(phrases.tier4); isRainbow = true;
                    confetti({ particleCount: 150, spread: 120, origin: { y: 0.8 }, colors: ['#d32f2f', '#1976d2', '#388e3c', '#fbc02d'] });
                }
            } else {
                appState.combo = 0; appState.wrongCount++; confetti.reset(); 

                container.classList.add('border-wrong');
                appState.borderTimeout = setTimeout(() => { container.classList.remove('border-wrong'); }, 500);

                if (appState.wrongCount <= 2) { message = getRandomPhrase(wrongPhrases.tier1); } 
                else if (appState.wrongCount <= 5) { message = getRandomPhrase(wrongPhrases.tier2); } 
                else { message = getRandomPhrase(wrongPhrases.tier3); }
                color = "#c62828";
            }

            if (appState.combo > 1) {
                comboBadge.style.display = 'inline-block';
                comboBadge.innerText = `COMBO x${appState.combo}`;
                comboBadge.classList.add('pulse');
                setTimeout(() => comboBadge.classList.remove('pulse'), 200);
            } else {
                comboBadge.style.display = 'none';
            }

            return { message, color, isRainbow };
        }
        
        function displayQuestion() {
            const container = document.getElementById('quiz-live-container');
            if (appState.currentQuestionIndex >= appState.currentQuiz.length) { showResults(); return; }
            updateProgressBar();
            resetEffects(); 
            
            ResumeManager.saveState(); // AUTO SAVE KHI ĐỔI CÂU

            const q = appState.currentQuiz[appState.currentQuestionIndex];
            
            let passageHTML = '';
            if (q.passage) {
                passageHTML = `<div class="passage-box" style="padding: 16px; margin-bottom: 20px; border: 2px solid #3b82f6; border-radius: 12px; background-color: #eff6ff; color: #1e40af;">
                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; color: #3b82f6; font-weight: bold; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">Tư liệu / Câu hỏi nhóm</div>
                    <div class="passage-content" style="line-height: 1.6; font-weight: 500;">${parseContentWithMedia(q.passage)}</div>
                </div>`;
            }

            let questionHTML = `<div class="question-container" id="q-${appState.currentQuestionIndex}">${passageHTML}<p class="question-text">${parseContentWithMedia(q.cau_hoi)}</p><div class="options-container">`;
            let optionsToDisplay = [...q.lua_chon];
            
            if (appState.isShuffled && ['multiple_choice', 'multiple_answer', 'true_false'].includes(q.type)) {
                if (!appState.shuffledOptionsMap[appState.currentQuestionIndex]) {
                    let optionIndices = Array.from({length: optionsToDisplay.length}, (_, i) => i);
                    for (let i = optionIndices.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [optionIndices[i], optionIndices[j]] = [optionIndices[j], optionIndices[i]];
                    }
                    appState.shuffledOptionsMap[appState.currentQuestionIndex] = optionIndices;
                }
                optionsToDisplay = appState.shuffledOptionsMap[appState.currentQuestionIndex].map(i => q.lua_chon[i]);
            } else {
                if (!appState.shuffledOptionsMap[appState.currentQuestionIndex]) {
                     appState.shuffledOptionsMap[appState.currentQuestionIndex] = Array.from({length: optionsToDisplay.length}, (_, i) => i);
                }
            }

            if (q.type === 'short_answer') {
                // --- THAY ĐỔI CỦA #TNTLN ---
                questionHTML += `<textarea id="short-answer-input-${appState.currentQuestionIndex}" class="tntln-textarea" placeholder="Nhập đáp án của bạn vào đây..." oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'"></textarea>`;
            } else if (q.type === 'true_false') {
                optionsToDisplay.forEach((option, index) => {
                    const originalIndex = appState.isShuffled ? appState.shuffledOptionsMap[appState.currentQuestionIndex][index] : index;
                    questionHTML += `<div class="tf-option"><div class="tf-statement">${parseContentWithMedia(option.replace(/^\s*\*\s*/, '').replace(/^\s*(?:[A-Za-z0-9]+[.:)]\s*)+/, '').trim())}</div><div class="tf-buttons"><button class="tf-btn" onclick="toggleTrueFalse(this, '${appState.currentQuestionIndex}', '${originalIndex}')">Chọn</button></div></div>`;
                });
            } else {
                const inputType = q.type === 'multiple_answer' ? 'checkbox' : 'radio';
                optionsToDisplay.forEach(c => {
                    questionHTML += `<label><input type="${inputType}" name="option-${appState.currentQuestionIndex}" value="${escapeHtml(c)}" class="mr-2"> <div class="option-text" style="flex: 1;">${parseContentWithMedia(c.replace(/^\s*\*\s*/, '').replace(/^\s*(?:[A-Za-z0-9]+[.:)]\s*)+/, '').trim())}</div></label>`;
                });
            }
            
            questionHTML += `</div><div class="feedback"></div></div>`;
            container.innerHTML = questionHTML;
            
            // Xử lý auto resize sau khi render cho #tntln
            if (q.type === 'short_answer') {
                const textarea = document.getElementById(`short-answer-input-${appState.currentQuestionIndex}`);
                if (textarea) {
                    textarea.style.height = textarea.scrollHeight + 'px';
                }
            }

            const actionBtn = document.getElementById('fixed-action-btn');
            actionBtn.textContent = 'Trả Lời';
            actionBtn.onclick = checkAnswer;
            actionBtn.className = 'btn'; 
            actionBtn.disabled = false;

            if (typeof katex !== 'undefined') renderMathInElement(container, {delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}]});
        }

        function toggleTrueFalse(buttonEl, qIndex, optionIndex) {
            qIndex = parseInt(qIndex); optionIndex = parseInt(optionIndex);
            if (!appState.trueFalseAnswers[qIndex]) { appState.trueFalseAnswers[qIndex] = {}; }
            const currentChoice = appState.trueFalseAnswers[qIndex][optionIndex];
            let newChoice = (currentChoice === undefined) ? true : (currentChoice === true ? false : undefined);
            if (newChoice === undefined) { delete appState.trueFalseAnswers[qIndex][optionIndex]; } else { appState.trueFalseAnswers[qIndex][optionIndex] = newChoice; }
            buttonEl.classList.remove('selected-true', 'selected-false');
            if (newChoice === true) { buttonEl.textContent = 'Đúng'; buttonEl.classList.add('selected-true'); } else if (newChoice === false) { buttonEl.textContent = 'Sai'; buttonEl.classList.add('selected-false'); } else { buttonEl.textContent = 'Chọn'; }
        }

        function checkAnswer() {
            const q = appState.currentQuiz[appState.currentQuestionIndex];
            const container = document.getElementById(`q-${appState.currentQuestionIndex}`);
            const feedbackDiv = container.querySelector('.feedback');
            let isCorrect = false;
            let selectedAnswerToRecord = [];

            const actionBtn = document.getElementById('fixed-action-btn');
            actionBtn.textContent = 'Câu Tiếp Theo';
            actionBtn.onclick = skipToNextQuestion;
            actionBtn.className = 'btn btn-success';
            
            if (q.type === 'short_answer') {
                const userInputField = container.querySelector(`#short-answer-input-${appState.currentQuestionIndex}`);
                const userAnswer = userInputField.value.trim();
                userInputField.disabled = true;
                isCorrect = q.dap_an_dung.some(ans => ans.trim().toLowerCase() === userAnswer.toLowerCase());
                selectedAnswerToRecord = [userAnswer];
            } else if (q.type === 'true_false') {
                 const userSelections = appState.trueFalseAnswers[appState.currentQuestionIndex] || {};
                 let allCorrect = true;
                 if (Object.keys(userSelections).length !== q.lua_chon.length) { allCorrect = false; } else {
                    for(let i = 0; i < q.lua_chon.length; i++) {
                        const isStatementActuallyCorrect = q.lua_chon[i].trim().startsWith('*');
                        if (userSelections[i] !== isStatementActuallyCorrect) { allCorrect = false; break; }
                    }
                 }
                 isCorrect = allCorrect;
                 selectedAnswerToRecord = isCorrect ? ["Trả lời đúng toàn bộ"] : ["Trả lời sai"];

                const optionsOnScreen = container.querySelectorAll('.tf-option');
                optionsOnScreen.forEach((optionDiv, screenIndex) => {
                    let originalIndex = appState.isShuffled ? appState.shuffledOptionsMap[appState.currentQuestionIndex][screenIndex] : screenIndex;
                    const isStatementActuallyCorrect = q.lua_chon[originalIndex].trim().startsWith('*');
                    const userChoice = userSelections[originalIndex];
                    
                    if (isStatementActuallyCorrect) { 
                        optionDiv.style.borderColor = 'var(--success-color)'; 
                        optionDiv.style.backgroundColor = '#d4edda';
                        optionDiv.style.color = '#155724';
                    } else { 
                        optionDiv.style.borderColor = 'var(--danger-color)'; 
                        optionDiv.style.backgroundColor = '#f8d7da';
                        optionDiv.style.color = '#721c24';
                    }
                    
                    const button = optionDiv.querySelector('.tf-btn');
                    button.disabled = true;
                    button.classList.remove('selected-true', 'selected-false'); 
                    
                    if (userChoice === true) { 
                        button.textContent = 'Đúng'; 
                        button.classList.add('selected-true'); 
                    } else if (userChoice === false) { 
                        button.textContent = 'Sai'; 
                        button.classList.add('selected-false'); 
                    } else {
                        button.textContent = '---';
                        button.style.opacity = '0.5';
                    }
                });
            } else {
                const getCleanContent = text => text.replace(/^\s*\*\s*/, '').replace(/^\s*(?:[A-Za-z0-9]+[.:)]\s*)+/, '').trim();
                const checkedInputs = Array.from(container.querySelectorAll('input:checked'));
                let selected = checkedInputs.map(el => el.value);
                selectedAnswerToRecord = selected;
                container.querySelectorAll('input').forEach(el => el.disabled = true);
                const cleanCorrectAnswers = q.dap_an_dung.map(getCleanContent);
                const cleanSelectedContents = selected.map(getCleanContent);
                isCorrect = cleanSelectedContents.length === cleanCorrectAnswers.length && cleanSelectedContents.sort().every((val, index) => val === cleanCorrectAnswers.sort()[index]);
                
                container.querySelectorAll('label').forEach(label => {
                    const input = label.querySelector('input');
                    label.style.border = '1px solid #ddd';
                    
                    const isCorrectAnswer = q.dap_an_dung.some(correct_ans => getCleanContent(correct_ans) === getCleanContent(input.value));
                    
                    if (isCorrectAnswer) { 
                        label.style.backgroundColor = '#d4edda'; 
                        label.style.borderColor = 'var(--success-color)';
                        label.style.color = '#155724';
                    } else { 
                        if (input.checked) {
                             label.style.backgroundColor = '#f8d7da'; 
                             label.style.borderColor = 'var(--danger-color)';
                             label.style.color = '#721c24';
                        }
                    }
                });
            }

            appState.userAnswers[appState.currentQuestionIndex] = {
                questionIndex: appState.currentQuestionIndex,
                selected: selectedAnswerToRecord,
                isCorrect: isCorrect
            };
            updateProgressBar();

            const rewardData = triggerRewardEffect(isCorrect);

            if (isCorrect) {
                appState.score++;
                if (!appState.isMasterMuted && !appState.isCorrectSoundMuted && correctAnswerSound) correctAnswerSound.play().catch(e => {});
            } else {
                if (!appState.isMasterMuted && !appState.isIncorrectSoundMuted && incorrectAnswerSound) incorrectAnswerSound.play().catch(e => {});
            }
            
            ResumeManager.saveState(); // AUTO SAVE NGAY SAU KHI CHẤM ĐIỂM XONG 1 CÂU

            let rewardHTML = `<div class="reward-message ${rewardData.isRainbow ? 'rainbow-text' : ''}" style="color: ${rewardData.color}">${rewardData.message}</div>`;
            
            feedbackDiv.innerHTML = `${rewardHTML}<strong style="color: ${isCorrect ? 'var(--success-color)' : 'var(--danger-color)'};">${isCorrect ? 'Đúng' : 'Sai'}!</strong>`;
            if (!isCorrect && q.type !== 'true_false') {
                const correctAnswersHTML = q.dap_an_dung.map(ans => parseContentWithMedia(ans.replace(/^\*/, ''))).join('; ');
                feedbackDiv.innerHTML += `<p>Đáp án đúng: <span style="color: var(--success-color);">${correctAnswersHTML}</span></p>`;
            }

            if (appState.isAutoAdvanceEnabled) {
                appState.feedbackTimeoutId = setTimeout(nextQuestion, 2000);
            }
        }

        function skipToNextQuestion() { if (appState.feedbackTimeoutId) { clearTimeout(appState.feedbackTimeoutId); appState.feedbackTimeoutId = null; } nextQuestion(); }
        function nextQuestion() { if (appState.feedbackTimeoutId) { clearTimeout(appState.feedbackTimeoutId); appState.feedbackTimeoutId = null; } appState.currentQuestionIndex++; displayQuestion(); }
        function submitEarly() { if (confirm('Bạn có chắc muốn nộp bài sớm không?')) { showResults(); } }
        
        async function showResults() {
            appState.isQuizStarted = false;
            controlBackgroundMusic();
            document.getElementById('quiz-live-container').innerHTML = '';
            document.getElementById('quiz-controls').style.display = 'none';
            document.getElementById('fixed-action-bar').style.display = 'none';
            document.querySelector('.container').classList.remove('pb-safe');

            const resultsContainer = document.getElementById('results-container');
            resultsContainer.style.display = 'block';
            
            const total = appState.currentQuiz.length;
            document.getElementById('final-score').innerHTML = `Bạn đã đúng <strong style="color: var(--success-color);">${appState.score} / ${total}</strong> câu!`;
            
            // TÍNH TOÁN LƯU LỊCH SỬ
            let correct = 0, wrong = 0, skipped = 0;
            let wrongQuestions = [];
            
            appState.userAnswers.forEach((ans, idx) => {
                if (!ans) {
                    skipped++;
                    wrongQuestions.push(appState.currentQuiz[idx]); // Coi chưa làm là sai để làm lại
                } else if (ans.isCorrect) {
                    correct++;
                } else {
                    wrong++;
                    wrongQuestions.push(appState.currentQuiz[idx]);
                }
            });

            const historyItem = {
                id: Date.now(),
                date: new Date().toISOString(),
                topic: appState.quizTopic,
                total: total,
                correct: correct,
                wrong: wrong,
                skipped: skipped,
                quizData: appState.originalQuizOrder, // Scope gốc
                wrongQuestions: wrongQuestions // Scope sai
            };
            
            HistoryManager.saveHistory(historyItem);
            ResumeManager.clearState(); // Hoàn thành bài thì xoá auto-save

            const wrongCount = wrong + skipped;
            const retryWrongBtn = document.getElementById('retry-wrong-btn');
            
            if (wrongCount === 0) {
                retryWrongBtn.style.opacity = "0.5";
                retryWrongBtn.innerText = "Không có câu sai";
                retryWrongBtn.onclick = null;
            } else {
                retryWrongBtn.style.opacity = "1";
                retryWrongBtn.innerText = `Làm lại ${wrongCount} câu sai`;
                retryWrongBtn.onclick = retryWrongQuestions;
            }
        }
        
        function toggleShuffle() {
            appState.isShuffled = !appState.isShuffled;
            document.getElementById('menu-shuffle-btn').textContent = `Trộn câu hỏi và đáp án: ${appState.isShuffled ? 'Bật' : 'Tắt'}`;
        }
        
        function escapeHtml(text) {
            if (typeof text !== 'string') return '';
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return text.replace(/[&<>"']/g, m => map[m]);
        }
        
        function parseContentWithMedia(text) {
            if (typeof text !== 'string' || !text) return '';
            let rawHtml = escapeHtml(text).replace(/\n/g, '<br />');
            rawHtml = rawHtml.replace(/#\{([^}]+?)\}#/g, (match, content) => {
                const cleanedContent = content.trim();
                const mediaMatch = cleanedContent.match(/^(.+?)\|([0-9.]+)\|([0-9.]+)$/);
                if (mediaMatch) {
                    const filename = mediaMatch[1];
                    const width = parseFloat(mediaMatch[2]);
                    const height = parseFloat(mediaMatch[3]);
                    return `<img src="images/${escapeHtml(filename)}" alt="${escapeHtml(filename)}" style="display: block; margin: 10px auto; width: ${width}px; height: ${height}px; object-fit: contain;" class="question-image quiz-embedded-image" />`;
                }
                if (cleanedContent.startsWith('images/') || cleanedContent.startsWith('res/')) { return `<img src="${cleanedContent}" alt="Image" class="question-image">`; }
                const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
                if (base64Regex.test(cleanedContent.replace(/\s/g, ''))) { return `<img src="data:image/png;base64,${cleanedContent}" alt="Image" class="question-image">`; }
                return match;
            });
            if (typeof katex !== 'undefined') {
                rawHtml = rawHtml.replace(/\$\$([\s\S]+?)\$\$/g, (m, f) => { try { return katex.renderToString(f, {displayMode: true}); } catch(e){ return m; }});
                rawHtml = rawHtml.replace(/\$([\s\S]+?)\$/g, (m, f) => { if(m.startsWith('$')||m.endsWith('$')) return m; try { return katex.renderToString(f, {displayMode: false}); } catch(e){ return m; }});
            }
            return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml, { ADD_TAGS: ['img'], ADD_ATTR: ['src', 'alt', 'style', 'class'] }) : rawHtml;
        }

        // =========================================================================
        // === HỆ THỐNG KIỂM TRA PHIÊN BẢN TỰ ĐỘNG (AUTO-UPDATE) ===
        // =========================================================================
        const CURRENT_VERSION = 1779496645033;
        const CHECK_INTERVAL = 3 * 60 * 1000;

        async function checkUpdate() {
            try {
                const response = await fetch('version.json?t=' + Date.now(), { cache: "no-store" });
                if (!response.ok) return;
                const data = await response.json();
                if (data.version && data.version !== CURRENT_VERSION) {
                    console.log("Phát hiện phiên bản thay đổi: v" + data.version);
                    showUpdateBanner();
                }
            } catch (e) {
                console.warn("Không thể kiểm tra bản cập nhật từ server:", e);
            }
        }

        function showUpdateBanner() {
            if (document.getElementById('smart-update-banner')) return;
            const banner = document.createElement('div');
            banner.id = 'smart-update-banner';
            banner.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; ' +
                'background: linear-gradient(90deg, #ff9800, #f44336); ' +
                'color: white; text-align: center; padding: 10px 15px; ' +
                'z-index: 999999; font-weight: bold; font-family: sans-serif; ' +
                'box-shadow: 0 4px 10px rgba(0,0,0,0.3); ' +
                'display: flex; justify-content: center; align-items: center; gap: 15px; ' +
                'animation: slideDownUpdate 0.4s ease-out;';
            const style = document.createElement('style');
            style.innerHTML = '@keyframes slideDownUpdate { from { transform: translateY(-100%); } to { transform: translateY(0); } }';
            document.head.appendChild(style);
            banner.innerHTML = '<span style="flex-grow: 1; text-align: right; font-size: 15px;">🚀 Đã có phiên bản bài thi mới!</span>' +
                '<button id="btn-update-now" style="padding: 6px 16px; background: white; color: #f44336; border: none; border-radius: 20px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Cập nhật ngay</button>' +
                '<button id="btn-close-banner" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 10px; flex-grow: 1; text-align: left;" title="Đóng thông báo">✖</button>';
            document.body.appendChild(banner);
            const originalPaddingTop = document.body.style.paddingTop || "15px";
            document.body.style.paddingTop = "55px";
            document.getElementById('btn-update-now').addEventListener('click', () => { location.reload(true); });
            document.getElementById('btn-close-banner').addEventListener('click', () => {
                banner.remove();
                document.body.style.paddingTop = originalPaddingTop;
            });
        }

        setTimeout(checkUpdate, 2000);
        document.addEventListener("visibilitychange", function() {
            if (document.visibilityState === 'visible') { checkUpdate(); }
        });
        setInterval(checkUpdate, CHECK_INTERVAL);