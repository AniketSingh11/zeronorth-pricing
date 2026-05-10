(function(){
  'use strict';

  /* ============================================================
   * DATA — mirrors _new_logic/constants.ts exactly
   * ========================================================= */
  var FAMILIES = {
    VESSEL: 'Vessel',
    VOYAGE: 'Voyage',
    FUEL:   'Fuel'
  };

  var PRODUCTS = [
    // VESSEL
    { id:'smartship-professional', name:'SMARTShip Professional', family:FAMILIES.VESSEL, monthlyPerUnitFee:1750, oneTimePerUnitFee:15000, unitName:'vessel',
      tooltip:'Following installation of ZeroNorth\'s high-frequency sensor equipment, SMARTShip Professional leverages real-time, high-frequency sensor data from shipboard systems to deliver advanced analytics, proactive maintenance, and fleet-wide optimisation. Built for full-fleet digital integration, it enables owners and managers to drive operational efficiency, safety, compliance, and profitability' },
    { id:'smartship-prime', name:'SMARTShip Prime', family:FAMILIES.VESSEL, monthlyPerUnitFee:700, oneTimePerUnitFee:500, unitName:'vessel',
      tooltip:'A cost-effective, noon-report-based version of SMARTShip designed for vessels without high-frequency sensor data. It consolidates key performance analytics, regulatory monitoring, and reporting into a unified platform using manual data submissions, AIS, and weather data. It serves as a starting point for digitalisation without requiring hardware investment' },
    { id:'charter-select', name:'Charter Select', family:FAMILIES.VESSEL, monthlyFlatFee:3000,
      tooltip:'A data-driven tool for pre-fixture analysis, helping users compare and select the best-performing vessel using accurate predictions' },

    // VOYAGE
    { id:'voyage-optimisation', name:'Voyage Optimisation', family:FAMILIES.VOYAGE, monthlyPerUnitFee:550, unitName:'vessel',
      tooltip:'An integrated software tool enabling operators to plan efficient, safe, and commercially compliant voyages using highly accurate vessel models. In addition, a dedicated services team will monitor your fleet, providing weather safety notifications, and deviations alerts.' },
    { id:'vessel-reporting', name:'Vessel Reporting', family:FAMILIES.VOYAGE, monthlyPerUnitFee:200, oneTimePerUnitFee:100, unitName:'vessel',
      tooltip:'Cloud-based noon reporting application designed to conduct vessel reporting, ensuring high data quality with over 200 validation points' },
    { id:'emissions-analytics', name:'Emissions Analytics', family:FAMILIES.VOYAGE, monthlyPerUnitFee:50, unitName:'vessel',
      tooltip:'An analytical module that delivers specialized insights, reports, and simulations focused on voyage, vessel, and fleet emissions, particularly concerning CII regulations.' },
    { id:'scope-3-reporting', name:'Scope 3 Reporting', family:FAMILIES.VOYAGE, variableFeeText:'$50 per voyage',
      tooltip:'A specialized platform designed for streamlined tracking, management, and reporting of voyage charter Scope 3 emissions, centralizing data for easier compliance' },

    // FUEL
    { id:'bunker-procurement', name:'Bunker Procurement', family:FAMILIES.FUEL, monthlyPerUnitFee:0.2, unitName:'ton',
      tooltip:'An integrated digital platform for managing the end-to-end bunker fuel procurement lifecycle, encompassing pre-planning, supplier negotiation, order management, and post-delivery claims' },
    { id:'bunker-pricer', name:'Bunker Pricer', family:FAMILIES.FUEL, monthlyFlatFee:2500,
      tooltip:'A market intelligence platform providing precise, transaction-backed live and forward bunker fuel prices across 170+ global ports, accessed via web interface and data exports' },
    { id:'ebdn', name:'eBDN', family:FAMILIES.FUEL, monthlyPerUnitFee:400, unitName:'barge',
      tooltip:'A digital solution for creating, managing, and sharing electronic Bunker Delivery Notes (eBDNs) and associated documentation, replacing manual paper-based processes' }
  ];

  var IMPLEMENTATION_FEE = 4500;

  /* ============================================================
   * STATE
   * ========================================================= */
  var state = {
    selectedProducts:    {},
    counts:              {}    // count-<id>, addon-*, count-addon-*
  };

  /* ============================================================
   * QUOTE CALCULATION — mirrors _new_logic/utils.ts
   * ========================================================= */
  function getCount(productId){
    var v = state.counts['count-' + productId];
    if (typeof v === 'number' && !isNaN(v)) return v;
    return 1; // default 1 (matches utils.ts)
  }

  function getImplFees(){
    var ids = Object.keys(state.selectedProducts).filter(function(k){ return state.selectedProducts[k]; });
    // Voyage Implementation: applies if VoyOps or VesRep is selected
    var voyage = ids.indexOf('voyage-optimisation') !== -1 || ids.indexOf('vessel-reporting') !== -1;
    // Vessel Implementation: applies if SMARTShip Professional or SMARTShip Prime is selected
    var vessel = ids.indexOf('smartship-professional') !== -1 || ids.indexOf('smartship-prime') !== -1;
    // Fuel Implementation: applies if Bunker Procurement or eBDN is selected (not Pricer alone)
    var fuel = ids.indexOf('bunker-procurement') !== -1 || ids.indexOf('ebdn') !== -1;
    return { vessel: vessel, voyage: voyage, fuel: fuel };
  }

  function findProduct(id){ for (var i=0;i<PRODUCTS.length;i++) if (PRODUCTS[i].id===id) return PRODUCTS[i]; return null; }

  function calculateQuote(){
    var oneTimeItems = [], oneTimeSum = 0;
    var recurringItems = [], recurringSum = 0;
    var implFees = getImplFees();

    if (implFees.vessel) { oneTimeSum += IMPLEMENTATION_FEE; oneTimeItems.push({ description:'Vessel Implementation Fee', amount:IMPLEMENTATION_FEE }); }
    if (implFees.voyage) { oneTimeSum += IMPLEMENTATION_FEE; oneTimeItems.push({ description:'Voyage Implementation Fee', amount:IMPLEMENTATION_FEE }); }
    if (implFees.fuel)   { oneTimeSum += IMPLEMENTATION_FEE; oneTimeItems.push({ description:'Fuel Implementation Fee', amount:IMPLEMENTATION_FEE }); }

    PRODUCTS.forEach(function(p){
      if (state.selectedProducts[p.id] && p.oneTimePerUnitFee) {
        var c = getCount(p.id);
        if (c > 0) {
          var cost = c * p.oneTimePerUnitFee;
          oneTimeSum += cost;
          var label = p.id === 'smartship-professional'
            ? 'SMARTShip High-Frequency Equipment '+c+' '+p.unitName+'s'
            : 'Onboarding: '+p.name+' '+c+' '+p.unitName+'s';
          oneTimeItems.push({ description:label, amount:cost });
        }
      }
    });

    // RECURRING
    PRODUCTS.forEach(function(p){
      if (!state.selectedProducts[p.id]) return;
      if (p.monthlyFlatFee) {
        recurringSum += p.monthlyFlatFee;
        recurringItems.push({ description:'Software: '+p.name, amount:p.monthlyFlatFee });
      }
      if (p.monthlyPerUnitFee) {
        var c = getCount(p.id);
        if (c > 0) {
          var cost = c * p.monthlyPerUnitFee;
          recurringSum += cost;
          var unitText = p.id === 'bunker-procurement'
            ? c.toLocaleString()+' tons/month'
            : c+' '+p.unitName+(c>1?'s':'');
          recurringItems.push({ description:'Software: '+p.name+' '+unitText, amount:cost });
        }
      }
      if (p.variableFeeText) {
        recurringItems.push({ description:'Usage Fee: '+p.name, amount:null, variableText:p.variableFeeText });
      }
    });

    if (state.selectedProducts['bunker-pricer'] && state.counts['addon-bunkerPricerApi']) {
      recurringSum += 2500;
      recurringItems.push({ description:'Add-on: Bunker Pricer API', amount:2500 });
    }

    var voy = getCount('voyage-optimisation');
    if (state.selectedProducts['voyage-optimisation'] && voy > 0) {
      if (state.counts['addon-voyopsZnOnboard']) {
        recurringSum += voy * 100;
        recurringItems.push({ description:'VoyOps Add-on: ZN Onboard', amount:voy*100 });
      }
      if (state.counts['addon-voyopsProfServices']) {
        recurringSum += voy * 100;
        recurringItems.push({ description:'VoyOps Add-on: Professional Services', amount:voy*100 });
      }
    }

    return { oneTimeItems:oneTimeItems, oneTimeSum:oneTimeSum, recurringItems:recurringItems, recurringSum:recurringSum };
  }

  /* ============================================================
   * RENDER
   * ========================================================= */
  function tooltipHTML(text){
    if (!text) return '';
    return '<span class="zn-tooltip"><span class="zn-tooltip-trigger">i</span><span class="zn-tooltip-text">'+escapeHtml(text)+'</span></span>';
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function renderProducts(){
    var root = document.getElementById('zn-products');
    var html = '';
    var families = [FAMILIES.VESSEL, FAMILIES.VOYAGE, FAMILIES.FUEL];
    families.forEach(function(family){
      html += '<div class="zn-family">';
      html += '<h3>'+family+'</h3>';
      html += '<div class="zn-product-grid">';
      PRODUCTS.filter(function(p){ return p.family === family; }).forEach(function(p){
        html += '<div class="zn-product-row" data-product="'+p.id+'">';
        html += '<div class="zn-row-line">';
        html += '<input type="checkbox" class="zn-cb zn-product-cb" data-id="'+p.id+'" id="zn-p-'+p.id+'" />';
        html += '<label for="zn-p-'+p.id+'">'+escapeHtml(p.name)+'</label>';
        html += tooltipHTML(p.tooltip);
        html += '</div>';
        html += '<div class="zn-product-inputs" id="zn-pi-'+p.id+'"></div>';
        html += '</div>';
      });
      html += '</div></div>';
    });
    root.innerHTML = html;
  }

  function unitLabelText(p){
    if (p.id === 'bunker-procurement') return 'Expected volume tons/month';
    return 'Select number of ' + p.unitName + 's';
  }

  function renderProductInputs(p){
    var container = document.getElementById('zn-pi-'+p.id);
    if (!container) return;
    if (!state.selectedProducts[p.id]) { container.innerHTML = ''; return; }

    var html = '';
    var showUnit = !!(p.oneTimePerUnitFee || p.monthlyPerUnitFee);
    var c = getCount(p.id);

    if (showUnit) {
      html += '<div class="zn-input-row">';
      html += '<label for="zn-c-'+p.id+'">'+escapeHtml(unitLabelText(p))+'</label>';
      html += '<input id="zn-c-'+p.id+'" class="zn-input zn-count-input" data-id="'+p.id+'" type="number" min="1" value="'+c+'" />';
      html += '</div>';
    }

    html += renderAddons(p, c);

    container.innerHTML = html;
  }

  function renderAddons(p, unitCount){
    var allowed = ['bunker-pricer','voyage-optimisation','vessel-reporting'];
    if (allowed.indexOf(p.id) === -1) return '';
    var rows = [];

    function cb(id, label, tooltip, parentDepId){
      if (parentDepId && !state.counts[parentDepId]) return '';
      var checked = !!state.counts[id];
      return '<div class="zn-addon-row">'
        + '<input type="checkbox" class="zn-cb zn-addon-cb" data-id="'+id+'" id="zn-a-'+id+'" '+(checked?'checked':'')+' />'
        + '<label for="zn-a-'+id+'">'+escapeHtml(label)+'</label>'
        + tooltipHTML(tooltip)
        + '</div>';
    }

    if (p.id === 'bunker-pricer') rows.push(cb('addon-bunkerPricerApi','Bunker Pricer API'));
    if (p.id === 'voyage-optimisation') {
      rows.push(cb('addon-voyopsZnOnboard','ZN Onboard','ZeroNorth Onboard enables Customer to allow for a vessel master and crew on a particular vessel to access certain key planning features of the Voyage Optimisation Solution, including generating optimised voyage plans prior to a vessel\u2019s departure and enroute and live tracking of ongoing voyages and updated weather forecasts.'));
      rows.push(cb('addon-voyopsProfServices','Professional Services','Pre-voyage, ZeroNorth will generate the initial VOP to lighten the workload for the customer. Further, as part of professional service package, ZeroNorth will share updated VOP\u2019s both in normal- and bad weather conditions ensuring customers always have access to safe and commercially optimal routes. Lastly, customers will gain access to mid-of-voyage and end-of-voyage reports to help charterers access vessel performance against TC terms.'));
    }

    var valid = rows.filter(function(r){ return !!r; });
    if (valid.length === 0) return '';
    return '<div class="zn-addons"><div class="zn-addons-title">Available Add-ons</div>'+valid.join('')+'</div>';
  }

  function qtyAddon(id, label, max){
    var v = (state.counts[id] || 0);
    return '<div class="zn-input-row">'
      + '<label for="zn-q-'+id+'">'+escapeHtml(label)+'</label>'
      + '<input id="zn-q-'+id+'" class="zn-input zn-qty-input" data-id="'+id+'" data-max="'+max+'" type="number" value="'+v+'" min="0" max="'+max+'" />'
      + '</div>';
  }


  function renderImpl(){
    var fees = getImplFees();
    var fams = activeFamilies();
    var anyProduct = Object.keys(state.selectedProducts).some(function(k){ return state.selectedProducts[k]; });
    // Show the implementation step whenever any product is selected — even if
    // no implementation fee actually applies (e.g. Scope 3 Reporting alone).
    document.getElementById('zn-impl-card').style.display = anyProduct ? '' : 'none';
    var rows = [
      { key:'vessel', family:FAMILIES.VESSEL, label:'Vessel Implementation fee', tooltip:'Covers product training, tenant creation and configuration, data migration and backfill, and general orchestration of the onboarding process' },
      { key:'voyage', family:FAMILIES.VOYAGE, label:'Voyage Implementation fee', tooltip:'Covers product training, tenant creation and configuration, data backfilling, and general orchestration of the onboarding process' },
      { key:'fuel',   family:FAMILIES.FUEL,   label:'Fuel Implementation fee', tooltip:'Covers product training, tenant creation and configuration, and general orchestration of the onboarding process' }
    ];
    var html = rows.map(function(r){
      if (!fams[r.family]) return '';
      var applies = !!fees[r.key];
      return '<div class="zn-impl-row"><input type="checkbox" class="zn-cb zn-cb-locked" '+(applies?'checked':'')+' /><label>'+escapeHtml(r.label)+'</label>'+tooltipHTML(r.tooltip)+'</div>';
    }).join('');
    if (!html) html = '<p class="zn-summary-empty" style="text-align:left;">No implementation fee applies for the products you selected.</p>';
    document.getElementById('zn-impl').innerHTML = html;
  }

  function activeFamilies(){
    var s = {};
    Object.keys(state.selectedProducts).forEach(function(id){
      if (state.selectedProducts[id]) {
        var p = findProduct(id);
        if (p) s[p.family] = true;
      }
    });
    return s;
  }

  function renderSummaryItems(){
    var items = [];

    // Products
    PRODUCTS.forEach(function(p){
      if (!state.selectedProducts[p.id]) return;
      var c = getCount(p.id);
      var unit = p.unitName ? (p.id === 'bunker-procurement' ? c.toLocaleString()+' tons/month' : c+' '+p.unitName+(c>1?'s':'')) : '';
      items.push(p.name + (unit ? ' — '+unit : ''));
    });

    // Auto impl
    var fees = getImplFees();
    if (fees.vessel) items.push('Vessel implementation');
    if (fees.voyage) items.push('Voyage implementation');
    if (fees.fuel)   items.push('Fuel implementation');

    // Add-ons (visible: just the toggles that are on)
    var addonLabels = {
      'addon-bunkerPricerApi':'Bunker Pricer API',
      'addon-voyopsZnOnboard':'Voyage Optimisation: ZN Onboard',
      'addon-voyopsProfServices':'Voyage Optimisation: Professional Services'
    };
    Object.keys(addonLabels).forEach(function(k){
      if (state.counts[k]) items.push(addonLabels[k]);
    });

    var ul = document.getElementById('zn-summary-items');
    if (items.length === 0) {
      ul.innerHTML = '<li class="zn-summary-empty">Nothing selected yet — start picking products to build your package.</li>';
    } else {
      ul.innerHTML = items.map(function(i){ return '<li>'+escapeHtml(i)+'</li>'; }).join('');
    }
  }

  function renderProgress(){
    var anyProduct = Object.keys(state.selectedProducts).some(function(k){ return state.selectedProducts[k]; });
    var ready = anyProduct;

    setStep('products', anyProduct);
    setStep('ready', ready);

    var btn = document.getElementById('zn-continue');
    var hint = document.getElementById('zn-continue-hint');
    btn.disabled = !ready;
    if (!anyProduct) hint.textContent = 'Select at least one product to continue.';
    else hint.textContent = 'Ready — get your personalised package by email.';
  }
  function setStep(name, done){
    var el = document.querySelector('.zn-progress-step[data-step="'+name+'"]');
    if (!el) return;
    if (done) el.classList.add('is-done'); else el.classList.remove('is-done');
  }

  function renderAll(){
    PRODUCTS.forEach(function(p){
      var row = document.querySelector('.zn-product-row[data-product="'+p.id+'"]');
      if (row) {
        var cb = row.querySelector('.zn-product-cb');
        if (cb) cb.checked = !!state.selectedProducts[p.id];
        if (state.selectedProducts[p.id]) row.classList.add('is-selected'); else row.classList.remove('is-selected');
      }
      renderProductInputs(p);
    });
    renderImpl();
    renderSummaryItems();
    renderProgress();
  }

  /* ============================================================
   * EVENT WIRING
   * ========================================================= */
  function onProductToggle(e){
    var id = e.target.getAttribute('data-id');
    state.selectedProducts[id] = e.target.checked;
    renderAll();
  }

  function onCountChange(e){
    var id = e.target.getAttribute('data-id');
    var v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    state.counts['count-'+id] = v;
    renderAll();
  }

  function onAddonToggle(e){
    var id = e.target.getAttribute('data-id');
    state.counts[id] = e.target.checked;
    renderAll();
  }

  function onQtyAddonChange(e){
    var id = e.target.getAttribute('data-id');
    var max = parseInt(e.target.getAttribute('data-max'), 10) || 0;
    var v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    if (max && v > max) v = max;
    state.counts[id] = v;
    renderAll();
  }

  /* ============================================================
   * EMAIL STEP
   * ========================================================= */
  function buildPayload(){
    var quote = calculateQuote();
    var fmt = function(n){ return (n!==null && n!==undefined) ? '$'+Number(n).toLocaleString(undefined,{maximumFractionDigits:2}) : ''; };

    var lines = [];
    lines.push('=== ZeroNorth Custom Package Request ===');
    lines.push('');
    lines.push('ONE-TIME COSTS:');
    if (quote.oneTimeItems.length === 0) {
      lines.push('  (none)');
    } else {
      quote.oneTimeItems.forEach(function(i){ lines.push('  - '+i.description+': '+fmt(i.amount)); });
      lines.push('  Subtotal: '+fmt(quote.oneTimeSum));
    }
    lines.push('');
    lines.push('MONTHLY RECURRING COSTS:');
    if (quote.recurringItems.length === 0) {
      lines.push('  (none)');
    } else {
      quote.recurringItems.forEach(function(i){
        lines.push('  - '+i.description+': '+(i.amount!==null ? fmt(i.amount) : (i.variableText||'')));
      });
      lines.push('  Subtotal: '+fmt(quote.recurringSum)+' / month');
    }
    lines.push('');
    lines.push('=== End of priced quote ===');

    var json = {
      products: Object.keys(state.selectedProducts).filter(function(k){ return state.selectedProducts[k]; }).map(function(id){
        var p = findProduct(id);
        return { id:id, name:p ? p.name : id, count: getCount(id) };
      }),
      addons: Object.keys(state.counts).filter(function(k){
        return /^addon-/.test(k) && state.counts[k];
      }),
      pricing: {
        oneTimeSum: quote.oneTimeSum,
        recurringSum: quote.recurringSum,
        oneTimeItems: quote.oneTimeItems,
        recurringItems: quote.recurringItems
      }
    };

    return {
      summary: lines.join('\n'),
      json: JSON.stringify(json, null, 2),
      oneTimeSum: quote.oneTimeSum,
      recurringSum: quote.recurringSum
    };
  }

  function onContinue(){
    if (document.getElementById('zn-continue').disabled) return;
    document.getElementById('zn-builder').classList.add('is-email-step');
    document.getElementById('zn-email-step').classList.add('is-active');

    // Build the package payload and inject it into the Pardot iframe via URL params.
    // Pardot maps query string params to hidden fields with matching names, then passes
    // them through to Salesforce on submit. Make sure your Pardot form has hidden fields
    // named exactly: package, quote_summary, one_time_total, recurring_total
    var payload = buildPayload();
    var iframe = document.getElementById('zn-pardot-iframe');
    var base = iframe.getAttribute('data-pardot-base') || '';
    if (!base || base.indexOf('REPLACE_ME') !== -1) {
      console.warn('[ZN] Pardot form URL not set. Update data-pardot-base on #zn-pardot-iframe.');
      return;
    }
    var params = new URLSearchParams();
    params.set('package',         payload.json);
    params.set('quote_summary',   payload.summary);
    params.set('one_time_total',  String(payload.oneTimeSum));
    params.set('recurring_total', String(payload.recurringSum));
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    iframe.src = base + sep + params.toString();
    // Arm the iframe: the next 'load' event after this one will be a post-submit
    // load (Pardot redirects the iframe to its thank-you page after successful submit),
    // so we use that to swap in our own thank-you panel.
    state.iframeArmed = true;
    state.iframeLoadCount = 0;
  }

  function onBack(){
    document.getElementById('zn-builder').classList.remove('is-email-step');
    document.getElementById('zn-email-step').classList.remove('is-active');
    // Reset thank-you state so the form is usable again on next Continue
    var wrap = document.getElementById('zn-iframe-wrap');
    var hint = document.getElementById('zn-iframe-hint');
    var thanks = document.getElementById('zn-thanks');
    if (wrap) wrap.style.display = '';
    if (hint) hint.style.display = '';
    if (thanks) thanks.style.display = 'none';
    state.iframeArmed = false;
    state.iframeLoadCount = 0;
  }

  /* ============================================================
   * INIT
   * ========================================================= */
  function delegate(selector, evt, handler){
    document.getElementById('zn-builder').addEventListener(evt, function(e){
      if (e.target.matches(selector)) handler(e);
    });
  }

  function init(){
    renderProducts();
    renderAll();

    delegate('.zn-product-cb', 'change', onProductToggle);
    delegate('.zn-count-input', 'change', onCountChange);
    delegate('.zn-count-input', 'input', onCountChange);
    delegate('.zn-addon-cb', 'change', onAddonToggle);
    delegate('.zn-qty-input', 'change', onQtyAddonChange);
    delegate('.zn-qty-input', 'input', onQtyAddonChange);

    document.getElementById('zn-continue').addEventListener('click', onContinue);
    document.getElementById('zn-back').addEventListener('click', onBack);

    // Detect successful form submit: after Continue, the iframe re-loads with the
    // Pardot URL + params (load #1). When the user submits, Pardot redirects the
    // iframe to its thank-you/success URL (load #2). We use that second load to
    // swap in our own thank-you panel.
    var iframe = document.getElementById('zn-pardot-iframe');
    if (iframe) {
      iframe.addEventListener('load', function(){
        if (!state.iframeArmed) return;
        state.iframeLoadCount = (state.iframeLoadCount || 0) + 1;
        if (state.iframeLoadCount >= 2) {
          var wrap = document.getElementById('zn-iframe-wrap');
          var hint = document.getElementById('zn-iframe-hint');
          var thanks = document.getElementById('zn-thanks');
          if (wrap) wrap.style.display = 'none';
          if (hint) hint.style.display = 'none';
          if (thanks) thanks.style.display = 'block';
          state.iframeArmed = false;
        }
      });
    }

    // Tier "Customise this plan" buttons — pre-select products and scroll to builder
    var tierPresets = {
      vessel: ['smartship-professional'],
      voyage: ['voyage-optimisation', 'vessel-reporting'],
      fuel:   ['bunker-pricer', 'bunker-procurement']
    };
    document.querySelectorAll('.zn-tier-cta').forEach(function(btn){
      btn.addEventListener('click', function(){
        var tier = btn.getAttribute('data-tier');
        var preset = tierPresets[tier] || [];
        // Reset selections so each plan choice gives a clean starting state
        state.selectedProducts = {};
        preset.forEach(function(pid){ state.selectedProducts[pid] = true; });
        renderAll();
        // Scroll the user to the builder
        var target = document.querySelector('.zn-main');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
