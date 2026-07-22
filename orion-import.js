(function(global){
  'use strict';

  const normalize = (v) => String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const normalizeName = (v) => normalize(v).toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const isReference = (v) => /^\d{2,12}$/.test(normalize(v));
  const looksLikeCategory = (ref, name) => {
    const r = normalize(ref), n = normalize(name);
    if (!r && !n) return false;
    if (r && !n && !isReference(r)) return true;
    if (!isReference(r) && !n) return true;
    if (!isReference(r) && n === '') return true;
    return false;
  };

  function detectEstablishment(workbook, filename='') {
    const haystack = [filename, ...workbook.SheetNames].join(' ').toLowerCase();
    if (/danish/.test(haystack)) return 'Danish';
    if (/elys[eé]e|elysee/.test(haystack)) return "L’Élysée";
    for (const sheetName of workbook.SheetNames) {
      const rows = global.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header:1, blankrows:false, defval:''}).slice(0,12);
      const text = rows.flat().join(' ').toLowerCase();
      if (/danish/.test(text)) return 'Danish';
      if (/elys[eé]e|elysee/.test(text)) return "L’Élysée";
    }
    return 'À confirmer';
  }

  function detectArea(sheetName) {
    const s = normalizeName(sheetName);
    if (/CUISINE|KITCHEN/.test(s)) return 'cuisine';
    if (/BAR|SALLE|ROOM/.test(s)) return 'bar_salle';
    return 'autre';
  }

  function findColumns(rows) {
    for (let i=0; i<Math.min(rows.length, 20); i++) {
      const row = rows[i].map(normalizeName);
      const ref = row.findIndex(v => /REFERENCE|RÉFÉRENCE|REF\.?$/.test(v));
      const name = row.findIndex(v => /ARTICLES?|PRODUITS?|DESIGNATION|DESCRIPTION/.test(v));
      if (ref >= 0 && name >= 0) return {headerRow:i, refCol:ref, nameCol:name};
    }
    // Sligro sheets usually use the first two useful columns.
    return {headerRow:5, refCol:0, nameCol:1};
  }

  function parseSheet(workbook, sheetName) {
    const rows = global.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header:1, blankrows:false, defval:''});
    const {headerRow, refCol, nameCol} = findColumns(rows);
    const area = detectArea(sheetName);
    let category = 'SANS CATÉGORIE';
    let categoryOrder = 0;
    const products = [];
    const warnings = [];

    for (let i=headerRow+1; i<rows.length; i++) {
      const row = rows[i] || [];
      const ref = normalize(row[refCol]);
      const name = normalize(row[nameCol]);
      if (!ref && !name) continue;

      if (looksLikeCategory(ref, name)) {
        category = normalizeName(ref || name);
        categoryOrder += 1;
        continue;
      }

      if (!isReference(ref)) {
        if (name || ref) warnings.push({sheet:sheetName,row:i+1,message:'Ligne ignorée : référence non reconnue',values:[ref,name]});
        continue;
      }
      if (!name) {
        warnings.push({sheet:sheetName,row:i+1,message:'Ligne ignorée : nom de produit vide',values:[ref,name]});
        continue;
      }

      products.push({
        supplier:'Sligro',
        reference:ref,
        name:name,
        normalized_name:normalizeName(name),
        category,
        category_order:categoryOrder,
        product_order:products.length,
        area,
        source_sheet:sheetName,
        source_row:i+1
      });
    }
    return {sheetName, area, products, warnings};
  }

  function deduplicate(products) {
    const byRef = new Map();
    const duplicates = [];
    for (const p of products) {
      if (!byRef.has(p.reference)) byRef.set(p.reference, {...p, areas:[p.area], source_sheets:[p.source_sheet]});
      else {
        const current = byRef.get(p.reference);
        if (!current.areas.includes(p.area)) current.areas.push(p.area);
        if (!current.source_sheets.includes(p.source_sheet)) current.source_sheets.push(p.source_sheet);
        if (current.normalized_name !== p.normalized_name) duplicates.push({reference:p.reference, kept:current.name, alternative:p.name});
      }
    }
    return {products:[...byRef.values()], duplicates};
  }

  function analyzeWorkbook(arrayBuffer, filename='') {
    if (!global.XLSX) throw new Error('La bibliothèque XLSX est absente.');
    const workbook = global.XLSX.read(arrayBuffer, {type:'array', cellDates:true});
    const sheets = workbook.SheetNames.map(name => parseSheet(workbook, name));
    const all = sheets.flatMap(s => s.products);
    const deduped = deduplicate(all);
    return {
      supplier:'Sligro',
      establishment:detectEstablishment(workbook, filename),
      filename,
      sheets:sheets.map(s=>({name:s.sheetName,area:s.area,count:s.products.length})),
      products:deduped.products,
      duplicates:deduped.duplicates,
      warnings:sheets.flatMap(s=>s.warnings),
      stats:{rowsRecognized:all.length,uniqueProducts:deduped.products.length,duplicateReferences:all.length-deduped.products.length}
    };
  }

  function compareCatalog(existing, incoming) {
    const oldMap = new Map((existing||[]).map(p=>[String(p.reference),p]));
    const newMap = new Map((incoming||[]).map(p=>[String(p.reference),p]));
    const added=[], modified=[], unchanged=[], missing=[];

    for (const [ref,p] of newMap) {
      const old = oldMap.get(ref);
      if (!old) added.push(p);
      else {
        const changes={};
        ['name','category','area'].forEach(k=>{
          const a = k==='name' ? normalizeName(old[k]) : normalize(old[k]);
          const b = k==='name' ? normalizeName(p[k]) : normalize(p[k]);
          if (a!==b) changes[k]={from:old[k]??'',to:p[k]??''};
        });
        if (Object.keys(changes).length) modified.push({before:old,after:p,changes});
        else unchanged.push(p);
      }
    }
    for (const [ref,p] of oldMap) if (!newMap.has(ref)) missing.push(p);
    return {added,modified,unchanged,missing,summary:{added:added.length,modified:modified.length,unchanged:unchanged.length,missing:missing.length}};
  }

  global.ORIONImport={normalize,normalizeName,analyzeWorkbook,compareCatalog,parseSheet,deduplicate};
})(typeof window!=='undefined'?window:globalThis);
