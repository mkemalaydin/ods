const API = "https://script.google.com/macros/s/AKfycbzsk3rfGTYVYyN8S8uhGnwtkSN_H8EExrOCkyUy5NvC27vAby5B1vEn3IdtgtE_38HcAA/exec"; 

let currentQuestions = [];
let timerInterval = null;
let currentGlobalResults = []; 
let currentGlobalQuestions = [];
let currentStudentId = null; 

function toggleLoading(show) { document.getElementById('loader').style.display = show ? 'flex' : 'none'; }

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'loginPage' || id === 'adminPage' || id === 'examSelectionPage') loadExamsToSelect();
}

function adminTab(tabId, btn) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active-tab'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active-tab');
    btn.classList.add('active');
}

async function startExam() {
    const examId = document.getElementById('courseSelect').value;
    if(!examId) return alert("Sınav seçin!");

    toggleLoading(true);
    try {
        const resp = await fetch(`${API}?action=getQuestions&examId=${examId}`);
        const data = await resp.json();
        currentQuestions = data.questions;
        renderQuestions();
        showPage('examPage');
        startTimer();
    } catch(e) { alert("Sınav yüklenirken hata oluştu."); }
    finally { toggleLoading(false); }
}

async function studentLogin() {
    const stdId = document.getElementById('stdId').value;
    const password = document.getElementById('stdPass').value;
    if(!stdId || !password) return alert("Eksik bilgi!");

    const res = await sendPost({ action: "studentLogin", studentId: stdId, password });
    if (!res.success) {
        alert("Giriş başarısız! Öğrenci numarası veya şifre yanlış.");
        return;
    }
    currentStudentId = stdId;
    showPage('examSelectionPage');
    loadExamsToSelect();
}

function renderQuestions() {
    const area = document.getElementById('examArea');
    area.innerHTML = "";
    currentQuestions.forEach((q, i) => {
        let html = `<div class="question-block"><h4>${i+1}. ${q.text}</h4>`;
        q.opts.forEach((opt, idx) => {
            if(opt) {
                const L = String.fromCharCode(65 + idx);
                html += `<label><input type="radio" name="q${i}" value="${L}"> ${L}) ${opt}</label><br>`;
            }
        });
        area.innerHTML += html + `</div>`;
    });
}

function startTimer() {
    let sec = 0;
    timerInterval = setInterval(() => {
        sec++;
        document.getElementById('timer').innerText = `Süre: ${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`;
    }, 1000);
}

async function submitExamResults() {
    clearInterval(timerInterval);
    const stdId = currentStudentId;
    const examId = document.getElementById('courseSelect').value;
    
    let correctCount = 0;
    let userAnswers = [];
    currentQuestions.forEach((q, i) => {
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        const ans = sel ? sel.value : "Boş";
        if(ans === q.correct) correctCount++;
        userAnswers.push(ans);
    });
    
    const score = Math.round((correctCount / currentQuestions.length) * 100);
    const res = await sendPost({
        action: "submitExam",
        studentId: stdId,
        examId: examId,
        score: score,
        total: currentQuestions.length,
        correct: correctCount,
        wrong: currentQuestions.length - correctCount,
        duration: document.getElementById('timer').innerText,
        answers: userAnswers,
        questions: currentQuestions
    });
    if(res.success) {
        document.getElementById('scoreDisplay').innerText = score + " Puan";
        showPage('resultPage');
    }
}

// === ANALİZ VE RAPORLAMA DÜZELTMELERİ ===
async function loadStatsForExam() {
    const examId = document.getElementById('statsExamSelect').value;
    if(!examId) return;
    
    toggleLoading(true);
    try {
        const [resResp, quesResp] = await Promise.all([
            fetch(`${API}?action=getResults&examId=${examId}`),
            fetch(`${API}?action=getQuestions&examId=${examId}`)
        ]);

        const resData = await resResp.json();
        const quesData = await quesResp.json();
        currentGlobalResults = resData.results || [];
        currentGlobalQuestions = quesData.questions || [];
        
        if(!currentGlobalResults.length) {
            document.getElementById('statsContent').innerHTML = "<p>Veri bulunamadı.</p>";
            document.getElementById('downloadExcelBtn').style.display = 'none';
            return;
        }

        document.getElementById('downloadExcelBtn').style.display = 'inline-block';
        const scores = currentGlobalResults.map(r => r.score);
        const avg = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);

        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div class="stat-card"><h4>Katılımcı</h4><div class="stat-value">${currentGlobalResults.length}</div></div>
                <div class="stat-card"><h4>Ortalama</h4><div class="stat-value" style="color:var(--primary)">${avg}</div></div>
            </div>
            <div id="detailedQuestionAnalysis"></div>
        `;
        document.getElementById('statsContent').innerHTML = html;
        analyzeQuestions(currentGlobalResults, currentGlobalQuestions);
    } finally { toggleLoading(false); }
}

function analyzeQuestions(results, questions) {
    let html = '';
    questions.forEach((q, idx) => {
        const qCorrect = q.correct.trim().toUpperCase();
        let counts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'Boş': 0 };
        let correctNum = 0;

        results.forEach(r => {
            const ans = (r.answers && r.answers[idx]) ? r.answers[idx].toUpperCase() : 'Boş';
            if(counts.hasOwnProperty(ans)) counts[ans]++;
            if(ans === qCorrect) correctNum++;
        });

        // Üst-Alt Grup Analizi (%27)
        const sorted = [...results].sort((a,b) => b.score - a.score);
        const n = Math.ceil(results.length * 0.27) || 1;
        const topCorrect = sorted.slice(0, n).filter(r => r.answers[idx] === qCorrect).length;
        const bottomCorrect = sorted.slice(-n).filter(r => r.answers[idx] === qCorrect).length;

        const p = (correctNum / results.length).toFixed(3);
        const d = ((topCorrect - bottomCorrect) / n).toFixed(3);
        const successRate = Math.round((correctNum / results.length) * 100);

        html += `
            <div class="detailed-q-card">
                <div class="q-header"><h5>Soru ${idx+1}</h5><span class="q-badge">Doğru: ${qCorrect}</span></div>
                <p class="q-text-preview">${q.text}</p>
                <div class="q-stats-grid">
                    <div class="options-bars">
                        ${['A','B','C','D','E'].filter(l => q.opts[['A','B','C','D','E'].indexOf(l)]).map(l => {
                            const c = counts[l];
                            const per = Math.round((c/results.length)*100) || 0;
                            return `
                            <div class="opt-bar-row">
                                <div class="opt-label ${l === qCorrect ? 'correct-label' : ''}">${l}</div>
                                <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${per}%; background:${l === qCorrect ? '#28a745' : '#6c757d'}"></div></div>
                                <div class="opt-count">${c} kişi (%${per})</div>
                            </div>`;
                        }).join('')}
                    </div>
                    <div class="index-box">
                        <div class="index-item"><span class="index-title">Başarı Oranı</span><span class="index-val" style="color:${successRate>50?'#28a745':'#dc3545'}">%${successRate}</span></div>
                        <div class="index-item"><span class="index-title">Güçlük (P)</span><span class="index-val">${p}</span></div>
                        <div class="index-item"><span class="index-title">Ayırt Edicilik (D)</span><span class="index-val" style="color:${d<0.2?'#dc3545':'#28a745'}">${d}</span></div>
                    </div>
                </div>
            </div>`;
    });
    document.getElementById('detailedQuestionAnalysis').innerHTML = html;
}

// Excel İndirme ve Diğer Fonksiyonlar Aynen Kalacak
function downloadResultsExcel() {
    if(!currentGlobalResults.length) return alert("Veri yok.");
    const data = currentGlobalResults.map(r => {
        let row = { 'Öğrenci No': r.studentId, 'Puan': r.score, 'Tarih': new Date(r.date).toLocaleString('tr-TR') };
        currentGlobalQuestions.forEach((q, i) => row[`Soru ${i+1}`] = r.answers[i] || 'Boş');
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sonuçlar");
    XLSX.writeFile(wb, "ODYS_Sonuclar.xlsx");
}

async function loadExamsToSelect() {
    const resp = await fetch(`${API}?action=getExams`);
    const data = await resp.json();
    ['courseSelect', 'targetExamSelect', 'statsExamSelect'].forEach(id => {
        const s = document.getElementById(id);
        if(s) {
            s.innerHTML = '<option value="">Seçin</option>';
            data.exams.forEach(ex => s.innerHTML += `<option value="${ex.id}">${ex.name}</option>`);
        }
    });
}

// Admin İşlemleri
async function adminLogin() {
    const user = document.getElementById('admUser').value;
    const pass = document.getElementById('admPass').value;
    const res = await sendPost({ action: "adminLogin", user, pass });
    if (res.success) showPage('adminPage'); else alert("Giriş başarısız!");
}

async function createExam() {
    const name = document.getElementById('newExamName').value;
    if(!name) return;
    const res = await sendPost({ action: "createExam", name });
    if (res.success) { alert("Oluşturuldu!"); loadExamsToSelect(); }
}

function generateQuestionInputs() {
    const count = document.getElementById('questionCount').value;
    const container = document.getElementById('bulkQuestionContainer');
    container.innerHTML = "";
    for (let i = 1; i <= count; i++) {
        container.innerHTML += `
            <div class="question-input-group">
                <h4>Soru ${i}</h4>
                <textarea class="q-text" placeholder="Soru..."></textarea>
                <div class="opt-grid">
                    <input class="opt-0" placeholder="A"> <input class="opt-1" placeholder="B">
                    <input class="opt-2" placeholder="C"> <input class="opt-3" placeholder="D">
                    <input class="opt-4" placeholder="E">
                    <select class="q-correct"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option></select>
                </div>
            </div>`;
    }
    document.getElementById('saveAllBtn').style.display = 'block';
}

async function saveBulkQuestions() {
    const examId = document.getElementById('targetExamSelect').value;
    const groups = document.querySelectorAll('.question-input-group');
    let questions = [];
    groups.forEach(g => {
        let opts = [];
        for(let i=0; i<5; i++) opts.push(g.querySelector(`.opt-${i}`).value);
        questions.push({ text: g.querySelector('.q-text').value, opts, correct: g.querySelector('.q-correct').value });
    });
    const res = await sendPost({ action: "addBulkQuestions", examId, questions });
    if(res.success) alert("Kaydedildi!");
}

async function loadHistory() {
    const id = currentStudentId;
    if(!id) return;
    toggleLoading(true);
    const resp = await fetch(`${API}?action=getStudentHistory&studentId=${id}`);
    const data = await resp.json();
    showPage('historyPage');
    let h = "<table><tr><th>Puan</th><th>Tarih</th></tr>";
    data.history.forEach(r => h += `<tr><td>${r.score}</td><td>${new Date(r.date).toLocaleDateString()}</td></tr>`);
    document.getElementById('historyList').innerHTML = h + "</table>";
    toggleLoading(false);
}

window.onload = loadExamsToSelect;