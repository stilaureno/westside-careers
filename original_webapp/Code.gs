
const SPREADSHEET_ID = '1m83qsK3UmuffDyr2QJMoUe__TiwUmtChVn5Hnm7B1Do';

const SHEET_APPLICANTS = 'Applicants';
const SHEET_GAMES = 'ApplicantGames';
const SHEET_STAGE_RESULTS = 'StageResults';
const SHEET_IN_APP_NOTIFICATIONS = 'ApplicantNotifications';
const SHEET_CONFIG = 'Config';
const SHEET_QUESTIONNAIRE = 'Questionnaire';
const SHEET_MATH_RESULT = 'Math Exam Result';

const EXAM_DURATION_MINUTES = 10;
const PASSING_SCORE = 8;
const MAX_MATH_EXAM_SCORE = 10;

const APPLICANT_HEADERS = [
  'ApplicantID','ReferenceNo','LastName','FirstName','MiddleName','Birthdate','Age','Gender',
  'ContactNumber','EmailAddress','HeightCM','WeightKG','BMIValue','PositionApplied',
  'ExperienceLevel','CurrentCompanyName','CurrentPosition','PreviousCompanyName',
  'PreferredDepartment','CurrentlyEmployed','DuplicateKey','CurrentStage','ApplicationStatus',
  'OverallResult','CreatedAt','UpdatedAt'
];

const STAGE_RESULT_HEADERS = [
  'ApplicantID','ReferenceNo','StageName','StageSequence','ResultStatus','CurrentStageLabel','NextStep',
  'HeightCM','WeightKG','BMIValue','BMIResult','ColorBlindResult','VisibleTattoo','InvisibleTattoo',
  'SweatyPalmResult','Score','PassingScore','MaxScore','Remarks','EvaluatedBy','EvaluatedAt'
];

const MATH_RESULT_HEADERS = [
  'ReferenceNo','LastName','FirstName','MiddleName','Score','Status','AssignedSet','StartedAt',
  'SubmittedAt','AttemptStatus','AnswersJSON','QuestionsJSON','TimeLimitMinutes',
  'TerminationReason','LastHeartbeat','CreatedAt'
];

const ALLOWED_GAMES = ['MB','BJ','RL','CRAPS'];
const PREFERRED_POSITIONS = ['','Slots Technicians','Slots Admin','Slots Ambassador','Slots Supervisor','Slots Admin Operations'];
const POSITIONS = ['Dealer','Pit Supervisor','Pit Manager','Operations Manager'];
const EXPERIENCE_LEVELS = ['Non-Experienced Dealer','Experienced Dealer'];
const FINAL_INTERVIEW_RESULTS = ['Passed','Reprofile','For Pooling','Not Recommended'];

const DASHBOARD_CACHE_KEY = 'dash_v_split_1';
const QUESTIONNAIRE_CACHE_KEY = 'questionnaire_grouped_v2';
const DASHBOARD_CACHE_TTL = 60;
const APPLICANT_CACHE_TTL = 60;
const QUESTIONNAIRE_CACHE_TTL = 300;

function getScriptCache_() { return CacheService.getScriptCache(); }
function cacheGetJson_(key) {
  try {
    const raw = getScriptCache_().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function cachePutJson_(key, value, ttlSeconds) {
  try { getScriptCache_().put(key, JSON.stringify(value), ttlSeconds || 60); } catch (e) {}
}
function getApplicantAdminCacheKey_(referenceNo) { return 'app_admin_' + String(referenceNo || '').trim(); }
function clearDashboardCache_() { try { getScriptCache_().remove(DASHBOARD_CACHE_KEY); } catch (e) {} }
function clearApplicantAdminCache_(referenceNo) { if (!referenceNo) return; try { getScriptCache_().remove(getApplicantAdminCacheKey_(referenceNo)); } catch (e) {} }

function doGet(e) {
  ensureSystemReady_();

  const page = (e && e.parameter && e.parameter.page)
    ? String(e.parameter.page).toLowerCase()
    : 'application';

  if (page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('Westside Resort Table Games Hiring Admin Panel')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page === 'exam') {
    return HtmlService.createHtmlOutputFromFile('MathExam')
      .setTitle('Westside Resort Table Games Math Exam')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Westside Resort Table Games Hiring Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSS() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function getApplicantsSheet() { return getSS().getSheetByName(SHEET_APPLICANTS); }
function getGamesSheet() { return getSS().getSheetByName(SHEET_GAMES); }
function getStageResultsSheet() { return getSS().getSheetByName(SHEET_STAGE_RESULTS); }
function getNotificationsSheet() { return getSS().getSheetByName(SHEET_IN_APP_NOTIFICATIONS); }
function getConfigSheet() { return getSS().getSheetByName(SHEET_CONFIG); }
function getQuestionnaireSheet() { return getSS().getSheetByName(SHEET_QUESTIONNAIRE); }
function getMathResultSheet() { return getSS().getSheetByName(SHEET_MATH_RESULT); }

function ensureSystemReady_() {
  const ss = getSS();
  const defs = [
    { name: SHEET_APPLICANTS, headers: APPLICANT_HEADERS },
    { name: SHEET_GAMES, headers: ['ApplicantID','ReferenceNo','GameCode'] },
    { name: SHEET_STAGE_RESULTS, headers: STAGE_RESULT_HEADERS },
    { name: SHEET_IN_APP_NOTIFICATIONS, headers: ['ApplicantID','ReferenceNo','StageName','ResultStatus','NotificationMessage','VisibleToApplicant','CreatedAt','CreatedBy'] },
    { name: SHEET_CONFIG, headers: ['Key','Value'], defaults: [['ADMIN_PASSWORD', 'TGHR2026']] },
    { name: SHEET_QUESTIONNAIRE, headers: ['SetName','QuestionNo','Question','OptionA','OptionB','OptionC','OptionD','CorrectAnswer'] },
    { name: SHEET_MATH_RESULT, headers: MATH_RESULT_HEADERS }
  ];

  defs.forEach(function(def) {
    let sh = ss.getSheetByName(def.name);
    if (!sh) sh = ss.insertSheet(def.name);

    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
    } else {
      const existing = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), def.headers.length)).getValues()[0];
      const mismatch = def.headers.some(function(h, i) { return String(existing[i] || '') !== h; });
      if (mismatch || sh.getLastColumn() < def.headers.length) {
        sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
      }
    }

    if (def.name === SHEET_CONFIG && def.defaults) {
      const values = getSheetValues_(sh);
      const existingKeys = values.slice(1).map(function(r){ return String(r[0] || '').trim(); });
      def.defaults.forEach(function(pair){
        if (!existingKeys.includes(pair[0])) sh.appendRow(pair);
      });
    }
  });
}

function getSheetValues_(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (!lastRow || !lastCol) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getValues();
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDateValue(value) {
  if (!value) return '';
  const tz = Session.getScriptTimeZone() || 'Asia/Manila';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d)) return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  return str;
}

function formatDateOnly_(value) {
  return normalizeDateValue(value);
}

function formatDateTime_(value) {
  if (!value) return '';
  const tz = Session.getScriptTimeZone() || 'Asia/Manila';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd HH:mm:ss');
  }
  const d = new Date(value);
  if (!isNaN(d)) return Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm:ss');
  return String(value);
}

function formatTerminationReason_(reason) {
  const map = {
    'SUBMIT': 'Submitted by applicant',
    'SUBMIT_CLICKED': 'Submitted by applicant',
    'AUTO_SUBMIT': 'Auto-submitted',
    'LEFT_PAGE': 'Left or closed the exam page',
    'REOPENED_OR_LEFT_PAGE': 'Exam page was reopened or previously left',
    'TAB_HIDDEN_OR_MINIMIZED': 'Tab was hidden or browser was minimized',
    'WINDOW_LOST_FOCUS': 'Exam window lost focus',
    'TIME_LIMIT_REACHED': 'Time limit reached'
  };
  return map[String(reason || '').trim()] || String(reason || '').trim();
}

function computeAge(birthdate) {
  const dob = new Date(birthdate);
  if (isNaN(dob)) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function computeBMI(heightCm, weightKg) {
  const h = Number(heightCm || 0);
  const w = Number(weightKg || 0);
  if (!h || !w) return '';
  return Number((w / Math.pow(h / 100, 2)).toFixed(2));
}

function buildDuplicateKey(data) {
  return [data.lastName, data.firstName, data.middleName || '', normalizeDateValue(data.birthdate), data.contactNumber]
    .map(normalizeValue)
    .join('|');
}

function generateReferenceNo() {
  return 'APP-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Manila', 'yyyyMMddHHmmss');
}

function generateApplicantId() {
  return 'AID-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function getConfigValue(key) {
  const rows = getSheetValues_(getConfigSheet());
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === String(key || '').trim()) return rows[i][1];
  }
  return '';
}

function validateAdminPassword(password) {
  const saved = String(getConfigValue('ADMIN_PASSWORD') || '').trim();
  if (!saved) throw new Error('Admin password is not configured.');
  return String(password || '').trim() === saved;
}

function normalizeFinalInterviewResult_(value) {
  const result = String(value || '').trim();
  if (result === 'Pooling') return 'For Pooling';
  if (result === 'Failed') return 'Not Recommended';
  return result;
}

function getApplicantStages_(positionApplied, experienceLevel) {
  const position = String(positionApplied || '').trim();
  const exp = String(experienceLevel || '').trim();

  if (position === 'Dealer') {
    if (exp === 'Experienced Dealer') {
      return ['Initial Screening', 'Math Exam', 'Table Test', 'Final Interview'];
    }
    return ['Initial Screening', 'Math Exam', 'Final Interview'];
  }

  if (['Pit Supervisor','Pit Manager','Operations Manager'].includes(position)) {
    return ['Initial Screening', 'Final Interview'];
  }

  return ['Initial Screening'];
}

function getStageSequence(stageName, positionApplied, experienceLevel) {
  const stages = getApplicantStages_(positionApplied, experienceLevel);
  const idx = stages.indexOf(String(stageName || '').trim());
  return idx > -1 ? idx + 1 : 0;
}

function getNextStage_(positionApplied, experienceLevel, currentStage) {
  const stages = getApplicantStages_(positionApplied, experienceLevel);
  const idx = stages.indexOf(String(currentStage || '').trim());
  return idx > -1 && idx < stages.length - 1 ? stages[idx + 1] : 'Completed';
}

function getDarwinboxLinkHtml_() {
  return '<a href="https://westsideresort.darwinbox.com/ms/candidatev2/main/auth/login?fbclid=IwVERDUAQNuxlleHRuA2FlbQIxMABzcnRjBmFwcF9pZAwzNTA2ODU1MzE3MjgAAR5sBwAaW0gWlbGopfd5h7Eh_0-QF3VQfxxBZ8FSw_El_ADzDV2nRq-kVrPG_g_aem_68-vpDn8g1AoLE2LQ0VVSA" target="_blank" rel="noopener noreferrer">Darwinbox</a>';
}

function getCompletedStageInstruction_(positionApplied, experienceLevel) {
  const position = String(positionApplied || '').trim();
  const exp = String(experienceLevel || '').trim();
  const darwinbox = getDarwinboxLinkHtml_();

  if (position === 'Dealer' && exp === 'Non-Experienced Dealer') {
    return 'You have completed the Hiring Portal process for the Dealer position, including the Initial Screening, Math Exam, and Final Interview stages. Please follow the next instructions provided by the final interviewer.<br><br>For application monitoring purposes, please create your ' + darwinbox + ' account, complete all required information, and select the position you applied for today.';
  }

  if (position === 'Dealer' && exp === 'Experienced Dealer') {
    return 'You have completed the Hiring Portal process for the Dealer position, including the Initial Screening, Math Exam, Table Test, and Final Interview stages. Please follow the next instructions provided by the final interviewer.<br><br>For application monitoring purposes, please create your ' + darwinbox + ' account, complete all required information, and select the position you applied for today.';
  }

  if (position === 'Pit Supervisor') {
    return 'You have completed the Hiring Portal process for the Pit Supervisor position, including the Initial Screening and Final Interview stages. Please follow the next instructions provided by the final interviewer.<br><br>For application monitoring purposes, please create your ' + darwinbox + ' account, complete all required information, and select the position you applied for today.';
  }

  if (position === 'Pit Manager') {
    return 'You have completed the Hiring Portal process for the Pit Manager position, including the Initial Screening and Final Interview stages. Please follow the next instructions provided by the final interviewer.<br><br>For application monitoring purposes, please create your ' + darwinbox + ' account, complete all required information, and select the position you applied for today.';
  }

  if (position === 'Operations Manager') {
    return 'You have completed the Hiring Portal process for the Operations Manager position, including the Initial Screening and Final Interview stages. Please follow the next instructions provided by the final interviewer.<br><br>For application monitoring purposes, please create your ' + darwinbox + ' account, complete all required information, and select the position you applied for today.';
  }

  return 'You have completed the Hiring Portal process for your selected position. Please follow the next instructions provided by the final interviewer.<br><br>For application monitoring purposes, please create your ' + darwinbox + ' account, complete all required information, and select the position you applied for today.';
}

function getStageInstruction_(positionApplied, experienceLevel, stageName) {
  const position = String(positionApplied || '').trim();
  const exp = String(experienceLevel || '').trim();
  const stage = String(stageName || '').trim();

  if (stage === 'Initial Screening') {
    return 'Please proceed to the holding area and wait for your number to be called. Ensure you keep your queue number for reference.';
  }

  if (stage === 'Math Exam') {
    return 'Please proceed to the Math Exam Area.';
  }

  if (stage === 'Table Test') {
    return 'Please proceed to the Table Test Area.';
  }

  if (stage === 'Final Interview') {
    return 'Please proceed to the Final Interview area.';
  }

  if (stage === 'Completed') {
    return getCompletedStageInstruction_(position, exp);
  }

  return 'Please wait for the next instruction from the hiring team.';
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function buildDisplayName_(lastName, firstName, middleName) {
  const mi = String(middleName || '').trim() ? (' ' + String(middleName || '').trim().charAt(0).toUpperCase() + '.') : '';
  return [String(lastName || '').trim() + ',', String(firstName || '').trim() + mi].filter(Boolean).join(' ').trim();
}

function mapApplicantRow(row) {
  return {
    applicantId: row[0] || '',
    referenceNo: row[1] || '',
    lastName: row[2] || '',
    firstName: row[3] || '',
    middleName: row[4] || '',
    birthdate: formatDateOnly_(row[5]),
    age: row[6] || '',
    gender: row[7] || '',
    contactNumber: row[8] || '',
    emailAddress: row[9] || '',
    heightCm: row[10] || '',
    weightKg: row[11] || '',
    bmiValue: row[12] || '',
    positionApplied: row[13] || '',
    experienceLevel: row[14] || '',
    currentCompanyName: row[15] || '',
    currentPosition: row[16] || '',
    previousCompanyName: row[17] || '',
    preferredDepartment: row[18] || '',
    currentlyEmployed: row[19] || '',
    currentStage: row[21] || '',
    applicationStatus: row[22] || '',
    overallResult: row[23] || '',
    createdAt: formatDateTime_(row[24]),
    updatedAt: formatDateTime_(row[25]),
    displayName: buildDisplayName_(row[2], row[3], row[4])
  };
}

function findApplicantRowByReference_(referenceNo) {
  referenceNo = String(referenceNo || '').trim();
  if (!referenceNo) return null;
  const sh = getApplicantsSheet();
  if (sh.getLastRow() < 2) return null;
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, APPLICANT_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1] || '').trim() === referenceNo) return { rowIndex: i + 2, row: values[i] };
  }
  return null;
}

function getApplicantStageRows_(referenceNo) {
  const rows = getSheetValues_(getStageResultsSheet());
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[1] || '').trim() === String(referenceNo || '').trim()) {
      list.push({
        applicantId: row[0] || '',
        referenceNo: row[1] || '',
        stageName: row[2] || '',
        stageSequence: row[3] || '',
        resultStatus: row[4] || '',
        currentStageLabel: row[5] || '',
        nextStep: row[6] || '',
        heightCm: row[7] || '',
        weightKg: row[8] || '',
        bmiValue: row[9] || '',
        bmiResult: row[10] || '',
        colorBlindResult: row[11] || '',
        visibleTattoo: row[12] || '',
        invisibleTattoo: row[13] || '',
        sweatyPalmResult: row[14] || '',
        score: row[15] || '',
        passingScore: row[16] || '',
        maxScore: row[17] || '',
        remarks: row[18] || '',
        evaluatedBy: row[19] || '',
        evaluatedAt: formatDateTime_(row[20])
      });
    }
  }
  list.sort(function(a, b){
    const sd = Number(a.stageSequence || 0) - Number(b.stageSequence || 0);
    if (sd !== 0) return sd;
    return String(a.evaluatedAt || '').localeCompare(String(b.evaluatedAt || ''));
  });
  return list;
}

function getLatestStageMapByReference_(referenceNo) {
  const rows = getApplicantStageRows_(referenceNo);
  const map = {};

  rows.forEach(function(r) {
    const key = String(r.stageName || '').trim();
    if (!key) return;

    if (!map[key]) {
      map[key] = r;
      return;
    }

    const prevSeq = Number(map[key].stageSequence || 0);
    const currSeq = Number(r.stageSequence || 0);
    if (currSeq > prevSeq || (currSeq === prevSeq && String(r.evaluatedAt || '') > String(map[key].evaluatedAt || ''))) {
      map[key] = r;
    }
  });

  return map;
}

function validateStageSequenceBeforeSave_(applicant, stageName, referenceNo) {
  const stages = getApplicantStages_(applicant.positionApplied, applicant.experienceLevel);
  const targetIndex = stages.indexOf(String(stageName || '').trim());
  if (targetIndex < 0) throw new Error('Stage is not valid for this applicant.');

  const stageMap = getLatestStageMapByReference_(referenceNo);
  for (let i = 0; i < targetIndex; i++) {
    const requiredStage = stages[i];
    if (!stageMap[requiredStage]) {
      throw new Error('Cannot save "' + stageName + '" because the prior stage "' + requiredStage + '" has no saved result yet.');
    }
  }
}

function getApplicantProgressStateFromStages_(applicant) {
  const stages = getApplicantStages_(applicant.positionApplied, applicant.experienceLevel);
  const stageMap = getLatestStageMapByReference_(applicant.referenceNo);

  let lastCompletedIndex = -1;
  for (let i = 0; i < stages.length; i++) {
    if (stageMap[stages[i]]) {
      lastCompletedIndex = i;
    } else {
      break;
    }
  }

  if (lastCompletedIndex === -1) {
    return {
      currentStage: stages[0] || 'Initial Screening',
      applicationStatus: 'Pending',
      overallResult: ''
    };
  }

  const lastCompletedStage = stages[lastCompletedIndex];
  if (lastCompletedStage === 'Final Interview') {
    const finalRecord = stageMap['Final Interview'] || {};
    const finalResult = normalizeFinalInterviewResult_(finalRecord.resultStatus || '');
    return {
      currentStage: 'Completed',
      applicationStatus: finalResult || 'Completed',
      overallResult: finalResult || ''
    };
  }

  return {
    currentStage: stages[lastCompletedIndex + 1] || 'Completed',
    applicationStatus: 'Ongoing',
    overallResult: ''
  };
}

function repairApplicantStageConsistency_(adminPassword) {
  ensureSystemReady_();
  if (!validateAdminPassword(adminPassword)) throw new Error('Invalid admin password.');

  const sh = getApplicantsSheet();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { scanned: 0, updated: 0 };

  const values = sh.getRange(2, 1, lastRow - 1, APPLICANT_HEADERS.length).getValues();
  const now = new Date();
  let updated = 0;

  values.forEach(function(row, idx) {
    const applicant = mapApplicantRow(row);
    const state = getApplicantProgressStateFromStages_(applicant);

    const currentStageCol = String(row[21] || '').trim();
    const applicationStatusCol = String(row[22] || '').trim();
    const overallResultCol = String(row[23] || '').trim();

    if (currentStageCol !== String(state.currentStage || '').trim() ||
        applicationStatusCol !== String(state.applicationStatus || '').trim() ||
        overallResultCol !== String(state.overallResult || '').trim()) {
      const rowIndex = idx + 2;
      sh.getRange(rowIndex, 22).setValue(state.currentStage);
      sh.getRange(rowIndex, 23).setValue(state.applicationStatus);
      sh.getRange(rowIndex, 24).setValue(state.overallResult);
      sh.getRange(rowIndex, 26).setValue(now);
      updated++;
    }
  });

  SpreadsheetApp.flush();
  clearDashboardCache_();
  return { scanned: values.length, updated: updated };
}

function getApplicantNotifications_(referenceNo, visibleOnly) {
  const rows = getSheetValues_(getNotificationsSheet());
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[1] || '').trim() !== String(referenceNo || '').trim()) continue;
    if (visibleOnly && String(row[5] || '').trim() !== 'Yes') continue;
    list.push({
      applicantId: row[0] || '',
      referenceNo: row[1] || '',
      stageName: row[2] || '',
      resultStatus: row[3] || '',
      notificationMessage: row[4] || '',
      visibleToApplicant: row[5] || '',
      createdAt: formatDateTime_(row[6]),
      createdBy: row[7] || ''
    });
  }
  list.sort(function(a, b){ return String(a.createdAt || '').localeCompare(String(b.createdAt || '')); });
  return list;
}

function submitApplication(data) {
  ensureSystemReady_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!data || typeof data !== 'object') throw new Error('Application data is missing.');

    const required = ['lastName','firstName','birthdate','gender','contactNumber','emailAddress','heightCm','weightKg','positionApplied','currentlyEmployed'];
    required.forEach(function(field){
      if (!String(data[field] || '').trim()) throw new Error('Missing required field: ' + field);
    });

    const positionApplied = String(data.positionApplied || '').trim();
    if (!POSITIONS.includes(positionApplied)) throw new Error('Invalid position applied for.');

    let experienceLevel = String(data.experienceLevel || '').trim();
    if (positionApplied === 'Dealer') {
      if (!EXPERIENCE_LEVELS.includes(experienceLevel)) throw new Error('Dealer Experience Level is required for Dealer applicants.');
    } else {
      experienceLevel = '-';
    }

    const games = Array.isArray(data.games) ? data.games.filter(function(g){ return ALLOWED_GAMES.includes(String(g || '').trim()); }) : [];
    if (positionApplied === 'Dealer' && experienceLevel === 'Experienced Dealer' && games.length < 2) {
      throw new Error('Experienced Dealer must select at least 2 games. If only one or none, select Non-Experienced Dealer.');
    }

    if (!isValidEmail_(data.emailAddress)) throw new Error('Please enter a valid email address.');

    const normalizedBirthdate = normalizeDateValue(data.birthdate);
    if (!normalizedBirthdate) throw new Error('Date of Birth is required.');

    const age = computeAge(normalizedBirthdate);
    if (age === '' || Number(age) < 18) throw new Error('Invalid Date of Birth.');

    const heightCm = Number(data.heightCm || 0);
    const weightKg = Number(data.weightKg || 0);
    if (!heightCm || !weightKg) throw new Error('Height and Weight are required.');
    const bmiValue = computeBMI(heightCm, weightKg);

    const currentlyEmployed = String(data.currentlyEmployed || '').trim();
    if (!['Yes','No'].includes(currentlyEmployed)) throw new Error('Currently Employed must be Yes or No.');

    const currentCompanyName = currentlyEmployed === 'Yes' ? String(data.currentCompanyName || '').trim() : '';
    const currentPosition = currentlyEmployed === 'Yes' ? String(data.currentPosition || '').trim() : '';
    const previousCompanyName = currentlyEmployed === 'No' ? String(data.previousCompanyName || '').trim() : '';

    if (currentlyEmployed === 'Yes' && !currentCompanyName) throw new Error('Current company name is required.');
    if (currentlyEmployed === 'Yes' && !currentPosition) throw new Error('Current position is required.');
    if (currentlyEmployed === 'No' && !previousCompanyName) throw new Error('Previous company is required. Put N/A if not applicable.');

    const preferredDepartment = PREFERRED_POSITIONS.includes(String(data.preferredDepartment || '').trim())
      ? String(data.preferredDepartment || '').trim()
      : '';

    const duplicateKey = buildDuplicateKey({
      lastName: data.lastName,
      firstName: data.firstName,
      middleName: data.middleName,
      birthdate: normalizedBirthdate,
      contactNumber: data.contactNumber
    });

    const existingRows = getSheetValues_(getApplicantsSheet());
    for (let i = 1; i < existingRows.length; i++) {
      if (String(existingRows[i][20] || '').trim() === duplicateKey) {
        throw new Error('Application already exists. Applicant may only submit once.');
      }
    }

    const applicantId = generateApplicantId();
    const referenceNo = generateReferenceNo();
    const now = new Date();
    const initialStage = 'Initial Screening';

    getApplicantsSheet().appendRow([
      applicantId,
      referenceNo,
      String(data.lastName || '').trim(),
      String(data.firstName || '').trim(),
      String(data.middleName || '').trim(),
      normalizedBirthdate,
      age,
      String(data.gender || '').trim(),
      String(data.contactNumber || '').trim(),
      String(data.emailAddress || '').trim(),
      heightCm,
      weightKg,
      bmiValue,
      positionApplied,
      experienceLevel,
      currentCompanyName,
      currentPosition,
      previousCompanyName,
      preferredDepartment,
      currentlyEmployed,
      duplicateKey,
      initialStage,
      'Pending',
      '',
      now,
      now
    ]);

    if (positionApplied === 'Dealer' && experienceLevel === 'Experienced Dealer') {
      games.forEach(function(game) {
        getGamesSheet().appendRow([applicantId, referenceNo, game]);
      });
    }

    getNotificationsSheet().appendRow([
      applicantId,
      referenceNo,
      initialStage,
      'Pending',
      getStageInstruction_(positionApplied, experienceLevel, initialStage),
      'Yes',
      now,
      'System'
    ]);

    SpreadsheetApp.flush();
    clearDashboardCache_();

    return {
      success: true,
      applicantId: applicantId,
      referenceNo: referenceNo,
      currentStage: initialStage,
      message: 'Application submitted successfully.'
    };
  } finally {
    lock.releaseLock();
  }
}

function getApplicantStatus(referenceNo, birthdate) {
  ensureSystemReady_();
  referenceNo = String(referenceNo || '').trim();
  birthdate = normalizeDateValue(birthdate);
  if (!referenceNo) throw new Error('Reference number is required.');
  if (!birthdate) throw new Error('Date of Birth is required.');

  const found = findApplicantRowByReference_(referenceNo);
  if (!found || !found.row) throw new Error('No application found.');
  if (normalizeDateValue(found.row[5]) !== birthdate) throw new Error('No application found.');

  const applicant = mapApplicantRow(found.row);
  const stages = getApplicantStageRows_(referenceNo);
  const notifications = getApplicantNotifications_(referenceNo, true);
  const roadmapStages = getApplicantStages_(applicant.positionApplied, applicant.experienceLevel);
  const currentStage = applicant.currentStage || roadmapStages[0] || 'Initial Screening';

  const roadmap = roadmapStages.map(function(stageName, idx){
    let state = 'pending';
    const stageRecord = stages.find(function(s){ return s.stageName === stageName; });
    if (stageRecord) state = 'done';
    if (stageName === currentStage) state = 'current';
    return {
      stageName: stageName,
      sequence: idx + 1,
      state: state,
      note: ''
    };
  });

  if (currentStage === 'Completed' && roadmap.length) {
    roadmap[roadmap.length - 1].state = 'done';
  }

  const currentInstruction = currentStage === 'Completed'
    ? getCompletedStageInstruction_(applicant.positionApplied, applicant.experienceLevel)
    : getStageInstruction_(applicant.positionApplied, applicant.experienceLevel, currentStage);

  return {
    applicant: applicant,
    stages: stages,
    notifications: notifications,
    roadmap: roadmap,
    currentInstruction: currentInstruction,
    latestNotification: notifications.length ? notifications[notifications.length - 1].notificationMessage : currentInstruction
  };
}

function getApplicantByReference(referenceNo, adminPassword) {
  if (!validateAdminPassword(adminPassword)) throw new Error('Invalid admin password.');
  referenceNo = String(referenceNo || '').trim();
  const cached = cacheGetJson_(getApplicantAdminCacheKey_(referenceNo));
  if (cached) return cached;
  const found = findApplicantRowByReference_(referenceNo);
  if (!found || !found.row) throw new Error('Reference number not found.');
  const applicant = mapApplicantRow(found.row);
  const gamesRows = getSheetValues_(getGamesSheet());
  const games = [];
  for (let i = 1; i < gamesRows.length; i++) {
    if (String(gamesRows[i][1] || '').trim() === applicant.referenceNo) games.push(gamesRows[i][2]);
  }
  applicant.games = games;
  applicant.stages = getApplicantStageRows_(referenceNo);
  cachePutJson_(getApplicantAdminCacheKey_(referenceNo), applicant, APPLICANT_CACHE_TTL);
  return applicant;
}

function upsertNotification_(applicantId, referenceNo, stageName, resultStatus, message, visibleToApplicant, createdBy, now) {
  const sh = getNotificationsSheet();
  const rows = getSheetValues_(sh);
  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1] || '').trim() === String(referenceNo || '').trim() && String(rows[i][2] || '').trim() === String(stageName || '').trim()) {
      existingRow = i + 1;
      break;
    }
  }

  const values = [applicantId, referenceNo, stageName, resultStatus, message, visibleToApplicant ? 'Yes' : 'No', now, createdBy || 'System'];
  if (existingRow > -1) {
    sh.getRange(existingRow, 1, 1, 8).setValues([values]);
  } else {
    sh.appendRow(values);
  }
}

function buildApplicantNotificationMessage_(applicant, stageName, nextStage) {
  if (String(nextStage || '').trim() === 'Completed') {
    return getCompletedStageInstruction_(applicant.positionApplied, applicant.experienceLevel);
  }
  return getStageInstruction_(applicant.positionApplied, applicant.experienceLevel, nextStage || stageName);
}

function upsertStageResultCore_(options) {
  ensureSystemReady_();

  const referenceNo = String(options.referenceNo || '').trim();
  const stageName = String(options.stageName || '').trim();
  if (!referenceNo) throw new Error('Reference number is required.');
  if (!stageName) throw new Error('Stage name is required.');

  const found = findApplicantRowByReference_(referenceNo);
  if (!found || !found.row) throw new Error('Reference number not found.');
  const applicant = mapApplicantRow(found.row);
  validateStageSequenceBeforeSave_(applicant, stageName, referenceNo);
  const applicantId = applicant.applicantId;
  const now = options.now || new Date();
  const evaluatedBy = String(options.evaluatedBy || 'HR').trim() || 'HR';
  const stageSequence = getStageSequence(stageName, applicant.positionApplied, applicant.experienceLevel);
  if (!stageSequence) throw new Error('Stage is not valid for this applicant.');

  let resultStatus = String(options.resultStatus || '').trim();
  let bmiResult = String(options.bmiResult || '').trim();
  let colorBlindResult = String(options.colorBlindResult || '').trim();
  let visibleTattoo = String(options.visibleTattoo || '').trim();
  let invisibleTattoo = String(options.invisibleTattoo || '').trim();
  let sweatyPalmResult = String(options.sweatyPalmResult || '').trim();
  let score = options.score === '' || options.score === null || options.score === undefined ? '' : Number(options.score);
  let passingScore = options.passingScore === '' || options.passingScore === null || options.passingScore === undefined ? '' : Number(options.passingScore);
  let maxScore = options.maxScore === '' || options.maxScore === null || options.maxScore === undefined ? '' : Number(options.maxScore);
  let heightCm = applicant.heightCm;
  let weightKg = applicant.weightKg;
  let bmiValue = applicant.bmiValue;
  const remarks = String(options.remarks || '').trim();

  if (stageName === 'Initial Screening') {
    if (!['Passed','Failed'].includes(resultStatus)) throw new Error('Initial Screening Result must be Passed or Failed.');
    if (!['Passed','Failed'].includes(String(bmiResult || '').trim())) throw new Error('BMI Result must be Passed or Failed.');
    if (['Dealer','Pit Supervisor'].includes(applicant.positionApplied) && !['Passed','Failed'].includes(String(colorBlindResult || '').trim())) {
      throw new Error('Color Blind Test must be Passed or Failed.');
    }
    if (!['Yes','No'].includes(visibleTattoo)) throw new Error('With Visible Tattoo must be Yes or No.');
    if (!['Yes','No'].includes(invisibleTattoo)) throw new Error('With Invisible Tattoo must be Yes or No.');
  }

  if (stageName === 'Math Exam') {
    if (applicant.positionApplied !== 'Dealer') {
      throw new Error('Math Exam is for Dealer applicants only.');
    }
    if (isNaN(score)) throw new Error('Math Exam score is required.');
    passingScore = isNaN(passingScore) ? PASSING_SCORE : passingScore;
    maxScore = isNaN(maxScore) ? MAX_MATH_EXAM_SCORE : maxScore;
    resultStatus = score >= passingScore ? 'Passed' : 'Failed';
  }

  if (stageName === 'Table Test') {
    if (applicant.positionApplied !== 'Dealer' || applicant.experienceLevel !== 'Experienced Dealer') {
      throw new Error('Table Test is for Experienced Dealer only.');
    }
    if (!['Passed','Failed'].includes(resultStatus)) throw new Error('Table Test Result must be Passed or Failed.');
  }

  if (stageName === 'Final Interview') {
    resultStatus = normalizeFinalInterviewResult_(resultStatus);
    if (!FINAL_INTERVIEW_RESULTS.includes(resultStatus)) throw new Error('Final Interview Result is invalid.');
    if (applicant.positionApplied === 'Dealer' && !['Passed','Failed'].includes(sweatyPalmResult)) {
      throw new Error('Sweaty Palm Test must be Passed or Failed for Dealer applicants.');
    }
  }

  const nextStage = getNextStage_(applicant.positionApplied, applicant.experienceLevel, stageName);
  const stateAfterSave = stageName === 'Final Interview'
    ? { currentStage: 'Completed', applicationStatus: resultStatus, overallResult: resultStatus }
    : { currentStage: nextStage, applicationStatus: 'Ongoing', overallResult: '' };
  const newCurrentStage = stateAfterSave.currentStage;
  const newApplicationStatus = stateAfterSave.applicationStatus;
  const newOverallResult = stateAfterSave.overallResult;

  const currentStageLabel = newCurrentStage === 'Completed' ? 'Completed' : newCurrentStage;
  const nextStep = newCurrentStage === 'Completed'
    ? getCompletedStageInstruction_(applicant.positionApplied, applicant.experienceLevel)
    : getStageInstruction_(applicant.positionApplied, applicant.experienceLevel, newCurrentStage);
  const message = buildApplicantNotificationMessage_(applicant, stageName, newCurrentStage);

  const sh = getStageResultsSheet();
  const rows = getSheetValues_(sh);
  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1] || '').trim() === referenceNo && String(rows[i][2] || '').trim() === stageName) {
      existingRow = i + 1;
      break;
    }
  }

  const values = [
    applicantId, referenceNo, stageName, stageSequence, resultStatus, currentStageLabel, nextStep,
    heightCm, weightKg, bmiValue, bmiResult, colorBlindResult, visibleTattoo, invisibleTattoo,
    sweatyPalmResult, score, passingScore, maxScore, remarks, evaluatedBy, now
  ];

  if (existingRow > -1) {
    sh.getRange(existingRow, 1, 1, STAGE_RESULT_HEADERS.length).setValues([values]);
  } else {
    sh.appendRow(values);
  }

  upsertNotification_(applicantId, referenceNo, stageName, resultStatus, message, true, evaluatedBy, now);

  const appSheet = getApplicantsSheet();
  appSheet.getRange(found.rowIndex, 22).setValue(newCurrentStage);
  appSheet.getRange(found.rowIndex, 23).setValue(newApplicationStatus);
  appSheet.getRange(found.rowIndex, 24).setValue(newOverallResult);
  appSheet.getRange(found.rowIndex, 26).setValue(now);

  SpreadsheetApp.flush();
  clearDashboardCache_();
  clearApplicantAdminCache_(referenceNo);

  return {
    success: true,
    referenceNo: referenceNo,
    stageName: stageName,
    stageSequence: stageSequence,
    resultStatus: resultStatus,
    nextStep: nextStep,
    currentStage: newCurrentStage,
    applicationStatus: newApplicationStatus,
    bmiValue: bmiValue,
    score: score,
    passingScore: passingScore,
    maxScore: maxScore,
    updatedExisting: existingRow > -1,
    message: message
  };
}

function updateStageResult(payload) {
  ensureSystemReady_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload || typeof payload !== 'object') throw new Error('Update payload is missing.');
    if (!validateAdminPassword(payload.adminPassword)) throw new Error('Invalid admin password.');
    return upsertStageResultCore_({
      referenceNo: payload.referenceNo,
      stageName: payload.stageName,
      resultStatus: payload.resultStatus,
      bmiResult: payload.bmiResult,
      colorBlindResult: payload.colorBlindResult,
      visibleTattoo: payload.visibleTattoo,
      invisibleTattoo: payload.invisibleTattoo,
      sweatyPalmResult: payload.sweatyPalmResult,
      score: payload.score,
      passingScore: payload.passingScore,
      maxScore: payload.maxScore,
      remarks: payload.remarks,
      evaluatedBy: payload.evaluatedBy,
      now: new Date()
    });
  } finally {
    lock.releaseLock();
  }
}

function getDashboardData(adminPassword) {
  ensureSystemReady_();
  if (!validateAdminPassword(adminPassword)) throw new Error('Invalid admin password.');

  const cached = cacheGetJson_(DASHBOARD_CACHE_KEY);
  if (cached) return cached;

  const applicantsRows = getSheetValues_(getApplicantsSheet());
  const applicants = [];
  const summary = {
    totalApplicants: 0,
    pendingApplicants: 0,
    ongoingApplicants: 0,
    qualifiedApplicants: 0,
    reprofileApplicants: 0,
    poolingApplicants: 0,
    failedApplicants: 0,
    dealer: { total: 0, nonExperienced: 0, experienced: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    pitSupervisor: { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    pitManager: { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    operationsManager: { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    mathExam: { taken: 0, pending: 0, passed: 0, failed: 0 },
    tableTest: { taken: 0, pending: 0, passed: 0, failed: 0 }
  };

  const statusMap = {
    'Pending': 'pending',
    'Ongoing': 'ongoing',
    'Passed': 'qualified',
    'Qualified': 'qualified',
    'Reprofile': 'reprofile',
    'Pooling': 'pooling',
    'For Pooling': 'pooling',
    'Failed': 'failed',
    'Not Recommended': 'failed'
  };

  function bumpPositionSummary(bucketName, applicant) {
    if (!bucketName || !summary[bucketName]) return;
    summary[bucketName].total++;
    const key = statusMap[String(applicant.applicationStatus || '').trim()] || '';
    if (key && summary[bucketName][key] !== undefined) {
      summary[bucketName][key]++;
    }
  }

  for (let i = 1; i < applicantsRows.length; i++) {
    const row = applicantsRows[i];
    if (!row || !row[1]) continue;

    const app = mapApplicantRow(row);
    applicants.push(app);

    summary.totalApplicants++;
    if (app.applicationStatus === 'Pending') summary.pendingApplicants++;
    if (app.applicationStatus === 'Ongoing') summary.ongoingApplicants++;
    if (app.applicationStatus === 'Qualified' || app.applicationStatus === 'Passed') summary.qualifiedApplicants++;
    if (app.applicationStatus === 'Reprofile') summary.reprofileApplicants++;
    if (app.applicationStatus === 'Pooling' || app.applicationStatus === 'For Pooling') summary.poolingApplicants++;
    if (app.applicationStatus === 'Failed' || app.applicationStatus === 'Not Recommended') summary.failedApplicants++;

    if (app.positionApplied === 'Dealer') {
      bumpPositionSummary('dealer', app);
      if (app.experienceLevel === 'Non-Experienced Dealer') summary.dealer.nonExperienced++;
      if (app.experienceLevel === 'Experienced Dealer') summary.dealer.experienced++;
    } else if (app.positionApplied === 'Pit Supervisor') {
      bumpPositionSummary('pitSupervisor', app);
    } else if (app.positionApplied === 'Pit Manager') {
      bumpPositionSummary('pitManager', app);
    } else if (app.positionApplied === 'Operations Manager') {
      bumpPositionSummary('operationsManager', app);
    }
  }

  const stageRows = getSheetValues_(getStageResultsSheet());
  const mathRefsTaken = {};
  const tableRefsTaken = {};
  const latestRemarksByRef = {};
  const stageDataByRef = {};

  function shouldReplaceStageRecord_(prev, candidate) {
    if (!prev) return true;
    if (Number(candidate.stageSequence || 0) !== Number(prev.stageSequence || 0)) {
      return Number(candidate.stageSequence || 0) > Number(prev.stageSequence || 0);
    }
    return String(candidate.evaluatedAt || '') > String(prev.evaluatedAt || '');
  }

  for (let i = 1; i < stageRows.length; i++) {
    const row = stageRows[i];
    const ref = String(row[1] || '').trim();
    const stageName = String(row[2] || '').trim();
    const resultStatus = String(row[4] || '').trim();
    const stageSequence = Number(row[3] || 0);
    const remarks = String(row[18] || '').trim();
    const evaluatedAt = formatDateTime_(row[20]);

    if (!stageDataByRef[ref]) stageDataByRef[ref] = {};
    const candidateStageRecord = {
      stageName: stageName,
      stageSequence: stageSequence,
      resultStatus: resultStatus,
      bmiResult: String(row[10] || '').trim(),
      colorBlindResult: String(row[11] || '').trim(),
      visibleTattoo: String(row[12] || '').trim(),
      invisibleTattoo: String(row[13] || '').trim(),
      sweatyPalmResult: String(row[14] || '').trim(),
      score: row[15] || '',
      passingScore: row[16] || '',
      maxScore: row[17] || '',
      remarks: remarks,
      evaluatedAt: evaluatedAt
    };
    if (shouldReplaceStageRecord_(stageDataByRef[ref][stageName], candidateStageRecord)) {
      stageDataByRef[ref][stageName] = candidateStageRecord;
    }

    if (stageName === 'Math Exam') {
      mathRefsTaken[ref] = true;
      summary.mathExam.taken++;
      if (resultStatus === 'Passed') summary.mathExam.passed++;
      if (resultStatus === 'Failed') summary.mathExam.failed++;
    }

    if (stageName === 'Table Test') {
      tableRefsTaken[ref] = true;
      summary.tableTest.taken++;
      if (resultStatus === 'Passed') summary.tableTest.passed++;
      if (resultStatus === 'Failed') summary.tableTest.failed++;
    }

    if (remarks) {
      const prev = latestRemarksByRef[ref];
      const candidate = {
        remarks: remarks,
        stageName: stageName,
        stageSequence: stageSequence,
        evaluatedAt: evaluatedAt,
        priority: stageName === 'Final Interview' ? 2 : 1
      };
      if (!prev ||
          candidate.priority > prev.priority ||
          (candidate.priority === prev.priority && candidate.stageSequence > prev.stageSequence) ||
          (candidate.priority === prev.priority && candidate.stageSequence === prev.stageSequence && String(candidate.evaluatedAt || '') > String(prev.evaluatedAt || ''))) {
        latestRemarksByRef[ref] = candidate;
      }
    }
  }

  applicants.forEach(function(app) {
    const remarkRecord = latestRemarksByRef[app.referenceNo];
    const stageData = stageDataByRef[app.referenceNo] || {};
    const initial = stageData['Initial Screening'] || {};
    const math = stageData['Math Exam'] || {};
    const table = stageData['Table Test'] || {};
    const finalInterview = stageData['Final Interview'] || {};

    app.remarks = remarkRecord ? remarkRecord.remarks : '';
    app.remarksStage = remarkRecord ? remarkRecord.stageName : '';
    app.initialScreeningResult = initial.resultStatus || '';
    app.bmiResult = initial.bmiResult || '';
    app.colorBlindResult = initial.colorBlindResult || '';
    app.visibleTattoo = initial.visibleTattoo || '';
    app.invisibleTattoo = initial.invisibleTattoo || '';
    app.mathExamResult = math.resultStatus || '';
    app.tableTestResult = table.resultStatus || '';
    app.finalInterviewResult = finalInterview.resultStatus || '';
    app.sweatyPalmResult = finalInterview.sweatyPalmResult || '';

    if (app.positionApplied === 'Dealer' && app.experienceLevel === 'Non-Experienced Dealer' && !mathRefsTaken[app.referenceNo]) {
      summary.mathExam.pending++;
    }
    if (app.positionApplied === 'Dealer' && app.experienceLevel === 'Experienced Dealer' && !tableRefsTaken[app.referenceNo]) {
      summary.tableTest.pending++;
    }
  });

  applicants.sort(function(a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  const dashboardPayload = { summary: summary, applicants: applicants };
  cachePutJson_(DASHBOARD_CACHE_KEY, dashboardPayload, DASHBOARD_CACHE_TTL);
  return dashboardPayload;
}


function buildDashboardSummaryFromApplicants_(applicants, startDate, endDate) {
  const rows = (Array.isArray(applicants) ? applicants : []).filter(function(app) {
    const createdDate = String(app.createdAt || '').slice(0, 10);
    return (!startDate || createdDate >= startDate) && (!endDate || createdDate <= endDate);
  });

  const summary = {
    totalApplicants: 0,
    pendingApplicants: 0,
    ongoingApplicants: 0,
    qualifiedApplicants: 0,
    reprofileApplicants: 0,
    poolingApplicants: 0,
    failedApplicants: 0,
    dealer: { total: 0, nonExperienced: 0, experienced: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    pitSupervisor: { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    pitManager: { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    operationsManager: { total: 0, pending: 0, ongoing: 0, qualified: 0, reprofile: 0, pooling: 0, failed: 0 },
    mathExam: { taken: 0, pending: 0, passed: 0, failed: 0 },
    tableTest: { taken: 0, pending: 0, passed: 0, failed: 0 },
    gender: {
      dealerNonExpMale: 0, dealerNonExpFemale: 0,
      dealerExpMale: 0, dealerExpFemale: 0,
      pitSupervisorMale: 0, pitSupervisorFemale: 0,
      pitManagerMale: 0, pitManagerFemale: 0,
      operationsManagerMale: 0, operationsManagerFemale: 0
    },
    ageBands: { twenties: 0, thirties: 0, forties: 0, fiftyPlus: 0 }
  };

  function bumpStatus(bucket, status) {
    if (!bucket) return;
    if (status === 'Pending') bucket.pending++;
    else if (status === 'Ongoing') bucket.ongoing++;
    else if (status === 'Qualified' || status === 'Passed') bucket.qualified++;
    else if (status === 'Reprofile') bucket.reprofile++;
    else if (status === 'For Pooling' || status === 'Pooling') bucket.pooling++;
    else if (status === 'Not Recommended' || status === 'Failed') bucket.failed++;
  }

  rows.forEach(function(app) {
    const status = String(app.applicationStatus || '').trim();
    const gender = String(app.gender || '').trim().toLowerCase();
    const age = Number(app.age || 0);

    summary.totalApplicants++;
    if (status === 'Pending') summary.pendingApplicants++;
    if (status === 'Ongoing') summary.ongoingApplicants++;
    if (status === 'Qualified' || status === 'Passed') summary.qualifiedApplicants++;
    if (status === 'Reprofile') summary.reprofileApplicants++;
    if (status === 'For Pooling' || status === 'Pooling') summary.poolingApplicants++;
    if (status === 'Not Recommended' || status === 'Failed') summary.failedApplicants++;

    if (app.positionApplied === 'Dealer') {
      summary.dealer.total++;
      if (app.experienceLevel === 'Non-Experienced Dealer') summary.dealer.nonExperienced++;
      if (app.experienceLevel === 'Experienced Dealer') summary.dealer.experienced++;
      bumpStatus(summary.dealer, status);
      if (gender === 'male' && app.experienceLevel === 'Non-Experienced Dealer') summary.gender.dealerNonExpMale++;
      if (gender === 'female' && app.experienceLevel === 'Non-Experienced Dealer') summary.gender.dealerNonExpFemale++;
      if (gender === 'male' && app.experienceLevel === 'Experienced Dealer') summary.gender.dealerExpMale++;
      if (gender === 'female' && app.experienceLevel === 'Experienced Dealer') summary.gender.dealerExpFemale++;
      if (app.experienceLevel === 'Non-Experienced Dealer') {
        if (app.mathExamResult) {
          summary.mathExam.taken++;
          if (app.mathExamResult === 'Passed') summary.mathExam.passed++;
          if (app.mathExamResult === 'Failed') summary.mathExam.failed++;
        } else summary.mathExam.pending++;
      }
      if (app.experienceLevel === 'Experienced Dealer') {
        if (app.tableTestResult) {
          summary.tableTest.taken++;
          if (app.tableTestResult === 'Passed') summary.tableTest.passed++;
          if (app.tableTestResult === 'Failed') summary.tableTest.failed++;
        } else summary.tableTest.pending++;
      }
    } else if (app.positionApplied === 'Pit Supervisor') {
      summary.pitSupervisor.total++;
      bumpStatus(summary.pitSupervisor, status);
      if (gender === 'male') summary.gender.pitSupervisorMale++;
      if (gender === 'female') summary.gender.pitSupervisorFemale++;
    } else if (app.positionApplied === 'Pit Manager') {
      summary.pitManager.total++;
      bumpStatus(summary.pitManager, status);
      if (gender === 'male') summary.gender.pitManagerMale++;
      if (gender === 'female') summary.gender.pitManagerFemale++;
    } else if (app.positionApplied === 'Operations Manager') {
      summary.operationsManager.total++;
      bumpStatus(summary.operationsManager, status);
      if (gender === 'male') summary.gender.operationsManagerMale++;
      if (gender === 'female') summary.gender.operationsManagerFemale++;
    }

    if (age >= 20 && age <= 29) summary.ageBands.twenties++;
    else if (age >= 30 && age <= 39) summary.ageBands.thirties++;
    else if (age >= 40 && age <= 49) summary.ageBands.forties++;
    else if (age >= 50) summary.ageBands.fiftyPlus++;
  });

  return summary;
}

function getDashboardSummary(adminPassword, startDate, endDate) {
  const payload = getDashboardData(adminPassword);
  return buildDashboardSummaryFromApplicants_(payload.applicants || [], String(startDate || '').trim(), String(endDate || '').trim());
}

function getApplicantSummaryData(adminPassword) {
  const payload = getDashboardData(adminPassword);
  return { applicants: payload.applicants || [] };
}

function parseJsonSafe_(value) {
  try {
    if (!value) return {};
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
}

function normalizeAnswer_(value) {
  return String(value || '').trim().replace(/,/g, '').replace(/\s+/g, ' ').toLowerCase();
}

function getApplicantFromMainApplicants_(referenceNo) {
  const found = findApplicantRowByReference_(referenceNo);
  if (!found || !found.row) return null;
  const row = found.row;
  return {
    applicantId: String(row[0] || '').trim(),
    referenceNo: String(row[1] || '').trim(),
    lastName: String(row[2] || '').trim(),
    firstName: String(row[3] || '').trim(),
    middleName: String(row[4] || '').trim(),
    experienceLevel: String(row[14] || '').trim(),
    positionApplied: String(row[13] || '').trim(),
    currentStage: String(row[21] || '').trim(),
    applicationStatus: String(row[22] || '').trim(),
    overallResult: String(row[23] || '').trim()
  };
}

function getAttemptByReference_(referenceNo) {
  const sh = getMathResultSheet();
  if (!sh || sh.getLastRow() < 2) return null;
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, MATH_RESULT_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(referenceNo || '').trim()) {
      return { rowIndex: i + 2, row: values[i] };
    }
  }
  return null;
}

function getQuestionnaireGroupedBySet_() {
  const cached = cacheGetJson_(QUESTIONNAIRE_CACHE_KEY);
  if (cached) return cached;
  const sh = getQuestionnaireSheet();
  if (!sh) throw new Error('Questionnaire sheet not found.');
  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error('Questionnaire sheet has no questions.');
  const grouped = {};
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const setName = String(row[0] || '').trim();
    const question = String(row[2] || '').trim();
    if (!setName || !question) continue;
    if (!grouped[setName]) grouped[setName] = [];
    grouped[setName].push({
      questionNo: row[1],
      question: question,
      optionA: String(row[3] || '').trim(),
      optionB: String(row[4] || '').trim(),
      optionC: String(row[5] || '').trim(),
      optionD: String(row[6] || '').trim(),
      correctAnswerRaw: String(row[7] || '').trim()
    });
  }
  cachePutJson_(QUESTIONNAIRE_CACHE_KEY, grouped, QUESTIONNAIRE_CACHE_TTL);
  return grouped;
}

function shuffleArray_(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function buildShuffledQuestionSet_(setName, questions) {
  return questions.map(function(q, idx) {
    const originalChoices = [
      { label: 'A', text: String(q.optionA || '').trim() },
      { label: 'B', text: String(q.optionB || '').trim() },
      { label: 'C', text: String(q.optionC || '').trim() },
      { label: 'D', text: String(q.optionD || '').trim() }
    ];
    const shuffled = shuffleArray_(originalChoices);
    const raw = String(q.correctAnswerRaw || '').trim();
    const rawUpper = raw.toUpperCase();
    let originalCorrectLabel = '';
    let correctChoiceKey = '';

    if (['A','B','C','D'].includes(rawUpper)) {
      originalCorrectLabel = rawUpper;
    } else if (/^OPTION\s+[ABCD]$/i.test(raw)) {
      originalCorrectLabel = rawUpper.replace('OPTION ', '').trim();
    } else {
      const matched = originalChoices.find(function(choice){
        return normalizeAnswer_(choice.text) === normalizeAnswer_(raw);
      });
      if (matched) originalCorrectLabel = matched.label;
    }

    const displayChoices = shuffled.map(function(choice, choiceIndex){
      const key = String.fromCharCode(65 + choiceIndex);
      if (choice.label === originalCorrectLabel) correctChoiceKey = key;
      return { key: key, text: choice.text };
    });

    return {
      id: 'Q' + (idx + 1),
      questionNo: q.questionNo,
      question: q.question,
      choices: displayChoices,
      correctChoiceKey: correctChoiceKey
    };
  });
}

function sanitizeQuestionsForClient_(questions) {
  return questions.map(function(q){ return { id: q.id, questionNo: q.questionNo, question: q.question, choices: q.choices }; });
}

function getApplicantInfo(referenceNo) {
  ensureSystemReady_();
  referenceNo = String(referenceNo || '').trim();
  if (!referenceNo) throw new Error('Reference number is required.');
  const applicant = getApplicantFromMainApplicants_(referenceNo);
  if (!applicant) throw new Error('Reference number not found in Applicants sheet.');
  if (applicant.positionApplied !== 'Dealer') {
    throw new Error('Math Exam is for Dealer applicants only.');
  }
  if (['Failed','Not Recommended','Qualified','Reprofile','Pooling','For Pooling'].includes(applicant.applicationStatus)) {
    throw new Error('This applicant can no longer take the Math Exam.');
  }

  const existing = getAttemptByReference_(referenceNo);
  if (existing) {
    const status = String(existing.row[9] || '').trim();
    if (!status) {
      return {
        referenceNo: applicant.referenceNo,
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        middleName: applicant.middleName,
        alreadyTaken: false
      };
    }
    if (status !== 'IN_PROGRESS') {
      return {
        referenceNo: applicant.referenceNo,
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        middleName: applicant.middleName,
        alreadyTaken: true,
        finalScore: existing.row[4] || 0,
        finalStatus: existing.row[5] || 'Not Recommended',
        attemptStatus: status,
        terminationReason: formatTerminationReason_(existing.row[13] || '')
      };
    }
    finalizeAttempt_(referenceNo, {}, 'REOPENED_OR_LEFT_PAGE');
    const refreshed = getAttemptByReference_(referenceNo);
    return {
      referenceNo: applicant.referenceNo,
      lastName: applicant.lastName,
      firstName: applicant.firstName,
      middleName: applicant.middleName,
      alreadyTaken: true,
      finalScore: refreshed.row[4] || 0,
      finalStatus: refreshed.row[5] || 'Not Recommended',
      attemptStatus: refreshed.row[9] || 'AUTO_SUBMITTED',
      terminationReason: formatTerminationReason_(refreshed.row[13] || '')
    };
  }

  return {
    referenceNo: applicant.referenceNo,
    lastName: applicant.lastName,
    firstName: applicant.firstName,
    middleName: applicant.middleName,
    alreadyTaken: false
  };
}

function startExam(referenceNo) {
  ensureSystemReady_();
  referenceNo = String(referenceNo || '').trim();
  if (!referenceNo) throw new Error('Reference number is required.');

  const applicant = getApplicantFromMainApplicants_(referenceNo);
  if (!applicant) throw new Error('Reference number not found in Applicants sheet.');
  if (applicant.positionApplied !== 'Dealer') {
    throw new Error('Math Exam is for Dealer applicants only.');
  }
  if (['Failed','Not Recommended','Qualified','Reprofile','Pooling','For Pooling'].includes(applicant.applicationStatus)) {
    throw new Error('This applicant can no longer take the Math Exam.');
  }

  const existing = getAttemptByReference_(referenceNo);
  if (existing) {
    const status = String(existing.row[9] || '').trim();
    if (status) {
      if (status === 'IN_PROGRESS') {
        finalizeAttempt_(referenceNo, parseJsonSafe_(existing.row[10]), 'REOPENED_OR_LEFT_PAGE');
        const finalResult = getAttemptByReference_(referenceNo);
        return {
          alreadyTaken: true,
          referenceNo: referenceNo,
          score: finalResult.row[4] || 0,
          status: finalResult.row[5] || 'Not Recommended',
          attemptStatus: finalResult.row[9] || 'AUTO_SUBMITTED',
          terminationReason: formatTerminationReason_(finalResult.row[13] || '')
        };
      }
      return {
        alreadyTaken: true,
        referenceNo: referenceNo,
        score: existing.row[4] || 0,
        status: existing.row[5] || 'Not Recommended',
        attemptStatus: status,
        terminationReason: formatTerminationReason_(existing.row[13] || '')
      };
    }
  }

  const grouped = getQuestionnaireGroupedBySet_();
  const sets = Object.keys(grouped);
  if (!sets.length) throw new Error('No question sets found in Questionnaire sheet.');

  const assignedSet = sets[Math.floor(Math.random() * sets.length)];
  const fullQuestions = buildShuffledQuestionSet_(assignedSet, grouped[assignedSet]);
  const clientQuestions = sanitizeQuestionsForClient_(fullQuestions);
  const now = new Date();
  const sh = getMathResultSheet();

  let found = getAttemptByReference_(referenceNo);
  let rowIndex;
  let createdAt = now;
  if (found) {
    rowIndex = found.rowIndex;
    createdAt = found.row[15] || now;
  } else {
    sh.appendRow([referenceNo, applicant.lastName, applicant.firstName, applicant.middleName, '', '', '', '', '', '', '', '', '', '', '', now]);
    rowIndex = sh.getLastRow();
  }

  sh.getRange(rowIndex, 1, 1, MATH_RESULT_HEADERS.length).setValues([[referenceNo, applicant.lastName, applicant.firstName, applicant.middleName, '', '', assignedSet, now, '', 'IN_PROGRESS', JSON.stringify({}), JSON.stringify(fullQuestions), EXAM_DURATION_MINUTES, '', now, createdAt]]);

  SpreadsheetApp.flush();

  return {
    alreadyTaken: false,
    referenceNo: referenceNo,
    lastName: applicant.lastName,
    firstName: applicant.firstName,
    middleName: applicant.middleName,
    assignedSet: assignedSet,
    durationMinutes: EXAM_DURATION_MINUTES,
    passingScore: PASSING_SCORE,
    maxScore: MAX_MATH_EXAM_SCORE,
    questions: clientQuestions,
    serverStartedAt: formatDateTime_(now)
  };
}

function saveProgress(referenceNo, answers) {
  referenceNo = String(referenceNo || '').trim();
  if (!referenceNo) return { ok: false };
  const found = getAttemptByReference_(referenceNo);
  if (!found) return { ok: false };
  if (String(found.row[9] || '').trim() !== 'IN_PROGRESS') return { ok: false };
  const sh = getMathResultSheet();
  sh.getRange(found.rowIndex, 11).setValue(JSON.stringify(answers || {}));
  sh.getRange(found.rowIndex, 15).setValue(new Date());
  return { ok: true };
}

function heartbeat(referenceNo) {
  referenceNo = String(referenceNo || '').trim();
  if (!referenceNo) return { ok: false };
  const found = getAttemptByReference_(referenceNo);
  if (!found) return { ok: false };
  if (String(found.row[9] || '').trim() !== 'IN_PROGRESS') return { ok: false };
  getMathResultSheet().getRange(found.rowIndex, 15).setValue(new Date());
  return { ok: true };
}

function syncMathExamStageFromExam_(referenceNo, score, passFail, attemptStatus, reason) {
  const remarks = [
    'Math Exam submitted via Applicant Portal.',
    'Attempt Status: ' + String(attemptStatus || ''),
    formatTerminationReason_(reason || '') ? 'Reason: ' + formatTerminationReason_(reason || '') : ''
  ].filter(String).join(' | ');

  return upsertStageResultCore_({
    referenceNo: referenceNo,
    stageName: 'Math Exam',
    score: score,
    passingScore: PASSING_SCORE,
    maxScore: MAX_MATH_EXAM_SCORE,
    resultStatus: passFail,
    remarks: remarks,
    evaluatedBy: 'Math Exam System',
    now: new Date()
  });
}

function finalizeAttempt_(referenceNo, answers, reason) {
  referenceNo = String(referenceNo || '').trim();
  const found = getAttemptByReference_(referenceNo);
  if (!found) throw new Error('Exam attempt not found.');

  const sh = getMathResultSheet();
  const row = found.row;
  const rowIndex = found.rowIndex;
  const currentAttemptStatus = String(row[9] || '').trim();
  if (currentAttemptStatus && currentAttemptStatus !== 'IN_PROGRESS') {
    const existingReason = String(row[13] || '').trim();
    return {
      referenceNo: row[0],
      score: Number(row[4] || 0),
      status: row[5] || 'Not Recommended',
      passed: String(row[5] || '').toLowerCase() === 'passed',
      passingScore: PASSING_SCORE,
      maxScore: MAX_MATH_EXAM_SCORE,
      attemptStatus: currentAttemptStatus,
      terminationReason: formatTerminationReason_(existingReason)
    };
  }

  const storedAnswers = parseJsonSafe_(row[10]);
  const finalAnswers = answers && Object.keys(answers).length ? answers : storedAnswers;
  const questions = parseJsonSafe_(row[11]);
  let score = 0;
  (questions || []).forEach(function(q) {
    const chosen = String((finalAnswers || {})[q.id] || '').trim().toUpperCase();
    const correct = String(q.correctChoiceKey || '').trim().toUpperCase();
    if (chosen && correct && chosen === correct) score++;
  });

  const passFail = score >= PASSING_SCORE ? 'Passed' : 'Failed';
  const submittedAt = new Date();
  const normalizedReason = String(reason || '').trim() || 'AUTO_SUBMIT';
  const finalAttemptStatus = (normalizedReason === 'SUBMIT' || normalizedReason === 'SUBMIT_CLICKED') ? 'SUBMITTED' : 'AUTO_SUBMITTED';

  sh.getRange(rowIndex, 5).setValue(score);
  sh.getRange(rowIndex, 6).setValue(passFail);
  sh.getRange(rowIndex, 9).setValue(submittedAt);
  sh.getRange(rowIndex, 10).setValue(finalAttemptStatus);
  sh.getRange(rowIndex, 11).setValue(JSON.stringify(finalAnswers || {}));
  sh.getRange(rowIndex, 14).setValue(normalizedReason);
  sh.getRange(rowIndex, 15).setValue(submittedAt);

  SpreadsheetApp.flush();
  syncMathExamStageFromExam_(referenceNo, score, passFail, finalAttemptStatus, normalizedReason);

  return {
    referenceNo: row[0],
    score: score,
    status: passFail,
    passed: score >= PASSING_SCORE,
    passingScore: PASSING_SCORE,
    maxScore: MAX_MATH_EXAM_SCORE,
    attemptStatus: finalAttemptStatus,
    terminationReason: formatTerminationReason_(normalizedReason)
  };
}

function submitExam(referenceNo, answers) { return finalizeAttempt_(referenceNo, answers || {}, 'SUBMIT'); }
function autoSubmitExam(referenceNo, answers, reason) { return finalizeAttempt_(referenceNo, answers || {}, reason || 'AUTO_SUBMIT'); }

function healthCheck() {
  ensureSystemReady_();
  return {
    ok: true,
    spreadsheetName: getSS().getName(),
    applicantsLastRow: getApplicantsSheet().getLastRow(),
    stageResultsLastRow: getStageResultsSheet().getLastRow(),
    notificationsLastRow: getNotificationsSheet().getLastRow(),
    questionnaireLastRow: getQuestionnaireSheet().getLastRow(),
    mathResultLastRow: getMathResultSheet().getLastRow()
  };
}

function oneTimeSetup() { ensureSystemReady_(); return 'Setup completed.'; }
function testAdminPanel() { return getDashboardData('TGHR2026'); }
function debugDashboardReturn() { return getDashboardData('TGHR2026'); }
