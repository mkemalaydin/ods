const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (action === "adminLogin") {
    const sheet = ss.getSheetByName("Kullanicilar");
    const rows = sheet.getDataRange().getValues();
    let success = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.user && rows[i][1] == data.pass) { success = true; break; }
    }
    return ContentService.createTextOutput(JSON.stringify({ success })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "studentLogin") {
    const sheet = ss.getSheetByName("Ogrenciler");
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Öğrenci veritabanı bulunamadı." })).setMimeType(ContentService.MimeType.JSON);
    const rows = sheet.getDataRange().getValues();
    let success = false;
    let studentName = "";
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.studentId && rows[i][2] == data.password) { 
        success = true; 
        studentName = rows[i][1];
        break; 
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success, studentName })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "registerStudent") {
    let sheet = ss.getSheetByName("Ogrenciler");
    if (!sheet) {
      sheet = ss.insertSheet("Ogrenciler");
      sheet.appendRow(["ÖğrenciNo", "AdSoyad", "Sifre"]);
    }
    const rows = sheet.getDataRange().getValues();
    let exists = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.studentId) { exists = true; break; }
    }
    if (exists) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Bu öğrenci numarası zaten kayıtlı." })).setMimeType(ContentService.MimeType.JSON);
    }
    sheet.appendRow([data.studentId, data.name, data.password]);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "createExam") {
    const sheet = ss.getSheetByName("Sinavlar");
    const id = "EX" + Utilities.getUuid().substring(0, 8);
    sheet.appendRow([id, data.name, new Date()]);
    return ContentService.createTextOutput(JSON.stringify({ success: true, id })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "addBulkQuestions") {
    const sheet = ss.getSheetByName("Sorular");
    data.questions.forEach(q => {
      sheet.appendRow([data.examId, "test", q.text, q.opts[0], q.opts[1], q.opts[2], q.opts[3], q.opts[4], q.correct]);
    });
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "submitExam") {
    const sheet = ss.getSheetByName("Cevaplar");
    sheet.appendRow([
      data.studentId, data.score, data.total, data.correct, data.wrong, 0, 
      data.duration, new Date(), JSON.stringify(data.answers), data.examId, JSON.stringify(data.questions)
    ]);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (action === "getExams") {
    const rows = ss.getSheetByName("Sinavlar").getDataRange().getValues();
    const exams = rows.slice(1).map(r => ({ id: r[0], name: r[1] }));
    return ContentService.createTextOutput(JSON.stringify({ exams })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getQuestions") {
    const rows = ss.getSheetByName("Sorular").getDataRange().getValues();
    const questions = rows.slice(1).filter(r => r[0] == e.parameter.examId).map(r => ({
      text: r[2], opts: [r[3], r[4], r[5], r[6], r[7]], correct: r[8]
    }));
    return ContentService.createTextOutput(JSON.stringify({ questions })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getResults") {
    const rows = ss.getSheetByName("Cevaplar").getDataRange().getValues();
    const results = rows.slice(1).filter(r => r[9] == e.parameter.examId).map(r => ({
      studentId: r[0], score: r[1], date: r[7], answers: JSON.parse(r[8]), questions: JSON.parse(r[10])
    }));
    return ContentService.createTextOutput(JSON.stringify({ results })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getStudentHistory") {
    const rows = ss.getSheetByName("Cevaplar").getDataRange().getValues();
    const history = rows.slice(1).filter(r => r[0] == e.parameter.studentId).map(r => ({ score: r[1], date: r[7] }));
    return ContentService.createTextOutput(JSON.stringify({ history })).setMimeType(ContentService.MimeType.JSON);
  }
}