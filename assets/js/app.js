const LS_URL='gestiona_supabase_url',LS_KEY='gestiona_supabase_key',LS_SCHEDULES='gestiona_order_schedules_v1',LS_NOTIF_STATE='gestiona_notification_state_v1',LS_VENUE_THEMES='gestiona_venue_themes_v1',LS_PENDING_THEMES='gestiona_pending_venue_themes_v1';let sb=null,user=null,profile=null,orgId=null,venues=[],products=[],suppliers=[],orders=[],orderItems=[],activity=[],movements=[],priceHistoryRows=[],selectedVenue='all';let quickOrder={quantities:{},notes:{}};let autoOrderDraft={};let orionOrderSuggestions=[];let recipes=[];let recipeIngredientDraft=[];const RECIPES_KEY='gestiona_recipes_v90';
let menus=[],menuRecipeDraft=[],posCart=[],sales=[];
const MENUS_KEY='gestiona_menus_v91',SALES_KEY='gestiona_sales_v91';
let selectedStockCategory='all',stockCategories=[];
let selectedProductIds=new Set();
const STOCK_CATEGORIES_KEY='gestiona_stock_categories_v92',STOCK_TREE_STATE_KEY='gestiona_stock_tree_state_v93';
const DEFAULT_STOCK_CATEGORIES=[
 {name:'Viandes',icon:'🥩'},{name:'Poissons',icon:'🐟'},{name:'Légumes',icon:'🥬'},
 {name:'Produits laitiers',icon:'🧀'},{name:'Boulangerie',icon:'🍞'},{name:'Épicerie',icon:'🧂'},
 {name:'Softs',icon:'🥤'},{name:'Bières',icon:'🍺'},{name:'Vins',icon:'🍷'},
 {name:'Spiritueux',icon:'🍸'},{name:'Café & boissons chaudes',icon:'☕'},
 {name:'Desserts',icon:'🍰'},{name:'Surgelés',icon:'❄️'},{name:'Entretien',icon:'🧽'},
 {name:'Emballages',icon:'📦'},{name:'Divers',icon:'📋'}
];
const $=id=>document.getElementById(id);const money=n=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(Number(n||0));const num=n=>Number(n||0);const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function show(id){['setupScreen','authScreen','onboardingScreen','appScreen'].forEach(x=>$(x).classList.add('hidden'));$(id).classList.remove('hidden')}function msg(id,text,type='notice'){$(id).innerHTML=text?`<div class="notice ${type}">${esc(text)}</div>`:''}function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2400)}
function initClient(){const url=localStorage.getItem(LS_URL),key=localStorage.getItem(LS_KEY);if(!url||!key)return false;try{sb=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});return true}catch(e){return false}}
async function boot(){loadOrionImportHistory();loadSupplierDocuments();loadRecipes();loadMenus();loadSales();loadStockCategories();if(!initClient()){show('setupScreen');return}const {data:{session}}=await sb.auth.getSession();if(!session){show('authScreen');return}user=session.user;await loadProfile()}
async function loadProfile(){const {data,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(error){msg('authMsg',error.message,'error');show('authScreen');return}profile=data;if(!profile?.organization_id){$('ownerName').value=profile?.full_name||user.user_metadata?.full_name||'';show('onboardingScreen');return}orgId=profile.organization_id;await loadApp()}
async function loadApp(){show('appScreen');$('userLabel').textContent=profile?.full_name||user.email;$('hello').textContent=`Bonjour ${(profile?.full_name||'').split(' ')[0]||''} 👋`;$('projectInfo').textContent=localStorage.getItem(LS_URL)||'';applyRoleUi();await Promise.all([loadVenues(),loadSuppliers(),loadProducts(),loadMovements(),loadPriceHistoryRows(),loadOrders(),loadActivity()]);renderAll()}

function normalizeVenueName(name){return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function validHex(value,fallback){return /^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):fallback}
function shadeHex(hex,amount){hex=validHex(hex,'#64142a').slice(1);const n=parseInt(hex,16),r=Math.max(0,Math.min(255,(n>>16)+amount)),g=Math.max(0,Math.min(255,((n>>8)&255)+amount)),b=Math.max(0,Math.min(255,(n&255)+amount));return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}
function defaultVenueTheme(venue){const n=normalizeVenueName(venue?.name);if(n.includes('danish'))return{primary:'#173f2b',accent:'#c59a43'};if(n.includes('elysee'))return{primary:'#64142a',accent:'#c59a43'};return{primary:'#37546b',accent:'#c59a43'}}
function getVenueThemeMap(){try{return JSON.parse(localStorage.getItem(LS_VENUE_THEMES)||'{}')||{}}catch{return{}}}
function saveVenueThemeMap(map){localStorage.setItem(LS_VENUE_THEMES,JSON.stringify(map))}
function venueTheme(venue){const map=getVenueThemeMap(),saved=map[String(venue?.id)]||{};return{primary:validHex(saved.primary,defaultVenueTheme(venue).primary),accent:validHex(saved.accent,defaultVenueTheme(venue).accent)}}
function migratePendingVenueThemes(){let pending=[];try{pending=JSON.parse(localStorage.getItem(LS_PENDING_THEMES)||'[]')||[]}catch{}if(!pending.length)return;const map=getVenueThemeMap();pending.forEach(p=>{const v=venues.find(x=>normalizeVenueName(x.name)===normalizeVenueName(p.name));if(v)map[String(v.id)]={primary:validHex(p.primary,defaultVenueTheme(v).primary),accent:validHex(p.accent,'#c59a43')}});saveVenueThemeMap(map);localStorage.removeItem(LS_PENDING_THEMES)}
function applyVenueTheme(){const root=document.documentElement;if(!venues.length)return;const active=selectedVenue==='all'?venues:venues.filter(v=>String(v.id)===String(selectedVenue));const themes=(active.length?active:venues).map(venueTheme),first=themes[0]||{primary:'#64142a',accent:'#c59a43'},last=themes[themes.length-1]||first;const primary=first.primary,secondary=last.primary,accent=first.accent;root.style.setProperty('--wine',primary);root.style.setProperty('--wine2',shadeHex(primary,-35));root.style.setProperty('--gold',accent);root.style.setProperty('--theme-primary',primary);root.style.setProperty('--theme-secondary',secondary);root.style.setProperty('--theme-accent',accent);root.style.setProperty('--theme-gradient',`linear-gradient(135deg,${primary},${secondary})`);root.style.setProperty('--theme-gradient-vertical',`linear-gradient(180deg,${shadeHex(primary,-35)},${secondary})`);document.body.dataset.venueTheme=selectedVenue==='all'?'all':'single';const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',primary)}
function renderVenueThemeSettings(){const host=$('venueThemeSettings');if(!host)return;host.innerHTML=venues.length?venues.map(v=>{const t=venueTheme(v);return `<article class="venue-theme-card" data-venue-theme="${v.id}"><div class="venue-theme-preview" style="--preview-primary:${t.primary};--preview-accent:${t.accent}"><span>${esc(v.name)}</span><b>GESTIONA</b></div><div class="venue-theme-controls"><label>Couleur principale<input type="color" data-theme-field="primary" value="${t.primary}"></label><label>Couleur d’accent<input type="color" data-theme-field="accent" value="${t.accent}"></label><button type="button" class="btn primary mini" data-save-theme="${v.id}">Enregistrer</button></div></article>`}).join(''):'<div class="empty">Créez d’abord un établissement.</div>'}
function saveVenueThemeFromCard(id){const card=document.querySelector(`[data-venue-theme="${CSS.escape(String(id))}"]`);if(!card)return;const map=getVenueThemeMap();map[String(id)]={primary:validHex(card.querySelector('[data-theme-field="primary"]')?.value,'#64142a'),accent:validHex(card.querySelector('[data-theme-field="accent"]')?.value,'#c59a43')};saveVenueThemeMap(map);applyVenueTheme();renderVenueThemeSettings();toast('Couleurs de l’établissement enregistrées')}
document.addEventListener('input',e=>{const field=e.target.closest?.('[data-theme-field]');if(!field)return;const card=field.closest('.venue-theme-card'),preview=card?.querySelector('.venue-theme-preview');if(preview){const primary=card.querySelector('[data-theme-field="primary"]')?.value,accent=card.querySelector('[data-theme-field="accent"]')?.value;preview.style.setProperty('--preview-primary',primary);preview.style.setProperty('--preview-accent',accent)}})
document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-save-theme]');if(btn)saveVenueThemeFromCard(btn.dataset.saveTheme)})

async function loadVenues(){const {data,error}=await sb.from('venues').select('*').order('name');if(error)throw error;venues=data||[];migratePendingVenueThemes();const opts=['<option value="all">Tous les établissements</option>',...venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`)];$('venueSelect').innerHTML=opts.join('');$('venueSelect').value=selectedVenue;renderVenueThemeSettings();applyVenueTheme()}
async function loadSuppliers(){const {data,error}=await sb.from('suppliers').select('*').order('name');if(error)throw error;suppliers=data||[]}
async function loadProducts(){let q=sb.from('products').select('*').order('name');const {data,error}=await q;if(error)throw error;products=data||[]}
async function loadMovements(){const {data,error}=await sb.from('stock_movements').select('*').order('created_at',{ascending:false}).limit(200);if(error)throw error;movements=data||[]}
async function loadPriceHistoryRows(){const {data,error}=await sb.from('product_prices').select('product_id,supplier_id,package_price_excl_vat,units_per_package,unit_price_excl_vat,effective_at,created_at').order('effective_at',{ascending:false}).limit(2000);if(error&&error.code!=='42P01')throw error;priceHistoryRows=data||[]}
async function loadOrders(){const {data,error}=await sb.from('purchase_orders').select('*,suppliers(name),venues(name),purchase_order_items(*)').order('created_at',{ascending:false});if(error)throw error;orders=data||[]}
async function loadActivity(){const {data}=await sb.from('audit_log').select('*').order('created_at',{ascending:false}).limit(250);activity=data||[]}
function visibleProducts(includeArchived=false){return products.filter(p=>(includeArchived||p.active!==false)&&(selectedVenue==='all'||!p.venue_id||p.venue_id===selectedVenue))}function unitCost(p){return num(p.package_price_excl_vat)/Math.max(num(p.units_per_package),1)}function saleEx(p){return num(p.sale_price_incl_vat)/(1+num(p.sale_vat)/100)}function marginPct(p){const c=unitCost(p),s=saleEx(p);return s>0?((s-c)/s)*100:0}function status(p){if(num(p.stock)<=0)return['Rupture','bad'];if(num(p.stock)<=num(p.minimum_stock))return['À commander','warn'];return['En stock','ok']}

function v19CurrentProducts(){return visibleProducts().filter(p=>p.active!==false)}
function v19OpenOrdersList(){return orders.filter(o=>['draft','sent','confirmed','partially_received'].includes(o.status))}
function renderV19Cockpit(){
 const first=(profile?.full_name||'').split(' ')[0]||'';
 const now=new Date(),dateText=now.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 if($('cockpitGreeting'))$('cockpitGreeting').textContent=`Bonjour ${first||''} 👋`;
 if($('cockpitDateLine'))$('cockpitDateLine').textContent=`${dateText.charAt(0).toUpperCase()+dateText.slice(1)} — voici les priorités de votre journée.`;
 if($('topbarDate'))$('topbarDate').textContent=dateText;
 const ps=v19CurrentProducts(),low=ps.filter(p=>num(p.stock)<=num(p.minimum_stock)),open=v19OpenOrdersList();
 const today=new Date().toISOString().slice(0,10),todaySales=sales.filter(s=>String(s.created_at||s.date||'').slice(0,10)===today&&(selectedVenue==='all'||String(s.venue_id)===String(selectedVenue)));
 const revenue=todaySales.reduce((a,s)=>a+num(s.total_incl_vat||s.total||s.amount),0),priorities=low.length+open.filter(o=>o.status==='partially_received').length;
 if($('v19Revenue'))$('v19Revenue').textContent=money(revenue);if($('v19StockAlerts'))$('v19StockAlerts').textContent=low.length;if($('v19OpenOrders'))$('v19OpenOrders').textContent=open.length;if($('v19PriorityCount'))$('v19PriorityCount').textContent=priorities;
 const agenda=[];open.slice(0,3).forEach(o=>agenda.push({time:o.desired_date?String(o.desired_date).slice(5).replace('-','/'):'À suivre',title:`Commande ${o.order_number||o.number||''}`,detail:o.suppliers?.name||'Fournisseur',state:o.status==='partially_received'?'Partielle':'Ouverte',view:'orders'}));low.slice(0,2).forEach(p=>agenda.push({time:'Stock',title:p.name,detail:`${num(p.stock)} disponible · minimum ${num(p.minimum_stock)}`,state:'À commander',view:'products'}));if(!agenda.length)agenda.push({time:'✓',title:'Aucune urgence détectée',detail:'ORION ne signale aucune action critique.',state:'À jour',view:'dashboard'});
 if($('v19Agenda'))$('v19Agenda').innerHTML=agenda.map(a=>`<div class="agenda-item" data-v19-view="${a.view}"><div class="agenda-time">${esc(a.time)}</div><div><b>${esc(a.title)}</b><small>${esc(a.detail)}</small></div><span class="agenda-state">${esc(a.state)}</span></div>`).join('');
 const summaries=[];if(low.length)summaries.push(['⚠️',`${low.length} produit${low.length>1?'s':''} sous le stock minimum`,'Préparer une commande évitera une rupture.']);if(open.length)summaries.push(['🚚',`${open.length} commande${open.length>1?'s':''} en cours`,'Vérifiez les confirmations et réceptions attendues.']);if(revenue>0)summaries.push(['📈',`CA du jour : ${money(revenue)}`,'Calculé à partir des ventes enregistrées.']);if(!summaries.length)summaries.push(['✅','Situation maîtrisée','Aucune alerte prioritaire dans les données chargées.']);
 if($('v19OrionSummary'))$('v19OrionSummary').innerHTML=summaries.map(s=>`<div class="orion-summary-item"><span>${s[0]}</span><div><b>${esc(s[1])}</b><small>${esc(s[2])}</small></div></div>`).join('');renderTopNotifications();
}
function globalSearchData(q){q=String(q||'').trim().toLowerCase();if(q.length<2)return[];const out=[];venues.filter(v=>String(v.name||'').toLowerCase().includes(q)).slice(0,4).forEach(v=>out.push({icon:'🏢',title:v.name,sub:'Établissement',view:'venues',venue:v.id}));products.filter(p=>[p.name,p.sku,p.barcode,p.category].some(x=>String(x||'').toLowerCase().includes(q))).slice(0,7).forEach(p=>out.push({icon:'📦',title:p.name,sub:`Produit${p.category?' · '+p.category:''}`,view:'products'}));suppliers.filter(s=>[s.name,s.contact_name,s.email].some(x=>String(x||'').toLowerCase().includes(q))).slice(0,5).forEach(s=>out.push({icon:'🚚',title:s.name,sub:'Fournisseur',view:'suppliers'}));orders.filter(o=>[o.order_number,o.number,o.suppliers?.name].some(x=>String(x||'').toLowerCase().includes(q))).slice(0,5).forEach(o=>out.push({icon:'🛒',title:o.order_number||o.number||'Commande',sub:o.suppliers?.name||'Commande fournisseur',view:'orders'}));return out.slice(0,12)}
function renderGlobalSearch(){const input=$('globalSearch'),host=$('globalSearchResults');if(!input||!host)return;const rows=globalSearchData(input.value);if(input.value.trim().length<2){host.classList.add('hidden');host.innerHTML='';return}host.innerHTML=rows.length?rows.map((r,i)=>`<div class="search-result" data-search-index="${i}"><div class="search-result-icon">${r.icon}</div><div><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></div></div>`).join(''):'<div class="search-empty">Aucun résultat.</div>';host.classList.remove('hidden');host._rows=rows}
function renderTopNotifications(){const ps=v19CurrentProducts(),low=ps.filter(p=>num(p.stock)<=num(p.minimum_stock)),open=v19OpenOrdersList(),list=[];low.slice(0,5).forEach(p=>list.push(`<div class="item"><div><b>Stock faible : ${esc(p.name)}</b><small>${num(p.stock)} disponible · minimum ${num(p.minimum_stock)}</small></div><span class="badge low">Stock</span></div>`));open.slice(0,4).forEach(o=>list.push(`<div class="item"><div><b>${esc(o.order_number||o.number||'Commande ouverte')}</b><small>${esc(o.suppliers?.name||'Fournisseur')}</small></div><span class="badge warn">Commande</span></div>`));if(!list.length)list.push('<div class="empty">Aucune notification prioritaire.</div>');if($('topNotificationList'))$('topNotificationList').innerHTML=list.join('');if($('topNotificationCount'))$('topNotificationCount').textContent=String(low.length+open.length)}
function initV19Ui(){$('globalSearch')?.addEventListener('input',renderGlobalSearch);$('globalSearchResults')?.addEventListener('click',e=>{const el=e.target.closest('[data-search-index]');if(!el)return;const row=$('globalSearchResults')._rows?.[Number(el.dataset.searchIndex)];if(!row)return;if(row.venue)focusVenue(row.venue);document.querySelector(`[data-view="${row.view}"]`)?.click();$('globalSearchResults').classList.add('hidden');$('globalSearch').value=''});document.addEventListener('click',e=>{if(!e.target.closest('.global-search-wrap'))$('globalSearchResults')?.classList.add('hidden');const agenda=e.target.closest('[data-v19-view]');if(agenda)document.querySelector(`[data-view="${agenda.dataset.v19View}"]`)?.click()});$('topNotificationsBtn')?.addEventListener('click',()=>{$('topNotificationPanel')?.classList.toggle('hidden');renderTopNotifications()});$('closeTopNotifications')?.addEventListener('click',()=>$('topNotificationPanel')?.classList.add('hidden'));$('topOrionBtn')?.addEventListener('click',()=>document.querySelector('[data-view="dashboard"]')?.click());renderV19Cockpit()}
function renderAll(){renderDashboard();renderV19Cockpit();renderDailyBrief();renderCopilot();renderVenueControlCenter();renderSmartNotifications();renderCatalogFilters();renderProducts();renderRecipes();renderMenus();renderPos();renderStockIntelligence();renderFinance();renderSupplierDocuments();renderSuppliers();renderOrders();renderSupplierOptions();renderOrderOptions();fillQuickOrderOptions();fillSupplierDocumentOptions();renderBackorders();renderActivityCenter();applyRoleUi()}
function renderDashboard(){
 const list=visibleProducts(),low=list.filter(p=>num(p.stock)<=num(p.minimum_stock)),value=list.reduce((a,p)=>a+num(p.stock)*unitCost(p),0),margins=list.filter(p=>num(p.sale_price_incl_vat)>0).map(marginPct);
 const openOrders=orders.filter(o=>o.status&&!['received','cancelled'].includes(o.status)&&(selectedVenue==='all'||!o.venue_id||o.venue_id===selectedVenue));
 const suggested=low.reduce((sum,p)=>sum+Math.max(num(p.minimum_stock)-num(p.stock),1)*unitCost(p),0);
 const since=new Date();since.setDate(since.getDate()-30);
 const visibleIds=new Set(list.map(p=>p.id));
 const waste=movements.filter(m=>m.movement_type==='waste'&&visibleIds.has(m.product_id)&&new Date(m.created_at)>=since).reduce((a,m)=>a+Math.abs(num(m.quantity)),0);
 const completeness=list.length?Math.round(list.reduce((a,p)=>a+productCompleteness(p),0)/list.length):0;
 $('kpiProducts').textContent=list.length;$('kpiLow').textContent=low.length;$('kpiValue').textContent=money(value);$('kpiMargin').textContent=(margins.length?margins.reduce((a,b)=>a+b,0)/margins.length:0).toFixed(1)+' %';
 $('kpiOpenOrders').textContent=openOrders.length;$('kpiSuggestedBudget').textContent=money(suggested);$('kpiWaste30').textContent=waste.toFixed(waste%1?1:0);$('kpiCompleteness').textContent=completeness+' %';
 const venueName=selectedVenue==='all'?'vos établissements':(venues.find(v=>v.id===selectedVenue)?.name||'cet établissement');
 $('orionHeadline').textContent=low.length?`ORION a détecté ${low.length} produit(s) à réapprovisionner pour ${venueName}.`:`ORION ne détecte aucune urgence de stock pour ${venueName}.`;
 $('lowList').innerHTML=low.length?low.sort((a,b)=>(num(a.stock)-num(a.minimum_stock))-(num(b.stock)-num(b.minimum_stock))).slice(0,8).map(p=>`<div class="item"><b>${esc(p.name)}</b><span class="muted">Stock ${num(p.stock)} / minimum ${num(p.minimum_stock)} · suggestion ${Math.max(num(p.minimum_stock)-num(p.stock),1)}</span></div>`).join(''):'<div class="empty">Aucune alerte de stock.</div>';
 const advice=[];
 if(low.length)advice.push(['📦',`${low.length} produit(s) à commander`,`Budget indicatif ${money(suggested)}`,'Priorité']);
 if(openOrders.length)advice.push(['🛒',`${openOrders.length} commande(s) encore ouverte(s)`,`Vérifiez les confirmations et livraisons`,'Suivi']);
 if(waste>0)advice.push(['⚠️',`${waste.toFixed(waste%1?1:0)} unité(s) de perte sur 30 jours`,`Analysez les produits concernés`,'À surveiller']);
 if(completeness<100)advice.push(['🧾',`Catalogue complété à ${completeness} %`,`Ajoutez prix, minimums et emplacements`,'Données']);
 if(!advice.length)advice.push(['✅','Tout est sous contrôle','Aucune action urgente détectée','OK']);
 $('orionAdvice').innerHTML=advice.map(a=>`<div class="item advice-row"><span class="advice-icon">${a[0]}</span><div><b>${esc(a[1])}</b><small>${esc(a[2])}</small></div><span class="badge ${a[3]==='OK'?'ok':'warn'}">${esc(a[3])}</span></div>`).join('');
 $('dashboardOrders').innerHTML=openOrders.length?openOrders.slice(0,6).map(o=>{const st=orderStatusLabel(o.status);return `<div class="item dashboard-order"><div><b>${esc(o.order_number||'Commande sans numéro')}</b><span class="muted">${esc(o.suppliers?.name||'Fournisseur')} · ${money(orderTotal(o))}</span></div><span class="badge ${st[1]}">${st[0]}</span></div>`}).join(''):'<div class="empty">Aucune commande ouverte.</div>';
 $('activityList').innerHTML=activity.length?activity.map(a=>`<div class="item"><b>${esc(a.action)}</b><span class="muted">${new Date(a.created_at).toLocaleString('fr-BE')}</span></div>`).join(''):'<div class="empty">Aucune activité enregistrée.</div>';
 renderMissionCenter({list,low,openOrders,suggested,waste,completeness});
}




const SUPPLIER_DOC_KEY='gestiona_supplier_documents_v851';
let supplierDocuments=[];let supplierDocumentFileMeta=null;let deliveryReceiptLines=[];
function loadSupplierDocuments(){try{supplierDocuments=JSON.parse(localStorage.getItem(SUPPLIER_DOC_KEY)||'[]');if(!Array.isArray(supplierDocuments))supplierDocuments=[]}catch{supplierDocuments=[]}}
function saveSupplierDocuments(){localStorage.setItem(SUPPLIER_DOC_KEY,JSON.stringify(supplierDocuments));renderSupplierDocuments()}
function docOrderTotal(o){return orderTotal(o)}
function fillSupplierDocumentOptions(){
 if(!$('docVenue'))return;
 $('docVenue').innerHTML='<option value="">Tous / non précisé</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');
 $('docSupplier').innerHTML='<option value="">À identifier</option>'+suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 updateDocumentOrderOptions();
}
function updateDocumentOrderOptions(){if(!$('docOrder'))return;const supplier=$('docSupplier').value,venue=$('docVenue').value;const list=orders.filter(o=>(!supplier||o.supplier_id===supplier)&&(!venue||o.venue_id===venue));$('docOrder').innerHTML='<option value="">Aucune</option>'+list.map(o=>`<option value="${o.id}">${esc(o.order_number||'Commande')} · ${money(docOrderTotal(o))}</option>`).join('')}
function documentTypeLabel(k){return k==='delivery'?'Bon de livraison':'Facture'}
function documentStatusBadge(s){return s==='matched'?'<span class="badge ok">Conforme</span>':s==='issue'?'<span class="badge bad">Écart</span>':'<span class="badge warn">À contrôler</span>'}
function renderSupplierDocuments(){
 if(!$('supplierDocsBody'))return;const q=($('docSearch')?.value||'').toLowerCase(),filter=$('docTypeFilter')?.value||'all';
 const rows=supplierDocuments.filter(d=>(filter==='all'||d.kind===filter)&&[d.number,d.filename,d.supplierName].join(' ').toLowerCase().includes(q)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 $('docTotalCount').textContent=supplierDocuments.length;$('docPendingCount').textContent=supplierDocuments.filter(d=>d.status==='pending').length;$('docIssueCount').textContent=supplierDocuments.filter(d=>d.status==='issue').length;
 $('supplierDocsBody').innerHTML=rows.length?rows.map(d=>`<tr><td><span class="doc-type-icon">${d.kind==='delivery'?'🚚':'📄'}</span> <button class="link-btn doc-link" data-doc-open="${d.id}">${esc(d.number||d.filename||documentTypeLabel(d.kind))}</button><div class="tiny">${esc(documentTypeLabel(d.kind))} · ${esc(d.filename||'sans fichier')}</div></td><td>${esc(d.supplierName||'À identifier')}</td><td>${d.date?new Date(d.date+'T12:00:00').toLocaleDateString('fr-BE'):'—'}</td><td>${esc(d.orderNumber||'—')}</td><td>${money(num(d.subtotal))}</td><td>${documentStatusBadge(d.status)}${d.kind==='delivery'&&d.missingProducts?.length?`<div class="tiny">${d.missingProducts.length} produit(s) manquant(s)</div>`:''}${d.stockApplied?'<div class="tiny">Stock actualisé</div>':''}</td><td><button class="btn soft mini" data-doc-open="${d.id}">Ouvrir</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">Aucun document fournisseur enregistré.</td></tr>';
 document.querySelectorAll('[data-doc-open]').forEach(b=>b.onclick=()=>openSupplierDocument(b.dataset.docOpen));
}
function resetSupplierDocumentForm(kind='invoice'){
 $('supplierDocumentForm').reset();$('docEditId').value='';$('docKind').value=kind;$('docKindSelect').value=kind;$('docDate').value=new Date().toISOString().slice(0,10);$('docStatus').value='pending';$('deleteSupplierDocumentBtn').classList.add('hidden');supplierDocumentFileMeta=null;$('docFilePreview').classList.add('hidden');$('docFilePreview').innerHTML='';fillSupplierDocumentOptions();if(selectedVenue!=='all')$('docVenue').value=selectedVenue;updateDocumentOrderOptions();$('supplierDocumentTitle').textContent=kind==='delivery'?'🚚 Scanner un bon de livraison':'📄 Scanner une facture';deliveryReceiptLines=[];renderDocumentComparison();openModal('supplierDocumentModal')
}
function openSupplierDocument(id){const d=supplierDocuments.find(x=>x.id===id);if(!d)return;resetSupplierDocumentForm(d.kind);$('docEditId').value=d.id;$('docKindSelect').value=d.kind;$('docKind').value=d.kind;$('docVenue').value=d.venueId||'';$('docSupplier').value=d.supplierId||'';updateDocumentOrderOptions();$('docOrder').value=d.orderId||'';$('docNumber').value=d.number||'';$('docDate').value=d.date||'';$('docSubtotal').value=d.subtotal||0;$('docVat').value=d.vat||0;$('docTotal').value=d.total||0;$('docStatus').value=d.status||'pending';$('docNotes').value=d.notes||'';supplierDocumentFileMeta={filename:d.filename,mime:d.mime,size:d.size,preview:d.preview||null};showSupplierDocumentFile();$('deleteSupplierDocumentBtn').classList.remove('hidden');deliveryReceiptLines=(d.deliveryLines||[]).map(x=>({...x}));renderDocumentComparison()}
function showSupplierDocumentFile(){if(!supplierDocumentFileMeta)return;const m=supplierDocumentFileMeta;const visual=m.preview?`<img src="${m.preview}" alt="Aperçu">`:`<span class="file-icon">${m.mime==='application/pdf'?'📕':'🖼️'}</span>`;$('docFilePreview').innerHTML=`${visual}<div><b>${esc(m.filename||'Document')}</b><div class="tiny">${esc(m.mime||'fichier')} · ${m.size?Math.round(m.size/1024)+' Ko':'taille inconnue'}</div></div>`;$('docFilePreview').classList.remove('hidden')}
function handleSupplierDocumentFile(file){if(!file)return;if(file.size>12*1024*1024){toast('Le fichier dépasse 12 Mo');return}supplierDocumentFileMeta={filename:file.name,mime:file.type||'application/octet-stream',size:file.size,preview:null};if(file.type.startsWith('image/')&&file.size<=1200000){const r=new FileReader();r.onload=()=>{supplierDocumentFileMeta.preview=r.result;showSupplierDocumentFile()};r.readAsDataURL(file)}else showSupplierDocumentFile();if(!$('docNumber').value)$('docNumber').value=file.name.replace(/\.[^.]+$/,'')}
function compareSupplierDocument(){
 const order=orders.find(o=>o.id===$('docOrder').value),subtotal=num($('docSubtotal').value),total=num($('docTotal').value),supplierId=$('docSupplier').value;const checks=[];let issue=false;
 if(order){const expected=docOrderTotal(order),diff=subtotal-expected;checks.push({ok:Math.abs(diff)<0.02,icon:Math.abs(diff)<0.02?'✅':'⚠️',label:'Total HTVA comparé à la commande',detail:`Commande ${money(expected)} · document ${money(subtotal)}${Math.abs(diff)>=0.02?' · écart '+money(diff):''}`});if(Math.abs(diff)>=0.02)issue=true;if(supplierId&&order.supplier_id!==supplierId){checks.push({ok:false,icon:'⚠️',label:'Fournisseur différent de la commande',detail:'Vérifiez le fournisseur sélectionné.'});issue=true}else checks.push({ok:true,icon:'✅',label:'Fournisseur cohérent',detail:'Le fournisseur correspond à la commande liée.'})
 }else checks.push({ok:false,icon:'ℹ️',label:'Aucune commande liée',detail:'Le contrôle des montants et quantités restera manuel.'});
 if(total>0&&subtotal>0){const vat=total-subtotal,entered=num($('docVat').value);const ok=Math.abs(vat-entered)<0.02;checks.push({ok,icon:ok?'✅':'⚠️',label:'Cohérence HTVA / TVA / TVAC',detail:`TVA calculée ${money(vat)} · TVA saisie ${money(entered)}`});if(!ok)issue=true}
 $('docComparison').innerHTML=checks.map(c=>`<div class="doc-check"><span>${c.icon}</span><div><b>${esc(c.label)}</b><div class="tiny">${esc(c.detail)}</div></div><span class="badge ${c.ok?'ok':'warn'}">${c.ok?'OK':'À voir'}</span></div>`).join('');if(order&&$('docKindSelect')?.value!=='delivery')$('docStatus').value=issue?'issue':'matched';return {issue,checks}
}

function selectedDeliveryOrder(){return orders.find(o=>o.id===$('docOrder')?.value)}
function buildDeliveryReceiptLines(force=false){
 const kind=$('docKindSelect')?.value;
 const order=selectedDeliveryOrder();
 const box=$('deliveryReceptionBox'),apply=$('applyDeliveryReceiptBtn');
 if(!box||!apply)return;
 if(kind!=='delivery'||!order){deliveryReceiptLines=[];box.classList.add('hidden');apply.classList.add('hidden');return}
 box.classList.remove('hidden');
 const savedId=$('docEditId')?.value;
 const saved=supplierDocuments.find(d=>d.id===savedId);
 if(!force&&saved?.deliveryLines?.length){
   deliveryReceiptLines=saved.deliveryLines.map(x=>({...x,receivedNow:num(x.receivedNow)}));
 }else{
   deliveryReceiptLines=(order.purchase_order_items||[]).map(item=>{
     const ordered=num(item.quantity_ordered),already=num(item.quantity_received),remaining=Math.max(0,ordered-already);
     return {itemId:item.id,productId:item.product_id||null,description:item.description||products.find(p=>p.id===item.product_id)?.name||'Produit',ordered,alreadyReceived:already,receivedNow:remaining,detectedQty:null,orderedUnitPrice:num(item.unit_price_excl_vat),detectedUnitPrice:num(item.unit_price_excl_vat),scanConfidence:0,unit:products.find(p=>p.id===item.product_id)?.unit||'unité'};
   });
 }
 renderDeliveryReceiptLines();
 apply.classList.toggle('hidden',!!saved?.stockApplied);
 if(saved?.stockApplied)apply.textContent='✅ Réception déjà appliquée au stock';else apply.textContent='✅ Valider la réception et mettre le stock à jour';
 apply.disabled=!!saved?.stockApplied||!deliveryReceiptLines.length;
}
function setDeliveryReceived(index,value){
 if(!deliveryReceiptLines[index])return;
 const max=Math.max(0,deliveryReceiptLines[index].ordered-deliveryReceiptLines[index].alreadyReceived);
 deliveryReceiptLines[index].receivedNow=Math.max(0,Math.min(num(value),max));
 renderDeliveryReceiptLines();
 compareSupplierDocument();
}
function receptionPriceAlert(l){
 const old=num(l.orderedUnitPrice),now=num(l.detectedUnitPrice);if(!old||!now)return {level:'neutral',text:'Non contrôlé',pct:0};
 const pct=(now-old)/old*100;if(pct>10)return {level:'bad',text:`+${pct.toFixed(1)} %`,pct};if(pct>0.5)return {level:'warn',text:`+${pct.toFixed(1)} %`,pct};if(pct<-0.5)return {level:'ok',text:`${pct.toFixed(1)} %`,pct};return {level:'ok',text:'Stable',pct};
}
function setDeliveryPrice(index,value){if(!deliveryReceiptLines[index])return;deliveryReceiptLines[index].detectedUnitPrice=Math.max(0,num(value));renderDeliveryReceiptLines();compareSupplierDocument()}
function renderDeliveryReceiptLines(){
 const body=$('deliveryLinesBody'),summary=$('deliverySummary');if(!body||!summary)return;
 if(!deliveryReceiptLines.length){body.innerHTML='<tr><td colspan="7" class="empty">Cette commande ne contient aucune ligne.</td></tr>';summary.innerHTML='';return}
 let expected=0,received=0,missing=0,priceUps=0,totalOld=0,totalNew=0;
 body.innerHTML=deliveryReceiptLines.map((l,i)=>{
   const remaining=Math.max(0,l.ordered-l.alreadyReceived),miss=Math.max(0,remaining-l.receivedNow),pa=receptionPriceAlert(l);
   expected+=remaining;received+=l.receivedNow;missing+=miss;if(pa.pct>0.5)priceUps++;totalOld+=num(l.receivedNow)*num(l.orderedUnitPrice);totalNew+=num(l.receivedNow)*num(l.detectedUnitPrice);
   const status=miss>0?'<span class="badge bad">Manquant</span>':pa.pct>10?'<span class="badge bad">Hausse forte</span>':pa.pct>0.5?'<span class="badge warn">Prix en hausse</span>':'<span class="badge ok">OK</span>';
   return `<tr class="${miss>0?'delivery-missing':'delivery-complete'}"><td><b>${esc(l.description)}</b><div class="tiny">${esc(l.unit||'unité')}${l.scanConfidence?` · scan ${Math.round(l.scanConfidence)} %`:''}</div></td><td>${l.ordered}</td><td><input type="number" min="0" max="${remaining}" step="0.001" value="${l.receivedNow}" onchange="setDeliveryReceived(${i},this.value)"></td><td>${money(l.orderedUnitPrice)}</td><td><input type="number" min="0" step="0.0001" value="${num(l.detectedUnitPrice)}" onchange="setDeliveryPrice(${i},this.value)" style="width:105px"></td><td><span class="badge ${pa.level}">${esc(pa.text)}</span>${miss?`<div class="tiny">Manque ${miss}</div>`:''}</td><td>${status}</td></tr>`;
 }).join('');
 summary.innerHTML=`<div class="delivery-summary-grid"><div><span>Attendu</span><b>${expected}</b></div><div><span>Reçu</span><b>${received}</b></div><div><span>Manquant</span><b>${missing}</b></div></div><div class="notice ${priceUps?'warn':'success'}" style="margin-top:9px"><b>${priceUps?priceUps+' augmentation(s) de prix détectée(s)':'Aucune hausse de prix détectée'}</b><div class="tiny">Valeur au prix commandé ${money(totalOld)} · valeur détectée ${money(totalNew)} · écart ${money(totalNew-totalOld)}</div></div>`;
 renderDeliveryMissingAlerts();
 if($('docStatus'))$('docStatus').value=missing>0||priceUps>0?'issue':'matched';
}
function deliveryAlertMessage(l){
 const remaining=Math.max(0,num(l.ordered)-num(l.alreadyReceived)),received=num(l.receivedNow),missing=Math.max(0,remaining-received);
 if(missing<=0)return '';
 if(received<=0)return `${l.description} non livré`;
 return `${l.description} livré partiellement — manque ${formatQty(missing)} ${l.unit||'unité(s)'}`;
}
function renderDeliveryMissingAlerts(){
 const box=$('deliveryMissingAlerts');if(!box)return;
 const alerts=deliveryReceiptLines.map(l=>({line:l,message:deliveryAlertMessage(l)})).filter(x=>x.message);
 if(!alerts.length){box.classList.add('hidden');box.innerHTML='';return}
 box.classList.remove('hidden');
 box.innerHTML=`<div class="delivery-alert-head"><div><span class="delivery-alert-icon">🚨</span><div><b>${alerts.length} anomalie${alerts.length>1?'s':''} de livraison</b><small>ORION a comparé le bon à la commande liée.</small></div></div><button type="button" class="btn soft mini" onclick="copyDeliveryClaim()">Copier la réclamation</button></div><div class="delivery-alert-list">${alerts.map(a=>`<div class="delivery-alert-item"><span>❌</span><div><b>${esc(a.message)}</b><small>Commandé : ${formatQty(Math.max(0,num(a.line.ordered)-num(a.line.alreadyReceived)))} · Reçu : ${formatQty(num(a.line.receivedNow))}</small></div></div>`).join('')}</div>`;
}
function deliveryClaimText(){
 const order=selectedDeliveryOrder(),supplier=suppliers.find(s=>s.id===$('docSupplier')?.value),missing=deliveryReceiptLines.map(l=>({line:l,message:deliveryAlertMessage(l)})).filter(x=>x.message);
 if(!missing.length)return '';
 return `Bonjour,\n\nConcernant la livraison ${$('docNumber')?.value||''}${order?.order_number?` liée à la commande ${order.order_number}`:''}, nous constatons les anomalies suivantes :\n\n${missing.map(x=>`- ${x.message} (commandé : ${formatQty(Math.max(0,num(x.line.ordered)-num(x.line.alreadyReceived)))}, reçu : ${formatQty(num(x.line.receivedNow))})`).join('\n')}\n\nMerci de nous confirmer la livraison du reliquat ou l'émission d'une note de crédit.\n\nCordialement`;
}
async function copyDeliveryClaim(){
 const text=deliveryClaimText();if(!text){toast('Aucune anomalie à réclamer');return}
 try{await navigator.clipboard.writeText(text);toast('Réclamation copiée')}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();toast('Réclamation copiée')}
}
window.copyDeliveryClaim=copyDeliveryClaim;
function notifyMissingDelivery(lines,order){
 if(!('Notification' in window)||Notification.permission!=='granted'||!lines.length)return;
 const first=deliveryAlertMessage(lines[0]);const extra=lines.length>1?` et ${lines.length-1} autre(s) anomalie(s)`:'';
 try{new Notification('GESTIONA — Livraison incomplète',{body:`${first}${extra}${order?.order_number?` · Commande ${order.order_number}`:''}`,icon:'icons/icon-192.png'})}catch{}
}

function deliveryMissingProducts(){
 return deliveryReceiptLines.map(l=>({...l,missing:Math.max(0,l.ordered-l.alreadyReceived-l.receivedNow)})).filter(l=>l.missing>0);
}
async function applyDeliveryReceipt(){
 const order=selectedDeliveryOrder();
 if(!order){toast('Sélectionnez la commande liée');return}
 if($('docKindSelect').value!=='delivery'){toast('Cette action concerne les bons de livraison');return}
 const editId=$('docEditId').value;
 const existing=supplierDocuments.find(d=>d.id===editId);
 if(existing?.stockApplied){toast('Cette réception a déjà été appliquée');return}
 const receivedLines=deliveryReceiptLines.filter(l=>num(l.receivedNow)>0);
 const missing=deliveryMissingProducts();
 if(!deliveryReceiptLines.length){toast('Aucune ligne de réception');return}
 if(!confirm(`Confirmer la réception de ${receivedLines.length} produit(s) ?\n\nLe stock sera augmenté. ${missing.length?missing.length+' produit(s) sont signalés comme manquants.':'Aucun produit manquant.'}`))return;
 const btn=$('applyDeliveryReceiptBtn');btn.disabled=true;btn.textContent='Mise à jour du stock…';
 try{
   for(const l of receivedLines){
     if(l.productId){
       const {error}=await sb.rpc('record_stock_movement',{p_product_id:l.productId,p_quantity:num(l.receivedNow),p_movement_type:'purchase',p_note:`Réception ${$('docNumber').value||'bon de livraison'} · commande ${order.order_number||''}`});
       if(error)throw error;
     }
     const {error:itemError}=await sb.from('purchase_order_items').update({quantity_received:num(l.alreadyReceived)+num(l.receivedNow)}).eq('id',l.itemId);
     if(itemError)throw itemError;
   }
   const allComplete=deliveryReceiptLines.every(l=>num(l.alreadyReceived)+num(l.receivedNow)>=num(l.ordered));
   const {error:orderError}=await sb.from('purchase_orders').update({status:allComplete?'received':'partially_received'}).eq('id',order.id);
   if(orderError)throw orderError;
   const id=editId||('doc-'+Date.now()),supplier=suppliers.find(s=>s.id===$('docSupplier').value),venue=venues.find(v=>v.id===$('docVenue').value),old=supplierDocuments.find(d=>d.id===id);
   const notesMissing=missing.length?`Produits manquants : ${missing.map(x=>`${x.description} (${x.missing})`).join(', ')}`:'Livraison complète';
   const d={id,kind:'delivery',venueId:$('docVenue').value||order.venue_id||null,venueName:venue?.name||order.venues?.name||'',supplierId:$('docSupplier').value||order.supplier_id||null,supplierName:supplier?.name||order.suppliers?.name||'',orderId:order.id,orderNumber:order.order_number||'',number:$('docNumber').value.trim(),date:$('docDate').value,subtotal:num($('docSubtotal').value),vat:num($('docVat').value),total:num($('docTotal').value),status:missing.length?'issue':'matched',notes:[$('docNotes').value.trim(),notesMissing].filter(Boolean).join('\n'),filename:supplierDocumentFileMeta?.filename||old?.filename||'',mime:supplierDocumentFileMeta?.mime||old?.mime||'',size:supplierDocumentFileMeta?.size||old?.size||0,preview:supplierDocumentFileMeta?.preview||old?.preview||null,deliveryLines:deliveryReceiptLines.map(x=>({...x})),missingProducts:missing.map(x=>({productId:x.productId,description:x.description,missing:x.missing})),isComplementary:order.status==='partially_received'||deliveryReceiptLines.some(x=>num(x.alreadyReceived)>0),priceAlerts:deliveryReceiptLines.filter(x=>receptionPriceAlert(x).pct>0.5).map(x=>({productId:x.productId,description:x.description,oldPrice:x.orderedUnitPrice,newPrice:x.detectedUnitPrice,percent:receptionPriceAlert(x).pct})),stockApplied:true,stockAppliedAt:new Date().toISOString(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
   supplierDocuments=supplierDocuments.filter(x=>x.id!==id);supplierDocuments.push(d);saveSupplierDocuments();
   await audit('Bon de livraison validé','purchase_order',order.id,{document_number:d.number,received:receivedLines.map(x=>({product_id:x.productId,quantity:x.receivedNow})),missing:d.missingProducts,status:allComplete?'received':'partially_received'});
   $('docEditId').value=id;
   await refresh();openSupplierDocument(id);
   toast(missing.length?`Stock mis à jour · ${missing.length} produit(s) manquant(s)`:'Stock mis à jour · livraison complète');
 }catch(e){toast('Réception impossible : '+(e.message||e))}
 finally{btn.disabled=false;btn.textContent='✅ Valider la réception et mettre le stock à jour'}
}
function normalizeScanText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9.,%\s-]/g,' ').replace(/\s+/g,' ').trim()}
function scanTokens(v){return normalizeScanText(v).split(' ').filter(x=>x.length>2&&!['avec','pour','prix','total','tva','eur','piece','colis'].includes(x))}
function scanLineScore(description,line){const tokens=scanTokens(description);if(!tokens.length)return 0;const norm=normalizeScanText(line);return tokens.filter(t=>norm.includes(t)).length/tokens.length}
function parseNumbersFromScanLine(line){return (String(line).match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>num(x.replace(',','.')))}

function orderRemainingUnits(order){
 return (order?.purchase_order_items||[]).reduce((sum,item)=>sum+Math.max(0,num(item.quantity_ordered)-num(item.quantity_received)),0);
}
function orderIsOpenForReceipt(order){return order&&!['received','cancelled'].includes(order.status)&&orderRemainingUnits(order)>0}
function supplierScoreFromText(order,text){
 const supplierName=normalizeScanText(order.suppliers?.name||suppliers.find(s=>s.id===order.supplier_id)?.name||'');
 if(!supplierName)return 0;const tokens=scanTokens(supplierName);return tokens.length?tokens.filter(t=>text.includes(t)).length/tokens.length:0;
}
function orderDocumentMatchScore(order,text){
 if(!orderIsOpenForReceipt(order))return -1;
 let score=supplierScoreFromText(order,text)*35,matched=0,total=0;
 (order.purchase_order_items||[]).forEach(item=>{const desc=item.description||products.find(p=>p.id===item.product_id)?.name||'';if(!desc)return;total++;const best=text.split(/\r?\n/).reduce((m,line)=>Math.max(m,scanLineScore(desc,line)),0);if(best>=0.34)matched++;score+=best*8});
 if(total)score+=(matched/total)*45;
 const number=normalizeScanText(order.order_number||'');if(number&&text.includes(number))score+=25;
 if(order.status==='partially_received')score+=8;
 const created=new Date(order.created_at||0);if(!isNaN(created)){const days=Math.abs(Date.now()-created.getTime())/86400000;score+=Math.max(0,10-days/3)}
 return score;
}
function autoSelectDeliveryOrderFromText(rawText){
 const text=normalizeScanText(rawText),ranked=orders.map(o=>({order:o,score:orderDocumentMatchScore(o,text)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
 const best=ranked[0];if(!best||best.score<24)return null;
 const o=best.order;$('docOrder').value=o.id;$('docSupplier').value=o.supplier_id||'';$('docVenue').value=o.venue_id||'';updateDocumentOrderOptions();$('docOrder').value=o.id;
 return {order:o,score:best.score,second:ranked[1]?.score||0};
}
function renderBackorders(){
 const box=$('receptionBackorders');if(!box)return;
 const open=orders.filter(o=>o.status==='partially_received'&&orderRemainingUnits(o)>0&&(selectedVenue==='all'||!o.venue_id||o.venue_id===selectedVenue));
 box.innerHTML=open.length?open.map(o=>{const missing=(o.purchase_order_items||[]).filter(i=>num(i.quantity_received)<num(i.quantity_ordered));return `<div class="item"><div><b>${esc(o.order_number||'Commande')}</b><small>${esc(o.suppliers?.name||'Fournisseur')} · ${missing.length} produit(s) · ${formatQty(orderRemainingUnits(o))} unité(s) en attente</small></div><button class="btn mini gold" onclick="openBackorderReceipt('${o.id}')">Recevoir le complément</button></div>`}).join(''):'<div class="empty">Aucun reliquat fournisseur en attente.</div>';
}
function openBackorderReceipt(orderId){resetSupplierDocumentForm('delivery');const o=orders.find(x=>x.id===orderId);if(!o)return;$('docSupplier').value=o.supplier_id||'';$('docVenue').value=o.venue_id||'';updateDocumentOrderOptions();$('docOrder').value=o.id;buildDeliveryReceiptLines(true);$('scanAnalysisStatus').className='notice warn';$('scanAnalysisStatus').innerHTML='<b>Livraison complémentaire attendue.</b><div class="tiny">Le scan sera comparé uniquement aux quantités encore manquantes.</div>'}
window.openBackorderReceipt=openBackorderReceipt;

async function extractDocumentText(file,status){
 if(!window.Tesseract)throw new Error('Le moteur OCR ne s’est pas chargé. Vérifiez la connexion internet puis réessayez.');
 const recognize=async(source,label)=>{const result=await Tesseract.recognize(source,'fra+eng',{logger:m=>{if(status&&m.progress)status.textContent=`${label} : ${Math.round(m.progress*100)} %`}});return result?.data?.text||''};
 if(file.type.startsWith('image/'))return await recognize(file,'Lecture de la photo');
 if(file.type==='application/pdf'||/\.pdf$/i.test(file.name||'')){
  if(window.pdfjsReady)await window.pdfjsReady;
  if(!window.pdfjsLib)throw new Error('Le lecteur PDF ne s’est pas chargé. Réessayez avec une photo du bon de livraison.');
  const bytes=new Uint8Array(await file.arrayBuffer()),pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
  const pageCount=Math.min(pdf.numPages,4);let full='';
  for(let n=1;n<=pageCount;n++){
   if(status)status.textContent=`Préparation de la page ${n}/${pageCount}…`;
   const page=await pdf.getPage(n),viewport=page.getViewport({scale:2});
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:ctx,viewport}).promise;
   full+='\n'+await recognize(canvas,`Lecture PDF page ${n}/${pageCount}`);
  }
  return full.trim();
 }
 throw new Error('Format non pris en charge. Utilisez une photo JPG/PNG ou un PDF.');
}
async function analyzeDeliveryScan(){
 const file=$('supplierDocumentFile')?.files?.[0],status=$('scanAnalysisStatus');
 if(!file){toast('Choisissez ou photographiez le bon de livraison');return}
 const btn=$('analyzeDeliveryScanBtn');btn.disabled=true;btn.textContent='Lecture en cours…';if(status){status.className='notice';status.textContent='ORION lit le document, recherche la commande et compare les produits…'}
 try{
  const text=await extractDocumentText(file,status);
  if(!text||text.replace(/\s/g,'').length<8)throw new Error('Le document est illisible. Reprenez la photo bien à plat, avec davantage de lumière.');
  let auto=null;if(!$('docOrder').value)auto=autoSelectDeliveryOrderFromText(text);
  const order=selectedDeliveryOrder();if(!order)throw new Error('Aucune commande n’a été reconnue avec assez de certitude. Sélectionnez la commande correspondante puis relancez l’analyse.');
  buildDeliveryReceiptLines(true);
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);let matched=0;
  deliveryReceiptLines.forEach(l=>{let best='',score=0;for(const line of lines){const sc=scanLineScore(l.description,line);if(sc>score){score=sc;best=line}}const remaining=Math.max(0,l.ordered-l.alreadyReceived);if(score>=0.34){const nums=parseNumbersFromScanLine(best);let qty=nums.find(n=>n>0&&n<=Math.max(remaining*2,2));if(qty==null)qty=remaining;l.receivedNow=Math.min(remaining,qty);l.detectedQty=l.receivedNow;const plausible=nums.filter(n=>n>0.05&&n<5000&&Math.abs(n-qty)>0.0001);if(plausible.length)l.detectedUnitPrice=plausible[plausible.length-1];l.scanConfidence=Math.min(99,Math.round(score*100));l.scanSource=best;matched++}else{l.receivedNow=0;l.detectedQty=0;l.scanConfidence=0;l.scanSource=''}});
  renderDeliveryReceiptLines();compareSupplierDocument();
  const missing=deliveryMissingProducts(),ups=deliveryReceiptLines.filter(l=>receptionPriceAlert(l).pct>0.5),isBackorder=order.status==='partially_received'||deliveryReceiptLines.some(l=>num(l.alreadyReceived)>0);
  if(status){status.className=`notice ${missing.length||ups.length?'warn':'success'}`;status.innerHTML=`<b>${auto?'Commande reconnue automatiquement':'Commande comparée'} : ${esc(order.order_number||'sans numéro')}</b><div class="tiny">${isBackorder?'Complément de livraison / reliquat · ':''}${matched}/${deliveryReceiptLines.length} ligne(s) reconnue(s) · ${missing.length} article(s) non livré(s) ou incomplet(s) · ${ups.length} hausse(s) de prix. Vérifiez les lignes signalées avant validation.</div>`}
  notifyMissingDelivery(missing,order);
  toast(missing.length||ups.length?'Comparaison terminée avec alertes':'Livraison conforme — prête à valider');
 }catch(e){if(status){status.className='notice warn';status.textContent=e.message||String(e)}toast(e.message||String(e))}finally{btn.disabled=false;btn.textContent='🤖 Analyser le scan'}
}

function renderDocumentComparison(){if(!$('docComparison'))return;compareSupplierDocument();buildDeliveryReceiptLines()}

function exportSupplierDocuments(){const data=JSON.stringify(supplierDocuments.map(({preview,...d})=>d),null,2),blob=new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gestiona-documents-fournisseurs.json';a.click();URL.revokeObjectURL(a.href)}

function financeVisibleOrders(){
 const since=new Date();since.setDate(since.getDate()-30);
 return orders.filter(o=>new Date(o.created_at)>=since&&(selectedVenue==='all'||!o.venue_id||o.venue_id===selectedVenue)&&o.status!=='cancelled');
}
function financePriceChanges(){
 const byProduct=new Map();
 priceHistoryRows.forEach(r=>{if(!byProduct.has(r.product_id))byProduct.set(r.product_id,[]);byProduct.get(r.product_id).push(r)});
 const alerts=[];
 visibleProducts().forEach(p=>{
   const rows=(byProduct.get(p.id)||[]).sort((a,b)=>new Date(b.effective_at||b.created_at)-new Date(a.effective_at||a.created_at));
   if(rows.length<2)return;
   const current=num(rows[0].unit_price_excl_vat)||num(rows[0].package_price_excl_vat)/Math.max(num(rows[0].units_per_package),1);
   const previous=num(rows[1].unit_price_excl_vat)||num(rows[1].package_price_excl_vat)/Math.max(num(rows[1].units_per_package),1);
   if(previous<=0)return;
   const pct=(current-previous)/previous*100;
   if(Math.abs(pct)>=5)alerts.push({product:p,current,previous,pct});
 });
 return alerts.sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct));
}
function renderFinance(){
 if(!$('financeSpend30'))return;
 const list=visibleProducts();
 const recentOrders=financeVisibleOrders();
 const spend=recentOrders.reduce((sum,o)=>sum+orderTotal(o),0);
 const marginProducts=list.filter(p=>saleEx(p)>0&&unitCost(p)>0);
 const avgMargin=marginProducts.length?marginProducts.reduce((s,p)=>s+marginPct(p),0)/marginProducts.length:0;
 const below=marginProducts.filter(p=>{const target=num(p.target_margin_percent)||65;return marginPct(p)<target});
 const priceAlerts=financePriceChanges();
 $('financeSpend30').textContent=money(spend);
 $('financeAvgMargin').textContent=avgMargin.toFixed(1)+' %';
 $('financeBelowTarget').textContent=below.length;
 $('financePriceAlerts').textContent=priceAlerts.filter(x=>x.pct>0).length;

 const alerts=[];
 priceAlerts.filter(x=>x.pct>0).slice(0,5).forEach(x=>alerts.push({cls:x.pct>=15?'bad':'warn',icon:'📈',title:`${x.product.name} a augmenté de ${x.pct.toFixed(1)} %`,detail:`${money(x.previous)} → ${money(x.current)} par unité`,badge:'Prix'}));
 below.sort((a,b)=>(marginPct(a)-(num(a.target_margin_percent)||65))-(marginPct(b)-(num(b.target_margin_percent)||65))).slice(0,5).forEach(p=>alerts.push({cls:marginPct(p)<40?'bad':'warn',icon:'📉',title:`Marge faible : ${p.name}`,detail:`Marge ${marginPct(p).toFixed(1)} % · objectif ${num(p.target_margin_percent)||65} %`,badge:'Marge'}));
 if(!alerts.length)alerts.push({cls:'ok',icon:'✅',title:'Aucune anomalie financière importante',detail:'Les prix et marges disponibles sont cohérents.',badge:'OK'});
 $('financeAlerts').innerHTML=alerts.slice(0,8).map(a=>`<div class="finance-alert ${a.cls}"><span style="font-size:22px">${a.icon}</span><div><b>${esc(a.title)}</b><small>${esc(a.detail)}</small></div><span class="badge ${a.cls==='bad'?'bad':a.cls==='warn'?'warn':'ok'}">${a.badge}</span></div>`).join('');

 const supplierTotals={};
 recentOrders.forEach(o=>{const name=o.suppliers?.name||'Sans fournisseur';supplierTotals[name]=(supplierTotals[name]||0)+orderTotal(o)});
 const supplierRows=Object.entries(supplierTotals).sort((a,b)=>b[1]-a[1]);
 const maxSupplier=supplierRows[0]?.[1]||1;
 $('financeSupplierSpend').innerHTML=supplierRows.length?supplierRows.map(([name,total])=>`<div class="finance-category"><div class="row between"><b>${esc(name)}</b><span class="money">${money(total)}</span></div><div class="finance-bar"><i style="width:${Math.max(3,total/maxSupplier*100)}%"></i></div></div>`).join(''):'<div class="empty">Aucune commande enregistrée sur les 30 derniers jours.</div>';

 const cats={};
 marginProducts.forEach(p=>{const c=p.category||'Sans catégorie';(cats[c]??=[]).push(marginPct(p))});
 const catRows=Object.entries(cats).map(([name,vals])=>[name,vals.reduce((a,b)=>a+b,0)/vals.length,vals.length]).sort((a,b)=>b[1]-a[1]);
 $('financeCategoryMargins').innerHTML=catRows.length?catRows.map(([name,margin,count])=>`<div class="finance-category"><div class="row between"><b>${esc(name)}</b><span>${margin.toFixed(1)} % · ${count} produit(s)</span></div><div class="finance-bar"><i style="width:${Math.max(2,Math.min(100,margin))}%"></i></div></div>`).join(''):'<div class="empty">Ajoutez des prix d’achat et de vente pour calculer les marges.</div>';

 const rows=below.slice(0,20);
 $('financeProductsBody').innerHTML=rows.length?rows.map(p=>{const margin=marginPct(p),target=num(p.target_margin_percent)||65,diff=margin-target;return `<tr><td><b>${esc(p.name)}</b><div class="tiny">${esc(p.category||'Sans catégorie')}</div></td><td>${money(unitCost(p))}</td><td>${money(saleEx(p))}</td><td><span class="badge ${margin<40?'bad':'warn'}">${margin.toFixed(1)} %</span></td><td>${target.toFixed(1)} %</td><td class="${diff<0?'movement-negative':'movement-positive'}">${diff.toFixed(1)} pts</td></tr>`}).join(''):'<tr><td colspan="6" class="empty">Aucun produit sous son objectif de marge.</td></tr>';
}


function copilotOrderSavingsEstimate(){
 const low=visibleProducts().filter(p=>num(p.minimum_stock)>num(p.stock));
 const excess=visibleProducts().filter(p=>num(p.stock)>Math.max(num(p.minimum_stock)*3,10)&&unitCost(p)>0);
 const avoidOverstock=excess.reduce((sum,p)=>sum+Math.max(0,num(p.stock)-Math.max(num(p.minimum_stock)*2,5))*unitCost(p),0);
 const marginLeaks=visibleProducts().filter(p=>saleEx(p)>0&&unitCost(p)>0&&marginPct(p)<(num(p.target_margin_percent)||65));
 const marginRecovery=marginLeaks.reduce((sum,p)=>sum+Math.max(0,(num(p.target_margin_percent)||65)-marginPct(p))*saleEx(p)/100,0);
 return {low,excess,avoidOverstock,marginLeaks,marginRecovery,total:avoidOverstock+marginRecovery};
}
function copilotUnifiedAlerts(){
 const alerts=[];
 buildSmartNotifications().forEach(n=>alerts.push({level:n.level==='critical'?'critical':n.level==='warning'?'warning':n.level==='ok'?'ok':'info',icon:n.icon,title:n.title,detail:n.detail,view:n.action}));
 visibleProducts().filter(p=>num(p.minimum_stock)>num(p.stock)).sort((a,b)=>(num(a.stock)-num(a.minimum_stock))-(num(b.stock)-num(b.minimum_stock))).slice(0,5).forEach(p=>alerts.push({level:num(p.stock)<=0?'critical':'warning',icon:num(p.stock)<=0?'🚨':'📦',title:p.name,detail:`Stock ${num(p.stock)} · minimum ${num(p.minimum_stock)}`,view:'products'}));
 financePriceChanges().filter(x=>x.pct>0).slice(0,3).forEach(x=>alerts.push({level:x.pct>=15?'critical':'warning',icon:'📈',title:`Hausse de prix : ${x.product.name}`,detail:`+${x.pct.toFixed(1)} % · ${money(x.previous)} → ${money(x.current)}`,view:'finance'}));
 visibleProducts().filter(p=>saleEx(p)>0&&unitCost(p)>0&&marginPct(p)<(num(p.target_margin_percent)||65)).sort((a,b)=>marginPct(a)-marginPct(b)).slice(0,3).forEach(p=>alerts.push({level:marginPct(p)<40?'critical':'warning',icon:'📉',title:`Marge faible : ${p.name}`,detail:`${marginPct(p).toFixed(1)} % · objectif ${num(p.target_margin_percent)||65} %`,view:'finance'}));
 const rank={critical:0,warning:1,info:2,ok:3};return alerts.sort((a,b)=>rank[a.level]-rank[b.level]).slice(0,10);
}
function renderCopilot(){
 if(!$('copilotAlerts'))return;
 const alerts=copilotUnifiedAlerts(),critical=alerts.filter(a=>a.level==='critical').length;
 $('copilotAlertBadge').textContent=`${alerts.length} alerte${alerts.length>1?'s':''}`;$('copilotAlertBadge').className=`badge ${critical?'bad':alerts.some(a=>a.level==='warning')?'warn':'ok'}`;
 $('copilotAlerts').innerHTML=alerts.length?alerts.map(a=>`<div class="copilot-alert ${a.level}"><span style="font-size:21px">${a.icon}</span><div><b>${esc(a.title)}</b><small>${esc(a.detail)}</small></div>${a.view?`<button class="btn mini ${a.level==='critical'?'primary':'soft'}" onclick="missionOpenView('${a.view}')">Ouvrir</button>`:''}</div>`).join(''):'<div class="mission-empty">✅ Aucun point important détecté.</div>';
 const save=copilotOrderSavingsEstimate();$('copilotSavingsTotal').textContent=money(save.total);
 const savings=[];if(save.avoidOverstock>0)savings.push({amount:save.avoidOverstock,title:'Réduire le surstock',detail:`${save.excess.length} produit(s) dépassent largement leur minimum.`});if(save.marginRecovery>0)savings.push({amount:save.marginRecovery,title:'Corriger les marges faibles',detail:`${save.marginLeaks.length} produit(s) sont sous leur objectif.`});if(!savings.length)savings.push({amount:0,title:'Aucune économie immédiate détectée',detail:'Les données disponibles ne montrent pas de fuite évidente.'});
 $('copilotSavings').innerHTML=savings.map(x=>`<div class="saving-card"><strong>${money(x.amount)}</strong><b style="display:block;margin-top:3px">${esc(x.title)}</b><small>${esc(x.detail)}</small></div>`).join('');
 const venueRows=(selectedVenue==='all'?venues:venues.filter(v=>String(v.id)===String(selectedVenue))).map(v=>{const vp=products.filter(p=>String(p.venue_id||'')===String(v.id)),low=vp.filter(p=>num(p.minimum_stock)>num(p.stock)).length,open=orders.filter(o=>String(o.venue_id||'')===String(v.id)&&['draft','sent','confirmed'].includes(o.status)).length,margins=vp.filter(p=>saleEx(p)>0&&unitCost(p)>0).map(marginPct),avg=margins.length?margins.reduce((a,b)=>a+b,0)/margins.length:0;return {v,count:vp.length,low,open,avg}});
 $('copilotVenuePulse').innerHTML=venueRows.length?venueRows.map(x=>`<div class="venue-card"><div class="venue-card-head"><b>🏪 ${esc(x.v.name)}</b><span class="badge ${x.low?'warn':'ok'}">${x.low?x.low+' à commander':'Stock OK'}</span></div><div class="venue-stats"><div class="venue-stat"><b>${x.count}</b><small>produits</small></div><div class="venue-stat"><b>${x.open}</b><small>commandes ouvertes</small></div><div class="venue-stat"><b>${x.avg.toFixed(1)} %</b><small>marge moyenne</small></div></div></div>`).join(''):'<div class="empty">Aucun établissement disponible.</div>';
}
function venueBusinessMetrics(v){
 const vid=String(v.id),vp=products.filter(p=>p.active!==false&&String(p.venue_id||'')===vid),todayKey=dateKeyOffset(0);
 const vs=sales.filter(s=>String(s.venue_id||'')===vid&&String(s.created_at||'').slice(0,10)===todayKey);
 const revenue=vs.reduce((a,x)=>a+num(x.total),0),covers=vs.reduce((a,x)=>a+num(x.covers),0),stockValue=vp.reduce((a,p)=>a+num(p.stock)*unitCost(p),0);
 const ruptures=vp.filter(p=>num(p.stock)<=0).length,low=vp.filter(p=>num(p.minimum_stock)>num(p.stock)).length;
 const open=orders.filter(o=>String(o.venue_id||'')===vid&&['draft','sent','confirmed','partial','partially_received'].includes(o.status)).length;
 const issues=supplierDocuments.filter(d=>String(d.venueId||'')===vid&&d.kind==='delivery'&&(d.status==='issue'||(d.missingProducts||[]).length)).length;
 const priceAlerts=supplierDocuments.filter(d=>String(d.venueId||'')===vid&&d.kind==='delivery').reduce((n,d)=>n+(d.priceAlerts||[]).filter(a=>num(a.percent)>0.5).length,0);
 const margins=vp.filter(p=>saleEx(p)>0&&unitCost(p)>0).map(marginPct),avgMargin=margins.length?margins.reduce((a,b)=>a+b,0)/margins.length:0;
 const risk=ruptures*5+low*2+issues*4+priceAlerts+open;
 return {venue:v,products:vp.length,revenue,covers,tickets:vs.length,stockValue,ruptures,low,open,issues,priceAlerts,avgMargin,risk};
}
function renderVenueControlCenter(){
 const body=$('venueControlBody'),cards=$('venueControlCards');if(!body||!cards)return;
 const rows=venues.map(venueBusinessMetrics).sort((a,b)=>b.risk-a.risk||b.revenue-a.revenue);
 cards.innerHTML=rows.length?rows.map(x=>`<article class="venue-control-card ${x.risk>=10?'risk':x.risk?'watch':'ok'}"><div class="row between"><div><span class="tiny">${x.risk>=10?'Priorité élevée':x.risk?'À surveiller':'Situation maîtrisée'}</span><h3>${esc(x.venue.name)}</h3></div><span class="venue-health-dot"></span></div><div class="venue-control-metrics"><div><b>${money(x.revenue)}</b><small>CA aujourd’hui</small></div><div><b>${money(x.stockValue)}</b><small>Valeur du stock</small></div><div><b>${x.low}</b><small>À commander</small></div><div><b>${x.issues}</b><small>Anomalies livraison</small></div></div><button class="btn soft mini block" type="button" onclick="focusVenue('${x.venue.id}')">Ouvrir cet établissement</button></article>`).join(''):'<div class="empty">Aucun établissement disponible.</div>';
 body.innerHTML=rows.length?rows.map(x=>`<tr><td><b>${esc(x.venue.name)}</b><div class="tiny">${x.products} produit(s) · marge ${x.avgMargin.toFixed(1)} %</div></td><td class="money"><b>${money(x.revenue)}</b><div class="tiny">${x.tickets} ticket(s)</div></td><td>${x.covers}</td><td class="money">${money(x.stockValue)}</td><td><span class="badge ${x.ruptures?'bad':'ok'}">${x.ruptures}</span></td><td><span class="badge ${x.low?'warn':'ok'}">${x.low}</span></td><td>${x.open}</td><td><span class="badge ${x.issues?'bad':'ok'}">${x.issues}</span>${x.priceAlerts?`<div class="tiny">${x.priceAlerts} hausse(s) prix</div>`:''}</td><td><button class="btn soft mini" type="button" onclick="focusVenue('${x.venue.id}')">Afficher</button></td></tr>`).join(''):'<tr><td colspan="9" class="empty">Aucune donnée d’établissement.</td></tr>';
 const totalRevenue=rows.reduce((a,x)=>a+x.revenue,0),totalStock=rows.reduce((a,x)=>a+x.stockValue,0),priority=rows[0];
 let insight=`CA cumulé aujourd’hui : ${money(totalRevenue)} · valeur totale du stock : ${money(totalStock)}.`;
 if(priority&&priority.risk>0)insight+=` Priorité : ${priority.venue.name}, avec ${priority.ruptures} rupture(s), ${priority.low} produit(s) à commander et ${priority.issues} anomalie(s) de livraison.`;
 else if(rows.length)insight+=' Aucun établissement ne présente d’alerte opérationnelle majeure.';
 $('venueControlInsight').innerHTML=`<b>🤖 Analyse comparative ORION</b><div class="tiny" style="margin-top:6px">${esc(insight)}</div>`;
}
function focusVenue(id){selectedVenue=String(id);if($('venueSelect'))$('venueSelect').value=selectedVenue;renderAll();window.scrollTo({top:0,behavior:'smooth'});toast(`${venues.find(v=>String(v.id)===selectedVenue)?.name||'Établissement'} affiché`)}
window.focusVenue=focusVenue;
function selectedVenueSales(){return sales.filter(s=>selectedVenue==='all'||!s.venue_id||String(s.venue_id)===String(selectedVenue))}
function salesForDateKey(key){return selectedVenueSales().filter(s=>String(s.created_at||'').slice(0,10)===key)}
function dateKeyOffset(days){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dailyBusinessSnapshot(){
 const list=visibleProducts(),low=list.filter(p=>num(p.minimum_stock)>num(p.stock)),ruptures=list.filter(p=>num(p.stock)<=0),today=salesForDateKey(dateKeyOffset(0)),yesterday=salesForDateKey(dateKeyOffset(-1));
 const revenue=today.reduce((a,x)=>a+num(x.total),0),previous=yesterday.reduce((a,x)=>a+num(x.total),0),covers=today.reduce((a,x)=>a+num(x.covers),0);
 const open=orders.filter(o=>['draft','sent','confirmed','partial'].includes(o.status)&&(selectedVenue==='all'||!o.venue_id||String(o.venue_id)===String(selectedVenue)));
 const receptionIssues=supplierDocuments.filter(d=>d.kind==='delivery'&&(d.status==='issue'||(d.missingProducts||[]).length));
 const priceAlerts=supplierCatalogRows().filter(r=>r.pct>0.5).sort((a,b)=>b.pct-a.pct);
 return {list,low,ruptures,today,revenue,previous,covers,open,receptionIssues,priceAlerts};
}
function renderDailyBrief(){
 const box=$('orionDailyBrief');if(!box)return;const x=dailyBusinessSnapshot(),delta=x.previous>0?(x.revenue-x.previous)/x.previous*100:null;
 const cards=[
  ['💶','CA aujourd’hui',money(x.revenue),delta===null?'Pas de comparaison disponible':`${delta>=0?'+':''}${delta.toFixed(1)} % vs hier`],
  ['👥','Couverts',String(x.covers),x.today.length?`${x.today.length} ticket(s) · ticket moyen ${money(x.revenue/x.today.length)}`:'Aucune vente enregistrée'],
  ['📦','Stock à traiter',String(x.low.length),`${x.ruptures.length} rupture(s) complète(s)`],
  ['🚚','Commandes ouvertes',String(x.open.length),`${x.receptionIssues.length} réception(s) avec anomalie`],
  ['📈','Hausses fournisseurs',String(x.priceAlerts.length),x.priceAlerts[0]?`${x.priceAlerts[0].product.name} : +${x.priceAlerts[0].pct.toFixed(1)} %`:'Aucune hausse récente']
 ];
 box.innerHTML=cards.map(c=>`<div class="daily-brief-card"><span>${c[0]} ${esc(c[1])}</span><b>${esc(c[2])}</b><small>${esc(c[3])}</small></div>`).join('');
 const priorities=[];if(x.ruptures.length)priorities.push(`${x.ruptures.length} produit(s) sont en rupture`);else if(x.low.length)priorities.push(`${x.low.length} produit(s) sont sous leur minimum`);if(x.receptionIssues.length)priorities.push(`${x.receptionIssues.length} réception(s) comportent un écart`);if(x.priceAlerts.length)priorities.push(`${x.priceAlerts.length} hausse(s) fournisseur sont à contrôler`);if(!priorities.length)priorities.push('aucune anomalie urgente n’est détectée');
 $('orionDailyNarrative').innerHTML=`<b>🤖 Lecture ORION</b><div class="tiny" style="margin-top:6px">Aujourd’hui, ${esc(priorities.join(' ; '))}. ${x.revenue>0?`Le chiffre d’affaires enregistré est de ${esc(money(x.revenue))}.`:'Aucune vente n’a encore été enregistrée dans la caisse GESTIONA.'}</div>`;
}
function normalizeQuestion(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9€% ]/g,' ').replace(/\s+/g,' ').trim()}
function findProductInQuestion(q){const nq=normalizeQuestion(q);return visibleProducts().filter(p=>normalizeQuestion(p.name).length>2&&nq.includes(normalizeQuestion(p.name))).sort((a,b)=>b.name.length-a.name.length)[0]||null}
function topSoldItems(days=7){const from=new Date();from.setDate(from.getDate()-days);const map=new Map();selectedVenueSales().filter(s=>new Date(s.created_at)>=from).forEach(s=>(s.items||[]).forEach(i=>map.set(i.name,(map.get(i.name)||0)+num(i.quantity))));return [...map.entries()].sort((a,b)=>b[1]-a[1])}
function askCopilot(){
 const raw=($('copilotQuestion')?.value||'').trim(),q=normalizeQuestion(raw),alerts=copilotUnifiedAlerts(),save=copilotOrderSavingsEstimate(),low=visibleProducts().filter(p=>num(p.minimum_stock)>num(p.stock)),open=orders.filter(o=>['draft','sent','confirmed','partial'].includes(o.status)&&(selectedVenue==='all'||!o.venue_id||String(o.venue_id)===String(selectedVenue))),product=findProductInQuestion(raw),snapshot=dailyBusinessSnapshot();
 let answer='';
 if(product&&(q.includes('stock')||q.includes('reste')||q.includes('combien'))){const st=status(product);answer=`${product.name} : ${num(product.stock)} ${product.unit||'unité(s)'} en stock, minimum ${num(product.minimum_stock)}. Statut : ${st[0]}.`}
 else if(product&&(q.includes('prix')||q.includes('fournisseur')||q.includes('augmentation'))){const row=supplierCatalogRows().find(r=>r.productId===product.id);answer=row?`${product.name} : dernier prix ${money(row.current.latest)} chez ${row.current.supplierName}. Évolution ${row.pct>=0?'+':''}${row.pct.toFixed(1)} %. Meilleur prix connu : ${money(row.best.latest)} chez ${row.best.supplierName}.`:`Aucun historique fournisseur exploitable n’est encore enregistré pour ${product.name}.`}
 else if(q.includes('chiffre')||q.includes('ca ')||q==='ca'||q.includes('vente aujourd'))answer=`Le chiffre d’affaires enregistré aujourd’hui est de ${money(snapshot.revenue)} pour ${snapshot.today.length} ticket(s) et ${snapshot.covers} couvert(s).`;
 else if(q.includes('plus vendu')||q.includes('meilleure vente')){const top=topSoldItems(7);answer=top.length?`Sur les 7 derniers jours, les articles les plus vendus sont : ${top.slice(0,5).map(x=>`${x[0]} (${x[1]})`).join(', ')}.`:'Aucune vente exploitable n’est enregistrée sur les 7 derniers jours.'}
 else if(q.includes('prix')||q.includes('augmentation')||q.includes('hausse fournisseur'))answer=snapshot.priceAlerts.length?`${snapshot.priceAlerts.length} hausse(s) sont détectées. Les principales : ${snapshot.priceAlerts.slice(0,4).map(r=>`${r.product.name} +${r.pct.toFixed(1)} % chez ${r.current.supplierName}`).join(', ')}.`:'Aucune hausse de prix fournisseur n’est détectée.';
 else if(q.includes('livraison')||q.includes('reception')||q.includes('manquant'))answer=snapshot.receptionIssues.length?`${snapshot.receptionIssues.length} réception(s) comportent des écarts. Ouvrez Réception pour contrôler les produits manquants et les reliquats.`:'Aucune réception incomplète n’est actuellement enregistrée.';
 else if(!q||q.includes('premier')||q.includes('priorit')||q.includes('faire')){const a=alerts[0];answer=a?`Priorité : ${a.title}. ${a.detail}`:'Aucune urgence détectée. Vous pouvez vérifier les commandes ouvertes et poursuivre la journée sereinement.'}
 else if(q.includes('stock')||q.includes('rupture')||q.includes('commander'))answer=low.length?`${low.length} produit(s) sont sous leur minimum. Les plus urgents : ${low.slice(0,5).map(p=>`${p.name} (${num(p.stock)}/${num(p.minimum_stock)})`).join(', ')}.`:'Aucun produit n’est sous son stock minimum.';
 else if(q.includes('marge')||q.includes('rentab')){const weak=visibleProducts().filter(p=>saleEx(p)>0&&unitCost(p)>0&&marginPct(p)<(num(p.target_margin_percent)||65)).sort((a,b)=>marginPct(a)-marginPct(b));answer=weak.length?`${weak.length} produit(s) sont sous leur objectif de marge. À contrôler d’abord : ${weak.slice(0,4).map(p=>`${p.name} (${marginPct(p).toFixed(1)} %)`).join(', ')}.`:'Les produits renseignés respectent leurs objectifs de marge.'}
 else if(q.includes('econom')||q.includes('argent'))answer=save.total>0?`ORION estime jusqu’à ${money(save.total)} d’économies potentielles : ${money(save.avoidOverstock)} sur le surstock et ${money(save.marginRecovery)} via les marges faibles.`:'Aucune économie immédiate fiable n’est détectée avec les données actuelles.';
 else if(q.includes('commande'))answer=open.length?`${open.length} commande(s) sont encore ouvertes. Consultez le module Commandes pour les vérifier ou les finaliser.`:'Aucune commande ouverte n’est actuellement détectée.';
 else answer=`J’ai analysé ${visibleProducts().length} produits, ${open.length} commande(s) ouverte(s), ${snapshot.receptionIssues.length} réception(s) avec anomalie et ${alerts.length} alerte(s). Vous pouvez citer le nom exact d’un produit et demander son stock ou son prix.`;
 $('copilotAnswer').textContent=answer;
}

function missionOpenView(view){document.querySelector(`[data-view="${view}"]`)?.click()}
function renderMissionCenter(ctx){
 if(!$('missionPriorities'))return;
 const notifications=buildSmartNotifications();
 const criticalNotifications=notifications.filter(n=>n.level==='critical');
 const incomplete=Math.max(0,100-ctx.completeness);
 const riskCount=criticalNotifications.length+ctx.low.length+(ctx.waste>0?1:0);
 let serenity=100;
 serenity-=Math.min(35,criticalNotifications.length*15);
 serenity-=Math.min(30,ctx.low.length*4);
 serenity-=Math.min(15,ctx.openOrders.length*3);
 serenity-=ctx.waste>0?8:0;
 serenity-=Math.min(12,Math.round(incomplete/10));
 serenity=Math.max(0,Math.min(100,Math.round(serenity)));
 const priorities=[];
 notifications.forEach(n=>priorities.push({level:n.level==='critical'?'critical':n.level==='warning'?'warning':'ok',icon:n.icon,title:n.title,detail:n.detail,view:n.action}));
 ctx.low.slice().sort((a,b)=>(num(a.stock)-num(a.minimum_stock))-(num(b.stock)-num(b.minimum_stock))).slice(0,3).forEach(p=>priorities.push({level:num(p.stock)<=0?'critical':'warning',icon:num(p.stock)<=0?'🚨':'📦',title:`${p.name} ${num(p.stock)<=0?'est en rupture':'doit être réapprovisionné'}`,detail:`Stock ${num(p.stock)} · minimum ${num(p.minimum_stock)}`,view:'products'}));
 ctx.openOrders.slice(0,2).forEach(o=>priorities.push({level:'info',icon:'🛒',title:`Commande ${o.suppliers?.name||o.order_number||'fournisseur'} à suivre`,detail:`Statut : ${orderStatusLabel(o.status)[0]} · ${money(orderTotal(o))}`,view:'orders'}));
 if(ctx.waste>0)priorities.push({level:'warning',icon:'⚠️',title:'Pertes enregistrées sur les 30 derniers jours',detail:`${ctx.waste.toFixed(ctx.waste%1?1:0)} unité(s) à analyser`,view:'products'});
 const rank={critical:0,warning:1,info:2,ok:3};priorities.sort((a,b)=>rank[a.level]-rank[b.level]);
 const top=priorities.slice(0,5);
 const estimatedMinutes=top.reduce((sum,p)=>sum+(p.view==='orders'?5:p.view==='products'?4:2),0);
 $('missionSerenity').textContent=`${serenity}/100`;$('missionSerenityFill').style.width=`${serenity}%`;
 $('missionSerenityText').textContent=serenity>=85?'Votre gestion est bien maîtrisée':serenity>=65?'Quelques actions méritent votre attention':'Des actions importantes sont à traiter';
 $('missionPriorityCount').textContent=top.length;$('missionPriorityText').textContent=top.length?`${top.filter(x=>x.level==='critical').length} critique(s), ${top.filter(x=>x.level==='warning').length} importante(s)`:'Aucune urgence détectée';
 $('missionTime').textContent=`${estimatedMinutes} min`;$('missionRiskCount').textContent=riskCount;$('missionRiskText').textContent=riskCount?`${riskCount} point(s) à surveiller`:'Situation maîtrisée';
 const badge=$('missionStatusBadge');badge.textContent=serenity>=85?'Sous contrôle':serenity>=65?'À surveiller':'Action requise';badge.className=`badge ${serenity>=85?'ok':serenity>=65?'warn':'bad'}`;
 $('missionPriorities').innerHTML=top.length?top.map(p=>`<div class="mission-priority ${p.level}"><span class="mission-priority-icon">${p.icon}</span><div><b>${esc(p.title)}</b><small>${esc(p.detail)}</small></div>${p.view?`<button class="btn mini ${p.level==='critical'?'primary':'soft'}" onclick="missionOpenView('${p.view}')">Traiter</button>`:''}</div>`).join(''):'<div class="mission-empty">✅ Tout est sous contrôle. ORION ne détecte aucune action urgente.</div>';
 let recommendation='Aucune action urgente. Vous pouvez poursuivre votre journée sereinement.';
 if(criticalNotifications.length)recommendation='Traitez d’abord le rappel de commande arrivé à échéance ou proche de son heure limite.';
 else if(ctx.low.length)recommendation=`Commencez par les ${ctx.low.length} produit(s) sous le stock minimum afin d’éviter une rupture.`;
 else if(ctx.openOrders.length)recommendation='Vérifiez les commandes ouvertes et confirmez les prochaines livraisons.';
 $('missionRecommendation').innerHTML=`<b>🤖 Recommandation ORION</b><div class="tiny" style="margin-top:6px">${esc(recommendation)}</div>`;
}

function weekdayIndex(value){return Number(value)}
function localDateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function defaultOrderSchedules(){
 const rules=[];
 venues.forEach(v=>{
  const n=(v.name||'').toLowerCase();
  const days=n.includes('danish')?[0,3]:n.includes('élysée')||n.includes('elysee')?[0,4]:[];
  days.forEach(day=>rules.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),venue_id:v.id,supplier_id:suppliers.find(s=>(s.name||'').toLowerCase().includes('sligro'))?.id||'',weekday:day,deadline:'20:00',reminder_minutes:120,active:true}));
 });
 return rules
}
function getOrderSchedules(){try{const saved=JSON.parse(localStorage.getItem(LS_SCHEDULES)||'null');if(Array.isArray(saved))return saved}catch(e){}const d=defaultOrderSchedules();localStorage.setItem(LS_SCHEDULES,JSON.stringify(d));return d}
function saveOrderSchedules(rows){localStorage.setItem(LS_SCHEDULES,JSON.stringify(rows));renderSmartNotifications()}
function dayLabel(i){return ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][Number(i)]||'Jour'}
function scheduleContext(rule){return{venue:venues.find(v=>String(v.id)===String(rule.venue_id)),supplier:suppliers.find(s=>String(s.id)===String(rule.supplier_id))}}
function orderExistsToday(rule){const today=localDateKey();return orders.some(o=>String(o.venue_id||'')===String(rule.venue_id||'')&&String(o.supplier_id||'')===String(rule.supplier_id||'')&&localDateKey(new Date(o.created_at))===today&&o.status!=='cancelled')}
function dismissNotification(key){const state=JSON.parse(localStorage.getItem(LS_NOTIF_STATE)||'{}');state[key]=localDateKey();localStorage.setItem(LS_NOTIF_STATE,JSON.stringify(state));renderSmartNotifications()}
function notificationDismissed(key){try{return JSON.parse(localStorage.getItem(LS_NOTIF_STATE)||'{}')[key]===localDateKey()}catch(e){return false}}
function buildSmartNotifications(){
 const now=new Date(),today=now.getDay(),minutes=now.getHours()*60+now.getMinutes(),items=[];
 getOrderSchedules().filter(r=>r.active!==false&&Number(r.weekday)===today&&(selectedVenue==='all'||String(r.venue_id)===String(selectedVenue))).forEach(r=>{
  const {venue,supplier}=scheduleContext(r),[h,m]=(r.deadline||'20:00').split(':').map(Number),deadline=h*60+m,remaining=deadline-minutes,done=orderExistsToday(r),key=`order-${r.id}`;
  if(notificationDismissed(key))return;
  if(done){items.push({key,level:'ok',icon:'✅',title:`Commande ${supplier?.name||'fournisseur'} enregistrée`,detail:`${venue?.name||'Établissement'} · commande du jour détectée.`,action:null});return}
  if(remaining<0)items.push({key,level:'critical',icon:'🚨',title:`Commande ${supplier?.name||'fournisseur'} non enregistrée`,detail:`Heure limite dépassée de ${Math.abs(remaining)} min pour ${venue?.name||'cet établissement'}.`,action:'orders'});
  else if(remaining<=Number(r.reminder_minutes||120))items.push({key,level:'critical',icon:'⏰',title:`Commande à envoyer avant ${r.deadline}`,detail:`${venue?.name||'Établissement'} · ${supplier?.name||'fournisseur'} · il reste ${Math.floor(remaining/60)} h ${remaining%60} min.`,action:'orders'});
  else items.push({key,level:'warning',icon:'🛒',title:`Jour de commande ${supplier?.name||'fournisseur'}`,detail:`${venue?.name||'Établissement'} · à finaliser avant ${r.deadline}.`,action:'orders'});
 });
 return items
}
function renderSmartNotifications(){if(!$('smartNotifications'))return;const items=buildSmartNotifications();$('smartNotifications').innerHTML=items.length?items.map(n=>`<div class="notification-item ${n.level==='critical'?'critical':n.level==='warning'?'warning':''}"><span class="notification-icon">${n.icon}</span><div><b>${esc(n.title)}</b><small>${esc(n.detail)}</small></div><div class="notification-actions">${n.action?`<button class="btn mini primary" onclick="openNotificationAction('${n.action}')">Ouvrir</button>`:''}<button class="btn mini soft" onclick="dismissNotification('${n.key}')">Masquer</button></div></div>`).join(''):'<div class="empty">Aucun rappel de commande pour aujourd’hui.</div>';maybePushBrowserNotifications(items)}
function openNotificationAction(view){document.querySelector(`[data-view="${view}"]`)?.click()}
function maybePushBrowserNotifications(items){if(!('Notification'in window)||Notification.permission!=='granted'||!document.hidden)return;const state=JSON.parse(sessionStorage.getItem('gestiona_pushed_notifications')||'{}');items.filter(x=>x.level==='critical').forEach(n=>{if(!state[n.key]){new Notification(n.title,{body:n.detail,icon:'./icon-192.png'});state[n.key]=true}});sessionStorage.setItem('gestiona_pushed_notifications',JSON.stringify(state))}
function renderScheduleRows(){const rows=getOrderSchedules();$('scheduleRows').innerHTML=rows.length?rows.map((r,i)=>`<div class="schedule-row" data-index="${i}"><div><label>Établissement</label><select data-field="venue_id">${venues.map(v=>`<option value="${v.id}" ${String(v.id)===String(r.venue_id)?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div><div><label>Fournisseur</label><select data-field="supplier_id"><option value="">Tous / à préciser</option>${suppliers.map(x=>`<option value="${x.id}" ${String(x.id)===String(r.supplier_id)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div><label>Jour</label><select data-field="weekday">${[0,1,2,3,4,5,6].map(d=>`<option value="${d}" ${Number(r.weekday)===d?'selected':''}>${dayLabel(d)}</option>`).join('')}</select></div><div><label>Heure limite</label><input type="time" data-field="deadline" value="${esc(r.deadline||'20:00')}"></div><button class="btn danger mini schedule-delete" type="button" onclick="removeScheduleRow(${i})">Supprimer</button></div>`).join(''):'<div class="empty">Aucun rappel configuré.</div>'}
function collectScheduleRows(){return[...document.querySelectorAll('#scheduleRows .schedule-row')].map((row,i)=>{const old=getOrderSchedules()[i]||{};const get=f=>row.querySelector(`[data-field="${f}"]`)?.value;return{id:old.id||String(Date.now()+i),venue_id:get('venue_id'),supplier_id:get('supplier_id'),weekday:Number(get('weekday')),deadline:get('deadline')||'20:00',reminder_minutes:120,active:true}})}
function removeScheduleRow(i){const rows=collectScheduleRows();rows.splice(i,1);saveOrderSchedules(rows);renderScheduleRows()}

function productCompleteness(p){const checks=[p.name,p.sku||p.barcode,p.category,p.supplier_id,p.unit,num(p.minimum_stock)>0,num(p.package_price_excl_vat)>0,num(p.units_per_package)>0,p.location];return Math.round(checks.filter(Boolean).length/checks.length*100)}
function supplierName(id){return suppliers.find(s=>s.id===id)?.name||'—'}
function renderCatalogFilters(){if(!$('productCategoryFilter'))return;const list=visibleProducts(true);const fill=(id,label,values)=>{const el=$(id),current=el.value;el.innerHTML=`<option value="all">${label}</option>`+[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fr')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if([...el.options].some(o=>o.value===current))el.value=current};fill('productCategoryFilter','Toutes les catégories',list.map(p=>p.category));fill('productLocationFilter','Tous les emplacements',list.map(p=>p.location));const supplier=$('productSupplierFilter'),current=supplier.value;supplier.innerHTML='<option value="all">Tous les fournisseurs</option>'+suppliers.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if([...supplier.options].some(o=>o.value===current))supplier.value=current}
function catalogFilteredProducts(){const term=$('productSearch').value.toLowerCase(),filter=$('productFilter').value,category=$('productCategoryFilter').value,supplier=$('productSupplierFilter').value,location=$('productLocationFilter').value;let list=visibleProducts(filter==='archived').filter(p=>(p.name+' '+(p.category||'')+' '+(p.subcategory||'')+' '+(p.sku||'')+' '+(p.barcode||'')+' '+(p.location||'')).toLowerCase().includes(term));if(filter==='archived')list=list.filter(p=>p.active===false);if(filter==='low')list=list.filter(p=>num(p.stock)<=num(p.minimum_stock));if(filter==='ok')list=list.filter(p=>num(p.stock)>num(p.minimum_stock));if(filter==='favorite')list=list.filter(p=>p.favorite);if(filter==='incomplete')list=list.filter(p=>productCompleteness(p)<100);if(category!=='all')list=list.filter(p=>(p.category||'')===category);if(supplier!=='all')list=list.filter(p=>p.supplier_id===supplier);if(location!=='all')list=list.filter(p=>(p.location||'')===location);
if(selectedStockCategory==='favorite')list=list.filter(p=>p.favorite);
else if(selectedStockCategory==='out')list=list.filter(p=>num(p.stock)<=0);
else if(selectedStockCategory==='low')list=list.filter(p=>num(p.stock)<=num(p.minimum_stock));
else if(selectedStockCategory.startsWith('subcategory:')){const [,category='',subcategory='']=selectedStockCategory.split(':');list=list.filter(p=>categoryKey(p.category)===categoryKey(decodeURIComponent(category))&&categoryKey(p.subcategory||'Sans sous-catégorie')===categoryKey(decodeURIComponent(subcategory)))}
else if(selectedStockCategory.startsWith('category:')){const selectedName=selectedStockCategory.slice(9);list=list.filter(p=>categoryKey(p.category)===categoryKey(selectedName))}
return list.sort((a,b)=>(a.category||'').localeCompare(b.category||'','fr')||(a.subcategory||'').localeCompare(b.subcategory||'','fr')||a.name.localeCompare(b.name,'fr'))}
function stockConsumption30(productId){const since=Date.now()-30*86400000;return movements.filter(m=>m.product_id===productId&&new Date(m.created_at).getTime()>=since&&['sale','waste'].includes(m.movement_type)).reduce((a,m)=>a+Math.abs(num(m.quantity)),0)}
function stockMovementCount30(productId){const since=Date.now()-30*86400000;return movements.filter(m=>m.product_id===productId&&new Date(m.created_at).getTime()>=since).length}
function stockSuggestedMinimum(p){const used=stockConsumption30(p.id);if(used<=0)return Math.max(num(p.minimum_stock),0);const weekly=used/30*7;return Math.max(1,Math.ceil(weekly*1.5))}
function renderStockIntelligence(){if(!$('stockIntelList'))return;const list=visibleProducts();const out=list.filter(p=>num(p.stock)<=0);const low=list.filter(p=>num(p.stock)>0&&num(p.stock)<=num(p.minimum_stock));const dormant=list.filter(p=>num(p.stock)>0&&stockMovementCount30(p.id)===0);const optimize=list.map(p=>({p,suggested:stockSuggestedMinimum(p)})).filter(x=>x.suggested>0&&Math.abs(x.suggested-num(x.p.minimum_stock))>=1);
$('stockIntelOut').textContent=out.length;$('stockIntelLow').textContent=low.length;$('stockIntelDormant').textContent=dormant.length;$('stockIntelMin').textContent=optimize.length;
const urgent=out.length+low.length;$('stockIntelSummary').innerHTML=urgent?`<b>${urgent} priorité(s) détectée(s).</b> ORION recommande de traiter d’abord les ruptures, puis les produits sous leur minimum.`:`<b>Aucune urgence de stock.</b> ORION continue à surveiller les produits sans mouvement et les minimums à ajuster.`;
const rows=[];out.slice(0,6).forEach(p=>rows.push({icon:'🚨',title:p.name,detail:`Rupture · stock ${num(p.stock)} · minimum ${num(p.minimum_stock)}`,badge:'Urgent',cls:'bad',actions:`<button class="btn mini gold" onclick="quickMovement('${p.id}','purchase')">Réception</button><button class="btn mini primary" onclick="openStockOrder('${p.id}')">Commander</button>`}));
low.slice(0,6).forEach(p=>rows.push({icon:'📦',title:p.name,detail:`Stock faible ${num(p.stock)} / minimum ${num(p.minimum_stock)}`,badge:'À commander',cls:'warn',actions:`<button class="btn mini primary" onclick="openStockOrder('${p.id}')">Commander</button>`}));
dormant.slice(0,4).forEach(p=>rows.push({icon:'🕒',title:p.name,detail:`Aucun mouvement enregistré depuis 30 jours · stock ${num(p.stock)}`,badge:'À vérifier',cls:'warn',actions:`<button class="btn mini soft" onclick="editProduct('${p.id}')">Voir la fiche</button>`}));
optimize.slice(0,5).forEach(x=>rows.push({icon:'🎯',title:x.p.name,detail:`Minimum actuel ${num(x.p.minimum_stock)} · suggestion ORION ${x.suggested}`,badge:'Optimisation',cls:'ok',actions:`<button class="btn mini gold" onclick="applySuggestedMinimum('${x.p.id}',${x.suggested})">Appliquer ${x.suggested}</button>`}));
$('stockIntelList').innerHTML=rows.length?rows.map(r=>`<div class="stock-intel-item"><span class="ico">${r.icon}</span><div><b>${esc(r.title)}</b><small>${esc(r.detail)}</small></div><div class="stock-intel-actions"><span class="badge ${r.cls}">${r.badge}</span>${r.actions}</div></div>`).join(''):'<div class="empty">ORION ne détecte aucune action prioritaire avec les données actuelles.</div>'}
window.applySuggestedMinimum=async(id,value)=>{const p=products.find(x=>x.id===id);if(!p||!confirm(`Définir le stock minimum de « ${p.name} » à ${value} ?`))return;const {error}=await sb.from('products').update({minimum_stock:value}).eq('id',id);if(error){toast(error.message);return}p.minimum_stock=value;await audit('Minimum de stock optimisé par ORION','product',id,{name:p.name,minimum_stock:value});renderProducts();renderStockIntelligence();renderDashboard();toast('Stock minimum mis à jour')};
window.openStockOrder=id=>{const p=products.find(x=>x.id===id);document.querySelector('[data-view="orders"]')?.click();if(p?.venue_id)$('quickOrderVenue').value=p.venue_id;if(p?.supplier_id)$('quickOrderSupplier').value=p.supplier_id;loadQuickOrderDraft();const qty=Math.max(stockSuggestedMinimum(p)-num(p.stock),1);quickOrder.quantities[p.id]=Math.max(num(quickOrder.quantities[p.id]),qty);saveQuickOrderDraft();$('quickOrderFilter').value='ordered';renderQuickOrderCatalog();toast(`${p.name} ajouté au brouillon : ${qty}`)};
function updateProductBulkSelection(list=catalogFilteredProducts()){
 const archivedMode=$('productFilter')?.value==='archived';
 const visibleIds=list.map(p=>p.id),selectedVisible=visibleIds.filter(id=>selectedProductIds.has(id));
 const allBox=$('selectAllProducts');
 if(allBox){allBox.checked=visibleIds.length>0&&selectedVisible.length===visibleIds.length;allBox.indeterminate=selectedVisible.length>0&&selectedVisible.length<visibleIds.length}
 const count=selectedProductIds.size,bar=$('productBulkBar');
 if(bar)bar.classList.toggle('hidden',count===0);
 if($('productSelectedCount'))$('productSelectedCount').textContent=count+(count>1?' produits sélectionnés':' produit sélectionné');
 if($('archiveSelectedProductsBtn'))$('archiveSelectedProductsBtn').classList.toggle('hidden',archivedMode);
 if($('restoreSelectedProductsBtn'))$('restoreSelectedProductsBtn').classList.toggle('hidden',!archivedMode);
 if($('deleteSelectedProductsForeverBtn'))$('deleteSelectedProductsForeverBtn').classList.toggle('hidden',!archivedMode);
 const hint=bar?.querySelector('.tiny');if(hint)hint.textContent=archivedMode?'Restaurez les produits ou supprimez-les définitivement.':'Les produits supprimés restent récupérables dans « Archivés ».';
}
window.toggleProductSelection=(id,checked)=>{if(checked)selectedProductIds.add(id);else selectedProductIds.delete(id);updateProductBulkSelection()};
function clearProductSelection(){selectedProductIds.clear();renderProducts()}
async function archiveProductsByIds(ids){
 const unique=[...new Set(ids)].filter(Boolean);if(!unique.length)return;
 const names=products.filter(p=>unique.includes(p.id)).map(p=>p.name);
 const label=unique.length>1?`${unique.length} produits`:`« ${names[0]||'ce produit'} »`;
 if(!confirm(`Supprimer ${label} du stock ?\n\nIls seront archivés et pourront être restaurés avec le filtre « Archivés ».`))return;
 const {error}=await sb.from('products').update({active:false}).in('id',unique);
 if(error){toast(error.message);return}
 await audit(unique.length>1?'Produits archivés en groupe':'Produit archivé','product',unique.length===1?unique[0]:null,{ids:unique,names});
 unique.forEach(id=>selectedProductIds.delete(id));await refresh();toast(unique.length>1?`${unique.length} produits supprimés du stock`:'Produit supprimé du stock');
}
window.archiveProductFromList=id=>archiveProductsByIds([id]);

async function restoreProductsByIds(ids){
 const unique=[...new Set(ids)].filter(Boolean);if(!unique.length)return;
 const names=products.filter(p=>unique.includes(p.id)).map(p=>p.name);
 const label=unique.length>1?`${unique.length} produits`:`« ${names[0]||'ce produit'} »`;
 if(!confirm(`Restaurer ${label} dans le stock ?`))return;
 const {error}=await sb.from('products').update({active:true}).in('id',unique);
 if(error){toast(error.message);return}
 await audit(unique.length>1?'Produits restaurés en groupe':'Produit restauré','product',unique.length===1?unique[0]:null,{ids:unique,names});
 selectedProductIds.clear();await refresh();$('productFilter').value='all';renderProducts();toast(unique.length>1?`${unique.length} produits restaurés`:'Produit restauré');
}
async function deleteArchivedProductsForever(ids){
 const unique=[...new Set(ids)].filter(id=>products.some(p=>p.id===id&&p.active===false));if(!unique.length)return;
 const code=prompt(`SUPPRESSION DÉFINITIVE

${unique.length} produit(s) seront effacés sans possibilité de restauration.
Tapez exactement EFFACER pour continuer.`,'');
 if(code!=='EFFACER'){toast('Suppression définitive annulée');return}
 const {error}=await sb.from('products').delete().in('id',unique);
 if(error){toast('Suppression impossible : '+error.message);return}
 await audit('Produits supprimés définitivement','product',null,{count:unique.length,ids:unique});
 selectedProductIds.clear();await refresh();$('productFilter').value='archived';renderProducts();toast(`${unique.length} produit(s) supprimé(s) définitivement`);
}
window.deleteArchivedProductForever=id=>deleteArchivedProductsForever([id]);
function openStockTrash(){selectedProductIds.clear();$('productFilter').value='archived';selectedStockCategory='all';renderProducts();$('productsBody')?.scrollIntoView({behavior:'smooth',block:'start'});toast('Corbeille du stock ouverte')}
async function archiveAllProducts(){
 const active=products.filter(p=>p.active!==false);
 if(!active.length){toast('Le stock ne contient aucun produit actif');return}
 const first=confirm(`Supprimer les ${active.length} produits actifs du stock ?

Cette action archive tous les produits. Ils resteront récupérables avec le filtre « Archivés ».`);
 if(!first)return;
 const code=prompt(`CONFIRMATION DE SÉCURITÉ

Tapez exactement SUPPRIMER pour archiver les ${active.length} produits du stock.`,'');
 if(code!=='SUPPRIMER'){toast('Suppression totale annulée');return}
 const ids=active.map(p=>p.id),names=active.map(p=>p.name);
 const {error}=await sb.from('products').update({active:false}).in('id',ids);
 if(error){toast(error.message);return}
 await audit('Suppression totale du stock','product',null,{count:ids.length,ids,names});
 selectedProductIds.clear();
 await refresh();
 toast(`${ids.length} produits supprimés du stock et archivés`);
}

let quickInventoryDraft={};
function quickInventoryProducts(){
 const base=catalogFilteredProducts().filter(p=>p.active!==false);
 const term=($('quickInventorySearch')?.value||'').trim().toLowerCase();
 return base.filter(p=>!term||(p.name+' '+(p.sku||'')+' '+(p.category||'')+' '+(p.subcategory||'')).toLowerCase().includes(term));
}
function openQuickInventory(){
 quickInventoryDraft={};
 if($('quickInventorySearch'))$('quickInventorySearch').value='';
 renderQuickInventory();
 openModal('quickInventoryModal');
 setTimeout(()=>$('quickInventorySearch')?.focus(),120);
}
function inventoryDraftValue(id){return Object.prototype.hasOwnProperty.call(quickInventoryDraft,id)?quickInventoryDraft[id]:''}
function inventoryDifference(p){const raw=inventoryDraftValue(p.id);if(raw==='')return null;return num(raw)-num(p.stock)}
function renderQuickInventory(){
 const list=quickInventoryProducts();
 $('quickInventoryList').innerHTML=list.length?list.map(p=>{
  const raw=inventoryDraftValue(p.id),diff=inventoryDifference(p),cls=diff===null?'':diff>0?'inventory-plus':diff<0?'inventory-minus':'inventory-zero';
  return `<div class="inventory-row"><div class="inventory-product"><b>${esc(p.name)}</b><small>${esc(p.category||'Sans catégorie')}${p.subcategory?' · '+esc(p.subcategory):''}</small></div><div class="inventory-current">${num(p.stock)} <small>${esc(p.unit||'')}</small></div><div><input class="inventory-count-input" type="number" min="0" step="0.001" value="${raw}" placeholder="${num(p.stock)}" oninput="setInventoryCount('${p.id}',this.value)"></div><div class="inventory-difference ${cls}">${diff===null?'—':(diff>0?'+':'')+Number(diff.toFixed(3))}</div></div>`;
 }).join(''):'<div class="empty">Aucun produit dans ce filtre.</div>';
 updateQuickInventorySummary();
}
window.setInventoryCount=(id,value)=>{quickInventoryDraft[id]=value;updateQuickInventorySummary();const input=document.activeElement;if(input?.classList.contains('inventory-count-input')){const row=input.closest('.inventory-row'),p=products.find(x=>x.id===id),diff=p?inventoryDifference(p):null,cell=row?.querySelector('.inventory-difference');if(cell){cell.textContent=diff===null?'—':(diff>0?'+':'')+Number(diff.toFixed(3));cell.className='inventory-difference '+(diff===null?'':diff>0?'inventory-plus':diff<0?'inventory-minus':'inventory-zero')}}};
function inventoryChanges(){return products.filter(p=>p.active!==false&&inventoryDraftValue(p.id)!=='').map(p=>({p,count:Math.max(0,num(inventoryDraftValue(p.id))),difference:Math.max(0,num(inventoryDraftValue(p.id)))-num(p.stock)})).filter(x=>Math.abs(x.difference)>0.0000001)}
function updateQuickInventorySummary(){
 const visible=quickInventoryProducts(),changes=inventoryChanges(),total=changes.reduce((a,x)=>a+x.difference,0);
 $('inventoryVisibleCount').textContent=visible.length;$('inventoryChangedCount').textContent=changes.length;$('inventoryTotalDifference').textContent=(total>0?'+':'')+Number(total.toFixed(3));
 const warning=$('quickInventoryWarning');if(changes.some(x=>x.difference<0&&Math.abs(x.difference)>num(x.p.stock))){warning.textContent='Une quantité comptée ne peut pas être négative.';warning.classList.remove('hidden')}else warning.classList.add('hidden');
 $('saveQuickInventoryBtn').disabled=!changes.length;
}
async function saveQuickInventory(){
 const changes=inventoryChanges();if(!changes.length){toast('Aucune quantité modifiée');return}
 const preview=changes.slice(0,8).map(x=>`• ${x.p.name} : ${num(x.p.stock)} → ${x.count}`).join('\n')+(changes.length>8?`\n• … et ${changes.length-8} autre(s)`:'' );
 if(!confirm(`Enregistrer ${changes.length} modification(s) d’inventaire ?\n\n${preview}`))return;
 const btn=$('saveQuickInventoryBtn');btn.disabled=true;btn.textContent='Enregistrement…';
 let done=0;
 for(const x of changes){
  const {data,error}=await sb.rpc('record_stock_movement',{p_product_id:x.p.id,p_quantity:x.difference,p_movement_type:'inventory',p_note:'Inventaire rapide'});
  if(error){toast(`Erreur sur ${x.p.name} : ${error.message}`);btn.disabled=false;btn.textContent='Enregistrer l’inventaire';return}
  await audit('Inventaire rapide','product',x.p.id,{name:x.p.name,previous_stock:num(x.p.stock),counted_stock:x.count,difference:x.difference,new_stock:data});done++;
 }
 closeModal('quickInventoryModal');await refresh();btn.textContent='Enregistrer l’inventaire';toast(`${done} stock(s) mis à jour`);
}


function autoOrderEligibleProducts(){
 const venueId=$('autoOrderVenue')?.value||'',supplierId=$('autoOrderSupplier')?.value||'',term=($('autoOrderSearch')?.value||'').trim().toLowerCase();
 return products.filter(p=>p.active!==false&&num(p.minimum_stock)>num(p.stock)&&(!venueId||String(p.venue_id||'')===String(venueId))&&(!supplierId||String(p.supplier_id||'')===String(supplierId))&&(p.name+' '+(p.category||'')+' '+(p.subcategory||'')+' '+(p.sku||'')).toLowerCase().includes(term)).sort((a,b)=>(num(a.stock)-num(a.minimum_stock))-(num(b.stock)-num(b.minimum_stock))||a.name.localeCompare(b.name,'fr'));
}
function autoOrderSuggestedQty(p){return Math.max(1,Math.ceil(Math.max(num(p.minimum_stock)-num(p.stock),stockSuggestedMinimum(p)-num(p.stock))))}
function fillAutoOrderOptions(){
 const venue=$('autoOrderVenue'),supplier=$('autoOrderSupplier');if(!venue||!supplier)return;
 const oldV=venue.value,oldS=supplier.value;venue.innerHTML='<option value="">Tous les établissements</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');supplier.innerHTML='<option value="">Choisir un fournisseur</option>'+suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');venue.value=oldV||(selectedVenue==='all'?'':selectedVenue);supplier.value=oldS||'';
}
function openAutoOrder(){
 autoOrderDraft={};fillAutoOrderOptions();const low=products.filter(p=>p.active!==false&&num(p.minimum_stock)>num(p.stock)&&(selectedVenue==='all'||!p.venue_id||String(p.venue_id)===String(selectedVenue)));const supplierIds=[...new Set(low.map(p=>p.supplier_id).filter(Boolean))];if(supplierIds.length===1)$('autoOrderSupplier').value=supplierIds[0];renderAutoOrder();openModal('autoOrderModal');
}
function renderAutoOrder(){
 const list=autoOrderEligibleProducts();list.forEach(p=>{if(!autoOrderDraft[p.id])autoOrderDraft[p.id]={selected:true,quantity:autoOrderSuggestedQty(p)}});
 const valid=new Set(list.map(p=>p.id));Object.keys(autoOrderDraft).forEach(id=>{if(!valid.has(id))delete autoOrderDraft[id]});
 $('autoOrderList').innerHTML=list.length?list.map(p=>{const d=autoOrderDraft[p.id]||{selected:true,quantity:autoOrderSuggestedQty(p)},cost=unitCost(p),estimated=d.quantity*cost;return `<div class="auto-order-row"><span><input type="checkbox" ${d.selected?'checked':''} onchange="toggleAutoOrderProduct('${p.id}',this.checked)"></span><div><b>${esc(p.name)}</b><small>${esc(p.category||'Sans catégorie')}${p.subcategory?' · '+esc(p.subcategory):''}</small></div><span><b>${num(p.stock)}</b> / ${num(p.minimum_stock)} ${esc(p.unit||'')}</span><div class="qty-control"><button type="button" onclick="changeAutoOrderQty('${p.id}',-1)">−</button><input type="number" min="1" step="1" value="${d.quantity}" oninput="setAutoOrderQty('${p.id}',this.value)"><button type="button" onclick="changeAutoOrderQty('${p.id}',1)">+</button></div><span class="money">${cost>0?money(estimated):'—'}</span></div>`}).join(''):'<div class="empty"><b>Aucun produit à commander.</b><br>Choisissez un fournisseur ou vérifiez les stocks minimums.</div>';
 $('autoOrderProductCount').textContent=list.length;updateAutoOrderSummary();
 const supplierId=$('autoOrderSupplier').value,notice=$('autoOrderNotice');if(!supplierId&&list.length){notice.textContent='Choisissez un fournisseur pour créer un brouillon de commande.';notice.classList.remove('hidden')}else notice.classList.add('hidden');
}
function updateAutoOrderSummary(){const list=autoOrderEligibleProducts(),selected=list.filter(p=>autoOrderDraft[p.id]?.selected),total=selected.reduce((a,p)=>a+num(autoOrderDraft[p.id]?.quantity)*unitCost(p),0);$('autoOrderSelectedCount').textContent=selected.length;$('autoOrderTotal').textContent=money(total);const all=list.length>0&&selected.length===list.length;$('selectAllAutoOrder').checked=all;$('selectAllAutoOrder').indeterminate=selected.length>0&&!all;$('addAutoOrderToDraftBtn').disabled=!selected.length||!$('autoOrderSupplier').value}
window.toggleAutoOrderProduct=(id,checked)=>{if(autoOrderDraft[id])autoOrderDraft[id].selected=checked;updateAutoOrderSummary()};
window.setAutoOrderQty=(id,value)=>{if(autoOrderDraft[id])autoOrderDraft[id].quantity=Math.max(1,Math.ceil(num(value)||1));updateAutoOrderSummary()};
window.changeAutoOrderQty=(id,delta)=>{if(autoOrderDraft[id])autoOrderDraft[id].quantity=Math.max(1,num(autoOrderDraft[id].quantity)+delta);renderAutoOrder()};
function addAutoOrderToDraft(){
 const venueId=$('autoOrderVenue').value,supplierId=$('autoOrderSupplier').value;if(!supplierId){toast('Choisissez un fournisseur');return}
 const selected=autoOrderEligibleProducts().filter(p=>autoOrderDraft[p.id]?.selected);if(!selected.length){toast('Sélectionnez au moins un produit');return}
 document.querySelector('[data-view="orders"]')?.click();$('quickOrderVenue').value=venueId||selected[0]?.venue_id||'';$('quickOrderSupplier').value=supplierId;loadQuickOrderDraft();selected.forEach(p=>{quickOrder.quantities[p.id]=Math.max(num(quickOrder.quantities[p.id]),num(autoOrderDraft[p.id].quantity));quickOrder.notes[p.id]=quickOrder.notes[p.id]||'Ajouté depuis la liste automatique'});saveQuickOrderDraft();$('quickOrderFilter').value='ordered';renderQuickOrderCatalog();closeModal('autoOrderModal');toast(`${selected.length} produit(s) ajouté(s) au brouillon`);
}

function renderProducts(){renderStockCategoryTabs();const list=catalogFilteredProducts();const allowed=new Set(products.map(p=>p.id));selectedProductIds=new Set([...selectedProductIds].filter(id=>allowed.has(id)));renderSelectedCategoryHeader(list);const complete=list.length?Math.round(list.filter(p=>productCompleteness(p)===100).length/list.length*100):0;$('catalogCount').textContent=list.length;$('catalogComplete').textContent=complete+' %';$('catalogNoCost').textContent=list.filter(p=>num(p.package_price_excl_vat)<=0).length;$('catalogNoMin').textContent=list.filter(p=>num(p.minimum_stock)<=0).length;$('productsBody').innerHTML=list.length?list.map(p=>{const st=p.active===false?['Archivé','bad']:status(p),img=p.image_url?`<img class="product-thumb" src="${esc(p.image_url)}" alt="" onerror="this.style.display='none'">`:'';const actions=p.active===false?`<button class="btn mini gold" onclick="restoreProduct('${p.id}')">Restaurer</button><button class="btn mini danger" onclick="deleteArchivedProductForever('${p.id}')">Supprimer définitivement</button>`:`<button class="btn mini gold" onclick="quickMovement('${p.id}','purchase')">+ Stock</button><button class="btn mini danger" onclick="quickMovement('${p.id}','removal')">− Quantité</button><button class="btn mini soft" onclick="editProduct('${p.id}')">Fiche</button><button class="btn mini danger" onclick="archiveProductFromList('${p.id}')">Supprimer</button>`;const completion=productCompleteness(p);return`<tr class="${selectedProductIds.has(p.id)?'selected-row':''}"><td class="select-col"><input class="product-select-checkbox" type="checkbox" ${selectedProductIds.has(p.id)?'checked':''} onchange="toggleProductSelection('${p.id}',this.checked)" aria-label="Sélectionner ${esc(p.name)}"></td><td>${img}<button class="star-btn" title="Ajouter ou retirer des favoris" onclick="toggleCatalogFavorite('${p.id}')">${p.favorite?'⭐':'☆'}</button><b>${esc(p.name)}</b><br><span class="tiny">${esc(p.unit)}${p.subcategory?' · '+esc(p.subcategory):''} · ${esc(supplierName(p.supplier_id))}</span></td><td>${esc(p.sku||p.barcode||'—')}</td><td><b>${esc(p.category||'Sans catégorie')}</b><br><span class="tiny stock-path">${esc(p.subcategory||'Sans sous-catégorie')}</span></td><td>${num(p.stock)} / ${num(p.minimum_stock)}</td><td class="money">${money(unitCost(p))}</td><td class="money">${money(p.sale_price_incl_vat)}</td><td>${marginPct(p).toFixed(1)} %</td><td><span class="completion"><span class="completion-bar"><i style="width:${completion}%"></i></span><b>${completion}%</b></span></td><td><span class="badge ${st[1]}">${st[0]}</span></td><td><div class="stock-actions">${actions}</div></td></tr>`}).join(''):'<tr><td colspan="11" class="empty">Aucun produit.</td></tr>';updateProductBulkSelection(list)}
function renderSuppliers(){const term=$('supplierSearch').value.toLowerCase(),list=suppliers.filter(s=>(s.name+' '+(s.contact_name||'')).toLowerCase().includes(term));$('suppliersBody').innerHTML=list.length?list.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.contact_name||'—')}</td><td>${esc(s.email||'—')}</td><td>${esc(s.phone||'—')}</td><td>${esc(s.delivery_days||'—')}</td><td><button class="btn soft" onclick="editSupplier('${s.id}')">Ouvrir</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Aucun fournisseur.</td></tr>'}

function orderStatusLabel(s){return {draft:['Brouillon','warn'],sent:['Envoyée','ok'],confirmed:['Confirmée','ok'],partially_received:['Partiellement reçue','warn'],received:['Reçue','ok'],cancelled:['Annulée','bad']}[s]||[s,'warn']}
function orderTotal(o){return (o.purchase_order_items||[]).reduce((a,i)=>a+num(i.quantity_ordered)*num(i.unit_price_excl_vat),0)}
function quickOrderKey(){return `gestiona_quick_order_${orgId||'org'}_${$('quickOrderVenue')?.value||'venue'}_${$('quickOrderSupplier')?.value||'supplier'}`}
function loadQuickOrderDraft(){try{quickOrder=JSON.parse(localStorage.getItem(quickOrderKey())||'{"quantities":{},"notes":{}}')}catch{quickOrder={quantities:{},notes:{}}}quickOrder.quantities=quickOrder.quantities||{};quickOrder.notes=quickOrder.notes||{}}
function saveQuickOrderDraft(){localStorage.setItem(quickOrderKey(),JSON.stringify(quickOrder));const el=$('quickSaveState');if(el){el.textContent='Sauvegardé';el.className='badge ok';setTimeout(()=>el.textContent='Brouillon prêt',700)}}
function fillQuickOrderOptions(){if(!$('quickOrderVenue'))return;const oldV=$('quickOrderVenue').value,oldS=$('quickOrderSupplier').value;$('quickOrderVenue').innerHTML='<option value="">Établissement</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');$('quickOrderSupplier').innerHTML='<option value="">Fournisseur</option>'+suppliers.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');$('quickOrderVenue').value=oldV||(selectedVenue==='all'?'':selectedVenue);$('quickOrderSupplier').value=oldS||(suppliers.find(x=>/sligro/i.test(x.name))?.id||'');loadQuickOrderDraft();renderQuickOrderCatalog();orionOrderSuggestions=[];renderOrionOrderSuggestions()}
function lastOrderedInfo(productId){let best=null;for(const o of orders){if(o.status==='cancelled')continue;for(const line of (o.purchase_order_items||[])){if(line.product_id===productId){const d=new Date(o.ordered_at||o.created_at||0);if(!best||d>best.date)best={quantity:num(line.quantity_ordered),date:d}}}}return best}
function productOrderHistory(productId,limit=6){const rows=[];for(const o of orders){if(o.status==='cancelled')continue;for(const line of (o.purchase_order_items||[])){if(String(line.product_id)===String(productId)){const date=new Date(o.ordered_at||o.created_at||0);if(!Number.isNaN(date.getTime()))rows.push({quantity:num(line.quantity_ordered),date,status:o.status})}}}return rows.sort((a,b)=>b.date-a.date).slice(0,limit)}
function buildOrionOrderSuggestions(){const venueId=$('quickOrderVenue')?.value||'',supplierId=$('quickOrderSupplier')?.value||'';if(!venueId||!supplierId)return[];const eligible=quickOrderProducts().filter(p=>p.active!==false);return eligible.map(p=>{const stock=num(p.stock),minimum=num(p.minimum_stock),history=productOrderHistory(p.id),avg=history.length?history.reduce((a,x)=>a+x.quantity,0)/history.length:0,last=history[0]?.quantity||0;let quantity=0,reasons=[],score=0;if(minimum>0&&stock<=minimum){quantity=Math.max(1,Math.ceil(minimum-stock));reasons.push(stock<=0?'rupture ou stock nul':'stock sous le minimum');score+=55}if(history.length>=2&&stock<=minimum*1.5){const habitual=Math.max(1,Math.round(avg));quantity=Math.max(quantity,habitual);reasons.push(`habitude récente : ${avg.toFixed(1).replace('.',',')} unités`);score+=25}else if(history.length===1&&quantity>0){quantity=Math.max(quantity,Math.round(last));reasons.push(`dernière commande : ${last}`);score+=12}if(p.favorite&&quantity>0){reasons.push('produit favori');score+=8}if(minimum<=0&&stock<=0&&history.length){quantity=Math.max(1,Math.round(avg||last));reasons.push('absence de stock minimum, historique utilisé');score+=18}if(quantity<=0)return null;const confidence=Math.min(98,Math.max(45,score));return{product_id:p.id,name:p.name,quantity,confidence,reasons,cost:quantity*unitCost(p),stock,minimum}}).filter(Boolean).sort((a,b)=>b.confidence-a.confidence||b.cost-a.cost)}
function renderOrionOrderSuggestions(){const box=$('orionBuySuggestions'),stats=$('orionBuyStats'),confidence=$('orionBuyConfidence'),apply=$('orionApplyOrderBtn'),clear=$('orionClearSuggestionBtn');if(!box)return;const venueId=$('quickOrderVenue')?.value||'',supplierId=$('quickOrderSupplier')?.value||'';if(!venueId||!supplierId){orionOrderSuggestions=[];box.className='orion-buy-empty';box.innerHTML='Sélectionnez un établissement et un fournisseur pour lancer l’analyse.';stats.innerHTML='';confidence.textContent='—';apply.disabled=true;clear.disabled=true;return}if(!orionOrderSuggestions.length){box.className='orion-buy-empty';box.innerHTML='<b>Aucun besoin urgent détecté.</b><br>Les stocks renseignés sont au-dessus des minimums ou les données sont insuffisantes.';stats.innerHTML='<span>0 produit proposé</span>';confidence.textContent='—';apply.disabled=true;clear.disabled=true;return}const avg=Math.round(orionOrderSuggestions.reduce((a,x)=>a+x.confidence,0)/orionOrderSuggestions.length),total=orionOrderSuggestions.reduce((a,x)=>a+x.cost,0);confidence.textContent=avg+' %';stats.innerHTML=`<span><b>${orionOrderSuggestions.length}</b> produit(s)</span><span><b>${money(total)}</b> HTVA estimé</span><span><b>${orionOrderSuggestions.filter(x=>x.stock<=0).length}</b> rupture(s)</span>`;box.className='orion-suggestion-list';box.innerHTML=orionOrderSuggestions.slice(0,12).map(x=>`<div class="orion-suggestion"><div><b>${esc(x.name)}</b><small>Stock ${x.stock}${x.minimum>0?` · minimum ${x.minimum}`:''}</small><div>${x.reasons.map(r=>`<span class="orion-reason">✓ ${esc(r)}</span>`).join('')}</div></div><div class="orion-suggestion-qty">${x.quantity} ${esc(products.find(p=>p.id===x.product_id)?.unit||'unité(s)')}</div></div>`).join('')+(orionOrderSuggestions.length>12?`<div class="tiny">+ ${orionOrderSuggestions.length-12} autre(s) produit(s) proposé(s).</div>`:'');apply.disabled=false;clear.disabled=false}
function analyzeOrionOrder(){if(!$('quickOrderVenue').value||!$('quickOrderSupplier').value){toast('Choisissez d’abord un établissement et un fournisseur');return}orionOrderSuggestions=buildOrionOrderSuggestions();renderOrionOrderSuggestions();toast(orionOrderSuggestions.length?`${orionOrderSuggestions.length} proposition(s) ORION prête(s)`:'Aucun besoin urgent détecté')}
function applyOrionOrderSuggestions(){if(!orionOrderSuggestions.length)return;let added=0;orionOrderSuggestions.forEach(x=>{if(num(quickOrder.quantities[x.product_id])<=0){quickOrder.quantities[x.product_id]=x.quantity;quickOrder.notes[x.product_id]=`Suggestion ORION (${x.confidence}%): ${x.reasons.join(', ')}`;added++}});saveQuickOrderDraft();renderQuickOrderCatalog();renderOrionOrderSuggestions();toast(`${added} quantité(s) ajoutée(s) au brouillon`)}
function clearOrionOrderSuggestions(){orionOrderSuggestions=[];renderOrionOrderSuggestions();toast('Proposition ORION ignorée')}
function quickOrderProducts(){const venueId=$('quickOrderVenue').value,supplierId=$('quickOrderSupplier').value,term=$('quickOrderSearch').value.toLowerCase().trim(),filter=$('quickOrderFilter').value;const selectedSupplier=suppliers.find(s=>String(s.id)===String(supplierId));let list=products.filter(p=>{if(p.active===false||String(p.venue_id||'')!==String(venueId))return false;if(!supplierId)return true;if(String(p.supplier_id||'')===String(supplierId))return true;return !p.supplier_id&&/sligro/i.test(selectedSupplier?.name||'')&&/ORION Import/i.test(p.notes||'')});if(term)list=list.filter(p=>(`${p.name} ${p.sku||''} ${p.category||''} ${p.subcategory||''} ${p.location||''}`).toLowerCase().includes(term));if(filter==='favorites')list=list.filter(p=>p.favorite);if(filter==='ordered')list=list.filter(p=>num(quickOrder.quantities[p.id])>0);if(filter==='low')list=list.filter(p=>num(p.stock)<=num(p.minimum_stock));return list.sort((a,b)=>(num(a.category_order)-num(b.category_order))||(a.category||'Sans catégorie').localeCompare(b.category||'Sans catégorie','fr')||(num(a.product_order)-num(b.product_order))||a.name.localeCompare(b.name,'fr'))}
function renderQuickOrderCatalog(){if(!$('quickOrderCatalog'))return;const venueId=$('quickOrderVenue').value,supplierId=$('quickOrderSupplier').value;if(!venueId||!supplierId){$('quickOrderSummary').innerHTML='';$('quickOrderCatalog').innerHTML='<div class="empty">Sélectionnez un établissement et un fournisseur.</div>';updateQuickOrderTotals();return}const list=quickOrderProducts(),groups={};list.forEach(p=>(groups[p.category||'Sans catégorie']??=[]).push(p));const venue=venues.find(v=>String(v.id)===String(venueId)),supplier=suppliers.find(s=>String(s.id)===String(supplierId));$('quickOrderSummary').innerHTML=`<div class="item"><b>${esc(venue?.name||'Établissement')}</b></div><div class="item"><b>${esc(supplier?.name||'Fournisseur')}</b></div><div class="item"><b>${list.length}</b> produits affichés</div><div class="item"><b>${list.filter(p=>p.favorite).length}</b> favoris</div><div class="item"><b>${list.filter(p=>num(p.stock)<=num(p.minimum_stock)).length}</b> stocks faibles</div>`;$('quickOrderCatalog').innerHTML=list.length?Object.entries(groups).map(([category,items])=>`<section class="quick-category"><h4>${esc(category)} · ${items.length}</h4>${items.map(p=>{const q=num(quickOrder.quantities[p.id]),last=lastOrderedInfo(p.id),cost=unitCost(p);return `<div class="quick-product"><div class="quick-product-name"><div class="row"><button title="Favori" onclick="toggleQuickFavorite('${p.id}')">${p.favorite?'⭐':'☆'}</button><b>${esc(p.name)}</b></div><span class="tiny">Réf. ${esc(p.sku||'—')} · ${esc(p.location||p.unit||'')}</span></div><div class="quick-meta">Stock : <b>${num(p.stock)}</b>${num(p.minimum_stock)>0?` / min. ${num(p.minimum_stock)}`:''}<br>${last?`Dernière : <b>${last.quantity}</b> le ${last.date.toLocaleDateString('fr-BE')}`:'Jamais commandé'}${cost>0?`<br>Coût : <b>${money(cost)}</b>`:''}</div><div class="qty-control"><button type="button" onclick="changeQuickQty('${p.id}',-1)">−</button><input type="number" min="0" step="1" value="${q||''}" placeholder="0" oninput="setQuickQty('${p.id}',this.value)"><button type="button" onclick="changeQuickQty('${p.id}',1)">+</button></div><input class="quick-note" value="${esc(quickOrder.notes[p.id]||'')}" placeholder="Note facultative" oninput="setQuickNote('${p.id}',this.value)"></div>`}).join('')}</section>`).join(''):`<div class="empty"><b>Aucun produit trouvé.</b><br>Vérifiez que le catalogue ORION a bien été synchronisé pour ${esc(venue?.name||'cet établissement')} avec ${esc(supplier?.name||'ce fournisseur')}.</div>`;updateQuickOrderTotals()}
function updateQuickOrderTotals(){const ids=Object.keys(quickOrder.quantities).filter(id=>num(quickOrder.quantities[id])>0),total=ids.reduce((a,id)=>{const p=products.find(x=>x.id===id);return a+num(quickOrder.quantities[id])*unitCost(p||{})},0);if($('quickOrderCount'))$('quickOrderCount').textContent=ids.length;if($('quickOrderTotal'))$('quickOrderTotal').textContent=money(total)}
window.setQuickQty=(id,value)=>{quickOrder.quantities[id]=Math.max(0,num(value));if(!quickOrder.quantities[id])delete quickOrder.quantities[id];saveQuickOrderDraft();updateQuickOrderTotals()};
window.changeQuickQty=(id,delta)=>{quickOrder.quantities[id]=Math.max(0,num(quickOrder.quantities[id])+delta);if(!quickOrder.quantities[id])delete quickOrder.quantities[id];saveQuickOrderDraft();renderQuickOrderCatalog()};
window.setQuickNote=(id,value)=>{if(value.trim())quickOrder.notes[id]=value;else delete quickOrder.notes[id];saveQuickOrderDraft()};
window.toggleQuickFavorite=async id=>{const p=products.find(x=>x.id===id);if(!p)return;const {error}=await sb.from('products').update({favorite:!p.favorite}).eq('id',id);if(error){toast(error.message);return}p.favorite=!p.favorite;renderQuickOrderCatalog()};
function createOrderFromQuickDraft(){const venueId=$('quickOrderVenue').value,supplierId=$('quickOrderSupplier').value,ids=Object.keys(quickOrder.quantities).filter(id=>num(quickOrder.quantities[id])>0);if(!venueId||!supplierId){toast('Choisissez un établissement et un fournisseur');return}if(!ids.length){toast('Ajoutez au moins une quantité');return}resetOrder();$('oVenue').value=venueId;$('oSupplier').value=supplierId;draftLines=ids.map(id=>{const p=products.find(x=>x.id===id),note=(quickOrder.notes[id]||'').trim();return{product_id:id,description:p.name+(note?` — Note : ${note}`:''),quantity_ordered:num(quickOrder.quantities[id]),unit_price_excl_vat:unitCost(p),vat_rate:num(p.purchase_vat)||21}});renderOrderLines();$('orderModalTitle').textContent='Nouvelle commande préparée';openModal('orderModal')}
function renderOrders(){const term=$('orderSearch').value.toLowerCase(),filter=$('orderFilter').value;let list=orders.filter(o=>(o.order_number+' '+(o.suppliers?.name||'')).toLowerCase().includes(term));if(filter!=='all')list=list.filter(o=>o.status===filter);$('ordersBody').innerHTML=list.length?list.map(o=>{const st=orderStatusLabel(o.status);return `<tr><td><b>${esc(o.order_number||'—')}</b></td><td>${esc(o.suppliers?.name||'—')}</td><td>${esc(o.venues?.name||'Tous')}</td><td>${o.expected_at?new Date(o.expected_at).toLocaleDateString('fr-BE'):'—'}</td><td><span class="badge ${st[1]}">${st[0]}</span></td><td class="money">${money(orderTotal(o))}</td><td><button class="btn soft" onclick="editOrder('${o.id}')">Ouvrir</button></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Aucune commande.</td></tr>'}
function renderOrderOptions(){const sup=$('oSupplier')?.value||'',ven=$('oVenue')?.value||'';if($('oSupplier')){$('oSupplier').innerHTML='<option value="">Choisir un fournisseur</option>'+suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');$('oSupplier').value=sup}if($('oVenue')){$('oVenue').innerHTML='<option value="">Tous / non précisé</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');$('oVenue').value=ven}}
let draftLines=[];
function addOrderLine(line={}){draftLines.push({id:line.id||null,product_id:line.product_id||'',description:line.description||'',quantity_ordered:num(line.quantity_ordered)||1,unit_price_excl_vat:num(line.unit_price_excl_vat)||0,vat_rate:num(line.vat_rate)||21});renderOrderLines()}
function renderOrderLines(){const options='<option value="">Produit libre</option>'+products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('orderLinesBody').innerHTML=draftLines.length?draftLines.map((l,i)=>`<tr><td><select data-line="${i}" data-field="product_id">${options}</select><input data-line="${i}" data-field="description" value="${esc(l.description)}" placeholder="Description" style="margin-top:5px;width:100%;padding:8px;border:1px solid var(--line);border-radius:8px"></td><td><input type="number" min="0" step="0.001" data-line="${i}" data-field="quantity_ordered" value="${l.quantity_ordered}" style="width:90px"></td><td>${esc(products.find(p=>p.id===l.product_id)?.unit||'—')}</td><td><input type="number" min="0" step="0.0001" data-line="${i}" data-field="unit_price_excl_vat" value="${l.unit_price_excl_vat}" style="width:110px"></td><td><input type="number" min="0" step="0.001" data-line="${i}" data-field="vat_rate" value="${l.vat_rate}" style="width:75px"> %</td><td class="money">${money(l.quantity_ordered*l.unit_price_excl_vat)}</td><td><button type="button" class="btn mini danger" onclick="removeOrderLine(${i})">✕</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">Ajoutez au moins un produit.</td></tr>';draftLines.forEach((l,i)=>{const sel=document.querySelector(`select[data-line="${i}"]`);if(sel)sel.value=l.product_id});document.querySelectorAll('#orderLinesBody [data-line]').forEach(el=>el.oninput=()=>{const i=Number(el.dataset.line),f=el.dataset.field;draftLines[i][f]=f==='product_id'||f==='description'?el.value:num(el.value);if(f==='product_id'){const p=products.find(x=>x.id===el.value);if(p){draftLines[i].description=p.name;draftLines[i].unit_price_excl_vat=unitCost(p);draftLines[i].vat_rate=num(p.purchase_vat)||21}renderOrderLines()}else updateOrderTotals()});updateOrderTotals()}
window.removeOrderLine=i=>{draftLines.splice(i,1);renderOrderLines()};
function updateOrderTotals(){const ex=draftLines.reduce((a,l)=>a+l.quantity_ordered*l.unit_price_excl_vat,0),vat=draftLines.reduce((a,l)=>a+l.quantity_ordered*l.unit_price_excl_vat*l.vat_rate/100,0);$('orderTotalEx').textContent=money(ex);$('orderTotalVat').textContent=money(vat);$('orderTotalIncl').textContent=money(ex+vat);document.querySelectorAll('#orderLinesBody tr').forEach((tr,i)=>{const cell=tr.children[5];if(cell&&draftLines[i])cell.textContent=money(draftLines[i].quantity_ordered*draftLines[i].unit_price_excl_vat)})}
function resetOrder(){$('orderForm').reset();$('orderId').value='';$('oNumber').value='';$('oStatus').value='draft';$('oVenue').value=selectedVenue==='all'?'':selectedVenue;draftLines=[];addOrderLine();$('deleteOrderBtn').classList.add('hidden');$('printOrderBtn').classList.add('hidden');$('emailOrderBtn').classList.add('hidden');$('orderModalTitle').textContent='Nouvelle commande';renderOrderOptions()}
window.editOrder=id=>{const o=orders.find(x=>x.id===id);if(!o)return;resetOrder();$('orderId').value=o.id;$('oNumber').value=o.order_number||'';$('oStatus').value=o.status;$('oSupplier').value=o.supplier_id||'';$('oVenue').value=o.venue_id||'';$('oExpected').value=o.expected_at?String(o.expected_at).slice(0,10):'';$('oReference').value=o.internal_reference||'';$('oAddress').value=o.delivery_address||'';$('oNotes').value=o.notes||'';draftLines=(o.purchase_order_items||[]).map(x=>({...x}));if(!draftLines.length)addOrderLine();renderOrderLines();$('deleteOrderBtn').classList.remove('hidden');$('printOrderBtn').classList.remove('hidden');$('emailOrderBtn').classList.remove('hidden');$('orderModalTitle').textContent='Commande '+(o.order_number||'');openModal('orderModal')}

function renderSupplierOptions(){const current=$('pSupplier').value;$('pSupplier').innerHTML='<option value="">Aucun</option>'+suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');$('pSupplier').value=current}
async function audit(action,entityType,entityId,details={}){await sb.from('audit_log').insert({organization_id:orgId,user_id:user.id,action,entity_type:entityType,entity_id:entityId,details})}
function openModal(id){$(id).classList.add('open')}function closeModal(id){$(id).classList.remove('open')}
function updateProductCalculations(){const packagePrice=num($('pPackage').value),units=Math.max(num($('pUnits').value),1),saleIncl=num($('pSale').value),saleVat=num($('pSaleVat').value),target=num($('pTargetMargin').value),stock=num($('pStock').value);const cost=packagePrice/units,saleEx=saleIncl/(1+saleVat/100),margin=saleEx-cost,pct=saleEx>0?margin/saleEx*100:0,recommendedEx=target>0&&target<100?cost/(1-target/100):0,recommendedIncl=recommendedEx*(1+saleVat/100);$('calcUnitCost').textContent=money(cost);$('calcSaleEx').textContent=money(saleEx);$('calcMarginEuro').textContent=money(margin);$('calcMarginPct').textContent=pct.toFixed(1)+' %';$('calcRecommended').textContent=money(recommendedIncl);$('calcStockValue').textContent=money(stock*cost)}
function renderImagePreview(){const url=$('pImage').value.trim();$('imagePreview').innerHTML=url?`<img src="${esc(url)}" alt="Aperçu" style="width:90px;height:90px;object-fit:cover;border-radius:12px;border:1px solid var(--line)" onerror="this.outerHTML='Image inaccessible'">`:'Aucun aperçu'}
async function loadPriceHistory(productId){if(!productId){$('priceHistory').innerHTML='<div class="empty">Enregistrez le produit pour créer son historique.</div>';return}const {data,error}=await sb.from('product_prices').select('effective_at,package_price_excl_vat,units_per_package,unit_price_excl_vat,source').eq('product_id',productId).order('effective_at',{ascending:false}).limit(20);if(error){$('priceHistory').innerHTML='<div class="empty">Historique indisponible.</div>';return}$('priceHistory').innerHTML=data?.length?data.map(x=>`<div class="history-row"><span>${new Date(x.effective_at).toLocaleDateString('fr-BE')}</span><b>${money(x.package_price_excl_vat)} / colis</b><span>${money(x.unit_price_excl_vat)} / unité</span></div>`).join(''):'<div class="empty">Aucun changement de prix enregistré.</div>'}
function movementLabel(type){return {purchase:'Réception',correction:'Correction',inventory:'Inventaire',waste:'Perte / casse',sale:'Sortie / consommation',transfer:'Transfert',removal:'Retrait manuel'}[type]||type}
function renderMovementHistory(productId){const list=movements.filter(m=>m.product_id===productId).slice(0,20);$('movementHistory').innerHTML=list.length?list.map(m=>{const q=num(m.quantity),cls=q>0?'movement-positive':q<0?'movement-negative':'movement-neutral';return `<div class="history-row"><span>${new Date(m.created_at).toLocaleString('fr-BE')}</span><b class="${cls}">${q>0?'+':''}${q}</b><span>${esc(movementLabel(m.movement_type))}${m.note?' · '+esc(m.note):''}</span></div>`}).join(''):'<div class="empty">Aucun mouvement enregistré.</div>'}


function fillStockRemovalProducts(){
 const select=$('stockRemovalProductSelect');if(!select)return;
 const venueId=selectedVenue==='all'?'':selectedVenue;
 const list=products.filter(p=>p.active!==false&&(!venueId||p.venue_id===venueId)).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 select.innerHTML='<option value="">Choisir un produit</option>'+list.map(p=>`<option value="${p.id}">${esc(p.name)} · stock ${num(p.stock)} ${esc(p.unit||'')}</option>`).join('');
 updateStockRemovalPickerInfo();
}
function updateStockRemovalPickerInfo(){
 const p=products.find(x=>x.id===$('stockRemovalProductSelect')?.value);
 const box=$('stockRemovalProductInfo');if(!box)return;
 box.innerHTML=p?`<b>${esc(p.name)}</b><br>Stock disponible : ${num(p.stock)} ${esc(p.unit||'')}`:'Choisissez le produit à retirer.';
}
function openStockRemovalPicker(){
 fillStockRemovalProducts();openModal('stockRemovalPickerModal');
}
function updateMovementFormUi(){
 const type=$('mType')?.value;
 const removal=['removal','waste','sale'].includes(type);
 $('mRemovalReasonField')?.classList.toggle('hidden',!removal);
 if($('movementModalTitle'))$('movementModalTitle').textContent=type==='removal'?'🗑 Retirer un produit du stock':'Mouvement de stock';
 if($('mQuantityLabel'))$('mQuantityLabel').textContent=type==='inventory'?'Nouveau stock réel':'Quantité';
 if($('movementSubmitBtn'))$('movementSubmitBtn').textContent=type==='removal'?'Confirmer le retrait':'Enregistrer le mouvement';
 const p=products.find(x=>x.id===$('mProductId')?.value);
 const warning=$('movementWarning');
 if(warning&&p){
   if(removal){
     warning.classList.remove('hidden');
     warning.innerHTML=`Le stock actuel est de <b>${num(p.stock)} ${esc(p.unit||'')}</b>. Le retrait ne pourra pas dépasser cette quantité.`;
   }else warning.classList.add('hidden');
 }
}
window.quickMovement=(id,type)=>{const p=products.find(x=>x.id===id);if(!p)return;$('movementForm').reset();$('mProductId').value=id;$('mType').value=type;$('movementProductLabel').innerHTML=`<b>${esc(p.name)}</b><br>Stock actuel : ${num(p.stock)} ${esc(p.unit||'')}`;if($('mQuantity'))$('mQuantity').max=['removal','waste','sale'].includes(type)?Math.max(0,num(p.stock)):'';updateMovementFormUi();renderMovementHistory(id);openModal('movementModal');setTimeout(()=>$('mQuantity').focus(),100)}
window.toggleCatalogFavorite=async id=>{const p=products.find(x=>x.id===id);if(!p)return;const {error}=await sb.from('products').update({favorite:!p.favorite}).eq('id',id);if(error){toast(error.message);return}p.favorite=!p.favorite;renderProducts();renderQuickOrderCatalog();toast(p.favorite?'Ajouté aux favoris':'Retiré des favoris')};
function exportCatalogCsv(){const list=catalogFilteredProducts();if(!list.length){toast('Aucun produit à exporter');return}const headers=['Établissement','Fournisseur','Référence','Produit','Catégorie','Sous-catégorie','Emplacement','Unité','Stock','Stock minimum','Prix colis HTVA','Unités par colis','Coût unitaire HTVA','Prix vente TVAC','TVA vente','Marge %','Favori','Complétude %'];const rows=list.map(p=>[venues.find(v=>v.id===p.venue_id)?.name||'',supplierName(p.supplier_id),p.sku||p.barcode||'',p.name,p.category||'',p.subcategory||'',p.location||'',p.unit||'',num(p.stock),num(p.minimum_stock),num(p.package_price_excl_vat),num(p.units_per_package),unitCost(p),num(p.sale_price_incl_vat),num(p.sale_vat),marginPct(p).toFixed(2),p.favorite?'Oui':'Non',productCompleteness(p)]);const csv='\ufeff'+[headers,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`GESTIONA_catalogue_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);toast(`${list.length} produit(s) exporté(s)`) }
function resetProduct(){ $('productForm').reset();$('productId').value='';$('pUnit').value='pièce';$('pUnits').value='1';$('pPurchaseVat').value='21';$('pSaleVat').value='21';$('pFavorite').value='false';$('deleteProductBtn').classList.add('hidden');$('duplicateProductBtn').classList.add('hidden');renderImagePreview();$('productModalTitle').textContent='Ajouter un produit';renderSupplierOptions();loadPriceHistory(null);updateProductCalculations()}
window.editProduct=async id=>{const p=products.find(x=>x.id===id);if(!p)return;resetProduct();$('productId').value=p.id;$('pName').value=p.name;$('pImage').value=p.image_url||'';$('pSku').value=p.sku||'';$('pBarcode').value=p.barcode||'';$('pCategory').value=p.category||'';$('pSubcategory').value=p.subcategory||'';$('pSupplier').value=p.supplier_id||'';$('pUnit').value=p.unit||'pièce';$('pStock').value=p.stock;$('pMin').value=p.minimum_stock;$('pPackage').value=p.package_price_excl_vat;$('pUnits').value=p.units_per_package;$('pPurchaseVat').value=p.purchase_vat;$('pSale').value=p.sale_price_incl_vat;$('pSaleVat').value=p.sale_vat;$('pTargetMargin').value=p.target_margin_percent??'';$('pLocation').value=p.location||'';$('pFavorite').value=String(!!p.favorite);$('pNotes').value=p.notes||'';$('deleteProductBtn').classList.remove('hidden');$('duplicateProductBtn').classList.remove('hidden');renderImagePreview();$('productModalTitle').textContent='Fiche produit';updateProductCalculations();await loadPriceHistory(id);openModal('productModal')}
function resetSupplier(){ $('supplierForm').reset();$('supplierId').value='';$('deleteSupplierBtn').classList.add('hidden');$('supplierModalTitle').textContent='Ajouter un fournisseur'}window.editSupplier=id=>{const s=suppliers.find(x=>x.id===id);if(!s)return;resetSupplier();$('supplierId').value=s.id;$('sName').value=s.name;$('sContact').value=s.contact_name||'';$('sEmail').value=s.email||'';$('sPhone').value=s.phone||'';$('sDays').value=s.delivery_days||'';$('sTerms').value=s.payment_terms||'';$('sNotes').value=s.notes||'';$('deleteSupplierBtn').classList.remove('hidden');$('supplierModalTitle').textContent='Modifier le fournisseur';openModal('supplierModal')}



function normalizeCategoryName(value){return String(value||'').trim().replace(/\s+/g,' ')}
function categoryKey(value){return normalizeCategoryName(value).toLocaleLowerCase('fr')}
function inferCategoryIcon(name){
  const n=categoryKey(name);
  if(/viande|boeuf|porc|volaille|poulet|charcut/.test(n))return '🥩';
  if(/poisson|fruit de mer|moule|crustac/.test(n))return '🐟';
  if(/légume|legume|fruit|primeur/.test(n))return '🥬';
  if(/lait|fromage|crème|creme|beurre/.test(n))return '🧀';
  if(/pain|boulanger|viennoiser/.test(n))return '🍞';
  if(/bière|biere/.test(n))return '🍺';
  if(/vin|champagne|mousseux/.test(n))return '🍷';
  if(/spirit|alcool|apéritif|aperitif|gin|rhum|whisky|vodka/.test(n))return '🍸';
  if(/soft|eau|jus|soda|boisson froide/.test(n))return '🥤';
  if(/café|cafe|thé|the|boisson chaude/.test(n))return '☕';
  if(/dessert|pâtisserie|patisserie|glace/.test(n))return '🍰';
  if(/surgel|congel/.test(n))return '❄️';
  if(/entretien|nettoyage|hygiène|hygiene/.test(n))return '🧽';
  if(/emballage|jetable|serviette|sac/.test(n))return '📦';
  if(/épicerie|epicerie|sec|condiment|sauce|huile|farine|pâte|pate|riz/.test(n))return '🧂';
  return '📋';
}
function loadStockCategories(){
  try{
    const saved=JSON.parse(localStorage.getItem(STOCK_CATEGORIES_KEY)||'[]');
    stockCategories=Array.isArray(saved)?saved:[];
  }catch(e){stockCategories=[]}
  const productNames=products.map(p=>normalizeCategoryName(p.category)).filter(Boolean);
  const merged=[...DEFAULT_STOCK_CATEGORIES,...stockCategories,...productNames.map(name=>({name,icon:inferCategoryIcon(name)}))];
  const map=new Map();
  merged.forEach(c=>{const name=normalizeCategoryName(c.name);if(name&&!map.has(categoryKey(name)))map.set(categoryKey(name),{name,icon:c.icon||inferCategoryIcon(name)})});
  stockCategories=[...map.values()];
  saveStockCategories(false);
}
function syncCategoriesFromProducts(){
  let changed=false;
  products.forEach(p=>{
    const name=normalizeCategoryName(p.category);
    if(name&&!stockCategories.some(c=>categoryKey(c.name)===categoryKey(name))){
      stockCategories.push({name,icon:inferCategoryIcon(name)});changed=true;
    }
  });
  if(changed)saveStockCategories(false);
}
function saveStockCategories(render=true){
  stockCategories.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  localStorage.setItem(STOCK_CATEGORIES_KEY,JSON.stringify(stockCategories));
  if(render){renderStockCategoryTabs();renderStockCategoryManager();renderCatalogFilters();renderProducts()}
}
function stockCategoryCount(name){
  return visibleProducts(true).filter(p=>categoryKey(p.category)===categoryKey(name)).length;
}
function categoryStockValue(name){
  return visibleProducts(true).filter(p=>categoryKey(p.category)===categoryKey(name)).reduce((sum,p)=>sum+num(p.stock)*unitCost(p),0);
}
function stockTreeState(){try{return JSON.parse(localStorage.getItem(STOCK_TREE_STATE_KEY)||'{}')}catch(e){return {}}}
function saveStockTreeState(state){localStorage.setItem(STOCK_TREE_STATE_KEY,JSON.stringify(state))}
function categorySubgroups(name){
  const rows=visibleProducts(false).filter(p=>categoryKey(p.category)===categoryKey(name)),groups=new Map();
  rows.forEach(p=>{const label=normalizeCategoryName(p.subcategory)||'Sans sous-catégorie',key=categoryKey(label);if(!groups.has(key))groups.set(key,{name:label,count:0,low:0,value:0});const g=groups.get(key);g.count++;g.low+=num(p.stock)<=num(p.minimum_stock)?1:0;g.value+=num(p.stock)*unitCost(p)});
  return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'))
}
function renderStockCategoryTabs(){
  if(!$('stockCategoryTabs'))return;
  syncCategoriesFromProducts();
  const visible=visibleProducts(false),low=visible.filter(p=>num(p.stock)<=num(p.minimum_stock)).length,out=visible.filter(p=>num(p.stock)<=0).length,fav=visible.filter(p=>p.favorite).length;
  const special=[{id:'all',icon:'🏠',label:'Tous les produits',count:visible.length},{id:'favorite',icon:'⭐',label:'Favoris',count:fav},{id:'out',icon:'⚠️',label:'Ruptures',count:out},{id:'low',icon:'🟠',label:'Stock faible',count:low}];
  const state=stockTreeState();
  const specialHtml=special.map(x=>`<button type="button" class="stock-category-tab ${selectedStockCategory===x.id?'active':''}" onclick="selectStockCategory('${x.id}')"><span class="stock-category-icon">${x.icon}</span><span>${esc(x.label)}</span><b>${x.count}</b></button>`).join('');
  const treeHtml=stockCategories.map(c=>{
    const key=categoryKey(c.name),subs=categorySubgroups(c.name),expanded=state[key]!==false,active=selectedStockCategory===`category:${c.name}`||selectedStockCategory.startsWith('subcategory:'+encodeURIComponent(c.name)+':');
    const subHtml=subs.map(g=>{const id=`subcategory:${encodeURIComponent(c.name)}:${encodeURIComponent(g.name)}`;return `<button type="button" class="stock-subcategory-tab ${selectedStockCategory===id?'active':''}" onclick="selectStockCategory('${id}')"><span>↳</span><span>${esc(g.name)}</span><b>${g.count}</b>${g.low?`<i title="${g.low} produit(s) à surveiller">${g.low}</i>`:''}</button>`}).join('');
    return `<section class="stock-tree-group ${active?'current':''}"><div class="stock-tree-family"><button type="button" class="stock-tree-toggle" onclick="toggleStockTree('${esc(key).replace(/'/g,"\\'")}')" aria-label="Déplier ou replier">${expanded?'▾':'▸'}</button><button type="button" class="stock-category-tab ${selectedStockCategory===`category:${c.name}`?'active':''}" onclick="selectStockCategory('category:${esc(c.name).replace(/'/g,"\\'")}')"><span class="stock-category-icon">${c.icon||inferCategoryIcon(c.name)}</span><span>${esc(c.name)}</span><b>${stockCategoryCount(c.name)}</b></button></div><div class="stock-tree-children ${expanded?'':'hidden'}">${subHtml||'<div class="stock-tree-empty">Aucune sous-catégorie</div>'}</div></section>`;
  }).join('');
  $('stockCategoryTabs').innerHTML=`<div class="stock-tree-special">${specialHtml}</div><div class="stock-tree-label">Familles de stock</div>${treeHtml}`;
  renderStockCategoryDatalist();renderStockSubcategoryDatalist();
}
window.toggleStockTree=key=>{const state=stockTreeState();state[key]=state[key]===false;saveStockTreeState(state);renderStockCategoryTabs()};
window.selectStockCategory=id=>{
  selectedStockCategory=id;
  if(id==='favorite')$('productFilter').value='favorite';
  else if(id==='low'||id==='out')$('productFilter').value=id==='low'?'low':'all';
  else $('productFilter').value='all';
  $('productCategoryFilter').value=id.startsWith('category:')?id.slice(9):'all';
  renderStockCategoryTabs();renderProducts();
};
function renderStockCategoryDatalist(){if($('stockCategoryDatalist'))$('stockCategoryDatalist').innerHTML=stockCategories.map(c=>`<option value="${esc(c.name)}">${c.icon||''}</option>`).join('')}
function renderStockSubcategoryDatalist(){if(!$('stockSubcategoryDatalist'))return;const category=normalizeCategoryName($('pCategory')?.value),values=[...new Set(products.filter(p=>!category||categoryKey(p.category)===categoryKey(category)).map(p=>normalizeCategoryName(p.subcategory)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));$('stockSubcategoryDatalist').innerHTML=values.map(v=>`<option value="${esc(v)}"></option>`).join('')}

function activeStockCategoryLabel(){
  if(selectedStockCategory==='all')return 'Tous les produits';
  if(selectedStockCategory==='favorite')return 'Favoris';
  if(selectedStockCategory==='out')return 'Ruptures de stock';
  if(selectedStockCategory==='low')return 'Stock faible';
  if(selectedStockCategory.startsWith('subcategory:')){const [,cat='',sub='']=selectedStockCategory.split(':');return `${decodeURIComponent(cat)} › ${decodeURIComponent(sub)}`}
  return selectedStockCategory.startsWith('category:')?selectedStockCategory.slice(9):'Tous les produits';
}
function renderSelectedCategoryHeader(list){
  if(!$('selectedStockCategoryTitle'))return;
  const label=activeStockCategoryLabel();
  const cat=stockCategories.find(c=>categoryKey(c.name)===categoryKey(label));
  $('selectedStockCategoryTitle').textContent=`${cat?.icon||({favorite:'⭐',out:'⚠️',low:'🟠'}[selectedStockCategory]||'📦')} ${label}`;
  const value=list.reduce((sum,p)=>sum+num(p.stock)*unitCost(p),0);
  const low=list.filter(p=>num(p.stock)<=num(p.minimum_stock)).length;
  $('selectedStockCategoryStats').textContent=`${list.length} produit(s) · valeur ${money(value)} · ${low} à surveiller`;
}
function renderStockCategoryManager(){
  if(!$('stockCategoriesManagerList'))return;
  $('stockCategoriesManagerList').innerHTML=stockCategories.map((c,i)=>{
    const count=stockCategoryCount(c.name);
    return `<div class="category-manager-row">
      <span class="category-manager-icon">${c.icon||inferCategoryIcon(c.name)}</span>
      <div><b>${esc(c.name)}</b><span>${count} produit(s) · ${money(categoryStockValue(c.name))}</span></div>
      <button class="btn soft mini" type="button" onclick="renameStockCategory(${i})">Renommer</button>
      <button class="btn danger mini" type="button" onclick="deleteStockCategory(${i})" ${count?'disabled title="Déplacez d’abord les produits"':''}>Supprimer</button>
    </div>`;
  }).join('')||'<div class="empty">Aucune catégorie personnalisée.</div>';
}
function createStockCategory(name,icon){
  name=normalizeCategoryName(name);
  if(!name){toast('Indiquez le nom de la catégorie');return false}
  if(stockCategories.some(c=>categoryKey(c.name)===categoryKey(name))){toast('Cette catégorie existe déjà');return false}
  stockCategories.push({name,icon:icon||inferCategoryIcon(name)});saveStockCategories();
  toast('Catégorie ajoutée');return true;
}
window.renameStockCategory=async i=>{
  const c=stockCategories[i];if(!c)return;
  const next=normalizeCategoryName(prompt(`Nouveau nom pour « ${c.name} » :`,c.name));
  if(!next||next===c.name)return;
  if(stockCategories.some((x,j)=>j!==i&&categoryKey(x.name)===categoryKey(next))){toast('Cette catégorie existe déjà');return}
  const affected=products.filter(p=>categoryKey(p.category)===categoryKey(c.name));
  if(affected.length&&!confirm(`Renommer « ${c.name} » en « ${next} » et mettre à jour ${affected.length} produit(s) ?`))return;
  try{
    if(affected.length){
      const ids=affected.map(p=>p.id);
      const {error}=await sb.from('products').update({category:next}).in('id',ids);
      if(error)throw error;
      affected.forEach(p=>p.category=next);
    }
    const old=c.name;c.name=next;c.icon=c.icon||inferCategoryIcon(next);
    if(selectedStockCategory==='category:'+old)selectedStockCategory='category:'+next;
    saveStockCategories();await audit('Catégorie de stock renommée','stock_category',null,{old_name:old,new_name:next,products:affected.length});
    toast('Catégorie renommée');
  }catch(e){toast('Modification impossible : '+(e.message||e))}
};
window.deleteStockCategory=i=>{
  const c=stockCategories[i];if(!c)return;
  const count=stockCategoryCount(c.name);
  if(count){toast('Cette catégorie contient encore des produits');return}
  if(!confirm(`Supprimer la catégorie « ${c.name} » ?`))return;
  stockCategories.splice(i,1);
  if(selectedStockCategory==='category:'+c.name)selectedStockCategory='all';
  saveStockCategories();toast('Catégorie supprimée');
};
function groupedProductOptions(selected='',venueId=''){
  const list=products.filter(p=>p.active!==false&&(!venueId||!p.venue_id||p.venue_id===venueId)).sort((a,b)=>(a.category||'').localeCompare(b.category||'','fr')||a.name.localeCompare(b.name,'fr'));
  const groups={};
  list.forEach(p=>(groups[p.category||'Sans catégorie']??=[]).push(p));
  return Object.entries(groups).map(([cat,rows])=>`<optgroup label="${esc(inferCategoryIcon(cat)+' '+cat)}">${rows.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)} · ${money(unitCost(p))}/${esc(p.unit||'unité')}</option>`).join('')}</optgroup>`).join('');
}

function loadMenus(){try{menus=JSON.parse(localStorage.getItem(MENUS_KEY)||'[]');if(!Array.isArray(menus))menus=[]}catch(e){menus=[]}}
function saveMenus(){localStorage.setItem(MENUS_KEY,JSON.stringify(menus));renderMenus();renderPos()}
function loadSales(){try{sales=JSON.parse(localStorage.getItem(SALES_KEY)||'[]');if(!Array.isArray(sales))sales=[]}catch(e){sales=[]}}
function saveSales(){localStorage.setItem(SALES_KEY,JSON.stringify(sales));renderSalesStats()}
function menuVisible(m){return selectedVenue==='all'||!m.venue_id||m.venue_id===selectedVenue}
function menuCost(m){return (m.items||[]).reduce((sum,x)=>{const r=recipes.find(y=>y.id===x.recipe_id);return sum+(r?recipePortionCost(r)*num(x.quantity):0)},0)}
function menuSaleEx(m){return num(m.sale_price_incl_vat)/(1+num(m.sale_vat||12)/100)}
function menuMarginPct(m){const sale=menuSaleEx(m);return sale>0?(sale-menuCost(m))/sale*100:0}
function fillMenuVenueOptions(){
  const opts='<option value="">Tous / menu commun</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');
  if($('menuVenue'))$('menuVenue').innerHTML=opts;
  if($('posVenue')){$('posVenue').innerHTML=venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');if(selectedVenue!=='all')$('posVenue').value=selectedVenue}
}
function renderMenus(){
  if(!$('menusGrid'))return;
  const q=($('menuSearch')?.value||'').trim().toLowerCase();
  const list=menus.filter(menuVisible).filter(m=>!q||`${m.name} ${m.notes||''}`.toLowerCase().includes(q));
  const margins=list.filter(m=>num(m.sale_price_incl_vat)>0).map(menuMarginPct);
  $('menuCount').textContent=list.length;
  $('menuAvgCost').textContent=money(list.length?list.reduce((a,m)=>a+menuCost(m),0)/list.length:0);
  $('menuAvgMargin').textContent=(margins.length?margins.reduce((a,b)=>a+b,0)/margins.length:0).toFixed(1)+' %';
  $('menuLowMargin').textContent=list.filter(m=>num(m.sale_price_incl_vat)>0&&menuMarginPct(m)<65).length;
  $('menusGrid').innerHTML=list.length?list.map(m=>`<article class="recipe-card"><div class="recipe-image"><div class="recipe-placeholder">📋</div></div><div class="recipe-card-body"><div class="row between"><span class="badge ok">Menu</span><span class="tiny">${esc(venues.find(v=>v.id===m.venue_id)?.name||'Commun')}</span></div><h3>${esc(m.name)}</h3><div class="recipe-metrics"><div><span>Coût</span><b>${money(menuCost(m))}</b></div><div><span>Vente TVAC</span><b>${money(m.sale_price_incl_vat)}</b></div><div><span>Marge</span><b class="${menuMarginPct(m)<65?'text-danger':''}">${menuMarginPct(m).toFixed(1)} %</b></div><div><span>Recettes</span><b>${(m.items||[]).length}</b></div></div><div class="actions"><button class="btn soft mini" onclick="editMenu('${m.id}')">Modifier</button><button class="btn primary mini" onclick="addPosItem('menu','${m.id}')">Ajouter à la caisse</button></div></div></article>`).join(''):'<div class="empty" style="grid-column:1/-1">Aucun menu enregistré.</div>';
}
function resetMenu(){
  $('menuForm').reset();$('menuId').value='';$('menuModalTitle').textContent='Nouveau menu';$('menuSalePrice').value='0';$('menuVat').value='12';$('menuVenue').value=selectedVenue==='all'?'':selectedVenue;menuRecipeDraft=[];$('deleteMenuBtn').classList.add('hidden');renderMenuRecipes();
}
function menuRecipeOptions(selected=''){const venue=$('menuVenue')?.value||'';return recipes.filter(r=>!venue||!r.venue_id||r.venue_id===venue).sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(r=>`<option value="${r.id}" ${r.id===selected?'selected':''}>${esc(r.name)} · ${money(recipePortionCost(r))}</option>`).join('')}
function addMenuRecipe(recipeId='',quantity=1){menuRecipeDraft.push({recipe_id:recipeId,quantity:num(quantity)||1});renderMenuRecipes()}
function renderMenuRecipes(){
  if(!$('menuRecipesBody'))return;
  $('menuRecipesBody').innerHTML=menuRecipeDraft.length?menuRecipeDraft.map((x,i)=>{const r=recipes.find(y=>y.id===x.recipe_id);return `<tr><td><select onchange="setMenuRecipe(${i},this.value)"><option value="">Choisir une recette</option>${menuRecipeOptions(x.recipe_id)}</select></td><td><input type="number" min="0.001" step="0.001" value="${num(x.quantity)}" oninput="setMenuRecipeQty(${i},this.value)"></td><td class="money">${money(r?recipePortionCost(r)*num(x.quantity):0)}</td><td><button class="btn danger mini" type="button" onclick="removeMenuRecipe(${i})">✕</button></td></tr>`}).join(''):'<tr><td colspan="4" class="empty">Aucune recette ajoutée.</td></tr>';
  updateMenuCalculations();
}
window.setMenuRecipe=(i,v)=>{if(menuRecipeDraft[i])menuRecipeDraft[i].recipe_id=v;renderMenuRecipes()}
window.setMenuRecipeQty=(i,v)=>{if(menuRecipeDraft[i])menuRecipeDraft[i].quantity=Math.max(num(v),0);renderMenuRecipes()}
window.removeMenuRecipe=i=>{menuRecipeDraft.splice(i,1);renderMenuRecipes()}
function currentMenuDraft(){return {items:menuRecipeDraft,sale_price_incl_vat:num($('menuSalePrice')?.value),sale_vat:num($('menuVat')?.value||12)}}
function updateMenuCalculations(){
  if(!$('menuCalcCost'))return;const m=currentMenuDraft(),cost=menuCost(m),sale=menuSaleEx(m),margin=sale-cost,pct=sale>0?margin/sale*100:0;
  $('menuCalcCost').textContent=money(cost);$('menuCalcSaleEx').textContent=money(sale);$('menuCalcMarginEuro').textContent=money(margin);$('menuCalcMarginPct').textContent=pct.toFixed(1)+' %';
}
window.editMenu=id=>{const m=menus.find(x=>x.id===id);if(!m)return;fillMenuVenueOptions();resetMenu();$('menuId').value=m.id;$('menuModalTitle').textContent='Modifier le menu';$('menuName').value=m.name||'';$('menuVenue').value=m.venue_id||'';$('menuSalePrice').value=num(m.sale_price_incl_vat);$('menuVat').value=String(num(m.sale_vat)||12);$('menuNotes').value=m.notes||'';menuRecipeDraft=(m.items||[]).map(x=>({...x}));$('deleteMenuBtn').classList.remove('hidden');renderMenuRecipes();openModal('menuModal')};

function posItems(){
  const venue=$('posVenue')?.value||selectedVenue;
  const recipeRows=recipes.filter(r=>!venue||venue==='all'||!r.venue_id||r.venue_id===venue).map(r=>({type:'recipe',id:r.id,name:r.name,price:num(r.sale_price_incl_vat),cost:recipePortionCost(r),category:r.category||'Recette'}));
  const menuRows=menus.filter(m=>!venue||venue==='all'||!m.venue_id||m.venue_id===venue).map(m=>({type:'menu',id:m.id,name:m.name,price:num(m.sale_price_incl_vat),cost:menuCost(m),category:'Menu'}));
  return [...recipeRows,...menuRows];
}
function renderPos(){
  if(!$('posCatalog'))return;fillMenuVenueOptions();
  const q=($('posSearch')?.value||'').trim().toLowerCase(),type=$('posTypeFilter')?.value||'all';
  const list=posItems().filter(x=>(type==='all'||x.type===type)&&(!q||`${x.name} ${x.category}`.toLowerCase().includes(q)));
  $('posCatalog').innerHTML=list.length?list.map(x=>`<button class="pos-item" type="button" onclick="addPosItem('${x.type}','${x.id}')"><span>${x.type==='menu'?'📋':'🍽️'}</span><b>${esc(x.name)}</b><small>${money(x.price)}</small></button>`).join(''):'<div class="empty">Aucun article disponible.</div>';
  renderPosCart();renderSalesStats();
}
window.addPosItem=(type,id)=>{const key=type+':'+id,found=posCart.find(x=>x.key===key);if(found)found.quantity+=1;else posCart.push({key,type,id,quantity:1});renderPosCart();toast('Ajouté au ticket')}
function posLineObject(line){return line.type==='recipe'?recipes.find(x=>x.id===line.id):menus.find(x=>x.id===line.id)}
function posLinePrice(line){const x=posLineObject(line);return num(x?.sale_price_incl_vat)}
function renderPosCart(){
  if(!$('posCart'))return;
  $('posCart').innerHTML=posCart.length?posCart.map((line,i)=>{const x=posLineObject(line);return `<div class="pos-cart-line"><div><b>${esc(x?.name||'Article supprimé')}</b><span>${money(posLinePrice(line))} × ${line.quantity}</span></div><div class="qty-control"><button type="button" onclick="changePosQty(${i},-1)">−</button><b>${line.quantity}</b><button type="button" onclick="changePosQty(${i},1)">+</button></div><b>${money(posLinePrice(line)*line.quantity)}</b></div>`}).join(''):'<div class="empty">Le ticket est vide.</div>';
  $('posTotal').textContent=money(posCart.reduce((a,x)=>a+posLinePrice(x)*x.quantity,0));
}
window.changePosQty=(i,d)=>{if(!posCart[i])return;posCart[i].quantity+=d;if(posCart[i].quantity<=0)posCart.splice(i,1);renderPosCart()}
function expandSaleRecipes(){
  const result=[];
  posCart.forEach(line=>{
    if(line.type==='recipe')result.push({recipe_id:line.id,quantity:line.quantity});
    else{
      const m=menus.find(x=>x.id===line.id);
      (m?.items||[]).forEach(item=>result.push({recipe_id:item.recipe_id,quantity:num(item.quantity)*line.quantity}));
    }
  });
  return result;
}
function aggregateSaleNeeds(){
  const map=new Map();
  expandSaleRecipes().forEach(entry=>{
    const r=recipes.find(x=>x.id===entry.recipe_id);if(!r)return;
    const multiplier=num(entry.quantity)/Math.max(num(r.portions),1);
    (r.ingredients||[]).forEach(line=>{
      const qty=num(line.quantity)*multiplier;
      map.set(line.product_id,(map.get(line.product_id)||0)+qty);
    });
  });
  return [...map.entries()].map(([product_id,quantity])=>({product_id,quantity,product:products.find(p=>p.id===product_id)}));
}
async function validatePosSale(){
  if(!posCart.length){toast('Le ticket est vide');return}
  const needs=aggregateSaleNeeds(),missing=needs.filter(x=>!x.product||num(x.product.stock)<x.quantity);
  if(missing.length){alert('Vente impossible : stock insuffisant\n\n'+missing.map(x=>`• ${x.product?.name||'Produit absent'} : besoin ${x.quantity.toFixed(3)}, stock ${num(x.product?.stock)}`).join('\n'));return}
  const total=posCart.reduce((a,x)=>a+posLinePrice(x)*x.quantity,0),covers=Math.max(0,Math.round(num($('posCovers').value)));
  if(!confirm(`Valider cette vente de ${money(total)} ?\n\nLes ingrédients seront retirés du stock.`))return;
  try{
    const saleId='sale-'+Date.now();
    for(const need of needs){
      const {error}=await sb.rpc('record_stock_movement',{p_product_id:need.product_id,p_quantity:-need.quantity,p_movement_type:'sale',p_note:`Vente caisse ${saleId}`});
      if(error)throw error;
    }
    const record={id:saleId,created_at:new Date().toISOString(),venue_id:$('posVenue').value||null,service:$('posService').value,payment:$('posPayment').value,covers,total,items:posCart.map(x=>({...x,name:posLineObject(x)?.name||'',unit_price:posLinePrice(x)}))};
    sales.unshift(record);saveSales();
    await audit('Vente caisse enregistrée','sale',saleId,{total,covers,service:record.service,payment:record.payment,items:record.items.length});
    posCart=[];await refresh();renderPos();toast(`Vente enregistrée : ${money(total)}`);
  }catch(e){toast('Vente impossible : '+(e.message||e))}
}
function todaySales(){
  const today=new Date().toISOString().slice(0,10),venue=$('posVenue')?.value||selectedVenue;
  return sales.filter(s=>String(s.created_at).slice(0,10)===today&&(!venue||venue==='all'||!s.venue_id||s.venue_id===venue));
}
function renderSalesStats(){
  if(!$('salesHistory'))return;
  const today=todaySales(),revenue=today.reduce((a,s)=>a+num(s.total),0),covers=today.reduce((a,s)=>a+num(s.covers),0);
  $('salesTodayRevenue').textContent=money(revenue);$('salesTodayTickets').textContent=today.length;$('salesAverageTicket').textContent=money(today.length?revenue/today.length:0);$('salesTodayCovers').textContent=covers;
  const venue=$('posVenue')?.value||selectedVenue;
  const list=sales.filter(s=>!venue||venue==='all'||!s.venue_id||s.venue_id===venue).slice(0,30);
  $('salesHistory').innerHTML=list.length?list.map(s=>`<div class="item"><div><b>${new Date(s.created_at).toLocaleString('fr-BE')} · ${money(s.total)}</b><span class="muted">${num(s.covers)} couvert(s) · ${esc(s.service||'')} · ${(s.items||[]).map(i=>`${i.quantity}× ${esc(i.name)}`).join(', ')}</span></div></div>`).join(''):'<div class="empty">Aucune vente enregistrée.</div>';
}
function exportSalesCsv(){
  const rows=[['Date','Établissement','Service','Paiement','Couverts','Total TVAC','Articles']];
  sales.forEach(s=>rows.push([new Date(s.created_at).toLocaleString('fr-BE'),venues.find(v=>v.id===s.venue_id)?.name||'',s.service,s.payment,s.covers,s.total,(s.items||[]).map(i=>`${i.quantity}x ${i.name}`).join(' | ')]));
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='gestiona-ventes.csv';a.click();URL.revokeObjectURL(a.href);
}

function loadRecipes(){
  try{
    recipes=JSON.parse(localStorage.getItem(RECIPES_KEY)||'[]');
    if(!Array.isArray(recipes))recipes=[];
  }catch(e){recipes=[]}
}
function saveRecipes(){
  localStorage.setItem(RECIPES_KEY,JSON.stringify(recipes));
  renderRecipes();
}
function recipeVisible(r){
  return selectedVenue==='all'||!r.venue_id||r.venue_id===selectedVenue;
}
function recipeIngredientCost(line){
  const p=products.find(x=>x.id===line.product_id);
  return p?num(line.quantity)*unitCost(p):0;
}
function recipeTotalCost(r){
  return (r.ingredients||[]).reduce((sum,line)=>sum+recipeIngredientCost(line),0);
}
function recipePortionCost(r){
  return recipeTotalCost(r)/Math.max(num(r.portions),1);
}
function recipeSaleEx(r){
  return num(r.sale_price_incl_vat)/(1+num(r.sale_vat||12)/100);
}
function recipeMarginPct(r){
  const sale=recipeSaleEx(r),cost=recipePortionCost(r);
  return sale>0?(sale-cost)/sale*100:0;
}
function recipeMarginEuro(r){
  return recipeSaleEx(r)-recipePortionCost(r);
}
function recipeStockCapacity(r){
  const ingredients=r.ingredients||[];
  if(!ingredients.length)return 0;
  return Math.floor(Math.min(...ingredients.map(line=>{
    const p=products.find(x=>x.id===line.product_id);
    return p&&num(line.quantity)>0?num(p.stock)/num(line.quantity):0;
  }))*Math.max(num(r.portions),1));
}
function fillRecipeVenueOptions(){
  if(!$('rVenue'))return;
  $('rVenue').innerHTML='<option value="">Tous / recette commune</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');
}
function renderRecipes(){
  if(!$('recipesGrid'))return;
  const q=($('recipeSearch')?.value||'').trim().toLowerCase();
  const cat=$('recipeCategoryFilter')?.value||'all';
  const visible=recipes.filter(recipeVisible);
  const cats=[...new Set(visible.map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  const current=$('recipeCategoryFilter')?.value||'all';
  $('recipeCategoryFilter').innerHTML='<option value="all">Toutes les catégories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('recipeCategoryFilter').value=cats.includes(current)?current:'all';

  const list=visible.filter(r=>(cat==='all'||r.category===cat)&&(!q||`${r.name} ${r.category||''}`.toLowerCase().includes(q)));
  const margins=list.filter(r=>num(r.sale_price_incl_vat)>0).map(recipeMarginPct);
  $('recipeCount').textContent=list.length;
  $('recipeAvgCost').textContent=money(list.length?list.reduce((a,r)=>a+recipePortionCost(r),0)/list.length:0);
  $('recipeAvgMargin').textContent=(margins.length?margins.reduce((a,b)=>a+b,0)/margins.length:0).toFixed(1)+' %';
  $('recipeLowMargin').textContent=list.filter(r=>num(r.sale_price_incl_vat)>0&&recipeMarginPct(r)<65).length;

  $('recipesGrid').innerHTML=list.length?list.map(r=>{
    const cost=recipePortionCost(r),margin=recipeMarginPct(r),capacity=recipeStockCapacity(r);
    const venue=venues.find(v=>v.id===r.venue_id)?.name||'Recette commune';
    const image=r.image_url?`<img src="${esc(r.image_url)}" alt="" onerror="this.style.display='none'">`:`<div class="recipe-placeholder">🍽️</div>`;
    return `<article class="recipe-card">
      <div class="recipe-image">${image}</div>
      <div class="recipe-card-body">
        <div class="row between"><span class="badge ok">${esc(r.category||'Autre')}</span><span class="tiny">${esc(venue)}</span></div>
        <h3>${esc(r.name)}</h3>
        <div class="recipe-metrics">
          <div><span>Coût/portion</span><b>${money(cost)}</b></div>
          <div><span>Vente TVAC</span><b>${money(r.sale_price_incl_vat)}</b></div>
          <div><span>Marge</span><b class="${margin<65?'text-danger':''}">${margin.toFixed(1)} %</b></div>
          <div><span>Portions possibles</span><b>${capacity}</b></div>
        </div>
        <div class="tiny">${(r.ingredients||[]).length} ingrédient(s) · ${num(r.prep_time_minutes)} min</div>
        <div class="actions recipe-actions">
          <button class="btn soft mini" onclick="editRecipe('${r.id}')">Modifier</button>
          <button class="btn primary mini" onclick="prepareRecipe('${r.id}')">🍳 Préparer</button>
        </div>
      </div>
    </article>`;
  }).join(''):'<div class="empty" style="grid-column:1/-1">Aucune recette. Cliquez sur « Nouvelle recette » pour commencer.</div>';

  renderRecipeOrion(list);
}
function renderRecipeOrion(list=recipes.filter(recipeVisible)){
  if(!$('recipeOrionSummary'))return;
  if(!list.length){
    $('recipeOrionSummary').textContent='Ajoutez vos premières recettes pour obtenir une analyse de rentabilité.';
    $('recipeOrionList').innerHTML='';
    return;
  }
  const low=list.filter(r=>num(r.sale_price_incl_vat)>0&&recipeMarginPct(r)<65).sort((a,b)=>recipeMarginPct(a)-recipeMarginPct(b));
  const impossible=list.filter(r=>(r.ingredients||[]).length&&recipeStockCapacity(r)<=0);
  const best=list.filter(r=>num(r.sale_price_incl_vat)>0).sort((a,b)=>recipeMarginPct(b)-recipeMarginPct(a))[0];
  $('recipeOrionSummary').innerHTML=`ORION analyse <b>${list.length} recette(s)</b> : <b>${low.length}</b> marge(s) sous 65 % et <b>${impossible.length}</b> recette(s) impossible(s) à préparer avec le stock actuel.`;
  const rows=[];
  low.slice(0,4).forEach(r=>rows.push(`<div class="item"><b>⚠️ ${esc(r.name)}</b><span class="muted">Marge ${recipeMarginPct(r).toFixed(1)} % · coût ${money(recipePortionCost(r))}</span></div>`));
  impossible.slice(0,4).forEach(r=>rows.push(`<div class="item"><b>📦 ${esc(r.name)}</b><span class="muted">Un ingrédient est en rupture ou insuffisant.</span></div>`));
  if(best)rows.push(`<div class="item"><b>🏆 ${esc(best.name)}</b><span class="muted">Meilleure marge actuelle : ${recipeMarginPct(best).toFixed(1)} %.</span></div>`);
  $('recipeOrionList').innerHTML=rows.join('')||'<div class="empty">Aucune alerte particulière.</div>';
}
function resetRecipe(){
  $('recipeForm').reset();
  $('recipeId').value='';
  $('recipeModalTitle').textContent='Nouvelle recette';
  $('rPortions').value='1';$('rVat').value='12';$('rSalePrice').value='0';$('rPrepTime').value='0';
  $('rVenue').value=selectedVenue==='all'?'':selectedVenue;
  recipeIngredientDraft=[];
  $('deleteRecipeBtn').classList.add('hidden');
  $('prepareRecipeBtn').classList.add('hidden');
  renderRecipeIngredients();
}
function recipeProductOptions(selected=''){
  const venueId=$('rVenue')?.value||'';
  return groupedProductOptions(selected,venueId);
}
function addRecipeIngredient(productId='',quantity=1){
  recipeIngredientDraft.push({id:'line-'+Date.now()+'-'+Math.random().toString(16).slice(2),product_id:productId,quantity:num(quantity)||1});
  renderRecipeIngredients();
}
function renderRecipeIngredients(){
  const body=$('recipeIngredientsBody');if(!body)return;
  body.innerHTML=recipeIngredientDraft.length?recipeIngredientDraft.map((line,i)=>{
    const p=products.find(x=>x.id===line.product_id);
    return `<tr>
      <td><select class="recipe-product-select" onchange="setRecipeIngredientProduct(${i},this.value)"><option value="">Choisir un produit</option>${recipeProductOptions(line.product_id)}</select></td>
      <td><input type="number" min="0.001" step="0.001" value="${num(line.quantity)}" oninput="setRecipeIngredientQuantity(${i},this.value)"></td>
      <td>${esc(p?.unit||'—')}</td>
      <td class="money">${money(recipeIngredientCost(line))}</td>
      <td><button class="btn danger mini" type="button" onclick="removeRecipeIngredient(${i})">✕</button></td>
    </tr>`;
  }).join(''):'<tr><td colspan="5" class="empty">Aucun ingrédient ajouté.</td></tr>';
  updateRecipeCalculations();
}
window.setRecipeIngredientProduct=(i,value)=>{if(recipeIngredientDraft[i])recipeIngredientDraft[i].product_id=value;renderRecipeIngredients()};
window.setRecipeIngredientQuantity=(i,value)=>{if(recipeIngredientDraft[i])recipeIngredientDraft[i].quantity=Math.max(num(value),0);updateRecipeCalculations();const row=$('recipeIngredientsBody')?.children[i];if(row)row.children[3].textContent=money(recipeIngredientCost(recipeIngredientDraft[i]))};
window.removeRecipeIngredient=i=>{recipeIngredientDraft.splice(i,1);renderRecipeIngredients()};
function currentRecipeDraft(){
  return {
    portions:Math.max(num($('rPortions')?.value),1),
    sale_price_incl_vat:num($('rSalePrice')?.value),
    sale_vat:num($('rVat')?.value||12),
    ingredients:recipeIngredientDraft
  };
}
function updateRecipeCalculations(){
  if(!$('recipeCalcTotalCost'))return;
  const r=currentRecipeDraft(),total=recipeTotalCost(r),portion=recipePortionCost(r),saleEx=recipeSaleEx(r),margin=saleEx-portion,pct=saleEx>0?margin/saleEx*100:0;
  $('recipeCalcTotalCost').textContent=money(total);
  $('recipeCalcPortionCost').textContent=money(portion);
  $('recipeCalcSaleEx').textContent=money(saleEx);
  $('recipeCalcMarginEuro').textContent=money(margin);
  $('recipeCalcMarginPct').textContent=pct.toFixed(1)+' %';
}
window.editRecipe=id=>{
  const r=recipes.find(x=>x.id===id);if(!r)return;
  resetRecipe();
  $('recipeId').value=r.id;$('recipeModalTitle').textContent='Modifier la recette';
  $('rName').value=r.name||'';$('rVenue').value=r.venue_id||'';$('rCategory').value=r.category||'Autre';
  $('rPortions').value=num(r.portions)||1;$('rSalePrice').value=num(r.sale_price_incl_vat);$('rVat').value=String(num(r.sale_vat)||12);
  $('rPrepTime').value=num(r.prep_time_minutes);$('rImage').value=r.image_url||'';$('rNotes').value=r.notes||'';
  recipeIngredientDraft=(r.ingredients||[]).map(x=>({...x,id:x.id||'line-'+Math.random().toString(16).slice(2)}));
  $('deleteRecipeBtn').classList.remove('hidden');$('prepareRecipeBtn').classList.remove('hidden');
  renderRecipeIngredients();openModal('recipeModal');
};
async function prepareRecipe(id,portions=null){
  const r=recipes.find(x=>x.id===id);if(!r)return;
  const count=portions===null?num(prompt(`Combien de portions de « ${r.name} » avez-vous préparées ?`,'1')):num(portions);
  if(!(count>0))return;
  const multiplier=count/Math.max(num(r.portions),1);
  const shortages=(r.ingredients||[]).map(line=>{
    const p=products.find(x=>x.id===line.product_id),needed=num(line.quantity)*multiplier;
    return {p,needed,missing:p?Math.max(needed-num(p.stock),0):needed};
  }).filter(x=>x.missing>0);
  if(shortages.length){
    alert('Préparation impossible :\n\n'+shortages.map(x=>`• ${x.p?.name||'Produit absent'} : manque ${x.missing.toFixed(3)} ${x.p?.unit||''}`).join('\n'));
    return;
  }
  if(!confirm(`Enregistrer ${count} portion(s) de « ${r.name} » ?\n\nLes ingrédients seront retirés du stock.`))return;
  try{
    for(const line of (r.ingredients||[])){
      const p=products.find(x=>x.id===line.product_id),qty=num(line.quantity)*multiplier;
      if(!p||qty<=0)continue;
      const {error}=await sb.rpc('record_stock_movement',{p_product_id:p.id,p_quantity:-qty,p_movement_type:'sale',p_note:`Recette : ${r.name} · ${count} portion(s)`});
      if(error)throw error;
    }
    await audit('Préparation de recette','recipe',r.id,{name:r.name,portions:count,ingredients:(r.ingredients||[]).length});
    await refresh();toast(`${count} portion(s) préparée(s) · stock mis à jour`);
  }catch(e){toast('Préparation impossible : '+(e.message||e))}
}
window.prepareRecipe=prepareRecipe;

async function refresh(){await Promise.all([loadSuppliers(),loadProducts(),loadMovements(),loadPriceHistoryRows(),loadOrders(),loadActivity()]);renderAll();fillOrionVenues()}
$('saveConfig').onclick=()=>{const u=$('setupUrl').value.trim().replace(/\/$/,''),k=$('setupKey').value.trim();if(!u.includes('.supabase.co')||k.length<20){msg('setupMsg','Vérifiez l’URL et la clé publique.','error');return}localStorage.setItem(LS_URL,u);localStorage.setItem(LS_KEY,k);location.reload()};$('changeConfigBtn').onclick=()=>{localStorage.removeItem(LS_URL);localStorage.removeItem(LS_KEY);location.reload()};$('resetConfig').onclick=$('changeConfigBtn').onclick;
$('loginBtn').onclick=async()=>{msg('authMsg','');const {error}=await sb.auth.signInWithPassword({email:$('authEmail').value.trim(),password:$('authPassword').value});if(error){msg('authMsg',error.message,'error');return}location.reload()};$('signupBtn').onclick=async()=>{msg('authMsg','');const email=$('authEmail').value.trim(),password=$('authPassword').value,name=$('authName').value.trim();const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name}}});if(error){msg('authMsg',error.message,'error');return}if(!data.session){msg('authMsg','Compte créé. Confirmez votre adresse e-mail, puis connectez-vous.','success')}else location.reload()};$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('createOrgBtn').onclick=async()=>{msg('onboardMsg','');const {data,error}=await sb.rpc('bootstrap_organization',{organization_name:$('orgName').value.trim(),user_full_name:$('ownerName').value.trim()});if(error){msg('onboardMsg',error.message,'error');return}orgId=data;const venueDrafts=[{name:$('venueOne').value.trim(),primary:$('venueOneColor')?.value||'#64142a',accent:$('venueOneAccent')?.value||'#c59a43'},{name:$('venueTwo').value.trim(),primary:$('venueTwoColor')?.value||'#173f2b',accent:$('venueTwoAccent')?.value||'#c59a43'}].filter(x=>x.name);if(venueDrafts.length){localStorage.setItem(LS_PENDING_THEMES,JSON.stringify(venueDrafts));const rows=venueDrafts.map(x=>({organization_id:orgId,name:x.name}));const {error:e}=await sb.from('venues').insert(rows);if(e){msg('onboardMsg',e.message,'error');return}}location.reload()};
$('venueSelect').onchange=()=>{selectedVenue=$('venueSelect').value;applyVenueTheme();renderDashboard();renderProducts();renderStockIntelligence();renderRecipes();renderMenus();renderPos()};$('manageStockCategoriesBtn').onclick=()=>{renderStockCategoryManager();openModal('stockCategoriesModal')};
$('createStockCategoryBtn').onclick=()=>{if(createStockCategory($('newStockCategoryName').value,$('newStockCategoryIcon').value))$('newStockCategoryName').value=''};
$('newStockCategoryName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('createStockCategoryBtn').click()}});
$('quickAddCategoryBtn').onclick=()=>{const name=normalizeCategoryName(prompt('Nom de la nouvelle catégorie :',''));if(name&&createStockCategory(name,inferCategoryIcon(name)))$('pCategory').value=name};$('pCategory').addEventListener('input',renderStockSubcategoryDatalist);
$('addMenuBtn').onclick=()=>{fillMenuVenueOptions();resetMenu();openModal('menuModal')};
$('menuSearch').oninput=renderMenus;
$('addMenuRecipeBtn').onclick=()=>addMenuRecipe();
$('menuVenue').onchange=renderMenuRecipes;
['menuSalePrice','menuVat'].forEach(id=>$(id).addEventListener('input',updateMenuCalculations));
$('menuForm').onsubmit=async e=>{
 e.preventDefault();const name=$('menuName').value.trim();
 if(!name){toast('Indiquez le nom du menu');return}
 if(!menuRecipeDraft.length||menuRecipeDraft.some(x=>!x.recipe_id||num(x.quantity)<=0)){toast('Ajoutez et complétez au moins une recette');return}
 const id=$('menuId').value||'menu-'+Date.now();
 const row={id,name,venue_id:$('menuVenue').value||null,sale_price_incl_vat:num($('menuSalePrice').value),sale_vat:num($('menuVat').value||12),notes:$('menuNotes').value.trim()||null,items:menuRecipeDraft.map(x=>({...x,quantity:num(x.quantity)})),updated_at:new Date().toISOString()};
 const pos=menus.findIndex(x=>x.id===id);if(pos>=0)menus[pos]=row;else menus.push({...row,created_at:new Date().toISOString()});
 saveMenus();await audit(pos>=0?'Menu modifié':'Menu créé','menu',id,{name,cost:menuCost(row),margin:menuMarginPct(row)});closeModal('menuModal');toast(pos>=0?'Menu mis à jour':'Menu créé');
};
$('deleteMenuBtn').onclick=async()=>{const id=$('menuId').value,m=menus.find(x=>x.id===id);if(!m)return;if(!confirm(`Supprimer le menu « ${m.name} » ?`))return;menus=menus.filter(x=>x.id!==id);saveMenus();await audit('Menu supprimé','menu',id,{name:m.name});closeModal('menuModal');toast('Menu supprimé')};
$('posSearch').oninput=renderPos;$('posTypeFilter').onchange=renderPos;$('posVenue').onchange=renderPos;
$('clearPosCartBtn').onclick=()=>{if(posCart.length&&!confirm('Vider le ticket en cours ?'))return;posCart=[];renderPosCart()};
$('validateSaleBtn').onclick=validatePosSale;$('exportSalesBtn').onclick=exportSalesCsv;
$('addRecipeBtn').onclick=()=>{fillRecipeVenueOptions();resetRecipe();openModal('recipeModal')};
$('recipeSearch').oninput=renderRecipes;
$('recipeCategoryFilter').onchange=renderRecipes;
$('refreshRecipeAnalysisBtn').onclick=()=>{renderRecipes();toast('Analyse des recettes actualisée')};
$('addRecipeIngredientBtn').onclick=()=>addRecipeIngredient();
$('rVenue').onchange=renderRecipeIngredients;
['rPortions','rSalePrice','rVat'].forEach(id=>$(id).addEventListener('input',updateRecipeCalculations));
$('recipeForm').onsubmit=async e=>{
  e.preventDefault();
  const name=$('rName').value.trim();
  if(!name){toast('Indiquez le nom de la recette');return}
  if(!recipeIngredientDraft.length){toast('Ajoutez au moins un ingrédient');return}
  if(recipeIngredientDraft.some(x=>!x.product_id||num(x.quantity)<=0)){toast('Complétez tous les ingrédients');return}
  const id=$('recipeId').value||('recipe-'+Date.now());
  const row={id,name,venue_id:$('rVenue').value||null,category:$('rCategory').value||'Autre',portions:Math.max(num($('rPortions').value),1),sale_price_incl_vat:num($('rSalePrice').value),sale_vat:num($('rVat').value||12),prep_time_minutes:num($('rPrepTime').value),image_url:$('rImage').value.trim()||null,notes:$('rNotes').value.trim()||null,ingredients:recipeIngredientDraft.map(x=>({id:x.id,product_id:x.product_id,quantity:num(x.quantity)})),updated_at:new Date().toISOString()};
  const pos=recipes.findIndex(x=>x.id===id);
  if(pos>=0)recipes[pos]=row;else recipes.push({...row,created_at:new Date().toISOString()});
  saveRecipes();await audit(pos>=0?'Recette modifiée':'Recette créée','recipe',id,{name,ingredients:row.ingredients.length,cost:recipeTotalCost(row),margin:recipeMarginPct(row)});
  closeModal('recipeModal');toast(pos>=0?'Recette mise à jour':'Recette créée');
};
$('deleteRecipeBtn').onclick=async()=>{
  const id=$('recipeId').value,r=recipes.find(x=>x.id===id);if(!r)return;
  if(!confirm(`Supprimer définitivement la recette « ${r.name} » ?`))return;
  recipes=recipes.filter(x=>x.id!==id);saveRecipes();await audit('Recette supprimée','recipe',id,{name:r.name});closeModal('recipeModal');toast('Recette supprimée');
};
$('prepareRecipeBtn').onclick=()=>prepareRecipe($('recipeId').value);
$('openQuickInventoryBtn').onclick=openQuickInventory;$('openAutoOrderBtn').onclick=openAutoOrder;$('openStockTrashBtn').onclick=openStockTrash;$('archiveAllProductsBtn').onclick=archiveAllProducts;$('autoOrderVenue').onchange=()=>{autoOrderDraft={};renderAutoOrder()};$('autoOrderSupplier').onchange=()=>{autoOrderDraft={};renderAutoOrder()};$('autoOrderSearch').oninput=renderAutoOrder;$('selectAllAutoOrder').onchange=e=>{autoOrderEligibleProducts().forEach(p=>{autoOrderDraft[p.id]=autoOrderDraft[p.id]||{quantity:autoOrderSuggestedQty(p)};autoOrderDraft[p.id].selected=e.target.checked});renderAutoOrder()};$('addAutoOrderToDraftBtn').onclick=addAutoOrderToDraft;$('quickInventorySearch').oninput=renderQuickInventory;$('inventoryClearValuesBtn').onclick=()=>{quickInventoryDraft={};renderQuickInventory()};$('saveQuickInventoryBtn').onclick=saveQuickInventory;$('openStockRemovalBtn').onclick=openStockRemovalPicker;$('stockRemovalProductSelect').onchange=updateStockRemovalPickerInfo;$('continueStockRemovalBtn').onclick=()=>{const id=$('stockRemovalProductSelect').value;if(!id){toast('Choisissez un produit');return}closeModal('stockRemovalPickerModal');quickMovement(id,'removal')};$('orionPrepareOrderBtn').onclick=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('view-orders').classList.add('active');document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view==='orders'));$('pageTitle').textContent='Commandes fournisseurs';if(selectedVenue!=='all')$('quickOrderVenue').value=selectedVenue;loadQuickOrderDraft();$('quickOrderFilter').value='low';renderQuickOrderCatalog();setTimeout(()=>$('quickOrderSearch').focus(),100)};$('quickOrderVenue').onchange=()=>{loadQuickOrderDraft();orionOrderSuggestions=[];renderQuickOrderCatalog();renderOrionOrderSuggestions()};$('quickOrderSupplier').onchange=()=>{loadQuickOrderDraft();orionOrderSuggestions=[];renderQuickOrderCatalog();renderOrionOrderSuggestions()};$('quickOrderSearch').oninput=renderQuickOrderCatalog;$('quickOrderFilter').onchange=renderQuickOrderCatalog;$('createQuickOrderBtn').onclick=createOrderFromQuickDraft;$('clearQuickOrderBtn').onclick=()=>{if(!confirm('Vider toutes les quantités de ce brouillon ?'))return;quickOrder={quantities:{},notes:{}};saveQuickOrderDraft();renderQuickOrderCatalog()};$('orionAnalyzeOrderBtn').onclick=analyzeOrionOrder;$('orionApplyOrderBtn').onclick=applyOrionOrderSuggestions;$('orionClearSuggestionBtn').onclick=clearOrionOrderSuggestions;$('stockIntelAnalyzeBtn').onclick=()=>{renderStockIntelligence();toast('Analyse ORION Stock actualisée')};$('productSearch').oninput=renderProducts;$('productFilter').onchange=renderProducts;$('productCategoryFilter').onchange=()=>{selectedStockCategory=$('productCategoryFilter').value==='all'?'all':'category:'+$('productCategoryFilter').value;renderProducts()};$('productSupplierFilter').onchange=renderProducts;$('productLocationFilter').onchange=renderProducts;$('exportCatalogBtn').onclick=exportCatalogCsv;$('selectAllProducts').onchange=e=>{const list=catalogFilteredProducts();list.forEach(p=>e.target.checked?selectedProductIds.add(p.id):selectedProductIds.delete(p.id));renderProducts()};$('clearProductSelectionBtn').onclick=clearProductSelection;$('archiveSelectedProductsBtn').onclick=()=>archiveProductsByIds([...selectedProductIds]);$('restoreSelectedProductsBtn').onclick=()=>restoreProductsByIds([...selectedProductIds]);$('deleteSelectedProductsForeverBtn').onclick=()=>deleteArchivedProductsForever([...selectedProductIds]);$('supplierSearch').oninput=renderSuppliers;$('orderSearch').oninput=renderOrders;$('orderFilter').onchange=renderOrders;$('addOrderBtn').onclick=()=>{resetOrder();openModal('orderModal')};$('addOrderLineBtn').onclick=()=>addOrderLine();$('addProductBtn').onclick=()=>{resetProduct();openModal('productModal')};$('addSupplierBtn').onclick=()=>{resetSupplier();openModal('supplierModal')};['pPackage','pUnits','pSale','pSaleVat','pTargetMargin','pStock'].forEach(id=>$(id).addEventListener('input',updateProductCalculations));$('pImage').addEventListener('input',renderImagePreview);$('scanBarcodeBtn').onclick=startBarcodeScan;document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const v=b.dataset.view;document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('view-'+v).classList.add('active');document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('pageTitle').textContent={dashboard:'ORION Copilote',venues:'Établissements',products:'Produits & stocks',suppliers:'Fournisseurs',orders:'Commandes fournisseurs',reception:'Réception intelligente',recipes:'Recettes intelligentes',menus:'Menus',pos:'Caisse intelligente',finance:'ORION Finance',orion:'ORION Import',actions:'Centre d’actions ORION',activity:'Sécurité & activité',settings:'Paramètres'}[v];if(v==='venues')renderVenueDirectory();if(v==='orion')renderOrionImportHistory();if(v==='products'){renderStockCategoryTabs();renderProducts()}if(v==='recipes'){fillRecipeVenueOptions();renderRecipes()}if(v==='menus'){fillMenuVenueOptions();renderMenus()}if(v==='pos'){fillMenuVenueOptions();renderPos()}if(v==='actions')renderActionCenter();if(v==='activity')renderActivityCenter()});
$('movementForm').onsubmit=async e=>{
 e.preventDefault();
 const productId=$('mProductId').value,p=products.find(x=>x.id===productId);if(!p)return;
 const type=$('mType').value,entered=Math.abs(num($('mQuantity').value));
 if(!(entered>0)){toast('Indiquez une quantité supérieure à zéro');return}
 const isRemoval=['removal','waste','sale'].includes(type);
 if(isRemoval&&entered>num(p.stock)){toast(`Retrait impossible : le stock disponible est de ${num(p.stock)} ${p.unit||''}`);return}
 const reason=$('mRemovalReason')?.value||'';
 if(type==='removal'&&!reason){toast('Choisissez la raison du retrait');return}
 let quantity=entered;
 if(isRemoval)quantity=-entered;
 if(type==='inventory')quantity=entered-num(p.stock);
 const note=[reason,$('mNote').value.trim()].filter(Boolean).join(' · ')||null;
 if(type==='removal'&&!confirm(`Retirer ${entered} ${p.unit||''} de « ${p.name} » ?\n\nStock actuel : ${num(p.stock)}\nNouveau stock : ${num(p.stock)-entered}\nRaison : ${reason}`))return;
 const {data,error}=await sb.rpc('record_stock_movement',{p_product_id:productId,p_quantity:quantity,p_movement_type:type,p_note:note});
 if(error){toast(error.message);return}
 await audit(type==='removal'?'Retrait manuel du stock':'Mouvement de stock','product',productId,{name:p.name,type,quantity,reason:reason||null,previous_stock:num(p.stock),new_stock:data});
 closeModal('movementModal');await refresh();
 toast(type==='removal'?`Produit retiré · nouveau stock : ${data}`:`Stock mis à jour : ${data}`);
};
$('productForm').onsubmit=async e=>{e.preventDefault();const id=$('productId').value,old=id?products.find(x=>x.id===id):null,payload={organization_id:orgId,venue_id:selectedVenue==='all'?null:selectedVenue,supplier_id:$('pSupplier').value||null,name:$('pName').value.trim(),image_url:$('pImage').value.trim()||null,sku:$('pSku').value.trim()||null,barcode:$('pBarcode').value.trim()||null,category:normalizeCategoryName($('pCategory').value)||null,subcategory:$('pSubcategory').value.trim()||null,unit:$('pUnit').value.trim()||'pièce',stock:num($('pStock').value),minimum_stock:num($('pMin').value),package_price_excl_vat:num($('pPackage').value),units_per_package:Math.max(num($('pUnits').value),1),purchase_vat:num($('pPurchaseVat').value),sale_price_incl_vat:num($('pSale').value),sale_vat:num($('pSaleVat').value),target_margin_percent:$('pTargetMargin').value===''?null:num($('pTargetMargin').value),location:$('pLocation').value.trim()||null,favorite:$('pFavorite').value==='true',notes:$('pNotes').value.trim()||null};let res;if(id)res=await sb.from('products').update(payload).eq('id',id).select().single();else res=await sb.from('products').insert(payload).select().single();if(res.error){toast(res.error.message);return}const priceChanged=!old||num(old.package_price_excl_vat)!==payload.package_price_excl_vat||num(old.units_per_package)!==payload.units_per_package;if(priceChanged&&payload.package_price_excl_vat>0){await sb.from('product_prices').insert({organization_id:orgId,product_id:res.data.id,supplier_id:payload.supplier_id,package_price_excl_vat:payload.package_price_excl_vat,units_per_package:payload.units_per_package,purchase_vat:payload.purchase_vat,source:'manual',created_by:user.id})}await audit(id?'Produit modifié':'Produit créé','product',res.data.id,{name:res.data.name,price_changed:priceChanged});closeModal('productModal');await refresh();toast('Produit enregistré')};
$('deleteProductBtn').onclick=async()=>{const id=$('productId').value;if(!id||!confirm('Archiver ce produit ? Il restera disponible dans le filtre Archivés.'))return;const p=products.find(x=>x.id===id);const {error}=await sb.from('products').update({active:false}).eq('id',id);if(error){toast(error.message);return}await audit('Produit archivé','product',id,{name:p?.name});closeModal('productModal');await refresh();toast('Produit archivé')};
$('duplicateProductBtn').onclick=()=>{const original=$('pName').value;const sku=$('pSku').value;$('productId').value='';$('pName').value=original+' — copie';$('pSku').value=sku?sku+'-COPIE':'';$('pBarcode').value='';$('pStock').value='0';$('deleteProductBtn').classList.add('hidden');$('duplicateProductBtn').classList.add('hidden');$('productModalTitle').textContent='Dupliquer le produit';updateProductCalculations();toast('Copie prête : vérifiez les informations puis enregistrez')};
window.restoreProduct=async id=>{const p=products.find(x=>x.id===id);const {error}=await sb.from('products').update({active:true}).eq('id',id);if(error){toast(error.message);return}await audit('Produit restauré','product',id,{name:p?.name});await refresh();toast('Produit restauré')};
async function startBarcodeScan(){if(!('BarcodeDetector'in window)||!navigator.mediaDevices?.getUserMedia){toast('Scanner non disponible sur cet appareil. Vous pouvez saisir le code manuellement.');return}let stream;try{const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});const video=document.createElement('video');video.srcObject=stream;video.playsInline=true;video.style.cssText='width:100%;max-height:55vh;border-radius:14px;background:#000';const box=document.createElement('div');box.className='modal-bg open';box.innerHTML='<div class="modal" style="max-width:560px"><div class="modal-head"><h3>Scanner le code-barres</h3><button class="btn soft">✕</button></div><div id="scanVideoHost"></div><p class="tiny">Placez le code-barres au centre de l’image.</p></div>';document.body.appendChild(box);box.querySelector('#scanVideoHost').appendChild(video);const stop=()=>{stream?.getTracks().forEach(t=>t.stop());box.remove()};box.querySelector('button').onclick=stop;await video.play();const scan=async()=>{if(!document.body.contains(box))return;const codes=await detector.detect(video);if(codes.length){$('pBarcode').value=codes[0].rawValue;stop();toast('Code-barres détecté');return}requestAnimationFrame(scan)};scan()}catch(e){stream?.getTracks().forEach(t=>t.stop());toast('Impossible d’ouvrir la caméra. Vérifiez les autorisations.')}};


$('openNotificationSettingsBtn').onclick=()=>{renderScheduleRows();openModal('notificationSettingsModal')};
$('addScheduleBtn').onclick=()=>{const rows=collectScheduleRows();rows.push({id:String(Date.now()),venue_id:venues[0]?.id||'',supplier_id:suppliers[0]?.id||'',weekday:new Date().getDay(),deadline:'20:00',reminder_minutes:120,active:true});saveOrderSchedules(rows);renderScheduleRows()};
$('saveSchedulesBtn').onclick=()=>{saveOrderSchedules(collectScheduleRows());closeModal('notificationSettingsModal');toast('Rappels de commande enregistrés')};
$('enableBrowserNotificationsBtn').onclick=async()=>{if(!('Notification'in window)){toast('Notifications non disponibles sur cet appareil');return}const p=await Notification.requestPermission();toast(p==='granted'?'Notifications activées':'Autorisation non accordée')};

$('openEmailConfigBtn').onclick=()=>openModal('emailConfigModal');
function orderEmailContent(o){
  const venue=venues.find(v=>v.id===o.venue_id),supplier=suppliers.find(s=>s.id===o.supplier_id);
  const items=(o.purchase_order_items?.length?o.purchase_order_items:draftLines)||[];
  const lines=items.map(l=>`- ${l.description} : ${num(l.quantity_ordered)} ${l.unit||''}`.trim()).join('\n');
  const total=items.reduce((sum,l)=>sum+num(l.quantity_ordered)*num(l.unit_price_excl_vat),0);
  const delivery=o.expected_at?new Date(o.expected_at).toLocaleDateString('fr-BE'):'à confirmer';
  return {to:supplier?.email||'',subject:`Commande ${o.order_number||''} — ${venue?.name||'GESTIONA'}`,body:`Bonjour,\n\nVeuillez trouver notre commande ${o.order_number||''}.\n\nÉtablissement : ${venue?.name||'—'}\nLivraison souhaitée : ${delivery}\n\n${lines||'Aucune ligne de commande.'}\n\nTotal HTVA estimé : ${money(total)}\n\n${o.notes?`Remarque : ${o.notes}\n\n`:''}Merci de confirmer la bonne réception ainsi que la date de livraison prévue.\n\nBien cordialement,\n${venue?.name||profile?.full_name||'GESTIONA'}`};
}
$('emailOrderBtn').onclick=()=>{const o=orders.find(x=>x.id===$('orderId').value);if(!o)return;const content=orderEmailContent(o);$('sendTo').value=content.to;$('sendSubject').value=content.subject;$('sendBody').value=content.body;openModal('sendEmailModal')};
function currentMailFields(){return{to:$('sendTo').value.trim(),subject:$('sendSubject').value.trim(),body:$('sendBody').value}}
$('sendEmailForm').onsubmit=e=>{e.preventDefault();const m=currentMailFields();window.location.href=`mailto:${encodeURIComponent(m.to)}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;toast('Votre messagerie va s’ouvrir')};
$('openGmailBtn').onclick=()=>{const m=currentMailFields();const url=`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.to)}&su=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;window.open(url,'_blank','noopener');toast('Gmail a été ouvert')};
$('orderForm').onsubmit=async e=>{e.preventDefault();if(!draftLines.length||draftLines.some(l=>!l.description.trim()||l.quantity_ordered<=0)){toast('Vérifiez les lignes de commande');return}const id=$('orderId').value;let orderNumber=$('oNumber').value;if(!id&&!orderNumber){const {data,error}=await sb.rpc('generate_purchase_order_number',{p_organization_id:orgId});if(error){toast(error.message);return}orderNumber=data}const payload={organization_id:orgId,venue_id:$('oVenue').value||null,supplier_id:$('oSupplier').value||null,order_number:orderNumber,status:$('oStatus').value,expected_at:$('oExpected').value||null,internal_reference:$('oReference').value.trim()||null,delivery_address:$('oAddress').value.trim()||null,notes:$('oNotes').value.trim()||null,ordered_at:$('oStatus').value==='draft'?null:new Date().toISOString(),created_by:user.id};let res=id?await sb.from('purchase_orders').update(payload).eq('id',id).select().single():await sb.from('purchase_orders').insert(payload).select().single();if(res.error){toast(res.error.message);return}const oid=res.data.id;if(id){const {error}=await sb.from('purchase_order_items').delete().eq('purchase_order_id',oid);if(error){toast(error.message);return}}const rows=draftLines.map(l=>({organization_id:orgId,purchase_order_id:oid,product_id:l.product_id||null,description:l.description.trim(),quantity_ordered:l.quantity_ordered,quantity_received:0,unit_price_excl_vat:l.unit_price_excl_vat,vat_rate:l.vat_rate}));const ins=await sb.from('purchase_order_items').insert(rows);if(ins.error){toast(ins.error.message);return}await audit(id?'Commande modifiée':'Commande créée','purchase_order',oid,{order_number:orderNumber,total:draftLines.reduce((a,l)=>a+l.quantity_ordered*l.unit_price_excl_vat,0)});closeModal('orderModal');await refresh();toast('Commande enregistrée')};
$('deleteOrderBtn').onclick=async()=>{const id=$('orderId').value;if(!id||!confirm('Passer cette commande au statut Annulée ?'))return;const {error}=await sb.from('purchase_orders').update({status:'cancelled'}).eq('id',id);if(error){toast(error.message);return}await audit('Commande annulée','purchase_order',id,{});closeModal('orderModal');await refresh();toast('Commande annulée')};
$('printOrderBtn').onclick=()=>{const o=orders.find(x=>x.id===$('orderId').value);if(!o)return;const supplier=suppliers.find(s=>s.id===o.supplier_id),venue=venues.find(v=>v.id===o.venue_id),lines=draftLines.map(l=>`<tr><td>${esc(l.description)}</td><td>${l.quantity_ordered}</td><td>${money(l.unit_price_excl_vat)}</td><td>${money(l.quantity_ordered*l.unit_price_excl_vat)}</td></tr>`).join(''),total=draftLines.reduce((a,l)=>a+l.quantity_ordered*l.unit_price_excl_vat,0);const w=window.open('','_blank');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.order_number)}</title><style>body{font-family:Arial;padding:40px;color:#222}h1{color:#64142a}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-size:20px;margin-top:20px}@media print{button{display:none}}.order-builder-card{overflow:hidden}.quick-summary{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px}.quick-summary .item{padding:8px 11px;font-size:12px}.quick-catalog{display:grid;gap:14px;max-height:58vh;overflow:auto;padding-right:3px}.quick-category{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}.quick-category h4{margin:0;padding:11px 13px;background:#fbf7f2;color:var(--wine);position:sticky;top:0;z-index:1}.quick-product{display:grid;grid-template-columns:minmax(220px,1fr) 120px 145px minmax(150px,220px);gap:10px;align-items:center;padding:10px 13px;border-top:1px solid var(--line)}.quick-product-name b{display:block}.quick-product-name button{border:0;background:transparent;padding:0;font-size:18px}.qty-control{display:grid;grid-template-columns:36px 1fr 36px;align-items:center;border:1px solid var(--line);border-radius:11px;overflow:hidden}.qty-control button{height:38px;border:0;background:#f4eae2;color:var(--wine);font-weight:900}.qty-control input{width:100%;height:38px;border:0;text-align:center;font-weight:900}.quick-meta{font-size:12px;color:var(--muted)}.quick-note{width:100%;padding:8px;border:1px solid var(--line);border-radius:9px}.quick-order-footer{display:flex;gap:16px;align-items:center;justify-content:flex-end;position:sticky;bottom:0;margin:15px -17px -17px;padding:13px 17px;background:rgba(255,253,249,.97);border-top:1px solid var(--line)}.quick-order-footer div{min-width:120px}.quick-order-footer strong{display:block;color:var(--wine);font-size:18px}@media(max-width:850px){.quick-product{grid-template-columns:1fr 130px}.quick-meta,.quick-note{grid-column:1/-1}.quick-order-footer{flex-wrap:wrap;justify-content:stretch}.quick-order-footer button{flex:1}}
.product-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.product-kpi{border:1px solid var(--line);background:#fff;border-radius:13px;padding:11px}.product-kpi span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:800}.product-kpi b{display:block;color:var(--wine);font-size:20px;margin-top:4px}.completion{display:inline-flex;align-items:center;gap:6px}.completion-bar{width:54px;height:7px;background:#eee2d8;border-radius:999px;overflow:hidden}.completion-bar i{display:block;height:100%;background:var(--gold)}.star-btn{border:0;background:transparent;font-size:18px;padding:2px 5px}.catalog-filters{display:flex;gap:8px;flex-wrap:wrap}.catalog-filters select{min-width:145px}@media(max-width:720px){.product-kpis{grid-template-columns:repeat(2,1fr)}.catalog-filters{width:100%}.catalog-filters select{flex:1;min-width:130px}}
</style></head><body><h1>GESTIONA ERP</h1><h2>Commande fournisseur ${esc(o.order_number)}</h2><p><b>Fournisseur :</b> ${esc(supplier?.name||'—')}<br><b>Établissement :</b> ${esc(venue?.name||'—')}<br><b>Livraison souhaitée :</b> ${o.expected_at?new Date(o.expected_at).toLocaleDateString('fr-BE'):'—'}</p><table><thead><tr><th>Produit</th><th>Quantité</th><th>Prix HTVA</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table><div class="total"><b>Total HTVA : ${money(total)}</b></div><p>${esc(o.notes||'')}</p><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><footer style="margin-top:50px;font-size:11px">Créé par Marine Bruynbroeck — © 2026–2027 Marine Bruynbroeck</footer></body></html>`);w.document.close()};
$('supplierForm').onsubmit=async e=>{e.preventDefault();const id=$('supplierId').value,payload={organization_id:orgId,name:$('sName').value.trim(),contact_name:$('sContact').value.trim()||null,email:$('sEmail').value.trim()||null,phone:$('sPhone').value.trim()||null,delivery_days:$('sDays').value.trim()||null,payment_terms:$('sTerms').value.trim()||null,notes:$('sNotes').value.trim()||null};let res;if(id)res=await sb.from('suppliers').update(payload).eq('id',id).select().single();else res=await sb.from('suppliers').insert(payload).select().single();if(res.error){toast(res.error.message);return}await audit(id?'Fournisseur modifié':'Fournisseur créé','supplier',res.data.id,{name:res.data.name});closeModal('supplierModal');await refresh();toast('Fournisseur enregistré')};
$('deleteSupplierBtn').onclick=async()=>{const id=$('supplierId').value;if(!id||!confirm('Supprimer ce fournisseur ?'))return;const s=suppliers.find(x=>x.id===id);const {error}=await sb.from('suppliers').delete().eq('id',id);if(error){toast(error.message);return}await audit('Fournisseur supprimé','supplier',id,{name:s?.name});closeModal('supplierModal');await refresh();toast('Fournisseur supprimé')};

let orionAnalysis=null,orionComparison=null;
let orionAppliedImports=[];
const ORION_IMPORT_HISTORY_KEY='gestiona_orion_stock_imports_v84';
function loadOrionImportHistory(){
 try{orionAppliedImports=JSON.parse(localStorage.getItem(ORION_IMPORT_HISTORY_KEY)||'[]');if(!Array.isArray(orionAppliedImports))orionAppliedImports=[]}
 catch(e){orionAppliedImports=[]}
}
function saveOrionImportHistory(){localStorage.setItem(ORION_IMPORT_HISTORY_KEY,JSON.stringify(orionAppliedImports))}
function clearOrionLoadedFile(showToast=true){
 if($('orionFile'))$('orionFile').value='';
 if($('orionResults'))$('orionResults').classList.add('hidden');
 if($('orionMessage'))$('orionMessage').innerHTML='';
 if($('orionArchiveMissing'))$('orionArchiveMissing').checked=false;
 orionAnalysis=null;orionComparison=null;
 if(showToast)toast('Fichier importé retiré de l’écran');
}
function legacyOrionImportGroups(){
 const groups=new Map();
 products.filter(p=>/^(Créé|Actualisé) par ORION Import — /i.test(p.notes||'')).forEach(p=>{
   const filename=String(p.notes||'').replace(/^(Créé|Actualisé) par ORION Import — /i,'').trim()||'Import ancien';
   const key=`legacy:${p.venue_id||''}:${filename}`;
   if(!groups.has(key))groups.set(key,{id:key,filename,venueId:p.venue_id||null,venueName:venues.find(v=>v.id===p.venue_id)?.name||'—',createdAt:null,createdIds:[],modifiedSnapshots:[],archivedIds:[],legacy:true});
   if(/^Créé par ORION Import/i.test(p.notes||''))groups.get(key).createdIds.push(p.id);
 })
 return [...groups.values()];
}
function allOrionImports(){
 const known=new Set(orionAppliedImports.map(i=>`${i.venueId||''}:${i.filename}`));
 return [...orionAppliedImports,...legacyOrionImportGroups().filter(i=>!known.has(`${i.venueId||''}:${i.filename}`))].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function renderOrionImportHistory(){
 const box=$('orionImportHistory');if(!box)return;
 const venueId=orionSelectedVenue();
 const list=allOrionImports().filter(i=>!venueId||String(i.venueId)===String(venueId));
 if(!list.length){box.innerHTML='<div class="empty">Aucun import ORION détecté pour cet établissement.</div>';return}
 box.innerHTML=`<div class="orion-import-list">${list.map(i=>{
   const venue=i.venueName||venues.find(v=>v.id===i.venueId)?.name||'—';
   const date=i.createdAt?new Date(i.createdAt).toLocaleString('fr-BE'):'Import antérieur';
   const created=(i.createdIds||[]).length,modified=(i.modifiedSnapshots||[]).length,archived=(i.archivedIds||[]).length;
   return `<div class="orion-import-item"><div><h4>${esc(i.filename)}</h4><div class="orion-import-meta"><span>${esc(venue)}</span><span>${esc(date)}</span><span>${created} créé(s)</span><span>${modified} modifié(s)</span>${archived?`<span>${archived} archivé(s)</span>`:''}${i.legacy?'<span>Import ancien</span>':''}</div>${i.legacy?'<div class="tiny" style="margin-top:7px">Pour cet ancien import, seuls les produits créés par le fichier peuvent être supprimés.</div>':''}</div><div class="actions"><button class="btn danger mini" type="button" onclick="removeOrionStockImport('${esc(i.id)}')">🗑 Supprimer du stock</button></div></div>`;
 }).join('')}</div>`;
}
async function importHasProtectedLinks(importEntry){
 const ids=(importEntry.createdIds||[]).filter(Boolean);
 if(!ids.length)return false;
 const {data:orderLinks,error}=await sb.from('purchase_order_items').select('id').in('product_id',ids).limit(1);
 if(error)throw error;
 return !!orderLinks?.length;
}
async function removeOrionStockImport(importId){
 const entry=allOrionImports().find(i=>i.id===importId);
 if(!entry){toast('Import introuvable');return}
 const summary=`${entry.filename}\n${entry.venueName||venues.find(v=>v.id===entry.venueId)?.name||''}\n\n${(entry.createdIds||[]).length} produit(s) créé(s) seront supprimés.${entry.legacy?'\nLes anciennes modifications ne peuvent pas être restaurées automatiquement.':`\n${(entry.modifiedSnapshots||[]).length} produit(s) modifié(s) seront restaurés.`}`;
 if(!confirm(`Supprimer cet import du stock ?\n\n${summary}\n\nCette action est définitive.`))return;
 try{
   if(await importHasProtectedLinks(entry)){
     toast('Suppression bloquée : certains produits sont déjà liés à une commande');
     return;
   }
   const createdIds=(entry.createdIds||[]).filter(Boolean);
   if(createdIds.length){
     const {error}=await sb.from('products').delete().in('id',createdIds);
     if(error)throw error;
   }
   if(!entry.legacy){
     for(const snap of (entry.modifiedSnapshots||[])){
       const {id,...payload}=snap;
       const {error}=await sb.from('products').update(payload).eq('id',id);
       if(error)throw error;
     }
     if((entry.archivedIds||[]).length){
       const {error}=await sb.from('products').update({active:true}).in('id',entry.archivedIds);
       if(error)throw error;
     }
   }
   orionAppliedImports=orionAppliedImports.filter(i=>i.id!==entry.id);
   saveOrionImportHistory();
   await audit('Import stock ORION supprimé','catalog_import',null,{filename:entry.filename,venue_id:entry.venueId,created_deleted:createdIds.length,modified_restored:entry.legacy?0:(entry.modifiedSnapshots||[]).length,legacy:!!entry.legacy});
   await refresh();fillOrionVenues();renderOrionImportHistory();
   toast('Import supprimé du stock');
 }catch(e){toast('Suppression impossible : '+(e.message||e))}
}
window.removeOrionStockImport=removeOrionStockImport;
function orionNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function orionSelectedVenue(){return $('orionVenue').value||null}
function fillOrionVenues(){if(!$('orionVenue'))return;$('orionVenue').innerHTML='<option value="">Choisir l’établissement</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');if(selectedVenue!=='all')$('orionVenue').value=selectedVenue}
function orionCompare(analysis,venueId){
 const incoming=analysis.products;
 const current=products.filter(p=>p.venue_id===venueId && p.sku);
 const byRef=new Map(current.map(p=>[String(p.sku).trim(),p]));
 const seen=new Set(); const rows=[]; let added=0,modified=0,unchanged=0;
 for(const p of incoming){const old=byRef.get(String(p.reference).trim());seen.add(String(p.reference).trim());if(!old){added++;rows.push({action:'add',incoming:p})}else{const changed=orionNorm(old.name)!==orionNorm(p.name)||orionNorm(old.category)!==orionNorm(p.category)||old.active===false;if(changed){modified++;rows.push({action:'modify',incoming:p,existing:old})}else{unchanged++;rows.push({action:'unchanged',incoming:p,existing:old})}}}
 const missing=current.filter(p=>!seen.has(String(p.sku).trim())).map(existing=>({action:'missing',existing}));
 return {rows,missing,summary:{added,modified,unchanged,missing:missing.length}};
}
function renderOrionComparison(){const c=orionComparison;if(!c)return;$('orionAdded').textContent=c.summary.added;$('orionModified').textContent=c.summary.modified;$('orionUnchanged').textContent=c.summary.unchanged;$('orionMissing').textContent=c.summary.missing;$('orionSummary').textContent=`${orionAnalysis.stats.uniqueProducts} produits reconnus dans ${orionAnalysis.sheets.length} feuille(s).`;
 const labels={add:['➕ Nouveau','ok'],modify:['✏️ Modifié','warn'],unchanged:['✓ Inchangé','ok'],missing:['📦 Absent','bad']};
 const all=[...c.rows,...c.missing];$('orionChangesBody').innerHTML=all.slice(0,500).map(x=>{const p=x.incoming||x.existing,l=labels[x.action];return `<tr><td><span class="badge ${l[1]}">${l[0]}</span></td><td>${esc(p.reference||p.sku||'—')}</td><td>${esc(p.name)}</td><td>${esc(p.category||'—')}</td><td>${esc((p.areas||[]).join(', ')||p.location||'—')}</td></tr>`}).join('')||'<tr><td colspan="5" class="empty">Aucun changement</td></tr>';
 $('orionResults').classList.remove('hidden')}
async function ensureSligroSupplier(){let s=suppliers.find(x=>orionNorm(x.name)==='SLIGRO');if(s)return s;const {data,error}=await sb.from('suppliers').insert({organization_id:orgId,name:'Sligro'}).select().single();if(error)throw error;suppliers.push(data);return data}
async function applyOrionImport(){
 if(!orionComparison||!orionAnalysis)return;
 const venueId=orionSelectedVenue();if(!venueId){toast('Choisissez un établissement');return}
 if(!confirm(`Appliquer ${orionComparison.summary.added} création(s) et ${orionComparison.summary.modified} modification(s) ?`))return;
 $('orionApplyBtn').disabled=true;$('orionApplyBtn').textContent='Synchronisation…';
 try{
   const supplier=await ensureSligroSupplier();
   const addRows=orionComparison.rows.filter(x=>x.action==='add').map(x=>({organization_id:orgId,venue_id:venueId,supplier_id:supplier.id,name:x.incoming.name,category:x.incoming.category||null,sku:x.incoming.reference,location:(x.incoming.areas||[]).join(', ')||null,unit:'pièce',active:true,notes:'Créé par ORION Import — '+orionAnalysis.filename}));
   let createdIds=[];
   if(addRows.length){
     const {data,error}=await sb.from('products').insert(addRows).select('id');
     if(error)throw error;createdIds=(data||[]).map(x=>x.id);
   }
   const modifiedSnapshots=orionComparison.rows.filter(x=>x.action==='modify').map(x=>({
     id:x.existing.id,supplier_id:x.existing.supplier_id||null,name:x.existing.name,category:x.existing.category||null,location:x.existing.location||null,active:x.existing.active!==false,notes:x.existing.notes||null
   }));
   for(const x of orionComparison.rows.filter(x=>x.action==='modify')){
     const {error}=await sb.from('products').update({supplier_id:supplier.id,name:x.incoming.name,category:x.incoming.category||null,location:(x.incoming.areas||[]).join(', ')||null,active:true,notes:'Actualisé par ORION Import — '+orionAnalysis.filename}).eq('id',x.existing.id);
     if(error)throw error;
   }
   let archivedIds=[];
   if($('orionArchiveMissing').checked&&orionComparison.missing.length){
     archivedIds=orionComparison.missing.map(x=>x.existing.id);
     const {error}=await sb.from('products').update({active:false}).in('id',archivedIds);
     if(error)throw error;
   }
   const venue=venues.find(v=>v.id===venueId);
   const importEntry={id:'import-'+Date.now(),filename:orionAnalysis.filename,venueId,venueName:venue?.name||'',createdAt:new Date().toISOString(),createdIds,modifiedSnapshots,archivedIds,summary:{...orionComparison.summary},legacy:false};
   orionAppliedImports.push(importEntry);saveOrionImportHistory();
   await audit('Catalogue actualisé par ORION Import','catalog_import',null,{import_id:importEntry.id,filename:orionAnalysis.filename,venue_id:venueId,summary:orionComparison.summary,created_ids:createdIds,modified_ids:modifiedSnapshots.map(x=>x.id),archived_ids:archivedIds});
   await refresh();fillOrionVenues();clearOrionLoadedFile(false);renderOrionImportHistory();
   toast('Catalogue Sligro actualisé avec succès');
 }catch(e){toast('Import impossible : '+(e.message||e))}
 finally{$('orionApplyBtn').disabled=false;$('orionApplyBtn').textContent='Valider la mise à jour'}
}
$('copilotAskBtn')?.addEventListener('click',askCopilot);$('refreshDailyBriefBtn')?.addEventListener('click',()=>{renderDailyBrief();renderVenueControlCenter();toast('Brief ORION actualisé')});$('refreshVenueControlBtn')?.addEventListener('click',()=>{renderVenueControlCenter();toast('Comparaison des établissements actualisée')});$('copilotQuestion')?.addEventListener('keydown',e=>{if(e.key==='Enter')askCopilot()});
$('financeRefreshBtn')?.addEventListener('click',async()=>{await Promise.all([loadProducts(),loadOrders(),loadPriceHistoryRows()]);renderFinance();toast('Analyse financière actualisée')});
$('orionAnalyzeBtn').onclick=async()=>{const f=$('orionFile').files[0],venueId=orionSelectedVenue();if(!venueId){toast('Choisissez l’établissement');return}if(!f){toast('Choisissez un fichier Excel');return}try{$('orionMessage').innerHTML='<div class="notice">Analyse en cours…</div>';orionAnalysis=ORIONImport.analyzeWorkbook(await f.arrayBuffer(),f.name);orionComparison=orionCompare(orionAnalysis,venueId);$('orionMessage').innerHTML=`<div class="success notice">${esc(orionAnalysis.establishment)} détecté · ${orionAnalysis.stats.uniqueProducts} produits uniques · ${orionAnalysis.warnings.length} avertissement(s)</div>`;renderOrionComparison()}catch(e){$('orionMessage').innerHTML=`<div class="error notice">${esc(e.message||e)}</div>`}};
$('orionApplyBtn').onclick=applyOrionImport;$('orionCancelBtn').onclick=()=>clearOrionLoadedFile(false);$('orionClearFileBtn').onclick=()=>{if(!$('orionFile').value&&!orionAnalysis){toast('Aucun fichier chargé');return}if(confirm('Retirer le fichier actuellement chargé ?'))clearOrionLoadedFile()};$('refreshOrionImportsBtn').onclick=renderOrionImportHistory;$('orionVenue').addEventListener('change',renderOrionImportHistory);


$('scanInvoiceBtn')?.addEventListener('click',()=>resetSupplierDocumentForm('invoice'));
$('scanDeliveryBtn')?.addEventListener('click',()=>resetSupplierDocumentForm('delivery'));
$('chooseDocumentBtn')?.addEventListener('click',()=>$('supplierDocumentFile').click());
$('supplierDocumentFile')?.addEventListener('change',e=>{handleSupplierDocumentFile(e.target.files[0]);if($('docKindSelect')?.value==='delivery'&&$('docOrder')?.value)setTimeout(analyzeDeliveryScan,100)});
$('docKindSelect')?.addEventListener('change',e=>{$('docKind').value=e.target.value;$('supplierDocumentTitle').textContent=e.target.value==='delivery'?'🚚 Scanner un bon de livraison':'📄 Scanner une facture';deliveryReceiptLines=[];renderDocumentComparison()});
$('docSupplier')?.addEventListener('change',()=>{updateDocumentOrderOptions();renderDocumentComparison()});$('docVenue')?.addEventListener('change',()=>{updateDocumentOrderOptions();renderDocumentComparison()});$('docOrder')?.addEventListener('change',()=>{deliveryReceiptLines=[];renderDocumentComparison();if($('docKindSelect')?.value==='delivery'&&$('supplierDocumentFile')?.files?.[0])setTimeout(analyzeDeliveryScan,100)});['docSubtotal','docVat','docTotal'].forEach(id=>$(id)?.addEventListener('input',renderDocumentComparison));
$('analyzeDeliveryScanBtn')?.addEventListener('click',analyzeDeliveryScan);$('compareSupplierDocumentBtn')?.addEventListener('click',()=>{compareSupplierDocument();renderDeliveryReceiptLines();toast('Comparaison actualisée')});
$('resetDeliveryLinesBtn')?.addEventListener('click',()=>buildDeliveryReceiptLines(true));
$('applyDeliveryReceiptBtn')?.addEventListener('click',applyDeliveryReceipt);
$('docSearch')?.addEventListener('input',renderSupplierDocuments);$('docTypeFilter')?.addEventListener('change',renderSupplierDocuments);$('exportDocsBtn')?.addEventListener('click',exportSupplierDocuments);
$('supplierDocumentForm')?.addEventListener('submit',e=>{e.preventDefault();const id=$('docEditId').value||('doc-'+Date.now()),supplier=suppliers.find(s=>s.id===$('docSupplier').value),order=orders.find(o=>o.id===$('docOrder').value),venue=venues.find(v=>v.id===$('docVenue').value);const old=supplierDocuments.find(d=>d.id===id);const d={id,kind:$('docKindSelect').value,venueId:$('docVenue').value||null,venueName:venue?.name||'',supplierId:$('docSupplier').value||null,supplierName:supplier?.name||'',orderId:$('docOrder').value||null,orderNumber:order?.order_number||'',number:$('docNumber').value.trim(),date:$('docDate').value,subtotal:num($('docSubtotal').value),vat:num($('docVat').value),total:num($('docTotal').value),status:$('docStatus').value,notes:$('docNotes').value.trim(),filename:supplierDocumentFileMeta?.filename||old?.filename||'',mime:supplierDocumentFileMeta?.mime||old?.mime||'',size:supplierDocumentFileMeta?.size||old?.size||0,preview:supplierDocumentFileMeta?.preview||old?.preview||null,deliveryLines:$('docKindSelect').value==='delivery'?deliveryReceiptLines.map(x=>({...x})):[],missingProducts:$('docKindSelect').value==='delivery'?deliveryMissingProducts().map(x=>({productId:x.productId,description:x.description,missing:x.missing})):[],stockApplied:old?.stockApplied||false,stockAppliedAt:old?.stockAppliedAt||null,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};supplierDocuments=supplierDocuments.filter(x=>x.id!==id);supplierDocuments.push(d);saveSupplierDocuments();closeModal('supplierDocumentModal');toast('Document fournisseur enregistré')});
$('deleteSupplierDocumentBtn')?.addEventListener('click',()=>{const id=$('docEditId').value;if(!id||!confirm('Supprimer ce document ?'))return;supplierDocuments=supplierDocuments.filter(d=>d.id!==id);saveSupplierDocuments();closeModal('supplierDocumentModal');toast('Document supprimé')});
const dz=$('docDropZone');if(dz){['dragenter','dragover'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>handleSupplierDocumentFile(e.dataTransfer.files[0]))}

$('mType')?.addEventListener('change',updateMovementFormUi);
window.setDeliveryReceived=setDeliveryReceived;window.setDeliveryPrice=setDeliveryPrice;
window.addEventListener('load',()=>{initV19Ui();boot()});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

/* GESTIONA v10.0 — accès direct Réception */
function renderReceptionIssuesSummary(){
 const box=document.getElementById('receptionIssuesSummary');if(!box)return;
 const docs=(supplierDocuments||[]).filter(d=>d.kind==='delivery'&&d.status==='issue').sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
 const missing=docs.flatMap(d=>(d.missingProducts||[]).map(x=>({...x,document:d.number||d.filename||'Bon',supplier:d.supplierName||'Fournisseur'})));
 box.innerHTML=missing.length?missing.slice(0,12).map(x=>`<div class="item"><div><b>${esc(x.description||'Produit')}</b><small>${esc(x.supplier)} · ${esc(x.document)}</small></div><span class="badge low">Manque ${formatQty(x.missing||0)}</span></div>`).join(''):'<div class="empty">Aucun manquement de livraison enregistré.</div>';
}
document.getElementById('openReceptionFromStockBtn')?.addEventListener('click',()=>{document.querySelector('[data-view="reception"]')?.click();setTimeout(()=>document.getElementById('scanDeliveryBtn')?.focus(),120)});
document.querySelectorAll('[data-view="reception"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{renderReceptionIssuesSummary();renderBackorders()},0)));
const _saveSupplierDocumentsV10=saveSupplierDocuments;saveSupplierDocuments=function(){_saveSupplierDocumentsV10();renderReceptionIssuesSummary();renderBackorders()};
setTimeout(()=>{renderReceptionIssuesSummary();renderBackorders()},0);

/* ===== GESTIONA v11.0 — ORION Smart Reception & catalogue fournisseur ===== */
function supplierNameById(id){return suppliers.find(s=>s.id===id)?.name||'Fournisseur inconnu'}
function productNameById(id){return products.find(p=>p.id===id)?.name||'Produit inconnu'}
function normalizedPriceRow(r){const units=Math.max(num(r.units_per_package),1);return num(r.unit_price_excl_vat)||num(r.package_price_excl_vat)/units}
function productSupplierPriceMap(){
 const map=new Map();
 priceHistoryRows.forEach(r=>{if(!r.product_id||!r.supplier_id)return;const price=normalizedPriceRow(r);if(price<=0)return;const key=r.product_id+'::'+r.supplier_id;if(!map.has(key))map.set(key,[]);map.get(key).push({...r,price})});
 map.forEach(rows=>rows.sort((a,b)=>new Date(b.effective_at||b.created_at)-new Date(a.effective_at||a.created_at)));
 return map;
}
function supplierCatalogRows(){
 const priceMap=productSupplierPriceMap(),byProduct=new Map();
 priceMap.forEach((rows,key)=>{const [productId,supplierId]=key.split('::');if(!byProduct.has(productId))byProduct.set(productId,[]);const prices=rows.map(x=>x.price);byProduct.get(productId).push({supplierId,supplierName:supplierNameById(supplierId),latest:prices[0],previous:prices[1]||prices[0],average:prices.reduce((a,b)=>a+b,0)/prices.length,min:Math.min(...prices),count:prices.length,date:rows[0].effective_at||rows[0].created_at})});
 return [...byProduct.entries()].map(([productId,offers])=>{offers.sort((a,b)=>new Date(b.date)-new Date(a.date));const current=offers[0],best=[...offers].sort((a,b)=>a.latest-b.latest)[0],all=offers.flatMap(o=>[o.average]);const avg=all.reduce((a,b)=>a+b,0)/Math.max(all.length,1),pct=current.previous>0?(current.latest-current.previous)/current.previous*100:0,saving=Math.max(0,current.latest-best.latest);return {productId,product:products.find(p=>p.id===productId),offers,current,best,avg,pct,saving}}).filter(x=>x.product);
}
function supplierReliability(supplierId){
 const docs=supplierDocuments.filter(d=>d.supplierId===supplierId&&d.kind==='delivery');if(!docs.length)return null;
 const issue=docs.filter(d=>d.status==='issue'||(d.missingProducts||[]).length).length;
 return Math.max(0,Math.round((1-issue/docs.length)*100));
}
function renderSupplierCatalog(){
 const body=$('supplierCatalogBody');if(!body)return;
 const term=($('supplierCatalogSearch')?.value||'').toLowerCase(),filter=$('supplierCatalogFilter')?.value||'all';let rows=supplierCatalogRows().filter(r=>(r.product.name+' '+r.offers.map(o=>o.supplierName).join(' ')).toLowerCase().includes(term));
 if(filter==='increase')rows=rows.filter(r=>r.pct>0.5);if(filter==='saving')rows=rows.filter(r=>r.saving>0.001);
 rows.sort((a,b)=>b.saving-a.saving||b.pct-a.pct);
 body.innerHTML=rows.length?rows.map(r=>{const alt=r.best.supplierId!==r.current.supplierId?`<span class="badge ok">${esc(r.best.supplierName)} · ${money(r.best.latest)}</span>`:'<span class="tiny">Déjà au meilleur prix</span>';const cls=r.pct>0.5?'price-up':r.pct<-0.5?'price-down':'price-flat',arrow=r.pct>0.5?'▲':r.pct<-0.5?'▼':'•';return `<tr><td class="catalog-product"><b>${esc(r.product.name)}</b><small>${r.offers.length} fournisseur(s) · ${r.offers.reduce((n,o)=>n+o.count,0)} prix enregistré(s)</small></td><td>${esc(r.current.supplierName)}</td><td><b>${money(r.current.latest)}</b></td><td>${money(r.avg)}</td><td>${money(r.best.latest)}</td><td><div class="supplier-option">${alt}${r.saving>0?`<span class="tiny">Économie ${money(r.saving)}/unité</span>`:''}</div></td><td class="${cls}">${arrow} ${Math.abs(r.pct).toFixed(1)} %</td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Aucun historique de prix fournisseur disponible.</td></tr>';
 const all=supplierCatalogRows(),increases=all.filter(r=>r.pct>0.5),savings=all.reduce((s,r)=>s+r.saving,0),issues=supplierDocuments.filter(d=>d.kind==='delivery'&&(d.status==='issue'||(d.missingProducts||[]).length)).length;
 if($('supplierCatalogProducts'))$('supplierCatalogProducts').textContent=all.length;if($('supplierCatalogIncreases'))$('supplierCatalogIncreases').textContent=increases.length;if($('supplierCatalogSavings'))$('supplierCatalogSavings').textContent=money(savings);if($('supplierDeliveryIssues'))$('supplierDeliveryIssues').textContent=issues;
}
function renderReceptionPriceWatch(){
 const box=$('receptionPriceWatch');if(!box)return;const alerts=[];
 supplierDocuments.filter(d=>d.kind==='delivery').forEach(d=>(d.priceAlerts||[]).forEach(a=>alerts.push({...a,supplierName:d.supplierName,date:d.date,document:d.number})));
 alerts.sort((a,b)=>num(b.percent)-num(a.percent));box.innerHTML=alerts.length?alerts.slice(0,12).map(a=>`<div class="item"><div><b>${esc(a.description||productNameById(a.productId))}</b><small>${esc(a.supplierName||'Fournisseur')} · ${esc(a.document||'Bon')} · ${a.date?new Date(a.date).toLocaleDateString('fr-BE'):''}<br>${money(a.oldPrice)} → ${money(a.newPrice)}</small></div><span class="badge ${num(a.percent)>=10?'bad':'warn'}">+${num(a.percent).toFixed(1)} %</span></div>`).join(''):'<div class="empty">Aucune augmentation de prix détectée dans les réceptions.</div>';
}
const _renderSuppliersV11=renderSuppliers;renderSuppliers=function(){
 const term=$('supplierSearch').value.toLowerCase(),list=suppliers.filter(s=>(s.name+' '+(s.contact_name||'')).toLowerCase().includes(term));$('suppliersBody').innerHTML=list.length?list.map(s=>{const score=supplierReliability(s.id),cls=score==null?'':score>=95?'ok':score>=80?'warn':'bad';return `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.contact_name||'—')}</td><td>${esc(s.email||'—')}</td><td>${esc(s.phone||'—')}</td><td>${esc(s.delivery_days||'—')}</td><td>${score==null?'<span class="tiny">Pas assez de données</span>':`<span class="reliability-score ${cls}">${score} %</span>`}</td><td><button class="btn soft" onclick="editSupplier('${s.id}')">Ouvrir</button></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Aucun fournisseur.</td></tr>';renderSupplierCatalog()}
const _renderAllV11=renderAll;renderAll=function(){_renderAllV11();renderSupplierCatalog();renderReceptionPriceWatch()}
$('supplierCatalogSearch')?.addEventListener('input',renderSupplierCatalog);$('supplierCatalogFilter')?.addEventListener('change',renderSupplierCatalog);
document.querySelectorAll('[data-view="suppliers"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(renderSupplierCatalog,0)));
document.querySelectorAll('[data-view="reception"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(renderReceptionPriceWatch,0)));

/* ===== GESTIONA v12.1 — Pilotage multi-établissements ===== */


/* ===== GESTIONA v12.2 — Socle professionnel, rôles et journal ===== */
const ROLE_LABELS={owner:'Propriétaire',admin:'Administrateur',manager:'Gérant',kitchen:'Cuisine',bar:'Bar',accountant:'Comptabilité',employee:'Employé'};
const ROLE_CAPABILITIES={
 owner:['Accès complet à tous les établissements','Gestion des stocks, commandes et réceptions','Consultation du journal d’activité','Paramètres et opérations sensibles'],
 admin:['Accès complet aux opérations','Gestion des stocks, commandes et réceptions','Consultation du journal d’activité','Administration quotidienne'],
 manager:['Pilotage des établissements','Stocks, commandes, réceptions et ventes','Consultation du journal d’activité','Validation des opérations courantes'],
 kitchen:['Consultation et ajustement du stock','Inventaires et fiches recettes','Préparation des besoins de commande','Pas d’administration générale'],
 bar:['Consultation et ajustement du stock bar','Inventaires et ventes','Préparation des besoins de commande','Pas d’administration générale'],
 accountant:['Factures, fournisseurs et analyses financières','Consultation des commandes et réceptions','Export des données','Pas de suppression définitive du stock'],
 employee:['Consultation opérationnelle','Saisie des ventes et inventaires autorisés','Accès limité aux opérations sensibles','Pas d’administration générale']
};
function currentRole(){return profile?.role||'employee'}
function roleLabel(){return ROLE_LABELS[currentRole()]||currentRole()}
function applyRoleUi(){
 const role=currentRole(),label=roleLabel();
 if($('roleBadge')){$('roleBadge').textContent=label;$('roleBadge').className='badge '+(['owner','admin','manager'].includes(role)?'ok':'warn')}
 document.querySelectorAll('[data-sensitive="admin"]').forEach(el=>el.classList.toggle('hidden',!['owner','admin'].includes(role)));
}
function activityEntityLabel(type){return ({product:'Stock',purchase_order:'Commande / réception',sale:'Vente',recipe:'Recette',stock_category:'Catégorie',supplier:'Fournisseur'}[type]||type||'Autre')}
function activityDetails(row){
 const d=row?.details||{};const bits=[];
 if(d.name)bits.push(d.name);if(d.names?.length)bits.push(d.names.slice(0,4).join(', ')+(d.names.length>4?'…':''));
 if(d.order_number)bits.push('Commande '+d.order_number);if(d.count!=null)bits.push(d.count+' élément(s)');
 if(d.previous_stock!=null&&d.new_stock!=null)bits.push(`${d.previous_stock} → ${d.new_stock}`);
 if(d.total!=null)bits.push(money(d.total));if(d.status)bits.push(d.status);
 return bits.join(' · ')||'Détails enregistrés';
}
function filteredActivity(){const term=($('activitySearch')?.value||'').toLowerCase(),entity=$('activityEntityFilter')?.value||'all';return activity.filter(r=>(entity==='all'||r.entity_type===entity)&&(`${r.action||''} ${r.entity_type||''} ${JSON.stringify(r.details||{})}`).toLowerCase().includes(term))}
function renderActivityCenter(){
 if(!$('activityBody'))return;const rows=filteredActivity(),today=localDateKey(),role=currentRole(),caps=ROLE_CAPABILITIES[role]||ROLE_CAPABILITIES.employee;
 $('securityRole').textContent=roleLabel();$('securityActionCount').textContent=activity.length;$('securityTodayCount').textContent=activity.filter(x=>localDateKey(new Date(x.created_at))===today).length;$('securityLastActivity').textContent=activity[0]?.created_at?new Date(activity[0].created_at).toLocaleString('fr-BE',{dateStyle:'short',timeStyle:'short'}):'Aucune';
 $('securityRoleBadge').textContent=roleLabel();$('securityCapabilities').innerHTML=caps.map(x=>`<div class="security-capability"><span>✓</span><div>${esc(x)}</div></div>`).join('');
 $('activityBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${new Date(r.created_at).toLocaleString('fr-BE')}</td><td><b>${esc(r.action||'Action')}</b></td><td><span class="badge soft">${esc(activityEntityLabel(r.entity_type))}</span></td><td>${esc(activityDetails(r))}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Aucune activité correspondant aux filtres.</td></tr>';
}
async function refreshActivityCenter(){await loadActivity();renderActivityCenter();renderDashboard();toast('Journal actualisé')}
function exportActivityCsv(){const rows=filteredActivity();if(!rows.length){toast('Aucune activité à exporter');return}const cell=v=>'\"'+String(v??'').replace(/\"/g,'\"\"')+'\"';const csv=['Date;Action;Catégorie;Détails',...rows.map(r=>[new Date(r.created_at).toLocaleString('fr-BE'),r.action||'',activityEntityLabel(r.entity_type),activityDetails(r)].map(cell).join(';'))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='gestiona-journal-activite.csv';a.click();URL.revokeObjectURL(a.href);toast('Journal exporté')}
$('activitySearch')?.addEventListener('input',renderActivityCenter);$('activityEntityFilter')?.addEventListener('change',renderActivityCenter);$('refreshActivityBtn')?.addEventListener('click',refreshActivityCenter);$('exportActivityBtn')?.addEventListener('click',exportActivityCsv);


/* ===== GESTIONA v13.0 — Centre d’actions ORION ===== */
const ACTIONS_KEY='gestiona_actions_v130';
let manualActions=[];
function loadManualActions(){try{manualActions=JSON.parse(localStorage.getItem(ACTIONS_KEY)||'[]');if(!Array.isArray(manualActions))manualActions=[]}catch{manualActions=[]}}
function saveManualActions(){localStorage.setItem(ACTIONS_KEY,JSON.stringify(manualActions))}
function actionVenueName(id){return id==='all'||!id?'Tous les établissements':(venues.find(v=>v.id===id)?.name||'Établissement')}
function generatedActions(){
 const out=[],activeProducts=products.filter(p=>p.active!==false&&(selectedVenue==='all'||!p.venue_id||p.venue_id===selectedVenue));
 activeProducts.forEach(p=>{const st=num(p.stock),min=num(p.minimum_stock);if(st<=0)out.push({id:'stock-zero-'+p.id,source:'orion',priority:'urgent',title:`Rupture : ${p.name}`,note:`Stock actuel ${st}. Préparer une commande immédiatement.`,venueId:p.venue_id||'all',target:'products'});else if(st<=min)out.push({id:'stock-low-'+p.id,source:'orion',priority:'today',title:`Stock faible : ${p.name}`,note:`Stock ${st} / minimum ${min}.`,venueId:p.venue_id||'all',target:'products'})});
 orders.filter(o=>!['received','cancelled'].includes(o.status||'')&&(selectedVenue==='all'||!o.venue_id||o.venue_id===selectedVenue)).forEach(o=>out.push({id:'order-'+o.id,source:'orion',priority:o.status==='sent'?'today':'week',title:`Suivre la commande ${o.order_number||''}`.trim(),note:`${o.suppliers?.name||'Fournisseur'} · ${money(orderTotal(o))} · statut ${orderStatusLabel(o.status)[0]}`,venueId:o.venue_id||'all',target:'orders'}));
 supplierDocuments.filter(d=>d.kind==='delivery'&&(d.status==='issue'||(d.missingProducts||[]).length)).forEach(d=>out.push({id:'delivery-'+d.id,source:'orion',priority:'urgent',title:`Écart de livraison ${d.number||''}`.trim(),note:`${d.supplierName||'Fournisseur'} · ${(d.missingProducts||[]).length} produit(s) manquant(s)`,venueId:d.venueId||'all',target:'reception'}));
 supplierDocuments.filter(d=>d.kind==='delivery').forEach(d=>(d.priceAlerts||[]).filter(a=>num(a.percent)>=5).forEach((a,i)=>out.push({id:`price-${d.id}-${i}`,source:'orion',priority:num(a.percent)>=10?'urgent':'week',title:`Hausse de prix : ${a.description||productNameById(a.productId)}`,note:`${d.supplierName||'Fournisseur'} · +${num(a.percent).toFixed(1)} %`,venueId:d.venueId||'all',target:'suppliers'})));
 return out.slice(0,80)
}
function allActionRows(){const doneIds=new Set(manualActions.filter(a=>a.generatedDone).map(a=>a.generatedId));const generated=generatedActions().filter(a=>!doneIds.has(a.id));return [...generated,...manualActions.filter(a=>!a.generatedDone)].map(a=>({...a,done:!!a.done}))}
function filteredActions(){const term=($('actionSearch')?.value||'').toLowerCase(),filter=$('actionPriorityFilter')?.value||'all';return allActionRows().filter(a=>(filter==='all'||(filter==='done'?a.done:a.priority===filter&&!a.done))&&(`${a.title} ${a.note||''} ${actionVenueName(a.venueId)}`).toLowerCase().includes(term))}
function actionPriorityLabel(p){return ({urgent:['Urgent','bad'],today:["Aujourd’hui",'warn'],week:['Cette semaine','soft'],info:['Information','ok']}[p]||['Action','soft'])}
function renderActionCenter(){
 if(!$('actionBoard'))return;const all=allActionRows(),rows=filteredActions();
 $('actionUrgentCount').textContent=all.filter(a=>!a.done&&a.priority==='urgent').length;$('actionTodayCount').textContent=all.filter(a=>!a.done&&a.priority==='today').length;$('actionWeekCount').textContent=all.filter(a=>!a.done&&a.priority==='week').length;$('actionDoneCount').textContent=manualActions.filter(a=>a.done||a.generatedDone).length;
 $('manualActionVenue').innerHTML=['<option value="all">Tous les établissements</option>',...venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`)].join('');
 const groups=[['urgent','🔴 Urgent'],['today',"🟠 Aujourd’hui"],['week','🟡 Cette semaine'],['info','🟢 Information'],['done','✅ Terminées']];
 $('actionBoard').innerHTML=groups.map(([key,title])=>{const list=rows.filter(a=>key==='done'?a.done:!a.done&&a.priority===key);if(!list.length)return '';return `<section class="action-column"><h3>${title}<span>${list.length}</span></h3>${list.map(a=>{const p=actionPriorityLabel(a.priority);return `<article class="action-card ${a.done?'done':''}"><div class="action-card-head"><span class="badge ${p[1]}">${p[0]}</span><small>${esc(actionVenueName(a.venueId))}</small></div><b>${esc(a.title)}</b><p>${esc(a.note||'Aucun détail')}</p><div class="action-card-buttons">${a.target&&!a.done?`<button class="btn soft mini" onclick="missionOpenView('${a.target}')">Ouvrir</button>`:''}<button class="btn ${a.done?'soft':'primary'} mini" onclick="toggleActionDone('${a.id}','${a.source||'manual'}')">${a.done?'Rouvrir':'Terminer'}</button>${a.source!=='orion'?`<button class="btn danger mini" onclick="deleteManualAction('${a.id}')">Supprimer</button>`:''}</div></article>`}).join('')}</section>`}).join('')||'<div class="card empty">Aucune action correspondant aux filtres.</div>'
}
function toggleActionDone(id,source){if(source==='orion'){const existing=manualActions.find(a=>a.generatedId===id);if(existing)existing.generatedDone=!existing.generatedDone;else manualActions.push({id:crypto.randomUUID?.()||String(Date.now()),generatedId:id,generatedDone:true,done:true,source:'marker'});}else{const a=manualActions.find(x=>x.id===id);if(a)a.done=!a.done}saveManualActions();renderActionCenter();toast('Centre d’actions mis à jour')}
function deleteManualAction(id){manualActions=manualActions.filter(a=>a.id!==id);saveManualActions();renderActionCenter();toast('Tâche supprimée')}
loadManualActions();
$('actionSearch')?.addEventListener('input',renderActionCenter);$('actionPriorityFilter')?.addEventListener('change',renderActionCenter);$('refreshActionsBtn')?.addEventListener('click',()=>{renderActionCenter();toast('Priorités ORION actualisées')});$('addManualActionBtn')?.addEventListener('click',()=>openModal('manualActionModal'));$('manualActionForm')?.addEventListener('submit',e=>{e.preventDefault();manualActions.unshift({id:crypto.randomUUID?.()||String(Date.now()),source:'manual',priority:$('manualActionPriority').value,title:$('manualActionTitle').value.trim(),note:$('manualActionNote').value.trim(),venueId:$('manualActionVenue').value,done:false,createdAt:new Date().toISOString()});saveManualActions();e.target.reset();closeModal('manualActionModal');renderActionCenter();toast('Tâche ajoutée')});
const _renderAllV130=renderAll;renderAll=function(){_renderAllV130();renderActionCenter()}


/* ===== GESTIONA v14.0 — Plan de production ===== */
const PRODUCTION_PLAN_KEY='gestiona_production_plan_v140';
let productionPlanDraft={};
function loadProductionPlan(){try{productionPlanDraft=JSON.parse(localStorage.getItem(PRODUCTION_PLAN_KEY)||'{}')||{}}catch{productionPlanDraft={}}}
function saveProductionPlan(){localStorage.setItem(PRODUCTION_PLAN_KEY,JSON.stringify(productionPlanDraft))}
function productionVenueRecipes(){const venue=$('productionVenue')?.value||selectedVenue;const q=($('productionSearch')?.value||'').trim().toLowerCase();return recipes.filter(r=>(venue==='all'||!venue||!r.venue_id||r.venue_id===venue)&&(!q||`${r.name} ${r.category||''}`.toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name,'fr'))}
function productionNeeds(){const needs=new Map();Object.entries(productionPlanDraft).forEach(([recipeId,portions])=>{const r=recipes.find(x=>x.id===recipeId),count=num(portions);if(!r||count<=0)return;const multiplier=count/Math.max(num(r.portions),1);(r.ingredients||[]).forEach(line=>{const qty=num(line.quantity)*multiplier;needs.set(line.product_id,(needs.get(line.product_id)||0)+qty)})});return [...needs.entries()].map(([productId,needed])=>{const p=products.find(x=>x.id===productId);return {productId,p,needed,stock:num(p?.stock),missing:Math.max(needed-num(p?.stock),0)}}).sort((a,b)=>(b.missing-a.missing)||((a.p?.name||'').localeCompare(b.p?.name||'','fr')))}
function renderProductionPlan(){if(!$('productionRecipeList'))return;const list=productionVenueRecipes();$('productionRecipeList').innerHTML=list.length?list.map(r=>{const qty=num(productionPlanDraft[r.id]);return `<div class="production-row"><div><b>${esc(r.name)}</b><small>${esc(r.category||'Autre')} · coût ${money(recipePortionCost(r))}/portion · capacité ${recipeStockCapacity(r)}</small></div><input type="number" min="0" step="1" value="${qty||''}" placeholder="0" oninput="setProductionQty('${r.id}',this.value)"><div><b>${money(recipePortionCost(r)*qty)}</b><small>coût estimé</small></div></div>`}).join(''):'<div class="production-empty">Aucune recette disponible.</div>';const needs=productionNeeds();$('productionNeedsList').innerHTML=needs.length?needs.map(x=>`<div class="production-need ${x.missing>0?'shortage':''}"><div><b>${esc(x.p?.name||'Produit absent')}</b><small>${esc(x.p?.unit||'unité')}</small></div><div><b>${x.needed.toFixed(3)}</b><small>nécessaire</small></div><div><b>${x.stock.toFixed(3)}</b><small>${x.missing>0?'manque '+x.missing.toFixed(3):'disponible'}</small></div></div>`).join(''):'<div class="production-empty">Ajoutez des portions pour calculer les besoins.</div>';const portions=Object.values(productionPlanDraft).reduce((a,b)=>a+num(b),0),selected=Object.values(productionPlanDraft).filter(x=>num(x)>0).length,cost=Object.entries(productionPlanDraft).reduce((sum,[id,q])=>{const r=recipes.find(x=>x.id===id);return sum+(r?recipePortionCost(r)*num(q):0)},0),shortages=needs.filter(x=>x.missing>0);$('productionRecipeCount').textContent=selected;$('productionPortionCount').textContent=portions;$('productionEstimatedCost').textContent=money(cost);$('productionShortageCount').textContent=shortages.length;const notice=$('productionNotice');notice.classList.toggle('hidden',!shortages.length);if(shortages.length)notice.innerHTML=`⚠️ Production impossible : ${shortages.length} ingrédient(s) insuffisant(s). Ajustez les quantités ou passez une commande.`;$('executeProductionPlanBtn').disabled=!selected||!!shortages.length}
window.setProductionQty=(id,value)=>{const q=Math.max(0,Math.floor(num(value)));if(q)productionPlanDraft[id]=q;else delete productionPlanDraft[id];saveProductionPlan();renderProductionPlan()}
function openProductionPlan(){loadProductionPlan();$('productionVenue').innerHTML='<option value="all">Tous les établissements</option>'+venues.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('');$('productionVenue').value=selectedVenue||'all';$('productionDate').value=localDateKey();renderProductionPlan();openModal('productionPlanModal')}
async function executeProductionPlan(){const entries=Object.entries(productionPlanDraft).filter(([,q])=>num(q)>0);if(!entries.length){toast('Ajoutez au moins une quantité');return}const needs=productionNeeds();if(needs.some(x=>x.missing>0)){toast('Stock insuffisant pour valider ce plan');return}const totalPortions=entries.reduce((a,[,q])=>a+num(q),0);if(!confirm(`Valider la production de ${totalPortions} portion(s) ?

Les besoins consolidés seront retirés du stock.`))return;try{for(const x of needs){if(!x.p||x.needed<=0)continue;const {error}=await sb.rpc('record_stock_movement',{p_product_id:x.p.id,p_quantity:-x.needed,p_movement_type:'sale',p_note:`Plan de production du ${$('productionDate').value||localDateKey()}`});if(error)throw error}await audit('Plan de production validé','recipe','production-plan',{date:$('productionDate').value||localDateKey(),venue:$('productionVenue').value,portions:totalPortions,recipes:entries.map(([id,q])=>({id,name:recipes.find(r=>r.id===id)?.name,portions:num(q)})),ingredients:needs.length});productionPlanDraft={};saveProductionPlan();await refresh();renderProductionPlan();toast(`${totalPortions} portion(s) enregistrée(s) · stock mis à jour`)}catch(e){toast('Production non enregistrée : '+(e.message||e))}}
loadProductionPlan();
$('openProductionPlanBtn')?.addEventListener('click',openProductionPlan);$('productionVenue')?.addEventListener('change',renderProductionPlan);$('productionSearch')?.addEventListener('input',renderProductionPlan);$('clearProductionPlanBtn')?.addEventListener('click',()=>{if(Object.keys(productionPlanDraft).length&&!confirm('Effacer toutes les quantités du plan ?'))return;productionPlanDraft={};saveProductionPlan();renderProductionPlan()});$('executeProductionPlanBtn')?.addEventListener('click',executeProductionPlan);
const _renderAllV140=renderAll;renderAll=function(){_renderAllV140();if($('productionPlanModal')?.classList.contains('open'))renderProductionPlan()}


/* ===== GESTIONA v18.2 — Répertoire des établissements ===== */
const LS_VENUE_DETAILS='gestiona_venue_details_v182';let venueWizardStep=1,venueLogoData='';
function getVenueDetails(){try{return JSON.parse(localStorage.getItem(LS_VENUE_DETAILS)||'{}')||{}}catch{return{}}}
function saveVenueDetails(map){localStorage.setItem(LS_VENUE_DETAILS,JSON.stringify(map))}
function venueInfo(v){return getVenueDetails()[String(v.id)]||{}}
function renderVenueDirectory(){const host=$('venueDirectory');if(!host)return;host.innerHTML=venues.map(v=>{const d=venueInfo(v),t=venueTheme(v),place=[d.zip,d.city].filter(Boolean).join(' ');return `<article class="venue-directory-card" style="--venue-color:${t.primary}"><div class="venue-card-top"><div class="row" style="align-items:center"><div class="venue-avatar">${d.logo?`<img src="${d.logo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:15px">`:'🏢'}</div><div><h3>${esc(v.name)}</h3><span class="badge ok">Actif</span></div></div><button class="btn soft mini" onclick="focusVenue('${v.id}')">Ouvrir</button></div><div class="venue-meta"><span>🏷️ ${esc(d.type||'Établissement')}</span><span>📍 ${esc(place||d.country||'Adresse à compléter')}</span><span>✉️ ${esc(d.email||'E-mail à compléter')}</span></div><button class="btn soft block" onclick="openVenueInformation('${v.id}')">Voir la page informations</button></article>`}).join('')+`<article class="venue-directory-card venue-new-card" id="newVenueCard"><div><div class="plus">＋</div><h3>Nouvel établissement</h3><p class="muted">Créer une fiche complète et choisir son identité visuelle.</p></div></article>`;$('newVenueCard')?.addEventListener('click',openVenueWizard)}
function resetVenueWizard(){venueWizardStep=1;venueLogoData='';$('venueWizardForm')?.reset();if($('nvCountry'))$('nvCountry').value='Belgique';if($('nvPrimary'))$('nvPrimary').value='#64142a';if($('nvAccent'))$('nvAccent').value='#c59a43';updateVenuePreview();showVenueWizardStep()}
function openVenueWizard(){resetVenueWizard();openModal('venueWizardModal')}
function showVenueWizardStep(){document.querySelectorAll('[data-wizard-step]').forEach(x=>x.classList.toggle('active',num(x.dataset.wizardStep)===venueWizardStep));document.querySelectorAll('[data-wizard-dot]').forEach(x=>{const n=num(x.dataset.wizardDot);x.classList.toggle('active',n===venueWizardStep);x.classList.toggle('done',n<venueWizardStep)});document.querySelectorAll('.wizard-progress i').forEach((x,i)=>x.classList.toggle('done',i<venueWizardStep-1));const titles=['Informations générales','Identité visuelle','Modules et banque','Vérification'];$('venueWizardTitle').textContent=titles[venueWizardStep-1];$('venueWizardPrev').classList.toggle('hidden',venueWizardStep===1);$('venueWizardNext').classList.toggle('hidden',venueWizardStep===4);$('venueWizardCreate').classList.toggle('hidden',venueWizardStep!==4);if(venueWizardStep===4)renderVenueWizardSummary()}
function updateVenuePreview(){const name=$('nvName')?.value.trim()||'Nouvel établissement',p=$('nvPrimary')?.value||'#64142a',a=$('nvAccent')?.value||'#c59a43';$('nvPreviewName')&&($('nvPreviewName').textContent=name);$('nvThemePreview')?.style.setProperty('--nv-primary',p);$('nvThemePreview')?.style.setProperty('--nv-accent',a)}
function readVenueDraft(){return{name:$('nvName').value.trim(),type:$('nvType').value,company:$('nvCompany').value.trim(),vat:$('nvVat').value.trim(),address:$('nvAddress').value.trim(),zip:$('nvZip').value.trim(),city:$('nvCity').value.trim(),country:$('nvCountry').value.trim(),phone:$('nvPhone').value.trim(),email:$('nvEmail').value.trim(),website:$('nvWebsite').value.trim(),primary:$('nvPrimary').value,accent:$('nvAccent').value,logo:venueLogoData,modules:[...document.querySelectorAll('input[name="nvModule"]:checked')].map(x=>x.value),iban:$('nvIban').value.trim(),bic:$('nvBic').value.trim(),payment:$('nvPayment').value.trim()}}
function renderVenueWizardSummary(){const d=readVenueDraft();$('venueWizardSummary').innerHTML=`<div class="venue-summary-block"><h4>Établissement</h4><b>${esc(d.name||'Sans nom')}</b><p>${esc(d.type)}</p><p>${esc([d.address,d.zip,d.city,d.country].filter(Boolean).join(', ')||'Adresse non renseignée')}</p></div><div class="venue-summary-block"><h4>Contact</h4><p>${esc(d.phone||'Téléphone non renseigné')}</p><p>${esc(d.email||'E-mail non renseigné')}</p><p>${esc(d.website||'Site non renseigné')}</p></div><div class="venue-summary-block"><h4>Identité</h4><div style="display:flex;gap:10px"><span style="width:34px;height:34px;border-radius:9px;background:${d.primary}"></span><span style="width:34px;height:34px;border-radius:9px;background:${d.accent}"></span></div></div><div class="venue-summary-block"><h4>Modules</h4><p>${d.modules.map(esc).join(' · ')||'Aucun module'}</p></div>`}
async function createVenueFromWizard(e){e.preventDefault();const d=readVenueDraft();if(!d.name){venueWizardStep=1;showVenueWizardStep();toast('Indiquez le nom de l’établissement');return}const btn=$('venueWizardCreate');btn.disabled=true;btn.textContent='Création…';try{const {data,error}=await sb.from('venues').insert({organization_id:orgId,name:d.name}).select('*').single();if(error)throw error;const details=getVenueDetails();details[String(data.id)]={type:d.type,company:d.company,vat:d.vat,address:d.address,zip:d.zip,city:d.city,country:d.country,phone:d.phone,email:d.email,website:d.website,logo:d.logo,modules:d.modules,iban:d.iban,bic:d.bic,payment:d.payment,createdAt:new Date().toISOString()};saveVenueDetails(details);const themes=getVenueThemeMap();themes[String(data.id)]={primary:d.primary,accent:d.accent};saveVenueThemeMap(themes);await loadVenues();selectedVenue=String(data.id);$('venueSelect').value=selectedVenue;applyVenueTheme();renderAll();renderVenueDirectory();closeModal('venueWizardModal');toast(`${d.name} a été créé`)}catch(err){msg('venueWizardMsg',err.message||'Création impossible','error')}finally{btn.disabled=false;btn.textContent='Créer l’établissement'}}
window.openVenueInformation=id=>{const v=venues.find(x=>String(x.id)===String(id)),d=venueInfo(v);if(!v)return;alert(`${v.name}\n\nType : ${d.type||'Non renseigné'}\nAdresse : ${[d.address,d.zip,d.city,d.country].filter(Boolean).join(', ')||'Non renseignée'}\nTéléphone : ${d.phone||'Non renseigné'}\nE-mail : ${d.email||'Non renseigné'}\nTVA : ${d.vat||'Non renseignée'}\nIBAN : ${d.iban||'Non renseigné'}`)}
$('newVenueBtn')?.addEventListener('click',openVenueWizard);$('venueWizardPrev')?.addEventListener('click',()=>{venueWizardStep=Math.max(1,venueWizardStep-1);showVenueWizardStep()});$('venueWizardNext')?.addEventListener('click',()=>{if(venueWizardStep===1&&!$('nvName').value.trim()){toast('Indiquez le nom de l’établissement');$('nvName').focus();return}venueWizardStep=Math.min(4,venueWizardStep+1);showVenueWizardStep()});$('venueWizardForm')?.addEventListener('submit',createVenueFromWizard);['nvName','nvPrimary','nvAccent'].forEach(id=>$(id)?.addEventListener('input',updateVenuePreview));$('nvLogo')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{venueLogoData=r.result;updateVenuePreview()};r.readAsDataURL(f)});
const _renderAllV182=renderAll;renderAll=function(){_renderAllV182();renderVenueDirectory()}


/* ===== GESTIONA v20.0 — Smart Stock ===== */
function v20ActiveProducts(){return products.filter(p=>p.active!==false)}
function v20StockValue(){return v20ActiveProducts().reduce((sum,p)=>sum+Math.max(0,num(p.stock))*Math.max(0,unitCost(p)),0)}
function v20OpenOrders(){return orders.filter(o=>!['received','cancelled'].includes(o.status))}
function v20MovementIcon(row){const t=String(row?.details?.movement_type||row?.action||'').toLowerCase();if(t.includes('réception')||t.includes('purchase'))return '📥';if(t.includes('vente')||t.includes('sale'))return '🧾';if(t.includes('perte')||t.includes('waste'))return '⚠️';if(t.includes('inventaire'))return '📋';return '↔️'}
function renderV20StockOverview(){
 if(!$('v20StockValue'))return;
 const active=v20ActiveProducts(),low=active.filter(p=>num(p.stock)<=num(p.minimum_stock)),out=active.filter(p=>num(p.stock)<=0),open=v20OpenOrders();
 $('v20StockValue').textContent=money(v20StockValue());$('v20StockProducts').textContent=active.length;$('v20StockLow').textContent=low.length;$('v20StockOut').textContent=out.length;$('v20StockOrders').textContent=open.length;$('v20PriorityCount').textContent=low.length;
 const urgent=[...low].sort((a,b)=>(num(a.stock)-num(a.minimum_stock))-(num(b.stock)-num(b.minimum_stock))).slice(0,6);
 $('v20StockPriorities').innerHTML=urgent.length?urgent.map(p=>`<div class="v20-priority-item"><div><b>${esc(p.name)}</b><small>Stock ${formatQty(num(p.stock))} · minimum ${formatQty(num(p.minimum_stock))} ${esc(p.unit||'')}</small></div><div class="stock-actions"><span class="badge ${num(p.stock)<=0?'bad':'warn'}">${num(p.stock)<=0?'Rupture':'À commander'}</span><button class="btn mini primary" onclick="openStockOrder('${p.id}')">Commander</button></div></div>`).join(''):'<div class="empty">Aucune priorité de stock. Tous les niveaux sont suffisants.</div>';
 const recent=(activity||[]).filter(r=>['product','sale','purchase_order'].includes(r.entity_type)).slice(0,7);
 $('v20StockMovements').innerHTML=recent.length?recent.map(r=>`<div class="v20-movement-item"><div class="v20-movement-main"><span class="v20-movement-icon">${v20MovementIcon(r)}</span><div><b>${esc(r.action||'Mouvement de stock')}</b><small>${esc(activityDetails(r))}</small></div></div><small>${r.created_at?new Date(r.created_at).toLocaleDateString('fr-BE',{day:'2-digit',month:'2-digit'}):''}</small></div>`).join(''):'<div class="empty">Aucun mouvement récent enregistré.</div>';
}
$('v20InventoryBtn')?.addEventListener('click',()=>$('openQuickInventoryBtn')?.click());
$('v20OrderBtn')?.addEventListener('click',()=>$('openAutoOrderBtn')?.click());
$('v20NewProductBtn')?.addEventListener('click',()=>$('addProductBtn')?.click());
$('v20MovementJournalBtn')?.addEventListener('click',()=>missionOpenView('activity'));
$('v20RefreshStockBtn')?.addEventListener('click',async()=>{await refresh();renderV20StockOverview();toast('Stocks actualisés')});
const _renderAllV200=renderAll;renderAll=function(){_renderAllV200();renderV20StockOverview()}
document.querySelectorAll('[data-view="products"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(renderV20StockOverview,0)));
