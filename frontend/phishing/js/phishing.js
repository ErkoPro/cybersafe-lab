let startTime = null;
let metricsKey = 'cybersafe_metrics';

function init(){
  const email = document.getElementById('email');
  const consent = document.getElementById('consent');
  const submitBtn = document.getElementById('submitBtn');
  const showSafeBtn = document.getElementById('showSafeBtn');
  const metricsBtn = document.getElementById('metricsBtn');

  if(email){ email.addEventListener('focus', ()=>{ if(!startTime) startTime = Date.now(); }); }
  if(consent){ consent.addEventListener('change', ()=>{ submitBtn.disabled = !consent.checked; }); }
  if(showSafeBtn) showSafeBtn.addEventListener('click', toggleSafeVersion);
  if(metricsBtn) metricsBtn.addEventListener('click', toggleMetrics);

  const report = document.getElementById('reportBtn');
  if(report) report.addEventListener('click', ()=>{ showReportNotice(); recordMetricsOnReport(); });
}

function handleSubmit(e){
  e.preventDefault();
  const timeToSubmit = startTime ? Math.round((Date.now()-startTime)/1000) : null;
  const pwdLen = document.getElementById('password').value.length;
  showWarning({pwdLen, timeToSubmit});
  updateMetrics({pwdLen, timeToSubmit, noticed:false});
  return false;
}

function showWarning({pwdLen=null,timeToSubmit=null}={}){
  const result = document.getElementById('result');
  const emailVal = document.getElementById('email').value || '(пусто)';
  const pwdValMask = document.getElementById('password').value ? '•'.repeat(8) : '(пусто)';

  const analysis = analyzePage();
  const flags = analysis.flags;

  clearHighlights();
  if(analysis.mark.url) document.getElementById('fakeUrl').classList.add('flagged');
  if(analysis.mark.logo) document.getElementById('logo').classList.add('flagged');
  if(analysis.mark.form) document.getElementById('submitBtn').classList.add('flagged');
  if(analysis.mark.email) document.getElementById('email').classList.add('flagged');

  result.classList.remove('hidden');
  result.classList.add('visible');
  const container = document.querySelector('.fake-site'); if(container) container.classList.add('expanded');

  const suspiciousHtml = flags.length ? '<ul>' + flags.map(f=>`<li>${escapeHtml(f)}</li>`).join('') + '</ul>' : '<p>Прямых признаков фишинга не найдено, но будьте осторожны.</p>';

  const checklist = flags.map(f=>`<li>${escapeHtml(f.replace(/\(.+\)$/,''))} — что проверить: <strong>адрес</strong>, <strong>бренд</strong>, <strong>сертификат</strong></li>`).join('');

  const whyHtml = '<ul><li>Фишинговые сайты пытаются выдать себя за реальные, чтобы получить ваши данные.</li><li>Проверка URL и HTTPS снижает риск компрометации.</li></ul>';

  result.innerHTML = `
    <div class="warning">
      <h2>⚠ Фишинговая симуляция</h2>
      <p>Это учебная страница — введённые данные <strong>не</strong> отправлялись и не сохранялись.</p>

      <h3>Введённые данные</h3>
      <ul>
        <li>Почта: <code>${escapeHtml(emailVal)}</code></li>
        <li>Пароль (длина): <code>${pwdValMask} (${pwdLen})</code></li>
        <li>Время до нажатия: <code>${timeToSubmit !== null ? timeToSubmit + ' с' : '—'}</code></li>
      </ul>

      <h3>Подозрительные признаки</h3>
      ${suspiciousHtml}

      <h3>Что можно проверить</h3>
      <ul>${checklist || '<li>Ничего конкретного не найдено — следуйте общим правилам безопасности.</li>'}</ul>

      <h3>Почему это важно</h3>
      ${whyHtml}

      <div class="actions">
        <button class="btn close" onclick="resetSim(true)">Пройти ещё раз</button>
        <button class="btn proceed" onclick="proceedUnsafe()">Я понял(а) риск — продолжить (симуляция)</button>
      </div>
    </div>
  `;

  if(flags.length) updateMetrics({pwdLen, timeToSubmit, noticed:true});
}

function analyzePage(){
  const flags = [];
  const mark = {url:false,logo:false,form:false,email:false};
  if (location.protocol !== 'https:') { flags.push('Нет HTTPS — проверьте замок в адресной строке. (проблема: протокол)'); mark.url=true; }
  if (location.protocol === 'file:') { flags.push('Страница загружена локально (file://) — будьте осторожны. (проблема: протокол)'); mark.url=true; }
  if (location.hostname && !['localhost','','127.0.0.1'].includes(location.hostname) && /freexample|example|login/i.test(location.hostname)){
    flags.push('Подозрительный домен: ' + location.hostname + ' — похожие домены часто используются во фишинге. (проблема: домен)'); mark.url=true; }
  if (!document.querySelector('.logo') || document.querySelector('.logo').textContent.trim() === '') { flags.push('Нет официального брендирования. (проблема: бренд)'); mark.logo=true; }
  const form = document.getElementById('fakeForm');
  if (!form.action || form.action.trim() === '') { flags.push('Форма не указывает надёжный адрес отправки (атрибут action пуст). (проблема: отправка)'); mark.form=true; }
  if (/срочн|срочно|немедленно|verify|confirm|reset|urgent/i.test(document.body.textContent)) { flags.push('Есть элементы давления или срочности. (проблема: социальная инженерия)'); }
  const emailVal = document.getElementById('email').value || '';
  if (!emailVal) mark.email=true;
  return {flags, mark};
}

function clearHighlights(){
  ['fakeUrl','logo','submitBtn','email'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.remove('flagged');
  });
}

function resetSim(clearMetrics=false){
  document.getElementById('result').classList.add('hidden');
  document.getElementById('result').classList.remove('visible');
  const container = document.querySelector('.fake-site'); if(container) container.classList.remove('expanded');
  clearHighlights();
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  startTime = null;
  if(clearMetrics){}
}

function proceedUnsafe(){
  alert('Точно? Это только симуляция — в реальности никогда не вводите данные на подозрительных сайтах.');
}

function escapeHtml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// Show report message and record that user noticed flags
function showReportNotice(){
  const r = document.getElementById('result');
  r.classList.remove('hidden'); r.classList.add('visible');
  r.innerHTML = `
    <div class="info">
      <h3>Спасибо за внимательность</h3>
      <p>Это симуляция: на реальном сайте сообщите в службу поддержки или в ИТ-отдел.</p>
      <button class="btn close" onclick="resetSim()">Закрыть</button>
    </div>
  `;
  updateMetrics({pwdLen: null, timeToSubmit: null, noticed:true});
}

function toggleSafeVersion(){
  const container = document.querySelector('.fake-site');
  const logo = document.getElementById('logo');
  const url = document.getElementById('fakeUrl');
  const showSafeBtn = document.getElementById('showSafeBtn');
  if(container.classList.contains('safe-mode')){
    container.classList.remove('safe-mode');
    logo.innerHTML = 'Acme<span class="dot">.</span>Login';
    url.textContent = 'https://freexample-login.com';
    url.dataset.tooltip = 'Подозрительный домен — проверьте URL';
    showSafeBtn.textContent = 'Показать безопасную версию';
  } else {
    container.classList.add('safe-mode');
    logo.innerHTML = 'Acme Bank';
    url.textContent = 'https://accounts.acme.com';
    url.dataset.tooltip = 'Безопасная версия — пример правильного домена и HTTPS';
    showSafeBtn.textContent = 'Вернуться к симуляции';
    clearHighlights();
  }
}

function loadMetrics(){
  try{ const raw = localStorage.getItem(metricsKey); return raw ? JSON.parse(raw) : {submissions:0,totalPwdLen:0,totalTime:0,noticed:0}; }catch(e){return {submissions:0,totalPwdLen:0,totalTime:0,noticed:0};}
}
function saveMetrics(m){ localStorage.setItem(metricsKey, JSON.stringify(m)); }

function updateMetrics({pwdLen=null,timeToSubmit=null,noticed=false}){
  const m = loadMetrics();
  if(pwdLen !== null){ m.submissions += 1; m.totalPwdLen += Number(pwdLen) || 0; }
  if(timeToSubmit !== null && !isNaN(Number(timeToSubmit))){ m.totalTime += Number(timeToSubmit); }
  if(noticed) m.noticed += 1;
  saveMetrics(m);
}

function toggleMetrics(){
  const panel = document.getElementById('metrics');
  const btn = document.getElementById('metricsBtn');
  if(!panel) return;
  if(panel.classList.contains('hidden')){
    const m = loadMetrics();
    const avgLen = m.submissions ? Math.round(m.totalPwdLen / m.submissions) : 0;
    const avgTime = m.submissions ? Math.round(m.totalTime / m.submissions) : 0;
    panel.innerHTML = `<div class="metrics"><strong>Анонимная статистика (локально)</strong>
      <div>Отправлено симуляций: ${m.submissions}</div>
      <div>Средняя длина пароля: ${avgLen}</div>
      <div>Среднее время до нажатия: ${avgTime}s</div>
      <div>Пользователи, заметившие флаги: ${m.noticed}</div>
      <button class="btn clear" onclick="clearMetrics()">Сбросить статистику</button>
      <small>Храним только длину пароля, время до нажатия и счётчики — данные анонимны и локальны.</small>
    </div>`;
    panel.classList.remove('hidden'); panel.setAttribute('aria-hidden','false'); btn.textContent = 'Скрыть статистику';
  } else {
    panel.classList.add('hidden'); panel.setAttribute('aria-hidden','true'); btn.textContent = 'Показать статистику';
  }
}
function clearMetrics(){ localStorage.removeItem(metricsKey); toggleMetrics(); }

document.addEventListener('DOMContentLoaded', init);