(fonction(globale){
  'utiliser le strict';

  const normalize = (v) => String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`´]/g, "'")
    .replace(/\s+/g, ' ')
    .garniture();

  const normalizeName = (v) => normalize(v).toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const isReference = (v) => /^\d{2,12}$/.test(normalize(v));

  const looksLikeCategory = (ref, name) => {
    const r = normaliser(ref), n = normaliser(nom);
    si (!r && !n) retourner faux ;
    si (r && !n && !isReference(r)) retourner vrai ;
    si (!r && n && !isReference(n)) retourner vrai ;
    renvoyer faux ;
  };

  fonction detectEstablishment(workbook, nom_fichier='') {
    const haystack = [filename, ...workbook.SheetNames].join(' ').toLowerCase();
    si (/danish/.test(haystack)) retourner 'Danois';
    if (/elys[eé]e|elysee/.test(haystack)) renvoie "L'Élysée";

    pour chaque feuille de classeur (const sheetName) {
      const lignes = global.XLSX.utils.sheet_to_json(
        classeur.Feuilles[nom_de_la_feuille],
        {header:1, blankrows:false, defval:''}
      ).tranche(0,12);

      const text = rows.flat().join(' ').toLowerCase();
      si (/danish/.test(texte)) retourner 'Danois';
      if (/elys[eé]e|elysee/.test(text)) renvoie "L'Élysée";
    }

    retourner 'À confirmer';
  }

  function détecterArea(sheetName) {
    const s = normalizeName(sheetName);
    si (/CUISINE|KITCHEN/.test(s)) retourner 'cuisine';
    si (/BAR|SALLE|ROOM/.test(s)) retourner 'bar_salle';
    renvoyer 'autre';
  }

  fonction findColumns(rows) {
    pour (soit i=0; i<Math.min(rows.length, 20); i++) {
      const ligne = lignes[i].map(normalizeName);
      const ref = row.findIndex(v => /REFERENCE|REF/.test(v));
      const nom = ligne.findIndex(v => /ARTICLES?|PRODUITS?|DESIGNATION|DESCRIPTION/.test(v));
      si (ref >= 0 && name >= 0) retourner {headerRow:i, refCol:ref, nameCol:name};
    }
    renvoie {headerRow:5, refCol:0, nameCol:1};
  }

  fonction analyserFeuille(classeur, nomFeuille) {
    const lignes = global.XLSX.utils.sheet_to_json(
      classeur.Feuilles[nom_de_la_feuille],
      {header:1, blankrows:false, defval:''}
    );

    const {headerRow, refCol, nameCol} = findColumns(rows);
    const zone = détecterArea(sheetName);
    soit catégorie = 'SANS CATÉGORIE';
    soit categoryOrder = 0 ;
    const produits = [];
    const avertissements = [];

    pour (soit i=headerRow+1; i<rows.length; i++) {
      const ligne = lignes[i] || [];
      const ref = normalize(row[refCol]);
      const nom = normaliser(ligne[nomCol]);

      si (!ref && !name) continuer;

      si (ressemble à la catégorie(ref, nom)) {
        catégorie = normaliser(ref || nom).toUpperCase();
        catégorieOrdre += 1;
        continuer;
      }

      si (!isReference(ref)) {
        avertissements.push({
          feuille:nom_de_la_feuille,
          ligne : i+1,
          message:'Ligne ignorée : référence non reconnue',
          valeurs:[ref,name]
        });
        continuer;
      }

      si (!nom) {
        avertissements.push({
          feuille:nom_de_la_feuille,
          ligne : i+1,
          message:'Ligne ignorée : nom de produit vide',
          valeurs:[ref,name]
        });
        continuer;
      }

      produits.push({
        fournisseur : 'Sligro',
        référence : réf,
        nom,
        nom_normalisé:normaliserNom(nom),
        catégorie,
        ordre_catégorie : ordre_catégorie,
        commande_produit:produits.longueur,
        zone,
        feuille_source:nom_de_la_feuille,
        ligne_source:i+1
      });
    }

    renvoie {sheetName, area, products, warnings};
  }

  fonction deduplication(produits) {
    const byRef = new Map();
    const duplicates = [];

    pour (const p de produits) {
      si (!byRef.has(p.reference)) {
        parRef.set(p.reference, {
          ...p,
          zones:[p.area],
          feuilles_sources:[p.source_sheet]
        });
        continuer;
      }

      const courant = par référence.get(p.reference);
      if (!current.areas.includes(p.area)) current.areas.push(p.area);
      if (!current.source_sheets.includes(p.source_sheet)) current.source_sheets.push(p.source_sheet);

      si (current.normalized_name !== p.normalized_name) {
        duplicates.push({
          référence : p.référence,
          conservé : nom.actuel,
          alternative : p.nom
        });
      }
    }

    retour {
      produits:[...parRef.valeurs()],
      doublons
    };
  }

  fonction analyzeWorkbook(arrayBuffer, nom_fichier='') {
    si (!global.XLSX) {
      throw new Error('La bibliothèque XLSX est absente. Rechargez la page.');
    }

    si (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength === 0) {
      throw new Error('Le fichier sélectionné est vide ou illisible.');
    }

    si (nom_de_fichier && !/\.(xlsx|xls)$/i.test(nom_de_fichier)) {
      throw new Error('Choisissez un fichier Excel .xlsx ou .xls.');
    }

    const classeur = global.XLSX.read(arrayBuffer, {
      type:'tableau',
      cellDates:true
    });

    si (!workbook.SheetNames.length) {
      throw new Error('Le classeur ne contient aucune feuille.');
    }

    const sheets = workbook.SheetNames.map(name => parseSheet(workbook, name));
    const all = sheets.flatMap(s => s.products);
    const deduped = deduplicate(all);

    si (!deduped.products.length) {
      throw new Error('Aucun produit Sligro reconnu. Vérifiez la structure du fichier.');
    }

    retour {
      fournisseur : 'Sligro',
      établissement:détecÉtablissement(classeur, nom_de_fichier),
      nom de fichier,
      feuilles:sheets.map(s => ({
        nom:s.sheetName,
        zone:s.zone,
        nombre:s.produits.longueur
      })),
      produits:deduped.products,
      doublons:deduped.doublons,
      avertissements :sheets.flatMap(s => s.warnings),
      statistiques:{
        lignesReconnues:all.length,
        uniqueProducts:deduped.products.length,
        duplicateReferences:all.length-deduped.products.length
      }
    };
  }

  fonction compareCatalog(existant, entrant) {
    const oldMap = new Map(
      (existant || []).map(p => [
        Chaîne(p.reference ?? p.sku ?? '').trim(),
        p
      ])
    );

    const newMap = new Map(
      (entrant || []).map(p => [
        Chaîne(p.reference).trim(),
        p
      ])
    );

    const ajouté = [];
    const modifié = [];
    const inchangé = [];
    const manquant = [];

    pour (const [ref, p] de newMap) {
      const vieux = vieuxMap.get(ref);

      si (!ancien) {
        ajouté.pousser(p);
        continuer;
      }

      const changes = {};
      const oldArea = old.area ?? old.location ?? '';
      const newArea = (p.areas || [p.area]).filter(Boolean).join(', ');

      paires constantes = {
        nom:[normalizeName(old.name), normalizeName(p.name)],
        catégorie:[normaliser(ancienne.catégorie), normaliser(p.catégorie)],
        zone : [normaliser (ancienne zone), normaliser (nouvelle zone)]
      };

      Objet.entrées(paires).forEach(([clé, [avant, après]]) => {
        si (avant !== après) {
          changements[clé] = {de:avant, à:après};
        }
      });

      si (Object.keys(changes).length || old.active === false) {
        modifié.push({
          avant : vieux,
          après:p,
          changements
        });
      } autre {
        inchangé.pousser(p);
      }
    }

    pour (const [ref, p] de oldMap) {
      si (ref && !newMap.has(ref)) {
        manquant.pousser(p);
      }
    }

    retour {
      ajouta
      modifié,
      inchangé,
      manquant,
      résumé:{
        ajouté:ajouté.longueur,
        modifié:longueur.modifiée,
        inchangé:longueur inchangée,
        manquant:longueur manquante
      }
    };
  }

  fonction getVenueSelect() {
    retourner global.document?.getElementById('orionVenue') || null;
  }

  fonction fillVenueSelectFromGlobalData() {
    const select = getVenueSelect();
    si (!select) retourner faux ;

    const currentValue = select.value;
    const venueList = Array.isArray(global.venues) ? global.venues : [];

    sélectionner.innerHTML =
      '<option value="">Choisir l'établissement</option>' +
      venueList.map(v =>
        `<option value="${String(v.id)}">${String(v.name ?? '')}</option>`
      ).rejoindre('');

    si (currentValue && venueList.some(v => String(v.id) === String(currentValue))) {
      sélectionner.valeur = valeur_actuelle;
    } else if (global.selectedVenue && global.selectedVenue !== 'all') {
      sélectionner.valeur = global.lieu sélectionné;
    }

    retourner venueList.length > 0 ;
  }

  fonction selectVenueByDetectedName(detectedName) {
    const select = getVenueSelect();
    if (!select || !detectedName || detectedName === 'À confirmer') return false;

    const détecté = normaliserNom(nomdétecté);
    const options = [...select.options];

    const exact = options.find(option =>
      normalizeName(option.textContent) === détecté
    );

    const partial = options.find(option => {
      const nom = normalizeName(option.textContent);

      si (détecté.inclut('DANISH')) {
        retourner nom.includes('DANISH');
      }

      si (détecté.include('ELYSEE')) {
        retourner nom.includes('ELYSEE');
      }

      renvoyer faux ;
    });

    const correspondance = exact || partiel;

    si (!match) retourner faux ;

    sélectionner.valeur = match.valeur;
    select.dispatchEvent(new Event('change', {bubbles:true}));
    renvoyer vrai ;
  }

  fonction startVenueAutoRefresh() {
    soit tentatives = 0 ;

    const timer = global.setInterval(() => {
      tentatives += 1 ;

      const remplie =
        (typeof global.fillOrionVenues === 'function' &&
          (() => {
            essayer {
              global.fillOrionVenues();
              retourner getVenueSelect()?.options.length > 1;
            } attraper {
              renvoyer faux ;
            }
          })(
        ) || remplirVenueSelectFromGlobalData();

      si (rempli || tentatives >= 20) {
        global.clearInterval(timer);
      }
    }, 250);
  }

  fonction initialiserOrionUi() {
    global.addEventListener('load', () => {
      démarrerVenueAutoRefresh();
    });

    global.document?.addEventListener('click', event => {
      const button = event.target.closest?.('[data-view="orion"]');

      si (bouton) {
        démarrerVenueAutoRefresh();
      }
    });

    global.document?.addEventListener('change', async event => {
      const input = event.target;

      si (!input || input.id !== 'orionFile') retourner;

      const fichier = input.files?.[0];
      si (!fichier) retourner;

      essayer {
        const analyse = analyzeWorkbook(await file.arrayBuffer(), file.name);
        const sélectionné = sélectionnerVenueByNomDétecté(analyse.établissement);
        const message = global.document.getElementById('orionMessage');

        si (message) {
          si (sélectionné) {
            message.innerHTML =
              `<div class="notice success">` +
              `${analysis.establishment} détecté automatiquement. ` +
              `L'établissement correspondant a été sélectionné.` +
              `</div>`;
          } autre {
            message.innerHTML =
              `<div class="notice">` +
              `${analysis.establishment} détecté. ` +
              `Veuillez confirmer l'établissement avant l'analyse.` +
              `</div>`;
          }
        }
      } attraper {
        /* Le bouton Analyser affichera le message d'erreur complet. */
      }
    });
  }

  global.ORIONImport = {
    version : '0.3.0',
    normaliser,
    normaliserNom,
    analyser le classeur,
    comparerCatalogue,
    analyserSheet,
    dédupliquer,
    sélectionnerLieuParNomDétecté,
    remplirVenueSelectFromGlobalData
  };

  initialiserOrionUi();
})(typeof window !== 'undefined' ? window : globalThis);
