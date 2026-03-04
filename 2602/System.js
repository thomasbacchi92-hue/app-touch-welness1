/* System.js - Core Logic per l'Agenda v16.0 - DRAG & DROP ESEGUITO */

const fbConfig = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfig);

const twStructId = localStorage.getItem("tw_structure_id");
let db = { app: {}, settings: {}, staff: [], servizi: [] };
let globalCustomers = [];
let tempSelectedServiceId = null;

if (twStructId) {
    const dbRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + twStructId);
    dbRef.on('value', snap => {
        const val = snap.val() || {};
        db.app = val.app || {};
        db.settings = val.settings || {};
        db.staff = Array.isArray(val.staff) ? val.staff : Object.values(val.staff || {});
        db.servizi = Array.isArray(val.servizi) ? val.servizi : Object.values(val.servizi || {});
        if(typeof window.render === 'function') window.render();
    });

    firebase.database().ref('MASTER_ADMIN_DB/global_customers').on('value', snap => {
        globalCustomers = Object.values(snap.val() || {});
    });
}

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById("mainDate")) {
        const d = new Date();
        document.getElementById("mainDate").value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
});

window.sysChangeDate = function(offset) {
    const picker = document.getElementById("mainDate");
    if(picker && picker.value) {
        const d = new Date(picker.value); d.setDate(d.getDate() + offset);
        picker.value = d.toISOString().split('T')[0];
        window.render();
    }
}

window.showToast = function(msg) { 
    const x = document.getElementById("toastBlue"); 
    if(x) { 
        document.getElementById("toastMsg").innerText = msg;
        x.className = "show"; 
        setTimeout(() => x.className = x.className.replace("show", ""), 3000); 
    } 
}

window.closeSidebar = function(e, force = false) { 
    if(force || !e || (!e.target.closest('.sidebar') && !e.target.closest('.slot') && !e.target.closest('.modal-box') && !e.target.closest('.btn-quick-eseg'))) {
        const sf = document.getElementById('sideForm');
        if(sf) sf.classList.remove('active'); 
    }
}

// CRM AUTOCOMPLETE
window.sysCheckCustomerInput = function() {
    const val = document.getElementById('aCog').value.toLowerCase().trim();
    const suggBox = document.getElementById('cogSuggestions');
    if(val.length >= 3) {
        const matches = globalCustomers.filter(c => c.nome && c.nome.toLowerCase().includes(val));
        if(matches.length > 0) {
            suggBox.innerHTML = matches.map(c => `<div class="auto-item" onclick="sysSelectCustomer('${c.nome.replace(/'/g, "\\'")}', '${c.tel||''}')"><div><b>${c.nome}</b><br><span>${c.tel ? c.tel : 'N.D.'}</span></div><i class="material-icons-round" style="color:var(--accent); font-size:16px">add</i></div>`).join('');
            suggBox.style.display = 'block';
        } else suggBox.style.display = 'none';
    } else suggBox.style.display = 'none';
}
window.sysSelectCustomer = function(nome, tel) { 
    document.getElementById('aCog').value = nome; 
    document.getElementById('aTel').value = tel; 
    document.getElementById('cogSuggestions').style.display = 'none'; 
}
document.addEventListener('click', e => { if(e.target.id !== 'aCog' && document.getElementById('cogSuggestions')) document.getElementById('cogSuggestions').style.display = 'none'; });

// MOTORE SERVIZI
window.sysRenderServiceBox = function() {
    const area = document.getElementById('serviceRenderArea');
    const sName = document.getElementById('aServ').value;
    if(sName) {
        area.innerHTML = `<div class="selected-service-badge"><div class="info"><b>${sName}</b><span>${document.getElementById('aDur').value} min | ${document.getElementById('aPrice').value} €</span></div><div class="icon-del" onclick="sysExecuteRemoveService()"><i class="material-icons-round" style="font-size:14px;">close</i></div></div>`;
    } else {
        area.innerHTML = `<button class="btn-add-service" onclick="sysOpenServiceSelector()"><i class="material-icons-round" style="color:var(--accent); font-size:18px;">add_circle</i> AGGIUNGI SERVIZIO</button>`;
    }
}

window.sysFilterServices = function() {
    const val = document.getElementById('searchServiceInput').value.toLowerCase();
    document.querySelectorAll('.serv-item').forEach(el => {
        el.style.display = el.getAttribute('data-name').toLowerCase().includes(val) ? 'flex' : 'none';
    });
}

window.sysOpenServiceSelector = function() {
    const listUI = document.getElementById('serviziUIList');
    listUI.innerHTML = ""; document.getElementById('searchServiceInput').value = ""; 
    let servList = db.servizi || [];
    if(servList.length === 0) { listUI.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted); font-size:12px'>Nessun servizio. Chiedi in Direzione.</div>"; } 
    else {
        servList.forEach(s => {
            if(!s || !s.nome) return;
            listUI.innerHTML += `<div class="serv-item" id="srvUI_${s.id}" data-name="${s.nome}" onclick="sysTempSelectService('${s.id}', '${s.nome.replace(/'/g,"\\'")}', ${s.durata || 30}, ${s.prezzo || 0})">
                <i class="material-icons-round" style="color:var(--text-muted); font-size:18px;">spa</i>
                <div class="serv-info"><b>${s.nome}</b><span style="color:var(--accent); margin-left:10px;">${s.durata} min - ${s.prezzo} €</span></div>
            </div>`;
        });
    }
    tempSelectedServiceId = null; document.getElementById('serviceSelectModal').style.display = 'flex';
}

window.sysTempSelectService = function(id, nome, durata, prezzo) { 
    document.querySelectorAll('.serv-item').forEach(x => x.classList.remove('active')); 
    document.getElementById('srvUI_' + id).classList.add('active'); 
    tempSelectedServiceId = { nome, dur: durata, price: prezzo }; 
}
window.sysConfirmServiceSelection = function() { 
    if(tempSelectedServiceId) { 
        document.getElementById('aServ').value = tempSelectedServiceId.nome; 
        document.getElementById('aDur').value = tempSelectedServiceId.dur; 
        document.getElementById('aPrice').value = tempSelectedServiceId.price; 
        sysRenderServiceBox(); 
        document.getElementById('serviceSelectModal').style.display = 'none'; 
    } else { showToast("Scegli un servizio o Annulla."); } 
}
window.sysExecuteRemoveService = function() { 
    document.getElementById('aServ').value = ""; document.getElementById('aDur').value = "30"; document.getElementById('aPrice').value = "0"; sysRenderServiceBox(); 
}

// ZOOM EXCEL-STYLE
window.sysApplyZoom = function() {
    const z = document.getElementById('gridZoom').value;
    const grid = document.getElementById('mainGrid');
    if(grid) { grid.style.zoom = z / 100; }
}
window.sysSetZoom = function(step) {
    const slider = document.getElementById('gridZoom');
    if(!slider) return;
    let z = parseInt(slider.value) + step;
    if(z < 50) z = 50; if(z > 150) z = 150;
    slider.value = z; sysApplyZoom();
}

// ==========================================
// DRAG AND DROP (MOUSE E TOUCH MOBILE)
// ==========================================

// PC MOUSE API (HTML5 Drag & Drop)
window.sysDragStart = function(e, appId) {
    e.dataTransfer.setData("text/plain", appId);
    e.target.classList.add('dragging');
}
window.sysAllowDrop = function(e) {
    e.preventDefault();
    if(e.target.classList.contains('slot') && !e.target.querySelector('.app-busy')) {
        e.target.classList.add('drag-over');
    }
}
window.sysDragLeave = function(e) { e.target.classList.remove('drag-over'); }
window.sysDrop = function(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    const appId = e.dataTransfer.getData("text/plain");
    const dropZone = e.target.closest('.slot');
    if(!dropZone || dropZone.querySelector('.app-busy')) return;
    
    const newOra = dropZone.getAttribute('data-ora');
    const newCab = dropZone.getAttribute('data-cab');
    sysMoveAppointment(appId, newOra, newCab);
}

// SMARTPHONE TOUCH API (Pressione Prolungata)
window.touchTimer = null;
window.isDragging = false;
window.justDragged = false;
window.draggedAppId = null;
window.dragEl = null;
window.offsetX = 0; window.offsetY = 0;

window.sysTouchStart = function(e, appId) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.currentTarget;
    
    window.touchTimer = setTimeout(() => {
        window.isDragging = true;
        window.draggedAppId = appId;
        window.dragEl = target.cloneNode(true);
        
        window.dragEl.style.position = 'fixed';
        window.dragEl.style.zIndex = '9999';
        window.dragEl.style.opacity = '0.8';
        window.dragEl.style.width = target.offsetWidth + 'px';
        window.dragEl.style.height = target.offsetHeight + 'px';
        window.dragEl.style.pointerEvents = 'none';
        window.dragEl.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        
        document.body.appendChild(window.dragEl);
        
        const rect = target.getBoundingClientRect();
        window.offsetX = touch.clientX - rect.left;
        window.offsetY = touch.clientY - rect.top;
        
        window.dragEl.style.left = (touch.clientX - window.offsetX) + 'px';
        window.dragEl.style.top = (touch.clientY - window.offsetY) + 'px';
        
        if(navigator.vibrate) navigator.vibrate(50);
        target.classList.add('dragging');
    }, 400); 
};

window.sysTouchMove = function(e) {
    if (!window.isDragging) { clearTimeout(window.touchTimer); return; }
    e.preventDefault(); 
    const touch = e.touches[0];
    if (window.dragEl) {
        window.dragEl.style.left = (touch.clientX - window.offsetX) + 'px';
        window.dragEl.style.top = (touch.clientY - window.offsetY) + 'px';
    }
};

window.sysTouchEnd = function(e) {
    clearTimeout(window.touchTimer);
    e.currentTarget.classList.remove('dragging');
    
    if (!window.isDragging) return;
    
    window.isDragging = false;
    window.justDragged = true; 
    setTimeout(() => window.justDragged = false, 200);

    if (window.dragEl) {
        const touch = e.changedTouches[0];
        window.dragEl.style.display = 'none';
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        window.dragEl.remove();
        window.dragEl = null;
        
        if(dropTarget) {
            const slot = dropTarget.closest('.slot');
            if (slot && slot.hasAttribute('data-ora') && slot.hasAttribute('data-cab') && !slot.querySelector('.app-busy')) {
                const newOra = slot.getAttribute('data-ora');
                const newCab = slot.getAttribute('data-cab');
                sysMoveAppointment(window.draggedAppId, newOra, newCab);
            }
        }
    }
    window.draggedAppId = null;
};

// MOTORE DI SPOSTAMENTO NEL DATABASE
window.sysMoveAppointment = function(appId, newOra, newCab) {
    const d = document.getElementById("mainDate").value; 
    if(!d) return;
    
    firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + twStructId + '/app/' + d).once('value').then(snap => {
        let apps = snap.val() || [];
        if(!Array.isArray(apps)) apps = Object.values(apps);
        
        const idx = apps.findIndex(x => x && x.id === appId);
        if(idx > -1) {
            const startMin = tToM(newOra);
            const appDur = parseInt(apps[idx].dur) || 30;
            const endMin = startMin + appDur;
            
            let collision = apps.some(a => {
                if(!a || a.id === appId || parseInt(a.cab) !== parseInt(newCab)) return false;
                const aStart = tToM(a.ora);
                const aEnd = aStart + (parseInt(a.dur) || 30);
                return (startMin < aEnd && endMin > aStart);
            });

            if(collision) {
                showToast("Attenzione: Orario Occupato!");
                window.render();
                return;
            }

            apps[idx].ora = newOra;
            apps[idx].cab = newCab;
            
            firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + twStructId + '/app/' + d).set(apps).then(() => {
                showToast("Appuntamento Spostato!");
            });
        }
    });
}

// LOGICA APERTURA SLOT
window.sysOpenSlot = function(ora, cab) {
    if(!document.getElementById("sideForm")) return;
    
    const currentId = document.getElementById("mId").value;
    const isSidebarActive = document.getElementById('sideForm').classList.contains('active');

    if (isSidebarActive && currentId === "") {
        document.getElementById("aOra").value = ora; 
        document.getElementById("aCab").value = cab;
        return; 
    }

    document.getElementById("sidebarTitle").innerText = "Nuovo Appuntamento"; 
    document.getElementById("mId").value = "";
    
    const cd = document.getElementById("mainDate").value; 
    document.getElementById("aDate").value = cd; 
    document.getElementById("mOldDate").value = cd; 
    
    document.getElementById("aOra").value = ora; 
    document.getElementById("aCab").value = cab;
    
    ['aCam', 'aCog', 'aTel', 'aOp', 'aNote', 'aServ'].forEach(id => { const el=document.getElementById(id); if(el) el.value = ""; });
    document.getElementById("aDur").value = "30"; 
    document.getElementById("aPrice").value = "0";
    
    const esegToggle = document.getElementById("aEseguito");
    if(esegToggle) esegToggle.checked = false;
    
    sysRenderServiceBox(); 
    document.getElementById("editActionButtons").style.display = "none"; 
    document.getElementById('sideForm').classList.add('active');
}

window.sysOpenEdit = function(id) {
    if(window.justDragged) return; // Evita di aprire il menu dopo un trascinamento su smartphone
    
    const d = document.getElementById("mainDate").value; 
    let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{});
    const app = apps.find(x => x && x.id === id); if(!app) return;

    document.getElementById("sidebarTitle").innerText = "Modifica Prenotazione"; 
    document.getElementById("mId").value = app.id;
    document.getElementById("aDate").value = d; 
    document.getElementById("mOldDate").value = d;
    document.getElementById("aOra").value = app.ora; 
    document.getElementById("aCam").value = app.cam || "";
    document.getElementById("aCog").value = app.cog || ""; 
    document.getElementById("aTel").value = app.tel || "";
    document.getElementById("aOp").value = app.op || ""; 
    document.getElementById("aNote").value = app.note || "";
    document.getElementById("aCab").value = app.cab;
    
    const esegToggle = document.getElementById("aEseguito");
    if(esegToggle) esegToggle.checked = app.eseguito === true;

    if(app.serv) { 
        document.getElementById('aServ').value = app.serv; 
        document.getElementById('aDur').value = app.dur || 30; 
        document.getElementById('aPrice').value = app.price || 0; 
    } else { document.getElementById('aServ').value = ""; }
    
    sysRenderServiceBox(); 
    document.getElementById("editActionButtons").style.display = "flex"; 
    document.getElementById('sideForm').classList.add('active');
}

window.sysSaveApp = function() {
    const id = document.getElementById("mId").value; 
    const selDate = document.getElementById("aDate").value; 
    const oldDate = document.getElementById("mOldDate").value; 
    const sName = document.getElementById('aServ').value;
    
    if(!selDate || !document.getElementById("aCam").value || !sName) return showToast("Compila i campi Camera e Servizio!");

    const nCog = document.getElementById('aCog').value.trim(); 
    const nTel = document.getElementById('aTel').value.trim();
    if(nCog) { 
        const ex = globalCustomers.find(c => c.nome && c.nome.toLowerCase() === nCog.toLowerCase()); 
        if(!ex) firebase.database().ref('MASTER_ADMIN_DB/global_customers').push({ nome: nCog, tel: nTel, created_at: new Date().toISOString() }); 
    }

    const toggleEseguito = document.getElementById("aEseguito") ? document.getElementById("aEseguito").checked : false;

    const obj = { 
        id: id || "APP"+Date.now(), 
        ora: document.getElementById("aOra").value, cab: document.getElementById("aCab").value, 
        cam: document.getElementById("aCam").value, cog: nCog, tel: nTel, 
        serv: sName, dur: parseInt(document.getElementById("aDur").value) || 30, price: parseFloat(document.getElementById("aPrice").value) || 0, 
        op: document.getElementById("aOp").value, note: document.getElementById("aNote").value, 
        eseguito: toggleEseguito, 
        pagato: false 
    };
    
    const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + twStructId);

    if(id && oldDate && oldDate !== selDate) { 
        let oldApps = Array.isArray(db.app[oldDate]) ? db.app[oldDate] : Object.values(db.app[oldDate]||{}); 
        oldApps = oldApps.filter(x => x && x.id !== id); 
        dbRefLocal.child('app').child(oldDate).set(oldApps); 
    }
    
    let apps = Array.isArray(db.app[selDate]) ? db.app[selDate] : Object.values(db.app[selDate]||{});
    if(id && oldDate === selDate) { 
        const idx = apps.findIndex(x => x && x.id === id); 
        if(idx > -1) { obj.pagato = apps[idx].pagato; apps[idx] = obj; } else apps.push(obj); 
    } else apps.push(obj); 

    dbRefLocal.child('app').child(selDate).set(apps).then(() => { 
        closeSidebar(null, true); 
        showToast("Agenda Salvata!"); 
        if(selDate !== document.getElementById("mainDate").value) { 
            document.getElementById("mainDate").value = selDate; window.render(); 
        } 
    });
}

window.sysDelApp = function() {
    const motivo = prompt("Motivazione dell'annullamento:");
    if(motivo === null) return; 

    const id = document.getElementById("mId").value;
    const d = document.getElementById("mainDate").value; 
    let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{});
    const appToDel = apps.find(x => x && x.id === id); 
    apps = apps.filter(x => x && x.id !== id);
    
    firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + twStructId).child('app').child(d).set(apps).then(() => { 
        if(appToDel) { 
            appToDel.deleteReason = motivo || "Nessuna motivazione fornita"; 
            appToDel.date = d; appToDel.deletedAt = new Date().toLocaleString('it-IT');
            appToDel.deletedBy = localStorage.getItem("tw_user") || "Staff";
            firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + twStructId).child('deleted_apps').push(appToDel); 
        } 
        closeSidebar(null, true); showToast("Eliminato con successo."); 
    });
}

window.sysToggleEseguitoAgenda = function(e, date, appId) {
    e.stopPropagation(); 
    let dayApps = Array.isArray(db.app[date]) ? db.app[date] : Object.values(db.app[date]||{});
    const idx = dayApps.findIndex(a => a && a.id === appId);
    if(idx > -1) { 
        const ns = !dayApps[idx].eseguito; dayApps[idx].eseguito = ns; 
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + twStructId + '/app/' + date).set(dayApps).then(() => showToast(ns ? "Eseguito!" : "Spunta Rimossa!")); 
    }
}

window.sysShareWA = function() {
    const id = document.getElementById("mId").value; const d = document.getElementById("mainDate").value; 
    let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{});
    const app = apps.find(x => x && x.id === id);
    if(app && app.tel) { 
        window.open(`https://wa.me/${app.tel}?text=${encodeURIComponent(`Gentile Ospite, ti ricordiamo il tuo appuntamento per il trattamento: ${app.serv}, alle ore ${app.ora}. Ti aspettiamo nella nostra SPA!`)}`, '_blank'); 
        closeSidebar(null, true); 
    } else showToast("Manca telefono.");
}

function tToM(t) { if(!t || typeof t !== 'string') return 0; const p = t.split(':'); return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0); }
function mToT(m) { const h=Math.floor(m/60); const mm=m%60; return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; }
function getSlots() { let s=[]; for(let i=10*60; i<=20*60; i+=10) s.push(mToT(i)); return s; }

window.render = function() {
    const grid = document.getElementById("mainGrid");
    if(!grid) return;
    
    const selOp = document.getElementById("aOp");
    if(selOp && db.staff) {
        const currentVal = selOp.value; selOp.innerHTML = '<option value="">-- Seleziona Operatore --</option>';
        const staffList = Array.isArray(db.staff) ? db.staff : Object.values(db.staff);
        staffList.forEach(s => { if(s && s.nome) selOp.innerHTML += `<option value="${s.nome}">${s.nome} ${s.cognome || ''}</option>`; });
        selOp.value = currentVal;
    }

    const d = document.getElementById("mainDate").value; if(!d) return;
    const nCabine = (db.settings && db.settings.cabine) ? parseInt(db.settings.cabine) : 2;
    const slots = getSlots();
    let dayApps = db.app[d] || []; if (!Array.isArray(dayApps)) dayApps = Object.values(dayApps);

    let h = "";
    for(let c = 1; c <= nCabine; c++) {
        h += `<div class="colonna"><div class="col-head">CABINA ${c}</div>`;
        slots.forEach(s => {
            const sMin = tToM(s);
            const startApp = dayApps.find(x => x && x.ora === s && parseInt(x.cab) === c);
            const busyApp = dayApps.find(x => { 
                if(!x || !x.ora) return false;
                const start = tToM(x.ora); const end = start + (parseInt(x.dur) || 30); 
                return parseInt(x.cab) === c && sMin > start && sMin < end; 
            });
            
            if(startApp) {
                const isEseg = startApp.eseguito ? "eseguito-style" : "";
                const slotsCount = Math.ceil((parseInt(startApp.dur) || 30) / 10);
                const hCss = `height: calc(${slotsCount * 100}% + ${slotsCount - 1}px - 6px); top: 3px;`;

                // INIEZIONE FUNZIONI DI TRASCINAMENTO (Drag Desktop & Touch Mobile)
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot" data-ora="${s}" data-cab="${c}" ondragover="sysAllowDrop(event)" ondragleave="sysDragLeave(event)" ondrop="sysDrop(event)">
                        <div class="app-base ${isEseg}" style="${hCss}" 
                             draggable="true" 
                             ondragstart="sysDragStart(event, '${startApp.id}')"
                             ontouchstart="sysTouchStart(event, '${startApp.id}')" 
                             ontouchmove="sysTouchMove(event)" 
                             ontouchend="sysTouchEnd(event)"
                             onclick="sysOpenEdit('${startApp.id}')"
                             ondragend="this.classList.remove('dragging')">
                            
                            <div class="app-info-col">
                                <b>Cam ${startApp.cam || '?'} - ${startApp.cog || 'N.D.'}</b>
                                <span style="font-size:11px; margin-bottom:2px; opacity:0.9;">${startApp.serv || '-'} (${startApp.dur||30} min)</span>
                                <span style="font-size:10px; font-weight:bold; color:var(--gold);">OP: ${startApp.op || '-'}</span>
                            </div>
                            <button class="btn-quick-eseg" onclick="sysToggleEseguitoAgenda(event, '${d}', '${startApp.id}')">
                                <i class="material-icons-round">check</i>
                            </button>
                        </div>
                      </div></div>`;
            } else if(busyApp) {
                // Div occupato, NON è una zona in cui rilasciare
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot"><div class="app-busy" onclick="sysOpenEdit('${busyApp.id}')"></div></div></div>`;
            } else {
                // Div libero, zona di rilascio valida
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot" data-ora="${s}" data-cab="${c}" 
                           ondragover="sysAllowDrop(event)" ondragleave="sysDragLeave(event)" ondrop="sysDrop(event)"
                           onclick="sysOpenSlot('${s}', ${c})"></div></div>`;
            }
        });
        h += `</div>`;
    }
    grid.innerHTML = h;
    
    if(window.sysApplyZoom) window.sysApplyZoom();
};