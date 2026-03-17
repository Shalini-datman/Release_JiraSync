import { useState, useRef, useEffect, useMemo } from "react";

// Inject Inter font
if(typeof document!=="undefined"&&!document.getElementById("datman-fonts")){
  const l=document.createElement("link");l.id="datman-fonts";l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";
  document.head.appendChild(l);
}
// Inter for all UI; Liberation Serif / Libre Baskerville only on Form headings & labels
const FONT="'Inter','DM Sans',sans-serif";
const FONT_DISPLAY="'Liberation Serif','Libre Baskerville','Georgia',serif";

// ─── Brand Palette ─────────────────────────────────────────────────────────────
const B = {
  teal:"#0ea5c8", cyan:"#22d3ee", blue:"#1d6fa4", deepBlue:"#0f4c7a",
  lime:"#84cc16", green:"#22c55e",
  bgDark:"#000000", bgCard:"#0d0d0d", bgRow:"#141414", bgPanel:"#1a1a1a",
  border:"#222222", border2:"#2a2a2a",
  textPrimary:"#e0f2fe", textSecondary:"#7db8d4", textMuted:"#4a7a96",
  grad1:"linear-gradient(135deg, #0ea5c8, #1d6fa4)",
};

const PRIORITIES    = ["P0","P1","P2","P3","P4"];
const MODULES       = ["Payments","Payouts","General","App","Portal","Web"];
const RELEASE_TYPES = ["New Feature","Improvement","Patch","Bug"]; // kept separate in form
const STATUSES      = ["Planning","In Progress","Released","Delayed","Cancelled"];
const GATEWAY_MODULES = ["General","Payments","Payouts"];
const APP_MODULES     = ["Portal","Web","App"];

const STATUS_COLORS   = { Planning:B.teal, "In Progress":B.cyan, Released:B.lime, Delayed:"#f97316", Cancelled:B.textMuted };
const PRIORITY_COLORS = { Hotfix:"#dc2626", P0:"#ff00ff", P1:"#ef4444", P2:"#f97316", P3:B.cyan, P4:B.lime };
const TYPE_COLORS = {
  "New Feature": "#22c55e",   // green
  "Improvement": "#1d6fa4",   // Datman logo blue
  "Patch":       "#a855f7",   // purple — clearly distinct from red
  "Bug":         "#ef4444",   // red — danger/critical
};
const TYPE_COLOR  = t => TYPE_COLORS[t] || "#0ea5c8";
// Display: New Feature & Improvement shown separately in table/form, but clubbed in analytics charts
const TYPE_CLUB   = t => (t==="New Feature"||t==="Improvement")?"Feature/Imp":t;

const mkDate = (y,m,d) => `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

function parseDDMMYYYY(s) {
  if(!s||s==="NA")return null;
  const [d,m,y]=s.split("/");
  return new Date(+y,+m-1,+d);
}
function daysBetween(a,b){
  const da=new Date(a),db=new Date(b);
  if(isNaN(da)||isNaN(db))return null;
  return Math.round((db-da)/(86400000));
}
function leadTimeDays(handover,release){
  const h=parseDDMMYYYY(handover);
  const r=release?new Date(release):null;
  if(!h||!r||isNaN(r))return null;
  return Math.max(0,Math.round((r-h)/86400000));
}


// ─── Shared UI pieces ─────────────────────────────────────────────────────────
const inputStyle={width:"100%",background:"#111111",border:`1px solid ${B.border2}`,borderRadius:10,color:B.textPrimary,padding:"0.75rem 1rem",fontSize:"0.9rem",outline:"none",fontFamily:FONT,boxSizing:"border-box"};
const primaryBtn={width:"100%",padding:"0.875rem",borderRadius:12,border:"none",cursor:"pointer",background:B.grad1,color:"#fff",fontSize:"0.95rem",fontWeight:700,fontFamily:FONT};
const tdSt={padding:"0.65rem 0.9rem",borderBottom:`1px solid ${B.border}`};

function Chip({label,color,small}){
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,padding:small?"0.12rem 0.45rem":"0.2rem 0.55rem",borderRadius:99,fontSize:small?"0.65rem":"0.7rem",fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;
}
function StatusBadge({s}){const c=STATUS_COLORS[s]||B.textMuted;return <span style={{background:c+"22",color:c,border:`1px solid ${c}44`,padding:"0.2rem 0.55rem",borderRadius:99,fontSize:"0.7rem",fontWeight:700,display:"inline-flex",alignItems:"center",gap:"0.3rem",whiteSpace:"nowrap"}}><span style={{width:5,height:5,borderRadius:"50%",background:c,flexShrink:0}}/>{s}</span>;}
function Field({label,error,highlight,children}){return(<div><label style={{display:"block",color:highlight?B.cyan:B.textSecondary,fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700,marginBottom:"0.5rem"}}>{label}{highlight&&<span style={{color:B.cyan,marginLeft:"0.3rem",fontSize:"0.65rem"}}>● missing</span>}</label>{children}{error&&<span style={{color:"#ef4444",fontSize:"0.75rem",marginTop:"0.25rem",display:"block"}}>{error}</span>}</div>);}
function SectionLabel({children,sub}){return <div style={{marginBottom:"0.75rem"}}><span style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700}}>{children}</span>{sub&&<span style={{color:B.textMuted,fontSize:"0.75rem",fontWeight:400,marginLeft:"0.5rem"}}>{sub}</span>}</div>;}
function LogoMark({size=32}){
  // Datman logo: segmented concentric arcs in teal/blue/green palette
  const s=size, cx=s/2, cy=s/2;
  const r1=s*0.46, r2=s*0.33, r3=s*0.20, r4=s*0.09;
  const sw1=s*0.09, sw2=s*0.085, sw3=s*0.08, sw4=s*0.08;
  // arc helper: returns SVG arc path for a segment
  const arc=(r,startDeg,endDeg)=>{
    const s2r=d=>(d-90)*Math.PI/180;
    const x1=cx+r*Math.cos(s2r(startDeg)), y1=cy+r*Math.sin(s2r(startDeg));
    const x2=cx+r*Math.cos(s2r(endDeg)),   y2=cy+r*Math.sin(s2r(endDeg));
    const large=endDeg-startDeg>180?1:0;
    return `M${x1},${y1} A${r},${r},0,${large},1,${x2},${y2}`;
  };
  return(
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      {/* Outer ring – teal segments */}
      <path d={arc(r1,0,80)}    stroke="#0ea5c8" strokeWidth={sw1} strokeLinecap="round"/>
      <path d={arc(r1,95,170)}  stroke="#22d3ee" strokeWidth={sw1} strokeLinecap="round"/>
      <path d={arc(r1,185,270)} stroke="#0ea5c8" strokeWidth={sw1} strokeLinecap="round"/>
      <path d={arc(r1,285,355)} stroke="#1d6fa4" strokeWidth={sw1} strokeLinecap="round"/>
      {/* Middle ring – blue/teal */}
      <path d={arc(r2,10,110)}  stroke="#1d6fa4" strokeWidth={sw2} strokeLinecap="round"/>
      <path d={arc(r2,125,210)} stroke="#0ea5c8" strokeWidth={sw2} strokeLinecap="round"/>
      <path d={arc(r2,225,340)} stroke="#22d3ee" strokeWidth={sw2} strokeLinecap="round"/>
      {/* Inner ring – green segments */}
      <path d={arc(r3,20,120)}  stroke="#22c55e" strokeWidth={sw3} strokeLinecap="round"/>
      <path d={arc(r3,140,250)} stroke="#84cc16" strokeWidth={sw3} strokeLinecap="round"/>
      <path d={arc(r3,265,355)} stroke="#22c55e" strokeWidth={sw3} strokeLinecap="round"/>
      {/* Core dot */}
      <circle cx={cx} cy={cy} r={r4} fill="#1d6fa4"/>
      <circle cx={cx} cy={cy} r={r4*0.5} fill="#22d3ee" opacity="0.8"/>
    </svg>
  );
}

// ─── Mini Calendar Picker ─────────────────────────────────────────────────────
function CalendarPicker({value,onChange,onClose}){
  // value = {from:"YYYY-MM-DD", to:"YYYY-MM-DD"} | null
  const today=new Date("2026-03-25");
  const [viewYear,setViewYear]=useState(today.getFullYear());
  const [viewMonth,setViewMonth]=useState(today.getMonth());
  const [selecting,setSelecting]=useState(null); // first click date
  const [hoverDate,setHoverDate]=useState(null);

  const from=value?.from?new Date(value.from):null;
  const to=value?.to?new Date(value.to):null;

  const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
  const firstDay=(y,m)=>new Date(y,m,1).getDay();
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const handleDay=(y,m,d)=>{
    const dateStr=fmt(new Date(y,m,d));
    if(!selecting){
      setSelecting(dateStr);
      onChange({from:dateStr,to:dateStr});
    } else {
      const a=selecting<dateStr?selecting:dateStr;
      const b=selecting<dateStr?dateStr:selecting;
      onChange({from:a,to:b});
      setSelecting(null);
    }
  };

  const dim=daysInMonth(viewYear,viewMonth);
  const fd=firstDay(viewYear,viewMonth);
  const cells=[];
  for(let i=0;i<fd;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(d);

  const isInRange=(d)=>{
    if(!from||!to||!d)return false;
    const dd=new Date(viewYear,viewMonth,d);
    return dd>=from&&dd<=to;
  };
  const isFrom=d=>d&&from&&fmt(new Date(viewYear,viewMonth,d))===fmt(from);
  const isTo=d=>d&&to&&fmt(new Date(viewYear,viewMonth,d))===fmt(to);

  const QUICK=[["Last 7d",7],["Last 14d",14],["Last 30d",30],["Last 90d",90]];
  const applyQuick=days=>{
    const t=new Date("2026-03-25"),f=new Date(t);f.setDate(f.getDate()-days);
    onChange({from:fmt(f),to:fmt(t)});setSelecting(null);
  };

  return(
    <div style={{background:B.bgCard,border:`1px solid ${B.border2}`,borderRadius:16,padding:"1rem",width:280,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",fontFamily:FONT,position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:200}}>
      {/* Quick ranges */}
      <div style={{display:"flex",gap:"0.3rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
        {QUICK.map(([l,d])=>(
          <button key={l} onClick={()=>applyQuick(d)} style={{background:"#0d0d0d",border:`1px solid ${B.border2}`,color:B.textSecondary,borderRadius:8,padding:"0.25rem 0.55rem",fontSize:"0.7rem",fontWeight:600,cursor:"pointer",fontFamily:FONT}}>{l}</button>
        ))}
      </div>
      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.6rem"}}>
        <button onClick={()=>{let nm=viewMonth-1,ny=viewYear;if(nm<0){nm=11;ny--;}setViewMonth(nm);setViewYear(ny);}} style={{background:"none",border:"none",color:B.textSecondary,cursor:"pointer",fontSize:"1rem",padding:"0 0.4rem"}}>‹</button>
        <span style={{color:B.textPrimary,fontWeight:700,fontSize:"0.85rem"}}>{monthNames[viewMonth]} {viewYear}</span>
        <button onClick={()=>{let nm=viewMonth+1,ny=viewYear;if(nm>11){nm=0;ny++;}setViewMonth(nm);setViewYear(ny);}} style={{background:"none",border:"none",color:B.textSecondary,cursor:"pointer",fontSize:"1rem",padding:"0 0.4rem"}}>›</button>
      </div>
      {/* Day headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:"0.3rem"}}>
        {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",color:B.textMuted,fontSize:"0.65rem",fontWeight:700,padding:"0.2rem"}}>{d}</div>)}
      </div>
      {/* Cells */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={i}/>;
          const inRange=isInRange(d),isF=isFrom(d),isT=isTo(d);
          const isEnd=isF||isT;
          return(
            <div key={i} onClick={()=>handleDay(viewYear,viewMonth,d)}
              onMouseEnter={()=>setHoverDate(fmt(new Date(viewYear,viewMonth,d)))}
              onMouseLeave={()=>setHoverDate(null)}
              style={{textAlign:"center",padding:"0.3rem 0",borderRadius:isEnd?99:4,cursor:"pointer",fontSize:"0.78rem",fontWeight:isEnd?700:400,
                background:isEnd?"#0ea5c8":inRange?"#0ea5c822":"transparent",
                color:isEnd?"#fff":inRange?B.cyan:B.textSecondary,transition:"all 0.1s"}}>
              {d}
            </div>
          );
        })}
      </div>
      {/* Footer */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.75rem",borderTop:`1px solid ${B.border}`,paddingTop:"0.6rem"}}>
        <span style={{color:B.textMuted,fontSize:"0.7rem"}}>{from?`${fmt(from)} → ${fmt(to||from)}`:"No range"}</span>
        <button onClick={onClose} style={{background:B.grad1,border:"none",color:"#fff",borderRadius:8,padding:"0.3rem 0.8rem",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:FONT}}>Apply</button>
      </div>
    </div>
  );
}

// ─── DORA Popup (floating, fixed near click) ──────────────────────────────────
function DoraPopup({release,pos,onClose}){
  if(!release)return null;
  const lt=leadTimeDays(release.dora?.handoverDate,release.releaseActual);
  const delay=release.releaseActual&&release.releasePlanned?daysBetween(release.releasePlanned,release.releaseActual):null;
  // Clamp position
  const LEFT=Math.min(pos.x,window.innerWidth-480);
  const TOP=Math.min(pos.y,window.innerHeight-420);
  return(
    <div style={{position:"fixed",left:LEFT,top:TOP,zIndex:500,background:B.bgCard,border:`1px solid ${B.teal}55`,borderRadius:16,padding:"1.25rem 1.4rem",width:440,boxShadow:"0 24px 60px rgba(0,0,0,0.6)",fontFamily:FONT}}
      onClick={e=>e.stopPropagation()}>
      {/* Top accent */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"16px 16px 0 0",background:B.grad1}}/>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginTop:"0.2rem",marginBottom:"1rem"}}>
        <span style={{background:B.blue,borderRadius:6,padding:"0.2rem 0.5rem",fontSize:"0.65rem",fontWeight:800,color:"#fff",letterSpacing:"0.05em"}}>DORA</span>
        <span style={{color:B.cyan,fontWeight:700,fontSize:"0.88rem"}}>{release.rn}</span>
        <StatusBadge s={release.status}/>
        <button onClick={onClose} style={{marginLeft:"auto",background:"transparent",border:`1px solid ${B.border2}`,color:B.textMuted,borderRadius:8,padding:"0.25rem 0.55rem",cursor:"pointer",fontSize:"0.8rem",fontFamily:FONT}}>✕</button>
      </div>
      <div style={{color:B.textPrimary,fontWeight:700,fontSize:"0.92rem",marginBottom:"0.3rem"}}>{release.summary}</div>
      <div style={{color:B.textMuted,fontSize:"0.76rem",marginBottom:"1rem"}}>{release.goal}</div>
      {/* DORA fields grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.6rem",marginBottom:"0.75rem"}}>
        {[
          ["Lead Developer",release.dora?.leadDeveloper,B.cyan],
          ["Application",   release.dora?.application,  B.textPrimary],
          ["Services",      release.dora?.services,      B.textPrimary],
          ["QA Status",     release.dora?.qa,            release.dora?.qa==="Done"?B.lime:release.dora?.qa==="Pending"?"#f97316":"#ef4444"],
          ["Original RN",   release.dora?.originalRNLink,B.teal],
          ["Handover Date", release.dora?.handoverDate,  B.lime],
        ].map(([k,v,c])=>(
          <div key={k} style={{background:"#0d0d0d",borderRadius:8,padding:"0.55rem 0.7rem",borderLeft:`3px solid ${c}44`}}>
            <div style={{color:B.textMuted,fontSize:"0.58rem",textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:"0.2rem"}}>{k}</div>
            <div style={{color:c,fontWeight:600,fontSize:"0.8rem"}}>{v||"—"}</div>
          </div>
        ))}
      </div>
      {/* Lead time & delay highlight row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
        <div style={{background:"#0d0d0d",borderRadius:8,padding:"0.55rem 0.7rem",borderLeft:`3px solid ${B.lime}`}}>
          <div style={{color:B.textMuted,fontSize:"0.58rem",textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:"0.2rem"}}>Lead Time (Handover→Release)</div>
          <div style={{color:B.lime,fontWeight:800,fontSize:"1.2rem",lineHeight:1}}>{lt!==null?`${lt} days`:"Pending"}</div>
          {lt!==null&&<div style={{color:B.textMuted,fontSize:"0.65rem",marginTop:"0.2rem"}}>{release.dora?.handoverDate} → {release.releaseActual}</div>}
        </div>
        <div style={{background:"#0d0d0d",borderRadius:8,padding:"0.55rem 0.7rem",borderLeft:`3px solid ${delay&&delay>0?"#ef4444":B.lime}`}}>
          <div style={{color:B.textMuted,fontSize:"0.58rem",textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:"0.2rem"}}>Release Delay (Planned→Actual)</div>
          <div style={{color:delay&&delay>0?"#ef4444":B.lime,fontWeight:800,fontSize:"1.2rem",lineHeight:1}}>
            {delay===null?"Pending":delay===0?"On Time":`+${delay} days`}
          </div>
          {delay!==null&&<div style={{color:B.textMuted,fontSize:"0.65rem",marginTop:"0.2rem"}}>{fmtDate(release.releasePlanned)} → {fmtDate(release.releaseActual)||"—"}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Form Field — defined OUTSIDE FormPage so it never remounts on state change ──
function FField({label,error,optional,acc,children}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
      <label style={{color:error?"#f87171":acc||"#0ea5c8",fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",gap:"0.5rem"}}>
        {label}
        {optional&&<span style={{color:"rgba(255,255,255,0.25)",fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:"0.66rem"}}>(optional)</span>}
        {error&&<span style={{color:"#f87171",fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:"0.66rem"}}>— {error}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── FORM PAGE (2 steps) ──────────────────────────────────────────────────────
// fInput defined OUTSIDE component — stable object reference, no remount
const FORM_INPUT_STYLE = {
  background:"rgba(255,255,255,0.05)",
  border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:12, color:"#fff", fontFamily:"'Inter','DM Sans',sans-serif",
  fontSize:"0.9rem", padding:"0.8rem 1rem",
  width:"100%", boxSizing:"border-box", outline:"none",
};

function FormPage({onSubmit,onCancel,releases=[]}){
  const [sum,setSum]     = useState("");
  const [priority,setPri]= useState("P1");
  const [type,setType]   = useState("New Feature");
  const [planned,setPlan]= useState("");
  const [team,setTeam]   = useState("Gateway");
  const [rnLink,setRnLink]= useState("");
  const [goal,setGoal]   = useState("");
  const [approvals,setApp]= useState({Sandeep:false,Nitish:false,Pradeep:false,Muz:false,Sundar:false});
  const [modules,setMods] = useState([]);
  const [doraLead,setDoraLead]   = useState("");
  const [doraApp,setDoraApp]     = useState("");
  const [doraSvc,setDoraSvc]     = useState("");
  const [doraDate,setDoraDate]   = useState("");
  const [step,setStep]   = useState(1);
  const [errors,setErrors]= useState({});

  const toggleMod = m => setMods(ms => ms.includes(m) ? ms.filter(x=>x!==m) : [...ms, m]);
  const toggleApp = n => setApp(a => ({...a, [n]:!a[n]}));

  const v1 = () => {
    const e={};
    if(!sum.trim()) e.sum="Required";
    if(!planned) e.planned="Required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  // Step colours
  const STEP_GRAD  = ["linear-gradient(135deg,#22c55e,#0ea5c8)","linear-gradient(135deg,#0ea5c8,#1d6fa4)"];
  const STEP_ACCENT= ["#22c55e","#0ea5c8"];
  const acc  = STEP_ACCENT[step-1];
  const grad = STEP_GRAD[step-1];

  const handleSubmit = () => {
    if(!modules.length){ setErrors({mods:"Select at least one"}); return; }
    setErrors({});
    onSubmit({
      id:Date.now(), summary:sum, priority, type,
      releasePlanned:planned, releaseActual:"", team, rn:"",
      rnLinks:rnLink?[rnLink]:[], rnLink,
      jiraLinks:[], jiraLink:"",
      goal, approvals, modules, status:"Planning",
      dora:{leadDeveloper:doraLead, application:doraApp, services:doraSvc, handoverDate:doraDate}
    });
  };

  return(
    <div style={{minHeight:"100vh",background:"#050b12",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",fontFamily:"'Inter','DM Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(34,197,94,0.1) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"-15%",right:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(14,165,200,0.1) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",top:"35%",right:"15%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,111,164,0.07) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>

      <div style={{width:"100%",maxWidth:700,position:"relative",zIndex:1}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"2.5rem"}}>
          <LogoMark size={44}/>
          <div>
            <div style={{fontFamily:"'Liberation Serif','Libre Baskerville','Georgia',serif",color:"#fff",fontSize:"1.05rem",fontWeight:800,letterSpacing:"0.04em"}}>DATMAN</div>
            <div style={{color:"rgba(255,255,255,0.35)",fontSize:"0.7rem",letterSpacing:"0.14em",textTransform:"uppercase"}}>Release Management</div>
          </div>
          <button onClick={onCancel} style={{marginLeft:"auto",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",borderRadius:10,padding:"0.45rem 1.1rem",cursor:"pointer",fontSize:"0.8rem",transition:"all 0.15s"}}>← Back</button>
        </div>

        {/* Step indicator */}
        <div style={{display:"flex",alignItems:"center",marginBottom:"2rem"}}>
          {[1,2].map((s,i)=>{
            const done=s<step, active=s===step;
            const sAcc=STEP_ACCENT[s-1], sGrad=STEP_GRAD[s-1];
            return(
              <div key={s} style={{display:"flex",alignItems:"center",flex:i===0?1:"0 0 auto"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.65rem"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:800,fontFamily:"'Liberation Serif','Georgia',serif",background:done||active?sGrad:"rgba(255,255,255,0.05)",color:done||active?"#fff":"rgba(255,255,255,0.25)",border:active?`2px solid ${sAcc}55`:"2px solid transparent",boxShadow:active?`0 0 24px ${sAcc}44`:"none",transition:"all 0.3s"}}>{done?"✓":s}</div>
                  <span style={{fontFamily:"'Liberation Serif','Georgia',serif",fontSize:"0.73rem",fontWeight:700,color:active?sAcc:done?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.2)",letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{["Core Details","Goals & Ownership"][s-1]}</span>
                </div>
                {i===0&&<div style={{flex:1,height:2,margin:"0 1.25rem",borderRadius:99,background:step>1?STEP_GRAD[0]:"rgba(255,255,255,0.06)",transition:"all 0.3s"}}/>}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div style={{background:"linear-gradient(145deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.015) 100%)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:24,padding:"2.25rem",backdropFilter:"blur(12px)",boxShadow:"0 0 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"24px 24px 0 0",background:grad}}/>

          {/* Title — gradient text matching step accent */}
          <div style={{marginBottom:"1.75rem"}}>
            <h1 style={{fontFamily:"'Liberation Serif','Libre Baskerville','Georgia',serif",background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",fontSize:"1.9rem",fontWeight:800,margin:0,lineHeight:1.1}}>
              {step===1?"Core Details":"Goals & Ownership"}
            </h1>
            <p style={{color:"rgba(255,255,255,0.3)",marginTop:"0.4rem",fontSize:"0.82rem"}}>Step {step} of 2</p>
          </div>

          {/* ── STEP 1 ── rendered always, hidden when on step 2 so inputs keep focus */}
          <div style={{display:step===1?"flex":"none",flexDirection:"column",gap:"1.5rem"}}>

            <FField acc={acc} label="Summary *" error={errors.sum}>
              <input
                value={sum}
                onChange={e=>setSum(e.target.value)}
                placeholder="Brief description of this release..."
                style={FORM_INPUT_STYLE}
              />
            </FField>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"}}>
              <FField acc={acc} label="Release Type">
                <select value={type} onChange={e=>setType(e.target.value)} style={FORM_INPUT_STYLE}>
                  {RELEASE_TYPES.map(t=><option key={t} style={{background:"#0d1117"}}>{t}</option>)}
                </select>
              </FField>
              <FField acc={acc} label="Priority">
                <select value={priority} onChange={e=>setPri(e.target.value)} style={FORM_INPUT_STYLE}>
                  {PRIORITIES.map(p=><option key={p} style={{background:"#0d1117"}}>{p}</option>)}
                </select>
              </FField>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"}}>
              <FField acc={acc} label="Planned Release Date *" error={errors.planned}>
                <input type="date" value={planned} onChange={e=>setPlan(e.target.value)} style={{...FORM_INPUT_STYLE,colorScheme:"dark"}}/>
              </FField>
              <FField acc={acc} label="Team *">
                <div style={{display:"flex",gap:"0.6rem"}}>
                  {[["Gateway",B.teal],["App Team","#22c55e"]].map(([t,tc])=>(
                    <button key={t} type="button" onClick={()=>setTeam(t)}
                      style={{flex:1,padding:"0.7rem",borderRadius:12,border:`1.5px solid ${team===t?tc:tc+"22"}`,background:team===t?`${tc}18`:"rgba(255,255,255,0.03)",color:team===t?tc:"rgba(255,255,255,0.3)",fontWeight:800,fontSize:"0.82rem",cursor:"pointer",fontFamily:"'Liberation Serif','Georgia',serif",letterSpacing:"0.04em",transition:"all 0.2s",boxShadow:team===t?`0 0 18px ${tc}33`:"none"}}>
                      {t}
                    </button>
                  ))}
                </div>
              </FField>
            </div>

            <FField acc={acc} label="RN Link (URL)" optional>
              <input
                value={rnLink}
                onChange={e=>setRnLink(e.target.value)}
                placeholder="https://datman.atlassian.net/wiki/..."
                style={FORM_INPUT_STYLE}
              />
            </FField>

            <button onClick={()=>{if(v1())setStep(2);}}
              style={{width:"100%",padding:"0.9rem",borderRadius:14,border:"none",background:grad,color:"#fff",fontFamily:"'Liberation Serif','Georgia',serif",fontSize:"0.9rem",fontWeight:800,cursor:"pointer",letterSpacing:"0.06em",boxShadow:`0 8px 32px ${acc}44`,transition:"all 0.2s"}}>
              CONTINUE →
            </button>
          </div>

          {/* ── STEP 2 ── */}
          <div style={{display:step===2?"flex":"none",flexDirection:"column",gap:"1.5rem"}}>

            <FField acc={acc} label="Goal" optional>
              <textarea
                value={goal}
                onChange={e=>setGoal(e.target.value)}
                rows={3}
                style={{...FORM_INPUT_STYLE,resize:"vertical"}}
                placeholder="What does this release achieve for the business?"
              />
            </FField>

            <FField acc={acc} label="Approvers">
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.55rem"}}>
                {APPROVER_NAMES.map(n=>(
                  <button key={n} type="button" onClick={()=>toggleApp(n)}
                    style={{padding:"0.45rem 1.1rem",borderRadius:99,fontSize:"0.83rem",fontWeight:700,cursor:"pointer",background:approvals[n]?grad:"rgba(255,255,255,0.04)",color:approvals[n]?"#fff":"rgba(255,255,255,0.35)",border:`1.5px solid ${approvals[n]?acc+"66":acc+"22"}`,boxShadow:approvals[n]?`0 4px 16px ${acc}33`:"none",transition:"all 0.2s"}}>
                    {approvals[n]?"✓ ":""}{n}
                  </button>
                ))}
              </div>
            </FField>

            <FField acc={acc} label="Modules *" error={errors.mods}>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.55rem"}}>
                {MODULES.map(m=>{
                  const on=modules.includes(m);
                  const mc=GATEWAY_MODULES.includes(m)?B.teal:"#22c55e";
                  return(
                    <button key={m} type="button" onClick={()=>toggleMod(m)}
                      style={{padding:"0.45rem 1.1rem",borderRadius:99,fontSize:"0.83rem",fontWeight:700,cursor:"pointer",background:on?`${mc}22`:"rgba(255,255,255,0.04)",color:on?mc:"rgba(255,255,255,0.35)",border:`1.5px solid ${on?mc:mc+"22"}`,boxShadow:on?`0 4px 16px ${mc}33`:"none",transition:"all 0.2s"}}>
                      {m}
                    </button>
                  );
                })}
              </div>
            </FField>

            {/* DORA section */}
            <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.65rem",marginBottom:"1.25rem"}}>
                <span style={{background:"linear-gradient(135deg,#0ea5c8,#1d6fa4)",borderRadius:7,padding:"0.2rem 0.55rem",fontSize:"0.68rem",fontWeight:800,color:"#fff",fontFamily:"'Liberation Serif','Georgia',serif",letterSpacing:"0.08em"}}>DORA</span>
                <span style={{color:"rgba(14,165,200,0.75)",fontSize:"0.78rem",fontWeight:600,letterSpacing:"0.04em"}}>DevOps Research & Assessment Matrix</span>
                <span style={{color:"rgba(255,255,255,0.2)",fontSize:"0.66rem"}}>(all optional)</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"}}>
                <FField acc={acc} label="Lead Developer" optional>
                  <input value={doraLead} onChange={e=>setDoraLead(e.target.value)} placeholder="e.g. Pradeep" style={FORM_INPUT_STYLE}/>
                </FField>
                <FField acc={acc} label="Application" optional>
                  <input value={doraApp} onChange={e=>setDoraApp(e.target.value)} placeholder="e.g. risk-engine" style={FORM_INPUT_STYLE}/>
                </FField>
                <FField acc={acc} label="Services" optional>
                  <input value={doraSvc} onChange={e=>setDoraSvc(e.target.value)} placeholder="e.g. RISK SERVICE" style={FORM_INPUT_STYLE}/>
                </FField>
                <FField acc={acc} label="Handover Date" optional>
                  <input type="date" value={doraDate} onChange={e=>setDoraDate(e.target.value)} style={{...FORM_INPUT_STYLE,colorScheme:"dark"}}/>
                </FField>
              </div>
              <div style={{color:"rgba(255,255,255,0.2)",fontSize:"0.69rem",marginTop:"0.6rem"}}>
                💡 Lead time = Actual Release date − Handover date. Set actual date in table after releasing.
              </div>
            </div>

            <div style={{display:"flex",gap:"0.75rem"}}>
              <button onClick={()=>setStep(1)}
                style={{padding:"0.9rem 1.5rem",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.45)",fontFamily:"'Liberation Serif','Georgia',serif",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",letterSpacing:"0.05em"}}>
                ← BACK
              </button>
              <button onClick={handleSubmit}
                style={{flex:1,padding:"0.9rem",borderRadius:14,border:"none",background:grad,color:"#fff",fontFamily:"'Liberation Serif','Georgia',serif",fontSize:"0.9rem",fontWeight:800,cursor:"pointer",letterSpacing:"0.06em",boxShadow:`0 8px 32px ${acc}44`}}>
                ADD RELEASE ✦
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


// ─── CSV IMPORT MODAL ─────────────────────────────────────────────────────────
// Maps YOUR exact spreadsheet column headers → internal fields.
// Column order in the sheet doesn't matter — matched by header name.
//
// "sl no"                  → ignored
// "task"                   → summary (required)
// "goal"                   → goal
// "priority"               → priority  (Hotfix|P1|P2|P3|P4)
// "release date"           → releaseActual (YYYY-MM-DD or DD/MM/YYYY)
// "current status"         → ignored
// "impacted areas"         → ignored
// "rn link"                → rnLink
// "type" / "release type"  → type  (Patch|Bug|New Feature|Improvement|Hotfix)
// "release status"         → status  (Released→Released, Not Released→Planning, Rolledback→Cancelled)
// "modules"                → modules (pipe or comma separated)
// "sandeep's approval"     → approver
// "nitish's approval"      → approver
// "pradeep's approval"     → approver
// "muz's approval"         → approver
// "sundar's approval"      → approver
// "fh/internal comms"      → ignored
// "jira release link"      → ignored
// RN is auto-generated from row number if no dedicated RN column exists

// Normalise a cell value that indicates approval was given.
// STRICT allowlist — only explicit positive signals count.
// Anything else (empty, "pending", "not approved", a number, a date, "NA", etc.) = NOT approved.
// isApproved: any non-empty cell that isn't an explicit negative = approved.
// Real spreadsheets use dates, names, "Approved", tick marks, etc. to signal approval.
// All known approvers across Gateway + App teams
// New names are auto-detected from CSV headers too (see matchApproverHeader)
const APPROVER_NAMES=["Sandeep","Nitish","Pradeep","Muz","Sundar","Ruhan","Anand"];

// ─── Approver helpers ────────────────────────────────────────────────────────
// isApproved: ONLY "Approved" (case-insensitive) counts — "Yet to Review", "N/A", anything else = not approved
function isApproved(val){
  if(val===null||val===undefined) return false;
  return String(val).trim().toLowerCase()==="approved";
}

// getApprovedNames: returns all approver names (known + dynamic) who approved
function getApprovedNames(r){
  if(!r||!r.approvals||typeof r.approvals!=="object"||Array.isArray(r.approvals)) return [];
  // Merge known names + any dynamic names present in this record
  const allNames=[...new Set([...APPROVER_NAMES,...Object.keys(r.approvals)])];
  return allNames.filter(n=>r.approvals[n]===true);
}

// matchApproverHeader: matches known approver names AND auto-detects unknown ones.
// Returns index into APPROVER_NAMES for known names, or a synthetic entry for new ones.
// For unknown "Firstname's Approval" headers, returns the first name capitalised.
function matchApproverHeader(h){
  const norm=h.toLowerCase().replace(/[^a-z]/g,"");
  const idx=APPROVER_NAMES.findIndex(name=>{
    const n=name.toLowerCase();
    return norm===n
      || norm.startsWith(n)&&norm.includes("approv")
      || norm.includes(n)&&norm.includes("approv");
  });
  return idx;
}
// Extract the approver first-name from any "*'s Approval" header
function extractApproverName(h){
  const m=h.match(/^([A-Za-z]+)['’\s]?s?\s+approval/i);
  return m?m[1]:null;
}
// Given a CSV headers array, return a map of colIndex → approverName (handles unknown names)
function buildApproverColMap(headers){
  const map={};
  headers.forEach((h,i)=>{
    const knownIdx=matchApproverHeader(h);
    if(knownIdx>=0){map[i]=APPROVER_NAMES[knownIdx];return;}
    // Auto-detect unknown approver columns e.g. "Ruhan's Approval"
    const name=extractApproverName(h);
    if(name) map[i]=name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
  });
  return map;
}
function mapReleaseStatus(val){
  const v=(val||"").toLowerCase().trim();
  if(!v) return "Planning";
  // Released variants
  if(v==="released"||v==="done"||v==="complete"||v==="completed"||v==="live"||v==="deployed"||v==="shipped") return "Released";
  // Rolledback/Cancelled — "Rolledback" is an exact value from the template
  if(v==="rolledback"||v==="rolled back"||v.includes("roll")||v.includes("revert")||v.includes("rollback")) return "Cancelled";
  // Pending → Planning (explicit value from template)
  if(v==="pending"||v==="planned"||v==="not released"||v==="upcoming"||v==="todo"||v==="to do") return "Planning";
  // Delayed
  if(v.includes("delay")||v.includes("postpone")||v==="deferred") return "Delayed";
  // In Progress
  if(v.includes("progress")||v.includes("ongoing")||v.includes("wip")||v==="active"||v==="in-progress") return "In Progress";
  // Direct match against internal STATUSES list
  const direct=STATUSES.find(s=>s.toLowerCase()===v);
  return direct||"Planning";
}
// Map release type from explicit cell value, RN link URL text, priority, or summary keywords.
// Priority order: explicit typeCell > rnLink URL keywords > priority > summary > default
function mapReleaseType(priority, summary, typeCell, rnLink){
  // 1. Explicit type column in CSV
  const tc=(typeCell||"").toLowerCase().trim();
  if(tc){
    if(tc.includes("bug")) return "Bug";
    if(tc.includes("hotfix")||tc==="hotfix") return "Patch";
    if(tc.includes("patch")) return "Patch";
    if(tc.includes("improvement")||tc.includes("enhance")) return "Improvement";
    if(tc.includes("new feature")||tc.includes("feature")) return "New Feature";
    // direct match against RELEASE_TYPES
    const direct=["New Feature","Improvement","Patch","Bug"].find(t=>t.toLowerCase()===tc);
    if(direct) return direct;
  }
  // 2. RN link URL — e.g. ".../patch/...", ".../bug-fix/...", "/hotfix/"
  const url=(rnLink||"").toLowerCase();
  if(url.includes("/patch")||url.includes("patch-")) return "Patch";
  if(url.includes("/hotfix")||url.includes("hotfix")) return "Patch";
  if(url.includes("/bug")||url.includes("bugfix")||url.includes("bug-fix")) return "Bug";
  if(url.includes("/improvement")||url.includes("/enhance")) return "Improvement";
  if(url.includes("/feature")||url.includes("/new-feature")) return "New Feature";
  // 3. Priority field
  const p=(priority||"").trim();
  if(p==="Hotfix") return "Patch";
  // 4. Summary keywords
  const s=(summary||"").toLowerCase();
  if(s.includes("hotfix")||s.includes("hot fix")) return "Patch";
  if(s.includes(" bug ")||s.startsWith("bug ")||s.includes("bug fix")||s.includes("bugfix")) return "Bug";
  if(s.includes("patch")) return "Patch";
  if(s.includes("improvement")||s.includes("enhance")||s.includes("optimis")||s.includes("optimiz")||s.includes("refactor")) return "Improvement";
  if(s.includes("new feature")||s.includes("feature")) return "New Feature";
  return "New Feature"; // safe default
}

// Parse a date that could be YYYY-MM-DD or DD/MM/YYYY
function normaliseDate(val){
  if(!val) return "";
  val=val.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(val)) return val; // already YYYY-MM-DD
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)){
    const [d,m,y]=val.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return val; // return as-is; let the app handle it
}

// Legacy cols for display
const APPROVER_COLS=["sandeep's approval","nitish's approval","pradeep's approval","muz's approval","sundar's approval"];

// Columns that are explicitly ignored
const IGNORED_COLS=new Set([
  "sl no","sl. no","sl no.","current status","impacted areas",
  "fh/internal comms","fh / internal comms"
]);

function parseCSVLine(line){
  const cells=[]; let cur="", inQ=false;
  for(const ch of line){
    if(ch==='"'){inQ=!inQ;}
    else if(ch===","&&!inQ){cells.push(cur.trim().replace(/^"|"$/g,""));cur="";}
    else cur+=ch;
  }
  cells.push(cur.trim().replace(/^"|"$/g,""));
  return cells;
}

function parseCSVData(text, existingKeys){
  const existing=existingKeys||new Set();
  const allLines=text.trim().split(/\r?\n/).filter(l=>l.trim());
  if(allLines.length<2) return {rows:[],errors:["Need a header row and at least one data row"],dupes:[],mappedCols:[]};

  const rawHeaders=parseCSVLine(allLines[0]);
  const headers=rawHeaders.map(h=>h.toLowerCase().trim());

  // Tell the UI which columns were detected
  const mappedCols=headers.map((h,i)=>{
    if(h==="task") return {raw:rawHeaders[i],mapped:"summary",use:true};
    if(h==="goal") return {raw:rawHeaders[i],mapped:"goal",use:true};
    if(h==="priority") return {raw:rawHeaders[i],mapped:"priority",use:true};
    if(h==="release date") return {raw:rawHeaders[i],mapped:"releaseActual",use:true};
    if(h==="rn link"||h.match(/rn link \d+/)) return {raw:rawHeaders[i],mapped:"rnLink",use:true};
    if(h==="type"||h==="release type"||h==="patch type"||h==="rn type") return {raw:rawHeaders[i],mapped:"type",use:true};
    if(h==="release status"||h==="status"||h==="release status "||h.includes("release status")||h==="current release status") return {raw:rawHeaders[i],mapped:"status",use:true};
    if(h==="modules") return {raw:rawHeaders[i],mapped:"modules",use:true};
    if(h==="jira release link"||h.match(/jira.*link.*\d*/)) return {raw:rawHeaders[i],mapped:"jiraLink",use:true};
    const aIdx=matchApproverHeader(h);
    if(aIdx>=0) return {raw:rawHeaders[i],mapped:"approver ("+APPROVER_NAMES[aIdx]+")",use:true};
    const dynName=extractApproverName(h);
    if(dynName) return {raw:rawHeaders[i],mapped:"approver ("+dynName+")",use:true};
    return {raw:rawHeaders[i],mapped:"ignored",use:false};
  });

  const getByIndex=(cells,idx)=>idx>=0?(cells[idx]||"").trim():"";
  const getByHeader=(cells,headerLower)=>{
    const idx=headers.indexOf(headerLower);
    return getByIndex(cells,idx);
  };
  // Build approver column map: colIndex → approverName (handles unknown names too)
  const approverColMap=buildApproverColMap(headers);

  const errors=[], rows=[], dupes=[];
  for(let i=1;i<allLines.length;i++){
    if(!allLines[i].trim()) continue;
    const cells=parseCSVLine(allLines[i]);

    const summary=getByHeader(cells,"task");
    if(!summary){errors.push("Row "+(i+1)+": no Task/summary — skipped");continue;}

    const releaseActual=normaliseDate(getByHeader(cells,"release date"));

    // Deduplicate by Task + Release Date
    const dedupeKey=(summary+"|"+releaseActual).toLowerCase();
    if(existing.has(dedupeKey)){dupes.push({rn:summary.slice(0,30),row:i+1});continue;}

    // Collect ALL rn link columns (rn link, rn link 2, rn link 3 …) as array
    const rnLinksArr=headers
      .map((h,i)=>(h==="rn link"||/rn link ?\d+/.test(h))?(cells[i]||"").trim():null)
      .filter(Boolean);
    const rnLinkRaw=rnLinksArr[0]||"";

    // Approvals: build object {Sandeep:bool, ...} — only true if cell has non-negative non-empty value
    const approvalsObj={};
    const approvalRaw={};
    // Init known approvers
    APPROVER_NAMES.forEach(name=>{ approvalsObj[name]=false; approvalRaw[name]=""; });
    // Process all detected approver columns (known + auto-detected)
    Object.entries(approverColMap).forEach(([colIdx,name])=>{
      const cellVal=(cells[colIdx]||"").trim();
      approvalRaw[name]=cellVal;
      if(!approvalsObj.hasOwnProperty(name)) approvalsObj[name]=false; // add new name dynamically
      if(isApproved(cellVal)) approvalsObj[name]=true;
    });

    const modulesRaw=getByHeader(cells,"modules");
    const modules=modulesRaw?modulesRaw.split(/[|;,]/).map(m=>m.trim()).filter(Boolean):[];

    const rawPriority=getByHeader(cells,"priority");
    const priority=PRIORITIES.includes(rawPriority)?rawPriority:"P2";
    // Try multiple possible status column names
    const statusRaw=
      getByHeader(cells,"release status")||
      getByHeader(cells,"status")||
      getByHeader(cells,"current release status")||
      // also scan any header containing "release status"
      (()=>{const idx=headers.findIndex(h=>h.includes("release status")||h==="status");return idx>=0?(cells[idx]||"").trim():"";})();
    const status=mapReleaseStatus(statusRaw);

    rows.push({
      id:Date.now()+i*17,
      _statusRaw:statusRaw, // debug: raw cell value before mapping
      rn:"RN-IMP-"+String(i).padStart(3,"0"),
      rnLink:rnLinkRaw,
      rnLinks: rnLinksArr.length?rnLinksArr:[rnLinkRaw].filter(Boolean),
      jiraLinks: headers
        .map((h,i)=>/jira.*link/.test(h)?(cells[i]||"").trim():null)
        .filter(Boolean),
      jiraLink:getByHeader(cells,"jira release link")||"",
      summary,
      type:mapReleaseType(priority, summary, getByHeader(cells,"type")||getByHeader(cells,"release type")||getByHeader(cells,"patch type")||getByHeader(cells,"rn type"), rnLinkRaw),
      priority,
      status,
      releasePlanned:"",
      releaseActual,
      approvals:approvalsObj,
      approvalRaw,
      goal:getByHeader(cells,"goal"),
      modules,
      dora:{leadDeveloper:"",application:"",services:"",qa:"NA",originalRNLink:"NA",handoverDate:""}
    });
  }
  return {rows,errors,dupes,mappedCols};
}

const CSV_COL_DOCS=[
  ["Task",                "Required",            "→ Summary"],
  ["Goal",                "Optional",            "→ Goal"],
  ["Priority",            "Hotfix|P1..P4",       "→ Priority (defaults P2)"],
  ["Release Date",        "DD/MM/YYYY or YYYY-MM-DD", "→ Actual Release Date"],
  ["RN Link",             "https://…",           "→ RN Link (DORA auto-fetched)"],
  ["Jira Release Link",   "https://jira.…",      "→ Jira Link (shown in hover card)"],
  ["Release Status",      "Released / Not Released / Rolledback", "→ Status"],
  ["Modules",             "Payments, General…",  "→ Modules"],
  ["Sandeep's Approval",  "Any value = approved","→ Approver (name used if non-empty)"],
  ["Nitish's Approval",   "Any value = approved","→ Approver"],
  ["Pradeep's Approval",  "Any value = approved","→ Approver"],
  ["Muz's Approval",      "Any value = approved","→ Approver"],
  ["Sundar's Approval",   "Any value = approved","→ Approver"],
  ["Sl No / Current Status / Impacted Areas / FH/Internal Comms", "—", "Ignored"],
];

function CSVImportModal({onImport, onClose, existingReleases}){
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState(null);
  const [dupes,   setDupes]   = useState([]);
  const [errors,  setErrors]  = useState([]);
  const [mappedCols, setMappedCols] = useState([]);
  const [step,    setStep]    = useState("input");
  const [confirmImport, setConfirmImport] = useState(false);
  const fileRef = useRef(null);

  // Deduplicate by "Task + Release Date" combo since there's no RN column in the source sheet
  const existingKeys = useMemo(
    ()=>new Set((existingReleases||[]).map(r=>(r.summary+"|"+r.releaseActual).toLowerCase())),
    [existingReleases]
  );

  const handleParse = () => {
    if(!csvText.trim()){setErrors(["Paste CSV content or upload a file first"]);return;}
    const {rows,errors:errs,dupes:dps,mappedCols:mc} = parseCSVData(csvText, existingKeys);
    setErrors(errs); setDupes(dps); setMappedCols(mc||[]);
    if(rows.length>0){setPreview(rows);setStep("preview");}
    else setErrors(e=>[...e, dps.length>0?"All rows are duplicates — nothing new to import.":"No valid rows found."]);
  };

  const handleFile = e => {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers=["Sl No","Task","Goal","Priority","Release Date","Current Status","Impacted Areas","RN Link","Release Status","Modules","Sandeep's Approval","Nitish's Approval","Pradeep's Approval","Muz's Approval","Sundar's Approval","FH/Internal Comms","Jira Release Link"];
    const sample1=["1","Risk Rule Engine v3","Reduce fraud by 30%","P1","03/04/2026","In Progress","Payments","https://docs.example.com/rn/100","Released","Payments|General","Approved","Approved","","","Approved","Sent","https://jira.example.com/RN-100"];
    const sample2=["2","Checkout SDK Hotfix","Fix iOS SDK crash","Hotfix","05/04/2026","Done","App","https://docs.example.com/rn/101","Released","Payments|App","Approved","","Approved","Approved","","",""];
    const content=[headers.join(","),sample1.join(","),sample2.join(",")].join("\n");
    const blob=new Blob([content],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="release_import_template.csv";a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:B.bgCard,border:`1px solid ${B.border2}`,borderRadius:20,width:"min(900px,96vw)",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.65)"}}>

        {/* ── Header ── */}
        <div style={{position:"relative",padding:"1.2rem 1.6rem",borderBottom:`1px solid ${B.border}`,flexShrink:0}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"20px 20px 0 0",background:B.grad1}}/>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginTop:"0.15rem"}}>
            <div style={{background:B.blue,borderRadius:8,padding:"0.28rem 0.65rem",fontSize:"0.7rem",fontWeight:800,color:"#fff",letterSpacing:"0.06em"}}>CSV</div>
            <div>
              <div style={{color:B.textPrimary,fontWeight:800,fontSize:"1.05rem"}}>Import Historical Releases</div>
              <div style={{color:B.textMuted,fontSize:"0.72rem",marginTop:"0.1rem"}}>
                Paste or upload your existing spreadsheet export. Column order does not matter — matched by header name.
              </div>
            </div>
            <button onClick={onClose} style={{marginLeft:"auto",background:"transparent",border:`1px solid ${B.border2}`,color:B.textMuted,borderRadius:10,padding:"0.32rem 0.7rem",cursor:"pointer",fontSize:"0.8rem",fontFamily:FONT}}>
              x Close
            </button>
          </div>
        </div>

        <div style={{overflowY:"auto",padding:"1.3rem 1.6rem",flex:1}}>

          {/* ══ INPUT STEP ══ */}
          {step==="input"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"1.1rem"}}>

              {/* Info banner */}
              <div style={{background:"#0d2a1a",border:"1px solid #22c55e44",borderRadius:12,padding:"0.8rem 1rem",display:"flex",gap:"0.6rem",alignItems:"flex-start"}}>
                <span style={{color:"#4ade80",fontWeight:700,fontSize:"0.8rem",flexShrink:0,marginTop:"0.05rem"}}>Note</span>
                <div style={{color:"#86efac",fontSize:"0.76rem",lineHeight:1.7}}>
                  Columns are matched <strong>by name</strong>, not position — export your sheet in any column order.
                  Approval columns: any non-empty value = that person approved; blank = not yet approved.
                  Duplicate check: rows where Task + Release Date already exist are skipped.
                  Type and Planned Date will be blank — set them in the table after import.
                  DORA fields auto-populate from the RN link.
                </div>
              </div>

              {/* Column mapping reference + template side-by-side */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 190px",gap:"0.9rem",alignItems:"start"}}>
                {/* Column reference */}
                <div style={{background:"#0d0d0d",border:`1px solid ${B.border}`,borderRadius:12,padding:"0.85rem 1rem"}}>
                  <div style={{color:B.textMuted,fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:"0.55rem"}}>
                    Column Mapping — Your sheet headers
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.2rem"}}>
                    {CSV_COL_DOCS.map(([col,ex,desc])=>(
                      <div key={col} style={{display:"grid",gridTemplateColumns:"180px 160px 1fr",gap:"0.5rem",alignItems:"baseline",padding:"0.15rem 0"}}>
                        <span style={{color:B.teal,fontSize:"0.69rem",fontWeight:700}}>{col}</span>
                        <span style={{color:B.textSecondary,fontSize:"0.67rem",fontStyle:"italic"}}>{ex}</span>
                        <span style={{color:B.textMuted,fontSize:"0.66rem"}}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Template card */}
                <div style={{background:"#0d0d0d",border:`1px solid ${B.border2}`,borderRadius:12,padding:"1rem",display:"flex",flexDirection:"column",gap:"0.7rem"}}>
                  <div style={{color:B.textPrimary,fontWeight:700,fontSize:"0.86rem"}}>Template</div>
                  <div style={{color:B.textMuted,fontSize:"0.71rem",lineHeight:1.5,flex:1}}>
                    Download a ready-made CSV with all 17 columns and 2 sample rows matching your exact sheet layout.
                  </div>
                  <button onClick={downloadTemplate} style={{background:B.grad1,border:"none",color:"#fff",borderRadius:10,padding:"0.55rem",cursor:"pointer",fontSize:"0.79rem",fontWeight:700,fontFamily:FONT}}>
                    Download Template
                  </button>
                </div>
              </div>

              {/* File upload */}
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}}/>
              <button onClick={()=>fileRef.current.click()}
                style={{background:"#0d0d0d",border:`2px dashed ${B.border2}`,color:B.textSecondary,borderRadius:12,padding:"0.65rem",cursor:"pointer",fontSize:"0.82rem",fontWeight:600,fontFamily:FONT,width:"100%"}}>
                Upload CSV / TSV File {csvText?"  (loaded)":""}
              </button>

              {/* Paste area */}
              <div>
                <div style={{color:B.textSecondary,fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.4rem"}}>Or Paste CSV Content</div>
                <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={7}
                  placeholder={"Sl No,Task,Goal,Priority,Release Date,Current Status,Impacted Areas,RN Link,Release Status,Modules,Sandeep's Approval,Nitish's Approval,Pradeep's Approval,Muz's Approval,Sundar's Approval,FH/Internal Comms,Jira Release Link\n1,Risk Rule Engine v3,Reduce fraud,P1,03/04/2026,,Payments,https://...,Released,Payments|General,Approved,Approved,,,Approved,,"}
                  style={{...inputStyle,resize:"vertical",fontFamily:"monospace",fontSize:"0.74rem",lineHeight:1.55}}/>
              </div>

              {errors.length>0&&(
                <div style={{background:"#2d0a0a",border:"1px solid #ef444455",borderRadius:10,padding:"0.65rem 0.9rem"}}>
                  {errors.map((e,i)=>(
                    <div key={i} style={{color:"#fca5a5",fontSize:"0.76rem",marginBottom:"0.12rem"}}>{e}</div>
                  ))}
                </div>
              )}

              <button onClick={handleParse} style={primaryBtn}>Preview Import</button>
            </div>
          )}

          {/* ══ PREVIEW STEP ══ */}
          {step==="preview"&&preview&&(
            <div style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>

              {/* Summary row */}
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                <span style={{background:B.lime+"22",color:B.lime,border:`1px solid ${B.lime}44`,padding:"0.22rem 0.65rem",borderRadius:99,fontSize:"0.78rem",fontWeight:700}}>
                  {preview.length} new release{preview.length!==1?"s":""}
                </span>
                {dupes.length>0&&(
                  <span style={{background:"#f9731622",color:"#f97316",border:"1px solid #f9731644",padding:"0.22rem 0.65rem",borderRadius:99,fontSize:"0.76rem",fontWeight:700}}>
                    {dupes.length} duplicate{dupes.length!==1?"s":""} skipped: {dupes.map(d=>d.rn).join(", ")}
                  </span>
                )}
                {errors.length>0&&(
                  <span style={{color:"#ef4444",fontSize:"0.74rem"}}>{errors.length} row error{errors.length!==1?"s":""}</span>
                )}
                <button onClick={()=>{setStep("input");setPreview(null);setDupes([]);setErrors([]);}}
                  style={{marginLeft:"auto",background:"transparent",border:`1px solid ${B.border2}`,color:B.textSecondary,borderRadius:8,padding:"0.26rem 0.65rem",cursor:"pointer",fontSize:"0.75rem",fontFamily:FONT}}>
                  Edit
                </button>
              </div>

              {/* Column detection summary */}
              {mappedCols.length>0&&(
                <div style={{background:"#0d0d0d",border:`1px solid ${B.border}`,borderRadius:10,padding:"0.7rem 0.9rem"}}>
                  <div style={{color:B.textMuted,fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:"0.5rem"}}>Columns Detected</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem"}}>
                    {mappedCols.map((c,i)=>(
                      <span key={i} style={{
                        background:c.use?B.teal+"18":"#000000",
                        color:c.use?B.teal:B.textMuted,
                        border:`1px solid ${c.use?B.teal+"44":B.border}`,
                        borderRadius:6,padding:"0.18rem 0.55rem",fontSize:"0.66rem",fontWeight:600,
                        display:"flex",alignItems:"center",gap:"0.3rem"
                      }}>
                        <span>{c.raw}</span>
                        <span style={{opacity:0.6}}>→</span>
                        <span style={{fontStyle:"italic",opacity:0.85}}>{c.mapped}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Notice */}
              <div style={{background:"#0d1e2f",border:`1px solid ${B.border2}`,borderRadius:10,padding:"0.55rem 0.9rem",color:B.textMuted,fontSize:"0.72rem"}}>
                <strong style={{color:B.textSecondary}}>After import:</strong> Type and Planned Date will be blank — set them in the table. DORA fields populate from RN link.
              </div>
              {/* Approver detection debug panel */}
              <div style={{background:"#0a0a0a",border:`1px solid ${B.teal}33`,borderRadius:10,padding:"0.7rem 1rem"}}>
                <div style={{color:B.teal,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.5rem"}}>
                  Approver columns detected
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"0.5rem"}}>
                  {APPROVER_NAMES.map(name=>{
                    const detected=preview.length>0&&preview[0].approvalRaw&&preview[0].approvalRaw[name]!==undefined;
                    const sampleVal=detected?preview[0].approvalRaw[name]:"";
                    return(
                      <div key={name} style={{background:detected?"#0d3320":"#0d0d0d",border:`1px solid ${detected?B.lime+"44":B.border}`,borderRadius:8,padding:"0.25rem 0.6rem",fontSize:"0.65rem"}}>
                        <span style={{color:detected?B.lime:B.textMuted,fontWeight:700}}>{name}</span>
                        {detected&&<span style={{color:B.textMuted,marginLeft:"0.3rem"}}>· "{sampleVal||"(empty)"}"</span>}
                        {!detected&&<span style={{color:"#ef444466",marginLeft:"0.3rem"}}>· not found in CSV</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{color:B.textMuted,fontSize:"0.62rem"}}>
                  Any non-empty cell = approved. Empty cell = not approved.
                  {!APPROVER_NAMES.some(n=>preview[0]?.approvalRaw?.[n]!==undefined)&&
                    <span style={{color:"#f97316",marginLeft:"0.4rem"}}>⚠ No approver columns matched — check header names match "Name's Approval"</span>}
                </div>
              </div>

              {/* Status detection debug */}
              {(()=>{
                const statusCol=mappedCols.find(mc=>mc.mapped==="status");
                const counts=preview.reduce((acc,r)=>{acc[r.status]=(acc[r.status]||0)+1;return acc;},{});
                return(
                  <div style={{background:"#0a0a0a",border:`1px solid ${B.border2}`,borderRadius:10,padding:"0.6rem 1rem",display:"flex",flexWrap:"wrap",alignItems:"center",gap:"0.75rem"}}>
                    <div style={{color:statusCol?B.lime:"#f97316",fontSize:"0.66rem",fontWeight:700}}>
                      {statusCol?`✓ Status column: "${statusCol.raw}"`:"⚠ No status column detected — all set to Planning"}
                    </div>
                    {Object.entries(counts).map(([s,n])=>(
                      <div key={s} style={{background:s==="Released"?B.lime+"18":B.border,border:`1px solid ${s==="Released"?B.lime+"44":B.border2}`,borderRadius:6,padding:"0.1rem 0.55rem",fontSize:"0.65rem",fontWeight:700,color:s==="Released"?B.lime:B.textMuted}}>
                        {s}: {n}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Preview table */}
              <div style={{overflowX:"auto",borderRadius:12,border:`1px solid ${B.border}`}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.76rem",fontFamily:FONT}}>
                  <thead>
                    <tr>
                      {["RN","Summary","Priority","Status","Release Date","Approvers","Modules","Goal"].map(h=>(
                        <th key={h} style={{padding:"0.55rem 0.75rem",color:B.textMuted,fontSize:"0.62rem",letterSpacing:"0.08em",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${B.border2}`,background:"#0d0d0d",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r,i)=>(
                      <tr key={i} style={{background:i%2===0?B.bgDark:B.bgCard}}>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`}}>
                          {r.rnLink
                            ? <a href={r.rnLink} target="_blank" rel="noreferrer" style={{color:B.teal,fontWeight:700,textDecoration:"none"}}>{r.rn} ↗</a>
                            : <span style={{color:B.teal,fontWeight:700}}>{r.rn}</span>}
                        </td>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`,color:B.textPrimary,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.summary}</td>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`}}><Chip label={r.priority} color={PRIORITY_COLORS[r.priority]||B.textMuted} small/></td>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`}}>
                          <StatusBadge s={r.status}/>
                          {r._statusRaw&&(
                            <div style={{color:B.textMuted,fontSize:"0.58rem",marginTop:"0.15rem"}}>
                              raw: "{r._statusRaw}"
                            </div>
                          )}
                        </td>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`,color:r.releaseActual?B.lime:B.textMuted,whiteSpace:"nowrap"}}>{r.releaseActual||"—"}</td>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`,maxWidth:130}}>
                          {(()=>{const names=getApprovedNames(r);return names.length
                            ?<span style={{color:B.lime,fontWeight:700,fontSize:"0.72rem"}}>{names.join(", ")}</span>
                            :<span style={{color:B.textMuted,fontSize:"0.69rem"}}>—</span>;})()
                          }
                        </td>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`,color:B.cyan,whiteSpace:"nowrap"}}>{r.modules.join(", ")||"—"}</td>
                        <td style={{padding:"0.48rem 0.75rem",borderBottom:`1px solid ${B.border}`,color:B.textMuted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.goal||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!confirmImport ? (
                <button onClick={()=>setConfirmImport(true)} style={{...primaryBtn,background:B.grad1}}>
                  ↑ Replace & Import {preview.length} Release{preview.length!==1?"s":""}
                </button>
              ) : (
                <div style={{background:"#120808",border:"1px solid #f9731655",borderRadius:12,padding:"1rem"}}>
                  <div style={{color:"#f97316",fontWeight:700,fontSize:"0.82rem",marginBottom:"0.4rem"}}>⚠ This will replace ALL existing release data</div>
                  <div style={{color:B.textMuted,fontSize:"0.75rem",marginBottom:"0.9rem"}}>
                    {preview.length} releases from the CSV will replace everything currently saved. This cannot be undone.
                  </div>
                  <div style={{display:"flex",gap:"0.6rem"}}>
                    <button onClick={()=>setConfirmImport(false)} style={{...primaryBtn,background:"transparent",border:`1px solid ${B.border2}`,color:B.textMuted,flex:"0 0 auto",padding:"0.65rem 1.2rem",fontSize:"0.82rem"}}>
                      Cancel
                    </button>
                    <button onClick={()=>{onImport(preview);onClose();}} style={{...primaryBtn,background:"linear-gradient(135deg,#f97316,#dc2626)",flex:1,fontSize:"0.85rem"}}>
                      ✓ Yes, replace & import {preview.length} releases
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({release, onSave, onClose}){
  const [form, setForm] = useState({
    ...release,
    modules: release.modules||[],
    dora: {...(release.dora||{leadDeveloper:"",application:"",services:"",qa:"Done",originalRNLink:"NA",handoverDate:""})},
    approvals: {...(release.approvals||{Sandeep:false,Nitish:false,Pradeep:false,Muz:false,Sundar:false})},
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setDora=(k,v)=>setForm(f=>({...f,dora:{...f.dora,[k]:v}}));
  const toggle=m=>set("modules",form.modules.includes(m)?form.modules.filter(x=>x!==m):[...form.modules,m]);
  const empty=v=>!v||v===""||v==="NA"||(Array.isArray(v)&&!v.length);

  // Track which key fields are filled vs missing
  const checks = {
    "Summary":        !empty(form.summary),
    "Release Type":   !empty(form.type),
    "Planned Date":   !empty(form.releasePlanned),
    "Goal":           !empty(form.goal),
    "Modules":        !empty(form.modules),
    "Lead Developer": !empty(form.dora?.leadDeveloper),
    "Handover Date":  !empty(form.dora?.handoverDate),
  };
  const total = Object.keys(checks).length;
  const filled = Object.values(checks).filter(Boolean).length;
  const pct = Math.round((filled/total)*100);
  const allGood = filled===total;

  const SectionHead = ({label,sub})=>(
    <div style={{display:"flex",alignItems:"baseline",gap:"0.5rem",margin:"1.25rem 0 0.75rem"}}>
      <div style={{color:B.textSecondary,fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase"}}>{label}</div>
      {sub&&<div style={{color:B.textMuted,fontSize:"0.65rem"}}>{sub}</div>}
      <div style={{flex:1,height:1,background:B.border,marginLeft:"0.5rem"}}/>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(5,14,22,0.9)",backdropFilter:"blur(10px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",fontFamily:FONT}} onClick={onClose}>
      <div style={{background:B.bgCard,border:`1px solid ${B.border2}`,borderRadius:20,width:"100%",maxWidth:740,maxHeight:"92vh",overflowY:"auto",padding:"2rem",position:"relative"}} onClick={e=>e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{display:"flex",alignItems:"flex-start",gap:"1rem",marginBottom:"1.25rem"}}>
          <div style={{flex:1}}>
            <div style={{color:B.teal,fontSize:"0.65rem",letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700,marginBottom:"0.2rem"}}>Edit Release</div>
            <div style={{color:B.textPrimary,fontWeight:800,fontSize:"1.3rem",letterSpacing:"-0.02em"}}>{form.rn||"—"} <span style={{color:B.textMuted,fontWeight:400,fontSize:"0.9rem"}}>{form.summary?.slice(0,40)}</span></div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${B.border2}`,color:B.textMuted,borderRadius:8,padding:"0.4rem 0.9rem",cursor:"pointer",fontSize:"0.8rem",fontFamily:FONT,flexShrink:0}}>✕</button>
        </div>

        {/* ── Completion bar ── */}
        <div style={{background:"#0a0a0a",border:`1px solid ${allGood?B.lime+"44":B.teal+"44"}`,borderRadius:12,padding:"0.75rem 1rem",marginBottom:"1.25rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.45rem"}}>
            <span style={{color:allGood?B.lime:B.teal,fontSize:"0.72rem",fontWeight:700}}>
              {allGood?"✓ All key fields complete":`${filled} / ${total} key fields filled`}
            </span>
            <span style={{color:B.textMuted,fontSize:"0.68rem"}}>{pct}%</span>
          </div>
          <div style={{height:5,borderRadius:99,background:B.border,overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",borderRadius:99,background:allGood?B.lime:B.grad1,transition:"width 0.3s"}}/>
          </div>
          {!allGood&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.3rem",marginTop:"0.6rem"}}>
              {Object.entries(checks).filter(([,v])=>!v).map(([k])=>(
                <span key={k} style={{background:"#111111",border:`1px solid ${B.teal}44`,borderRadius:6,padding:"0.1rem 0.45rem",fontSize:"0.63rem",color:B.teal,fontWeight:600}}>● {k}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Core Details ── */}
        <SectionHead label="Core Details"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <Field label="Summary" highlight={empty(form.summary)}>
            <input value={form.summary||""} onChange={e=>set("summary",e.target.value)} style={{...inputStyle,borderColor:empty(form.summary)?B.teal+"88":B.border2}} placeholder="Brief description..."/>
          </Field>
          <Field label="RN">
            <input value={form.rn||""} onChange={e=>set("rn",e.target.value)} style={inputStyle}/>
          </Field>
          <Field label="Release Type" highlight={empty(form.type)}>
            <select value={form.type||""} onChange={e=>set("type",e.target.value)} style={{...inputStyle,borderColor:empty(form.type)?B.teal+"88":B.border2}}>
              <option value="">— select —</option>
              {RELEASE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={form.priority||"P2"} onChange={e=>set("priority",e.target.value)} style={inputStyle}>
              {PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status||"Planning"} onChange={e=>set("status",e.target.value)} style={inputStyle}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="RN Links (up to 5)">
            <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
              {Array.from({length:5}).map((_,li)=>{
                const links=form.rnLinks&&form.rnLinks.length?form.rnLinks:[form.rnLink||"","","","",""];
                const val=links[li]||"";
                const setLink=v=>{const arr=[...links];arr[li]=v;while(arr.length<5)arr.push("");set("rnLinks",arr.filter((_,idx)=>idx<5));if(li===0)set("rnLink",v);};
                return val||li===0?(
                  <div key={li} style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                    <span style={{color:B.textMuted,fontSize:"0.65rem",fontWeight:700,flexShrink:0,width:14}}>{li+1}</span>
                    <input value={val} onChange={e=>setLink(e.target.value)} placeholder={li===0?"Primary RN link...":"Additional RN link..."} style={{...inputStyle,flex:1}}/>
                  </div>
                ):null;
              })}
              <button type="button" onClick={()=>{
                const links=(form.rnLinks&&form.rnLinks.length)?[...form.rnLinks]:([form.rnLink||""]);
                if(links.filter(Boolean).length<5) set("rnLinks",[...links,""]);
              }} style={{alignSelf:"flex-start",background:"transparent",border:`1px dashed ${B.border2}`,color:B.textMuted,borderRadius:7,padding:"0.18rem 0.7rem",cursor:"pointer",fontSize:"0.68rem",fontFamily:FONT}}>+ Add link</button>
            </div>
          </Field>
          <Field label="Planned Release" highlight={empty(form.releasePlanned)}>
            <input type="date" value={form.releasePlanned||""} onChange={e=>set("releasePlanned",e.target.value)} style={{...inputStyle,borderColor:empty(form.releasePlanned)?B.teal+"88":B.border2}}/>
          </Field>
          <Field label="Actual Release">
            <input type="date" value={form.releaseActual||""} onChange={e=>set("releaseActual",e.target.value)} style={inputStyle}/>
          </Field>
        </div>

        <SectionHead label="Details"/>
        <Field label="Goal" highlight={empty(form.goal)}>
          <textarea value={form.goal||""} onChange={e=>set("goal",e.target.value)} rows={2} style={{...inputStyle,resize:"vertical",borderColor:empty(form.goal)?B.teal+"88":B.border2}} placeholder="What does this release achieve?"/>
        </Field>
        <div style={{marginTop:"1rem"}}>
          <Field label="Jira Links (up to 5)">
            <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
              {Array.from({length:5}).map((_,li)=>{
                const links=form.jiraLinks&&form.jiraLinks.length?form.jiraLinks:[form.jiraLink||"","","","",""];
                const val=links[li]||"";
                const setLink=v=>{const arr=[...links];arr[li]=v;while(arr.length<5)arr.push("");set("jiraLinks",arr.filter((_,idx)=>idx<5));if(li===0)set("jiraLink",v);};
                return val||li===0?(
                  <div key={li} style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                    <span style={{color:B.textMuted,fontSize:"0.65rem",fontWeight:700,flexShrink:0,width:14}}>{li+1}</span>
                    <input value={val} onChange={e=>setLink(e.target.value)} placeholder={li===0?"Primary Jira link...":"Additional Jira link..."} style={{...inputStyle,flex:1}}/>
                  </div>
                ):null;
              })}
              <button type="button" onClick={()=>{
                const links=(form.jiraLinks&&form.jiraLinks.length)?[...form.jiraLinks]:([form.jiraLink||""]);
                if(links.filter(Boolean).length<5) set("jiraLinks",[...links,""]);
              }} style={{alignSelf:"flex-start",background:"transparent",border:`1px dashed ${B.border2}`,color:B.textMuted,borderRadius:7,padding:"0.18rem 0.7rem",cursor:"pointer",fontSize:"0.68rem",fontFamily:FONT}}>+ Add link</button>
            </div>
          </Field>
        </div>

        <SectionHead label="Modules" highlight={empty(form.modules)}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.25rem"}}>
          {MODULES.map(m=>{const on=form.modules.includes(m);return(
            <button key={m} type="button" onClick={()=>toggle(m)} style={{padding:"0.38rem 1rem",borderRadius:99,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",transition:"all 0.15s",background:on?B.grad1:"#0d0d0d",color:on?"#fff":B.textMuted,border:`1px solid ${on?"transparent":empty(form.modules)?B.teal+"55":B.border2}`,fontFamily:FONT}}>
              {on&&"✓ "}{m}
            </button>
          );})}
        </div>
        {empty(form.modules)&&<div style={{color:B.teal,fontSize:"0.68rem",marginTop:"0.3rem",opacity:0.8}}>Select at least one module</div>}

        <SectionHead label="Approvals" sub="Toggle who has approved this release"/>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
          {APPROVER_NAMES.map(n=>{const on=form.approvals?.[n]===true;return(
            <button key={n} type="button" onClick={()=>set("approvals",{...form.approvals,[n]:!on})}
              style={{padding:"0.38rem 1rem",borderRadius:99,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",transition:"all 0.15s",background:on?"linear-gradient(135deg,#22c55e,#16a34a)":"#0d0d0d",color:on?"#fff":B.textMuted,border:`1px solid ${on?"transparent":B.border2}`,fontFamily:FONT}}>
              {on?"✓ ":""}{n}
            </button>
          );})}
        </div>

        {/* ── DORA ── */}
        <SectionHead label="DORA Matrix" sub="deployment metrics"/>
        <div style={{background:"#080808",border:`1px solid ${B.border}`,borderRadius:12,padding:"1.25rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            <Field label="Lead Developer" highlight={empty(form.dora?.leadDeveloper)}>
              <input value={form.dora?.leadDeveloper||""} onChange={e=>setDora("leadDeveloper",e.target.value)} style={{...inputStyle,borderColor:empty(form.dora?.leadDeveloper)?B.teal+"88":B.border2}}/>
            </Field>
            <Field label="Application">
              <input value={form.dora?.application||""} onChange={e=>setDora("application",e.target.value)} style={inputStyle}/>
            </Field>
            <Field label="Services">
              <input value={form.dora?.services||""} onChange={e=>setDora("services",e.target.value)} style={inputStyle}/>
            </Field>
            <Field label="QA Status">
              <select value={form.dora?.qa||"NA"} onChange={e=>setDora("qa",e.target.value)} style={inputStyle}>
                {["Done","Partial","Pending","NA"].map(q=><option key={q}>{q}</option>)}
              </select>
            </Field>
            <Field label="Handover Date (dd/mm/yyyy)" highlight={empty(form.dora?.handoverDate)}>
              <input value={form.dora?.handoverDate||""} onChange={e=>setDora("handoverDate",e.target.value)} placeholder="13/03/2026" style={{...inputStyle,borderColor:empty(form.dora?.handoverDate)?B.teal+"88":B.border2}}/>
            </Field>
            <Field label="Original RN Link">
              <input value={form.dora?.originalRNLink||""} onChange={e=>setDora("originalRNLink",e.target.value)} style={inputStyle}/>
            </Field>
          </div>
          {form.dora?.handoverDate&&form.releaseActual&&(()=>{
            const lt=leadTimeDays(form.dora.handoverDate,form.releaseActual);
            return lt!==null&&(
              <div style={{marginTop:"0.75rem",display:"flex",alignItems:"center",gap:"0.75rem",background:"#111111",borderRadius:8,padding:"0.5rem 0.9rem"}}>
                <span style={{color:B.textMuted,fontSize:"0.75rem"}}>Lead Time:</span>
                <span style={{color:B.lime,fontWeight:800,fontSize:"1rem"}}>{lt} days</span>
              </div>
            );
          })()}
        </div>

        {/* ── Actions ── */}
        <div style={{display:"flex",gap:"0.75rem",marginTop:"1.5rem"}}>
          <button onClick={onClose} style={{...primaryBtn,background:"transparent",color:B.textMuted,border:`1px solid ${B.border2}`,flex:"0 0 auto",padding:"0.75rem 1.5rem"}}>Cancel</button>
          <button onClick={()=>onSave(form)} style={{...primaryBtn,flex:1,background:allGood?`linear-gradient(135deg,${B.lime},#16a34a)`:B.grad1}}>
            {allGood?"✓ Save Changes":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Format date for display: YYYY-MM-DD → DD/MM/YYYY
function fmtDate(d){
  if(!d||d==="—") return d||"—";
  const s=String(d).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    const [y,m,dd]=s.split("-");
    return `${dd}/${m}/${y}`;
  }
  return s; // already DD/MM/YYYY or other format
}
// ─── TABLE VIEW ───────────────────────────────────────────────────────────────
function TableView({releases,onAdd,onImport,onEdit,teamFilter}){
  const [sort,setSort]=useState({key:"releaseActual",dir:-1});
  const [filter,setFilter]=useState("");
  const [doraPopup,setDoraPopup]=useState(null);
  const [csvModal,setCsvModal]=useState(false);
  const [editRelease,setEditRelease]=useState(null);
  const [tableView,setTableView]=useState("week"); // "week" | "month" | "all"

  // Date window helpers
  const now=new Date();
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const getWindow=()=>{
    if(tableView==="week"){
      const mon=new Date(now);
      mon.setDate(now.getDate()-(now.getDay()===0?6:now.getDay()-1));
      mon.setHours(0,0,0,0);
      const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59);
      return{from:mon,to:sun,label:`Week of ${mon.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`};
    }
    if(tableView==="month"){
      const from=new Date(now.getFullYear(),now.getMonth(),1);
      const to=new Date(now);to.setHours(23,59,59);
      return{from,to,label:`${now.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}`};
    }
    return null; // all
  };
  const win=getWindow();

  const teamFiltered=releases.filter(r=>{
    if(!teamFilter||teamFilter==="All") return true;
    if(teamFilter==="Gateway") return r.modules?.some(m=>GATEWAY_MODULES.includes(m));
    if(teamFilter==="App Team") return r.modules?.some(m=>APP_MODULES.includes(m));
    return true;
  });

  const windowFiltered=win?teamFiltered.filter(r=>{
    const d=new Date(r.releaseActual||r.releasePlanned);
    return !isNaN(d)&&d>=win.from&&d<=win.to;
  }):teamFiltered;

  const DATE_KEYS=new Set(["releaseActual","releasePlanned","dora.handoverDate"]);
  const getVal=(r,k)=>{
    if(k==="releaseActual"||k==="releasePlanned"){
      const raw=r[k]||"";
      // normalise DD/MM/YYYY → YYYY-MM-DD for correct lexicographic sort
      if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)){
        const [d,m,y]=raw.split("/");
        return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
      }
      return raw; // already YYYY-MM-DD or empty
    }
    return r[k]||"";
  };
  const STATUS_ORDER={"Released":0,"In Progress":1,"Delayed":2,"Cancelled":3,"Planning":4};
  const searchFiltered=[...windowFiltered]
    .filter(r=>(r.summary||"").toLowerCase().includes(filter.toLowerCase())||(r.rn||"").toLowerCase().includes(filter.toLowerCase()));

  // Split into Released/active and Planning/pending
  const releasedRows=searchFiltered
    .filter(r=>r.status==="Released"||r.status==="Cancelled")
    .sort((a,b)=>{
      // Primary: date descending
      const da=getVal(a,"releaseActual")||getVal(a,"releasePlanned");
      const db=getVal(b,"releaseActual")||getVal(b,"releasePlanned");
      if(da!==db) return da>db?-1:1;
      // Secondary: RN number
      const ra=parseInt((a.rn||"").replace(/\D/g,""))||0;
      const rb=parseInt((b.rn||"").replace(/\D/g,""))||0;
      return rb-ra;
    });
  const pendingRows=searchFiltered
    .filter(r=>r.status!=="Released"&&r.status!=="Cancelled")
    .sort((a,b)=>{
      const sa=STATUS_ORDER[a.status]??3, sb=STATUS_ORDER[b.status]??3;
      if(sa!==sb) return sa-sb;
      const da=getVal(a,"releasePlanned")||getVal(a,"releaseActual");
      const db=getVal(b,"releasePlanned")||getVal(b,"releaseActual");
      if(da!==db) return da>db?-1:1;
      return 0;
    });
  // For column-click sort, apply on top of the above groups
  const applyColSort=(rows)=>{
    if(!sort.key) return rows;
    return [...rows].sort((a,b)=>{
      const va=getVal(a,sort.key), vb=getVal(b,sort.key);
      if(!va&&!vb) return 0; if(!va) return 1; if(!vb) return -1;
      return va<vb?-sort.dir:va>vb?sort.dir:0;
    });
  };
  const sorted=[...applyColSort(releasedRows),...applyColSort(pendingRows)];
  const releasedCount=releasedRows.length;
  const pendingCount=pendingRows.length;

  const Th=({k,l})=><th onClick={()=>setSort(s=>({key:k,dir:s.key===k?-s.dir:1}))} style={{padding:"0.8rem 0.9rem",color:B.textMuted,fontSize:"0.66rem",letterSpacing:"0.09em",textTransform:"uppercase",textAlign:"left",cursor:"pointer",whiteSpace:"nowrap",borderBottom:`1px solid ${B.border2}`,userSelect:"none",background:"#0d0d0d",fontFamily:FONT}}>{l}{sort.key===k?(sort.dir===1?" ↑":" ↓"):""}</th>;

  return(
    <div style={{padding:"1.5rem 2rem",position:"relative"}} onClick={()=>doraPopup&&setDoraPopup(null)}>
      {csvModal && <CSVImportModal onImport={onImport} onClose={()=>setCsvModal(false)} existingReleases={releases}/>}
      {editRelease && <EditModal release={editRelease} onClose={()=>setEditRelease(null)} onSave={updated=>{onEdit(updated);setEditRelease(null);}}/>}
      <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search RN, summary..." style={{...inputStyle,maxWidth:260,padding:"0.5rem 0.9rem"}}/>
        {/* Week / Month / All toggle */}
        <div style={{display:"flex",background:"#0a1824",borderRadius:10,padding:"0.18rem",border:`1px solid ${B.border2}`,gap:"0.1rem"}}>
          {[["week","Week"],["month","Month"],["all","All"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTableView(k)}
              style={{padding:"0.32rem 0.9rem",borderRadius:8,border:"none",cursor:"pointer",fontFamily:FONT,fontSize:"0.75rem",fontWeight:700,background:tableView===k?B.grad1:"transparent",color:tableView===k?"#fff":B.textMuted,transition:"all 0.15s"}}>
              {l}
            </button>
          ))}
        </div>
        {win&&<span style={{color:B.textMuted,fontSize:"0.75rem",flexShrink:0}}>{win.label}</span>}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <span style={{color:B.textMuted,fontSize:"0.78rem"}}>{sorted.length}{win?` / ${teamFiltered.length}`:""} releases</span>
          <button onClick={()=>setCsvModal(true)} style={{background:"#0a1824",border:`1px solid ${B.border2}`,color:B.textSecondary,borderRadius:10,padding:"0.45rem 0.9rem",cursor:"pointer",fontSize:"0.8rem",fontWeight:600,fontFamily:FONT}}>
            ↑ CSV
          </button>
          <button onClick={onAdd} style={{...primaryBtn,width:"auto",padding:"0.45rem 1rem",fontSize:"0.8rem"}}>+ New</button>
        </div>
      </div>
      <div style={{overflowX:"auto",borderRadius:16,border:`1px solid ${B.border}`}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:FONT}}>
          <thead><tr>
            <Th k="rn" l="RN"/>
            <Th k="summary" l="Summary"/>
            <Th k="type" l="Type"/>
            <Th k="priority" l="Priority"/>
            <Th k="status" l="Status"/>
            <Th k="releasePlanned" l="Planned"/>
            <Th k="releaseActual" l="Actual"/>
            <th style={{padding:"0.8rem 0.9rem",color:"#f97316",fontSize:"0.66rem",letterSpacing:"0.09em",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${B.border2}`,background:"#0d0d0d",whiteSpace:"nowrap"}}>Delay</th>
            <Th k="approvers" l="Approvers"/>
            <th style={{padding:"0.8rem 0.9rem",color:"#60a5fa",fontSize:"0.66rem",letterSpacing:"0.09em",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${B.border2}`,background:"#0d0d0d",whiteSpace:"nowrap"}}>Jira Link</th>
            <th style={{padding:"0.8rem 0.9rem",color:B.cyan,fontSize:"0.66rem",letterSpacing:"0.09em",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${B.border2}`,background:"#0d0d0d"}}>DORA</th>
            <th style={{padding:"0.8rem 0.9rem",color:B.textMuted,fontSize:"0.66rem",letterSpacing:"0.09em",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${B.border2}`,background:"#0d0d0d"}}>Edit</th>
          </tr></thead>
          <tbody>
            {releasedCount>0&&(
              <tr>
                <td colSpan={12} style={{padding:"0.6rem 1rem",background:"#0a1824",borderBottom:`1px solid ${B.border2}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                    <span style={{color:B.textMuted,fontSize:"0.66rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase"}}>✓ Released</span>
                    <span style={{background:B.lime+"22",color:B.lime,borderRadius:99,padding:"0.1rem 0.55rem",fontSize:"0.65rem",fontWeight:700}}>{releasedCount}</span>
                  </div>
                </td>
              </tr>
            )}
            {sorted.map((r,i)=>{
              const delay=r.releaseActual&&r.releasePlanned?daysBetween(r.releasePlanned,r.releaseActual):null;
              const delayColor=delay===null?B.textMuted:delay===0?B.lime:delay>0?"#ef4444":B.cyan;
              const delayLabel=delay===null?"—":delay===0?"On Time":delay>0?`+${delay}d`:`${delay}d early`;
              const isSectionBreak=i===releasedCount&&pendingCount>0;
              return(<>
              {isSectionBreak&&(
                <tr key="divider">
                  <td colSpan={12} style={{padding:"0.6rem 1rem",background:"#0a1824",borderTop:`2px solid ${B.border2}`,borderBottom:`1px solid ${B.border2}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                      <span style={{color:B.textMuted,fontSize:"0.66rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase"}}>⏳ Pending / Planning</span>
                      <span style={{background:B.teal+"22",color:B.teal,borderRadius:99,padding:"0.1rem 0.55rem",fontSize:"0.65rem",fontWeight:700}}>{pendingCount}</span>
                    </div>
                  </td>
                </tr>
              )}
                <tr key={r.id} style={{background:i%2===0?B.bgDark:B.bgCard,transition:"background 0.12s"}} onMouseEnter={e=>e.currentTarget.style.background=B.bgRow} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?B.bgDark:B.bgCard}>
                  <td style={{...tdSt,whiteSpace:"nowrap",verticalAlign:"top"}}>
                    {(()=>{
                      const links=[...(r.rnLinks||[]),...(r.rnLink&&!r.rnLinks?.includes(r.rnLink)?[r.rnLink]:[])].filter(Boolean).slice(0,5);
                      return links.length
                        ?<div style={{display:"flex",flexDirection:"column",gap:"0.2rem"}}>
                          {links.map((lk,li)=>(
                            <a key={li} href={lk} target="_blank" rel="noreferrer"
                              style={{color:B.teal,fontWeight:700,fontSize:"0.78rem",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:"0.25rem"}}
                              onClick={e=>e.stopPropagation()}>
                              {li===0?r.rn:`↳ RN ${li+1}`}<span style={{fontSize:"0.58rem",opacity:0.65}}>↗</span>
                            </a>
                          ))}
                        </div>
                        :<span style={{color:B.teal,fontWeight:700,fontSize:"0.8rem"}}>{r.rn}</span>;
                    })()}
                  </td>
                  <td style={{...tdSt,color:B.textPrimary,fontWeight:500,fontSize:"0.73rem",maxWidth:240,minWidth:160}}>
                    <span style={{display:"block",whiteSpace:"normal",wordBreak:"break-word",lineHeight:1.4}}>{r.summary}</span>
                  </td>
                  <td style={tdSt} onClick={e=>e.stopPropagation()}>
                    <select
                      value={r.type||""}
                      onChange={e=>{onEdit&&onEdit({...r,type:e.target.value});}}
                      style={{background:"#0d0d0d",border:`1px solid ${B.border2}`,color:TYPE_COLOR(r.type||"New Feature"),borderRadius:7,padding:"0.22rem 0.5rem",fontSize:"0.72rem",fontWeight:700,fontFamily:FONT,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",minWidth:100}}
                    >
                      <option value="">— type —</option>
                      {RELEASE_TYPES.map(t=><option key={t} value={t} style={{color:TYPE_COLOR(t),background:"#000000"}}>{t}</option>)}
                    </select>
                  </td>
                  <td style={tdSt} onClick={e=>e.stopPropagation()}>
                    {(()=>{
                      const col=PRIORITY_COLORS[r.priority]||B.textMuted;
                      return(
                        <select value={r.priority||""} onChange={e=>{onEdit&&onEdit({...r,priority:e.target.value});}}
                          style={{background:col+"22",border:`1px solid ${col}55`,color:col,borderRadius:7,padding:"0.18rem 0.3rem",fontSize:"0.69rem",fontWeight:700,fontFamily:FONT,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",width:44,textAlign:"center"}}>
                          {PRIORITIES.map(p=><option key={p} value={p} style={{background:"#0d0d0d",color:PRIORITY_COLORS[p]||B.textMuted}}>{p}</option>)}
                        </select>
                      );
                    })()}
                  </td>
                  <td style={tdSt} onClick={e=>e.stopPropagation()}>
                    {(()=>{
                      const STATUS_OPTS=[["Released",B.lime],["Planning",B.teal],["Rolledback","#f97316"],["In Progress",B.cyan],["Delayed","#ef4444"]];
                      const col=STATUS_COLORS[r.status]||B.textMuted;
                      return(
                        <select value={r.status||""} onChange={e=>{
                          const newStatus=e.target.value;
                          let updated={...r,status:newStatus};
                          // Auto-assign RN when status changes to Released and no RN yet
                          if(newStatus==="Released"&&(!r.rn||r.rn==="")&&releases){
                            const isGateway=r.modules?.some(m=>GATEWAY_MODULES.includes(m));
                            const prefix=isGateway?"RN-GAT-":"RN-APP-";
                            const existing=releases
                              .map(x=>x.rn||"")
                              .filter(rn=>rn.startsWith(prefix))
                              .map(rn=>parseInt(rn.replace(prefix,""))||0);
                            const max=existing.length?Math.max(...existing):0;
                            updated.rn=prefix+String(max+1).padStart(3,"0");
                          }
                          onEdit&&onEdit(updated);
                        }}
                          style={{background:col+"18",border:`1px solid ${col}44`,color:col,borderRadius:7,padding:"0.22rem 0.5rem",fontSize:"0.72rem",fontWeight:700,fontFamily:FONT,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",minWidth:96}}>
                          {STATUS_OPTS.map(([s])=><option key={s} value={s} style={{background:"#0d0d0d",color:STATUS_COLORS[s]||B.textMuted}}>{s}</option>)}
                        </select>
                      );
                    })()}
                  </td>
                  <td style={{...tdSt,color:B.textSecondary,fontSize:"0.73rem",whiteSpace:"nowrap"}}>{fmtDate(r.releasePlanned)}</td>
                  <td style={{...tdSt,color:r.releaseActual?B.lime:B.textMuted,fontSize:"0.73rem",whiteSpace:"nowrap"}}>{fmtDate(r.releaseActual)||"—"}</td>
                  <td style={tdSt}><span style={{color:delayColor,fontWeight:700,fontSize:"0.82rem"}}>{delayLabel}</span></td>
                  <td style={{...tdSt,maxWidth:160}}>
                    {(()=>{const names=getApprovedNames(r);return names.length
                      ?<span style={{color:B.lime,fontWeight:700,fontSize:"0.79rem"}}>{names.join(", ")}</span>
                      :<span style={{color:B.textMuted,fontSize:"0.72rem"}}>—</span>;})()
                    }
                  </td>
                  <td style={{...tdSt,verticalAlign:"top"}}>
                    {(()=>{
                      const jLinks=[...(r.jiraLinks||[]),...(r.jiraLink&&!r.jiraLinks?.includes(r.jiraLink)?[r.jiraLink]:[])].filter(l=>l&&l.trim()).slice(0,5);
                      return jLinks.length
                        ?<div style={{display:"flex",flexDirection:"column",gap:"0.25rem"}}>
                          {jLinks.map((lk,li)=>(
                            <a key={li} href={lk} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                              style={{display:"inline-flex",alignItems:"center",gap:"0.25rem",background:"#0f2d52",color:"#60a5fa",border:"1px solid #1e4a8066",borderRadius:7,padding:"0.2rem 0.55rem",textDecoration:"none",fontSize:"0.67rem",fontWeight:700,whiteSpace:"nowrap"}}>
                              {li===0?"⎇ Jira ↗":`⎇ Jira ${li+1} ↗`}
                            </a>
                          ))}
                        </div>
                        :<span style={{color:B.textMuted,fontSize:"0.69rem",opacity:0.4}}>—</span>;
                    })()}
                  </td>
                  <td style={tdSt}>
                    <button onClick={e=>{e.stopPropagation();setDoraPopup(p=>p?.release?.id===r.id?null:{release:r,pos:{x:Math.min(e.clientX,window.innerWidth-450),y:Math.min(e.clientY,window.innerHeight-430)}});}}
                      style={{background:doraPopup?.release?.id===r.id?B.grad1:"#0d0d0d",border:`1px solid ${B.border2}`,color:doraPopup?.release?.id===r.id?"#fff":B.cyan,borderRadius:8,padding:"0.28rem 0.7rem",cursor:"pointer",fontSize:"0.7rem",fontWeight:700,fontFamily:FONT,whiteSpace:"nowrap"}}>
                      {doraPopup?.release?.id===r.id?"▲ Close":"▼ DORA"}
                    </button>
                  </td>
                  <td style={tdSt}>
                    <button onClick={e=>{e.stopPropagation();setEditRelease(r);}}
                      style={{background:"#0d0d0d",border:`1px solid ${B.teal}55`,color:B.teal,borderRadius:8,padding:"0.28rem 0.7rem",cursor:"pointer",fontSize:"0.7rem",fontWeight:700,fontFamily:FONT,whiteSpace:"nowrap"}}>
                      ✎ Edit
                    </button>
                  </td>
                </tr>
              </>);
            })}
          </tbody>
        </table>
      </div>
      {/* DORA popup floats near button */}
      {doraPopup&&<DoraPopup release={doraPopup.release} pos={doraPopup.pos} onClose={()=>setDoraPopup(null)}/>}
    </div>
  );
}


// ─── NODE GRAPH ───────────────────────────────────────────────────────────────
function NodeGraphView({releases}){
  const canvasRef=useRef(null);
  const [tooltip,setTooltip]=useState(null);
  const [tooltipPos,setTooltipPos]=useState({x:0,y:0});
  const nodesRef=useRef([]);
  const animRef=useRef(null);
  const dragging=useRef(null);
  const [,fu]=useState(0);
  const hideTimer=useRef(null);
  const overCard=useRef(false);

  const showTooltip=(release,pos)=>{
    if(hideTimer.current){clearTimeout(hideTimer.current);hideTimer.current=null;}
    setTooltip(release);setTooltipPos(pos);
  };
  const scheduleHide=()=>{
    if(overCard.current)return;
    if(hideTimer.current)clearTimeout(hideTimer.current);
    hideTimer.current=setTimeout(()=>{if(!overCard.current)setTooltip(null);},450);
  };

  useEffect(()=>{const el=canvasRef.current?.parentElement;const W=el?.clientWidth||900,H=el?.clientHeight||600,cx=W/2,cy=H/2;const ms=[...new Set(releases.flatMap(r=>r.modules))];const nodes=[];nodes.push({id:"hub",label:"Releases",type:"hub",x:cx,y:cy,vx:0,vy:0,r:30});ms.forEach((m,i)=>{const a=(i/ms.length)*Math.PI*2;nodes.push({id:`mod_${m}`,label:m,type:"module",x:cx+Math.cos(a)*185,y:cy+Math.sin(a)*185,vx:0,vy:0,r:20});});releases.forEach((r,i)=>{const a=(i/releases.length)*Math.PI*2+0.4,d=300+(i%4)*35;nodes.push({id:`rel_${r.id}`,label:r.rn,type:"release",release:r,x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d,vx:0,vy:0,r:12+(r.priority==="Hotfix"?7:r.priority==="P1"?4:0)});});nodesRef.current=nodes;fu(n=>n+1);},[releases]);

  const getEdges=()=>{const e=[],s=new Set();releases.forEach(r=>{r.modules.forEach(m=>{const src=nodesRef.current.find(n=>n.id===`rel_${r.id}`),dst=nodesRef.current.find(n=>n.id===`mod_${m}`);if(src&&dst){const k=[src.id,dst.id].sort().join("|");if(!s.has(k)){e.push({src,dst,type:"rel-mod"});s.add(k);}}});});const hub=nodesRef.current.find(n=>n.id==="hub");nodesRef.current.filter(n=>n.type==="module").forEach(m=>{const k=["hub",m.id].sort().join("|");if(!s.has(k)){e.push({src:hub,dst:m,type:"mod-hub"});s.add(k);}});return e;};

  useEffect(()=>{const tick=()=>{const nodes=nodesRef.current;if(!nodes.length){animRef.current=requestAnimationFrame(tick);return;}const edges=getEdges(),W=canvasRef.current?.width||900,H=canvasRef.current?.height||600;for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,dist=Math.sqrt(dx*dx+dy*dy)||1,min=(a.r+b.r)*3.5;if(dist<min){const f=(min-dist)/dist*0.08;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;}}edges.forEach(({src,dst,type})=>{const dx=dst.x-src.x,dy=dst.y-src.y,dist=Math.sqrt(dx*dx+dy*dy)||1,f=(dist-(type==="mod-hub"?185:155))/dist*0.03;if(src.id!=="hub"){src.vx+=dx*f;src.vy+=dy*f;}if(dst.id!=="hub"){dst.vx-=dx*f;dst.vy-=dy*f;}});nodes.forEach(n=>{if(n.id==="hub")return;n.vx+=(W/2-n.x)*0.002;n.vy+=(H/2-n.y)*0.002;});nodes.forEach(n=>{if(dragging.current===n.id)return;n.vx*=0.85;n.vy*=0.85;n.x+=n.vx;n.y+=n.vy;n.x=Math.max(n.r+10,Math.min(W-n.r-10,n.x));n.y=Math.max(n.r+10,Math.min(H-n.r-10,n.y));});draw();animRef.current=requestAnimationFrame(tick);};animRef.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(animRef.current);},[releases]);

  const draw=()=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);getEdges().forEach(({src,dst,type})=>{ctx.beginPath();ctx.moveTo(src.x,src.y);ctx.lineTo(dst.x,dst.y);ctx.strokeStyle=type==="mod-hub"?"rgba(14,165,200,0.35)":"rgba(34,211,238,0.2)";ctx.lineWidth=type==="mod-hub"?1.5:1;ctx.setLineDash(type==="rel-mod"?[4,4]:[]);ctx.stroke();ctx.setLineDash([]);});nodesRef.current.forEach(n=>{ctx.save();if(n.type==="hub"){[[38,B.teal+"66",6],[28,B.cyan+"55",5],[18,B.lime+"66",4]].forEach(([r,col,lw])=>{ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();});ctx.beginPath();ctx.arc(n.x,n.y,8,0,Math.PI*2);const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,8);g.addColorStop(0,B.cyan);g.addColorStop(1,B.blue);ctx.fillStyle=g;ctx.fill();ctx.fillStyle=B.textSecondary;ctx.font="bold 9px 'DM Sans',sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("HUB",n.x,n.y+42);}else if(n.type==="module"){const isGW=GATEWAY_MODULES.includes(n.label),isApp=APP_MODULES.includes(n.label),rc=isGW?B.teal:isApp?B.lime:B.cyan;ctx.beginPath();ctx.arc(n.x,n.y,n.r+5,0,Math.PI*2);ctx.strokeStyle=rc+"33";ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);g.addColorStop(0,B.deepBlue);g.addColorStop(1,"#0d0d0d");ctx.fillStyle=g;ctx.strokeStyle=rc;ctx.lineWidth=1.5;ctx.fill();ctx.stroke();ctx.fillStyle=rc;ctx.font="bold 8px 'DM Sans',sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(n.label.slice(0,4),n.x,n.y);ctx.fillStyle=B.textSecondary;ctx.font="bold 9px 'DM Sans',sans-serif";ctx.fillText(n.label,n.x,n.y+n.r+13);}else{const c=TYPE_COLOR(n.release.type);ctx.shadowColor=c;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);g.addColorStop(0,c+"55");g.addColorStop(1,c+"11");ctx.fillStyle=g;ctx.strokeStyle=c;ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.font="bold 6.5px 'DM Sans',sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(n.label.slice(0,9),n.x,n.y);const pc=PRIORITY_COLORS[n.release.priority]||B.textMuted;ctx.beginPath();ctx.arc(n.x+n.r-4,n.y-n.r+4,4,0,Math.PI*2);ctx.fillStyle=pc;ctx.shadowColor=pc;ctx.shadowBlur=6;ctx.fill();ctx.shadowBlur=0;}ctx.restore();});};

  const getNodeAt=(x,y)=>nodesRef.current.find(n=>{const dx=n.x-x,dy=n.y-y;return Math.sqrt(dx*dx+dy*dy)<n.r+6;});

  const handleMouseMove=e=>{
    const rect=canvasRef.current.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
    if(dragging.current){const nd=nodesRef.current.find(n=>n.id===dragging.current);if(nd){nd.x=x;nd.y=y;nd.vx=0;nd.vy=0;}return;}
    const node=getNodeAt(x,y);
    if(node?.type==="release"){showTooltip(node.release,{x:e.clientX,y:e.clientY});}
    else{scheduleHide();}
  };

  return(
    <div style={{position:"relative",width:"100%",height:"calc(100vh - 112px)"}}>
      <canvas ref={canvasRef}
        width={typeof window!=="undefined"?window.innerWidth-40:900}
        height={typeof window!=="undefined"?window.innerHeight-112:600}
        onMouseMove={handleMouseMove}
        onMouseDown={e=>{const r=canvasRef.current.getBoundingClientRect();const n=getNodeAt(e.clientX-r.left,e.clientY-r.top);if(n)dragging.current=n.id;else setTooltip(null);}}
        onMouseUp={()=>{dragging.current=null;}}
        onMouseLeave={()=>{dragging.current=null;scheduleHide();}}
        style={{display:"block",cursor:"crosshair"}}/>

      {/* Legend */}
      <div style={{position:"absolute",bottom:16,left:16,background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:12,padding:"0.65rem 0.9rem",fontFamily:"'DM Sans',sans-serif"}}>
        {[["Feature/Imp",TYPE_COLORS["New Feature"]],["Patch",TYPE_COLORS["Patch"]],["Bug",TYPE_COLORS["Bug"]]].map(([l,c])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.2rem"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>
            <span style={{color:B.textSecondary,fontSize:"0.65rem"}}>{l}</span>
          </div>
        ))}
        <div style={{borderTop:`1px solid ${B.border}`,marginTop:"0.3rem",paddingTop:"0.3rem",color:B.textMuted,fontSize:"0.58rem"}}>Drag · Hover to inspect</div>
      </div>

      {/* Hover card */}
      {tooltip&&(()=>{
        const pc=PRIORITY_COLORS[tooltip.priority]||B.textMuted;
        const sc=STATUS_COLORS[tooltip.status]||B.textMuted;
        const isGW=tooltip.modules?.some(m=>GATEWAY_MODULES.includes(m));
        const mc=isGW?B.teal:B.lime;
        const fmtDate=d=>{
          if(!d)return"—";const dt=new Date(d);
          return isNaN(dt)?"—":dt.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
        };
        const cardW=252;
        const left=tooltipPos.x+14+cardW>window.innerWidth?tooltipPos.x-cardW-10:tooltipPos.x+14;
        const top=Math.min(Math.max(tooltipPos.y-14,8),window.innerHeight-400);
        // Jira: prefer jiraLink field, fall back to dora.originalRNLink if it looks like a URL
        const rawJira=(tooltip.jiraLink&&tooltip.jiraLink.trim())||
                      (tooltip.dora?.originalRNLink&&tooltip.dora.originalRNLink!=="NA"&&tooltip.dora.originalRNLink!=""?tooltip.dora.originalRNLink:null);
        const jiraLink=rawJira&&(rawJira.startsWith("http")||rawJira.startsWith("/"))?rawJira:null;
        const rnLink=(tooltip.rnLink&&tooltip.rnLink.trim())||null;
        return(
          <div
            onMouseEnter={()=>{overCard.current=true;if(hideTimer.current){clearTimeout(hideTimer.current);hideTimer.current=null;}}}
            onMouseLeave={()=>{overCard.current=false;scheduleHide();}}
            style={{
              position:"fixed",left,top,zIndex:1000,pointerEvents:"auto",
              background:"#0d0d0d",
              border:`1px solid ${B.border2}`,borderRadius:14,
              padding:"0.95rem 1.05rem",width:cardW,
              boxShadow:"0 16px 48px rgba(0,0,0,0.78)",
              fontFamily:"'DM Sans',sans-serif"
            }}>
            {/* Accent bar */}
            <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",borderRadius:"14px 14px 0 0",background:`linear-gradient(90deg,${mc},${B.blue}44)`}}/>

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:"0.35rem",marginBottom:"0.7rem",marginTop:"0.05rem"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:mc,boxShadow:`0 0 5px ${mc}88`,flexShrink:0}}/>
              <span style={{color:mc,fontWeight:700,fontSize:"0.72rem",letterSpacing:"0.04em",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textTransform:"uppercase"}}>
                {tooltip.modules?.join(" · ")||"—"}
              </span>
              <button onClick={()=>{setTooltip(null);overCard.current=false;}}
                style={{background:"transparent",border:"none",color:B.textMuted,cursor:"pointer",
                  fontSize:"0.68rem",padding:"0.1rem 0.2rem",fontFamily:"'DM Sans',sans-serif",
                  borderRadius:4,flexShrink:0,lineHeight:1}}>✕</button>
            </div>

            {/* Data rows */}
            {[
              ["Task",        <span style={{color:B.textPrimary,fontWeight:600,fontSize:"0.72rem",lineHeight:1.4}}>{tooltip.summary}</span>],
              ["Goal",        <span style={{color:B.textSecondary,fontSize:"0.69rem",lineHeight:1.4}}>{tooltip.goal||"—"}</span>],
              ["Priority",    <span style={{background:pc+"1a",color:pc,border:`1px solid ${pc}2e`,padding:"0.08rem 0.42rem",borderRadius:99,fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.04em"}}>{tooltip.priority||"—"}</span>],
              ["Release Date",<span style={{color:B.textPrimary,fontSize:"0.69rem",fontWeight:500}}>{fmtDate(tooltip.releaseActual||tooltip.releasePlanned)}</span>],
              ["Status",      <span style={{display:"inline-flex",alignItems:"center",gap:"0.22rem",background:sc+"1a",color:sc,border:`1px solid ${sc}2e`,padding:"0.08rem 0.45rem",borderRadius:99,fontSize:"0.62rem",fontWeight:700}}>
                                <span style={{width:4,height:4,borderRadius:"50%",background:sc,flexShrink:0,display:"inline-block"}}/>
                                {tooltip.status}
                              </span>],
              ["Modules",     <span style={{color:B.teal,fontSize:"0.69rem",fontWeight:600}}>{tooltip.modules?.join(", ")||"—"}</span>],
              ["Approved By",(()=>{const names=getApprovedNames(tooltip);return names.length
                  ?<span style={{color:B.lime,fontWeight:700,fontSize:"0.69rem"}}>{names.join(", ")}</span>
                  :<span style={{color:B.textMuted,fontSize:"0.65rem"}}>—</span>;})()],
            ].map(([label,val])=>(
              <div key={label} style={{display:"grid",gridTemplateColumns:"76px 1fr",gap:"0.25rem",alignItems:"start",marginBottom:"0.32rem"}}>
                <span style={{color:B.textMuted,fontSize:"0.63rem",paddingTop:"0.06rem",letterSpacing:"0.02em"}}>{label}</span>
                <span style={{minWidth:0}}>{val}</span>
              </div>
            ))}

            {/* Divider */}
            <div style={{borderTop:`1px solid ${B.border}`,margin:"0.65rem 0 0.6rem"}}/>

            {/* Buttons */}
            <div style={{display:"flex",gap:"0.45rem"}}>
              {jiraLink
                ?<a href={jiraLink} target="_blank" rel="noreferrer"
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.3rem",
                      background:"#0f2d52",color:"#60a5fa",border:"1px solid #1e4a8044",
                      borderRadius:9,padding:"0.42rem 0.35rem",textDecoration:"none",
                      fontSize:"0.64rem",fontWeight:700,letterSpacing:"0.03em",fontFamily:"'DM Sans',sans-serif"}}>
                    <span style={{fontSize:"0.75rem"}}>⎇</span>Jira Link
                  </a>
                :<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.3rem",
                    background:"#0d0d0d",color:B.textMuted,border:`1px solid ${B.border}`,
                    borderRadius:9,padding:"0.42rem 0.35rem",
                    fontSize:"0.64rem",fontWeight:600,opacity:0.38,cursor:"not-allowed",letterSpacing:"0.03em"}}>
                    <span style={{fontSize:"0.75rem"}}>⎇</span>Jira Link
                  </div>
              }
              {rnLink
                ?<a href={rnLink} target="_blank" rel="noreferrer"
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.3rem",
                      background:"#0a2618",color:B.lime,border:`1px solid ${B.lime}33`,
                      borderRadius:9,padding:"0.42rem 0.35rem",textDecoration:"none",
                      fontSize:"0.64rem",fontWeight:700,letterSpacing:"0.03em",fontFamily:"'DM Sans',sans-serif"}}>
                    <span style={{fontSize:"0.75rem"}}>📄</span>RN Link
                  </a>
                :<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.3rem",
                    background:"#0d0d0d",color:B.textMuted,border:`1px solid ${B.border}`,
                    borderRadius:9,padding:"0.42rem 0.35rem",
                    fontSize:"0.64rem",fontWeight:600,opacity:0.38,cursor:"not-allowed",letterSpacing:"0.03em"}}>
                    <span style={{fontSize:"0.75rem"}}>📄</span>RN Link
                  </div>
              }
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({releases}){
  const [dateRange,setDateRange]=useState(null); // null = no filter = show all
  const [calOpen,setCalOpen]=useState(false);
  const [handoverHover,setHandoverHover]=useState(null);
  const [handoverPos,setHandoverPos]=useState({x:0,y:0});

  const filtered=useMemo(()=>{
    if(!dateRange) return releases; // no filter = show all
    const f=new Date(dateRange.from),t=new Date(dateRange.to);
    t.setHours(23,59,59); // include the end date fully
    return releases.filter(r=>{
      const d=new Date(r.releaseActual||r.releasePlanned);
      return !isNaN(d)&&d>=f&&d<=t;
    });
  },[releases,dateRange]);

  // Delivered = Released + Cancelled(Rolledback) — reacts to dateRange filter
  const delivered=useMemo(()=>filtered.filter(r=>r.status==="Released"||r.status==="Cancelled"),[filtered]);
  const total    =delivered.length;
  const bugs     =useMemo(()=>delivered.filter(r=>r.type==="Bug").length,[delivered]);
  const patches  =useMemo(()=>delivered.filter(r=>r.type==="Patch").length,[delivered]);
  const featImps =useMemo(()=>delivered.filter(r=>r.type==="New Feature"||r.type==="Improvement").length,[delivered]);
  const released =useMemo(()=>delivered.filter(r=>r.status==="Released").length,[delivered]);
  const rolledBack=useMemo(()=>delivered.filter(r=>r.status==="Cancelled").length,[delivered]);

  // These re-derive whenever filtered/dateRange changes — so team tiles respond to date filter
  const gatewayReleases=useMemo(()=>delivered.filter(r=>r.modules.some(m=>GATEWAY_MODULES.includes(m))),[delivered]);
  const appReleases    =useMemo(()=>delivered.filter(r=>r.modules.some(m=>APP_MODULES.includes(m))),[delivered]);

  const leadTimesAll=useMemo(()=>delivered.map(r=>leadTimeDays(r.dora?.handoverDate,r.releaseActual)).filter(x=>x!==null&&x>=0),[delivered]);
  const avgLT=leadTimesAll.length?(leadTimesAll.reduce((a,b)=>a+b,0)/leadTimesAll.length).toFixed(1):"—";
  const featImpLT=useMemo(()=>delivered.filter(r=>r.type==="New Feature"||r.type==="Improvement").map(r=>leadTimeDays(r.dora?.handoverDate,r.releaseActual)).filter(x=>x!==null&&x>=0),[delivered]);
  const avgFeatImpLT=featImpLT.length?(featImpLT.reduce((a,b)=>a+b,0)/featImpLT.length).toFixed(1):"—";

  // This week's releases (Mon-Sun of range.to)
  const toDate=dateRange?new Date(dateRange.to):new Date();
  const dayOfWeek=toDate.getDay();
  const monday=new Date(toDate);monday.setDate(toDate.getDate()-(dayOfWeek===0?6:dayOfWeek-1));
  const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);
  const weekReleases=releases.filter(r=>{const d=new Date(r.releaseActual);return r.releaseActual&&(r.status==="Released"||r.status==="Cancelled")&&d>=monday&&d<=sunday;});

  const handoverGroups=useMemo(()=>{
    const map={};
    filtered.forEach(r=>{const hd=r.dora?.handoverDate||"Unknown";if(!map[hd])map[hd]={date:hd,releases:[],bug:0,patch:0,featImp:0,total:0};map[hd].releases.push(r);if(r.type==="Bug")map[hd].bug++;else if(r.type==="Patch")map[hd].patch++;else map[hd].featImp++;map[hd].total++;});
    return Object.values(map).sort((a,b)=>(parseDDMMYYYY(a.date)||new Date(0))-(parseDDMMYYYY(b.date)||new Date(0)));
  },[filtered]);

  // Build daily chart for date range
  // ── Weekly grouping (always works, no date range needed) ──
  const getWeekKey=dateStr=>{
    if(!dateStr) return null;
    const d=new Date(dateStr);
    if(isNaN(d)) return null;
    const mon=new Date(d);
    mon.setDate(d.getDate()-(d.getDay()===0?6:d.getDay()-1));
    return mon.toISOString().slice(0,10);
  };
  const getWeekLabel=wk=>{
    const d=new Date(wk),sun=new Date(wk);
    sun.setDate(d.getDate()+6);
    const f=x=>x.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    return f(d)+" – "+f(sun);
  };
  // Robust date normaliser for chart: handles YYYY-MM-DD, DD/MM/YYYY, D/M/YYYY
  const toChartKey=dateStr=>{
    if(!dateStr) return null;
    const s=dateStr.trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already YYYY-MM-DD
    if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
      const [d,m,y]=s.split("/");
      return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // Try JS Date parsing as last resort
    const dt=new Date(s);
    if(!isNaN(dt)) return dt.toISOString().slice(0,10);
    return null;
  };

  const weeklyData=useMemo(()=>{
    // Use ALL releases (not just delivered/filtered) so Planning & In Progress show too
    const src=dateRange?filtered:releases;
    const map={};
    src.forEach(r=>{
      const raw=r.releaseActual||r.releasePlanned;
      const key=toChartKey(raw);
      if(!key) return;
      const dt=new Date(key);
      if(isNaN(dt)) return;
      const dow=dt.getDay();
      if(!map[key]) map[key]={week:key,featImp:0,improvement:0,patch:0,bug:0,total:0,releases:[],isWeekend:dow===0||dow===6};
      const t=(r.type||"").trim();
      if(t==="Bug")              map[key].bug++;
      else if(t==="Patch")       map[key].patch++;
      else if(t==="Improvement") map[key].improvement++;
      else                       map[key].featImp++;
      map[key].total++;
      map[key].releases.push(r);
    });
    // Fill weekday gaps (Mon–Fri) between first and last release date
    const keys=Object.keys(map).sort();
    if(!keys.length) return [];
    const first=new Date(keys[0]), last=new Date(keys[keys.length-1]);
    for(let d=new Date(first);d<=last;d.setDate(d.getDate()+1)){
      const dow=d.getDay();
      if(dow===0||dow===6) continue; // skip empty weekends
      const k=d.toISOString().slice(0,10);
      if(!map[k]) map[k]={week:k,featImp:0,improvement:0,patch:0,bug:0,total:0,releases:[],isWeekend:false};
    }
    return Object.values(map).sort((a,b)=>a.week.localeCompare(b.week));
  },[releases,filtered,dateRange]);

  const dailyData=useMemo(()=>{
    if(!dateRange) return [];
    const f=new Date(dateRange.from),t=new Date(dateRange.to);
    const map={};
    for(let d=new Date(f);d<=t;d.setDate(d.getDate()+1)){const k=d.toISOString().slice(0,10);map[k]={date:k,featImp:0,bug:0,patch:0};}
    filtered.forEach(r=>{const k=r.releaseActual||r.releasePlanned;if(map[k]){if(r.type==="Bug")map[k].bug++;else if(r.type==="Patch")map[k].patch++;else map[k].featImp++;}});
    return Object.values(map).map((d,i)=>{const dt=new Date(d.date);return{...d,label:i%3===0?`${dt.toLocaleDateString("en-US",{weekday:"short"})}
${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")}`:"",total:d.featImp+d.bug+d.patch};});
  },[filtered,dateRange]);

  const maxBar=Math.max(...dailyData.map(d=>d.total),1);
  const maxWeek=Math.max(...(weeklyData.length?weeklyData.map(w=>w.total):[1]));
  const maxHO=Math.max(...handoverGroups.map(g=>g.total),1);


  const KPI=({label,value,color,sub})=>(
    <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:14,padding:"1.1rem 1.3rem",flex:1,minWidth:120,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color||B.teal,opacity:0.6,borderRadius:"14px 14px 0 0"}}/>
      <div style={{color:B.textMuted,fontSize:"0.66rem",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700,marginBottom:"0.4rem"}}>{label}</div>
      <div style={{color:color||B.textPrimary,fontSize:"2rem",fontWeight:800,lineHeight:1,letterSpacing:"-0.04em"}}>{value}</div>
      {sub&&<div style={{color:B.textMuted,fontSize:"0.68rem",marginTop:"0.3rem"}}>{sub}</div>}
    </div>
  );

  // ── Team Tile (fixed uniform label layout) ──
  const TeamTile=({label,relArr,color,modules})=>{
    const b=relArr.filter(r=>r.type==="Bug").length;
    const p=relArr.filter(r=>r.type==="Patch").length;
    const f=relArr.filter(r=>r.type==="New Feature"||r.type==="Improvement").length;
    return(
      <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:14,padding:"1.3rem 1.4rem",flex:1,minWidth:220,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:color,borderRadius:"14px 14px 0 0"}}/>
        {/* Label + type badges — same layout for both tiles */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"0.5rem",marginBottom:"0.75rem"}}>
          <div>
            <div style={{color:B.textMuted,fontSize:"0.66rem",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700,marginBottom:"0.5rem"}}>{label}</div>
            <div style={{color:color,fontSize:"2.4rem",fontWeight:800,lineHeight:1,letterSpacing:"-0.04em"}}>{relArr.length}</div>
          </div>
          {/* Right side: type badges stacked */}
          <div style={{display:"flex",flexDirection:"column",gap:"0.35rem",alignItems:"flex-end",paddingTop:"0.2rem"}}>
            <Chip label={`Feature/Imp: ${f}`} color={B.lime}/>
            <Chip label={`Patch: ${p}`} color="#a855f7"/>
            <Chip label={`Bug: ${b}`} color="#ef4444"/>
          </div>
        </div>
        {/* Module pills */}
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
          {modules.map(m=><span key={m} style={{background:color+"18",border:`1px solid ${color}44`,color:color,padding:"0.2rem 0.6rem",borderRadius:99,fontSize:"0.72rem",fontWeight:600}}>{m}</span>)}
        </div>
      </div>
    );
  };

  return(
    <div style={{padding:"1.5rem 2rem",fontFamily:FONT,overflowY:"auto",height:"calc(100vh - 112px)"}}>
      {/* ── Date Range Picker ── */}
      <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1.5rem",position:"relative"}}>
        <span style={{color:B.textMuted,fontSize:"0.8rem"}}>Time Range:</span>
        <div style={{position:"relative"}}>
          <button onClick={()=>setCalOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:"0.6rem",background:"#0d0d0d",border:`1px solid ${calOpen?B.teal:B.border2}`,color:B.textPrimary,borderRadius:10,padding:"0.45rem 1rem",cursor:"pointer",fontSize:"0.82rem",fontWeight:600,fontFamily:FONT,transition:"border-color 0.2s"}}>
            <span style={{fontSize:"0.85rem"}}>📅</span>
            <span>{dateRange?dateRange.from:"All time"}</span>{dateRange&&<><span style={{color:B.textMuted}}>→</span><span>{dateRange.to}</span></>}
            <span style={{color:B.textMuted,fontSize:"0.75rem"}}>{calOpen?"▲":"▼"}</span>
          </button>
          {calOpen&&<CalendarPicker value={dateRange||{from:"",to:""}} onChange={r=>{setDateRange(r);}} onClose={()=>setCalOpen(false)}/>}
        </div>
        {/* Quick presets */}
        <div style={{display:"flex",background:"#0d0d0d",borderRadius:10,padding:"0.18rem",border:`1px solid ${B.border2}`}}>
          <button onClick={()=>{setDateRange(null);setCalOpen(false);}} style={{padding:"0.32rem 0.85rem",borderRadius:8,border:"none",cursor:"pointer",background:!dateRange?B.grad1:"transparent",color:!dateRange?"#fff":B.textMuted,fontSize:"0.78rem",fontWeight:700,fontFamily:FONT}}>All</button>
          {[["30d",30],["60d",60],["90d",90]].map(([l,d])=>{
            const t=new Date(),f=new Date(t);f.setDate(f.getDate()-d);
            const fmt=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
            const active=dateRange&&dateRange.from===fmt(f);
            return (
              <button key={l} onClick={()=>{setDateRange({from:fmt(f),to:fmt(t)});setCalOpen(false);}} style={{padding:"0.32rem 0.85rem",borderRadius:8,border:"none",cursor:"pointer",background:active?B.grad1:"transparent",color:active?"#fff":B.textMuted,fontSize:"0.78rem",fontWeight:700,fontFamily:FONT}}>{l}</button>
            );
          })}
        </div>
        <span style={{color:B.textMuted,fontSize:"0.78rem",marginLeft:"auto"}}>{filtered.length} of {releases.length} releases{dateRange?" in range":""}</span>
      </div>

      {/* ── Release Summary ── */}
      <SectionLabel>Release Summary</SectionLabel>
      <div style={{display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <KPI label="Total Delivered" value={total} color={B.lime} sub="Released + Rolledback"/>
        <KPI label="Released" value={released} color={B.green} sub="Live"/>
        <KPI label="Rolledback" value={rolledBack} color="#f97316" sub="Cancelled"/>
        <KPI label="Feature / Improvement" value={featImps} color="#22c55e"/>
        <KPI label="Patch" value={patches} color="#a855f7"/>
        <KPI label="Bug" value={bugs} color="#ef4444"/>
      </div>

      {/* ── Lead Time ── */}
      <div style={{marginBottom:"0.75rem",display:"flex",alignItems:"baseline",gap:"0.6rem"}}>
        <span style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700}}>Lead Time</span>
        <span style={{color:B.textMuted,fontSize:"0.75rem",fontWeight:400}}>Handover Date to Actual Release</span>
      </div>
      <div style={{display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <KPI label="Feature/Imp Lead Time" value={avgFeatImpLT==="—"?avgFeatImpLT:avgFeatImpLT+"d"} color={B.cyan} sub="Avg handover→release"/>
        <KPI label="Overall Avg Lead Time" value={avgLT==="—"?avgLT:avgLT+"d"} color={B.teal} sub="All types"/>
        <KPI label="Max Lead Time" value={leadTimesAll.length?Math.max(...leadTimesAll)+"d":"—"} color="#f97316" sub="Slowest"/>
        <KPI label="Min Lead Time" value={leadTimesAll.length?Math.min(...leadTimesAll)+"d":"—"} color={B.lime} sub="Fastest"/>
      </div>

      {/* ── Team Breakdown ── */}
      <SectionLabel>Team Breakdown</SectionLabel>
      <div style={{display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <TeamTile label="Gateway Releases"          relArr={gatewayReleases} color={B.teal} modules={GATEWAY_MODULES}/>
        <TeamTile label="Application Team Releases" relArr={appReleases}     color={B.lime} modules={APP_MODULES}/>
      </div>

      {/* ── Releases at Handover ── */}
      <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:16,padding:"1.5rem",marginBottom:"1.5rem",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.25rem"}}>
          <span style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700}}>Releases at Handover</span>
          <div style={{marginLeft:"auto",display:"flex",gap:"0.75rem"}}>
            {[["New Feature",TYPE_COLORS["New Feature"]],["Improvement",TYPE_COLORS["Improvement"]],["Patch",TYPE_COLORS["Patch"]],["Bug",TYPE_COLORS["Bug"]]].map(([l,c])=><div key={l} style={{display:"flex",alignItems:"center",gap:"0.35rem"}}><div style={{width:9,height:9,borderRadius:2,background:c}}/><span style={{color:B.textMuted,fontSize:"0.72rem"}}>{l}</span></div>)}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:"8px",height:170,paddingBottom:38,overflowX:"auto"}}>
          {handoverGroups.map((g,i)=>{
            const h=g.total?Math.max((g.total/maxHO)*130,6):0;
            return(
              <div key={i} style={{flex:"0 0 auto",minWidth:52,display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",position:"relative"}}
                onMouseEnter={e=>{setHandoverHover(g);setHandoverPos({x:e.clientX,y:e.clientY});}}
                onMouseLeave={()=>setHandoverHover(null)}
                onMouseMove={e=>setHandoverPos({x:e.clientX,y:e.clientY})}>
                <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:130,borderRadius:"6px 6px 0 0",overflow:"hidden"}}>
                  {g.featImp>0&&<div style={{height:`${(g.featImp/maxHO)*130}px`,background:TYPE_COLORS["New Feature"],opacity:0.85}}/>}
                  {g.patch>0&&<div style={{height:`${(g.patch/maxHO)*130}px`,background:TYPE_COLORS["Patch"],opacity:0.85}}/>}
                  {g.bug>0&&<div style={{height:`${(g.bug/maxHO)*130}px`,background:TYPE_COLORS["Bug"],opacity:0.85}}/>}
                  {g.total===0&&<div style={{height:2,background:B.border}}/>}
                </div>
                <div style={{position:"absolute",top:130-h-22,left:"50%",transform:"translateX(-50%)",background:B.bgPanel,border:`1px solid ${B.border2}`,borderRadius:6,padding:"0.12rem 0.35rem",fontSize:"0.68rem",fontWeight:800,color:B.textPrimary,whiteSpace:"nowrap"}}>{g.total}</div>
                <div style={{position:"absolute",bottom:0,fontSize:"0.6rem",color:B.textMuted,textAlign:"center",lineHeight:1.3,whiteSpace:"nowrap"}}>{g.date}</div>
              </div>
            );
          })}
        </div>
        {handoverHover&&(
          <div style={{position:"fixed",left:Math.min(handoverPos.x+14,window.innerWidth-260),top:handoverPos.y-14,zIndex:1000,pointerEvents:"none",background:B.bgCard,border:`1px solid ${B.teal}55`,borderRadius:14,padding:"1rem 1.25rem",minWidth:230,boxShadow:"0 16px 48px rgba(0,0,0,0.5)",fontFamily:FONT}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"14px 14px 0 0",background:B.grad1}}/>
            <div style={{color:B.teal,fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.5rem",marginTop:"0.1rem"}}>Handover: {handoverHover.date}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
              <span style={{color:B.textMuted,fontSize:"0.8rem"}}>Total</span><span style={{color:B.textPrimary,fontWeight:800,fontSize:"1.3rem"}}>{handoverHover.total}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.35rem",borderTop:`1px solid ${B.border}`,paddingTop:"0.6rem"}}>
              {[["New Feature",handoverHover.featImp,TYPE_COLORS["New Feature"]],["Patch",handoverHover.patch,TYPE_COLORS["Patch"]],["Bug",handoverHover.bug,TYPE_COLORS["Bug"]]].map(([l,cnt,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}><div style={{width:8,height:8,borderRadius:2,background:c}}/><span style={{color:B.textSecondary,fontSize:"0.78rem"}}>{l}</span></div>
                  <span style={{color:c,fontWeight:700}}>{cnt}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:"0.75rem",borderTop:`1px solid ${B.border}`,paddingTop:"0.6rem"}}>
              {handoverHover.releases.map(r=>(
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",gap:"0.5rem",marginBottom:"0.25rem"}}>
                  <span style={{color:B.teal,fontSize:"0.7rem",fontWeight:700,flexShrink:0}}>{r.rn}</span>
                  <span style={{color:B.textSecondary,fontSize:"0.7rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Releases Per Week ── */}
      <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:16,padding:"1.5rem",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:"1.25rem"}}>
          <span style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700}}>Releases Per Week</span>
          <span style={{color:B.textMuted,fontSize:"0.75rem",marginLeft:"0.6rem"}}>{filtered.length} releases</span>
        </div>
        {weeklyData.length===0
          ? <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:B.textMuted,fontSize:"0.82rem"}}>No data yet — import your CSV to see the chart</span></div>
          : <WeeklyBar weeks={weeklyData} maxBar={maxWeek}/>
        }
      </div>

      {/* ── Module tiles: side by side ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem",marginBottom:"1.5rem"}}>

        {/* Releases by Module */}
        <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:16,padding:"1.5rem"}}>
          <div style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700,marginBottom:"1rem"}}>Releases by Module</div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
            {MODULES.map(m=>{
              const mRels=filtered.filter(r=>r.modules.includes(m));
              const tot=mRels.length,fi=mRels.filter(r=>r.type==="New Feature"||r.type==="Improvement").length,p=mRels.filter(r=>r.type==="Patch").length,b=mRels.filter(r=>r.type==="Bug").length;
              const isGW=GATEWAY_MODULES.includes(m),mc="#22c55e";
              if(!tot)return null;
              return(
                <div key={m}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.35rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                      <div style={{width:9,height:9,borderRadius:"50%",background:mc,flexShrink:0}}/>
                      <span style={{color:B.textSecondary,fontSize:"0.85rem",fontWeight:700}}>{m}</span>
                      <span style={{color:B.textMuted,fontSize:"0.7rem"}}>{isGW?"Gateway":"App Team"}</span>
                    </div>
                    <span style={{color:B.textPrimary,fontSize:"0.85rem",fontWeight:800}}>{tot}</span>
                  </div>
                  <div style={{height:8,borderRadius:99,background:B.border,overflow:"hidden",display:"flex"}}>
                    <div style={{width:`${(fi/Math.max(tot,1))*100}%`,height:"100%",background:isGW?"linear-gradient(90deg,#22c55e,#0ea5c8)":"linear-gradient(90deg,#22c55e,#84cc16)",transition:"width 0.5s"}}/>
                    <div style={{width:`${(p/Math.max(tot,1))*100}%`,height:"100%",background:TYPE_COLORS["Patch"],transition:"width 0.5s"}}/>
                    <div style={{width:`${(b/Math.max(tot,1))*100}%`,height:"100%",background:"#ef4444",transition:"width 0.5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Time by Module (avg bars) */}
        <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:16,padding:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:"0.6rem",marginBottom:"1rem"}}>
            <span style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700}}>Lead Time by Module</span>
            <span style={{color:B.textMuted,fontSize:"0.72rem"}}>avg handover → release</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
            {(()=>{
              const modLTs=MODULES.map(m=>{
                const lts=filtered.filter(r=>r.modules.includes(m)&&r.releaseActual&&r.dora?.handoverDate)
                  .map(r=>leadTimeDays(r.dora.handoverDate,r.releaseActual)).filter(x=>x!==null&&x>=0);
                return{m,avg:lts.length?(lts.reduce((a,b)=>a+b,0)/lts.length):null,max:lts.length?Math.max(...lts):null,count:lts.length,isGW:GATEWAY_MODULES.includes(m)};
              }).filter(x=>x.count>0);
              if(!modLTs.length)return <div style={{color:B.textMuted,fontSize:"0.82rem",textAlign:"center",padding:"1.5rem 0"}}>No lead time data in range</div>;
              const maxAvg=Math.max(...modLTs.map(x=>x.avg));
              return modLTs.map(({m,avg,max,count,isGW})=>{
                const mc=isGW?B.teal:B.lime;
                const barCol=avg<=7?B.lime:avg<=14?"#f97316":"#ef4444";
                return(
                  <div key={m}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.35rem"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                        <div style={{width:9,height:9,borderRadius:"50%",background:mc,flexShrink:0}}/>
                        <span style={{color:B.textSecondary,fontSize:"0.85rem",fontWeight:700}}>{m}</span>
                        <span style={{color:B.textMuted,fontSize:"0.7rem"}}>{isGW?"Gateway":"App Team"}</span>
                        <span style={{color:B.textMuted,fontSize:"0.66rem"}}>({count})</span>
                      </div>
                      <div style={{display:"flex",alignItems:"baseline",gap:"0.4rem"}}>
                        <span style={{color:barCol,fontSize:"0.88rem",fontWeight:800}}>{avg.toFixed(1)}d</span>
                        {max!==null&&<span style={{color:B.textMuted,fontSize:"0.68rem"}}>max {max}d</span>}
                      </div>
                    </div>
                    <div style={{height:8,borderRadius:99,background:B.border,overflow:"hidden"}}>
                      <div style={{width:`${(avg/Math.max(maxAvg,1))*100}%`,height:"100%",background:barCol,transition:"width 0.5s",borderRadius:99}}/>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div style={{display:"flex",gap:"1rem",marginTop:"1rem",paddingTop:"0.75rem",borderTop:`1px solid ${B.border}`}}>
            {[[B.lime,"≤ 7d"],["#f97316","8–14d"],["#ef4444","> 14d"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:"0.35rem"}}>
                <div style={{width:8,height:8,borderRadius:2,background:c}}/>
                <span style={{color:B.textMuted,fontSize:"0.67rem"}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lead Time per Release (full table) ── */}
      {(()=>{
        const ltRows=filtered
          .map(r=>{const lt=leadTimeDays(r.dora?.handoverDate,r.releaseActual);return{...r,lt};})
          .filter(r=>r.lt!==null&&r.lt>=0)
          .sort((a,b)=>b.lt-a.lt);
        const maxLT=ltRows.length?ltRows[0].lt:1;
        if(!ltRows.length)return null;
        return(
          <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:16,padding:"1.5rem",marginBottom:"1.5rem"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:"0.75rem",marginBottom:"1.1rem"}}>
              <span style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700}}>Lead Time per Release</span>
              <span style={{color:B.textMuted,fontSize:"0.72rem"}}>Handover date → actual release date, sorted slowest first</span>
              <span style={{marginLeft:"auto",background:B.teal+"22",color:B.teal,border:`1px solid ${B.teal}44`,padding:"0.12rem 0.5rem",borderRadius:99,fontSize:"0.68rem",fontWeight:700}}>{ltRows.length} releases</span>
            </div>
            <div style={{overflowX:"auto",borderRadius:12,border:`1px solid ${B.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontFamily:FONT,fontSize:"0.78rem"}}>
                <thead>
                  <tr style={{background:"#0d0d0d"}}>
                    {["RN","Summary","Modules","Priority","Handover Date","Release Date","Lead Time",""].map(h=>(
                      <th key={h} style={{padding:"0.65rem 0.9rem",color:B.textMuted,fontSize:"0.63rem",letterSpacing:"0.08em",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${B.border2}`,whiteSpace:"nowrap",fontFamily:FONT}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ltRows.map((r,i)=>{
                    const barPct=(r.lt/Math.max(maxLT,1))*100;
                    const ltCol=r.lt<=7?B.lime:r.lt<=14?"#f97316":"#ef4444";
                    const isGW=r.modules?.some(m=>GATEWAY_MODULES.includes(m));
                    return(
                      <tr key={r.id} style={{background:i%2===0?B.bgDark:B.bgCard,transition:"background 0.1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background=B.bgRow}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?B.bgDark:B.bgCard}>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`,whiteSpace:"nowrap"}}>
                          {r.rnLink
                            ?<a href={r.rnLink} target="_blank" rel="noreferrer" style={{color:B.teal,fontWeight:700,textDecoration:"none",fontSize:"0.72rem"}}>{r.rn} ↗</a>
                            :<span style={{color:B.teal,fontWeight:700,fontSize:"0.72rem"}}>{r.rn}</span>}
                        </td>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`,color:B.textPrimary,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{r.summary}</td>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`}}>
                          <div style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:isGW?B.teal:B.lime,flexShrink:0}}/>
                            <span style={{color:isGW?B.teal:B.lime,fontSize:"0.69rem",fontWeight:600}}>{r.modules?.join(", ")||"—"}</span>
                          </div>
                        </td>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`}}>
                          <Chip label={r.priority||"—"} color={PRIORITY_COLORS[r.priority]||B.textMuted} small/>
                        </td>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`,color:B.textSecondary,whiteSpace:"nowrap",fontSize:"0.72rem"}}>{r.dora?.handoverDate||"—"}</td>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`,color:B.textSecondary,whiteSpace:"nowrap",fontSize:"0.72rem"}}>{r.releaseActual||"—"}</td>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`,minWidth:140}}>
                          <div style={{display:"flex",alignItems:"center",gap:"0.55rem"}}>
                            <div style={{flex:1,height:6,borderRadius:99,background:B.border,overflow:"hidden"}}>
                              <div style={{width:`${barPct}%`,height:"100%",background:ltCol,borderRadius:99,transition:"width 0.4s"}}/>
                            </div>
                            <span style={{color:ltCol,fontWeight:800,fontSize:"0.78rem",minWidth:32,textAlign:"right"}}>{r.lt}d</span>
                          </div>
                        </td>
                        <td style={{padding:"0.55rem 0.9rem",borderBottom:`1px solid ${B.border}`,whiteSpace:"nowrap"}}>
                          <div style={{display:"flex",gap:"0.4rem"}}>
                            {r.jiraLink&&<a href={r.jiraLink} target="_blank" rel="noreferrer" style={{background:"#1a3a6b",color:"#93c5fd",border:"1px solid #2d5799",borderRadius:6,padding:"0.18rem 0.5rem",fontSize:"0.62rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Jira ↗</a>}
                            {r.rnLink&&<a href={r.rnLink} target="_blank" rel="noreferrer" style={{background:"#0d3320",color:B.lime,border:`1px solid ${B.lime}44`,borderRadius:6,padding:"0.18rem 0.5rem",fontSize:"0.62rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>RN ↗</a>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── This Week's Releases ── */}
      <div style={{background:B.bgCard,border:`1px solid ${B.border}`,borderRadius:16,padding:"1.5rem",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.5rem"}}>
          <span style={{color:B.textPrimary,fontSize:"0.95rem",fontWeight:700}}>This Week's Releases</span>
          <span style={{background:B.teal+"22",color:B.teal,border:`1px solid ${B.teal}44`,padding:"0.12rem 0.5rem",borderRadius:99,fontSize:"0.68rem",fontWeight:700}}>{weekReleases.length}</span>
        </div>
        <div style={{color:B.textMuted,fontSize:"0.7rem",marginBottom:"1rem"}}>{monday.toDateString()} — {sunday.toDateString()}</div>
        {weekReleases.length===0&&<div style={{color:B.textMuted,fontSize:"0.82rem",textAlign:"center",padding:"1.5rem 0"}}>No releases this week</div>}
        <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
          {weekReleases.map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:"0.6rem",background:"#0d0d0d",borderRadius:10,padding:"0.55rem 0.75rem",border:`1px solid ${B.border}`}}>
              {r.rnLink
                ?<a href={r.rnLink} target="_blank" rel="noreferrer" style={{background:B.teal+"22",color:B.teal,border:`1px solid ${B.teal}44`,padding:"0.18rem 0.55rem",borderRadius:99,fontSize:"0.7rem",fontWeight:700,whiteSpace:"nowrap",textDecoration:"none",flexShrink:0}}>{r.rn} ↗</a>
                :<span style={{background:B.teal+"22",color:B.teal,border:`1px solid ${B.teal}44`,padding:"0.18rem 0.55rem",borderRadius:99,fontSize:"0.7rem",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>{r.rn}</span>}
              <span style={{color:B.textPrimary,fontSize:"0.8rem",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.summary}</span>
              <span style={{color:B.textMuted,fontSize:"0.7rem",flexShrink:0,whiteSpace:"nowrap"}}>{fmtDate(r.releaseActual||r.releasePlanned)}</span>
              <Chip label={r.type||"—"} color={TYPE_COLOR(r.type)} small/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyBar({weeks,maxBar}){
  const [hov,setHov]=useState(null);
  const yMax=Math.max(Math.ceil(maxBar/1)*1,2);
  const yTicks=Array.from({length:yMax+1},(_,i)=>yMax-i);
  const CH=160,PB=40,PT=14;
  const DAY=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return(
    <div style={{position:"relative",fontFamily:FONT}}>
      <div style={{display:"flex",gap:0}}>
        {/* Y-axis */}
        <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",height:CH+PT,paddingBottom:PB,paddingTop:PT,marginRight:6,flexShrink:0,minWidth:18}}>
          {yTicks.map(n=><span key={n} style={{color:B.textMuted,fontSize:"0.6rem",textAlign:"right",lineHeight:1}}>{n}</span>)}
        </div>
        {/* Chart area */}
        <div style={{flex:1,position:"relative",overflowX:"auto",overflowY:"visible"}}>
          {/* Grid lines */}
          <div style={{position:"absolute",top:PT,left:0,right:0,height:CH,pointerEvents:"none",zIndex:0}}>
            {yTicks.map((n,i)=>(
              <div key={n} style={{position:"absolute",left:0,right:0,top:`${(i/yMax)*CH}px`,borderTop:`1px solid ${i===yTicks.length-1?B.border2:B.border}`,opacity:i===yTicks.length-1?0.7:0.35}}/>
            ))}
          </div>
          {/* Bars row */}
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:CH+PT+PB,paddingBottom:PB,paddingTop:PT,position:"relative",zIndex:1,minWidth:weeks.length*44,overflow:"visible"}}>
            {weeks.map((w,i)=>{
              const dt=new Date(w.week);
              const dayName=DAY[dt.getDay()];
              const isWeekend=w.isWeekend||(dt.getDay()===0||dt.getDay()===6);
              const barH=w.total?(w.total/yMax)*CH:0;
              const feH=(w.featImp/yMax)*CH;
              const impH=(w.improvement/yMax)*CH;
              const paH=(w.patch/yMax)*CH;
              const buH=(w.bug/yMax)*CH;
              const barW=Math.max(38,Math.min(64,Math.floor(860/Math.max(weeks.length,1))-4));
              const dateLabel=dt.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
              // Badge sits 18px above the top of the bar, always visible
              const badgeBottom=PB+barH+2;
              return(
                <div key={i}
                  style={{flex:`0 0 ${barW}px`,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",height:"100%",justifyContent:"flex-end",overflow:"visible"}}
                  onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
                  {/* Tooltip — anchored to top of chart area, not bar */}
                  {hov===i&&w.total>0&&(
                    <div style={{position:"absolute",bottom:PB+CH+10,left:"50%",transform:"translateX(-50%)",background:"#0d1f2d",border:`1px solid ${B.teal}55`,borderRadius:10,padding:"0.6rem 0.85rem",zIndex:30,pointerEvents:"none",minWidth:180,boxShadow:"0 12px 40px rgba(0,0,0,0.6)",whiteSpace:"nowrap"}}>
                      <div style={{color:B.teal,fontSize:"0.68rem",fontWeight:700,marginBottom:"0.3rem"}}>{dayName} {dateLabel}</div>
                      {[["Feature","#22c55e",w.featImp],["Improvement","#1d6fa4",w.improvement],["Patch","#a855f7",w.patch],["Bug","#ef4444",w.bug]].filter(([,,n])=>n>0).map(([l,col,n])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",gap:"1rem",marginBottom:"0.15rem"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"0.35rem"}}><div style={{width:7,height:7,borderRadius:2,background:col}}/><span style={{color:B.textSecondary,fontSize:"0.72rem"}}>{l}</span></div>
                          <span style={{color:col,fontWeight:700,fontSize:"0.72rem"}}>{n}</span>
                        </div>
                      ))}
                      <div style={{borderTop:`1px solid ${B.border}`,marginTop:"0.4rem",paddingTop:"0.35rem"}}>
                        {w.releases.slice(0,4).map(r=>(
                          <div key={r.id} style={{display:"flex",gap:"0.4rem",marginBottom:"0.12rem"}}>
                            <span style={{color:B.teal,fontSize:"0.63rem",fontWeight:700,flexShrink:0}}>{r.rn}</span>
                            <span style={{color:B.textMuted,fontSize:"0.63rem",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.summary}</span>
                          </div>
                        ))}
                        {w.releases.length>4&&<div style={{color:B.textMuted,fontSize:"0.6rem",marginTop:"0.1rem"}}>+{w.releases.length-4} more</div>}
                      </div>
                    </div>
                  )}
                  {/* Count badge — always above the bar, overflow:visible so never clipped */}
                  {w.total>0&&(
                    <div style={{
                      position:"absolute",
                      bottom:badgeBottom,
                      left:"50%",transform:"translateX(-50%)",
                      fontSize:"0.63rem",fontWeight:800,
                      color:B.textPrimary,
                      background:"#0a1824",
                      border:`1px solid ${B.border2}`,
                      borderRadius:4,padding:"1px 5px",
                      whiteSpace:"nowrap",zIndex:10,
                      lineHeight:"1.4"
                    }}>{w.total}</div>
                  )}
                  {/* Stacked bar */}
                  <div style={{width:"72%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:Math.max(barH,w.total?4:0),borderRadius:"4px 4px 0 0",overflow:"hidden",opacity:hov===i?1:isWeekend?0.65:0.85,transition:"opacity 0.15s",background:w.total===0?"transparent":""}}>
                    {w.bug>0&&<div style={{height:`${buH}px`,background:"#ef4444",flexShrink:0}}/>}
                    {w.patch>0&&<div style={{height:`${paH}px`,background:"#a855f7",flexShrink:0}}/>}
                    {w.improvement>0&&<div style={{height:`${impH}px`,background:"#1d6fa4",flexShrink:0}}/>}
                    {w.featImp>0&&<div style={{height:`${feH}px`,background:"#22c55e",flexShrink:0}}/>}
                  </div>
                  {/* X-axis label */}
                  <div style={{position:"absolute",bottom:0,textAlign:"center",width:barW,lineHeight:1.25}}>
                    <div style={{fontSize:"0.58rem",fontWeight:700,color:isWeekend?B.textMuted+"88":B.textSecondary}}>{dayName}</div>
                    <div style={{fontSize:"0.55rem",color:B.textMuted}}>{dateLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:"1.25rem",marginTop:"0.5rem",paddingLeft:28}}>
        {[["feature","#22c55e"],["improvement","#1d6fa4"],["patch","#a855f7"],["bug","#ef4444"]].map(([l,col])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
            <div style={{width:12,height:3,background:col,borderRadius:2}}/>
            <span style={{color:B.textMuted,fontSize:"0.65rem"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyBar({days,maxBar}){
  const [hov,setHov]=useState(null);
  return(<div style={{position:"relative"}}>
    <div style={{display:"flex",alignItems:"flex-end",gap:"3px",height:160,paddingBottom:28,overflowX:"auto"}}>
      {days.map((d,i)=>(
        <div key={i} style={{flex:"0 0 auto",width:22,display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",position:"relative"}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          {hov===i&&d.total>0&&(<div style={{position:"absolute",bottom:"100%",left:"50%",transform:"translateX(-50%)",background:B.bgPanel,border:`1px solid ${B.border2}`,borderRadius:8,padding:"0.4rem 0.6rem",zIndex:10,pointerEvents:"none",minWidth:100,marginBottom:4}}>
            <div style={{color:B.textPrimary,fontSize:"0.7rem",fontWeight:700,marginBottom:"0.2rem"}}>{d.date}</div>
            {[["Feat/Imp","#22c55e",d.featImp],["Patch","#f97316",d.patch],["Bug","#ef4444",d.bug]].filter(([,,c])=>c>0).map(([l,c,cnt])=><div key={l} style={{display:"flex",justifyContent:"space-between",gap:"0.5rem"}}><span style={{color:B.textMuted,fontSize:"0.68rem"}}>{l}</span><span style={{color:c,fontSize:"0.68rem",fontWeight:700}}>{cnt}</span></div>)}
          </div>)}
          <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:130,borderRadius:"4px 4px 0 0",overflow:"hidden"}}>
            {d.featImp>0&&<div style={{height:`${(d.featImp/maxBar)*130}px`,background:"#22c55e",opacity:hov===i?1:0.8}}/>}
            {d.patch>0&&<div style={{height:`${(d.patch/maxBar)*130}px`,background:"#f97316",opacity:hov===i?1:0.8}}/>}
            {d.bug>0&&<div style={{height:`${(d.bug/maxBar)*130}px`,background:"#ef4444",opacity:hov===i?1:0.8}}/>}
            {d.total===0&&<div style={{height:2,background:B.border}}/>}
          </div>
          {d.label&&<div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",color:B.textMuted,fontSize:"7px",whiteSpace:"pre",textAlign:"center",lineHeight:1.3}}>{d.label}</div>}
        </div>
      ))}
    </div>
  </div>);
}

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────
const STORAGE_KEY = "datman_releases_v3"; // bumped version clears old data
const SEED_DATA = [{"id":1700000001088,"rn":"RN-GAT-067","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3443359745/12-03-2026+-+Workflows-State+machine+-+Adyen+3DS+Report+Breakdown","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3443359745/12-03-2026+-+Workflows-State+machine+-+Adyen+3DS+Report+Breakdown"],"jiraLink":"","jiraLinks":[],"summary":"Adyen 3DS Report Breakdown","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-03-12","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001071,"rn":"RN-GAT-066","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3438837762/11-03-2026+-+Adyen+Amount+Adjustment+API+to+Synchronous+Flow+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3438837762/11-03-2026+-+Adyen+Amount+Adjustment+API+to+Synchronous+Flow+Release+Note"],"jiraLink":"","jiraLinks":[],"summary":"Adyen Amount Adjustment API to Synchronous Flow","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-03-11","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001020,"rn":"RN-GAT-063","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/2855600129/dd-02-26+Adyen+Gift+Card+Payment+Handling+-+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/2855600129/dd-02-26+Adyen+Gift+Card+Payment+Handling+-+Release+Note"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/12490/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/12490/tab/release-report-all-issues"],"summary":"Adyen Gift Cards","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-10","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen Gift Cards","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001037,"rn":"RN-GAT-064","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3432316942/10-03-2026+-+CVV+Field+UI+changes+should+reflect+on+Saved+Card","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3432316942/10-03-2026+-+CVV+Field+UI+changes+should+reflect+on+Saved+Card"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15633/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15633/tab/release-report-all-issues"],"summary":"CVV Field UI changes should reflect on Saved Card","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-03-10","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Rejected","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Card Payment Form Improvements","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000952,"rn":"RN-GAT-059","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3429007361/05-03-2026+-+White-label+apay+dynamic+domain+name+fixes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3429007361/05-03-2026+-+White-label+apay+dynamic+domain+name+fixes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15565/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15565/tab/release-report-all-issues"],"summary":"White label Apay dynamic domain name","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-03-09","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Datman white label","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000935,"rn":"RN-GAT-058","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3421241345/05-03-2026+-+Datman+SDK+BE+Changes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3421241345/05-03-2026+-+Datman+SDK+BE+Changes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15564/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15564/tab/release-report-all-issues"],"summary":"Datman SDK IOS ( BE & FE )","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-03-04","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"SDK changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000884,"rn":"RN-GAT-055","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3423633409/dd-mm-2026+-+Delayed+Manual+Capture+for+Adyen+Pre-Auth+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3423633409/dd-mm-2026+-+Delayed+Manual+Capture+for+Adyen+Pre-Auth+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15561/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15561/tab/release-report-all-issues"],"summary":"Capture Delay","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-03","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Pre Auth Support","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000901,"rn":"RN-GAT-056","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3425861659/DD-03-2026+-+Workflows-State+machine+-+Spreedly+Reconciliation+Refund+Fix+-+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3425861659/DD-03-2026+-+Workflows-State+machine+-+Spreedly+Reconciliation+Refund+Fix+-+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15562/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15562/tab/release-report-all-issues"],"summary":"Spreedly Reconciliation Refund Fix","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-03-03","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Spreedly Changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000918,"rn":"RN-GAT-057","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3426385960/03-03-2026+-+White-label+redirection+fixes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3426385960/03-03-2026+-+White-label+redirection+fixes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15563/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15563/tab/release-report-all-issues"],"summary":"Datman White Labelling patch for redirection","type":"Bug","priority":"P0","status":"Released","releasePlanned":"","releaseActual":"2026-03-03","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Datman White Labelling","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000850,"rn":"RN-GAT-053","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3414097942/25-02-2026+-+EPOS+CoP+blank+screen+on+Android+8+9","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3414097942/25-02-2026+-+EPOS+CoP+blank+screen+on+Android+8+9"],"jiraLink":"","jiraLinks":[],"summary":"Android 8 , 9 POS issue","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-25","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Foodhub Issue","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000782,"rn":"RN-GAT-049","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3404138172/DD-02-2026+-+Workflows-State+machine+-+Spreedly+Reconciliation+-+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3404138172/DD-02-2026+-+Workflows-State+machine+-+Spreedly+Reconciliation+-+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15483/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15483/tab/release-report-all-issues"],"summary":"Spreedly Reconciliation","type":"New Feature","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-19","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Reconciliation","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000765,"rn":"RN-GAT-048","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3396173825/dd-02-2026+-+Checkout+Token+Pay+GPay+Apple+Pay+Failure+Event+Payload+Communication+Standardization","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3396173825/dd-02-2026+-+Checkout+Token+Pay+GPay+Apple+Pay+Failure+Event+Payload+Communication+Standardization"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15557/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15557/tab/release-report-all-issues"],"summary":"Implement PaymentDecline Redirect Flow for Token Pay Checkout Provider & Checkout token pay - failure communication for Gpay/Apay token pay API","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-18","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Checkout Tokenpay","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000731,"rn":"RN-GAT-046","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3400859649/dd-02-2026+-+Change+cardFormUI+fields","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3400859649/dd-02-2026+-+Change+cardFormUI+fields"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15381/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15381/tab/release-report-all-issues"],"summary":"Similar to Adyen Cardform UI","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-17","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":true,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Approved","Ruhan":"N/A","Anand":"N/A"},"goal":"Card Payment Form Improvements","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000748,"rn":"RN-GAT-047","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3404464129/17-02-2026+-+Replace+direct+SSM+calls+with+SSM+V2+cached+implementation+in+Gateway+Microservices","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3404464129/17-02-2026+-+Replace+direct+SSM+calls+with+SSM+V2+cached+implementation+in+Gateway+Microservices"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15347/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15347/tab/release-report-all-issues"],"summary":"Replace direct SSM with SSM V2 in MS","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-17","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":true,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Approved","Ruhan":"N/A","Anand":"N/A"},"goal":"Reduce AWS biliing","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000663,"rn":"RN-GAT-042","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3388243970/dd-02-2026+-+Apple+Pay+SDK+Version+Upgrade+Platform+Integrator+Upgrade+for+Session+Validation","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3388243970/dd-02-2026+-+Apple+Pay+SDK+Version+Upgrade+Platform+Integrator+Upgrade+for+Session+Validation"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14791/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14791/tab/release-report-all-issues"],"summary":"Apple Pay SDK Version Upgrade & Platform Integrator Upgrade for Session Validation","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-12","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Platform Integrator Upgrade","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000612,"rn":"RN-GAT-039","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3391324176/10-02-2026+-+Cashflow+MOTO+Sale+Changes+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3391324176/10-02-2026+-+Cashflow+MOTO+Sale+Changes+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15274/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15274/tab/release-report-all-issues"],"summary":"Cashflow MOTO Sale Changes","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-10","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":true,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Approved","Ruhan":"N/A","Anand":"N/A"},"goal":"Cashflow","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000544,"rn":"RN-GAT-035","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3385622529/09-02-2026+-+Improve+transmission+of+payment+details+to+API+M3","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3385622529/09-02-2026+-+Improve+transmission+of+payment+details+to+API+M3"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15206/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15206/tab/release-report-all-issues"],"summary":"FE card Encryption ticket ( M3 - Add card flow)","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-09","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"FE card Encryption","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000561,"rn":"RN-GAT-036","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3390242830/DD-02-2026+Adyen+Balance+Transfer+Extra+DB+Connection","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3390242830/DD-02-2026+Adyen+Balance+Transfer+Extra+DB+Connection"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15239/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15239/tab/release-report-all-issues"],"summary":"Adyen Balance Transfer Extra DB Connection","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-09","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":true,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Approved","Ruhan":"N/A","Anand":"N/A"},"goal":"Database changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000527,"rn":"RN-GAT-034","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3362816002/04-02-2026+-+Adyen+US+Transaction+Cost+Backend+Release+Notes & https://datman.atlassian.net/wiki/spaces/DN/pages/3382902818/06-02-2026+-+ISO+Revenue+Calculation+Generate+PDF+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3362816002/04-02-2026+-+Adyen+US+Transaction+Cost+Backend+Release+Notes & https://datman.atlassian.net/wiki/spaces/DN/pages/3382902818/06-02-2026+-+ISO+Revenue+Calculation+Generate+PDF+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/13644/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/13644/tab/release-report-all-issues"],"summary":"US Adyen transaction cost","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-06","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"ISO Revenue Report","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000476,"rn":"RN-GAT-031","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3365666818/03-02-2026+-+Dynamic+Split+Commission+System","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3365666818/03-02-2026+-+Dynamic+Split+Commission+System"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15170/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15170/tab/release-report-all-issues"],"summary":"Dynamic Split commission","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-03","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Dynamic Split commission","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000442,"rn":"RN-GAT-029","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3358785537/02-02-2026+-+Adyen+Pre+Auth+changes+Support+Split+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3358785537/02-02-2026+-+Adyen+Pre+Auth+changes+Support+Split+Release+Note"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14349/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14349/tab/release-report-all-issues"],"summary":"Adyen Pre-Auth changes & Support Split","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-02","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"N/A","Muz":"N/A","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Pre Auth Support","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000459,"rn":"RN-GAT-030","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3038380662/02-02-2026+second_name+discrepancy+on+refund+entries+in+card_payment+table+Wallet+payment+-+Getting+outcome+success","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3038380662/02-02-2026+second_name+discrepancy+on+refund+entries+in+card_payment+table+Wallet+payment+-+Getting+outcome+success"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15171/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15171/tab/release-report-all-issues"],"summary":"( Prod bugs )  Second name discrepancy on refund & Wallet payment getting success out come","type":"Bug","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-02","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":true,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Approved","Ruhan":"N/A","Anand":"N/A"},"goal":"Prod Bugs","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000425,"rn":"RN-GAT-028","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3367763969/30-01-26+Query+adyen_fund_transfer_transactions+table+only+in+case+of+fund+transfers+-+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3367763969/30-01-26+Query+adyen_fund_transfer_transactions+table+only+in+case+of+fund+transfers+-+Release+Note"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15102/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15102/tab/release-report-all-issues"],"summary":"Query Adyen Fund Transfer","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-30","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"N/A","Pradeep":"N/A","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000391,"rn":"RN-GAT-026","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3354591233/DD-01-26+Make+transaction+lookup+dynamic+so+that+according+to+domain+it+should+pic+keys","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3354591233/DD-01-26+Make+transaction+lookup+dynamic+so+that+according+to+domain+it+should+pic+keys"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15036/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15036/tab/release-report-all-issues"],"summary":"Dynamic Webhook HMAC Based on Customer Type & Make transaction lookup dynamic to pick the keys","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-29","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"HMAC","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000408,"rn":"RN-GAT-027","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3363012609/29-01-26+Workflows-State+machine+-+Check+Pending+FT+query+for+test+and+remove+test+transactions+from+payment+reconciliation+SM+Query.","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3363012609/29-01-26+Workflows-State+machine+-+Check+Pending+FT+query+for+test+and+remove+test+transactions+from+payment+reconciliation+SM+Query."],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15069/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15069/tab/release-report-all-issues"],"summary":"Remove FT test transactions from payment reconciliation","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-29","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"N/A","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Fund Transfer","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000323,"rn":"RN-GAT-022","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3349708811/DD-01-2026+-+ISO+Revenue+Calculation-+CHECKOUT-HF+Cost+US+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3349708811/DD-01-2026+-+ISO+Revenue+Calculation-+CHECKOUT-HF+Cost+US+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14970/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14970/tab/release-report-all-issues"],"summary":"ISO Revenue calculation","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-27","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"ISO Revenue calculation","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000340,"rn":"RN-GAT-023","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3355279361/dd-mm-2026+-+Adyen+Express+Pay+CVV+length+Check","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3355279361/dd-mm-2026+-+Adyen+Express+Pay+CVV+length+Check"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15003/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15003/tab/release-report-all-issues"],"summary":"Adyen Express Pay CVV length Check","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-27","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000357,"rn":"RN-GAT-024","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3355279361/dd-mm-2026+-+Adyen+Express+Pay+CVV+length+Check","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3355279361/dd-mm-2026+-+Adyen+Express+Pay+CVV+length+Check"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15003/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15003/tab/release-report-all-issues"],"summary":"Adyen FT ( failed errors  )","type":"New Feature","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-27","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000306,"rn":"RN-GAT-021","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3334602753/22-01-2026+-+Trigger+Ops+Gienie+alert+when+payment+goes+to+incorrect+splits+liable+account","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3334602753/22-01-2026+-+Trigger+Ops+Gienie+alert+when+payment+goes+to+incorrect+splits+liable+account"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14936/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14936/tab/release-report-all-issues"],"summary":"Trigger ops genie alert for incorrect splits/payments","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-22","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Alerts","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000272,"rn":"RN-GAT-017","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3337846810/DD-01-26+MIT+t2s+notification+from+Webhook+Compatability+with+HMAC+-+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3337846810/DD-01-26+MIT+t2s+notification+from+Webhook+Compatability+with+HMAC+-+Release+Note"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14901/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14901/tab/release-report-all-issues"],"summary":"MIT patch for HMAC","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-21","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"MIT Changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000289,"rn":"RN-GAT-018","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3152510977/04-12-2025+-+Datman+white+labeling+MVP","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3152510977/04-12-2025+-+Datman+white+labeling+MVP"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/13680/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/13680/tab/release-report-all-issues"],"summary":"Datman White Labelling changes release","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-21","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Datman White Labelling","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000238,"rn":"RN-GAT-015","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3334307841/20-01-2026+-+Display+Lock+Icon+on+Pay+Button+for+Card+Form","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3334307841/20-01-2026+-+Display+Lock+Icon+on+Pay+Button+for+Card+Form"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14859/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14859/tab/release-report-all-issues"],"summary":"Lock Button changes","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-20","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Payment Form changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000204,"rn":"RN-GAT-013","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3180920833/dd-11-2025+Raw+payload+and+Hmac+signature+is+not+sent+for+some+FastFood+saved+card+transactions+Fix+Backend+Release","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3180920833/dd-11-2025+Raw+payload+and+Hmac+signature+is+not+sent+for+some+FastFood+saved+card+transactions+Fix+Backend+Release"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14689/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14689/tab/release-report-all-issues"],"summary":"Raw payload & HMAC signature changes for saved card","type":"Bug","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-19","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"HMAC","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000221,"rn":"RN-GAT-014","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3316023297/DD-01-26+Add+Indicator+in+T2S+Payload+to+Identify+MOTO-Based+MIT+Tokens+-+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3316023297/DD-01-26+Add+Indicator+in+T2S+Payload+to+Identify+MOTO-Based+MIT+Tokens+-+Release+Note"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14691/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14691/tab/release-report-all-issues"],"summary":"Add Indicator in T2S Payload to Identify MOTO-Based MIT Tokens","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-19","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"MIT Changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000187,"rn":"RN-GAT-012","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3323166721/15-01-2026+Fixed+Incorrect+Dollar+Sign+Display+in+Refund+Email","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3323166721/15-01-2026+Fixed+Incorrect+Dollar+Sign+Display+in+Refund+Email"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14825/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14825/tab/release-report-all-issues"],"summary":"Refund Email ( Dollar symbol fix )","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-15","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Refunds","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000170,"rn":"RN-GAT-011","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3319037961/DD-01-26+Transaction+method+id+for+MIT+O2M+sales+updated+to+31+-+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3319037961/DD-01-26+Transaction+method+id+for+MIT+O2M+sales+updated+to+31+-+Release+Note"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14792/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14792/tab/release-report-all-issues"],"summary":"Txn method 30 instead of 31 for actual MIT sale","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-14","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"MIT Changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000085,"rn":"RN-GAT-006","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3305472121/DD-01-2026+-+Adyen+merge+ecom+and+terminal+account","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3305472121/DD-01-2026+-+Adyen+merge+ecom+and+terminal+account"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14555/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14555/tab/release-report-all-issues"],"summary":"Merge Ecomm + Terminal","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000102,"rn":"RN-GAT-007","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3305472001/DD-01-2026+-+Pass+RTAU+change+in+webhook","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3305472001/DD-01-2026+-+Pass+RTAU+change+in+webhook"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14555/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14555/tab/release-report-all-issues"],"summary":"RTAU changes for FH Adyen","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000119,"rn":"RN-GAT-008","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3303604225/DD-01-2026+-+Optimise+query+for+Gateway+Reader+and+Gateway+Writer","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3303604225/DD-01-2026+-+Optimise+query+for+Gateway+Reader+and+Gateway+Writer"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14621/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14621/tab/release-report-all-issues"],"summary":"Slow Queries","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Optimise DB Query","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000136,"rn":"RN-GAT-009","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3308257281/DD-01-2026+-+Split+Fee+Refund+Support+-+Backend+Release","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3308257281/DD-01-2026+-+Split+Fee+Refund+Support+-+Backend+Release"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14588/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14588/tab/release-report-all-issues"],"summary":"Split refund at merchant level","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"N/A","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Splits","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000068,"rn":"RN-GAT-005","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3303047177/dd-mm-2026+-+Cashflow+Improvement+for+Express+Pay+threeDSRequired+N+scaExemption+risk+-+Backend+Release","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3303047177/dd-mm-2026+-+Cashflow+Improvement+for+Express+Pay+threeDSRequired+N+scaExemption+risk+-+Backend+Release"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14486/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14486/tab/release-report-all-issues"],"summary":"Cashflow Improvement for Express Pay","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-08","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Cashflow","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000034,"rn":"RN-GAT-003","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3285647443/07-01-26+MIT+Revised+-+Release+Note","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3285647443/07-01-26+MIT+Revised+-+Release+Note"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14348/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14348/tab/release-report-all-issues"],"summary":"MIT Revised","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-07","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":true,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"N/A","Pradeep":"Approved","Muz":"N/A","Sundar":"Approved","Ruhan":"N/A","Anand":"N/A"},"goal":"MIT Changes","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000051,"rn":"RN-GAT-004","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3286566308/07-01-2026+-+Upgrade+React+and+Node+for+New+UI","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3286566308/07-01-2026+-+Upgrade+React+and+Node+for+New+UI"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14385/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14385/tab/release-report-all-issues"],"summary":"React Node upgrade for New UI","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-07","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"React Node Upgrade","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000017,"rn":"RN-GAT-002","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3294724097/06-01-2026+-+Android+8+Blank+Screen+Issue+For+Moto+Sales?atlOrigin=eyJpIjoiN2QzY2JjZDNkYzU4NDhkZDhjMDJhZmM5N2MzZDM3YzMiLCJwIjoiYyJ9","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3294724097/06-01-2026+-+Android+8+Blank+Screen+Issue+For+Moto+Sales?atlOrigin=eyJpIjoiN2QzY2JjZDNkYzU4NDhkZDhjMDJhZmM5N2MzZDM3YzMiLCJwIjoiYyJ9"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14385/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14385/tab/release-report-all-issues"],"summary":"React Node upgrade for Old UI & Android EPOS Moto payment fix","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-05","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"N/A","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Foodhub Issue","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000000,"rn":"RN-GAT-001","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3283648513/01-01-26+Optimize+Refund+Validate+query","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3283648513/01-01-26+Optimize+Refund+Validate+query"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14347/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14347/tab/release-report-all-issues"],"summary":"Optimize refund validate query","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-01","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Optimise DB Query","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001054,"rn":"RN-GAT-065","rnLink":"https://datman.atlassian.net/wiki/x/AQAfzQ","rnLinks":["https://datman.atlassian.net/wiki/x/AQAfzQ"],"jiraLink":"","jiraLinks":[],"summary":"Removed the US email wait-time logic from the non-UK payout","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-11","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Non UK payouts","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000969,"rn":"RN-GAT-060","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3436150785/09-03-2026+-+Workflows-State+machine+-+Weekly+rental+for+AUD+NZD+-+through+Adyen+sweeps","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3436150785/09-03-2026+-+Workflows-State+machine+-+Weekly+rental+for+AUD+NZD+-+through+Adyen+sweeps"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15566/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15566/tab/release-report-all-issues"],"summary":"Weekly rental for AUD & NZD - through Adyen sweeps","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-03-09","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen Sweeps","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001003,"rn":"RN-GAT-062","rnLink":"https://datman.atlassian.net/wiki/x/AQDUz","rnLinks":["https://datman.atlassian.net/wiki/x/AQDUz"],"jiraLink":"","jiraLinks":[],"summary":"SMS decommissioning for USA","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-09","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Stop SMS","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000867,"rn":"RN-GAT-054","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3417440272/02-03-2026+-+Workflows-State+machine+-+Adyen+Payout+Breakdown+Non-UK+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3417440272/02-03-2026+-+Workflows-State+machine+-+Adyen+Payout+Breakdown+Non-UK+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15560/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15560/tab/release-report-all-issues"],"summary":"Non UK PayoutBreakdown","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-02","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Payouts Breakdown","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000833,"rn":"RN-GAT-052","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3399745538/23-02-2026+-+Improvement+ISO+Revenue+Calculation+Generate+PDF+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3399745538/23-02-2026+-+Improvement+ISO+Revenue+Calculation+Generate+PDF+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15559/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15559/tab/release-report-all-issues"],"summary":"Generate PDF - ISO Revenue Calculation","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-24","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"ISO Revenue calculation","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000799,"rn":"RN-GAT-050","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3406233603/20-02-2026+-+Identify+the+MIDs+with+discrepancies+in+autowithdraw+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3406233603/20-02-2026+-+Identify+the+MIDs+with+discrepancies+in+autowithdraw+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15558/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15558/tab/release-report-all-issues"],"summary":"Auto withdrawal discrepancy for transaction method ID ( 31 )","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-20","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Auto Withdrawal Improvements","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000816,"rn":"RN-GAT-051","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3408429091/20-02-2026+-+Workflows-State+machine+Event+Router+-+USA+-+Send+email+comms+on+Tipalti+state+machine+-+From+23rd+Feb","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3408429091/20-02-2026+-+Workflows-State+machine+Event+Router+-+USA+-+Send+email+comms+on+Tipalti+state+machine+-+From+23rd+Feb"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15484/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15484/tab/release-report-all-issues"],"summary":"Send email comms to Tipalti SM","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-20","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Stop SMS","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000714,"rn":"RN-GAT-045","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3404136470/17-02-2026+-+Workflows-State+machine+-+Improvement+-+Inform+clients+that+we+will+stop+sending+SMSs+starting+March+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3404136470/17-02-2026+-+Workflows-State+machine+-+Improvement+-+Inform+clients+that+we+will+stop+sending+SMSs+starting+March+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15344/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15344/tab/release-report-all-issues"],"summary":"Inform clients that we will stop sending SMSs starting March","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-17","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Stop SMS","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000697,"rn":"RN-GAT-044","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3399615916/16-02-2026+-+Internal+fund+transfer+API+-+Authentication+key+fix+based+on+Reseller","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3399615916/16-02-2026+-+Internal+fund+transfer+API+-+Authentication+key+fix+based+on+Reseller"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15346/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15346/tab/release-report-all-issues"],"summary":"IFT API - Authentication key fix based on Reseller","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-16","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Edining FT","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000680,"rn":"RN-GAT-043","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3399614465/12-02-2026+-+Prod+Fund+transfer+reattmept+failing+while+pushing+to+SQS","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3399614465/12-02-2026+-+Prod+Fund+transfer+reattmept+failing+while+pushing+to+SQS"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15345/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15345/tab/release-report-all-issues"],"summary":"Fund Transfer reattempt failing while pushing to SQS","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-12","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Resolve FT issues for wallet","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000646,"rn":"RN-GAT-041","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3374022657/DD-02-2026+-+Adyen+FT+Populate+Wallet+Refund+payments+entry+only+after+FT+success","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3374022657/DD-02-2026+-+Adyen+FT+Populate+Wallet+Refund+payments+entry+only+after+FT+success"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/13846/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/13846/tab/release-report-all-issues"],"summary":"Populate Wallet refund after FT success","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-11","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Resolve FT issues for wallet","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000578,"rn":"RN-GAT-037","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3389980673/dd-02-2026+-+Need+to+populate+the+payment+entry+for+the+old+raised+chargeback+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3389980673/dd-02-2026+-+Need+to+populate+the+payment+entry+for+the+old+raised+chargeback+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15240/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15240/tab/release-report-all-issues"],"summary":"Chargeback addition in DB for old chargebacks","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-10","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Chargebacks","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000595,"rn":"RN-GAT-038","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3391324161/10-02-2026+-+Workflows-State+machine+-+Inform+clients+that+we+will+stop+sending+SMSs+starting+in+March+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3391324161/10-02-2026+-+Workflows-State+machine+-+Inform+clients+that+we+will+stop+sending+SMSs+starting+in+March+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15273/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15273/tab/release-report-all-issues"],"summary":"Payout task for SMS - email subject change","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-10","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Stop SMS comms","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000629,"rn":"RN-GAT-040","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3393191937/10-02-2026+-+Internal+fund+transfer+for+Edining+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3393191937/10-02-2026+-+Internal+fund+transfer+for+Edining+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15275/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15275/tab/release-report-all-issues"],"summary":"Edining Fund Transfer","type":"New Feature","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-10","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Edining FT","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000510,"rn":"RN-GAT-033","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3373137922/03-02-2026+-+IE+Payout+Comms+Automate+IE+Payout+Sweep+Control+Missing+country+Improvement+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3373137922/03-02-2026+-+IE+Payout+Comms+Automate+IE+Payout+Sweep+Control+Missing+country+Improvement+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15173/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15173/tab/release-report-all-issues"],"summary":"Adyen chargeback changes","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-04","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Adyen","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000493,"rn":"RN-GAT-032","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3373137922/03-02-2026+-+IE+Payout+Comms+Automate+IE+Payout+Sweep+Control+Missing+country+Improvement+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3373137922/03-02-2026+-+IE+Payout+Comms+Automate+IE+Payout+Sweep+Control+Missing+country+Improvement+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15172/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15172/tab/release-report-all-issues"],"summary":"IE Payout Comms & Sweep changes","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-03","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Approved","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Payouts","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000374,"rn":"RN-GAT-025","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3328278547/20-01-2026+-+Payout+Changes+New+Internal+Fund+Transfer+-+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3328278547/20-01-2026+-+Payout+Changes+New+Internal+Fund+Transfer+-+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14900/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14900/tab/release-report-all-issues"],"summary":"IFT payout changes ( UK & Non UK )","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-29","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Fund Transfer","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000153,"rn":"RN-GAT-010","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3305832473/DD-01-2026+-+Post+Payment+Split+Payout+to+Delivery+Partners+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3305832473/DD-01-2026+-+Post+Payment+Split+Payout+to+Delivery+Partners+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14724/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14724/tab/release-report-all-issues"],"summary":"Internal Fund transfer API","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-13","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":true,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"N/A","Muz":"Approved","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"Fund Transfer","modules":["Payouts"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001547,"rn":"RN-GAT-019","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3340468225/21-01-2026+CP+BE+-+Optimize+queries+for+the+Get+pending+merchants+account+verification+list+and+bank+verification+list+APIs","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3340468225/21-01-2026+CP+BE+-+Optimize+queries+for+the+Get+pending+merchants+account+verification+list+and+bank+verification+list+APIs"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14898/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14898/tab/release-report-all-issues"],"summary":"Slow Queries","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-21","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Query Performance","modules":["General"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001564,"rn":"RN-GAT-020","rnLink":"No RN","rnLinks":["No RN"],"jiraLink":"","jiraLinks":[],"summary":"DORA ( CP )","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-21","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"","modules":["General"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000255,"rn":"RN-GAT-016","rnLink":"No RN/change request","rnLinks":["No RN/change request"],"jiraLink":"Not needed","jiraLinks":["Not needed"],"summary":"DORA ( Gateway )","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-20","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"Yet to Review","Sundar":"N/A","Ruhan":"N/A","Anand":"N/A"},"goal":"","modules":["General"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000002040,"rn":"RN-APP-054","rnLink":"https://datman.atlassian.net/wiki/x/EAB6z\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3430449189/11-03-26+App+Code+Push+for+mobile+app+version+3.4.0+CP_2+Split+Fees+changes","rnLinks":["https://datman.atlassian.net/wiki/x/EAB6z\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3430449189/11-03-26+App+Code+Push+for+mobile+app+version+3.4.0+CP_2+Split+Fees+changes"],"jiraLink":"","jiraLinks":[],"summary":"New Split type for delivery fee (paid by customer - code push )","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-10","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Dynamic Split commission","modules":["App"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001819,"rn":"RN-APP-041","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3404693583/18-02-26+App+Code+Push+for+mobile+app+version+3.3.0+CP_5+and+app+version+3.2.0+CP_2+Show+Banner+on+App+to+update+to+3.4+version+latest","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3404693583/18-02-26+App+Code+Push+for+mobile+app+version+3.3.0+CP_5+and+app+version+3.2.0+CP_2+Show+Banner+on+App+to+update+to+3.4+version+latest"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15449/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15449/tab/release-report-all-issues"],"summary":"Show Banner on App to update to 3.4 version (latest)","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-18","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Force Update","modules":["App"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001785,"rn":"RN-APP-039","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3396272175/16-02-2026+Web+app+Sign+up+changes\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3399254031/16-02-26+App+Code+Push+for+mobile+app+version+3.4.0+CP_1+Sign+up+flow","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3396272175/16-02-2026+Web+app+Sign+up+changes\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3399254031/16-02-26+App+Code+Push+for+mobile+app+version+3.4.0+CP_1+Sign+up+flow"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15278/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15278/tab/release-report-all-issues"],"summary":"Sign up flow changes (Web app, App code push )","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-17","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"Web portal go live","modules":["App"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001700,"rn":"RN-APP-034","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3170795521/27-12-25+App+V3.4.0+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3170795521/27-12-25+App+V3.4.0+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14969/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14969/tab/release-report-all-issues"],"summary":"App Release V3.4.0 ( Locators, App Bundle Size reduction , Revert christmas changes ) \nPush Notifications for App ( App V3.5.0 )","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-09","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"Web portal go live","modules":["App"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001615,"rn":"RN-APP-029","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3344105487/22-01-26+App+Code+Push+for+mobile+app+version+3.3.0+CP_4","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3344105487/22-01-26+App+Code+Push+for+mobile+app+version+3.3.0+CP_4"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14934/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14934/tab/release-report-all-issues"],"summary":"App V3.3.0 CP_4 ( Adi's improvement ticket )","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-22","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"Code push","modules":["App"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001513,"rn":"RN-APP-025","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3331588097/19-01-26+App+Code+Push+for+mobile+app+version+3.3.0+CP_3","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3331588097/19-01-26+App+Code+Push+for+mobile+app+version+3.3.0+CP_3"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14896/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14896/tab/release-report-all-issues"],"summary":"Bank Name change codepush ( V3.3.0 CP_3 )","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-21","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"Code push","modules":["App"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000002006,"rn":"RN-APP-052","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3436478465/10-03-2026+CP+-+Overview+page+changes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3436478465/10-03-2026+CP+-+Overview+page+changes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15600/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15600/tab/release-report-all-issues"],"summary":"Overview page changes","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-10","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Admin Feature","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000002023,"rn":"RN-APP-053","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3408920598/10-03-2026+CP+Create+Sweep+default+sweep+config+for+partners+-+Payout+Descriptor+for+Partners","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3408920598/10-03-2026+CP+Create+Sweep+default+sweep+config+for+partners+-+Payout+Descriptor+for+Partners"],"jiraLink":"","jiraLinks":[],"summary":"Create Sweep + default sweep config for partners","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-10","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Sweep Changes","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000002057,"rn":"RN-APP-055","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3364552719/29-01-2026+CP+New+Split+type+for+delivery+fee+paid+by+customer","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3364552719/29-01-2026+CP+New+Split+type+for+delivery+fee+paid+by+customer"],"jiraLink":"","jiraLinks":[],"summary":"New Split Type for delivery Fee ( CP - side )","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-10","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"N/A","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Dynamic Split commission","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001989,"rn":"RN-APP-051","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3430383638/09-03-2026+CP+BE+-+Stop+Merchant+Emails+for+Bank+Update+Approval+Rejection","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3430383638/09-03-2026+CP+BE+-+Stop+Merchant+Emails+for+Bank+Update+Approval+Rejection"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15556/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15556/tab/release-report-all-issues"],"summary":"Stop Merchant Emails for Bank Update Approval/Rejection","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-03-09","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Admin Feature","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001955,"rn":"RN-APP-049","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3425861633/05-03-2026+CP+BE+-+Adyen+Bank+Data+Sync+Issues","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3425861633/05-03-2026+CP+BE+-+Adyen+Bank+Data+Sync+Issues"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15554/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15554/tab/release-report-all-issues"],"summary":"Zoho Desk Bank Update Issue","type":"Bug","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-03-05","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Bank Sync Issue","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001972,"rn":"RN-APP-050","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3428679685/05-03-2026+CP+PROD+BUG+Invite+user+api+timeout+issue","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3428679685/05-03-2026+CP+PROD+BUG+Invite+user+api+timeout+issue"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15555/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15555/tab/release-report-all-issues"],"summary":"Invite User API timeout issue","type":"Bug","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-03-05","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"API fix & Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001887,"rn":"RN-APP-045","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3414098015/25-02-2026+CP+Partner+Page+Fix+Post+OTP+Login+and+Third-Party+Go+To+Onboarding+Access+Removal","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3414098015/25-02-2026+CP+Partner+Page+Fix+Post+OTP+Login+and+Third-Party+Go+To+Onboarding+Access+Removal"],"jiraLink":"https://datman.atlassian.net/projects/RIM/versions/15518/tab/release-report-all-issues\nhttps://datman.atlassian.net/projects/DN/versions/15517/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/RIM/versions/15518/tab/release-report-all-issues\nhttps://datman.atlassian.net/projects/DN/versions/15517/tab/release-report-all-issues"],"summary":"Restrict Access to 'Go to Onboarding' & Reseller Dashboard","type":"Bug","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-25","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Reseller Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001921,"rn":"RN-APP-047","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3404464173/18-02-2026+CP+Email+template+changes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3404464173/18-02-2026+CP+Email+template+changes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15520/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15520/tab/release-report-all-issues"],"summary":"Email Template Changes for Merchant Creation, Passwordless Login (Email), Forgot Password, Admin Reset Password, and Invite Members","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-25","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Email Template Update","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001836,"rn":"RN-APP-042","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3403546698/18-02-2026+CP+Prod+Sweep+creation+failing+due+to+duplicate+message+deduplicate+id","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3403546698/18-02-2026+CP+Prod+Sweep+creation+failing+due+to+duplicate+message+deduplicate+id"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15450/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15450/tab/release-report-all-issues"],"summary":"Sweep creation failing due to duplicate message deduplicate id","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-18","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Automatic Sweep Creation","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001768,"rn":"RN-APP-038","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3393191986/16-02-2026+CP+SignUp+Flow+Changes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3393191986/16-02-2026+CP+SignUp+Flow+Changes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15380/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15380/tab/release-report-all-issues"],"summary":"Sign up flow changes ( CP )","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-17","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Web portal go live","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001802,"rn":"RN-APP-040","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3403939929/17-02-2025+CP+Redirect+User+to+login+page+for+reseller+portal","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3403939929/17-02-2025+CP+Redirect+User+to+login+page+for+reseller+portal"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15416/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15416/tab/release-report-all-issues"],"summary":"Redirect User to login page for reseller portal","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-17","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Reseller Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001734,"rn":"RN-APP-036","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3391324194/06-02-2026+CP+Create+sweeps+based+on+verified+transferInstrument+Tos+Signing+countryGonLow+fix","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3391324194/06-02-2026+CP+Create+sweeps+based+on+verified+transferInstrument+Tos+Signing+countryGonLow+fix"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15382/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15382/tab/release-report-all-issues"],"summary":"Sweep for transferinstrument ID & governing law","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-11","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Automatic Sweep Creation","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001751,"rn":"RN-APP-037","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3391389727/11-02-2026+CP+-Merchant+Creation+For+Partners+Admins","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3391389727/11-02-2026+CP+-Merchant+Creation+For+Partners+Admins"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15383/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15383/tab/release-report-all-issues"],"summary":"Create account on partner dashboard","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-11","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Partner Changes","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001683,"rn":"RN-APP-033","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3370614785/02-02-2026+CP+Map+Merchant+to+Reseller","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3370614785/02-02-2026+CP+Map+Merchant+to+Reseller"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15168/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15168/tab/release-report-all-issues"],"summary":"Map Merchant to Reseller","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-02","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Reseller Tagging","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001632,"rn":"RN-APP-030","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3349708801/27-01-2026+CP+Transaction+Fee+0+Not+to+be+shown+in+embedded+page","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3349708801/27-01-2026+CP+Transaction+Fee+0+Not+to+be+shown+in+embedded+page"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14935/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14935/tab/release-report-all-issues"],"summary":"Transaction Fee update ( FH CTO )","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-27","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001649,"rn":"RN-APP-031","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3342368769/22-01-2026+CP+Adyen+Bank+details+Sync+Improvement","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3342368769/22-01-2026+CP+Adyen+Bank+details+Sync+Improvement"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14935/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14935/tab/release-report-all-issues"],"summary":"Adyen Sync Issue ( Bank Details patch )","type":"Patch","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-27","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001581,"rn":"RN-APP-027","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3285647509/21-01-2026+CP+BE+-+Stop+Emails+while+mid+creation+for+drivers+accounts","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3285647509/21-01-2026+CP+BE+-+Stop+Emails+while+mid+creation+for+drivers+accounts"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14899/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14899/tab/release-report-all-issues"],"summary":"Stop all emails to drivers","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-22","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"N/A","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Driver Changes","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001598,"rn":"RN-APP-028","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3342336002/22-01-202+CP+CAP+Limit+Update+Not+Reflecting+on+Datman+Portal","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3342336002/22-01-202+CP+CAP+Limit+Update+Not+Reflecting+on+Datman+Portal"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/12954/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/12954/tab/release-report-all-issues"],"summary":"THA-2016 : CAP Limit changes","type":"Bug","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-22","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001530,"rn":"RN-APP-026","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3322380289/14-01-2026+CP+Adyen+Bank+details+Sync+Improvement","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3322380289/14-01-2026+CP+Adyen+Bank+details+Sync+Improvement"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14897/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14897/tab/release-report-all-issues"],"summary":"Adyen Bank details Sync Improvement","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-21","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Adyen Bank Sync Issue","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001462,"rn":"RN-APP-022","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3334340627/19-01-2026+CP+Invoice+API+fix","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3334340627/19-01-2026+CP+Invoice+API+fix"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14893/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14893/tab/release-report-all-issues"],"summary":"Invoice API fix","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-20","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"API fix & Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001479,"rn":"RN-APP-023","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3335913473/20-01-2026+CP+PROD+Company+search+does+not+fetch+the+details","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3335913473/20-01-2026+CP+PROD+Company+search+does+not+fetch+the+details"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14894/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14894/tab/release-report-all-issues"],"summary":"[PROD] : Company search does not fetch the details","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-20","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001496,"rn":"RN-APP-024","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3334340609/20-01-2026+CP+New+Portal+Redirection+on+the+basis+of+a+specific+flag","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3334340609/20-01-2026+CP+New+Portal+Redirection+on+the+basis+of+a+specific+flag"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14895/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14895/tab/release-report-all-issues"],"summary":"New Portal Redirection for merchants with specific flag","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-20","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Portal Redirection","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001428,"rn":"RN-APP-020","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3328278537/16-01-2026+CP+Document+managment+screen+blank","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3328278537/16-01-2026+CP+Document+managment+screen+blank"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14858/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14858/tab/release-report-all-issues"],"summary":"Document management screen blank","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-19","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Document management","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001411,"rn":"RN-APP-019","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3322773505/15-01-2026+CP+Signup+screen+goes+blank","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3322773505/15-01-2026+CP+Signup+screen+goes+blank"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14488/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14488/tab/release-report-all-issues"],"summary":"Sign up Screen goes Blank","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-15","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Sign up changes","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001309,"rn":"RN-APP-013","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3302227969/12-01-2026+CP+Adyen+Bank+details+Sync","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3302227969/12-01-2026+CP+Adyen+Bank+details+Sync"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14351/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14351/tab/release-report-all-issues"],"summary":"Adyen Sync Issue ( Bank Details )","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-13","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Adyen Bank Sync Issue","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001326,"rn":"RN-APP-014","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3315335169/12-01-2026+CP+Datman+Comission+is+not+getting+seeded+in+respective+tables","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3315335169/12-01-2026+CP+Datman+Comission+is+not+getting+seeded+in+respective+tables"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14725/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14725/tab/release-report-all-issues"],"summary":"Datman commission not getting seeded in right tables","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-13","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"N/A","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001343,"rn":"RN-APP-015","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3317104642/13-01-2026+-+Adyen+Payout+Breakdown+Display+in+Customer+Portal+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3317104642/13-01-2026+-+Adyen+Payout+Breakdown+Display+in+Customer+Portal+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14688/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14688/tab/release-report-all-issues"],"summary":"Adyen Payout Breakdown","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-13","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Adyen Payouts","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001360,"rn":"RN-APP-016","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3301539858/13-01-2026+-+Adyen+Show+Failed+Payouts+in+Merchant+Portal+Backend+Release+Notes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3301539858/13-01-2026+-+Adyen+Show+Failed+Payouts+in+Merchant+Portal+Backend+Release+Notes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14688/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14688/tab/release-report-all-issues"],"summary":"Adyen Show Failed Payouts in Merchant Portal","type":"New Feature","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-01-13","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Adyen Failed Payouts","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001377,"rn":"RN-APP-017","rnLink":"https://datman.atlassian.net/wiki/x/CYDSxQ\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3318907013/13-01-2026+CP+Clarity+Integration+CP+Portal","rnLinks":["https://datman.atlassian.net/wiki/x/CYDSxQ\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3318907013/13-01-2026+CP+Clarity+Integration+CP+Portal"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14758/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14758/tab/release-report-all-issues"],"summary":"Clarity for Portal & App","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-13","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Clarity","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001394,"rn":"RN-APP-018","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3314876554/12-01-2026+CP+BE+-+FF+self+onboarding+Improvement+and+PROD+bug","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3314876554/12-01-2026+CP+BE+-+FF+self+onboarding+Improvement+and+PROD+bug"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/11406/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/11406/tab/release-report-all-issues"],"summary":"API response get the direct URL & Merchant status api return account status","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-13","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"FastFood Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001241,"rn":"RN-APP-009","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3315269633/12-01-2026+CP+Validation+on+the+payment+provider+change+from+portal","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3315269633/12-01-2026+CP+Validation+on+the+payment+provider+change+from+portal"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14690/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14690/tab/release-report-all-issues"],"summary":"Adyen Failed payments changes validation ( Balance account missing )","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001258,"rn":"RN-APP-010","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3311042561/xx-01-2026+CP+CP+React+Node+Upgrade","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3311042561/xx-01-2026+CP+CP+React+Node+Upgrade"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14654/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14654/tab/release-report-all-issues"],"summary":"React & Node Upgrade","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"N/A","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001292,"rn":"RN-APP-012","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3316449281/12-01-2026+CP+Portal+Redirection","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3316449281/12-01-2026+CP+Portal+Redirection"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14687/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14687/tab/release-report-all-issues"],"summary":"Portal to new web redirection","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Portal Redirection","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001190,"rn":"RN-APP-006","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3285647392/09-01-2026+CP+Reseller+Merchant+API+pagination+for+the+United+Kingdom","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3285647392/09-01-2026+CP+Reseller+Merchant+API+pagination+for+the+United+Kingdom"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14487/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14487/tab/release-report-all-issues"],"summary":"Pagination for Reseller onboarding","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-09","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Reseller Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001207,"rn":"RN-APP-007","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3310780417/09-01-2026+CP+Reseller+Onboarding+page+verification+checks+improvement","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3310780417/09-01-2026+CP+Reseller+Onboarding+page+verification+checks+improvement"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14522/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14522/tab/release-report-all-issues"],"summary":"Reseller dashboard fix for verification status","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-09","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Reseller Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001224,"rn":"RN-APP-008","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3294494766/05-01-2026+CP+FE+-+Redirect+merchant+to+correct+balance+platform+based+on+country","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3294494766/05-01-2026+CP+FE+-+Redirect+merchant+to+correct+balance+platform+based+on+country"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14522/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14522/tab/release-report-all-issues"],"summary":"Reseller Dashboard UI Improvements","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-09","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"N/A","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Reseller Improvements","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001173,"rn":"RN-APP-005","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3305963521/08-01-2026+CP-backend+Return+Adyen+onboarding+URL+through+webhook+on+mid+creation+v1+api","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3305963521/08-01-2026+CP-backend+Return+Adyen+onboarding+URL+through+webhook+on+mid+creation+v1+api"],"jiraLink":"","jiraLinks":[],"summary":"Fast Food self onboarding","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-08","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Fast Food","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001156,"rn":"RN-APP-004","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3285647432/07-01-2026+CP+Move+Transactions+has+to+be+added+under+Merchant+Tools","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3285647432/07-01-2026+CP+Move+Transactions+has+to+be+added+under+Merchant+Tools"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14453/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14453/tab/release-report-all-issues"],"summary":"Move Transactions to be under Merchant Tools","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-07","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001139,"rn":"RN-APP-003","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3294494766/05-01-2026+CP+FE+-+Redirect+merchant+to+correct+balance+platform+based+on+country","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3294494766/05-01-2026+CP+FE+-+Redirect+merchant+to+correct+balance+platform+based+on+country"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14420/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14420/tab/release-report-all-issues"],"summary":"Redirect merchant to correct balance platform based on country","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-05","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001122,"rn":"RN-APP-002","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3285647509/02-01-2026+CP+BE+-+Adyen+to+DB+sync+-+the+data+of+adyen+FH+UK+is+also+getting+synced+along+with+Mypay+UK+causing+discrepencies","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3285647509/02-01-2026+CP+BE+-+Adyen+to+DB+sync+-+the+data+of+adyen+FH+UK+is+also+getting+synced+along+with+Mypay+UK+causing+discrepencies"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14387/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14387/tab/release-report-all-issues"],"summary":"Adyen to DB Sync","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-02","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001105,"rn":"RN-APP-001","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3286566297/01-01-2026+CP+Encrypt+payload+for+Create+New+Auth+OTP+API+using+public+private+key","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3286566297/01-01-2026+CP+Encrypt+payload+for+Create+New+Auth+OTP+API+using+public+private+key"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14521/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14521/tab/release-report-all-issues"],"summary":"Encrypt payload for Create New Auth OTP API using public/private key","type":"New Feature","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-01","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"","modules":["Portal"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001938,"rn":"RN-APP-048","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3407544321/23-02-2026+Web+app+Reset+Password+changes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3407544321/23-02-2026+Web+app+Reset+Password+changes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15521/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15521/tab/release-report-all-issues"],"summary":"Control Onboarding redirection on Web","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-26","approvals":{"Sandeep":false,"Nitish":false,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Yet to Review","Pradeep":"Approved","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"New Web portal","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001904,"rn":"RN-APP-046","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3407544321/23-02-2026+Web+app+Reset+Password+changes","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3407544321/23-02-2026+Web+app+Reset+Password+changes"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15519/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15519/tab/release-report-all-issues"],"summary":"Reset Password Changes for New Web","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-25","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Yet to Review","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"New Web portal","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001853,"rn":"RN-APP-043","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3408429057/24-02-2026+Web+app+CSRF+Token+for+new+portal","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3408429057/24-02-2026+Web+app+CSRF+Token+for+new+portal"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15383/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15383/tab/release-report-all-issues"],"summary":"CSRF Token changes","type":"Improvement","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-02-24","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"New Web portal","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001870,"rn":"RN-APP-044","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3414097921/24-02-2026+Web+app+Web+App+Support+for+Android+8+and+Android+9+Browsers","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3414097921/24-02-2026+Web+app+Web+App+Support+for+Android+8+and+Android+9+Browsers"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15382/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15382/tab/release-report-all-issues"],"summary":"POS Issue - New web redirection","type":"Bug","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-02-24","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"FH issues for version upgrade","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001717,"rn":"RN-APP-035","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3388243986/10-02-2026+Web+app+Optimised+web+build+and+locators+with+3.4.0+update","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3388243986/10-02-2026+Web+app+Optimised+web+build+and+locators+with+3.4.0+update"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15311/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15311/tab/release-report-all-issues"],"summary":"Web changes for V3.4.0 ( Optimise bundle size )","type":"Improvement","priority":"P3","status":"Released","releasePlanned":"","releaseActual":"2026-02-10","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Yet to Review","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"Web portal go live, Dynamic Split commission","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001666,"rn":"RN-APP-032","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3364552705/29-01-2026+Web+app+Total+Payment+and+Total+Refunds+on+web+app","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3364552705/29-01-2026+Web+app+Total+Payment+and+Total+Refunds+on+web+app"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15169/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15169/tab/release-report-all-issues"],"summary":"Total Payment and Total Refunds on web app","type":"New Feature","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-30","approvals":{"Sandeep":true,"Nitish":false,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"N/A","Pradeep":"N/A","Muz":"N/A","Sundar":"N/A","Ruhan":"N/A","Anand":"Yet to Review"},"goal":"Web portal go live","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001445,"rn":"RN-APP-021","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3329228801/19-01-2026+Web+app+Feedback+from+Aymen+for+Datman+New+web+app+portal\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3329097729/19-01-2026+CP+Redirection+to+new+portal+Feedback+from+Aymen","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3329228801/19-01-2026+Web+app+Feedback+from+Aymen+for+Datman+New+web+app+portal\nhttps://datman.atlassian.net/wiki/spaces/DN/pages/3329097729/19-01-2026+CP+Redirection+to+new+portal+Feedback+from+Aymen"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14892/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14892/tab/release-report-all-issues"],"summary":"Web portal fixes ( Aymen feedback )","type":"Bug","priority":"P2","status":"Released","releasePlanned":"","releaseActual":"2026-01-19","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":true,"Anand":false},"approvalRaw":{"Sandeep":"N/A","Nitish":"Approved","Pradeep":"N/A","Muz":"N/A","Sundar":"N/A","Ruhan":"Approved","Anand":"Yet to Review"},"goal":"Web portal Improvements","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000001275,"rn":"RN-APP-011","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3315761153/12-01-2026+Web+app+Beta+release+Datman+New+web+app+portal","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3315761153/12-01-2026+Web+app+Beta+release+Datman+New+web+app+portal"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/14352/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/14352/tab/release-report-all-issues"],"summary":"Web Portal","type":"Improvement","priority":"P1","status":"Released","releasePlanned":"","releaseActual":"2026-01-12","approvals":{"Sandeep":true,"Nitish":true,"Pradeep":false,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Approved","Nitish":"Approved","Pradeep":"N/A","Muz":"N/A","Sundar":"N/A","Ruhan":"Yet to Review","Anand":"Yet to Review"},"goal":"Go live web portal","modules":["Web"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}},{"id":1700000000986,"rn":"RN-GAT-061","rnLink":"https://datman.atlassian.net/wiki/spaces/DN/pages/3435036673/09-03-2026+Prod+Able+to+see+the+W2C+is+getting+failed+fetching+data+from+Card_payment+and+Payment+table+Id+Column","rnLinks":["https://datman.atlassian.net/wiki/spaces/DN/pages/3435036673/09-03-2026+Prod+Able+to+see+the+W2C+is+getting+failed+fetching+data+from+Card_payment+and+Payment+table+Id+Column"],"jiraLink":"https://datman.atlassian.net/projects/DN/versions/15567/tab/release-report-all-issues","jiraLinks":["https://datman.atlassian.net/projects/DN/versions/15567/tab/release-report-all-issues"],"summary":"W2C is failing when fetching data from Card_payment and Payment table Id","type":"Bug","priority":"P2","status":"Cancelled","releasePlanned":"","releaseActual":"2026-03-09","approvals":{"Sandeep":false,"Nitish":true,"Pradeep":true,"Muz":false,"Sundar":false,"Ruhan":false,"Anand":false},"approvalRaw":{"Sandeep":"Yet to Review","Nitish":"Approved","Pradeep":"Approved","Muz":"Yet to Review","Sundar":"Yet to Review","Ruhan":"N/A","Anand":"N/A"},"goal":"Foodhub Issue","modules":["Payments"],"dora":{"leadDeveloper":"","application":"","services":"","qa":"NA","originalRNLink":"NA","handoverDate":""}}];
function loadReleases(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return SEED_DATA;
    const parsed = JSON.parse(raw);
    // If stored data is empty or stale (< seed count), use seed
    if(!parsed||!parsed.length) return SEED_DATA;
    return parsed;
  }catch(e){ return SEED_DATA; }
}
function saveReleases(list){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }catch(e){}
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── JIRA VERSIONS PAGE ───────────────────────────────────────────────────────
// Architecture:
//  • Jira REST API v3 — POST /rest/api/3/version creates a Jira "Fix Version"
//  • GET /rest/api/3/project/{key}/versions lists all versions
//  • Browser CORS: works on localhost dev server; for production deploy a thin proxy
//    (e.g. Cloudflare Worker / Express /api/jira route) that attaches credentials
//  • Credentials stored in sessionStorage only — cleared on tab close, never on disk
//  • When a release is marked "Released" in TableView → auto-adds to Jira queue

const JIRA_CFG_KEY = "datman_jira_cfg_v2";

function loadJiraCfg() {
  try { return JSON.parse(sessionStorage.getItem(JIRA_CFG_KEY) || "{}"); } catch { return {}; }
}
function saveJiraCfg(cfg) {
  try { sessionStorage.setItem(JIRA_CFG_KEY, JSON.stringify(cfg)); } catch {}
}

function JiraVersionsPage({ releases, onSyncBack }) {
  const { useState: uS, useEffect: uE, useMemo: uM, useCallback: uC } = React;

  // ── Config ──────────────────────────────────────────────────────────────────
  const [cfg, setCfg] = uS(() => loadJiraCfg());
  const [showCfg, setShowCfg] = uS(false);
  const [draftCfg, setDraftCfg] = uS(cfg);
  const configured = !!(cfg.base && cfg.key);

  const saveCfg = () => { saveJiraCfg(draftCfg); setCfg(draftCfg); setShowCfg(false); };

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = uS("");
  const [modFilter, setModFilter] = uS("All");
  const [typeFilter, setTypeFilter] = uS("All");
  const [showPending, setShowPending] = uS(false); // toggle: all-released vs. no-jira-only

  // ── Sync state: { [releaseId]: { status:"idle"|"loading"|"ok"|"err", msg, versionId, link } }
  const [syncState, setSyncState] = uS({});
  const setSync = (id, patch) => setSyncState(s => ({ ...s, [id]: { ...s[id], ...patch } }));

  // ── Filtered releases ────────────────────────────────────────────────────────
  const rows = uM(() => {
    return releases
      .filter(r => r.status === "Released")
      .filter(r => !search || r.summary.toLowerCase().includes(search.toLowerCase()) || (r.rn||"").toLowerCase().includes(search.toLowerCase()))
      .filter(r => modFilter === "All" || r.modules?.includes(modFilter))
      .filter(r => typeFilter === "All" || r.type === typeFilter)
      .filter(r => {
        if (!showPending) return true;
        const hasJira = r.jiraLink && r.jiraLink.trim() && r.jiraLink !== "Not needed";
        return !hasJira;
      })
      .sort((a, b) => {
        const da = a.releaseActual || a.releasePlanned || "";
        const db = b.releaseActual || b.releasePlanned || "";
        return db.localeCompare(da);
      });
  }, [releases, search, modFilter, typeFilter, showPending]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = uM(() => {
    const rel = releases.filter(r => r.status === "Released");
    const withJira = rel.filter(r => r.jiraLink && r.jiraLink.trim() && r.jiraLink !== "Not needed").length;
    return { total: rel.length, withJira, without: rel.length - withJira };
  }, [releases]);

  // ── Core: Sync one release to Jira ──────────────────────────────────────────
  // Calls go through /api/jira/* — a Vercel serverless proxy that attaches
  // credentials server-side (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN env vars).
  // This means zero CORS issues and zero credentials sent from the browser.
  const jiraFetch = async (path, options = {}) => {
    const url = `/api/jira/${path.replace(/^\//, "")}`;
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", "Accept": "application/json", ...(options.headers || {}) },
    });
    // Surface env-var errors clearly
    if (res.status === 500) {
      const err = await res.json().catch(() => ({}));
      if (err.missing) throw new Error(`Vercel env vars not set: ${err.missing.join(", ")}. Add them in Vercel → Settings → Environment Variables.`);
    }
    return res;
  };

  const syncToJira = uC(async (r) => {
    setSync(r.id, { status: "loading", msg: "Connecting to Jira…" });
    try {
      // Step 1 — Fetch project to get numeric ID
      setSync(r.id, { status: "loading", msg: "Fetching project info…" });
      const projRes = await jiraFetch(`rest/api/3/project/${cfg.key}`);
      if (!projRes.ok) {
        const txt = await projRes.text();
        throw new Error(`Project not found (${projRes.status}). Check JIRA_BASE_URL and project key.\n${txt}`);
      }
      const proj = await projRes.json();

      // Step 2 — Check if version already exists (avoid duplicates)
      setSync(r.id, { status: "loading", msg: "Checking for existing version…" });
      const vName = r.rn || r.summary.slice(0, 100);
      const listRes = await jiraFetch(`rest/api/3/project/${cfg.key}/versions`);
      const existing = listRes.ok ? await listRes.json() : [];
      const found = (Array.isArray(existing) ? existing : []).find(v => v.name === vName);
      let versionId, jiraLink;
      const jiraBase = cfg.base ? cfg.base.replace(/\/$/, "") : "https://datman.atlassian.net";

      if (found) {
        versionId = found.id;
        jiraLink = `${jiraBase}/projects/${cfg.key}/versions/${versionId}/tab/release-report-all-issues`;
        setSync(r.id, { status: "ok", msg: `Already exists in Jira (ID ${versionId})`, link: jiraLink, versionId });
      } else {
        // Step 3 — Create new version
        setSync(r.id, { status: "loading", msg: "Creating Jira version entry…" });
        const payload = {
          name: vName,
          description: [r.goal, r.summary].filter(Boolean).join(" · ").slice(0, 255),
          projectId: proj.id,
          released: true,
          releaseDate: r.releaseActual || r.releasePlanned || undefined,
        };
        const createRes = await jiraFetch(`rest/api/3/version`, {
          method: "POST", body: JSON.stringify(payload)
        });
        if (!createRes.ok) {
          const txt = await createRes.text();
          throw new Error(`Create version failed (${createRes.status}):\n${txt}`);
        }
        const ver = await createRes.json();
        versionId = ver.id;
        jiraLink = `${jiraBase}/projects/${cfg.key}/versions/${versionId}/tab/release-report-all-issues`;
        setSync(r.id, { status: "ok", msg: `✓ Created "${ver.name}" (ID ${versionId})`, link: jiraLink, versionId });
      }

      // Step 4 — Sync link back into table
      onSyncBack({ ...r, jiraLink, jiraLinks: [jiraLink, ...(r.jiraLinks || []).filter(l => l !== jiraLink)] });

    } catch (err) {
      setSync(r.id, { status: "err", msg: err.message });
    }
  }, [cfg, onSyncBack]);

  // ── Sync ALL pending ─────────────────────────────────────────────────────────
  const syncAll = async () => {
    const pending = rows.filter(r => {
      const hasJira = r.jiraLink && r.jiraLink.trim() && r.jiraLink !== "Not needed";
      return !hasJira && syncState[r.id]?.status !== "ok";
    });
    for (const r of pending) {
      await syncToJira(r);
      await new Promise(res => setTimeout(res, 400)); // gentle rate-limit
    }
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const INP = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "#fff", fontFamily: FONT, fontSize: "0.85rem",
    padding: "0.6rem 0.9rem", width: "100%", boxSizing: "border-box", outline: "none",
  };
  const TH = { padding: "0.6rem 0.8rem", color: B.textMuted, fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "left", borderBottom: `1px solid ${B.border2}`, whiteSpace: "nowrap", background: "#050505" };

  const rowSyncInfo = (r) => {
    const ss = syncState[r.id];
    if (ss?.status === "loading") return { col: B.teal,   bg: "#0ea5c811", label: "Syncing…", icon: "⏳" };
    if (ss?.status === "ok")      return { col: "#22c55e", bg: "#22c55e11", label: "Synced",   icon: "✓" };
    if (ss?.status === "err")     return { col: "#ef4444", bg: "#ef444411", label: "Error",    icon: "✗" };
    const hasJira = r.jiraLink && r.jiraLink.trim() && r.jiraLink !== "Not needed";
    if (hasJira)                  return { col: "#60a5fa", bg: "#3b82f611", label: "Has Jira", icon: "⎇" };
    return                               { col: B.textMuted, bg: "transparent", label: "Pending", icon: "○" };
  };

  const pendingCount = rows.filter(r => {
    const hasJira = r.jiraLink && r.jiraLink.trim() && r.jiraLink !== "Not needed";
    return !hasJira;
  }).length;

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: FONT, minHeight: "100vh" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: B.textPrimary, fontFamily: FONT_DISPLAY, fontSize: "1.4rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Jira Release Versions
          </h2>
          <p style={{ color: B.textMuted, fontSize: "0.78rem", margin: "0.3rem 0 0", lineHeight: 1.5 }}>
            Automatically create Jira "Fix Version" entries for released items — populated from your release data — then sync the Jira link back to the table.
          </p>
        </div>

        {/* KPI pills */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexShrink: 0 }}>
          {[
            [stats.total,    "Total Released", B.teal],
            [stats.withJira, "In Jira",        "#22c55e"],
            [stats.without,  "Pending Sync",   "#f97316"],
          ].map(([n, l, c]) => (
            <div key={l} style={{ textAlign: "center", background: c+"18", border: `1px solid ${c}33`, borderRadius: 12, padding: "0.4rem 0.9rem", minWidth: 70 }}>
              <div style={{ color: c, fontSize: "1.1rem", fontWeight: 800, lineHeight: 1 }}>{n}</div>
              <div style={{ color: B.textMuted, fontSize: "0.58rem", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
          <button onClick={syncAll} disabled={!configured || pendingCount === 0}
            style={{ background: "#22c55e", border: "none", borderRadius: 10, padding: "0.5rem 1rem", color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: configured && pendingCount > 0 ? "pointer" : "not-allowed", fontFamily: FONT, opacity: (!configured || pendingCount === 0) ? 0.45 : 1, whiteSpace: "nowrap" }}>
            ⬆ Sync All Pending ({pendingCount})
          </button>
          <button onClick={() => { setDraftCfg(cfg); setShowCfg(v => !v); }}
            style={{ background: configured ? B.grad1 : "#f97316", border: "none", borderRadius: 10, padding: "0.5rem 1rem", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>{configured ? "⚙ Configured" : "⚙ Setup Jira"}</span>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: configured ? "#4ade80" : "#fca5a5" }} />
          </button>
        </div>
      </div>

      {/* ── Config Panel ── */}
      {showCfg && (
        <div style={{ background: "#060f1a", border: `1px solid ${B.teal}44`, borderRadius: 16, padding: "1.75rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ color: B.teal, fontFamily: FONT_DISPLAY, fontSize: "1rem", fontWeight: 800, margin: 0 }}>🔗 Jira Connection Settings</h3>
            <button onClick={() => setShowCfg(false)} style={{ background: "none", border: "none", color: B.textMuted, cursor: "pointer", fontSize: "1.2rem", fontFamily: FONT }}>✕</button>
          </div>

          {/* Vercel setup instructions */}
          <div style={{ background: "rgba(14,165,200,0.07)", border: "1px solid rgba(14,165,200,0.2)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem", fontSize: "0.78rem", color: B.textSecondary, lineHeight: 1.85 }}>
            <div style={{ color: B.textPrimary, fontWeight: 700, marginBottom: "0.5rem" }}>One-time Vercel setup (credentials stay server-side — never in the browser):</div>
            <div><strong style={{color:B.teal}}>Step 1</strong> — Go to <strong>id.atlassian.com → Security → API Tokens → Create token</strong> — copy it</div>
            <div><strong style={{color:B.teal}}>Step 2</strong> — Open <strong>Vercel dashboard → Your project → Settings → Environment Variables</strong></div>
            <div style={{ marginLeft: "1rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              {[
                ["JIRA_BASE_URL",   "https://datman.atlassian.net"],
                ["JIRA_EMAIL",      "admin@datman.com"],
                ["JIRA_API_TOKEN",  "your-api-token-here"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", fontFamily: "monospace" }}>
                  <span style={{ color: B.cyan, fontWeight: 700, minWidth: 160 }}>{k}</span>
                  <span style={{ color: B.textMuted }}>=</span>
                  <span style={{ color: "#a3e635" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "0.4rem" }}><strong style={{color:B.teal}}>Step 3</strong> — Click <strong>Save</strong> in Vercel → <strong>Redeploy</strong> your project (env vars apply on next deploy)</div>
            <div><strong style={{color:B.teal}}>Step 4</strong> — Fill in the two fields below → <strong>Save</strong> → click <strong>Sync to Jira</strong></div>
            <div style={{ marginTop: "0.6rem", padding: "0.5rem 0.75rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
              <strong style={{color:"#22c55e"}}>✓ Vercel proxy:</strong> All API calls go through <code style={{color:B.cyan,background:"rgba(34,211,238,0.1)",padding:"0.1em 0.4em",borderRadius:4}}>/api/jira/*</code> — your credentials are attached server-side. No CORS issues, no token in the browser.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              ["Jira Base URL (for link building)", "base", "text",  "https://datman.atlassian.net"],
              ["Project Key",                       "key",  "text",  "DN"],
            ].map(([label, field, type, ph]) => (
              <div key={field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ color: B.teal, fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase" }}>{label}</label>
                <input value={draftCfg[field] || ""} type={type} placeholder={ph}
                  onChange={e => setDraftCfg(d => ({ ...d, [field]: e.target.value }))}
                  style={INP} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem" }}>
            <button onClick={saveCfg}
              style={{ background: B.grad1, border: "none", borderRadius: 10, padding: "0.65rem 1.75rem", color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", fontFamily: FONT }}>
              Save
            </button>
            <button onClick={() => { setDraftCfg({ base: "https://datman.atlassian.net", key: "DN" }); saveJiraCfg({ base: "https://datman.atlassian.net", key: "DN" }); setCfg({ base: "https://datman.atlassian.net", key: "DN" }); setShowCfg(false); }}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "0.65rem 1.25rem", color: "#ef4444", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: FONT }}>
              Reset
            </button>
            <button onClick={() => setShowCfg(false)}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.65rem 1.25rem", color: B.textMuted, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: FONT }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Filters bar ── */}
      <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search summary or RN…"
          style={{ ...INP, width: 260, padding: "0.45rem 0.85rem", flex: "none" }} />

        {/* Module filter */}
        <div style={{ display: "flex", background: "#0d0d0d", borderRadius: 8, padding: "0.15rem", border: `1px solid ${B.border2}`, flexWrap: "wrap" }}>
          {["All", ...MODULES].map(m => (
            <button key={m} onClick={() => setModFilter(m)}
              style={{ padding: "0.22rem 0.6rem", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, background: modFilter === m ? B.grad1 : "transparent", color: modFilter === m ? "#fff" : B.textMuted }}>
              {m}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ display: "flex", background: "#0d0d0d", borderRadius: 8, padding: "0.15rem", border: `1px solid ${B.border2}` }}>
          {["All", ...RELEASE_TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ padding: "0.22rem 0.6rem", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, background: typeFilter === t ? TYPE_COLORS[t]||B.grad1 : "transparent", color: typeFilter === t ? "#fff" : B.textMuted }}>
              {t}
            </button>
          ))}
        </div>

        {/* Pending only toggle */}
        <button onClick={() => setShowPending(v => !v)}
          style={{ padding: "0.28rem 0.8rem", borderRadius: 8, border: `1px solid ${showPending ? "#f97316" : B.border2}`, cursor: "pointer", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, background: showPending ? "rgba(249,115,22,0.12)" : "transparent", color: showPending ? "#f97316" : B.textMuted }}>
          {showPending ? "● Pending only" : "○ Pending only"}
        </button>

        <span style={{ color: B.textMuted, fontSize: "0.72rem", marginLeft: "auto" }}>{rows.length} entries</span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{...TH, width: 95}}>RN #</th>
                <th style={{...TH, width: 260}}>Summary</th>
                <th style={{...TH, width: 60}}>Type</th>
                <th style={{...TH, width: 55}}>Pri</th>
                <th style={{...TH, width: 90}}>Module</th>
                <th style={{...TH, width: 105}}>Released</th>
                <th style={{...TH, width: 90}}>Approvers</th>
                <th style={{...TH, width: 95}}>Jira Status</th>
                <th style={{...TH, width: 110}}>Jira Link</th>
                <th style={{...TH, width: 130}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const si = rowSyncInfo(r);
                const hasJira = r.jiraLink && r.jiraLink.trim() && r.jiraLink !== "Not needed";
                const ss = syncState[r.id];
                const approvedNames = Object.entries(r.approvals||{}).filter(([,v])=>v).map(([k])=>k);
                return (
                  <tr key={r.id} style={{ background: i%2===0 ? "#000" : B.bgCard, borderBottom: `1px solid ${B.border}`, transition: "background 0.15s" }}>

                    {/* RN */}
                    <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap" }}>
                      {r.rnLink && !["No RN","No RN/change request"].includes(r.rnLink)
                        ? <a href={(r.rnLinks||[])[0]||r.rnLink} target="_blank" rel="noreferrer"
                            style={{ color: B.teal, fontWeight: 800, fontSize: "0.76rem", textDecoration: "none" }}>
                            {r.rn || "—"}
                          </a>
                        : <span style={{ color: B.textMuted, fontSize: "0.76rem", fontWeight: 700 }}>{r.rn || "—"}</span>}
                    </td>

                    {/* Summary */}
                    <td style={{ padding: "0.6rem 0.8rem", color: B.textPrimary, fontSize: "0.77rem", lineHeight: 1.4, maxWidth: 260 }}>
                      <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{r.summary}</div>
                      {r.goal && <div style={{ color: B.textMuted, fontSize: "0.66rem", marginTop: 2 }}>Goal: {r.goal}</div>}
                    </td>

                    {/* Type */}
                    <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap" }}>
                      <span style={{ color: TYPE_COLOR(r.type), fontSize: "0.7rem", fontWeight: 700 }}>{r.type}</span>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <span style={{ color: PRIORITY_COLORS[r.priority]||B.textMuted, fontSize: "0.7rem", fontWeight: 800 }}>{r.priority}</span>
                    </td>

                    {/* Module */}
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <span style={{ color: B.textSecondary, fontSize: "0.7rem" }}>{r.modules?.join(", ")||"—"}</span>
                    </td>

                    {/* Released date */}
                    <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap" }}>
                      <span style={{ color: "#22c55e", fontSize: "0.75rem", fontWeight: 600 }}>
                        {fmtDate(r.releaseActual)||fmtDate(r.releasePlanned)||"—"}
                      </span>
                    </td>

                    {/* Approvers */}
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {approvedNames.length > 0
                          ? approvedNames.map(n => (
                              <span key={n} style={{ background: "#22c55e18", color: "#22c55e", fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 4 }}>{n}</span>
                            ))
                          : <span style={{ color: B.textMuted, fontSize: "0.68rem" }}>—</span>}
                      </div>
                    </td>

                    {/* Jira status badge */}
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <span style={{ background: si.bg, color: si.col, borderRadius: 99, padding: "0.18rem 0.6rem", fontSize: "0.66rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "0.3rem", border: `1px solid ${si.col}33` }}>
                        <span>{si.icon}</span>{si.label}
                      </span>
                      {ss?.msg && (
                        <div style={{ color: ss.status==="err" ? "#ef4444" : "#22c55e", fontSize: "0.6rem", marginTop: 3, maxWidth: 120, lineHeight: 1.3, wordBreak: "break-word" }}>
                          {ss.msg}
                        </div>
                      )}
                    </td>

                    {/* Jira link */}
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      {(ss?.link || hasJira) ? (
                        <a href={ss?.link || r.jiraLink} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#0f2d5288", border: "1px solid #1e4a8066", borderRadius: 7, padding: "0.2rem 0.55rem", color: "#60a5fa", fontSize: "0.69rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                          ⎇ Jira ↗
                        </a>
                      ) : (
                        <span style={{ color: B.textMuted, fontSize: "0.69rem" }}>—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <button
                        disabled={ss?.status === "loading"}
                        onClick={() => syncToJira(r)}
                        style={{
                          background: ss?.status==="ok" ? "#22c55e22" : ss?.status==="err" ? "#ef444422" : hasJira ? "rgba(96,165,250,0.12)" : B.grad1,
                          border: `1px solid ${ss?.status==="ok" ? "#22c55e55" : ss?.status==="err" ? "#ef444455" : hasJira ? "rgba(96,165,250,0.3)" : "transparent"}`,
                          borderRadius: 9, padding: "0.32rem 0.75rem",
                          cursor: ss?.status==="loading" ? "wait" : "pointer",
                          color: ss?.status==="ok" ? "#22c55e" : ss?.status==="err" ? "#ef4444" : hasJira ? "#60a5fa" : "#fff",
                          fontWeight: 800, fontSize: "0.7rem", fontFamily: FONT, whiteSpace: "nowrap",
                          opacity: ss?.status==="loading" ? 0.6 : 1,
                          transition: "all 0.15s",
                        }}>
                        {ss?.status==="loading" ? "⏳ Syncing…"
                          : ss?.status==="ok"   ? "✓ Synced"
                          : ss?.status==="err"  ? "↺ Retry"
                          : hasJira             ? "↺ Re-Sync"
                          : "⬆ Sync to Jira"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "3rem", textAlign: "center", color: B.textMuted, fontSize: "0.85rem" }}>
                    No released entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer legend ── */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {[["✓ Synced","#22c55e"],["⎇ Has Jira","#60a5fa"],["○ Pending","#9ca3af"],["✗ Error","#ef4444"]].map(([l,c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ color: c, fontSize: "0.72rem", fontWeight: 700 }}>{l}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", color: B.textMuted, fontSize: "0.67rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
          Credentials stored in sessionStorage only — cleared on tab close
        </div>
      </div>
    </div>
  );
}


export default function App(){
  const [page,setPage]   = useState("list");
  const [view,setView]   = useState("table");
  const [team,setTeam]   = useState("All"); // "All" | "Gateway" | "App Team"
  const [releases,setReleases] = useState(()=>loadReleases());

  // Persist to localStorage on every change
  useEffect(()=>{ saveReleases(releases); }, [releases]);

  const handleSubmit = data => { setReleases(r=>[...r,data]); setPage("list"); };

  // Import: replace ALL existing data (user confirmed)
  // Then background-enrich types by inspecting each RN URL path for type keywords
  const handleImport = rows => {
    // First pass: set all rows with best-effort type from URL path
    const enriched = rows.map(r => {
      if(r.type && r.type !== "New Feature") return r; // already has a specific type
      const url = (r.rnLink||"").toLowerCase();
      let type = r.type||"New Feature";
      // Extract meaningful path segments from the URL
      // e.g. https://docs.company.com/rn/patch/rn-imp-040 → "patch" → Patch
      const segments = url.replace(/https?:\/\/[^/]+/,"").split(/[\/\-_?#]+/).filter(Boolean);
      for(const seg of segments){
        if(seg==="hotfix"||seg==="hf") { type="Patch"; break; }
        if(seg==="patch") { type="Patch"; break; }
        if(seg==="bug"||seg==="bugfix"||seg==="fix") { type="Bug"; break; }
        if(seg==="improvement"||seg==="enhance"||seg==="imp") { type="Improvement"; break; }
        if(seg==="feature"||seg==="feat") { type="New Feature"; break; }
      }
      return {...r, type};
    });
    setReleases(enriched);
  };

  // Edit: update one release in place by id
  const handleEdit = updated => {
    setReleases(r => r.map(x => x.id===updated.id ? updated : x));
  };

  // Team-filtered view for table/graph/analytics
  const filtered = releases.filter(r=>{
    if(team==="Gateway")  return r.modules?.some(m=>GATEWAY_MODULES.includes(m));
    if(team==="App Team") return r.modules?.some(m=>APP_MODULES.includes(m));
    return true;
  });

  if(page==="form") return <FormPage onSubmit={handleSubmit} onCancel={()=>setPage("list")} releases={releases}/>;

  const teamBtn = (t,label) => (
    <button key={t} onClick={()=>setTeam(t)} style={{
      padding:"0.28rem 0.85rem",borderRadius:6,border:"none",cursor:"pointer",fontFamily:FONT,
      fontSize:"0.76rem",fontWeight:700,
      background:team===t?B.grad1:"transparent",
      color:team===t?"#fff":B.textMuted,
    }}>{label}</button>
  );

  return(
    <div style={{minHeight:"100vh",background:B.bgDark,fontFamily:FONT}}>
      <div style={{position:"fixed",top:0,left:"40%",width:600,height:300,background:"radial-gradient(ellipse,rgba(14,165,200,0.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      {/* ── Sticky Nav ── */}
      <div style={{borderBottom:`1px solid ${B.border}`,padding:"0 2rem",display:"flex",alignItems:"center",background:B.bgDark+"f5",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100,height:56,gap:"0.5rem"}}>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginRight:"1rem"}}>
          <LogoMark size={28}/>
          <div>
            <div style={{color:B.textPrimary,fontWeight:800,fontSize:"1rem",letterSpacing:"-0.02em",lineHeight:1}}>Datman</div>
            <div style={{color:B.textMuted,fontSize:"0.58rem",letterSpacing:"0.06em",textTransform:"uppercase"}}>Release Management</div>
          </div>
        </div>

        {/* Page tabs */}
        <div style={{display:"flex",height:"100%"}}>
          {[["list","Releases"],["analytics","Analytics"],["jira","Jira Versions"]].map(([p,l])=>(
            <button key={p} onClick={()=>setPage(p)} style={{height:"100%",padding:"0 1rem",border:"none",cursor:"pointer",background:"transparent",color:page===p?B.cyan:B.textMuted,fontSize:"0.82rem",fontWeight:700,fontFamily:FONT,borderBottom:page===p?`2px solid ${B.cyan}`:"2px solid transparent"}}>{l}</button>
          ))}
        </div>

        {/* Table/Graph toggle */}
        {page==="list"&&<div style={{display:"flex",background:"#0d0d0d",borderRadius:8,padding:"0.18rem",border:`1px solid ${B.border2}`}}>
          {[["table","Table"],["graph","Graph"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"0.28rem 0.8rem",borderRadius:6,border:"none",cursor:"pointer",background:view===v?B.grad1:"transparent",color:view===v?"#fff":B.textMuted,fontSize:"0.76rem",fontWeight:700,fontFamily:FONT}}>{l}</button>
          ))}
        </div>}

        {/* Team filter */}
        <div style={{display:"flex",background:"#0d0d0d",borderRadius:8,padding:"0.18rem",border:`1px solid ${B.border2}`,marginLeft:"0.25rem"}}>
          {teamBtn("All","All")}
          {teamBtn("Gateway","Gateway")}
          {teamBtn("App Team","App")}
        </div>

        {/* KPIs + New button */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"1.1rem"}}>
          {[["Released",B.lime],["In Progress",B.cyan],["Delayed","#f97316"]].map(([l,col])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{color:col,fontSize:"0.95rem",fontWeight:800,lineHeight:1}}>{releases.filter(r=>r.status===l).length}</div>
              <div style={{color:B.textMuted,fontSize:"0.56rem",whiteSpace:"nowrap"}}>{l}</div>
            </div>
          ))}
          <div style={{width:1,height:22,background:B.border2}}/>
          <button onClick={()=>setPage("form")} style={{...primaryBtn,width:"auto",padding:"0.45rem 1rem",fontSize:"0.78rem"}}>+ New</button>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div style={{position:"relative",zIndex:1}}>
        {page==="list"&&view==="table"&&(
          <TableView
            releases={releases}
            teamFilter={team}
            onAdd={()=>setPage("form")}
            onImport={handleImport}
            onEdit={handleEdit}
          />
        )}
        {page==="list"&&view==="graph"&&<NodeGraphView releases={filtered}/>}
        {page==="analytics"&&<AnalyticsPage releases={releases}/>}
        {page==="jira"&&<JiraVersionsPage releases={releases} onSyncBack={r=>handleEdit(r)}/>}
      </div>
    </div>
  );
}


