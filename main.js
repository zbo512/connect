let curScreen = 's-ob1';
let prevScreen = null;

const screenLabels = {
  's-ob1':'온보딩 1/4','s-ob2':'온보딩 2/4','s-ob3':'온보딩 3/4','s-ob4':'온보딩 4/4',
  's-terms':'#08 약관 동의',
  's-workspace':'#01 워크스페이스 홈',
  's-workspace':'대시보드','s-builder':'빌더','s-customer':'고객 페이지 미리보기',
  's-notify':'알림 센터',
  's-magazine':'#14·#15 콘텐츠',
  's-claim':'청구 대행',
  's-hr-fail':'#24 HR 동기화 실패',
  's-saas-warn':'#25 SaaS 약관 미동의','s-budget-low':'#26 잔액 부족'
};

const flowMap = {
  's-ob1':'fi-ob1','s-ob2':'fi-ob2','s-ob3':'fi-ob3','s-ob4':'fi-ob4',
  's-terms':'fi-terms','s-workspace':'fi-workspace',
  's-workspace':'fi-workspace','s-builder':'fi-builder',
  's-customer':'fi-customer','s-notify':'fi-notify',
  's-magazine':'fi-magazine','s-claim':'fi-claim',
  's-hr-fail':'fi-hr-fail','s-saas-warn':'fi-saas-warn','s-budget-low':'fi-budget-low'
};

function dismissDragHint(){
  document.querySelectorAll('#drag-hint-banner').forEach(el => {
    el.style.display = 'none';
  });
}

function go(id, label, from) {
  if(id === curScreen) return;
  document.getElementById(curScreen).classList.remove('active');
  prevScreen = curScreen;
  curScreen = id;
  document.getElementById(id).classList.add('active');
  document.getElementById('shell-label').textContent = screenLabels[id] || label;
  const custFnav = document.getElementById('cust-fnav');
  if(custFnav) custFnav.style.pointerEvents = (id === 's-customer') ? 'all' : 'none';
  updateFlowMap();
  if(id === 's-claim') setTimeout(() => { if(typeof clShowOnly==='function') clShowOnly('claim-landing'); }, 10);
  if(id === 's-notify') setTimeout(updateNotifyCount, 10);
}


// ── 빌더 드래그 순서 편집 (롱프레스 + 행 전체) ──
(function(){
  let dragEl = null, dragCard = null, placeholder = null;
  let startY = 0, lastY = 0;
  let longPressTimer = null;
  let isDragging = false;
  let shownHint = false;

  function showDragHint(){} // 배너로 대체

  function rebuildDividers(card){
    card.querySelectorAll('.sort-divider, [style*="height:.5px"]').forEach(d => d.remove());
    const items = [...card.querySelectorAll('.mod-item')];
    items.forEach((item, i) => {
      if(i < items.length - 1){
        const div = document.createElement('div');
        div.className = 'sort-divider';
        div.style.cssText = 'margin:0 16px;height:.5px;background:var(--border)';
        item.after(div);
      }
    });
  }

  function startDrag(el, clientY){
    isDragging = true;
    dragEl = el;
    dragCard = el.parentNode;

    // 구분선 제거
    dragCard.querySelectorAll('.sort-divider, [style*="height:.5px"]').forEach(d => d.remove());

    lastY = clientY;
    startY = clientY;

    // placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'sort-placeholder';
    placeholder.style.cssText = 'height:' + dragEl.offsetHeight + 'px;background:var(--blue-50);border-radius:8px;margin:2px 0';
    dragEl.after(placeholder);

    // fixed 스타일
    const rect = dragEl.getBoundingClientRect();
    dragEl.style.cssText += ';position:fixed;width:' + dragEl.offsetWidth + 'px;z-index:9999;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:10px;left:' + rect.left + 'px;top:' + rect.top + 'px;pointer-events:none;cursor:grabbing';
  }

  function onMove(clientY){
    if(!isDragging || !dragEl) return;
    const dy = clientY - lastY;
    const rect = dragEl.getBoundingClientRect();
    dragEl.style.top = (rect.top + dy) + 'px';
    lastY = clientY;

    const siblings = [...dragCard.querySelectorAll('.mod-item')].filter(el => el !== dragEl);
    let placed = false;
    for(const sib of siblings){
      const sibRect = sib.getBoundingClientRect();
      if(clientY < sibRect.top + sibRect.height / 2){
        dragCard.insertBefore(placeholder, sib);
        placed = true;
        break;
      }
    }
    if(!placed && siblings.length) dragCard.appendChild(placeholder);
  }

  function endDrag(){
    if(!dragEl) return;
    dragEl.style.position = '';
    dragEl.style.width = '';
    dragEl.style.zIndex = '';
    dragEl.style.background = '';
    dragEl.style.boxShadow = '';
    dragEl.style.borderRadius = '';
    dragEl.style.left = '';
    dragEl.style.top = '';
    dragEl.style.pointerEvents = '';
    dragEl.style.cursor = '';

    if(placeholder && placeholder.parentNode){
      dragCard.insertBefore(dragEl, placeholder);
      placeholder.remove();
    }
    placeholder = null;
    rebuildDividers(dragCard);

    dragEl = null;
    dragCard = null;
    isDragging = false;
  }

  // ── 마우스 이벤트 (데스크탑: 즉시 드래그) ──
  function onMouseDown(e){
    // 토글 클릭은 드래그 안함
    if(e.target.closest('.toggle')) return;
    const item = e.currentTarget;
    e.preventDefault();
    startDrag(item, e.clientY);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e){ onMove(e.clientY); }
  function onMouseUp(){
    endDrag();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  // ── 터치 이벤트 (모바일: 롱프레스 후 드래그) ──
  function onTouchStart(e){
    if(e.target.closest('.toggle')) return;
    const item = e.currentTarget;
    const touch = e.touches[0];
    startY = touch.clientY;
    lastY = touch.clientY;

    longPressTimer = setTimeout(() => {
      startDrag(item, touch.clientY);
      // 진동 피드백 (지원 기기)
      if(navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }

  function onTouchMove(e){
    const touch = e.touches[0];
    // 롱프레스 전 움직이면 취소
    if(!isDragging){
      if(Math.abs(touch.clientY - startY) > 8){
        clearTimeout(longPressTimer);
      }
      return;
    }
    e.preventDefault();
    onMove(touch.clientY);
  }

  function onTouchEnd(){
    clearTimeout(longPressTimer);
    if(isDragging) endDrag();
  }

  function attachHandlers(){
    // 드래그 가능한 아이템에 이벤트 등록
    document.querySelectorAll('.screen.active .mod-item[draggable="true"]').forEach(item => {
      item.removeEventListener('mousedown', onMouseDown);
      item.removeEventListener('touchstart', onTouchStart);
      item.removeEventListener('touchmove', onTouchMove);
      item.removeEventListener('touchend', onTouchEnd);

      item.addEventListener('mousedown', onMouseDown);
      item.addEventListener('touchstart', onTouchStart, {passive:false});
      item.addEventListener('touchmove', onTouchMove, {passive:false});
      item.addEventListener('touchend', onTouchEnd);
    });

  }

  const _origGo = window.go;
  window.go = function(id, label, from){
    _origGo(id, label, from);
    if(id === 's-builder'){
      setTimeout(attachHandlers, 50);
      showDragHint();
    }
  };

  document.addEventListener('DOMContentLoaded', attachHandlers);
  setTimeout(attachHandlers, 200);
})();

function back() {
  if(prevScreen) go(prevScreen, screenLabels[prevScreen] || '', 'back');
}

function updateFlowMap() {
  document.querySelectorAll('.flow-item').forEach(el => el.classList.remove('cur'));
  const fi = flowMap[curScreen];
  if(fi) document.getElementById(fi).classList.add('cur');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function switchBuilderTab(tab) {
  document.querySelectorAll('.btab').forEach(b => b.classList.remove('on'));
  document.getElementById('bt-'+tab).classList.add('on');
  const modPanel = document.getElementById('bpanel-mod');
  const setPanel = document.getElementById('bpanel-set');
  if(tab === 'mod') {
    modPanel.style.display = 'contents';
    setPanel.style.display = 'none';
  } else {
    modPanel.style.display = 'none';
    setPanel.style.display = 'flex';
  }
}

function psetToggle(id) {
  document.getElementById(id).classList.toggle('on');
}

function selectTheme(el) {
  document.querySelectorAll('.theme-swatch').forEach(s => { s.style.boxShadow = 'none'; });
  const color = el.dataset.color;
  el.style.boxShadow = `0 0 0 2.5px #fff,0 0 0 4.5px ${color}`;
}

const bldState = {'bld-ins':true,'bld-con':true,'bld-gui':false,'bld-news':false,'bld-evt':false,'bld-ref':false,'bld-sns':true,'bld-ana':false,'bld-calc':false,'bld-claim':false,'bld-mag':false,'bld-yt':false,'bld-insta':false,'bld-sub':false,'bld-rev':false,'bld-faq':false};
function bldToggle(id, silent = false) {
  bldState[id] = !bldState[id];
  const t = document.getElementById(id);
  t.classList.toggle('on', bldState[id]);
  // 아이콘 컬러 전환 (활성: 파랑, 비활성: 그레이)
  const key = id.replace('bld-','');
  const iconId = 'icon-' + key;
  document.querySelectorAll('[id="' + iconId + '"] svg').forEach(svg => {
    svg.setAttribute('fill', bldState[id] ? '#3182F6' : '#8B95A1');
    svg.querySelectorAll('path,rect,circle').forEach(el => {
      if(el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') return;
      if(el.getAttribute('fill') === 'white' || el.getAttribute('fill') === '#fff') return;
      if(el.getAttribute('fill') === '#6B7684') { if(bldState[id]) el.setAttribute('fill','#1B64DA'); else el.setAttribute('fill','#6B7684'); return; }
      el.setAttribute('fill', bldState[id] ? '#3182F6' : '#8B95A1');
    });
  });
  // 상태 텍스트 전환 (활성: data-on, 비활성: data-off)
  const stEl = document.getElementById('st-' + key);
  if(stEl) {
    stEl.textContent = bldState[id] ? (stEl.dataset.on || '') : (stEl.dataset.off || '');
  }
  // bld-sns: customer 페이지 SNS 버튼 show/hide
  if(id === 'bld-sns') {
    const snsEl = document.getElementById('m-sns-links');
    if(snsEl) snsEl.style.display = bldState[id] ? 'flex' : 'none';
  }
  if(id === 'bld-sub') {
    const folEl = document.getElementById('m-fol');
    if(folEl) folEl.style.display = bldState[id] ? '' : 'none';
  }
  const names = { 'bld-ins':'보험 조회','bld-con':'상담 예약','bld-gui':'보험 가이드','bld-news':'데일리 뉴스','bld-evt':'이벤트 보상','bld-ref':'친구 추천','bld-sns':'SNS 링크','bld-ana':'보장 분석','bld-calc':'보험료 계산기','bld-claim':'청구 대행','bld-mag':'매거진','bld-yt':'유튜브 영상','bld-insta':'인스타그램 피드','bld-sub':'소식 구독','bld-rev':'후기','bld-faq':'FAQ' };
  if(!silent) showToast((bldState[id] ? '✓ ' : '✕ ') + (names[id]||'') + (bldState[id] ? ' 켜짐' : ' 꺼짐'));
}

// ── 플로팅 네비 (고정 5개) ──
const allFnavIds = ['fn-home','fn-ins','fn-ana','fn-claim','fn-con'];

function fnavScroll(targetId, navId) {
  const target = document.getElementById(targetId);
  const body = document.getElementById('cust-body');
  if(target && body) body.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' });
  allFnavIds.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('active-fnav');
  });
  const navEl = document.getElementById(navId);
  if(navEl) navEl.classList.add('active-fnav');
}

// 케이스별 fnav 표시 항목 정의 (true = 활성)
const fnavMap = {
  c1: { 'fn-home':true, 'fn-ins':false, 'fn-ana':false, 'fn-claim':true, 'fn-con':true },
  c2: { 'fn-home':true, 'fn-ins':true,  'fn-ana':true,  'fn-claim':true, 'fn-con':true },
  c3: { 'fn-home':true, 'fn-ins':false, 'fn-ana':false, 'fn-claim':true, 'fn-con':false },
  c4: { 'fn-home':true, 'fn-ins':false, 'fn-ana':false, 'fn-claim':true, 'fn-con':false }
};

function updateFnav(c) {
  const map = fnavMap[c] || fnavMap.c2;
  allFnavIds.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('active-fnav');
    if(map[id]) {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = '0.3';
      el.style.pointerEvents = 'none';
    }
  });
  const homeEl = document.getElementById('fn-home');
  if(homeEl) homeEl.classList.add('active-fnav');
}

// ── 청구 화면 ──
function clShowOnly(id) {
  ['claim-landing','claim-step1','claim-step2'].forEach(s => {
    const el = document.getElementById(s);
    if(el) el.style.display = 'none';
  });
  const target = document.getElementById(id);
  if(target) target.style.display = 'flex';
  // 공유버튼은 랜딩에서만
  const shareBtn = document.getElementById('cl-share-btn');
  if(shareBtn) shareBtn.style.display = id === 'claim-landing' ? 'flex' : 'none';
}

function clStartClaim() { clShowOnly('claim-step1'); }
function clGoLanding() { clShowOnly('claim-landing'); }
function clGoStep1()   { clShowOnly('claim-step1'); }
function clGoStep2()   { clShowOnly('claim-step2'); }

function clCheckStep1() {
  const name  = (document.getElementById('cl-name')||{}).value || '';
  const rn1   = (document.getElementById('cl-rn1')||{}).value || '';
  const rn2   = (document.getElementById('cl-rn2')||{}).value || '';
  const phone = (document.getElementById('cl-phone')||{}).value || '';
  const ok = name.trim() && rn1.length === 6 && rn2.length === 7 && phone.length >= 10;
  const btn = document.getElementById('cl-next-btn');
  if(btn) { btn.style.opacity = ok ? '1' : '.4'; btn.style.cursor = ok ? 'pointer' : 'not-allowed'; }
}

function clStep1Next() {
  const name  = (document.getElementById('cl-name')||{}).value || '';
  const rn1   = (document.getElementById('cl-rn1')||{}).value || '';
  const rn2   = (document.getElementById('cl-rn2')||{}).value || '';
  const phone = (document.getElementById('cl-phone')||{}).value || '';
  if(!name.trim() || rn1.length < 6 || rn2.length < 7 || phone.length < 10) return;
  // 서명 바텀시트 표시
  const overlay = document.getElementById('cl-sign-overlay');
  if(overlay) { overlay.style.display = 'flex'; clInitCanvas(); }
}

// ── 청구인 서명 캔버스 ──
let clSigning = false, clHasSig = false;
function clInitCanvas() {
  const canvas = document.getElementById('cl-sign-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  clHasSig = false;
  document.getElementById('cl-sign-placeholder').style.opacity = '1';
  canvas.onpointerdown = e => { clSigning = true; ctx.beginPath(); const r = canvas.getBoundingClientRect(); ctx.moveTo((e.clientX-r.left)*(canvas.width/r.width),(e.clientY-r.top)*(canvas.height/r.height)); };
  canvas.onpointermove = e => { if(!clSigning) return; const r = canvas.getBoundingClientRect(); ctx.lineTo((e.clientX-r.left)*(canvas.width/r.width),(e.clientY-r.top)*(canvas.height/r.height)); ctx.strokeStyle='#191918'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.stroke(); clHasSig=true; document.getElementById('cl-sign-placeholder').style.opacity='0'; };
  canvas.onpointerup = () => { clSigning = false; };
  canvas.onpointerleave = () => { clSigning = false; };
}

function clCloseSign(e) {
  if(e && e.target !== document.getElementById('cl-sign-overlay')) return;
  document.getElementById('cl-sign-overlay').style.display = 'none';
}

function clConfirmSign() {
  document.getElementById('cl-sign-overlay').style.display = 'none';
  clShowOnly('claim-step2');
}

function formatPhone(el) {
  let v = el.value.replace(/\D/g,'');
  if(v.length > 3 && v.length <= 7) v = v.slice(0,3)+'-'+v.slice(3);
  else if(v.length > 7) v = v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7,11);
  el.value = v;
  clCheckStep1();
}

const uploadDone = {};
function clUpload(id, name) {
  uploadDone[id] = !uploadDone[id];
  const el = document.getElementById(id);
  const st = document.getElementById(id+'-st');
  el.classList.toggle('uploaded', uploadDone[id]);
  el.style.opacity = '1';
  if(uploadDone[id]) {
    st.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#0F6E56"/><path d="M5 8l2.5 2.5L11 5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    showToast('✓ ' + name + ' 업로드됨');
  } else {
    st.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#3182F6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
}

function clSubmit() {
  showToast('✓ 청구가 접수되었습니다. 영업일 2-3일 내 처리됩니다.');
  setTimeout(() => back(), 1800);
}

function clOpenDocs() {
  const el = document.getElementById('cl-docs-overlay');
  el.style.display = 'flex';
}
function clCloseDocs(e) {
  if (e && e.currentTarget !== e.target) return;
  document.getElementById('cl-docs-overlay').style.display = 'none';
}

// ── #08 약관 동의 ──
const termsState = { ti1:false, ti2:false, ti3:false, ti4:false, ti5:false };
const termsRequired = ['ti1','ti2','ti3'];

function termsToggle(id) {
  termsState[id] = !termsState[id];
  const el = document.getElementById(id);
  el.classList.toggle('on', termsState[id]);
  const icon = el.querySelector('.chk-icon');
  if(icon) icon.style.display = termsState[id] ? 'block' : 'none';
  updateTermsCta(); updateTermsAll();
}

function termsToggleAll() {
  const allOn = Object.values(termsState).every(Boolean);
  Object.keys(termsState).forEach(k => {
    termsState[k] = !allOn;
    const el = document.getElementById(k);
    el.classList.toggle('on', !allOn);
    const icon = el.querySelector('.chk-icon');
    if(icon) icon.style.display = !allOn ? 'block' : 'none';
  });
  updateTermsCta(); updateTermsAll();
}

function updateTermsAll() {
  const allOn = Object.values(termsState).every(Boolean);
  const el = document.getElementById('t-chk-all');
  const icon = document.getElementById('t-all-icon');
  if(allOn) { el.style.background='var(--blue)'; el.style.borderColor='var(--blue)'; icon.style.display='block'; }
  else { el.style.background=''; el.style.borderColor='var(--gray-400)'; icon.style.display='none'; }
}

function updateTermsCta() {
  const ok = termsRequired.every(k => termsState[k]);
  const btn = document.getElementById('terms-cta');
  if(ok) {
    btn.style.background = 'var(--blue)';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
  } else {
    btn.style.background = 'var(--gray-200)';
    btn.style.color = 'var(--gray-400)';
    btn.style.cursor = 'not-allowed';
  }
}

function termsSubmit() {
  if(!termsRequired.every(k => termsState[k])) return;
  go('s-ob4', '온보딩 완료', 'terms');
}

// ── #10 모듈 추가 모달 ──
function openModModal() {
  const m = document.getElementById('modal-mod');
  m.style.display = 'flex';
}
function closeModModal() {
  document.getElementById('modal-mod').style.display = 'none';
}
function quickAdd(name) {
  closeModModal();
  showToast('✓ ' + name + ' 추가됨 — 빌더에서 확인하세요');
}

// ── #14·#15 콘텐츠 탭 전환 ──
function switchMagTab(tab) {
  document.querySelectorAll('.btab').forEach(b => {
    if(b.id === 'mgt-mag' || b.id === 'mgt-card') b.classList.remove('on');
  });
  document.getElementById('mgt-'+tab).classList.add('on');
  document.getElementById('mag-tab').style.display = tab==='mag' ? 'flex' : 'none';
  document.getElementById('card-tab').style.display = tab==='card' ? 'flex' : 'none';
}

// ── #11a 보험조회 약관 모달 ──
const agreeState = { chk1:false, chk2:false, chk3:false, chk4:false };
const requiredChks = ['chk1','chk2','chk3'];

function openInsModal() {
  const m = document.getElementById('modal-ins');
  m.style.display = 'flex';
}

function closeInsModal() {
  document.getElementById('modal-ins').style.display = 'none';
}

function toggleAgree(id) {
  agreeState[id] = !agreeState[id];
  const el = document.getElementById(id);
  el.classList.toggle('on', agreeState[id]);
  updateAgreeCta();
  updateAllChk();
}

function toggleAllAgree() {
  const allOn = requiredChks.every(k => agreeState[k]) && agreeState['chk4'];
  ['chk1','chk2','chk3','chk4'].forEach(k => {
    agreeState[k] = !allOn;
    document.getElementById(k).classList.toggle('on', !allOn);
  });
  updateAgreeCta();
  updateAllChk();
}

function updateAllChk() {
  const allOn = ['chk1','chk2','chk3','chk4'].every(k => agreeState[k]);
  const el = document.getElementById('chk-all');
  const icon = document.getElementById('chk-all-icon');
  if(allOn) {
    el.style.background = 'var(--blue)'; el.style.borderColor = 'var(--blue)';
    icon.style.display = 'block';
  } else {
    el.style.background = ''; el.style.borderColor = 'var(--gray-100)';
    icon.style.display = 'none';
  }
}

function updateAgreeCta() {
  const ok = requiredChks.every(k => agreeState[k]);
  const btn = document.getElementById('agree-cta');
  btn.style.opacity = ok ? '1' : '.4';
  btn.style.cursor = ok ? 'pointer' : 'not-allowed';
}

function submitAgree() {
  if(!requiredChks.every(k => agreeState[k])) return;
  closeInsModal();
  // #11b: 임베드 상태로 보험카드 업데이트
  const card = document.querySelector('#m-ins .surface-card');
  if(card) {
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:600;color:var(--teal-600)">✓ 동기화 완료</div>
        <div style="font-size:11px;color:var(--text-3)">방금 전</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fff;border-radius:8px;border:.5px solid var(--border)">
          <div><div style="font-size:12px;color:var(--text-3)">종신보험</div><div style="font-size:13px;font-weight:500;margin-top:1px">○○생명 무배당종신</div></div>
          <div style="text-align:right"><div style="font-size:11px;color:var(--text-3)">월 납입</div><div style="font-size:13px;font-weight:600;color:var(--text-1)">128,000원</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fff;border-radius:8px;border:.5px solid var(--border)">
          <div><div style="font-size:12px;color:var(--text-3)">실손보험</div><div style="font-size:13px;font-weight:500;margin-top:1px">△△화재 실손의료비</div></div>
          <div style="text-align:right"><div style="font-size:11px;color:var(--text-3)">월 납입</div><div style="font-size:13px;font-weight:600;color:var(--text-1)">84,000원</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fff;border-radius:8px;border:.5px solid var(--border)">
          <div><div style="font-size:12px;color:var(--text-3)">암보험</div><div style="font-size:13px;font-weight:500;margin-top:1px">□□생명 암진단특약</div></div>
          <div style="text-align:right"><div style="font-size:11px;color:var(--text-3)">월 납입</div><div style="font-size:13px;font-weight:600;color:var(--text-1)">60,000원</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 4px">
          <span style="font-size:13px;color:var(--text-2)">총 월 납입</span>
          <span style="font-size:15px;font-weight:700;color:var(--text-1)">312,000원</span>
        </div>
      </div>
      <div style="background:var(--amber-50);border-left:2px solid var(--amber-400);padding:8px 10px;font-size:11px;color:var(--amber-800);line-height:1.5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="vertical-align:-2px;margin-right:4px;flex-shrink:0"><path d="M8 1.5L14.5 13H1.5L8 1.5z" fill="#F7B731" stroke="#F7B731" stroke-width=".5" stroke-linejoin="round"/><path d="M8 6v4" stroke="white" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.5" r=".7" fill="white"/></svg>암보험 보장 갭 발견 — 진단비 기준 권장액의 62% 수준입니다.
      </div>`;
  }
  showToast('✓ 보험 정보를 불러왔습니다');
}

// ── 알림 센터 ──
function updateNotifyCount() {
  const btn = document.getElementById('notify-read-btn');
  if(!btn) return;
  const total = document.querySelectorAll('#notify-body .noti-row').length;
  const unread = document.querySelectorAll('#notify-body .noti-row.unread').length;
  const read = total - unread;
  if(unread === 0) {
    btn.textContent = '모두 읽음';
    btn.style.color = 'var(--text-3)';
    btn.style.pointerEvents = 'none';
  } else {
    btn.textContent = read + ' / ' + total + ' 읽음';
    btn.style.color = 'var(--blue)';
    btn.style.pointerEvents = 'auto';
  }
}

function notiTap(row) {
  row.classList.remove('unread');
  const dot = row.querySelector('.noti-dot');
  if(dot) dot.style.opacity = '0';
  const title = row.querySelector('.noti-title');
  if(title && !title.style.color) title.style.color = 'var(--text-2)';
  updateNotifyCount();
}

function markAllRead() {
  document.querySelectorAll('#notify-body .noti-row.unread').forEach(row => {
    row.classList.remove('unread');
    const title = row.querySelector('.noti-title');
    if(title) title.style.color = 'var(--text-2)';
  });
  updateNotifyCount();
  showToast('모든 알림을 읽음 처리했습니다');
}

function notiActivateMod(modId, name, btnId) {
  // 빌더 토글 ON
  if(!bldState[modId]) {
    bldState[modId] = true;
    const t = document.getElementById(modId);
    if(t) t.classList.add('on');
    const key = modId.replace('bld-','');
    const iconEl = document.getElementById('icon-' + key);
    if(iconEl) iconEl.querySelectorAll('svg').forEach(svg => svg.setAttribute('fill','#3182F6'));
    const stEl = document.getElementById('st-' + key);
    if(stEl) stEl.textContent = stEl.dataset.on || '';
  }
  // 버튼 상태 변경
  const btn = document.getElementById(btnId);
  if(btn) { btn.textContent = '✓ 켜짐'; btn.classList.add('done'); }
  showToast('✓ ' + name + ' 켜짐 — 빌더에서 확인하세요');
}

// ── 모듈 라이브러리 (구버전 — 호환 유지) ──
function libFilter(cat, btn) {
  document.querySelectorAll('.lib-cat').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.lib-section').forEach(sec => {
    sec.style.display = (cat === 'all' || sec.dataset.cat === cat) ? '' : 'none';
  });
}

// ── 모듈 라이브러리 v2 (s-mod-lib 전용) ──
function libFilter2(cat, btn) {
  document.querySelectorAll('#lib-body2 ~ div .lib-cat, #s-mod-lib .lib-cat').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.lib-section2').forEach(sec => {
    sec.style.display = (cat === 'all' || sec.dataset.cat2 === cat) ? '' : 'none';
  });
}

function libAdd(btn, name) {
  if(btn.classList.contains('added')) return;
  btn.classList.add('added');
  btn.textContent = '✓ 추가됨';
  showToast('✓ ' + name + ' 추가됨 — 빌더에서 확인하세요');
}

// ── 고객 페이지 케이스 전환 ──
const typeDefaults = {
  c1: { 'bld-sns':false, 'bld-ins':true,  'bld-con':true,  'bld-gui':false,
        'bld-ana':false, 'bld-calc':false, 'bld-claim':false,
        'bld-news':false, 'bld-mag':false, 'bld-yt':false, 'bld-insta':false,
        'bld-evt':false, 'bld-ref':false, 'bld-sub':false, 'bld-rev':false, 'bld-faq':false },
  c2: { 'bld-sns':true,  'bld-ins':true,  'bld-con':true,  'bld-gui':true,
        'bld-ana':false, 'bld-calc':false, 'bld-claim':false,
        'bld-news':false, 'bld-mag':false, 'bld-yt':false, 'bld-insta':false,
        'bld-evt':false, 'bld-ref':false, 'bld-sub':false, 'bld-rev':false, 'bld-faq':false },
  c3: { 'bld-sns':true,  'bld-ins':true,  'bld-con':true,  'bld-gui':true,
        'bld-ana':false, 'bld-calc':false, 'bld-claim':false,
        'bld-news':true,  'bld-mag':true,  'bld-yt':true,  'bld-insta':true,
        'bld-evt':false, 'bld-ref':false, 'bld-sub':true,  'bld-rev':false, 'bld-faq':false },
  c4: { 'bld-sns':true,  'bld-ins':true,  'bld-con':true,  'bld-gui':false,
        'bld-ana':false, 'bld-calc':false, 'bld-claim':false,
        'bld-news':false, 'bld-mag':false, 'bld-yt':false, 'bld-insta':false,
        'bld-evt':true,  'bld-ref':true,  'bld-sub':false, 'bld-rev':true,  'bld-faq':false }
};

function selectPageType(c) {
  document.querySelectorAll('.btype-card').forEach(el => el.classList.remove('on'));
  const card = document.getElementById('btype-' + c);
  if(card) card.classList.add('on');
  setCase(c);
  const defaults = typeDefaults[c];
  if(defaults) {
    Object.entries(defaults).forEach(([id, shouldBeOn]) => {
      if(!!bldState[id] !== shouldBeOn) bldToggle(id, true);
    });
  }
}

const caseNames = { c1:'미니멀형', c2:'표준형', c3:'콘텐츠형', c4:'이벤트형' };
let curCase = 'c2';

function setCase(c) {
  curCase = c;
  ['c1','c2','c3','c4'].forEach(k => {
    const el = document.getElementById('ct-'+k);
    if(el) el.classList.toggle('on', k===c);
  });
  const nt = document.getElementById('cust-nav-title');
  if(nt) nt.textContent = caseNames[c];

  // 프로필 베리언트
  const profileStd = document.getElementById('c-profile-std');
  const profileC4 = document.getElementById('c-profile-c4');
  const profileCover = document.getElementById('c-profile-cover');
  const av = document.getElementById('c-avatar-std');
  const nbSub = document.querySelector('#c-nameblock-std div:last-child');
  const bio = document.getElementById('c-bio-std');

  if(c === 'c2') {
    if(profileCover) profileCover.style.display = '';
    if(profileStd) profileStd.style.display = 'none';
    if(profileC4) profileC4.style.display = 'none';
  } else if(c === 'c4') {
    if(profileCover) profileCover.style.display = 'none';
    if(profileStd) profileStd.style.display = 'none';
    if(profileC4) profileC4.style.display = '';
  } else {
    if(profileCover) profileCover.style.display = 'none';
    if(profileC4) profileC4.style.display = 'none';
    if(profileStd) profileStd.style.display = '';
    if(c === 'c1') {
      if(av) { av.style.background = '#F1EFE8'; av.style.color = '#444441'; }
      if(nbSub) nbSub.style.display = 'none';
      if(bio) bio.textContent = '안녕하세요! 보험 상담이 필요하시면 편하게 연락 주세요.';
    } else {
      if(av) { av.style.background = '#EBF3FE'; av.style.color = '#1B64DA'; }
      if(nbSub) nbSub.style.display = '';
      if(bio) bio.innerHTML = '고객의 상황에 맞는 보험을 함께 찾아드립니다.<br>복잡한 보험, 쉽게 이해할 수 있도록 도와드릴게요.';
    }
  }


  // C4: identity 카카오 버튼 숨기고 FAB 노출
  const stdKakao = profileStd ? profileStd.querySelector('.btn-kakao') : null;
  const c4Fab = document.getElementById('c4-kakao-fab');
  if(c === 'c4') {
    if(stdKakao) stdKakao.style.display = 'none';
    if(c4Fab) c4Fab.style.display = '';
  } else {
    if(stdKakao) stdKakao.style.display = '';
    if(c4Fab) c4Fab.style.display = 'none';
  }
  // data-cases 기반 모듈 show/hide
  document.querySelectorAll('.case-mod').forEach(el => {
    const cases = (el.dataset.cases || '').split(',');
    el.style.display = cases.includes(c) ? '' : 'none';
  });
  // 소식구독 빌더 상태 반영 (C4 한정)
  const folEl = document.getElementById('m-fol');
  if(folEl && c === 'c4') folEl.style.display = bldState['bld-sub'] ? '' : 'none';

  const body = document.getElementById('cust-body');
  if(body) body.scrollTop = 0;
  updateFnav(c);
}

setCase('c2');
// ── C4 FAB: 연락처 섹션 진입 시 숨김 ──
(function() {
  const contact = document.getElementById('m-contact');
  const fab = document.getElementById('c4-kakao-fab');
  const root = document.getElementById('cust-body');
  if(!contact || !fab || !root) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(fab.style.display === 'none') return;
      fab.style.opacity = entry.isIntersecting ? '0' : '1';
      fab.style.pointerEvents = entry.isIntersecting ? 'none' : '';
      fab.style.transition = 'opacity .2s';
    });
  }, { root: root, threshold: 0.1 });
  observer.observe(contact);
})();
updateFlowMap();

// 청구 폼 입력 감지
document.addEventListener('input', function(e) {
  if(['cl-name','cl-rn1','cl-rn2'].includes(e.target.id)) updateClNextBtn();
});
