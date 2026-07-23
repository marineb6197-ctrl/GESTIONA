(()=>{
  const statusFlow={draft:'sent',sent:'confirmed',confirmed:'partially_received',partially_received:'received'};
  const statusNames={draft:'Brouillons',sent:'Envoyées',confirmed:'Confirmées',partially_received:'Partielles',received:'Reçues'};
  const nextNames={draft:'Marquer envoyée',sent:'Confirmer',confirmed:'Réception partielle',partially_received:'Clôturer reçue'};
  const activeStatuses=['draft','sent','confirmed','partially_received'];
  const byId=id=>document.getElementById(id);
  const safeMoney=n=>typeof money==='function'?money(Number(n)||0):`${(Number(n)||0).toFixed(2).replace('.',',')} €`;
  const safeEsc=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const total=o=>typeof orderTotal==='function'?orderTotal(o):(o.purchase_order_items||[]).reduce((a,l)=>a+(Number(l.quantity_ordered)||0)*(Number(l.unit_price_excl_vat)||0),0);
  const dueState=o=>{
    if(!o.expected_at||['received','cancelled'].includes(o.status))return {due:false,overdue:false,label:'Aucune date'};
    const today=new Date();today.setHours(0,0,0,0);const d=new Date(o.expected_at);d.setHours(0,0,0,0);
    const delta=Math.round((d-today)/86400000);
    return {due:delta<=0,overdue:delta<0,label:delta<0?`${Math.abs(delta)} j de retard`:delta===0?'Livraison aujourd’hui':`Dans ${delta} j`};
  };
  function visibleOrders(){return (orders||[]).filter(o=>selectedVenue==='all'||String(o.venue_id||'')===String(selectedVenue));}
  function renderPurchaseControl(){
    if(!byId('v24OrderBoard'))return;
    const list=visibleOrders();
    const drafts=list.filter(o=>o.status==='draft');
    const open=list.filter(o=>activeStatuses.includes(o.status)&&o.status!=='draft');
    const due=list.filter(o=>dueState(o).due&&activeStatuses.includes(o.status));
    byId('v24DraftOrders').textContent=drafts.length;
    byId('v24OpenOrders').textContent=open.length;
    byId('v24DueOrders').textContent=due.length;
    byId('v24OpenValue').textContent=safeMoney(list.filter(o=>activeStatuses.includes(o.status)).reduce((a,o)=>a+total(o),0));
    byId('v24OrderAlerts').innerHTML=due.length?due.slice(0,5).map(o=>{const d=dueState(o);return `<div class="v24-order-alert ${d.overdue?'danger':''}"><div><b>${safeEsc(o.order_number||'Commande')}</b> · ${safeEsc(o.suppliers?.name||'Fournisseur')}<small>${safeEsc(d.label)} · ${safeMoney(total(o))} HTVA</small></div><button class="btn soft mini" onclick="editOrder('${o.id}')">Ouvrir</button></div>`}).join(''):'<div class="notice success">Aucune livraison en retard ou attendue aujourd’hui.</div>';
    byId('v24OrderBoard').innerHTML=Object.keys(statusNames).map(status=>{
      const items=list.filter(o=>o.status===status).sort((a,b)=>String(a.expected_at||'9999').localeCompare(String(b.expected_at||'9999')));
      return `<div class="v24-order-column"><div class="v24-order-column-head"><h4>${statusNames[status]}</h4><span class="badge ok">${items.length}</span></div>${items.length?items.map(orderCard).join(''):'<div class="empty">Aucune commande</div>'}</div>`;
    }).join('');
  }
  function orderCard(o){const d=dueState(o),supplier=o.suppliers?.name||'Fournisseur',venue=o.venues?.name||'Tous établissements';return `<div class="v24-order-card ${d.overdue?'overdue':''}"><div class="v24-order-number"><b>${safeEsc(o.order_number||'—')}</b><b>${safeMoney(total(o))}</b></div><small>${safeEsc(supplier)}</small><small>${safeEsc(venue)}</small><small>${o.expected_at?new Date(o.expected_at).toLocaleDateString('fr-BE'):'Date non définie'} · ${safeEsc(d.label)}</small><div class="v24-order-actions"><button class="btn soft" onclick="editOrder('${o.id}')">Ouvrir</button><button class="btn soft" onclick="v24DuplicateOrder('${o.id}')">Dupliquer</button>${statusFlow[o.status]?`<button class="btn gold" onclick="v24AdvanceOrder('${o.id}')">${nextNames[o.status]}</button>`:''}${['sent','confirmed','partially_received'].includes(o.status)?`<button class="btn primary" onclick="v24ReceiveOrder('${o.id}')">Réceptionner</button>`:''}</div></div>`}
  window.v24AdvanceOrder=async id=>{const o=orders.find(x=>x.id===id);if(!o||!statusFlow[o.status])return;const next=statusFlow[o.status];if(!confirm(`Passer ${o.order_number||'cette commande'} au statut « ${statusNames[next]} » ?`))return;const payload={status:next};if(next==='sent')payload.ordered_at=new Date().toISOString();const {error}=await sb.from('purchase_orders').update(payload).eq('id',id);if(error){toast(error.message);return}await audit('Statut de commande modifié','purchase_order',id,{from:o.status,to:next});await refresh();renderPurchaseControl();toast('Statut mis à jour')};
  window.v24DuplicateOrder=id=>{const o=orders.find(x=>x.id===id);if(!o)return;resetOrder();byId('oSupplier').value=o.supplier_id||'';byId('oVenue').value=o.venue_id||'';byId('oExpected').value='';byId('oReference').value=o.internal_reference?`${o.internal_reference} - copie`:'';byId('oAddress').value=o.delivery_address||'';byId('oNotes').value=`Copie de ${o.order_number||'commande'}${o.notes?`\n${o.notes}`:''}`;draftLines=(o.purchase_order_items||[]).map(x=>({product_id:x.product_id||null,description:x.description,quantity_ordered:Number(x.quantity_ordered)||0,quantity_received:0,unit_price_excl_vat:Number(x.unit_price_excl_vat)||0,vat_rate:Number(x.vat_rate)||21}));if(!draftLines.length)addOrderLine();renderOrderLines();byId('orderModalTitle').textContent=`Dupliquer ${o.order_number||'la commande'}`;openModal('orderModal')};
  window.v24ReceiveOrder=id=>{const o=orders.find(x=>x.id===id);document.querySelector('[data-view="reception"]')?.click();setTimeout(()=>{const sel=byId('receptionOrder');if(sel){sel.value=id;sel.dispatchEvent(new Event('change'))}},80);toast(`Commande ${o?.order_number||''} prête à réceptionner`)};
  function exportOrders(){const rows=[['Numéro','Fournisseur','Établissement','Date souhaitée','Statut','Total HTVA'],...visibleOrders().map(o=>[o.order_number||'',o.suppliers?.name||'',o.venues?.name||'',o.expected_at?String(o.expected_at).slice(0,10):'',o.status,total(o).toFixed(2)])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`gestiona-commandes-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)}
  const originalRenderOrders=renderOrders;
  renderOrders=function(){originalRenderOrders();renderPurchaseControl()};
  byId('v24ExportOrdersBtn')?.addEventListener('click',exportOrders);
  byId('v24RefreshOrdersBtn')?.addEventListener('click',async()=>{await refresh();renderPurchaseControl();toast('Commandes actualisées')});
  document.addEventListener('DOMContentLoaded',renderPurchaseControl);
  setTimeout(renderPurchaseControl,500);
})();
