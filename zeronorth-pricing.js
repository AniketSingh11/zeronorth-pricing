(function(){
  'use strict';

  /* ============================================================
   * DATA — mirrors _new_logic/constants.ts exactly
   * ========================================================= */
  var FAMILIES = {
    OPERATOR:  'Operator products',
    BUNKER:    'Bunker solutions',
    SMARTSHIP: 'SMARTShip'
  };

  var PRODUCTS = [
    { id:'voyage-optimisation', name:'Voyage Optimisation', family:FAMILIES.OPERATOR, monthlyPerUnitFee:550, unitName:'vessel',
      tooltip:'An integrated software tool enabling operators to plan efficient, safe, and commercially compliant voyages using highly accurate vessel models. In addition, a dedicated services team will monitor your fleet, providing weather safety notifications, and deviations alerts.' },
    { id:'vessel-reporting', name:'Vessel Reporting', family:FAMILIES.OPERATOR, monthlyPerUnitFee:200, oneTimePerUnitFee:100, unitName:'vessel',
      tooltip:'Cloud-based noon reporting application designed to conduct vessel reporting, ensuring high data quality with over 200 validation points' },
    { id:'vessel-optimisation', name:'Vessel Optimisation', family:FAMILIES.OPERATOR, monthlyPerUnitFee:325, oneTimePerUnitFee:100, unitName:'vessel',
      tooltip:'A proactive analytics tool using fuel models and bio-fouling insights to pinpoint and analyze vessel overconsumption (Main Engine, Aux, Boiler) and hull condition impact' },
    { id:'scope-3-reporting', name:'Scope 3 Reporting', family:FAMILIES.OPERATOR, variableFeeText:'$50 per voyage',
      tooltip:'A specialized platform designed for streamlined tracking, management, and reporting of voyage charter Scope 3 emissions, centralizing data for easier compliance' },
    { id:'charter-select', name:'Charter Select', family:FAMILIES.OPERATOR, monthlyFlatFee:3000,
      tooltip:'A data-driven tool for pre-fixture analysis, helping users compare and select the best-performing vessel using accurate predictions' },
    { id:'bunker-procurement', name:'Bunker Procurement', family:FAMILIES.BUNKER, monthlyPerUnitFee:0.2, unitName:'ton',
      tooltip:'An integrated digital platform for managing the end-to-end bunker fuel procurement lifecycle, encompassing pre-planning, supplier negotiation, order management, and post-delivery claims' },
    { id:'bunker-pricer', name:'Bunker Pricer', family:FAMILIES.BUNKER, monthlyFlatFee:2500,
      tooltip:'A market intelligence platform providing precise, transaction-backed live and forward bunker fuel prices across 170+ global ports, accessed via web interface and data exports' },
    { id:'bunker-planner', name:'Bunker Planner', family:FAMILIES.BUNKER, monthlyPerUnitFee:125, unitName:'vessel',
      tooltip:'An integrated planning tool that determines the optimal time, location, and quantity to bunker by analyzing real-time prices in the context of a vessel\'s specific voyage.' },
    { id:'ebdn', name:'eBDN', family:FAMILIES.BUNKER, monthlyPerUnitFee:400, unitName:'barge',
      tooltip:'A digital solution for creating, managing, and sharing electronic Bunker Delivery Notes (eBDNs) and associated documentation, replacing manual paper-based processes' },
    { id:'smartship-cloud', name:'SMARTShip Cloud', family:FAMILIES.SMARTSHIP, monthlyPerUnitFee:1750, oneTimePerUnitFee:500, unitName:'vessel',
      tooltip:'Connecting directly to customers high-frequency IoT provider - SMARTShip Cloud leverages real-time, high-frequency sensor data from shipboard systems to deliver advanced analytics, proactive maintenance, and fleet-wide optimisation. Built for full-fleet digital integration, it enables owners and managers to drive operational efficiency, safety, compliance, and profitability' },
    { id:'smartship-edge', name:'SMARTShip Edge', family:FAMILIES.SMARTSHIP, monthlyPerUnitFee:1750, oneTimePerUnitFee:15000, unitName:'vessel',
      tooltip:'Following installation of ZeroNorth\'s high-frequency sensor equipment, SMARTShip Edge leverages real-time, high-frequency sensor data from shipboard systems to deliver advanced analytics, proactive maintenance, and fleet-wide optimisation. Built for full-fleet digital integration, it enables owners and managers to drive operational efficiency, safety, compliance, and profitability' },
    { id:'smartship-prime', name:'SMARTShip Prime', family:FAMILIES.SMARTSHIP, monthlyPerUnitFee:700, oneTimePerUnitFee:500, unitName:'vessel',
      tooltip:'A cost-effective, noon-report-based version of SMARTShip designed for vessels without high-frequency sensor data. It consolidates key performance analytics, regulatory monitoring, and reporting into a unified platform using manual data submissions, AIS, and weather data. It serves as a starting point for digitalisation without requiring hardware investment' }
  ];

  var INTEGRATIONS = {
    operator: [
      { id:'vms-inbound', name:'Standard customer to ZeroNorth VMS integration', price:2500 },
      { id:'imos-outbound', name:'Standard IMOS ZeroNorth to Customer Integration', price:2500 },
      { id:'noon-report-operator', name:'Customer external noon report integration to ZeroNorth', price:2500 },
      { id:'class-society', name:'ZeroNorth to class society/verifier integration', price:2500 },
      { id:'baltic-exchange', name:'Baltic exchange integration', price:0 }
    ],
    bunker: [
      { id:'vms-two-way', name:'VMS two-way integration', price:5000, dependsOn:'bunker-procurement' },
      { id:'platts', name:'Platts integration', price:0, dependsOn:'bunker-procurement' },
      { id:'erp', name:'ZeroNorth to customer ERP integration', price:250, isTandM:true, dependsOn:'bunker-procurement' },
      { id:'barge-planning', name:'Barge planning system two-way integration', price:0, dependsOn:'ebdn' },
      { id:'backfilling', name:'Backfilling of historical transaction data', price:2500, dependsOn:'bunker-procurement' }
    ],
    smartship: [
      { id:'sensor-data', name:'Sensor data inbound integration', price:10000, hasQuantity:true },
      { id:'noon-report-smartship', name:'Customer external noon report integration to ZeroNorth', price:2500 }
    ]
  };

  var IMPLEMENTATION_FEE = 4500;
  var ADDITIONAL_TRAINING_FEE = 500;
  var SMARTSHIP_INSTALLATION_ESTIMATE = 7500;

  /* ============================================================
   * STATE
   * ========================================================= */
  var state = {
    selectedProducts:    {},
    selectedIntegrations:{},
    counts:              {},   // count-<id>, hours-<id>, quantity-<id>, addon-*, count-addon-*, trainings
    intReviewed:         false
  };

  /* ============================================================
   * QUOTE CALCULATION — mirrors _new_logic/utils.ts
   * ========================================================= */
  function getCount(productId){
    var v = state.counts['count-' + productId];
    if (typeof v === 'number' && !isNaN(v)) return v;
    return 1; // default 1 (matches utils.ts)
  }

  function getEffectiveIntegrations(){
    var eff = {};
    Object.keys(state.selectedIntegrations).forEach(function(k){ eff[k] = state.selectedIntegrations[k]; });
    var all = INTEGRATIONS.operator.concat(INTEGRATIONS.bunker, INTEGRATIONS.smartship);
    all.forEach(function(int){
      if (
        (int.id === 'noon-report-smartship' && state.selectedProducts['smartship-prime'] && !state.selectedProducts['vessel-reporting']) ||
        (int.id === 'noon-report-operator' && state.selectedProducts['vessel-optimisation'] && !state.selectedProducts['vessel-reporting']) ||
        (int.id === 'sensor-data' && state.selectedProducts['smartship-cloud']) ||
        (int.id === 'class-society' && (state.counts['addon-classIntegration'] || state.counts['addon-dnvIntegration']))
      ) {
        eff[int.id] = true;
      }
    });
    return eff;
  }

  function getImplFees(){
    var ids = Object.keys(state.selectedProducts).filter(function(k){ return state.selectedProducts[k]; });
    var op = ids.filter(function(id){ var p = findProduct(id); return p && p.family === FAMILIES.OPERATOR; });
    var operator = op.length > 0 && !(op.length === 1 && op[0] === 'scope-3-reporting');
    var bk = ids.filter(function(id){ var p = findProduct(id); return p && p.family === FAMILIES.BUNKER; });
    var bunker = bk.filter(function(id){ return id !== 'bunker-pricer' && id !== 'bunker-planner'; }).length > 0;
    var smartship = ids.some(function(id){ var p = findProduct(id); return p && p.family === FAMILIES.SMARTSHIP; });
    return { operator: operator, bunker: bunker, smartship: smartship };
  }

  function findProduct(id){ for (var i=0;i<PRODUCTS.length;i++) if (PRODUCTS[i].id===id) return PRODUCTS[i]; return null; }

  function calculateQuote(){
    var oneTimeItems = [], oneTimeSum = 0;
    var recurringItems = [], recurringSum = 0;
    var implFees = getImplFees();

    if (implFees.operator)  { oneTimeSum += IMPLEMENTATION_FEE; oneTimeItems.push({ description:'Operator Implementation Fee', amount:IMPLEMENTATION_FEE }); }
    if (implFees.bunker)    { oneTimeSum += IMPLEMENTATION_FEE; oneTimeItems.push({ description:'Bunker Solutions Implementation Fee', amount:IMPLEMENTATION_FEE }); }
    if (implFees.smartship) { oneTimeSum += IMPLEMENTATION_FEE; oneTimeItems.push({ description:'SMARTShip Implementation Fee', amount:IMPLEMENTATION_FEE }); }

    var eff = getEffectiveIntegrations();

    if (eff['noon-report-operator'] || eff['noon-report-smartship']) {
      oneTimeSum += 2500;
      oneTimeItems.push({ description:'Integration: Customer external noon report integration to ZeroNorth', amount:2500 });
    }

    var allInts = INTEGRATIONS.operator.concat(INTEGRATIONS.bunker, INTEGRATIONS.smartship);
    Object.keys(eff).forEach(function(id){
      if (id === 'noon-report-operator' || id === 'noon-report-smartship') return;
      if (!eff[id]) return;
      var int = null;
      for (var i=0;i<allInts.length;i++) if (allInts[i].id===id) { int=allInts[i]; break; }
      if (!int) return;
      if (int.isTandM) {
        var hours = (state.counts['hours-'+id] || 0);
        var cost = hours * int.price;
        oneTimeSum += cost;
        oneTimeItems.push({ description:'T&M: '+int.name+' '+hours+' hrs', amount:cost });
      } else if (int.hasQuantity) {
        var qty = (state.counts['quantity-'+id] || 1);
        var c2 = qty * int.price;
        oneTimeSum += c2;
        oneTimeItems.push({ description:'Integration: '+int.name+' Qty: '+qty, amount:c2 });
      } else {
        oneTimeSum += int.price;
        oneTimeItems.push({ description:'Integration: '+int.name, amount:int.price });
      }
    });

    PRODUCTS.forEach(function(p){
      if (state.selectedProducts[p.id] && p.oneTimePerUnitFee) {
        var c = getCount(p.id);
        if (c > 0) {
          var cost = c * p.oneTimePerUnitFee;
          oneTimeSum += cost;
          var label = p.id === 'smartship-edge'
            ? 'SMARTShip High-Frequency Equipment '+c+' '+p.unitName+'s'
            : 'Onboarding: '+p.name+' '+c+' '+p.unitName+'s';
          oneTimeItems.push({ description:label, amount:cost });
        }
      }
    });

    if (state.selectedProducts['smartship-edge']) {
      var edgeVessels = getCount('smartship-edge');
      if (edgeVessels > 0) {
        var supplierCount = (state.counts['count-addon-supplierCoordination'] || 0);
        if (supplierCount > 0) {
          var sCost = supplierCount * 1000;
          oneTimeSum += sCost;
          oneTimeItems.push({ description:'Edge Add-on: 3rd party supplier coordination '+supplierCount+' vessels', amount:sCost });
        }
        var crewCount = (state.counts['count-addon-crewInstallation'] || 0);
        if (crewCount > 0) {
          var crCost = crewCount * 2500;
          oneTimeSum += crCost;
          oneTimeItems.push({ description:'Edge Add-on: Crew installation w/ remote support '+crewCount+' vessels', amount:crCost });
        }
        var installVessels = Math.max(0, edgeVessels - crewCount);
        if (installVessels > 0) {
          var iCost = installVessels * SMARTSHIP_INSTALLATION_ESTIMATE;
          oneTimeSum += iCost;
          oneTimeItems.push({ description:'SMARTShip Equipment Installation estimate for '+installVessels+' vessels', amount:iCost });
        }
      }
    }

    var trainingCount = (state.counts['trainings'] || 0);
    if (trainingCount > 0) {
      var tCost = trainingCount * ADDITIONAL_TRAINING_FEE;
      oneTimeSum += tCost;
      oneTimeItems.push({ description:'Additional Training Sessions', amount:tCost });
    }

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

    var opVessels = getCount('vessel-reporting');
    if (state.selectedProducts['vessel-reporting'] && opVessels > 0) {
      if (state.counts['addon-emissionsAnalytics']) {
        recurringSum += opVessels * 50;
        recurringItems.push({ description:'Vessel Rep. Add-on: Emissions Analytics', amount:opVessels*50 });
        if (state.counts['addon-dnvIntegration']) {
          recurringSum += opVessels * 100;
          recurringItems.push({ description:'Vessel Rep. Add-on: DNV Veracity Integration', amount:opVessels*100 });
        }
        if (state.counts['addon-classIntegration']) {
          recurringSum += opVessels * 50;
          recurringItems.push({ description:'Vessel Rep. Add-on: Class Society Emissions Integration', amount:opVessels*50 });
        }
      }
    }

    var voCount = getCount('vessel-optimisation');
    if (state.selectedProducts['vessel-optimisation'] && voCount > 0 && state.counts['addon-vesselOptProfServices']) {
      recurringSum += voCount * 50;
      recurringItems.push({ description:'Vessel Opt. Add-on: Professional Services', amount:voCount*50 });
    }

    var smartshipTypes = [{ id:'smartship-cloud', s:'cloud' }, { id:'smartship-edge', s:'edge' }];
    smartshipTypes.forEach(function(t){
      var c = getCount(t.id);
      if (state.selectedProducts[t.id] && c > 0) {
        if (state.counts['addon-vio-'+t.s]) {
          recurringSum += c * 200;
          recurringItems.push({ description:(t.s==='cloud'?'Cloud':'Edge')+' Add-on: VIO data exchange', amount:c*200 });
        }
        if (state.counts['addon-noon-'+t.s] && !state.selectedProducts['vessel-reporting']) {
          recurringSum += c * 150;
          recurringItems.push({ description:(t.s==='cloud'?'Cloud':'Edge')+' Add-on: Noon report integration', amount:c*150 });
        }
        if (state.counts['addon-asset-ai-'+t.s]) {
          recurringSum += c * 300;
          recurringItems.push({ description:(t.s==='cloud'?'Cloud':'Edge')+' Add-on: Asset AI plus Predictive Maintenance', amount:c*300 });
        }
      }
    });

    // Full Suite Discount
    var operatorRequired = PRODUCTS.filter(function(p){ return p.family === FAMILIES.OPERATOR && p.id !== 'scope-3-reporting' && p.id !== 'charter-select'; });
    var allOps = operatorRequired.every(function(p){ return state.selectedProducts[p.id]; });
    if (allOps && state.counts['addon-emissionsAnalytics'] && state.counts['addon-voyopsZnOnboard'] && state.counts['addon-vesselOptProfServices'] && state.counts['addon-voyopsProfServices']) {
      var disc = recurringSum * 0.1;
      recurringItems.push({ description:'Full Suite Discount 10% off recurring costs', amount:-disc });
      recurringSum -= disc;
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
    var families = [FAMILIES.OPERATOR, FAMILIES.BUNKER, FAMILIES.SMARTSHIP];
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
    var countKey = 'count-'+p.id;
    var c = getCount(p.id);

    if (showUnit) {
      html += '<div class="zn-input-row">';
      html += '<label for="zn-c-'+p.id+'">'+escapeHtml(unitLabelText(p))+'</label>';
      html += '<input id="zn-c-'+p.id+'" class="zn-input zn-count-input" data-id="'+p.id+'" type="number" min="1" value="'+c+'" />';
      html += '</div>';
    }

    if (p.id === 'smartship-edge' && c > 0) {
      html += '<div class="zn-note"><p>Note:</p><p>Installation and logistics is charged separately from SMARTShip Equipment. Installation via sub-contractors is provided at cost with prices ranging from USD 5,200 in India to 10,000 in Europe. Quote summary includes an estimate, but actual cost will depend on specific installation needs. Logistics is charged time &amp; material + 10%.</p></div>';
    }

    html += renderAddons(p, c);

    container.innerHTML = html;
  }

  function renderAddons(p, unitCount){
    var allowed = ['bunker-pricer','voyage-optimisation','vessel-reporting','vessel-optimisation','smartship-cloud','smartship-edge'];
    if (allowed.indexOf(p.id) === -1) return '';
    var rows = [];

    if (p.id === 'smartship-edge' && unitCount > 0) {
      rows.push(qtyAddon('count-addon-supplierCoordination', '3rd party supplier coordination', unitCount));
      rows.push(qtyAddon('count-addon-crewInstallation', 'Crew installation w/ remote support', unitCount));
    }

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
    if (p.id === 'vessel-reporting') {
      rows.push(cb('addon-emissionsAnalytics','Emissions Analytics','An analytical module that builds upon the validated data collected through ZeroNorth\u2019s Vessel Reporting to deliver specialized insights, reports, and simulations focused on voyage, vessel, and fleet emissions, particularly concerning CII regulations.'));
      rows.push(cb('addon-classIntegration','Class Society Emissions Integration','A one-way integration from ZeroNorth to a class-society/emissions verifier allowing noon-report data from Vessel Reporting and Emissions Analytics to flow automatically for verification','addon-emissionsAnalytics'));
      rows.push(cb('addon-dnvIntegration','DNV Veracity Emissions Integration','An add-on integrating DNV\u2019s Emissions Connect service with the ZeroNorth platform, enabling streamlined verification of emissions data managed through Vessel Reporting and Emissions Analytics.','addon-emissionsAnalytics'));
    }
    if (p.id === 'vessel-optimisation') rows.push(cb('addon-vesselOptProfServices','Professional Services','An outsourced performance team of maritime specialists who transform the insights from the platform into actionable strategies. Our experts continuously monitor your vessel\u2019s hull and propeller performance to provide tailored recommendations on the optimal timing for cleanings. This data-driven approach is designed to minimise fuel consumption, reduce emissions, and increase revenue, while clear validation reports ensure you can demonstrate compliance with charter party agreements.'));
    if (p.id === 'smartship-cloud' || p.id === 'smartship-edge') {
      var s = p.id.split('-')[1];
      rows.push(cb('addon-vio-'+s,'VIO data exchange'));
      if (!state.selectedProducts['vessel-reporting']) rows.push(cb('addon-noon-'+s,'Noon report integration'));
      rows.push(cb('addon-asset-ai-'+s,'Asset AI plus Predictive Maintenance'));
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
    var any = fees.operator || fees.bunker || fees.smartship;
    document.getElementById('zn-impl-card').style.display = any ? '' : 'none';
    var rows = [
      { key:'operator', label:'Operator Implementation fee', tooltip:'Covers 6x product trainings per selected product, tenant creation and configuration, data backfilling, and general orchestration of the onboarding process' },
      { key:'bunker', label:'Bunker Solutions Implementation fee', tooltip:'Covers 6x product trainings per selected product, tenant creation and configuration, and general orchestration of the onboarding process' },
      { key:'smartship', label:'SMARTShip Implementation fee', tooltip:'Covers 6x product trainings per selected product, tenant creation and configuration, data migration and backfill, and general orchestration of the onboarding process' }
    ];
    var html = rows.map(function(r){
      if (!fees[r.key]) return '';
      return '<div class="zn-impl-row"><input type="checkbox" class="zn-cb zn-cb-locked" checked /><label>'+escapeHtml(r.label)+'</label>'+tooltipHTML(r.tooltip)+'</div>';
    }).join('');
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

  function getIntegrationLockState(intId){
    var locked = false;
    var eff = getEffectiveIntegrations();
    var autoSelected = eff[intId] && !state.selectedIntegrations[intId];
    if (
      (intId === 'noon-report-smartship' && state.selectedProducts['smartship-prime'] && !state.selectedProducts['vessel-reporting']) ||
      (intId === 'noon-report-operator' && state.selectedProducts['vessel-optimisation'] && !state.selectedProducts['vessel-reporting']) ||
      (intId === 'sensor-data' && state.selectedProducts['smartship-cloud']) ||
      (intId === 'class-society' && (state.counts['addon-classIntegration'] || state.counts['addon-dnvIntegration']))
    ) { locked = true; }
    var isNoonSmart = !!(state.selectedIntegrations['noon-report-smartship'] || (state.selectedProducts['smartship-prime'] && !state.selectedProducts['vessel-reporting']));
    var isNoonOp = !!(state.selectedIntegrations['noon-report-operator'] || (state.selectedProducts['vessel-optimisation'] && !state.selectedProducts['vessel-reporting']));
    if (intId === 'noon-report-smartship' && isNoonOp) locked = true;
    if (intId === 'noon-report-operator' && isNoonSmart) locked = true;
    return { locked:locked, autoSelected:autoSelected };
  }

  function renderIntegrations(){
    var fams = activeFamilies();
    var anyProduct = Object.keys(state.selectedProducts).some(function(k){ return state.selectedProducts[k]; });
    document.getElementById('zn-int-card').style.display = anyProduct ? '' : 'none';

    var groups = [
      { family:FAMILIES.OPERATOR, items:INTEGRATIONS.operator, key:'operator' },
      { family:FAMILIES.BUNKER, items:INTEGRATIONS.bunker, key:'bunker' },
      { family:FAMILIES.SMARTSHIP, items:INTEGRATIONS.smartship, key:'smartship' }
    ];

    var html = '';
    groups.forEach(function(g){
      if (!fams[g.family]) return;
      var visible = g.items.filter(function(int){
        if (int.id === 'noon-report-operator' && state.selectedProducts['vessel-reporting']) return false;
        if (int.dependsOn && !state.selectedProducts[int.dependsOn]) return false;
        if (int.id === 'sensor-data' && !state.selectedProducts['smartship-cloud']) return false;
        if (int.id === 'noon-report-smartship' && state.selectedProducts['vessel-reporting']) return false;
        return true;
      });
      if (visible.length === 0) return;
      html += '<div class="zn-int-group">';
      html += '<h3>'+escapeHtml(g.family)+' Integrations</h3>';
      visible.forEach(function(int){
        var lock = getIntegrationLockState(int.id);
        var checked = state.selectedIntegrations[int.id] || lock.autoSelected;
        html += '<div class="zn-int-row">';
        html += '<input type="checkbox" class="zn-cb zn-int-cb" data-id="'+int.id+'" '+(checked?'checked':'')+' '+(lock.locked?'disabled':'')+' />';
        html += '<label>'+escapeHtml(int.name)+'</label>';
        if (int.isTandM) {
          var hours = (state.counts['hours-'+int.id] || 0);
          html += '<div class="zn-int-controls"><span class="zn-meta">Hours</span><input class="zn-input zn-int-hours" data-id="'+int.id+'" type="number" min="0" value="'+hours+'" /></div>';
        } else if (int.hasQuantity) {
          var q = (state.counts['quantity-'+int.id] || 1);
          html += '<div class="zn-int-controls"><span class="zn-meta">Quantity</span><input class="zn-input zn-int-qty" data-id="'+int.id+'" type="number" min="1" value="'+q+'" /></div>';
        }
        html += '</div>';
      });
      html += '</div>';
    });

    if (!html) html = '<p class="zn-summary-empty" style="text-align:left;">No integrations apply for the products you selected.</p>';

    document.getElementById('zn-int').innerHTML = html;
  }

  function renderTraining(){
    var any = Object.keys(state.selectedProducts).some(function(k){ return state.selectedProducts[k]; });
    document.getElementById('zn-training-card').style.display = any ? '' : 'none';
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
    if (fees.operator)  items.push('Operator implementation');
    if (fees.bunker)    items.push('Bunker solutions implementation');
    if (fees.smartship) items.push('SMARTShip implementation');

    // Integrations
    var eff = getEffectiveIntegrations();
    var allInts = INTEGRATIONS.operator.concat(INTEGRATIONS.bunker, INTEGRATIONS.smartship);
    Object.keys(eff).forEach(function(id){
      if (!eff[id]) return;
      var int = null; for (var i=0;i<allInts.length;i++) if (allInts[i].id===id){int=allInts[i];break;}
      if (int) items.push('Integration: '+int.name);
    });

    // Add-ons (visible: just the toggles that are on)
    var addonLabels = {
      'addon-bunkerPricerApi':'Bunker Pricer API',
      'addon-voyopsZnOnboard':'VoyOps: ZN Onboard',
      'addon-voyopsProfServices':'VoyOps: Professional Services',
      'addon-emissionsAnalytics':'Vessel Reporting: Emissions Analytics',
      'addon-classIntegration':'Vessel Reporting: Class Society Integration',
      'addon-dnvIntegration':'Vessel Reporting: DNV Veracity Integration',
      'addon-vesselOptProfServices':'Vessel Optimisation: Professional Services',
      'addon-vio-cloud':'SMARTShip Cloud: VIO data exchange',
      'addon-noon-cloud':'SMARTShip Cloud: Noon report integration',
      'addon-asset-ai-cloud':'SMARTShip Cloud: Asset AI + Predictive Maintenance',
      'addon-vio-edge':'SMARTShip Edge: VIO data exchange',
      'addon-noon-edge':'SMARTShip Edge: Noon report integration',
      'addon-asset-ai-edge':'SMARTShip Edge: Asset AI + Predictive Maintenance'
    };
    Object.keys(addonLabels).forEach(function(k){
      if (state.counts[k]) items.push(addonLabels[k]);
    });

    if ((state.counts['trainings']||0) > 0) {
      items.push('Additional training: '+state.counts['trainings']+' session'+(state.counts['trainings']>1?'s':''));
    }

    var ul = document.getElementById('zn-summary-items');
    if (items.length === 0) {
      ul.innerHTML = '<li class="zn-summary-empty">Nothing selected yet — start picking products to build your package.</li>';
    } else {
      ul.innerHTML = items.map(function(i){ return '<li>'+escapeHtml(i)+'</li>'; }).join('');
    }
  }

  function renderProgress(){
    var anyProduct = Object.keys(state.selectedProducts).some(function(k){ return state.selectedProducts[k]; });
    var intCard = document.getElementById('zn-int-card');
    var intVisible = intCard && intCard.style.display !== 'none';
    var intReviewed = !!state.intReviewed && intVisible;
    var ready = anyProduct && (intVisible ? intReviewed : true);

    setStep('products', anyProduct);
    setStep('integrations', intReviewed);
    setStep('ready', ready);

    var btn = document.getElementById('zn-continue');
    var hint = document.getElementById('zn-continue-hint');
    btn.disabled = !ready;
    if (!anyProduct) hint.textContent = 'Select at least one product to continue.';
    else if (intVisible && !intReviewed) hint.textContent = 'Confirm you\'ve reviewed the integration options to continue.';
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
    renderIntegrations();
    renderTraining();
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

  function onIntToggle(e){
    var id = e.target.getAttribute('data-id');
    state.selectedIntegrations[id] = e.target.checked;
    renderAll();
  }

  function onIntHours(e){
    var id = e.target.getAttribute('data-id');
    var v = parseInt(e.target.value, 10);
    state.counts['hours-'+id] = isNaN(v) ? 0 : v;
    renderSummaryItems();
  }
  function onIntQty(e){
    var id = e.target.getAttribute('data-id');
    var v = parseInt(e.target.value, 10);
    state.counts['quantity-'+id] = isNaN(v) || v < 1 ? 1 : v;
    renderSummaryItems();
  }

  function onIntConfirm(e){
    state.intReviewed = e.target.checked;
    renderProgress();
  }

  function onTrainings(e){
    var v = parseInt(e.target.value, 10);
    state.counts['trainings'] = isNaN(v) || v < 0 ? 0 : v;
    renderSummaryItems();
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
      integrations: (function(){
        var eff = getEffectiveIntegrations();
        var allInts = INTEGRATIONS.operator.concat(INTEGRATIONS.bunker, INTEGRATIONS.smartship);
        return Object.keys(eff).filter(function(k){ return eff[k]; }).map(function(id){
          var int = null; for (var i=0;i<allInts.length;i++) if (allInts[i].id===id){int=allInts[i];break;}
          var entry = { id:id, name: int ? int.name : id };
          if (state.counts['hours-'+id]) entry.hours = state.counts['hours-'+id];
          if (state.counts['quantity-'+id]) entry.quantity = state.counts['quantity-'+id];
          return entry;
        });
      })(),
      addons: Object.keys(state.counts).filter(function(k){
        return /^addon-/.test(k) && state.counts[k];
      }),
      trainings: state.counts['trainings'] || 0,
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
  }

  function onBack(){
    document.getElementById('zn-builder').classList.remove('is-email-step');
    document.getElementById('zn-email-step').classList.remove('is-active');
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
    delegate('.zn-int-cb', 'change', onIntToggle);
    delegate('.zn-int-hours', 'input', onIntHours);
    delegate('.zn-int-qty', 'input', onIntQty);

    document.getElementById('zn-int-confirm').addEventListener('change', onIntConfirm);
    document.getElementById('zn-trainings').addEventListener('input', onTrainings);
    document.getElementById('zn-continue').addEventListener('click', onContinue);
    document.getElementById('zn-back').addEventListener('click', onBack);

    // Tier "Customise this plan" buttons — pre-select products and scroll to builder
    var tierPresets = {
      operator:  ['voyage-optimisation', 'vessel-reporting'],
      smartship: ['smartship-cloud'],
      bunker:    ['bunker-pricer', 'bunker-procurement']
    };
    document.querySelectorAll('.zn-tier-cta').forEach(function(btn){
      btn.addEventListener('click', function(){
        var tier = btn.getAttribute('data-tier');
        var preset = tierPresets[tier] || [];
        // Reset selections so each plan choice gives a clean starting state
        state.selectedProducts = {};
        state.selectedIntegrations = {};
        state.intReviewed = false;
        var intConfirm = document.getElementById('zn-int-confirm');
        if (intConfirm) intConfirm.checked = false;
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