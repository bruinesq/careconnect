// ─── CONSTANTS ───────────────────────────────────────────────────────────
  const LAB_REF = {
    "Sodium":          {min:135,  max:145,  unit:"mmol/L", rec:"Critical for hydration. If low, consider sodium levels."},
    "Potassium":       {min:3.5,  max:5.2,  unit:"mEq/L",  rec:"Monitor for heart rhythm or muscle weakness."},
    "Chloride":        {min:96,   max:106,  unit:"mmol/L", rec:"Check metabolic balance."},
    "Ionized Calcium": {min:1.15, max:1.35, unit:"mmol/L", rec:"Monitor bone and nerve transmission."},
    "TCO2":            {min:23,   max:30,   unit:"mmol/L", rec:"Check metabolic pH levels."},
    "Glucose":         {min:70,   max:99,   unit:"mg/dL",  rec:"Normal fasting range. If low, provide sugar."},
    "BUN":             {min:7,    max:20,   unit:"mg/dL",  rec:"High level may suggest dehydration."},
    "Creatinine":      {min:0.7,  max:1.3,  unit:"mg/dL",  rec:"Indicator of kidney filtration."},
    "Hematocrit":      {min:41,   max:50,   unit:"%",      rec:"Low may indicate anemia; High may be dehydration."},
    "Hemoglobin":      {min:13.5, max:17.5, unit:"g/dL",  rec:"Oxygen-carrying capacity of blood."},
    "Anion Gap":       {min:3,    max:11,   unit:"mEq/L",  rec:"Check for metabolic acidosis if high."}
  };

  const MED_DOSES = {
    "Keppra":"15ml","Levothyroxine":"0.88mcg","Hydrocortisone":"15mg",
    "Desmopressin":"0.15mg","Miralax":"as needed","Juice":"as needed",
    "GH":"0.4ml","Protein":"1oz"
  };

  const CAT_CONFIG = {
    'Medication':{label:'Meds',    icon:'💊',bg:'#fff9c4',border:'border-yellow-200',header:'bg-yellow-500'},
    'Routine':   {label:'Tasks',   icon:'✅',bg:'#f3f4f6',border:'border-slate-200', header:'bg-slate-500'},
    'Water':     {label:'Water',   icon:'💧',bg:'#e0f2fe',border:'border-blue-200',  header:'bg-blue-500'},
    'Urine':     {label:'Urine',   icon:'🟡',bg:'#ffedd5',border:'border-orange-200',header:'bg-orange-500'},
    'BM':        {label:'BM',      icon:'💩',bg:'#f5ebe0',border:'border-amber-200', header:'bg-amber-600'},
    'Labs':      {label:'Labs',    icon:'🔬',bg:'#e0e7ff',border:'border-indigo-200',header:'bg-indigo-500'},
    'Report':    {label:'Reports', icon:'📄',bg:'#f0fdf4',border:'border-green-200', header:'bg-green-500'}
  };

  const BM_OPTIONS = [
    {key:'S',label:'S — Small',  display:'S',  color:'#d97706'},
    {key:'M',label:'M — Medium', display:'M',  color:'#b45309'},
    {key:'L',label:'L — Large',  display:'L',  color:'#92400e'},
    {key:'D',label:'Diarrhea',   display:'💦', color:'#0369a1'}
  ];

  // Enforced chronological order for med groups
  var MED_GROUP_ORDER = ["6:00 AM","12:00 PM","5:00 PM","6:00 PM"];
  // Correct 6AM order per user request
  var CORRECT_6AM_ORDER = ["Levothyroxine","Hydrocortisone","Keppra","Desmopressin"];

  // ─── STATE ───────────────────────────────────────────────────────────────
  var state = {
    view:'dash', allLogs:[], category:'Meds',
    deviceCG: localStorage.getItem('deviceCG')||'',
    caregiver: localStorage.getItem('activeCG')||'',
    caregivers:["Mary","Jon","Rafi","Maverick"],
    waterLimit:1200, offset:parseInt(localStorage.getItem('travelOffset'))||0,
    ghCount:0, ghResetDate:'',
    labHistoryIndex:0, labDrawDate:'', labDrawTime:'',
    labEntryValues:{}, labEntryKeys:[], labEntryCurrentIdx:0,
    aiRecs:null, analysisHtml:null, dragSrc:null,
    meds:{
      "6:00 AM":["Levothyroxine","Hydrocortisone","Keppra","Desmopressin"],
      "12:00 PM":["Miralax","Juice"],
      "5:00 PM":["Desmopressin","GH"],
      "6:00 PM":["Protein","Hydrocortisone","Keppra","Cortef"]
    },
    tasks:{
      "General":["Wash face","Brush teeth","G-Tube Gauze","Clean Nose/Ears","Eye Drops","Shower"],
      "Therapy":["Nebulizer 1","CoughAssist 1","Nebulizer 2","CoughAssist 2","Nebulizer 3","CoughAssist 3","Walk/Gait","Standing","Hand Exercises","Mindgames"]
    }
  };

  // Universal keypad state
  var kp = {
    volDigits:'', timeDigits:'', ampm:'',
    activeField:'vol', mode:'vol+time',
    label:'', volLabel:'Amount', onConfirm:null,
    isUrine:false, isEst:false
  };

  // ─── INIT ────────────────────────────────────────────────────────────────
  window.onload = function() {
    setDateToToday();
    state.view='dash';
    state.category='Meds'; // always start on Meds
    if(state.offset!==0) document.getElementById('travel-btn').classList.remove('grayscale','opacity-20');
    if(!state.deviceCG){
      showDevicePicker();
    } else {
      if(!state.caregiver){
        state.caregiver=state.deviceCG;
        localStorage.setItem('activeCG',state.caregiver);
      }
      loadData();
    }
    setInterval(loadData,15000);
    startMidnightWatcher();
    var wire=function(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',fn);};
    wire('btn-meds',  function(){state.category='Meds'; nav('dash');});
    wire('btn-tasks', function(){state.category='Tasks';nav('dash');});
    wire('btn-dash',  function(){nav('dash');});
    wire('btn-fluids',function(){nav('fluids');});
    wire('btn-logs',  function(){nav('logs');});
    wire('btn-labs',  function(){nav('labs');});
    var dn=document.getElementById('date-navigator');
    if(dn)dn.addEventListener('change',function(){loadData();});
  };

  // ─── FIRST-LAUNCH DEVICE PICKER ──────────────────────────────────────────
  function showDevicePicker(){
    var modal=document.getElementById('modal-container');
    modal.innerHTML=
      '<div style="position:fixed;inset:0;background:#1e293b;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;">'+
        '<div style="width:80px;height:80px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:24px;">💙</div>'+
        '<div style="font-size:24px;font-weight:900;color:#ffffff;margin-bottom:8px;text-align:center;">Welcome to</div>'+
        '<div style="font-size:22px;font-weight:900;color:#60a5fa;margin-bottom:4px;text-align:center;">Ryan\'s CareConnect</div>'+
        '<div style="font-size:14px;color:#94a3b8;margin-bottom:40px;text-align:center;">Who uses this device?</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:280px;">'+
          ["Mary","Jon","Rafi","Maverick"].map(function(name){
            return '<button class="device-pick" data-name="'+name+'" style="width:100%;padding:18px;border-radius:20px;font-size:18px;font-weight:900;background:#334155;color:#f1f5f9;border:2px solid #475569;">'+name+'</button>';
          }).join('')+
        '</div>'+
      '</div>';
    document.querySelectorAll('.device-pick').forEach(function(btn){
      btn.addEventListener('click',function(){
        var name=this.getAttribute('data-name');
        state.deviceCG=name;
        state.caregiver=name;
        localStorage.setItem('deviceCG',name);
        localStorage.setItem('activeCG',name);
        document.getElementById('modal-container').innerHTML='';
        loadData();
        showToast('Welcome, '+name+'! 👋','success');
      });
    });
  }

  function setDateToToday() {
    var d=getAdjustedDate();
    document.getElementById('date-navigator').value=
      d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function startMidnightWatcher() {
    var last=getAdjustedDateString();
    setInterval(function(){
      var n=getAdjustedDateString();
      if(n!==last){last=n;setDateToToday();loadData();showToast('New day — '+n,'info');}
    },30000);
  }

  function getAdjustedDate(){var d=new Date();d.setHours(d.getHours()+state.offset);return d;}
  function getAdjustedDateString(){var d=getAdjustedDate();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

  function toggleTravel(){
    var off=prompt('Timezone Offset? (e.g. -3 for Bahamas, 0 for CA):',state.offset);
    if(off!==null){
      state.offset=parseInt(off)||0;
      localStorage.setItem('travelOffset',state.offset);
      var btn=document.getElementById('travel-btn');
      if(state.offset===0){btn.classList.add('grayscale','opacity-20');}
      else{btn.classList.remove('grayscale','opacity-20');}
      setDateToToday();loadData();
      showToast('Travel: '+(state.offset>=0?'+':'')+state.offset+'h','info');
    }
  }

  function getCurrentTime(){
    var d=getAdjustedDate();
    var h=d.getHours()%12||12,m=d.getMinutes(),ap=d.getHours()>=12?'PM':'AM';
    return h+':'+(m<10?'0':'')+m+' '+ap;
  }

  var isLoading=false;
  function loadData(){
    if(isLoading) return;
    isLoading=true;
    var sel=document.getElementById('date-navigator').value;
    // Fetch logs for selected date + lab logs from past 60 days
    var labCutoff=new Date();labCutoff.setDate(labCutoff.getDate()-60);
    var labDate=labCutoff.getFullYear()+'-'+String(labCutoff.getMonth()+1).padStart(2,'0')+'-'+String(labCutoff.getDate()).padStart(2,'0');

    Promise.all([
      // Current date logs
      sbGet('logs','date=eq.'+sel+'&order=created_at.asc'),
      // Lab logs from past 60 days
      sbGet('logs','type=eq.Labs&date=gte.'+labDate+'&order=date.desc,created_at.desc'),
      // Settings
      sbGet('settings','select=key,value')
    ]).then(function(results){
      var dayLogs=results[0]||[];
      var labLogs=results[1]||[];
      var settings=results[2]||[];
      // Debug: log first row to check date format
      if(dayLogs.length>0) console.log('Sample log:',JSON.stringify(dayLogs[0]));
      else console.log('No logs for:',sel);

      // Normalize all log dates to YYYY-MM-DD string format
      function normalizeDate(val) {
        if (!val) return '';
        if (typeof val === 'string') {
          // Handle ISO format: 2026-05-13T07:00:00+00:00 → 2026-05-13
          return val.substring(0, 10);
        }
        if (val instanceof Date) {
          return val.getFullYear()+'-'+String(val.getMonth()+1).padStart(2,'0')+'-'+String(val.getDate()).padStart(2,'0');
        }
        return val.toString().substring(0, 10);
      }

      // Merge: day logs + lab logs (deduplicate by id)
      var seen={};
      var allLogs=[];
      dayLogs.concat(labLogs).forEach(function(l){
        if(!seen[l.id]){
          seen[l.id]=true;
          l.date=normalizeDate(l.date); // normalize date field
          allLogs.push(l);
        }
      });
      state.allLogs=allLogs;

      // Parse settings
      var settingsMap={};
      settings.forEach(function(s){settingsMap[s.key]=s.value;});
      state.waterLimit=parseInt(settingsMap['water_limit'])||1200;

      // GH counter
      var ghCount=parseInt(settingsMap['gh_count'])||0;
      var ghResetDate=settingsMap['gh_reset_date']||'';
      if(typeof ghCount==='number') state.ghCount=ghCount;
      if(ghResetDate) state.ghResetDate=ghResetDate;

      // Auto-sync GH from logs if 0
      if(state.ghCount===0){
        var ghLogs=state.allLogs.filter(function(l){
          return l.type==='Medication'&&(l.amount||'').toLowerCase().includes('gh');
        }).sort(function(a,b){return b.date.localeCompare(a.date)||timeToMinutes(b.time)-timeToMinutes(a.time);});
        if(ghLogs.length>0){
          var match=(ghLogs[0].amount||'').match(/Dose\s+(\d+)\s*\//i);
          if(match){
            var syncedCount=parseInt(match[1]);
            state.ghCount=syncedCount;
            sbUpsert('settings',[{key:'gh_count',value:syncedCount.toString()},{key:'gh_reset_date',value:''}]);
          }
        }
      }

      // Schedule
      console.log('Settings keys:', Object.keys(settingsMap));
      console.log('Schedule raw:', settingsMap['schedule']);
      if(settingsMap['schedule']){
        try{
          var sched=JSON.parse(settingsMap['schedule']);
          console.log('Schedule parsed:', JSON.stringify(sched).substring(0,200));
          if(sched.meds) state.meds=sched.meds;
          if(sched.routine&&!sched.tasks) state.tasks=sched.routine;
          else if(sched.tasks) state.tasks=sched.tasks;
        }catch(e){
          console.error('Schedule parse error:',e);
        }
      } else {
        console.log('No schedule in settings — using defaults');
      }

      // One-time 6AM order migration
      var migrated=false;
      if(state.meds['6:00 AM']){
        var current6am=state.meds['6:00 AM'].join(',');
        if(current6am!==CORRECT_6AM_ORDER.join(',')){
          var known=CORRECT_6AM_ORDER.filter(function(m){return state.meds['6:00 AM'].indexOf(m)!==-1;});
          var extra=state.meds['6:00 AM'].filter(function(m){return CORRECT_6AM_ORDER.indexOf(m)===-1;});
          state.meds['6:00 AM']=known.concat(extra);
          migrated=true;
        }
      }
      var orderedMeds={};
      MED_GROUP_ORDER.forEach(function(g){if(state.meds[g])orderedMeds[g]=state.meds[g];});
      Object.keys(state.meds).forEach(function(g){if(!orderedMeds[g])orderedMeds[g]=state.meds[g];});
      if(JSON.stringify(Object.keys(state.meds))!==JSON.stringify(Object.keys(orderedMeds))){
        state.meds=orderedMeds;migrated=true;
      }
      if(migrated&&!localStorage.getItem('migrated_v2')){
        localStorage.setItem('migrated_v2','1');
        saveScheduleToSheet();
      }
      isLoading=false;
      render();
    }).catch(function(err){
      isLoading=false;
      showToast('Load error: '+err.message,'error');
      console.error('loadData error:',err);
    });
  }

  function timeToMinutes(t){
    if(!t||typeof t!=='string')return 0;
    try{
      var parts=t.trim().split(' ');if(parts.length<2)return 0;
      var tp=parts[0].split(':');if(tp.length<2)return 0;
      var h=parseInt(tp[0]),m=parseInt(tp[1]);
      if(isNaN(h)||isNaN(m))return 0;
      if(h===12)h=0;
      var total=h*60+m;
      if(parts[1].toUpperCase()==='PM')total+=720;
      return total;
    }catch(e){return 0;}
  }

  function smartTime(i){
    if(!i||i.trim()==='')return getCurrentTime();
    var clean=i.toLowerCase().replace(/\s/g,'');
    var hrs,mins=0,ampm='';
    if(clean.includes('a')){ampm='AM';clean=clean.replace('a','');}
    else if(clean.includes('p')){ampm='PM';clean=clean.replace('p','');}
    if(clean.length<=2){hrs=parseInt(clean);}
    else{hrs=parseInt(clean.slice(0,-2));mins=parseInt(clean.slice(-2));}
    if(!ampm){ampm=(hrs>=7&&hrs<=11)?'AM':'PM';}
    hrs=hrs%12||12;
    return hrs+':'+(mins<10?'0'+mins:mins)+' '+ampm;
  }

  function render(){
    var sel=document.getElementById('date-navigator').value;
    var logs=state.allLogs.filter(function(l){return l.date===sel;});
    var c=document.getElementById('view-container');if(!c)return;
    console.log('render: view='+state.view+' category='+state.category+' logs='+logs.length);
    ['meds','tasks','fluids','logs','labs','dash'].forEach(function(t){
      var b=document.getElementById('btn-'+t);if(!b)return;
      var active=(t==='meds'  && state.view==='dash' && state.category==='Meds')
              ||(t==='tasks'  && state.view==='dash' && state.category==='Tasks')
              ||(t==='dash'   && state.view==='dash')
              ||(t===state.view && state.view!=='dash');
      b.style.color=active?'#60a5fa':'#64748b';
    });
    if(state.view==='dash')renderDash(c,logs);
    else if(state.view==='fluids')renderInOutput(c,logs);
    else if(state.view==='logs')renderLogs(c,logs);
    else if(state.view==='labs')renderLabs(c,logs);
  }

  // ─── DASH ────────────────────────────────────────────────────────────────
  function renderDash(el,logs){
    try {
    var sk=state.category.toLowerCase(); // 'meds' or 'tasks'
    var schedule=state[sk];
    console.log('renderDash: sk='+sk+' schedule='+JSON.stringify(schedule).substring(0,100));
    // Guard: if schedule not yet loaded, show loading state
    if(!schedule){
      el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:200px;opacity:0.4;font-weight:700;font-size:14px;">Loading…</div>';
      return;
    }

    // Enforce chronological order for meds groups
    var groupKeys=sk==='meds'
      ? MED_GROUP_ORDER.filter(function(g){return schedule[g];}).concat(
          Object.keys(schedule).filter(function(g){return MED_GROUP_ORDER.indexOf(g)===-1;})
        )
      : Object.keys(schedule);

    // Helper: check if an item is done today
    function isDone(item,group){
      var itm=item.toLowerCase().split('/')[0].trim();
      return logs.find(function(l){
        var amt=(l.amount||'').toLowerCase();
        var ltype=(l.type||'').toLowerCase();
        var lmeta=(l.metadata||'').toLowerCase();
        var gmeta=group.toLowerCase();
        if(state.category==='Meds'){
          if(item==='Juice')return (ltype==='water')&&amt.includes('juice');
          var isMedType=ltype==='medication'||ltype==='meds';
          if(!isMedType) return false;
          if(!amt.includes(itm)) return false;
          // Match metadata if both present, otherwise just match on amount
          if(lmeta&&gmeta) return lmeta===gmeta;
          return true;
        }else{
          var isTaskType=ltype==='routine'||ltype==='tasks';
          return isTaskType&&amt.includes(itm);
        }
      });
    }

    // Sort groups: undone groups first (chronological), then fully-done groups
    var undoneGroups=groupKeys.filter(function(g){
      return schedule[g].some(function(item){return !isDone(item,g);});
    });
    var doneGroups=groupKeys.filter(function(g){
      return schedule[g].every(function(item){return !!isDone(item,g);});
    });
    var sortedGroupKeys=undoneGroups.concat(doneGroups);

    var scheduleHtml=sortedGroupKeys.map(function(group){
      var items=schedule[group];
      // Sort items: undone first, done at bottom
      var undoneItems=items.filter(function(item){return !isDone(item,group);});
      var doneItems=items.filter(function(item){return !!isDone(item,group);});
      var sortedItems=undoneItems.concat(doneItems);

      var rowsHtml=sortedItems.map(function(item,idx){
        var done=isDone(item,group);
        var isMedsView=state.category==='Meds';
        var doseLabel=MED_DOSES[item]?'<span style="font-size:10px;font-weight:400;color:'+(isMedsView?'rgba(255,255,255,0.6)':'#5a3800')+';margin-left:4px;">('+MED_DOSES[item]+')</span>':'';
        var ghBadge=(function(){
          if(item!=='GH')return'';
          var lastDose=state.ghCount||0;
          var today=getAdjustedDateString();
          var loggedToday=logs.some(function(l){return l.date===today&&l.type==='Medication'&&(l.amount||'').toLowerCase().includes('gh');});
          var displayDose=loggedToday?lastDose:lastDose+1;
          return '<span style="font-size:10px;font-weight:700;font-family:DM Mono,monospace;background:#fef08a;color:#1e3a8a;padding:1px 8px;border-radius:999px;margin-left:6px;border:1px solid #fde047;">'+displayDose+'/24</span>';
        })();
        var origIdx=items.indexOf(item);
        var btnBg=isMedsView?'rgba(255,255,255,'+(done?'0.10':'0.18')+')':'rgba(255,255,255,'+(done?'0.25':'0.45')+')';
        var btnBorder=isMedsView?'rgba(255,255,255,'+(done?'0.15':'0.30')+')':'rgba(180,120,0,'+(done?'0.10':'0.18')+')';
        var btnColor=isMedsView?'#fff':(done?'#5a3800':'#2d1a00');
        var stmpHtml=done?'<span style="font-family:DM Mono,monospace;font-size:9px;font-weight:500;color:'+(isMedsView?'#1e3a8a':'#2d1a00')+';background:rgba(255,255,255,0.90);border-radius:6px;padding:2px 7px;text-align:right;line-height:1.3;white-space:nowrap;">DONE '+done.time+'<br>'+done.caregiver+'</span>':'';
        return '<button draggable="true" ondragstart="dragStart(event,\''+sk+'\',\''+group+'\','+origIdx+')" ondragover="dragOver(event)" ondrop="dragDrop(event,\''+sk+'\',\''+group+'\','+origIdx+')" ondragend="dragEnd(event)" onclick="handleLog(\''+state.category+'\',\''+item+'\',\''+group+'\')" style="width:100%;border:1px solid '+btnBorder+';font-size:15px;font-weight:600;font-family:Syne,sans-serif;padding:10px 14px;border-radius:14px;background:'+btnBg+';color:'+btnColor+';display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;text-align:left;opacity:'+(done?'0.65':'1')+'"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%;">'+item+doseLabel+ghBadge+'</span>'+stmpHtml+'</button>';
      }).join('');

      var allDone=doneGroups.indexOf(group)!==-1;
      var isMedsView=state.category==='Meds';
      var hdrColor=isMedsView?(allDone?'rgba(255,255,255,0.40)':'rgba(255,255,255,0.75)'):(allDone?'#8a6020':'#5a3800');
      var hdrBorder=isMedsView?(allDone?'rgba(255,255,255,0.20)':'rgba(255,255,255,0.50)'):(allDone?'#8a6020':'#5a3800');
      return '<div style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;color:'+hdrColor+';text-transform:uppercase;letter-spacing:0.10em;margin:10px 0 4px 2px;padding-left:8px;border-left:3px solid '+hdrBorder+';">'+group+(allDone?' ✓':'')+'</div>'+rowsHtml;
    }).join('');

    var isProxy=state.caregiver!==state.deviceCG;
    var isMedsView=state.category==='Meds';
    var pageBg=isMedsView?'#3e93ba':'#ffbf2b';
    var cgBarBg=isMedsView?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.45)';
    var cgBarBorder=isMedsView?'rgba(255,255,255,0.30)':'rgba(180,120,0,0.18)';
    var logAsColor=isMedsView?'rgba(255,255,255,0.75)':'#5a3800';
    var proxyColor=isMedsView?'#ffd700':'#7c2d12';
    var cgActiveBg=isMedsView?'#2d7a9e':'#f9b622';
    var cgActiveColor=isMedsView?'#fff':'#2d1a00';
    var cgInactiveBg=isMedsView?'rgba(255,255,255,0.12)':'rgba(45,26,0,0.08)';
    var cgInactiveColor=isMedsView?'rgba(255,255,255,0.8)':'#5a3800';

    // Short date format for display in User row
    var selDate=document.getElementById('date-navigator').value||getAdjustedDateString();
    var dp=selDate.split('-');
    var shortDate=dp.length===3?parseInt(dp[1])+'/'+parseInt(dp[2])+'/'+dp[0].slice(2):selDate;

    var cgBarHtml=
      '<div style="background:'+cgBarBg+';border:1px solid '+cgBarBorder+';border-radius:14px;padding:8px 10px;margin-bottom:8px;">'+
        // Row 1: USER + pencil + airplane (flush right)
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'+
          '<div style="display:flex;align-items:center;gap:6px;">'+
            '<span style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:'+(isProxy?proxyColor:logAsColor)+';text-transform:uppercase;letter-spacing:0.06em;">'+(isProxy?'⚠️ PROXY':'USER')+'</span>'+
            '<button id="dash-edit-btn" style="background:'+cgActiveBg+';color:'+cgActiveColor+';border:none;border-radius:50%;width:22px;height:22px;font-size:11px;display:flex;align-items:center;justify-content:center;">✏️</button>'+
          '</div>'+
          '<button id="travel-btn" style="font-size:16px;background:none;border:none;padding:0;'+(state.offset!==0?'filter:sepia(1) saturate(4) brightness(1.4);':'filter:grayscale(1) brightness(2);opacity:0.7;')+'">✈️</button>'+
        '</div>'+
        // Row 2: caregiver buttons
        '<div style="display:flex;gap:4px;">'+
          state.caregivers.map(function(cg){
            var isActive=cg===state.caregiver;
            var isDevice=cg===state.deviceCG;
            var bg=isActive?'#ffffff':(isMedsView?'rgba(0,0,0,0.25)':'rgba(0,0,0,0.12)');
            var color=isActive?(isMedsView?'#1e3a8a':'#2d1a00'):(isMedsView?'#ffffff':'#2d1a00');
            var border=isActive?'transparent':(isMedsView?'rgba(255,255,255,0.20)':'rgba(45,26,0,0.20)');
            return '<button class="cg-btn" data-cg="'+cg+'" style="flex:1;padding:7px 2px;border-radius:10px;font-size:11px;font-weight:700;font-family:Syne,sans-serif;border:1px solid '+border+';background:'+bg+';color:'+color+';">'+cg+(isDevice&&!isActive?' 🏠':'')+'</button>';
          }).join('')+
        '</div>'+
      '</div>';

    el.innerHTML=
      '<div style="background:'+pageBg+';height:calc(100vh - 96px);display:flex;flex-direction:column;padding:10px;overflow:hidden;">'+
        cgBarHtml+
        '<div style="flex:1;overflow-y:auto;overscroll-behavior:none;-webkit-overflow-scrolling:touch;padding-right:2px;">'+scheduleHtml+'</div>'+
      '</div>';

    document.getElementById('dash-edit-btn').addEventListener('click',openScheduleEditor);
    var travelBtn=document.getElementById('travel-btn');
    if(travelBtn)travelBtn.addEventListener('click',function(){toggleTravel();});
    document.querySelectorAll('.cg-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        state.caregiver=this.getAttribute('data-cg');
        localStorage.setItem('activeCG',state.caregiver);
        render();
      });
    });
    } catch(err) {
      console.error('renderDash error:', err);
      el.innerHTML='<div style="padding:20px;color:red;font-size:12px;word-break:break-all;">renderDash error: '+err.message+'<br>'+err.stack+'</div>';
    }
  }

  function dragStart(e,sk,group,idx){state.dragSrc={sk:sk,group:group,idx:idx};e.dataTransfer.effectAllowed='move';}
  function dragOver(e){e.preventDefault();}
  function dragEnd(e){state.dragSrc=null;}
  function dragDrop(e,sk,group,toIdx){
    e.preventDefault();
    if(!state.dragSrc||state.dragSrc.group!==group)return;
    var arr=state[sk][group].slice();
    var moved=arr.splice(state.dragSrc.idx,1)[0];
    arr.splice(toIdx,0,moved);
    state[sk][group]=arr;
    saveScheduleToSheet();render();
  }
  function saveScheduleToSheet(){
    sbUpsert('settings',[{key:'schedule',value:JSON.stringify({meds:state.meds,tasks:state.tasks})}])
      .then(function(){showToast('Schedule saved ✓','success');})
      .catch(function(e){showToast('Save error','error');console.error(e);});
  }

  function openScheduleEditor(){
    var sk=state.category==='Tasks'?'tasks':'meds';
    var schedule=state[sk];
    var displayName=state.category==='Meds'?'Meds':'Tasks';
    var modal=document.getElementById('modal-container');
    var groupsHtml=Object.keys(schedule).map(function(group){
      var safeId=group.replace(/[^a-z0-9]/gi,'_');
      return '<div class="mb-5 bg-slate-50 rounded-2xl p-4 border border-slate-200">'+
        '<div class="flex items-center justify-between mb-3">'+
          '<span class="font-black text-sm text-slate-700 uppercase tracking-wide">'+group+'</span>'+
          '<button onclick="deleteGroup(\''+sk+'\',\''+group+'\')" class="text-red-400 text-[10px] font-black px-2 py-1 rounded-lg bg-red-50 border border-red-100">REMOVE</button>'+
        '</div>'+
        schedule[group].map(function(item,i){
          var isFirst=i===0;
          var isLast=i===schedule[group].length-1;
          return '<div class="flex items-center gap-2 mb-2">'+
            '<div style="display:flex;flex-direction:column;gap:2px;">'+
              '<button '+(isFirst?'disabled style="opacity:0.2;pointer-events:none;"':'')+' onclick="moveItem(\''+sk+'\',\''+group+'\','+i+',-1)" style="background:#e2e8f0;border:none;border-radius:6px;width:26px;height:22px;font-size:13px;line-height:1;font-weight:900;color:#475569;">↑</button>'+
              '<button '+(isLast?'disabled style="opacity:0.2;pointer-events:none;"':'')+' onclick="moveItem(\''+sk+'\',\''+group+'\','+i+',1)" style="background:#e2e8f0;border:none;border-radius:6px;width:26px;height:22px;font-size:13px;line-height:1;font-weight:900;color:#475569;">↓</button>'+
            '</div>'+
            '<span class="flex-1 text-sm font-bold text-slate-700 bg-white px-3 py-2 rounded-xl border border-slate-200">'+item+'</span>'+
            '<button onclick="removeItem(\''+sk+'\',\''+group+'\','+i+')" class="text-red-400 font-black w-8 h-8 rounded-lg bg-white border border-red-100 flex items-center justify-center text-sm">✕</button>'+
          '</div>';
        }).join('')+
        '<div class="flex gap-2 mt-2">'+
          '<input type="text" id="new-item-'+safeId+'" placeholder="Add item..." class="flex-1 p-2 rounded-xl border border-slate-200 text-sm font-bold bg-white outline-none">'+
          '<button onclick="addItem(\''+sk+'\',\''+group+'\')" class="bg-blue-600 text-white font-black px-4 rounded-xl text-sm">ADD</button>'+
        '</div>'+
      '</div>';
    }).join('');

    modal.innerHTML='<div class="modal" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'">'+
      '<div class="modal-content" onclick="event.stopPropagation()">'+
        '<h2 class="font-black text-xl mb-1 text-blue-600">✏️ Edit '+displayName+'</h2>'+
        '<p class="text-[11px] text-slate-400 mb-4">Use ↑↓ to reorder items within a group.</p>'+
        '<div class="max-h-[58vh] overflow-y-auto">'+
          groupsHtml+
          '<div class="bg-blue-50 rounded-2xl p-4 border border-blue-200 mt-2">'+
            '<div class="font-black text-sm text-blue-700 mb-2">＋ New Group</div>'+
            '<div class="flex gap-2">'+
              '<input type="text" id="new-group-name" placeholder="e.g. 8:00 PM" class="flex-1 p-2 rounded-xl border border-blue-200 text-sm font-bold bg-white outline-none">'+
              '<button onclick="addGroup(\''+sk+'\')" class="bg-blue-600 text-white font-black px-4 rounded-xl text-sm">ADD</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<button onclick="document.getElementById(\'modal-container\').innerHTML=\'\'" class="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl mt-4">DONE</button>'+
      '</div>'+
    '</div>';
  }

  function moveItem(sk,group,idx,dir){
    var arr=state[sk][group].slice();
    var newIdx=idx+dir;
    if(newIdx<0||newIdx>=arr.length)return;
    var tmp=arr[idx];arr[idx]=arr[newIdx];arr[newIdx]=tmp;
    state[sk][group]=arr;
    saveScheduleToSheet();
    openScheduleEditor();
  }
  function addItem(sk,group){var id='new-item-'+group.replace(/[^a-z0-9]/gi,'_');var val=(document.getElementById(id)||{}).value.trim();if(!val)return;state[sk][group].push(val);saveScheduleToSheet();openScheduleEditor();}
  function removeItem(sk,group,idx){state[sk][group].splice(idx,1);saveScheduleToSheet();openScheduleEditor();}
  function addGroup(sk){var name=(document.getElementById('new-group-name')||{}).value.trim();if(!name||state[sk][name])return;state[sk][name]=[];saveScheduleToSheet();openScheduleEditor();}
  function deleteGroup(sk,group){if(!confirm('Delete "'+group+'"?'))return;delete state[sk][group];saveScheduleToSheet();openScheduleEditor();}

  // ─── UNIVERSAL KEYPAD ────────────────────────────────────────────────────
  function getCurrentTimeParts(){
    var d=getAdjustedDate();
    var h=d.getHours(),m=d.getMinutes(),ap=h>=12?'PM':'AM';
    h=h%12||12;return{h:h,m:m,ap:ap};
  }

  function kpTimeString(){
    var digits=kp.timeDigits;
    if(!digits){var t=getCurrentTimeParts();return t.h+':'+(t.m<10?'0'+t.m:t.m)+' '+(kp.ampm||t.ap);}
    var h,m;
    if(digits.length<=2){h=parseInt(digits);m=0;}
    else if(digits.length===3){h=parseInt(digits[0]);m=parseInt(digits.slice(1));}
    else{h=parseInt(digits.slice(0,-2));m=parseInt(digits.slice(-2));}
    h=h%12||12;m=Math.min(59,m);
    var ap=kp.ampm||(h>=7&&h<=11?'AM':'PM');
    return h+':'+(m<10?'0'+m:m)+' '+ap;
  }

  function kpFinalTime(){
    if(!kp.timeDigits&&!kp.ampm)return getCurrentTime();
    return kpTimeString();
  }

  function showUniversalKeypad(opts){
    kp.volDigits='';kp.timeDigits='';kp.ampm='';
    kp.activeField=opts.mode==='time'?'time':'vol';
    kp.mode=opts.mode||'vol+time';
    kp.label=opts.label||'';
    kp.volLabel=opts.volLabel||'Amount';
    kp.onConfirm=opts.onConfirm;
    kp.isUrine=opts.isUrine||false;
    kp.isEst=false;
    renderKeypad();
  }

  function renderKeypad(){
    var modal=document.getElementById('modal-container');
    var t=getCurrentTimeParts();
    var currentTimeStr=t.h+':'+(t.m<10?'0'+t.m:t.m)+' '+t.ap;
    var timeDisplay=(kp.timeDigits||kp.ampm)?kpTimeString():currentTimeStr;
    var isVol=kp.activeField==='vol';
    var isTime=kp.activeField==='time';
    var hasVol=kp.mode!=='time';

    var volHtml=hasVol?'<div id="kp-vol-box" style="background:'+(isVol?'#1e40af':'#6b7280')+';border:2px solid '+(isVol?'#60a5fa':'#9ca3af')+';border-radius:16px;padding:14px 16px;margin-bottom:8px;cursor:pointer;"><div style="font-size:10px;font-weight:900;color:'+(isVol?'#bfdbfe':'#e5e7eb')+';text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">'+kp.volLabel+'</div><div style="display:flex;align-items:center;gap:10px;"><div style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:2px;min-height:40px;flex:1;">'+(kp.volDigits?(kp.volDigits+(kp.mode==='dose+time'?' mg':' ml')+(kp.isEst?' (est)':'')):'<span style="opacity:0.4">0</span>')+'</div>'+(kp.isUrine?'<button id="kp-estimate" style="font-size:11px;font-weight:900;padding:5px 10px;border-radius:10px;background:'+(kp.isEst?'#d97706':'#6b7280')+';color:#ffffff;border:2px solid '+(kp.isEst?'#f59e0b':'#9ca3af')+';white-space:nowrap;flex-shrink:0;">'+(kp.isEst?'✓ EST':'EST')+'</button>':'')+'</div></div>':'';

    // ESTIMATE toggle — only shown for urine entries
    var estimateHtml=kp.isUrine?'<button id="kp-estimate" style="width:100%;padding:12px;border-radius:14px;font-weight:900;font-size:13px;margin-bottom:10px;background:'+(kp.isEst?'#d97706':'#6b7280')+';color:#ffffff;border:2px solid '+(kp.isEst?'#f59e0b':'#9ca3af')+';"><span style="margin-right:6px;">'+(kp.isEst?'✓':'○')+'</span>ESTIMATE (tap to toggle)</button>':'';

    var ampmHtml=isTime?'<button id="kp-am" style="font-size:14px;font-weight:900;padding:6px 14px;border-radius:10px;background:'+(kp.ampm==='AM'?'#2563eb':'#9ca3af')+';color:white;border:none;margin-left:8px;">AM</button><button id="kp-pm" style="font-size:14px;font-weight:900;padding:6px 14px;border-radius:10px;background:'+(kp.ampm==='PM'?'#2563eb':'#9ca3af')+';color:white;border:none;">PM</button>':'';

    var keysHtml=['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(function(k){
      var isDel=k==='⌫',hide=k==='.'&&isTime;
      return '<button class="kp-num" data-val="'+k+'" style="padding:16px;border-radius:14px;font-weight:900;font-size:22px;background:'+(isDel?'#dc2626':hide?'#4b5563':'#6b7280')+';color:'+(hide?'#4b5563':'#ffffff')+';border:1px solid '+(isDel?'#ef4444':hide?'#4b5563':'#9ca3af')+';'+(hide?'pointer-events:none;':'')+'">'+k+'</button>';
    }).join('');

    modal.innerHTML='<div class="modal"><div style="background:#4b5563;width:100%;border-radius:32px 32px 0 0;padding:20px 16px 28px;max-height:92vh;overflow-y:auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><div style="font-size:13px;font-weight:900;color:#dbeafe;">'+kp.label+'</div><button id="kp-cancel" style="background:#6b7280;color:#f3f4f6;font-weight:900;font-size:12px;padding:6px 14px;border-radius:10px;border:1px solid #9ca3af;">✕ CANCEL</button></div>'+volHtml+'<div id="kp-time-box" style="background:'+(isTime?'#1e40af':'#6b7280')+';border:2px solid '+(isTime?'#60a5fa':'#9ca3af')+';border-radius:16px;padding:14px 16px;margin-bottom:16px;cursor:pointer;"><div style="font-size:10px;font-weight:900;color:'+(isTime?'#bfdbfe':'#e5e7eb')+';text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Time '+((!kp.timeDigits&&!kp.ampm)?'(tap to change — using current time)':'')+'</div><div style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:2px;min-height:40px;display:flex;align-items:center;">'+timeDisplay+ampmHtml+'</div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">'+keysHtml+'</div><button id="kp-confirm" style="width:100%;padding:16px;border-radius:16px;font-weight:900;font-size:16px;background:#2563eb;color:white;">✓ CONFIRM</button></div></div>';

    // Wire all buttons with addEventListener
    document.getElementById('kp-cancel').addEventListener('click',function(){document.getElementById('modal-container').innerHTML='';});
    document.getElementById('kp-confirm').addEventListener('click',function(){
      document.getElementById('modal-container').innerHTML='';
      var timeStr=kpFinalTime(),vol=kp.volDigits,isEst=kp.isEst;
      if(kp.onConfirm)kp.onConfirm(vol,timeStr,isEst);
    });
    // Estimate toggle — urine only
    var estBtn=document.getElementById('kp-estimate');
    if(estBtn)estBtn.addEventListener('click',function(){kp.isEst=!kp.isEst;renderKeypad();});
    if(hasVol){
      document.getElementById('kp-vol-box').addEventListener('click',function(){kp.activeField='vol';renderKeypad();});
    }
    document.getElementById('kp-time-box').addEventListener('click',function(){kp.activeField='time';renderKeypad();});
    if(isTime){
      var amBtn=document.getElementById('kp-am'),pmBtn=document.getElementById('kp-pm');
      if(amBtn)amBtn.addEventListener('click',function(e){e.stopPropagation();kp.ampm='AM';renderKeypad();});
      if(pmBtn)pmBtn.addEventListener('click',function(e){e.stopPropagation();kp.ampm='PM';renderKeypad();});
    }
    document.querySelectorAll('.kp-num').forEach(function(btn){
      btn.addEventListener('click',function(){
        var k=this.getAttribute('data-val');
        var field=kp.activeField;
        if(field==='vol'){
          if(k==='⌫'){kp.volDigits=kp.volDigits.slice(0,-1);}
          else if(k==='.'&&!kp.volDigits.includes('.')){kp.volDigits+=k;}
          else if(k!=='.'){kp.volDigits+=k;}
        }else{
          if(k==='⌫'){kp.timeDigits=kp.timeDigits.slice(0,-1);}
          else if(k!=='.'){if(kp.timeDigits.length<4)kp.timeDigits+=k;}
        }
        renderKeypad();
      });
    });
  }

  // ─── HANDLE LOG ──────────────────────────────────────────────────────────
  function handleLog(type,item,group){
    var saveType=(type==='Meds')?'Medication':(type==='Tasks')?'Routine':type;
    var date=document.getElementById('date-navigator').value;
    function save(amt,timeStr,meta){
      var m=meta!==undefined?meta:group;
      sbInsert('logs',{date:date,caregiver:state.caregiver,type:saveType,amount:amt,time:timeStr,metadata:m})
        .then(function(){showToast(saveType+' logged ✓','success');loadData();})
        .catch(function(e){showToast('Log error','error');console.error(e);});
    }
    if(item==='Juice'){
      showUniversalKeypad({mode:'vol+time',label:'🧃 Juice — counts as Water',volLabel:'Volume (ml)',
        onConfirm:function(vol,timeStr){
          if(!vol){showToast('Please enter a volume','error');return;}
          sbInsert('logs',{date:date,caregiver:state.caregiver,type:'Water',amount:vol+'ml (Juice)',time:timeStr,metadata:group})
            .then(function(){showToast('Juice logged as Water ✓','success');loadData();})
            .catch(function(e){showToast('Log error','error');console.error(e);});
        }});
      return;
    }
    if(type==='Water'||type==='Urine'){
      var isUrine=type==='Urine';
      showUniversalKeypad({mode:'vol+time',label:(type==='Water'?'💧 Water':'🟡 Urine')+' — Volume',volLabel:'Volume (ml)',isUrine:isUrine,
        onConfirm:function(vol,timeStr,isEst){if(!vol){showToast('Please enter a volume','error');return;}save(vol+'ml'+(isEst?' (est)':''),timeStr);}});
      return;
    }
    if(type==='BM'){showBMPicker(group);return;}
    if(item.includes('Walk')||item.includes('Standing')){
      showUniversalKeypad({mode:'vol+time',label:'🚶 '+item.split('/')[0],volLabel:'Laps / Minutes',
        onConfirm:function(vol,timeStr){if(!vol){showToast('Please enter a value','error');return;}save(item.split('/')[0]+' ('+vol+')',timeStr);}});
      return;
    }
    if(item==='Cortef'){
      showUniversalKeypad({mode:'dose+time',label:'💊 Cortef Stress Dose',volLabel:'Dose (mg)',
        onConfirm:function(dose,timeStr){if(!dose){showToast('Please enter a dose','error');return;}save('Cortef ('+dose+'mg)',timeStr);}});
      return;
    }
    // GH Growth Hormone — dose counter popup
    if(item==='GH'){
      showGHKeypad(date,group,save);
      return;
    }
    // All other meds/routine — time only
    showUniversalKeypad({mode:'time',label:'💊 '+item+(MED_DOSES[item]?' — '+MED_DOSES[item]:''),
      onConfirm:function(_,timeStr){save(item,timeStr);}});
  }

  // ─── GH DOSE COUNTER — shared via Sheet ──────────────────────────────────
  var GH_MAX=24;
  var ghSetMode=false;
  var ghSetDigits='';

  // Returns the dose number to DISPLAY for today
  // = lastDose if GH already logged today, lastDose+1 if not yet logged
  function ghGetCount(){
    var lastDose=state.ghCount||0;
    var today=getAdjustedDateString();
    // Check if GH already logged today
    var loggedToday=state.allLogs.some(function(l){
      return l.date===today&&l.type==='Medication'&&(l.amount||'').toLowerCase().includes('gh');
    });
    return loggedToday ? lastDose : lastDose+1;
  }
  function ghGetResetDate(){ return state.ghResetDate||'—'; }
  function ghSetCount(n, resetDate){
    state.ghCount=Math.max(0,Math.min(GH_MAX,n));
    if(resetDate) state.ghResetDate=resetDate;
    var rows=[{key:'gh_count',value:state.ghCount.toString()}];
    if(state.ghResetDate) rows.push({key:'gh_reset_date',value:state.ghResetDate});
    sbUpsert('settings',rows).catch(function(e){console.error('ghSetCount error',e);});
  }

  function showGHKeypad(date,group,saveFn){
    ghSetMode=false; ghSetDigits='';
    kp.timeDigits=''; kp.ampm='';
    renderGHKeypad(date,group,saveFn);
  }

  function renderGHKeypad(date,group,saveFn){
    // todayDose = the dose number being given right now
    var lastDose=state.ghCount||0;
    var todayDose=lastDose+1; // next dose to be given
    var count=lastDose; // doses already completed
    var resetDate=ghGetResetDate();
    var modal=document.getElementById('modal-container');
    var pct=Math.round((todayDose/GH_MAX)*100);
    var remaining=GH_MAX-todayDose;
    var barColor=todayDose>=20?'#ef4444':todayDose>=16?'#f59e0b':'#2563eb';

    var warnHtml='';
    if(todayDose>GH_MAX){
      warnHtml='<div style="background:#fee2e2;border:2px solid #ef4444;border-radius:12px;padding:10px 14px;margin-bottom:12px;text-align:center;"><div style="font-size:13px;font-weight:900;color:#dc2626;">🚨 CARTRIDGE EMPTY — Replace before logging!</div></div>';
    } else if(todayDose>=20){
      warnHtml='<div style="background:#fff7ed;border:2px solid #f59e0b;border-radius:12px;padding:10px 14px;margin-bottom:12px;text-align:center;"><div style="font-size:13px;font-weight:900;color:#d97706;">⚠️ Only '+remaining+' dose'+(remaining===1?'':'s')+' remaining after this one</div></div>';
    }

    var t=getCurrentTimeParts();
    var currentTimeStr=t.h+':'+(t.m<10?'0'+t.m:t.m)+' '+t.ap;
    var timeDisplay=(kp.timeDigits||kp.ampm)?kpTimeString():currentTimeStr;
    var ampmHtml='<button id="gh-am" style="font-size:13px;font-weight:900;padding:5px 12px;border-radius:10px;background:'+(kp.ampm==='AM'?'#2563eb':'#9ca3af')+';color:white;border:none;margin-left:8px;">AM</button><button id="gh-pm" style="font-size:13px;font-weight:900;padding:5px 12px;border-radius:10px;background:'+(kp.ampm==='PM'?'#2563eb':'#9ca3af')+';color:white;border:none;">PM</button>';

    var keypadAreaHtml;
    if(ghSetMode){
      keypadAreaHtml=
        '<div style="background:#1e40af;border:2px solid #60a5fa;border-radius:16px;padding:14px 16px;margin-bottom:12px;">'+
          '<div style="font-size:10px;font-weight:900;color:#bfdbfe;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Enter starting dose number</div>'+
          '<div style="font-size:36px;font-weight:900;color:#ffffff;letter-spacing:2px;min-height:44px;">'+(ghSetDigits||'<span style="opacity:0.3">—</span>')+'</div>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">'+
          ['1','2','3','4','5','6','7','8','9','','0','⌫'].map(function(k){
            var isEmpty=k==='';
            return '<button class="gh-set-num" data-v="'+k+'" style="padding:14px;border-radius:14px;font-weight:900;font-size:20px;background:'+(k==='⌫'?'#dc2626':isEmpty?'transparent':'#6b7280')+';color:'+(isEmpty?'transparent':'#ffffff')+';border:1px solid '+(k==='⌫'?'#ef4444':isEmpty?'transparent':'#9ca3af')+';'+(isEmpty?'pointer-events:none;':'')+'">'+k+'</button>';
          }).join('')+
        '</div>'+
        '<div style="display:flex;gap:8px;">'+
          '<button id="gh-set-cancel" style="flex:1;padding:12px;border-radius:14px;font-weight:900;font-size:13px;background:#6b7280;color:#e5e7eb;border:1px solid #9ca3af;">BACK</button>'+
          '<button id="gh-set-confirm" style="flex:2;padding:12px;border-radius:14px;font-weight:900;font-size:14px;background:#2563eb;color:white;">SET COUNTER</button>'+
        '</div>';
    }else{
      keypadAreaHtml=
        '<div id="gh-time-box" style="background:#6b7280;border:2px solid #9ca3af;border-radius:16px;padding:14px 16px;margin-bottom:12px;cursor:pointer;">'+
          '<div style="font-size:10px;font-weight:900;color:#e5e7eb;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Time '+((!kp.timeDigits&&!kp.ampm)?'(tap to change — using current time)':'')+'</div>'+
          '<div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:2px;display:flex;align-items:center;">'+timeDisplay+ampmHtml+'</div>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">'+
          ['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(function(k){
            var isDel=k==='⌫',hide=k==='.';
            return '<button class="gh-time-num" data-v="'+k+'" style="padding:14px;border-radius:14px;font-weight:900;font-size:20px;background:'+(isDel?'#dc2626':hide?'#4b5563':'#6b7280')+';color:'+(hide?'#4b5563':'#ffffff')+';border:1px solid '+(isDel?'#ef4444':hide?'#4b5563':'#9ca3af')+';'+(hide?'pointer-events:none;':'')+'">'+k+'</button>';
          }).join('')+
        '</div>'+
        '<button id="gh-confirm" style="width:100%;padding:14px;border-radius:16px;font-weight:900;font-size:15px;background:#2563eb;color:white;box-shadow:0 4px 16px rgba(37,99,235,0.4);">✓ CONFIRM &amp; LOG DOSE '+todayDose+'/'+GH_MAX+'</button>';
    }

    modal.innerHTML=
      '<div class="modal"><div style="background:#4b5563;width:100%;border-radius:32px 32px 0 0;padding:20px 16px 28px;max-height:92vh;overflow-y:auto;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'+
          '<div style="font-size:13px;font-weight:900;color:#dbeafe;">💉 GH — Growth Hormone (0.4ml)</div>'+
          '<button id="gh-cancel" style="background:#6b7280;color:#f3f4f6;font-weight:900;font-size:12px;padding:6px 14px;border-radius:10px;border:1px solid #9ca3af;">✕</button>'+
        '</div>'+
        '<div style="background:#6b7280;border-radius:16px;padding:16px;margin-bottom:10px;">'+
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">'+
            '<div style="font-size:22px;font-weight:900;color:#ffffff;">Dose <span style="color:#fef08a;">'+todayDose+'</span> of '+GH_MAX+'</div>'+
            '<div style="font-size:11px;color:#d1d5db;font-weight:700;">Reset: '+resetDate+'</div>'+
          '</div>'+
          '<div style="background:#374151;border-radius:999px;height:14px;overflow:hidden;margin-bottom:8px;">'+
            '<div style="background:'+barColor+';height:100%;width:'+pct+'%;border-radius:999px;"></div>'+
          '</div>'+
          '<div style="font-size:11px;color:#d1d5db;font-weight:700;text-align:right;">'+remaining+' doses remaining after this one</div>'+
        '</div>'+
        warnHtml+
        '<div style="display:flex;gap:8px;margin-bottom:12px;">'+
          '<button id="gh-set-mode" style="flex:1;padding:10px;border-radius:12px;font-weight:900;font-size:12px;background:#374151;color:#e5e7eb;border:1px solid #6b7280;">🔢 SET COUNT</button>'+
          '<button id="gh-reset" style="flex:1;padding:10px;border-radius:12px;font-weight:900;font-size:12px;background:#374151;color:#e5e7eb;border:1px solid #6b7280;">🔄 RESET TO 1</button>'+
        '</div>'+
        '<div style="height:1px;background:#6b7280;margin-bottom:12px;"></div>'+
        keypadAreaHtml+
      '</div></div>';

    // Wire cancel
    document.getElementById('gh-cancel').addEventListener('click',function(){
      document.getElementById('modal-container').innerHTML='';
    });
    document.getElementById('gh-set-mode').addEventListener('click',function(){
      ghSetMode=true;ghSetDigits='';renderGHKeypad(date,group,saveFn);
    });
    document.getElementById('gh-reset').addEventListener('click',function(){
      if(confirm('Reset GH counter? Next dose will be Dose 1.')){
        ghSetCount(0, getAdjustedDateString());
        kp.timeDigits='';kp.ampm='';
        ghSetMode=false;renderGHKeypad(date,group,saveFn);
        showToast('GH counter reset — next dose is 1','success');
      }
    });

    if(ghSetMode){
      document.querySelectorAll('.gh-set-num').forEach(function(btn){
        btn.addEventListener('click',function(){
          var k=this.getAttribute('data-v');if(!k)return;
          if(k==='⌫'){ghSetDigits=ghSetDigits.slice(0,-1);}
          else if(ghSetDigits.length<2){ghSetDigits+=k;}
          renderGHKeypad(date,group,saveFn);
        });
      });
      document.getElementById('gh-set-cancel').addEventListener('click',function(){
        ghSetMode=false;ghSetDigits='';renderGHKeypad(date,group,saveFn);
      });
      document.getElementById('gh-set-confirm').addEventListener('click',function(){
        var n=parseInt(ghSetDigits);
        if(isNaN(n)||n<1||n>GH_MAX){showToast('Enter a number 1–'+GH_MAX,'error');return;}
        // N = the dose being given NOW, so save N as last completed dose
        // Tomorrow it will show N+1
        ghSetCount(n, null);
        ghSetMode=false;ghSetDigits='';
        renderGHKeypad(date,group,saveFn);
        showToast('Counter set to dose '+n+' — tomorrow shows '+(n+1),'success');
      });
    }else{
      var timeBox=document.getElementById('gh-time-box');
      if(timeBox)timeBox.addEventListener('click',function(){renderGHKeypad(date,group,saveFn);});
      var ghAm=document.getElementById('gh-am'),ghPm=document.getElementById('gh-pm');
      if(ghAm)ghAm.addEventListener('click',function(e){e.stopPropagation();kp.ampm='AM';renderGHKeypad(date,group,saveFn);});
      if(ghPm)ghPm.addEventListener('click',function(e){e.stopPropagation();kp.ampm='PM';renderGHKeypad(date,group,saveFn);});
      document.querySelectorAll('.gh-time-num').forEach(function(btn){
        btn.addEventListener('click',function(){
          var k=this.getAttribute('data-v');
          if(k==='⌫'){kp.timeDigits=kp.timeDigits.slice(0,-1);}
          else if(k!=='.'){if(kp.timeDigits.length<4)kp.timeDigits+=k;}
          renderGHKeypad(date,group,saveFn);
        });
      });
      document.getElementById('gh-confirm').addEventListener('click',function(){
        document.getElementById('modal-container').innerHTML='';
        var timeStr=kpFinalTime();
        ghSetCount(todayDose, null); // save todayDose as last completed dose
        saveFn('GH (0.4ml) — Dose '+todayDose+'/'+GH_MAX,timeStr);
        if(todayDose>=GH_MAX){setTimeout(function(){showToast('🚨 Cartridge empty! Replace before next dose.','error');},500);}
        else if(todayDose>=20){setTimeout(function(){showToast('⚠️ Only '+(GH_MAX-todayDose)+' doses remaining','info');},500);}
      });
    }
  }

  function showBMPicker(group){
    var modal=document.getElementById('modal-container');
    modal.innerHTML='<div class="modal" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'"><div class="modal-content" onclick="event.stopPropagation()" style="padding-bottom:36px;"><div class="text-center mb-6"><div style="font-size:28px;font-weight:900;color:#92400e;margin-bottom:4px;">💩 BM Event</div><div style="font-size:16px;color:#78716c;font-weight:700;">Select type</div></div><div class="grid grid-cols-2 gap-3 mb-4">'+BM_OPTIONS.map(function(opt){return'<button class="bm-opt" data-key="'+opt.key+'" data-label="'+opt.label+'" data-display="'+opt.display+'" data-group="'+group+'" style="padding:20px 12px;border-radius:20px;border:2px solid '+opt.color+'40;background:'+opt.color+'15;display:flex;flex-direction:column;align-items:center;gap:6px;"><span style="font-size:36px;font-weight:900;color:'+opt.color+';">'+opt.display+'</span><span style="font-size:14px;font-weight:900;color:'+opt.color+';">'+opt.label+'</span></button>';}).join('')+'</div><button id="bm-cancel" class="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl">CANCEL</button></div></div>';
    document.getElementById('bm-cancel').addEventListener('click',function(){document.getElementById('modal-container').innerHTML='';});
    document.querySelectorAll('.bm-opt').forEach(function(btn){
      btn.addEventListener('click',function(){
        var key=this.getAttribute('data-key'),label=this.getAttribute('data-label'),grp=this.getAttribute('data-group');
        var amt=key==='D'?'💦 Diarrhea':key+' — '+label.split('—')[1].trim();
        document.getElementById('modal-container').innerHTML='';
        var date=document.getElementById('date-navigator').value;
        showUniversalKeypad({mode:'time',label:'💩 BM — '+label,
          onConfirm:function(_,timeStr){
            sbInsert('logs',{date:date,caregiver:state.caregiver,type:'BM',amount:amt,time:timeStr,metadata:grp})
              .then(function(){showToast('BM logged ✓','success');loadData();})
              .catch(function(e){showToast('Log error','error');console.error(e);});
          }});
      });
    });
  }

  function bmDisplay(desc){
    var d=(desc||'').toUpperCase();
    if(d.includes('💦')||d.includes('DIARRHEA'))return'💦';
    if(d.startsWith('L'))return'L 💩';if(d.startsWith('M'))return'M 💩';return'S 💩';
  }

  // ─── IN-OUT ──────────────────────────────────────────────────────────────
  function renderInOutput(el,logs){
    function sortNewest(a,b){var d=timeToMinutes(b.time)-timeToMinutes(a.time);return d!==0?d:parseInt(b.id||0)-parseInt(a.id||0);}
    var waterLogs=logs.filter(function(l){return l.type==='Water';}).sort(sortNewest);
    var urineLogs=logs.filter(function(l){return l.type==='Urine';}).sort(sortNewest);
    var bmLogs=logs.filter(function(l){return l.type==='BM';}).sort(sortNewest);
    var wTotal=waterLogs.reduce(function(acc,l){return acc+(parseInt(l.amount)||0);},0);
    var uTotal=urineLogs.reduce(function(acc,l){return acc+(parseInt(l.amount)||0);},0);
    var limitTrigger=state.waterLimit+100;
    // BM display — no emoji, generous spacing
    var ORDER=['S','M','L','Diarrhea'];
    var bmCounts={};
    bmLogs.forEach(function(l){
      var d=(l.amount||'').toUpperCase();
      var k=d.includes('DIARRHEA')||d.includes('💦')?'Diarrhea':d.startsWith('L')?'L':d.startsWith('M')?'M':'S';
      bmCounts[k]=(bmCounts[k]||0)+1;
    });
    var bmDetail=ORDER.filter(function(k){return bmCounts[k];})
      .map(function(k){return'<span style="font-family:DM Mono,monospace;font-size:14px;font-weight:500;color:rgba(255,255,255,0.95);margin-right:14px;">'+k+'×'+bmCounts[k]+'</span>';}).join('');

    var eStyle='background:rgba(255,255,255,0.50);border-radius:10px;padding:7px 10px;display:flex;justify-content:space-between;margin-bottom:5px;';
    var eTxt='font-family:Syne,sans-serif;font-size:14px;font-weight:600;color:#2d1a00;';
    var eSec='font-family:DM Mono,monospace;font-size:12px;color:#5a3800;';
    var wPct=Math.min((wTotal/state.waterLimit)*100,100);

    el.innerHTML=
      '<div style="background:#ffbf2b;padding:8px;height:calc(100vh - 96px);display:flex;flex-direction:column;gap:6px;overflow:hidden;box-sizing:border-box;">'+

      // ── WATER ─────────────────────────────────────────────────────
      '<div style="background:#1d6fa4;border:1px solid rgba(255,255,255,0.25);border-radius:18px;padding:10px;flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;">'+
        // Header row: label + total + LIMIT button
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-shrink:0;">'+
          '<div>'+
            '<div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:rgba(255,255,255,0.80);text-transform:uppercase;letter-spacing:0.08em;">Water</div>'+
            '<div style="font-family:DM Mono,monospace;font-size:17px;font-weight:500;color:#fff;">'+wTotal+' / '+state.waterLimit+' ml</div>'+
          '</div>'+
          '<button id="limit-btn" style="background:rgba(255,255,255,0.25);color:#fff;border:none;border-radius:8px;font-family:Syne,sans-serif;font-size:10px;font-weight:800;padding:4px 10px;">LIMIT</button>'+
        '</div>'+
        (wTotal>limitTrigger?'<div style="background:#ef4444;color:#fff;padding:5px;border-radius:8px;font-family:Syne,sans-serif;font-size:11px;font-weight:800;text-align:center;margin-bottom:5px;flex-shrink:0;">⚠️ STOP! OVER LIMIT</div>':'')+
        // Body: log entries + progress bar side by side
        '<div style="display:flex;gap:8px;flex:1;min-height:0;">'+
          '<div style="flex:1;overflow-y:auto;overscroll-behavior:none;-webkit-overflow-scrolling:touch;">'+
            waterLogs.map(function(l){return'<div style="'+eStyle+'"><span style="'+eTxt+'">'+l.amount+'</span><span style="'+eSec+'">'+l.time+' · '+l.caregiver+'</span></div>';}).join('')+
          '</div>'+
          // Progress bar — full height
          '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">'+
            '<div style="flex:1;width:22px;background:rgba(255,255,255,0.18);border-radius:11px;overflow:hidden;position:relative;min-height:60px;">'+
              '<div style="position:absolute;bottom:0;width:100%;background:rgba(255,255,255,0.80);border-radius:11px;height:'+wPct+'%;transition:height 0.5s;"></div>'+
            '</div>'+
            '<button id="water-add" style="background:rgba(255,255,255,0.25);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">＋</button>'+
          '</div>'+
        '</div>'+
      '</div>'+

      // ── URINE ─────────────────────────────────────────────────────
      '<div style="background:#b45309;border:1px solid rgba(255,200,100,0.25);border-radius:18px;padding:10px;flex:0 0 auto;overflow:hidden;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">'+
          '<div>'+
            '<div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:rgba(255,255,255,0.80);text-transform:uppercase;letter-spacing:0.08em;">Urine</div>'+
            '<div style="font-family:DM Mono,monospace;font-size:17px;font-weight:500;color:#fff;">'+uTotal+' ml</div>'+
          '</div>'+
          '<button id="urine-add" style="background:rgba(255,255,255,0.25);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;font-weight:900;display:flex;align-items:center;justify-content:center;">＋</button>'+
        '</div>'+
        urineLogs.slice(0,2).map(function(l){return'<div style="'+eStyle+'"><span style="'+eTxt+'">'+l.amount+'</span><span style="'+eSec+'">'+l.time+' · '+l.caregiver+'</span></div>';}).join('')+
        (urineLogs.length>2?'<div style="font-family:Syne,sans-serif;font-size:10px;color:rgba(255,255,255,0.8);text-align:center;padding-top:2px;">+'+(urineLogs.length-2)+' more — see Logs</div>':'')+
      '</div>'+

      // ── BM ────────────────────────────────────────────────────────
      '<div style="background:#7c3f2a;border:1px solid rgba(255,160,100,0.20);border-radius:18px;padding:10px;flex:0 0 auto;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;">'+
          '<div style="flex:1;">'+
            '<div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">BM Events</div>'+
            '<div style="display:flex;align-items:center;">'+
              '<span style="font-family:DM Mono,monospace;font-size:17px;font-weight:500;color:#fff;margin-right:20px;">'+bmLogs.length+'</span>'+
              bmDetail+
            '</div>'+
          '</div>'+
          '<button id="bm-add" style="background:rgba(255,255,255,0.25);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">＋</button>'+
        '</div>'+
      '</div>'+
      '</div>';

    document.getElementById('limit-btn').addEventListener('click',changeLimit);
    document.getElementById('water-add').addEventListener('click',function(){handleLog('Water','Water','');});
    document.getElementById('urine-add').addEventListener('click',function(){handleLog('Urine','Urine','');});
    document.getElementById('bm-add').addEventListener('click',function(){handleLog('BM','BM Event','');});
  }

  // ─── LOGS ────────────────────────────────────────────────────────────────
  function renderLogs(container,todayLogs){
    var sel=document.getElementById('date-navigator').value;
    function sortNewest(a,b){var d=timeToMinutes(b.time)-timeToMinutes(a.time);return d!==0?d:parseInt(b.id||0)-parseInt(a.id||0);}
    var sourceLogs=todayLogs.slice().sort(sortNewest);
    var categoryOrder=['Medication','Routine','Water','Urine','BM','Labs','Report'];
    var sectionsHtml=categoryOrder.map(function(type){
      var cfg=CAT_CONFIG[type];
      var entries=sourceLogs.filter(function(l){
        var lt=(l.type||'').toLowerCase();
        var tt=type.toLowerCase();
        // Match Medication/Meds, Routine/Tasks flexibly
        if(tt==='medication') return lt==='medication'||lt==='meds';
        if(tt==='routine') return lt==='routine'||lt==='tasks';
        return lt===tt;
      });
      if(!entries.length)return'';
      var entriesHtml=entries.map(function(l){
        var subDetail='';
        if(type==='Medication'&&l.metadata)subDetail='<span style="font-size:9px;font-weight:700;color:#5a3800;margin-left:4px;">'+l.metadata+'</span>';
        var labInfo='';
        if(type==='Labs'){var ha=l.metadata&&l.metadata.includes('ALERT');labInfo=ha?'<span style="font-size:10px;font-weight:800;color:#dc2626;margin-left:6px;">⚠️ Out-of-range</span>':'';}
        var reportActions='';
        if(type==='Report'){try{var meta=JSON.parse(l.metadata||'{}');reportActions='<div style="display:flex;gap:6px;margin-top:6px;"><button onclick="shareReport(\''+meta.downloadUrl+'\',\''+meta.filename+'\',\'text\')" style="font-size:10px;font-weight:700;background:rgba(255,255,255,0.6);color:#2d1a00;padding:3px 8px;border-radius:8px;border:1px solid rgba(180,120,0,0.2);">📱 Text</button><button onclick="shareReport(\''+meta.downloadUrl+'\',\''+meta.filename+'\',\'email\')" style="font-size:10px;font-weight:700;background:rgba(255,255,255,0.6);color:#2d1a00;padding:3px 8px;border-radius:8px;border:1px solid rgba(180,120,0,0.2);">✉️ Email</button><a href="'+meta.viewUrl+'" target="_blank" style="font-size:10px;font-weight:700;background:rgba(255,255,255,0.6);color:#2d1a00;padding:3px 8px;border-radius:8px;border:1px solid rgba(180,120,0,0.2);text-decoration:none;">👁 View</a></div>';}catch(e){}}
        return'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:5px;border-radius:14px;border:1px solid rgba(180,120,0,0.15);background:rgba(255,255,255,0.45);">'+
          '<div style="flex:1;min-width:0;">'+
            '<div style="display:flex;align-items:baseline;flex-wrap:wrap;gap:2px;">'+
              '<span style="font-family:DM Mono,monospace;font-weight:500;font-size:13px;color:#2d1a00;">'+l.amount+'</span>'+subDetail+labInfo+
            '</div>'+reportActions+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'+
            '<div style="text-align:right;">'+
              '<div style="font-family:DM Mono,monospace;font-size:10px;font-weight:500;color:#5a3800;">'+l.time+'</div>'+
              '<div style="font-family:Syne,sans-serif;font-size:9px;color:#8a6020;font-weight:600;">'+l.caregiver+'</div>'+
            '</div>'+
            '<button onclick="confirmDelete(\''+l.id+'\')" style="width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,0.6);border:1px solid rgba(180,120,0,0.2);font-size:11px;font-weight:900;color:#92400e;display:flex;align-items:center;justify-content:center;">✕</button>'+
          '</div>'+
        '</div>';
      }).join('');
      return'<div style="margin-bottom:14px;">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;padding:0 2px;">'+
          '<span>'+cfg.icon+'</span>'+
          '<span style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#5a3800;">'+cfg.label+'</span>'+
          '<span style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;color:#2d1a00;background:#f9b622;padding:1px 8px;border-radius:999px;">'+entries.length+'</span>'+
        '</div>'+
        entriesHtml+
      '</div>';
    }).join('');
    container.innerHTML=
      '<div style="background:#ffbf2b;display:flex;flex-direction:column;height:calc(100vh - 140px);">'+
        '<div style="padding:10px 14px 5px;flex-shrink:0;">'+
          '<div style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;color:#5a3800;text-transform:uppercase;letter-spacing:0.08em;">📅 '+sel+'</div>'+
        '</div>'+
        '<div style="flex:1;overflow-y:auto;overscroll-behavior:none;-webkit-overflow-scrolling:touch;padding:0 12px 24px;">'+
          (sourceLogs.length===0
            ?'<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;opacity:0.4;"><div style="font-size:48px;margin-bottom:8px;">📋</div><div style="font-family:Syne,sans-serif;font-weight:700;font-style:italic;font-size:14px;color:#2d1a00;">No entries for this date</div></div>'
            :sectionsHtml)+
        '</div>'+
      '</div>';
  }

  function shareReport(url,filename,method){
    if(method==='text'){window.open('sms:?body=Ryan\'s CareConnect Report: '+url,'_blank');}
    else{window.open('mailto:?subject=Ryan\'s CareConnect Report — '+filename+'&body=Please find the report at: '+url,'_blank');}
  }

  function confirmDelete(id){
    var modal=document.getElementById('modal-container');
    modal.innerHTML='<div class="modal" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'"><div class="modal-content" onclick="event.stopPropagation()" style="padding-bottom:36px;"><div class="text-center mb-6"><div class="text-5xl mb-2">🗑️</div><div class="font-black text-lg text-slate-800">Delete this entry?</div><div class="text-sm text-slate-400 mt-1">This cannot be undone.</div></div><button id="del-yes" class="w-full bg-red-500 text-white font-black py-4 rounded-2xl mb-3 shadow-lg">YES, DELETE</button><button id="del-no" class="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl">CANCEL</button></div></div>';
    document.getElementById('del-yes').addEventListener('click',function(){
      document.getElementById('modal-container').innerHTML='';
      sbDelete('logs',id)
        .then(function(){showToast('Entry deleted','success');loadData();})
        .catch(function(e){showToast('Delete error','error');console.error(e);});
    });
    document.getElementById('del-no').addEventListener('click',function(){document.getElementById('modal-container').innerHTML='';});
  }

  // ─── LABS ────────────────────────────────────────────────────────────────
  function getLabsSorted(){
    return state.allLogs.filter(function(l){return l.type==='Labs';})
      .sort(function(a,b){return b.date.localeCompare(a.date)||timeToMinutes(b.time)-timeToMinutes(a.time);});
  }

  function renderLabs(container,logs){
    var allLabs=getLabsSorted();
    var idx=Math.min(state.labHistoryIndex,Math.max(0,allLabs.length-1));
    var displayLab=allLabs.length?(allLabs[idx]||allLabs[0]):null;
    var analysisHtml='',outOfRangeList=[];
    if(displayLab){
      try{
        var results=JSON.parse(displayLab.metadata.replace(' ALERT','')||'{}');
        Object.keys(results).forEach(function(k){
          var val=parseFloat(results[k]),ref=LAB_REF[k];
          if(ref&&(val<ref.min||val>ref.max)){
            outOfRangeList.push(k+': '+val+' (normal '+ref.min+'–'+ref.max+' '+ref.unit+')');
            analysisHtml+='<div style="margin-bottom:8px;font-size:12px;font-weight:700;"><span style="color:#dc2626;text-transform:uppercase;">'+k+' ('+val+'):</span> '+ref.rec+'</div>';
          }
        });
      }catch(e){}
    }
    state.analysisHtml=analysisHtml;
    var testDateLabel=displayLab?displayLab.date:'—';
    var oorJson=JSON.stringify(outOfRangeList);

    var labResultsHtml=displayLab?(function(){
      var res=JSON.parse(displayLab.metadata.replace(' ALERT','')||'{}');
      return'<div style="background:rgba(255,255,255,0.45);border:1px solid rgba(180,120,0,0.15);padding:14px;border-radius:18px;">'+
        Object.keys(res).map(function(k){
          var v=parseFloat(res[k]),ref=LAB_REF[k];if(!ref)return'';
          var isOut=v<ref.min||v>ref.max;
          var pct=Math.min(100,Math.max(0,((v-ref.min)/(ref.max-ref.min))*100));
          return'<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(180,120,0,0.12);cursor:pointer;" onclick="show30DayTrend(\''+k+'\')">'+
            '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">'+
              '<span style="font-family:Syne,sans-serif;font-weight:700;font-size:13px;color:#2d1a00;">'+k+
                '<span style="font-size:9px;font-weight:500;color:#5a3800;margin-left:4px;">('+ref.min+'–'+ref.max+' '+ref.unit+')</span>'+
              '</span>'+
              '<span style="font-family:DM Mono,monospace;font-weight:500;font-size:14px;color:'+(isOut?'#dc2626':'#2d1a00')+';">'+v+(isOut?' ⚠️':'')+'</span>'+
            '</div>'+
            '<div style="height:8px;background:rgba(180,120,0,0.15);border-radius:4px;position:relative;">'+
              '<div style="position:absolute;width:16px;height:16px;background:'+(isOut?'#dc2626':'#2d7a9e')+';border-radius:50%;top:-4px;left:calc('+pct+'% - 8px);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>'+
            '</div>'+
          '</div>';
        }).join('')+
      '</div>';
    })():'<div style="text-align:center;padding:40px 0;opacity:0.5;font-style:italic;color:#2d1a00;font-family:Syne,sans-serif;font-weight:700;">No lab records yet.<br>Tap ENTER to add results.</div>';

    // Build set of dates that have lab results for the date picker
    var labDates={};
    getLabsSorted().forEach(function(l){labDates[l.date]=true;});

    var navBtnStyle='font-family:Syne,sans-serif;font-weight:800;font-size:11px;color:#2d1a00;border:none;padding:9px 4px;border-radius:12px;flex:1;';
    container.innerHTML=
      '<div style="background:#ffbf2b;height:calc(100vh - 96px);padding:10px;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;">'+
      // Row 1: ENTER | PREV | NEXT | PDF
      '<div style="display:flex;gap:4px;margin-bottom:4px;flex-shrink:0;">'+
        '<button id="lab-enter-btn" style="'+navBtnStyle+'background:rgba(255,255,255,0.55);">ENTER</button>'+
        '<button id="lab-prev-btn" style="'+navBtnStyle+'background:rgba(255,255,255,0.35);">◀ OLDER</button>'+
        '<button id="lab-next-btn" style="'+navBtnStyle+'background:rgba(255,255,255,0.35);">NEWER ▶</button>'+
        '<button id="lab-pdf-btn" style="'+navBtnStyle+'background:rgba(255,255,255,0.35);">PDF</button>'+
      '</div>'+
      // Row 2: ANALYSIS | date+time+delete button | 🔍 transparent
      '<div style="display:flex;gap:4px;margin-bottom:6px;align-items:stretch;flex-shrink:0;">'+
        '<button id="lab-analysis-btn" style="'+navBtnStyle+'background:rgba(255,255,255,0.55);flex:1;">🔬 ANALYSIS</button>'+
        '<div style="flex:1;position:relative;">'+
          '<button id="lab-date-display" style="width:100%;height:100%;background:rgba(255,255,255,0.55);border-radius:12px;border:none;padding:6px 4px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:default;">'+
            '<div style="font-family:DM Mono,monospace;font-size:12px;font-weight:500;color:#2d1a00;line-height:1.3;">'+testDateLabel+'</div>'+
            '<div style="font-family:DM Mono,monospace;font-size:11px;font-weight:400;color:#5a3800;">'+(displayLab?displayLab.time:'—')+'</div>'+
          '</button>'+
          (displayLab?'<button id="lab-del-btn" style="position:absolute;top:3px;right:5px;background:none;border:none;font-size:11px;font-weight:900;color:#92400e;line-height:1;padding:0;cursor:pointer;">✕</button>':'')+
        '</div>'+
        '<button id="lab-cal-btn" style="flex:0 0 auto;background:transparent;border:none;padding:0 8px;font-size:22px;cursor:pointer;">🔍</button>'+
      '</div>'+
      (allLabs.length>0?'<div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;color:#5a3800;text-transform:uppercase;letter-spacing:0.06em;text-align:center;margin-bottom:4px;flex-shrink:0;">Result '+(idx+1)+' of '+allLabs.length+'</div>':'')+
      '<div style="flex:1;overflow-y:auto;overscroll-behavior:none;-webkit-overflow-scrolling:touch;min-height:0;padding-bottom:8px;">'+labResultsHtml+'</div>'+
      '</div>';

    document.getElementById('lab-enter-btn').addEventListener('click',showLabEntryModal);
    document.getElementById('lab-prev-btn').addEventListener('click',function(){
      state.labHistoryIndex=Math.min(allLabs.length-1,state.labHistoryIndex+1);
      state.aiRecs=null;render();
    });
    document.getElementById('lab-next-btn').addEventListener('click',function(){
      state.labHistoryIndex=Math.max(0,state.labHistoryIndex-1);
      state.aiRecs=null;render();
    });
    document.getElementById('lab-pdf-btn').addEventListener('click',triggerPdfExport);
    document.getElementById('lab-analysis-btn').addEventListener('click',showAnalysisPopup);
    if(displayLab){
      var delBtn=document.getElementById('lab-del-btn');
      if(delBtn)delBtn.addEventListener('click',function(){confirmDelete(displayLab.id);});
    }
    document.getElementById('lab-cal-btn').addEventListener('click',function(){
      showLabCalendar(labDates, testDateLabel);
    });
  }

  // ─── LAB CALENDAR PICKER ─────────────────────────────────────────────────
  function showLabCalendar(labDates, currentDate) {
    // Start calendar on month of currently displayed result (or today)
    var startDate = currentDate && currentDate!=='—' ? new Date(currentDate+'T12:00:00') : new Date();
    var calYear = startDate.getFullYear();
    var calMonth = startDate.getMonth();

    function renderCalendar(year, month) {
      var modal = document.getElementById('modal-container');
      var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      var today = getAdjustedDateString();
      var firstDay = new Date(year, month, 1).getDay(); // 0=Sun
      var daysInMonth = new Date(year, month+1, 0).getDate();
      var monthStr = year+'-'+String(month+1).padStart(2,'0');

      // Build calendar grid
      var cells = '';
      // Day headers
      ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d){
        cells += '<div style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;color:#5a3800;text-align:center;padding:4px 0;">'+d+'</div>';
      });
      // Empty cells before first day
      for(var e=0;e<firstDay;e++){
        cells += '<div></div>';
      }
      // Day cells
      for(var day=1;day<=daysInMonth;day++){
        var dstr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
        var hasResult = !!labDates[dstr];
        var isCurrent = dstr === currentDate;
        var isToday = dstr === today;
        var cellStyle, textStyle;
        if(isCurrent){
          cellStyle = 'background:#2d1a00;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin:auto;cursor:pointer;';
          textStyle = 'font-family:DM Mono,monospace;font-size:13px;font-weight:700;color:#ffbf2b;';
        } else if(hasResult){
          cellStyle = 'background:#f9b622;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin:auto;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);';
          textStyle = 'font-family:DM Mono,monospace;font-size:13px;font-weight:700;color:#2d1a00;';
        } else {
          cellStyle = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin:auto;';
          textStyle = 'font-family:DM Mono,monospace;font-size:13px;font-weight:400;color:#b89040;';
        }
        var todayDot = isToday ? '<div style="width:4px;height:4px;background:'+(isCurrent?'#ffbf2b':'#2d1a00')+';border-radius:50%;margin:0 auto;margin-top:1px;"></div>' : '';
        var clickAttr = hasResult ? 'data-labdate="'+dstr+'"' : '';
        cells += '<div style="text-align:center;padding:2px 0;">'+
          '<div '+clickAttr+' style="'+cellStyle+'">'+
            '<div>'+
              '<div style="'+textStyle+'">'+day+'</div>'+
              todayDot+
            '</div>'+
          '</div>'+
        '</div>';
      }

      modal.innerHTML =
        '<div class="modal" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'">'+
          '<div class="modal-content" onclick="event.stopPropagation()" style="padding:20px;border-radius:28px 28px 0 0;">'+
            // Month nav
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'+
              '<button id="cal-prev-month" style="background:#ffbf2b;border:none;border-radius:10px;width:36px;height:36px;font-size:18px;font-weight:900;color:#2d1a00;">◀</button>'+
              '<div style="font-family:Syne,sans-serif;font-size:16px;font-weight:800;color:#2d1a00;">'+monthNames[month]+' '+year+'</div>'+
              '<button id="cal-next-month" style="background:#ffbf2b;border:none;border-radius:10px;width:36px;height:36px;font-size:18px;font-weight:900;color:#2d1a00;">▶</button>'+
            '</div>'+
            // Legend
            '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">'+
              '<div style="display:flex;align-items:center;gap:4px;"><div style="width:14px;height:14px;background:#f9b622;border-radius:50%;"></div><span style="font-family:Syne,sans-serif;font-size:10px;color:#5a3800;font-weight:700;">Has results</span></div>'+
              '<div style="display:flex;align-items:center;gap:4px;"><div style="width:14px;height:14px;background:#2d1a00;border-radius:50%;"></div><span style="font-family:Syne,sans-serif;font-size:10px;color:#5a3800;font-weight:700;">Selected</span></div>'+
            '</div>'+
            // Grid
            '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:16px;">'+cells+'</div>'+
            '<button id="cal-close-btn" style="width:100%;background:#f1f5f9;color:#475569;font-family:Syne,sans-serif;font-weight:800;padding:12px;border-radius:16px;border:none;font-size:13px;">CLOSE</button>'+
          '</div>'+
        '</div>';

      // Wire month nav
      document.getElementById('cal-prev-month').addEventListener('click',function(e){
        e.stopPropagation();
        var nm = month-1;
        var ny = year;
        if(nm<0){nm=11;ny--;}
        renderCalendar(ny,nm);
      });
      document.getElementById('cal-next-month').addEventListener('click',function(e){
        e.stopPropagation();
        var nm = month+1;
        var ny = year;
        if(nm>11){nm=0;ny++;}
        renderCalendar(ny,nm);
      });
      document.getElementById('cal-close-btn').addEventListener('click',function(){
        document.getElementById('modal-container').innerHTML='';
      });
      // Wire result day taps
      modal.querySelectorAll('[data-labdate]').forEach(function(el){
        el.addEventListener('click',function(e){
          e.stopPropagation();
          var picked=this.getAttribute('data-labdate');
          var allLabs=getLabsSorted();
          var foundIdx=allLabs.findIndex(function(l){return l.date===picked;});
          if(foundIdx!==-1){
            state.labHistoryIndex=foundIdx;
            state.aiRecs=null;
            document.getElementById('modal-container').innerHTML='';
            render();
          }
        });
      });
    }

    renderCalendar(calYear, calMonth);
  }

  function showAnalysisPopup(){
    var modal=document.getElementById('modal-container');
    var html=state.analysisHtml||'<div style="font-style:italic;opacity:0.5;font-size:13px;">All markers within normal range.</div>';
    modal.innerHTML='<div class="modal" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'"><div class="modal-content" onclick="event.stopPropagation()"><div style="font-size:16px;font-weight:900;color:#0e7490;margin-bottom:16px;">🔬 Clinical Analysis</div><div style="max-height:60vh;overflow-y:auto;">'+html+'</div><button id="analysis-close" class="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl mt-6">CLOSE</button></div></div>';
    document.getElementById('analysis-close').addEventListener('click',function(){document.getElementById('modal-container').innerHTML='';});
  }

  function showAIRecsPopup(outOfRangeList){
    var modal=document.getElementById('modal-container');
    var content=state.aiRecs?state.aiRecs.replace(/\n/g,'<br>'):'<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 0;"><div style="font-size:13px;color:#64748b;font-weight:600;">'+(outOfRangeList.length?'Tap below for AI-powered recommendations.':'All markers within normal range.')+'</div>'+(outOfRangeList.length?'<button id="ai-load-btn" style="background:#d97706;color:white;font-weight:900;padding:12px 24px;border-radius:14px;font-size:13px;">LOAD RECOMMENDATIONS</button>':'')+'</div>';
    modal.innerHTML='<div class="modal" onclick="document.getElementById(\'modal-container\').innerHTML=\'\'"><div class="modal-content" onclick="event.stopPropagation()"><div style="font-size:16px;font-weight:900;color:#d97706;margin-bottom:16px;">🤖 AI Recommendations</div><div id="ai-popup-content" style="max-height:60vh;overflow-y:auto;font-size:13px;line-height:1.6;">'+content+'</div><button id="ai-close" class="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl mt-6">CLOSE</button></div></div>';
    document.getElementById('ai-close').addEventListener('click',function(){document.getElementById('modal-container').innerHTML='';});
    var loadBtn=document.getElementById('ai-load-btn');
    if(loadBtn)loadBtn.addEventListener('click',function(){fetchAIRecs(outOfRangeList);});
  }

  function fetchAIRecs(list){
    var el=document.getElementById('ai-popup-content');
    if(el)el.innerHTML='<div style="text-align:center;padding:20px;font-style:italic;opacity:0.5;">Loading recommendations…</div>';
    fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        messages:[{role:'user',content:'You are a clinical assistant helping caregivers understand lab results for Ryan Nguyen, a patient with Diabetes Insipidus. The following markers are out of normal range:\n\n'+list.join('\n')+'\n\nProvide brief, practical recommendations for each out-of-range value. Keep it concise and caregiver-friendly.'}]
      })
    })
    .then(function(r){return r.json();})
    .then(function(d){
      var recs=d.content&&d.content[0]?d.content[0].text:'No recommendations available.';
      state.aiRecs=recs;
      var el2=document.getElementById('ai-popup-content');
      if(el2)el2.innerHTML='<div style="font-size:13px;line-height:1.6;">'+recs.replace(/\n/g,'<br>')+'</div>';
    })
    .catch(function(e){
      var el3=document.getElementById('ai-popup-content');
      if(el3)el3.innerHTML='<div style="color:#dc2626;font-size:13px;">Error loading recommendations.</div>';
      console.error(e);
    });
  }

  function navHistory(dir){
    var allLabs=getLabsSorted();
    state.labHistoryIndex=Math.max(0,Math.min(allLabs.length-1,state.labHistoryIndex+dir));
    state.aiRecs=null;render();
  }

  function show30DayTrend(m){
    var cutoff=new Date(new Date().getTime()-30*24*60*60*1000);
    var history=state.allLogs.filter(function(l){return l.type==='Labs'&&new Date(l.date)>=cutoff;})
      .map(function(l){try{var meta=JSON.parse(l.metadata.replace(' ALERT','')||'{}');return{date:l.date,val:parseFloat(meta[m])};}catch(e){return{date:l.date,val:NaN};}})
      .filter(function(h){return!isNaN(h.val);})
      .sort(function(a,b){return new Date(a.date)-new Date(b.date);})
      .slice(-8);
    var ref=LAB_REF[m];var tc=document.getElementById('trend-container');
    if(!history.length){tc.innerHTML='<div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:center;justify-content:center;"><div style="background:#fef9c3;padding:32px;border-radius:32px;width:85%;text-align:center;border:4px solid white;"><div style="font-weight:900;font-size:18px;margin-bottom:8px;">'+m+'</div><div style="font-size:13px;opacity:0.6;">Not enough data.</div><button id="trend-close-empty" style="margin-top:24px;width:100%;background:rgba(255,255,255,0.8);font-weight:900;padding:12px;border-radius:16px;font-size:14px;">CLOSE</button></div></div>';document.getElementById('trend-close-empty').addEventListener('click',function(){tc.innerHTML='';});return;}
    var n=history.length,range=(ref.max*1.5)-(ref.min*0.5);
    var points=history.map(function(h,i){var x=n>1?(i/(n-1))*100:50;var y=100-Math.min(90,Math.max(10,((h.val-(ref.min*0.5))/range)*100));return{x:x,y:y,val:h.val,date:h.date};});
    var svgPath=n>1?'M '+points[0].x+','+points[0].y+' '+points.slice(1).map(function(p){return'L '+p.x+','+p.y;}).join(' '):'';
    tc.innerHTML='<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;"><div style="background:#fef9c3;padding:20px 16px;border-radius:32px;width:92%;border:3px solid white;box-shadow:0 20px 40px rgba(0,0,0,0.3);"><div style="font-size:13px;font-weight:900;text-transform:uppercase;text-align:center;margin-bottom:16px;color:#713f12;">'+m+' · 30-Day Trend</div><div style="display:flex;align-items:flex-end;gap:2px;height:160px;padding:0 4px;margin-bottom:12px;">'+points.map(function(p){return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;position:relative;"><div style="position:absolute;top:'+Math.max(0,p.y-10)+'%;font-size:11px;font-weight:900;color:#1e3a8a;white-space:nowrap;">'+p.val+'</div><div style="position:absolute;top:'+p.y+'%;width:10px;height:10px;background:#1e40af;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);transform:translateY(-50%);"></div><div style="position:absolute;bottom:0;font-size:9px;font-weight:700;color:#92400e;opacity:0.8;">'+p.date.slice(5)+'</div></div>';}).join('')+'</div><div style="position:relative;height:0;margin-top:-172px;margin-bottom:172px;pointer-events:none;"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;width:100%;height:160px;overflow:visible;">'+(svgPath?'<path d="'+svgPath+'" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>':'')+'</svg></div><div style="text-align:center;font-weight:900;color:#1e3a8a;font-size:12px;margin-bottom:14px;border-top:1px solid rgba(0,0,0,0.1);padding-top:10px;">Normal: '+ref.min+' – '+ref.max+' '+ref.unit+'</div><button id="trend-close" style="width:100%;background:rgba(255,255,255,0.8);color:#1e3a8a;font-weight:900;padding:12px;border-radius:14px;font-size:14px;">CLOSE</button></div></div>';
    document.getElementById('trend-close').addEventListener('click',function(){tc.innerHTML='';});
  }

  // ─── LAB ENTRY — using universal keypad for time ──────────────────────────
  function showLabEntryModal(){
    var modal=document.getElementById('modal-container');
    var currentDate=document.getElementById('date-navigator').value;
    modal.innerHTML='<div class="modal"><div style="background:#4b5563;width:100%;border-radius:32px 32px 0 0;padding:24px;max-height:90vh;overflow-y:auto;"><h2 style="font-weight:900;font-size:20px;color:#dbeafe;margin-bottom:20px;">🔬 Blood Draw Date</h2><div style="padding:16px;background:#6b7280;border-radius:16px;border:1px solid #9ca3af;margin-bottom:20px;"><label style="font-size:10px;font-weight:900;color:#e5e7eb;text-transform:uppercase;letter-spacing:0.08em;">Date of Blood Draw</label><input type="date" id="lab-draw-date" value="'+currentDate+'" style="width:100%;padding:10px;background:#374151;border:1px solid #9ca3af;border-radius:10px;font-weight:900;margin-top:6px;color:#ffffff;font-size:14px;"></div><button id="lab-date-next" style="width:100%;background:#2563eb;color:white;font-weight:900;padding:16px;border-radius:16px;margin-bottom:10px;font-size:14px;">NEXT — ENTER DRAW TIME ▶</button><button id="lab-date-cancel" style="width:100%;color:#e5e7eb;font-weight:700;font-size:13px;padding:8px;">CANCEL</button></div></div>';
    document.getElementById('lab-date-cancel').addEventListener('click',function(){document.getElementById('modal-container').innerHTML='';});
    document.getElementById('lab-date-next').addEventListener('click',function(){
      var dateEl=document.getElementById('lab-draw-date');
      state.labDrawDate=dateEl?dateEl.value:currentDate;
      showUniversalKeypad({mode:'time',label:'🔬 Blood Draw Time',
        onConfirm:function(_,timeStr){
          state.labDrawTime=timeStr;
          state.labEntryValues={};state.labEntryKeys=Object.keys(LAB_REF);state.labEntryCurrentIdx=0;
          showKeypadForMarker();
        }});
    });
  }

  function showKeypadForMarker(){
    var keys=state.labEntryKeys,idx=state.labEntryCurrentIdx,key=keys[idx],ref=LAB_REF[key];
    var current=state.labEntryValues[key]||'';
    var modal=document.getElementById('modal-container');
    var dots=keys.map(function(k,i){var filled=state.labEntryValues[k]!==undefined&&state.labEntryValues[k]!=='',active=i===idx;return'<div style="width:8px;height:8px;border-radius:50%;background:'+(active?'#60a5fa':filled?'#34d399':'#9ca3af')+';'+(active?'transform:scale(1.4);':'')+'"></div>';}).join('');
    var rangeCheck='';
    if(current){var v=parseFloat(current);if(!isNaN(v)){var isOut=v<ref.min||v>ref.max;rangeCheck='<div style="font-size:11px;font-weight:900;margin-top:6px;color:'+(isOut?'#fca5a5':'#86efac')+';">'+(isOut?'⚠️ Out of range':'✓ Within normal range')+'</div>';}}
    var keysHtml=['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(function(k){var isDel=k==='⌫';return'<button class="labkp-num" data-v="'+k+'" style="padding:16px;border-radius:14px;font-weight:900;font-size:22px;background:'+(isDel?'#dc2626':'#6b7280')+';color:#ffffff;border:1px solid '+(isDel?'#ef4444':'#9ca3af')+';">'+k+'</button>';}).join('');
    modal.innerHTML='<div class="modal"><div style="background:#4b5563;width:100%;border-radius:32px 32px 0 0;padding:20px 20px 32px;max-height:92vh;overflow-y:auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><div style="font-size:10px;font-weight:900;color:#e5e7eb;text-transform:uppercase;letter-spacing:0.08em;">'+(idx+1)+' of '+keys.length+'</div><button id="labkp-close" style="background:#6b7280;color:#f3f4f6;font-weight:900;font-size:12px;padding:6px 14px;border-radius:10px;border:1px solid #9ca3af;">✕ CLOSE</button></div><div style="display:flex;justify-content:center;gap:5px;margin-bottom:16px;">'+dots+'</div><div style="text-align:center;margin-bottom:12px;"><div style="font-weight:900;font-size:26px;color:#dbeafe;">'+key+'</div><div style="font-size:16px;font-weight:900;color:#fef08a;margin-top:8px;background:#6b7280;padding:8px 16px;border-radius:10px;display:inline-block;">'+ref.min+' – '+ref.max+' '+ref.unit+'</div></div><div style="text-align:center;background:#6b7280;border-radius:16px;padding:18px;margin:0 4px 16px;border:2px solid #9ca3af;"><div style="font-weight:900;font-size:40px;color:#ffffff;min-height:50px;letter-spacing:3px;">'+(current||'<span style="opacity:0.3">—</span>')+'</div>'+rangeCheck+'</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 4px;margin-bottom:12px;">'+keysHtml+'</div><div style="display:flex;gap:8px;padding:0 4px;"><button id="labkp-skip" style="flex:1;padding:14px;border-radius:14px;font-weight:900;font-size:13px;background:#6b7280;color:#e5e7eb;border:1px solid #9ca3af;">SKIP</button><button id="labkp-next" style="flex:2;padding:14px;border-radius:14px;font-weight:900;font-size:14px;background:#2563eb;color:white;">'+(idx<keys.length-1?'NEXT →':'SAVE PANEL')+'</button></div></div></div>';
    // Wire all with addEventListener
    document.getElementById('labkp-close').addEventListener('click',function(){document.getElementById('modal-container').innerHTML='';});
    document.getElementById('labkp-skip').addEventListener('click',function(){if(state.labEntryCurrentIdx<state.labEntryKeys.length-1){state.labEntryCurrentIdx++;showKeypadForMarker();}else{saveLabsFromKeypad();}});
    document.getElementById('labkp-next').addEventListener('click',function(){if(state.labEntryCurrentIdx<state.labEntryKeys.length-1){state.labEntryCurrentIdx++;showKeypadForMarker();}else{saveLabsFromKeypad();}});
    document.querySelectorAll('.labkp-num').forEach(function(btn){
      btn.addEventListener('click',function(){
        var k=this.getAttribute('data-v');
        var key2=state.labEntryKeys[state.labEntryCurrentIdx];
        var cur=state.labEntryValues[key2]||'';
        if(k==='⌫'){cur=cur.slice(0,-1);}else if(k==='.'&&cur.includes('.')){return;}else{cur+=k;}
        state.labEntryValues[key2]=cur;showKeypadForMarker();
      });
    });
  }

  function saveLabsFromKeypad(){
    var data={};
    Object.keys(state.labEntryValues).forEach(function(k){if(state.labEntryValues[k])data[k]=state.labEntryValues[k];});
    if(!Object.keys(data).length){alert('No values entered.');document.getElementById('modal-container').innerHTML='';return;}
    var isAlert=Object.keys(data).some(function(k){var v=parseFloat(data[k]),ref=LAB_REF[k];return ref&&(v<ref.min||v>ref.max);});
    state.aiRecs=null;
    sbInsert('logs',{date:state.labDrawDate,caregiver:state.caregiver,type:'Labs',
      amount:'Panel drawn '+state.labDrawDate+' @ '+state.labDrawTime,
      time:state.labDrawTime,metadata:JSON.stringify(data)+(isAlert?' ALERT':'')})
      .then(function(){document.getElementById('modal-container').innerHTML='';state.labHistoryIndex=0;showToast('Lab panel saved ✓','success');loadData();})
      .catch(function(e){showToast('Save error','error');console.error(e);});
  }

  // ─── UTILITIES ───────────────────────────────────────────────────────────
  function triggerPdfExport(){
    showToast('Generating report…','info');
    fetch(GAS_PDF_URL+'?action=generateReport')
      .then(function(r){return r.json();})
      .then(function(result){
        if(result.error){showToast('Report error','error');return;}
        showToast('Report saved to Logs ✓','success');state.view='logs';loadData();
      })
      .catch(function(e){showToast('Report failed','error');console.error(e);});
  }

  function changeLimit(){
    var v=prompt('New Daily Water Limit (ml):',state.waterLimit);
    if(v){
      sbUpsert('settings',[{key:'water_limit',value:v.toString()}])
        .then(function(){loadData();})
        .catch(function(e){showToast('Save error','error');console.error(e);});
    }
  }

  function showToast(m,t){
    var toast=document.createElement('div');
    var color=t==='success'?'bg-green-600':t==='error'?'bg-red-600':'bg-blue-600';
    toast.className='fixed bottom-24 left-1/2 -translate-x-1/2 '+color+' text-white px-6 py-3 rounded-full z-[100] text-[10px] font-black shadow-2xl';
    toast.innerText=m;document.body.appendChild(toast);setTimeout(function(){toast.remove();},3000);
  }

  function nav(v){
    state.view=v;
    if(v==='dash'&&state.category!=='Meds'&&state.category!=='Tasks') state.category='Meds';
    state.labHistoryIndex=0; state.aiRecs=null;
    render();
  }
  function deleteLog(id){confirmDelete(id);}
