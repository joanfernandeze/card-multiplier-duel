import { useState, useCallback, useEffect, useRef } from "react";

// ============================================================
// FONTS / THEME
// ============================================================
const FD = "'Playfair Display', Georgia, serif";
const FM = "'JetBrains Mono', monospace";
const F = { display: FD, mono: FM };

const THEME = {
  gold:     "#d4af37",
  goldDim:  "#8a7220",
  red:      "#e74c3c",
  redDim:   "#8a2a22",
  green:    "#2ecc71",
  greenDim: "#1a7a44",
  ink:      "#06060a",
  ink2:     "#0c0d12",
  ink3:     "#15161e",
  ink4:     "#1e2030",
  line:     "#262838",
  lineHi:   "#3a3d54",
  text:     "#e8e6df",
  textDim:  "#a09c8e",
  textMute: "#6a6a78",
};

// ============================================================
// SUITS (handoff object) + legacy compatibility maps
// ============================================================
const SUITS = {
  spades:   { glyph: "♠", name: "spades",   color: "dark" },
  clubs:    { glyph: "♣", name: "clubs",    color: "dark" },
  hearts:   { glyph: "♥", name: "hearts",   color: "red"  },
  diamonds: { glyph: "♦", name: "diamonds", color: "red"  },
};
const SUIT_SYMS   = ["♠","♥","♦","♣"];
const SUIT_COLORS = {"♠":"#a0b0c0","♣":"#a0b0c0","♥":"#e74c3c","♦":"#e74c3c"};
const SUIT_TO_NAME= {"♠":"spades","♣":"clubs","♥":"hearts","♦":"diamonds"};

const VN = {1:"A",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"J",12:"Q",13:"K"};
const DISEASE_COLORS = ["#e74c3c","#3498db","#f1c40f"];
const DISEASE_NAMES  = ["Red","Blue","Gold"];

// Card faces use a light/cream background, so suits must be dark to read:
// near-black for spades/clubs, a strong red for hearts/diamonds.
function suitColor(suit) {
  if (!suit || !SUITS[suit]) return "#1a160d";
  return SUITS[suit].color === "red" ? "#c0392b" : "#1a160d";
}

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

// ============================================================
// CARD SIZES
// ============================================================
const SIZES = {
  tiny:   { w: 56,  h: 78,  num: 13, suit: 11, motif: 26 },
  small:  { w: 72,  h: 102, num: 16, suit: 13, motif: 36 },
  medium: { w: 88,  h: 124, num: 19, suit: 15, motif: 48 },
  normal: { w: 100, h: 142, num: 22, suit: 18, motif: 60 },
  large:  { w: 132, h: 188, num: 28, suit: 22, motif: 84 },
};

// Per-deck face card emblems (Variation A)
const FACE_MOTIF = {
  classic:   { J: "♞", Q: "♛", K: "♚", A: "♠" },
  snakepit:  { J: "⌇", Q: "∞", K: "⩘", A: "⌬" },
  fibonacci: { J: "∮", Q: "φ", K: "Ω", A: "◐" },
  contagion: { J: "☣", Q: "⚕", K: "⊛", A: "◉" },
  fateshand: { J: "☽", Q: "✱", K: "☉", A: "✋" },
};

// ============================================================
// TENSION (handoff)
// ============================================================
const TENSION_LEVELS = [
  { key: "calm",     label: "CALM",     min: 0.0,  color: "#2ecc71" },
  { key: "low",      label: "LOW",      min: 0.08, color: "#7ed957" },
  { key: "rising",   label: "RISING",   min: 0.18, color: "#f39c12" },
  { key: "danger",   label: "DANGER",   min: 0.32, color: "#e67e22" },
  { key: "critical", label: "CRITICAL", min: 0.5,  color: "#e74c3c" },
];
function tensionFor(deadlyRatio) {
  let level = TENSION_LEVELS[0];
  for (const lv of TENSION_LEVELS) if (deadlyRatio >= lv.min) level = lv;
  return level;
}

// ============================================================
// DECK VISUAL TOKENS (handoff) — separate from game-logic DECKS
// ============================================================
const DECK_VISUAL = {
  classic:   { id:"classic",   name:"THE STANDARD",  tag:"Where legends begin.",       accent:"#d4af37", accentSoft:"rgba(212,175,55,0.18)",  bg:"#16140e", bgInk:"#0b0a06", glyph:"♠",  cardCount:52, tier:"base",    feel:"Premium, timeless"      },
  snakepit:  { id:"snakepit",  name:"VIPER'S DEN",   tag:"First bite is free.",        accent:"#2ecc71", accentSoft:"rgba(46,204,113,0.18)",  bg:"#08110c", bgInk:"#040806", glyph:"∞",  cardCount:30, tier:"base",    feel:"Dangerous, sharp"       },
  fibonacci: { id:"fibonacci", name:"GOLDEN RATIO",  tag:"Beautiful math. Ugly odds.", accent:"#f39c12", accentSoft:"rgba(243,156,18,0.18)",  bg:"#13100a", bgInk:"#0a0805", glyph:"φ",  cardCount:23, tier:"base",    feel:"Mathematical, elegant"  },
  contagion: { id:"contagion", name:"CONTAGION",     tag:"The sickness spreads.",      accent:"#e74c3c", accentSoft:"rgba(231,76,60,0.18)",   bg:"#160b0b", bgInk:"#0a0505", glyph:"☣",  cardCount:39, tier:"premium", feel:"Diseased, organic", daily:true },
  fateshand: { id:"fateshand", name:"FATE'S HAND",   tag:"Null. Critical. Destiny.",   accent:"#8e44ad", accentSoft:"rgba(142,68,173,0.18)",  bg:"#100a16", bgInk:"#08050c", glyph:"✋", cardCount:24, tier:"premium", feel:"Mystical, arcane"       },
};

// Short, player-friendly explanation of each deck's twist (shown on mode select)
const DECK_RULES = {
  classic:   "A full 52-card deck — 13 values across 4 suits. No gimmicks. Just you, the multiplier, and your nerve.",
  snakepit:  "Only values 1–6, five copies of each. Your first repeat is forgiven (Second Bite) — every repeat after that is fatal.",
  fibonacci: "Fibonacci values (1, 2, 3, 5, 8, 13, 21). The huge multipliers exist but are rare — push your luck to reach them.",
  contagion: "Three disease colors plus Cure cards. Draw a third card of one color and it triggers an Outbreak, re-seeding a value into the deck. A Cure wipes that color out.",
  fateshand: "NULL cards halve your score — two NULLs and you're dead. CRIT cards triple it. The wildest swings of any deck.",
};

// ============================================================
// DECK DEFINITIONS (game logic — unchanged)
// ============================================================
const DECKS = {
  classic: {
    id:"classic",name:"THE STANDARD",tier:"base",tagline:"Where legends begin.",
    desc:"Standard poker deck. 13 values x 4 suits.",color:"#d4af37",bg:"#16140e",
    build:()=>{const c=[];for(let v=1;v<=13;v++)for(const s of SUIT_SYMS)c.push({value:v,suit:s,display:VN[v],color:SUIT_COLORS[s]});return shuffle(c);},
    info:"52 cards",
  },
  snakepit: {
    id:"snakepit",name:"VIPER'S DEN",tier:"base",tagline:"First bite is free.",
    desc:"Values 1-6, 5 copies each. First match is free.",color:"#2ecc71",bg:"#08110c",
    build:()=>{const c=[];for(let v=1;v<=6;v++)for(let i=0;i<5;i++)c.push({value:v,suit:SUIT_SYMS[i%4],display:String(v),color:SUIT_COLORS[SUIT_SYMS[i%4]]});return shuffle(c);},
    info:"30 cards", special:"secondbite",
  },
  fibonacci: {
    id:"fibonacci",name:"GOLDEN RATIO",tier:"base",tagline:"Beautiful math. Ugly odds.",
    desc:"Fibonacci values, weighted copies.",color:"#f39c12",bg:"#13100a",
    build:()=>{const c=[];for(const[v,n]of[[1,6],[2,5],[3,4],[5,3],[8,2],[13,2],[21,1]])for(let i=0;i<n;i++)c.push({value:v,suit:SUIT_SYMS[i%4],display:String(v),color:"#f39c12"});return shuffle(c);},
    info:"23 cards",
  },
  contagion: {
    id:"contagion",name:"CONTAGION",tier:"premium",tagline:"The sickness spreads.",
    desc:"12 values x 3 colors + 3 Cures. 3rd same color = Outbreak.",color:"#e74c3c",bg:"#160b0b",
    build:()=>{const c=[];for(let v=1;v<=12;v++)for(let i=0;i<3;i++)c.push({value:v,suit:DISEASE_NAMES[i],display:String(v),color:DISEASE_COLORS[i],diseaseColor:i});
      for(let i=0;i<3;i++)c.push({value:100+i,display:"CURE",suit:DISEASE_NAMES[i],color:DISEASE_COLORS[i],diseaseColor:i,isPower:true,powerType:"cure"});
      return shuffle(c);},
    info:"39 cards", special:"outbreak",
  },
  fateshand: {
    id:"fateshand",name:"FATE'S HAND",tier:"premium",tagline:"Null. Critical. Destiny shifts.",
    desc:"Values 1-6 x 3 + 4 NULLs + 2 CRITs. Double NULL = death.",color:"#8e44ad",bg:"#100a16",
    build:()=>{const c=[];for(let v=1;v<=6;v++)for(let i=0;i<3;i++)c.push({value:v,suit:"*",display:String(v),color:"#c0a0e0"});
      for(let i=0;i<4;i++)c.push({value:0,suit:"$",display:"NULL",color:"#e74c3c",isNull:true});
      for(let i=0;i<2;i++)c.push({value:99,suit:"!",display:"x3",color:"#f1c40f",isCrit:true});
      return shuffle(c);},
    info:"24 cards", special:"modifier",
  },
};

const DECK_ORDER=["classic","snakepit","fibonacci","contagion","fateshand"];
const PREMIUM_IDS=["contagion","fateshand"];
function getDailyDeck(){return PREMIUM_IDS[Math.floor(Date.now()/86400000)%PREMIUM_IDS.length];}

// ============================================================
// DUEL POWER CARDS
// ============================================================
const POWER_CARDS = [
  {value:0,display:"PEEK",suit:"?",color:"#00bcd4",isPower:true,powerType:"peek"},
  {value:0,display:"PEEK",suit:"?",color:"#00bcd4",isPower:true,powerType:"peek"},
  {value:0,display:"MIRROR",suit:"?",color:"#c0c0c0",isPower:true,powerType:"mirror"},
  {value:0,display:"SKIP",suit:"!",color:"#ff5722",isPower:true,powerType:"skip"},
];

function buildDuelDeck(config, roundNum){
  const base = config.build();
  let cards;
  if(roundNum===1){
    cards = [...base, ...config.build()];
  } else if(roundNum===2){
    const extra = config.build();
    cards = [...base, ...extra.slice(0, Math.floor(extra.length*0.5))];
  } else {
    cards = base;
  }
  cards.push(...POWER_CARDS.map(c=>({...c})));
  return shuffle(cards);
}

// ============================================================
// PLAYER STATE + GAME LOGIC (unchanged)
// ============================================================
function newPlayerState(){
  return {drawn:[],score:0,seenValues:new Set(),alive:true,cashedOut:false,secondBiteUsed:false,cursed:false,colorCounts:{},perksEarned:0};
}

function getRisk(deck,ps,config){
  if(config.special==="modifier"){
    let d=0;
    for(const c of deck){
      if(c.isPoisoned)d++;
      else if(c.isNull&&ps.cursed)d++;
      else if(!c.isNull&&!c.isCrit&&!c.isPoisoned&&!c.isPower&&ps.seenValues.has(c.value))d++;
    }
    return deck.length>0?d/deck.length:0;
  }
  const d=deck.filter(c=>{
    if(c.isPoisoned)return true;
    if(c.isPower)return false;
    return ps.seenValues.has(c.value);
  }).length;
  return deck.length>0?d/deck.length:0;
}

function getDangerCount(deck,ps,config){
  if(config.special==="modifier"){
    let d=0;
    for(const c of deck){
      if(c.isPoisoned)d++;
      else if(c.isNull&&ps.cursed)d++;
      else if(!c.isNull&&!c.isCrit&&!c.isPoisoned&&!c.isPower&&ps.seenValues.has(c.value))d++;
    }
    return{danger:d,total:deck.length};
  }
  const d=deck.filter(c=>{
    if(c.isPoisoned)return true;
    if(c.isPower)return false;
    return ps.seenValues.has(c.value);
  }).length;
  return{danger:d,total:deck.length};
}

function wouldDie(card,ps,config){
  if(card.isPoisoned)return true;
  if(card.isPower)return false;
  if(config.special==="modifier"){
    if(card.isNull&&ps.cursed)return true;
    if(!card.isNull&&!card.isCrit)return ps.drawn.some(c=>c.value===card.value&&!c.isNull&&!c.isCrit);
    return false;
  }
  const isMatch=ps.drawn.some(c=>c.value===card.value&&!c.isPower);
  if(!isMatch)return false;
  if(config.special==="secondbite"&&!ps.secondBiteUsed)return false;
  return true;
}

function processDraw(card,ps,deck,config,opponentPs){
  let p={...ps,drawn:[...ps.drawn],seenValues:new Set(ps.seenValues),colorCounts:{...ps.colorCounts}};
  let d=[...deck];
  let msg="";
  let effect=null;

  if(card.isPoisoned){
    p.drawn.push({...card,dead:true});p.alive=false;p.score=0;
    return{ps:p,deck:d,msg:"POISONED!",died:true,effect:null};
  }

  if(card.isPower){
    if(card.powerType==="cure"&&config.special==="outbreak"){
      d=d.filter(c=>c.diseaseColor!==card.diseaseColor);
      msg=`CURED ${DISEASE_NAMES[card.diseaseColor]}!`;
    } else if(card.powerType==="peek"){
      msg="PEEK! Viewing next 3 cards...";
      effect="peek";
    } else if(card.powerType==="mirror"){
      if(opponentPs){
        const oppCards=opponentPs.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
        if(oppCards.length>0){
          const pick=oppCards[Math.floor(Math.random()*oppCards.length)];
          const mirrored={value:pick.value,suit:pick.suit,display:pick.display,color:pick.color,diseaseColor:pick.diseaseColor};
          d=shuffle([...d,mirrored]);
          msg=`MIRROR! Injected ${pick.display} into deck!`;
        } else {
          msg="MIRROR! No cards to copy.";
        }
      } else {
        msg="MIRROR! No target.";
      }
      effect="mirror";
    } else if(card.powerType==="skip"){
      msg="SKIP! Opponent draws 2!";
      effect="skip";
    }
    p.drawn.push(card);
    return{ps:p,deck:d,msg,died:false,effect};
  }

  if(config.special==="modifier"){
    if(card.isNull){
      if(p.cursed){p.drawn.push({...card,dead:true});p.alive=false;return{ps:p,deck:d,msg:"Double NULL!",died:true,effect:null};}
      p.cursed=true;p.score=Math.max(1,Math.floor(p.score/2));p.drawn.push(card);
      return{ps:p,deck:d,msg:`NULL! Score halved to ${p.score.toLocaleString()}`,died:false,effect:null};
    }
    if(card.isCrit){
      p.score=p.drawn.filter(c=>!c.isNull&&!c.isCrit&&!c.isPower).length===0?3:p.score*3;
      p.cursed=false;
      for(const sv of p.seenValues){const idx=d.findIndex(c=>c.value===sv&&!c.isNull&&!c.isCrit&&!c.isPower);if(idx>-1){d.splice(idx,1);break;}}
      p.drawn.push(card);
      return{ps:p,deck:d,msg:`CRIT x3! ${p.score.toLocaleString()}`,died:false,effect:null};
    }
    p.cursed=false;
  }

  const isMatch=p.drawn.some(c=>c.value===card.value&&!c.isPower&&!c.isNull&&!c.isCrit);
  if(isMatch){
    if(config.special==="secondbite"&&!p.secondBiteUsed){
      p.secondBiteUsed=true;p.drawn.push(card);
      return{ps:p,deck:d,msg:`Second Bite! Survived ${card.display}`,died:false,effect:null};
    }
    p.drawn.push({...card,dead:true});p.alive=false;p.score=0;
    return{ps:p,deck:d,msg:`Matched ${card.display}!`,died:true,effect:null};
  }

  const mult=card.value;
  const valid=p.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
  p.score=valid.length===0?mult:p.score*mult;
  p.seenValues.add(card.value);
  p.drawn.push(card);

  if(config.special==="outbreak"&&card.diseaseColor!==undefined){
    p.colorCounts[card.diseaseColor]=(p.colorCounts[card.diseaseColor]||0)+1;
    if(p.colorCounts[card.diseaseColor]>=3){
      const arr=[...p.seenValues];if(arr.length>0){
        const rv=arr[Math.floor(Math.random()*arr.length)];const dc=Math.floor(Math.random()*3);
        d=shuffle([...d,{value:rv,suit:DISEASE_NAMES[dc],display:String(rv),color:DISEASE_COLORS[dc],diseaseColor:dc}]);
        msg=`Outbreak! ${rv} re-entered! `;
      }
      p.colorCounts[card.diseaseColor]=0;
    }
  }

  if(config.special==="modifier"){
    const nd=p.drawn.filter(c=>!c.isNull&&!c.isCrit&&!c.isPower).length;
    if(nd===5&&p.perksEarned<1){const ni=d.findIndex(c=>c.isNull);if(ni>-1)d.splice(ni,1);p.perksEarned=1;msg+=`Perk: removed a Null! `;}
    if(nd===8&&p.perksEarned<2){d.push({value:99,suit:"!",display:"x3",color:"#f1c40f",isCrit:true});d=shuffle(d);p.perksEarned=2;msg+=`Perk: added a Crit! `;}
  }

  msg+=`x${card.display} = ${p.score.toLocaleString()}`;
  return{ps:p,deck:d,msg,died:false,effect:null};
}

function computeWhatIfData(you,bot,deck,config){
  const data = {};
  if(deck.length>0){
    data.nextCard = deck[0];
    data.nextCardSafe = !wouldDie(deck[0], you, config);
  }
  const safeCards = deck.filter(c=>!wouldDie(c,you,config));
  data.safeCardsRemaining = safeCards.length;
  const poisonInDeck = deck.find(c=>c.isPoisoned);
  if(poisonInDeck){
    data.poisonCard = {display:poisonInDeck.display, hit:false, stillInDeck:true};
  }
  if(bot.cashedOut){
    const {danger} = getDangerCount(deck, bot, config);
    data.opponentDangerAtCash = danger;
  }
  return data;
}

function botDecision(botState,deck,config,opponentState,difficulty,skipPending){
  if(botState.cashedOut||!botState.alive)return"wait";
  const valid=botState.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
  if(valid.length===0)return"draw";
  const risk=getRisk(deck,botState,config);

  if(difficulty==="timid"){return risk>0.28?"cash":"draw";}
  if(difficulty==="calculator"){
    const surviveChance=1-risk;
    if(deck.length===0)return"cash";
    const safeCards=deck.filter(c=>{
      if(c.isPoisoned)return false;
      if(c.isPower)return true;
      if(config.special==="modifier"&&(c.isNull||c.isCrit))return true;
      return!botState.seenValues.has(c.value);
    });
    if(safeCards.length===0)return"cash";
    const avgMult=safeCards.reduce((s,c)=>s+(c.isPower?1:c.isNull?0.5:c.isCrit?3:c.value),0)/safeCards.length;
    const ev=surviveChance*botState.score*avgMult;
    if(skipPending==="bot"&&risk>0.25)return"cash";
    if(opponentState.cashedOut&&botState.score>opponentState.score)return risk>0.35?"cash":"draw";
    if(opponentState.cashedOut&&botState.score<=opponentState.score)return risk>0.65?"cash":"draw";
    return ev>botState.score*1.1?"draw":"cash";
  }
  if(difficulty==="chaos"){return Math.random()<0.7?"draw":"cash";}
  if(difficulty==="mimic"){
    const oppDraws=opponentState.drawn.filter(c=>!c.isPower).length;
    const myDraws=valid.length;
    if(opponentState.cashedOut){return myDraws>=oppDraws?"cash":"draw";}
    return risk>0.5?"cash":"draw";
  }
  return risk>0.4?"cash":"draw";
}

function botPickPoison(botState,opponentState,config,difficulty){
  const valid=botState.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
  if(valid.length===0)return null;
  if(difficulty==="calculator"){
    const unseen=valid.filter(c=>!opponentState.seenValues.has(c.value));
    if(unseen.length>0)return unseen[Math.floor(Math.random()*unseen.length)];
  }
  return valid[Math.floor(Math.random()*valid.length)];
}

// ============================================================
// LEGACY CARD COMPONENT (used for power / null / crit / poisoned / non-standard suits)
// ============================================================
const POWER_COLORS = {peek:"#00bcd4",mirror:"#c0c0c0",skip:"#ff5722",cure:"#f1c40f"};
const POWER_ICONS  = {peek:"👁",mirror:"◇",skip:"⏩",cure:"✚"};

function ThinkingDots({color="#e74c3c"}){
  return(
    <span style={{display:"inline-flex",gap:3,alignItems:"center",marginLeft:5,verticalAlign:"middle"}}>
      {[0,1,2].map(i=>(
        <span key={i} style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:color,animation:`thinkDot 0.9s ${i*0.18}s ease-in-out infinite`}}/>
      ))}
    </span>
  );
}

function Card({card,small,dead,flipping,deckColor,tiny,clickable,onClick}){
  const sz=tiny?{w:56,h:78,vf:11,sf:11,cf:30,pf:11}
    :small?{w:72,h:102,vf:13,sf:11,cf:28,pf:11}
    :{w:100,h:142,vf:15,sf:13,cf:42,pf:12};
  const powerColor=card.isPower?POWER_COLORS[card.powerType]:null;
  const clr=card.isPoisoned?"#9b59b6":powerColor||card.color||deckColor||"#d4af37";
  const isSpecial=card.isNull||card.isCrit;
  const isPowerDuel=card.isPower&&!card.powerType?.startsWith("cure");

  const bg=dead&&card.isPoisoned?`radial-gradient(ellipse at 50% 40%,#2a102a,#1a051a)`
    :dead?`radial-gradient(ellipse at 50% 40%,#2a1010,#1a0a0a)`
    :`radial-gradient(ellipse at 50% 40%,#1a1a2e,#0d0d18)`;
  const bdr=dead&&card.isPoisoned?"1.5px solid #9b59b6"
    :dead?"1.5px solid #e74c3c"
    :card.isPower?`1.5px solid ${clr}`
    :clickable?`1.5px solid #9b59b6`
    :`1px solid ${clr}33`;

  return(
    <div onClick={clickable?onClick:undefined} style={{width:sz.w,height:sz.h,background:bg,border:bdr,borderRadius:7,position:"relative",overflow:"hidden",flexShrink:0,
      boxShadow:`inset 0 0 0 ${tiny?1:2}px rgba(255,255,255,0.04), ${dead&&card.isPoisoned?"0 0 12px rgba(155,89,182,0.4)":dead?"0 0 10px rgba(231,76,60,0.3)":card.isPower?`0 0 8px ${clr}44`:clickable?"0 0 10px rgba(155,89,182,0.3)":flipping?`0 0 15px ${clr}55`:"0 2px 8px rgba(0,0,0,0.3)"}`,
      animation:flipping?"flip .4s ease-out":clickable?"pulse 1.5s ease-in-out infinite":undefined,opacity:dead?0.5:1,cursor:clickable?"pointer":"default",transition:"transform .12s ease"}}
      onMouseEnter={e=>{if(clickable)e.currentTarget.style.transform="scale(1.08)";}}
      onMouseLeave={e=>{if(clickable)e.currentTarget.style.transform="";}}>

      {/* Center content */}
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",zIndex:1}}>
        {!card.isPower&&!isSpecial&&(
          <>
            {(()=>{
              // Map non-glyph suits (Contagion disease, Fate's Hand mystical) to symbols
              let suitSym=card.suit;
              if(DISEASE_NAMES.includes(card.suit)) suitSym="●";
              else if(card.suit==="*") suitSym="✦";
              else if(card.suit==="$"||card.suit==="!"||card.suit==="?") suitSym="";
              return suitSym ? <div style={{fontSize:sz.cf*0.6,lineHeight:1,color:clr,opacity:0.55}}>{suitSym}</div> : null;
            })()}
            <div style={{fontSize:sz.vf+4,fontWeight:900,fontFamily:FD,color:clr,marginTop:3,textShadow:`0 0 8px ${clr}33`}}>{card.display}</div>
          </>
        )}

        {card.isNull&&(
          <>
            <div style={{fontSize:tiny?12:small?17:24,fontWeight:900,fontFamily:FM,color:"#e74c3c",letterSpacing:tiny?0:2,textShadow:"0 0 10px rgba(231,76,60,0.3)"}}>{tiny?"0":"NULL"}</div>
            {!tiny&&<div style={{fontSize:small?11:13,color:"#e74c3c",opacity:0.5,marginTop:2}}>☠</div>}
          </>
        )}

        {card.isCrit&&(
          <>
            <div style={{fontSize:tiny?14:small?20:30,fontWeight:900,fontFamily:FD,color:"#f1c40f",textShadow:"0 0 12px rgba(241,196,15,0.4)"}}>x3</div>
            {!tiny&&<div style={{fontSize:small?11:11,color:"#f1c40f",fontFamily:FM,fontWeight:700,marginTop:2,letterSpacing:1}}>CRIT</div>}
          </>
        )}

        {card.isPower&&(
          <>
            <div style={{fontSize:tiny?14:small?22:32,lineHeight:1}}>{POWER_ICONS[card.powerType]||"?"}</div>
            {!tiny&&<div style={{fontSize:small?11:sz.pf,fontWeight:700,fontFamily:FM,color:clr,marginTop:tiny?1:3,letterSpacing:0.5,textTransform:"uppercase"}}>{card.powerType}</div>}
          </>
        )}
      </div>

      {dead&&card.isPoisoned&&!tiny&&(
        <div style={{position:"absolute",top:2,right:3,fontSize:11,zIndex:2}}>☠</div>
      )}
    </div>
  );
}

// ============================================================
// VARIATION A — CARD FACE (handoff)
// ============================================================
function PipColumn({ value, suit, size, accent }){
  const s = SIZES[size];
  const n = parseInt(value, 10);
  const sc = suitColor(suit);
  const pip = SUITS[suit] ? SUITS[suit].glyph : "•";
  let columns;
  if (n <= 3) columns = [Array(n).fill(pip)];
  else if (n <= 6) columns = [Array(Math.ceil(n/2)).fill(pip), Array(Math.floor(n/2)).fill(pip)];
  else {
    const c1 = Math.ceil(n/3);
    const c2 = Math.ceil(n/3);
    const c3 = Math.max(0, n - c1 - c2);
    columns = [Array(c1).fill(pip), Array(c2).fill(pip), Array(c3).fill(pip)];
  }
  const pipSize = Math.max(11, s.motif * 0.32);
  return (
    <div style={{ display:"flex", gap: pipSize * 0.4, alignItems:"center", justifyContent:"center" }}>
      {columns.map((col, i) => (
        <div key={i} style={{ display:"flex", flexDirection:"column", gap: pipSize * 0.05, alignItems:"center" }}>
          {col.map((p, j) => (
            <div key={j} style={{ fontSize: pipSize, color: sc, lineHeight: 0.9, transform: i===1 && col.length>1 && j===col.length-1 ? "rotate(180deg)" : "none" }}>{p}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DeadCardOverlay(){
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(231,76,60,0.18)", pointerEvents:"none" }}>
      <div style={{ fontFamily:FM, fontWeight:700, fontSize:15, letterSpacing:"0.25em", color:"#fff", background:"#e74c3c", padding:"2px 6px", borderRadius:3, transform:"rotate(-12deg)" }}>DUP</div>
    </div>
  );
}

function CardFaceA({ value, suit, deck, size="normal", dim=false, dead=false }){
  const s = SIZES[size] || SIZES.normal;
  const sc = suitColor(suit);
  const accent = deck.accent;
  const isFace = ["J","Q","K","A"].includes(value);
  const numVal = parseInt(value, 10);
  const isStandardPip = !isFace && !isNaN(numVal) && numVal >= 2 && numVal <= 10 && SUITS[suit];
  const motif = isFace ? (FACE_MOTIF[deck.id]?.[value] ?? value) : null;
  const bg = "#fbf6e8";
  const bg2 = "#efe6cc";
  const ink = "#1a160d";

  const corner = (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", lineHeight:1, color:sc, fontFamily:FM, fontWeight:700 }}>
      <div style={{ fontSize: s.num, letterSpacing:"-0.04em" }}>{value}</div>
      {SUITS[suit] ? <div style={{ fontSize: s.suit, marginTop:1 }}>{SUITS[suit].glyph}</div> : null}
    </div>
  );

  return (
    <div style={{
      width: s.w, height: s.h, borderRadius: 7,
      background: `radial-gradient(120% 90% at 50% 0%, ${bg} 0%, ${bg2} 100%)`,
      color: ink, position:"relative", overflow:"hidden",
      border: `1px solid ${dead ? "#7a3a36" : "rgba(0,0,0,0.35)"}`,
      boxShadow: dead
        ? `inset 0 0 0 1px rgba(0,0,0,0.4), 0 0 0 2px rgba(231,76,60,0.4), 0 8px 18px -4px rgba(0,0,0,0.7)`
        : `inset 0 0 0 1px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 14px -4px rgba(0,0,0,0.7)`,
      opacity: dim ? 0.5 : 1, filter: dead ? "grayscale(0.6)" : "none",
      transition: "transform 200ms ease, opacity 200ms ease",
      flexShrink: 0,
    }}>
      <div style={{ position:"absolute", inset:4, borderRadius:5, border:`1px solid ${accent}55`, boxShadow:`inset 0 0 0 2px ${bg}` }} />
      <div style={{ position:"absolute", inset:7, borderRadius:4, border:`0.5px solid ${accent}aa` }} />

      <div style={{ position:"absolute", top: s.w * 0.07, left: s.w * 0.07 }}>{corner}</div>
      <div style={{ position:"absolute", bottom: s.w * 0.07, right: s.w * 0.07, transform:"rotate(180deg)", transformOrigin:"center" }}>{corner}</div>

      <div style={{ position:"absolute", inset: s.w * 0.18, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
        {isStandardPip ? (
          <PipColumn value={value} suit={suit} size={size} accent={accent} />
        ) : (
          <div style={{ fontFamily: F.display, fontSize: isFace ? s.motif : Math.max(22, s.motif * 0.7), color: sc, lineHeight:1, fontWeight:700, textShadow:`0 1px 0 rgba(0,0,0,0.1)` }}>{motif ?? value}</div>
        )}
        {isFace ? (
          <div style={{ position:"absolute", bottom:-2, fontFamily: F.mono, fontSize: Math.max(11, s.suit * 0.45), letterSpacing:"0.2em", color:`${accent}cc`, textTransform:"uppercase" }}>{deck.id}</div>
        ) : null}
      </div>

      {dead ? <DeadCardOverlay /> : null}
    </div>
  );
}

function CardBackA({ deck, size="normal", glow=false, onClick, pulse, showLabel=true }){
  const s = SIZES[size] || SIZES.normal;
  const a = deck.accent;
  const wrapStyle = {
    width: s.w, height: s.h, borderRadius: 7,
    background: `radial-gradient(80% 60% at 50% 35%, ${a}22 0%, transparent 70%), linear-gradient(180deg, ${deck.bg} 0%, ${deck.bgInk} 100%)`,
    position:"relative", overflow:"hidden",
    border:`1px solid ${a}66`,
    boxShadow: glow
      ? `0 0 0 2px ${a}55, 0 0 26px ${a}77, inset 0 0 14px rgba(0,0,0,0.5)`
      : `inset 0 0 12px rgba(0,0,0,0.55), 0 6px 14px -4px rgba(0,0,0,0.7)`,
    cursor: onClick ? "pointer" : "default",
    flexShrink: 0,
    animation: pulse ? "pulse 1.6s ease-in-out infinite" : undefined,
    transition: "transform 160ms ease",
  };
  const inner = (
    <>
      <div style={{ position:"absolute", inset:4, borderRadius:5, border:`1px solid ${a}55` }} />
      <div style={{ position:"absolute", inset:8, borderRadius:4, border:`0.5px dashed ${a}44` }} />
      {[
        { top:5, left:5 }, { top:5, right:5 }, { bottom:5, left:5 }, { bottom:5, right:5 },
      ].map((p,i)=>(
        <div key={i} style={{ position:"absolute", ...p, width: s.w*0.18, height: s.w*0.18, borderRadius:"50%", border:`1px solid ${a}88`, boxShadow:`inset 0 0 0 2px ${deck.bg}, inset 0 0 0 3px ${a}44` }}/>
      ))}
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
        <div style={{ fontFamily: F.display, fontSize: showLabel ? s.motif * 1.1 : s.motif * 1.45, color: a, textShadow:`0 0 12px ${a}99`, lineHeight:1, fontWeight:700 }}>{deck.glyph}</div>
        {showLabel ? (
          <div style={{ fontFamily: F.mono, fontWeight:700, fontSize: Math.max(11, Math.min(13, s.w * 0.13)), letterSpacing: s.w < 90 ? "0.08em" : "0.22em", color:`${a}dd`, marginTop:6, textTransform:"uppercase", maxWidth: s.w - 12, overflow:"hidden", whiteSpace:"nowrap", textAlign:"center" }}>{deck.id}</div>
        ) : null}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} style={{ ...wrapStyle, padding:0, color:"inherit" }}
        onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}
      >
        {inner}
      </button>
    );
  }
  return <div style={wrapStyle}>{inner}</div>;
}

// ============================================================
// RENDER CARD ADAPTER
// ============================================================
function RenderCard({ card, deckId, size="normal", dim, dead }){
  const dv = DECK_VISUAL[deckId];
  if (card.isPower || card.isNull || card.isCrit || card.isPoisoned) {
    return <Card card={card} small={size==="small"} tiny={size==="tiny"} dead={dead||card.dead} deckColor={dv.accent} />;
  }
  const suitName = SUIT_TO_NAME[card.suit];
  if (!suitName) {
    return <Card card={card} small={size==="small"} tiny={size==="tiny"} dead={dead||card.dead} deckColor={dv.accent} />;
  }
  const value = card.display || String(card.value);
  return <CardFaceA value={value} suit={suitName} deck={dv} size={size} dim={dim} dead={dead||card.dead} />;
}

// ============================================================
// PLAYER PANEL (Variation A, handoff-derived, adapted for game state)
// ============================================================
function PlayerPanel({ name, ps, deckId, isActive, isYour, hasPoisoned, config }){
  const accent = isYour ? THEME.gold : THEME.red;
  const dead = !ps.alive;
  const cashed = ps.cashedOut;
  const status = dead ? "DEAD" : cashed ? "CASHED" : isActive ? "ACTIVE" : "WAITING";
  const statusColor = dead ? THEME.red : cashed ? THEME.green : isActive ? accent : THEME.textMute;
  const dotColor = dead ? THEME.red : cashed ? THEME.green : isActive ? accent : THEME.textMute;
  const score = dead ? "0" : ps.score.toLocaleString();

  return (
    <div style={{
      padding:"12px 14px",
      background: `linear-gradient(180deg, ${dead ? "#1a0a0a" : "#0c0d14"} 0%, #07080c 100%)`,
      border: `1px solid ${dead ? "#7a3a36" : (isActive ? `${accent}66` : THEME.line)}`,
      borderRadius: 14,
      transition: "border 160ms, background 160ms",
      position: "relative",
      width: "100%",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background: dotColor, boxShadow:`0 0 8px ${dotColor}88`, flexShrink:0 }}/>
        <div style={{ fontFamily: F.display, fontSize:16, fontWeight:700, color:"#f4eedd", letterSpacing:"0.06em", flex:1, minWidth:60 }}>{name}</div>
        {hasPoisoned && (
          <div style={{ fontFamily: F.mono, fontSize:11, fontWeight:700, letterSpacing:"0.18em", padding:"2px 6px", border:`1px solid #9b59b6`, color:"#c39bd3", borderRadius:4, background:"rgba(155,89,182,0.12)" }}>☠ POISON</div>
        )}
        {config?.special==="modifier" && ps.cursed && (
          <div style={{ fontFamily: F.mono, fontSize:11, fontWeight:700, letterSpacing:"0.18em", padding:"2px 6px", border:`1px solid ${THEME.red}`, color: THEME.red, borderRadius:4, background:"rgba(231,76,60,0.12)" }}>CURSED</div>
        )}
        {config?.special==="secondbite" && (
          <div style={{ fontFamily: F.mono, fontSize:11, fontWeight:700, letterSpacing:"0.18em", padding:"2px 6px", border:`1px solid ${ps.secondBiteUsed ? "#7a3a36" : THEME.green}`, color: ps.secondBiteUsed ? "#7a3a36" : THEME.green, borderRadius:4 }}>
            {ps.secondBiteUsed ? "BITE USED" : "BITE READY"}
          </div>
        )}
        <div style={{ fontFamily: F.mono, fontSize:11, fontWeight:700, letterSpacing:"0.18em", padding:"3px 7px", border:`1px solid ${statusColor}`, color: statusColor, borderRadius:4, background:`${statusColor}10` }}>{status}</div>
        <div style={{ fontFamily: F.mono, fontSize:22, fontWeight:700, color: dead ? THEME.red : accent, letterSpacing:"-0.04em", minWidth:36, textAlign:"right" }}>{score}</div>
      </div>

      <div style={{ marginTop:10, display:"flex", gap:6, overflowX:"auto", minHeight: SIZES.tiny.h, alignItems:"center" }}>
        {ps.drawn.length === 0 ? (
          <div style={{ fontFamily: F.mono, fontSize:13, color: THEME.textMute, letterSpacing:"0.18em", padding:"0 4px" }}>NO CARDS YET</div>
        ) : ps.drawn.map((c, i) => (
          <div key={i} style={{ flex:"none" }}>
            <RenderCard card={c} deckId={deckId} size="tiny" dead={c.dead} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TURN BANNER
// ============================================================
function TurnBanner({ yourTurn, label, isYour=true }){
  const color = yourTurn ? (isYour ? THEME.gold : THEME.red) : THEME.red;
  return (
    <div style={{
      position:"relative", padding:"12px 14px", textAlign:"center",
      borderRadius:12,
      background: `linear-gradient(90deg, ${color}10 0%, ${color}25 50%, ${color}10 100%)`,
      border:`1px solid ${color}77`, overflow:"hidden",
    }}>
      <div style={{ fontFamily: F.display, fontSize:16, fontWeight:700, color, letterSpacing:"0.18em", textTransform:"uppercase" }}>
        ◆ {label} ◆
      </div>
    </div>
  );
}

// ============================================================
// SCORE + TENSION PANEL  (with multPop)
// ============================================================
function ScoreTensionPanel({ youName, botName, you, bot, ratio, deadlyN, totalN, multPop, onMultPopEnd }){
  const tier = tensionFor(ratio);
  const total = Math.max(1, you + bot);
  const youPct = (you / total) * 100;
  return (
    <div style={{
      padding:"12px 14px",
      background:"linear-gradient(180deg, #0d0e16 0%, #07080c 100%)",
      border:`1px solid ${THEME.line}`, borderRadius:12,
      position:"relative",
    }}>
      {multPop && (
        <div key={multPop.key} onAnimationEnd={onMultPopEnd}
          style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
            fontSize:22, fontWeight:900, fontFamily: F.mono, color:"#f1c40f",
            textShadow:"0 0 16px rgba(241,196,15,0.7)",
            pointerEvents:"none", animation:"multPop 0.9s ease-out forwards",
            whiteSpace:"nowrap", zIndex:20 }}>
          ×{multPop.val}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center" }}>
        <div style={{ textAlign:"left" }}>
          <div style={{ fontFamily: F.mono, fontSize:11, letterSpacing:"0.22em", color: THEME.textMute }}>{youName}</div>
          <div style={{ fontFamily: F.display, fontSize:28, fontWeight:700, color: THEME.gold, lineHeight:1, letterSpacing:"-0.04em" }}>{you.toLocaleString()}</div>
        </div>
        <div style={{ fontFamily: F.mono, fontSize:16, color: you > bot ? THEME.gold : (bot > you ? THEME.red : THEME.textMute) }}>
          {you > bot ? "◀" : bot > you ? "▶" : "="}
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily: F.mono, fontSize:11, letterSpacing:"0.22em", color: THEME.textMute }}>{botName}</div>
          <div style={{ fontFamily: F.display, fontSize:28, fontWeight:700, color: THEME.red, lineHeight:1, letterSpacing:"-0.04em" }}>{bot.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginTop:10, height:4, background:"#1a1b25", borderRadius:2, overflow:"hidden", display:"flex" }}>
        <div style={{ width:`${youPct}%`, background: THEME.gold, transition:"width 300ms" }} />
        <div style={{ width:`${100 - youPct}%`, background: THEME.red, transition:"width 300ms" }} />
      </div>

      {totalN > 0 && (
        <>
          <div style={{ marginTop:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontFamily: F.mono, fontSize:13, fontWeight:700, letterSpacing:"0.2em", color: tier.color }}>{tier.label}</div>
            <div style={{ fontFamily: F.mono, fontSize:12, color: THEME.textDim, letterSpacing:"0.18em" }}>{deadlyN}/{totalN} WILL FINISH YOU</div>
          </div>
          <div style={{ marginTop:6, height:6, borderRadius:3, background:"#1a1b25", overflow:"hidden", position:"relative" }}>
            <div style={{ width: `${Math.min(100, ratio * 200)}%`, height:"100%",
              background: `linear-gradient(90deg, ${THEME.green} 0%, ${THEME.gold} 50%, ${THEME.red} 100%)`,
              transition:"width 300ms" }} />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// BATTLEFIELD
// ============================================================
function Battlefield({ deckId, deckCount, lastCard, onDraw, disabled, yourTurn, drawingPulse }){
  const dv = DECK_VISUAL[deckId];
  return (
    <div style={{ padding:"16px 0", display:"flex", alignItems:"center", justifyContent:"center", gap:18, position:"relative" }}>
      <div style={{ width: SIZES.normal.w, height: SIZES.normal.h, opacity: 0 }} />
      <button onClick={onDraw} disabled={disabled} aria-label="Draw a card" style={{
        padding:0, background:"transparent", border:"none",
        cursor: disabled ? "default" : "pointer",
        transform: drawingPulse ? "translateY(-3px)" : "none",
        transition:"transform 200ms",
        filter: disabled ? "grayscale(0.4) brightness(0.7)" : "none",
      }}>
        <CardBackA deck={dv} size="normal" glow={yourTurn && !disabled} />
      </button>
      <div style={{ position:"absolute", left:"50%", bottom:-2, transform:"translateX(-110px)", fontFamily: F.mono, fontSize:13, color: THEME.textDim, letterSpacing:"0.2em" }}>{deckCount} LEFT</div>

      <div style={{ position:"relative", width: SIZES.normal.w, height: SIZES.normal.h }}>
        {lastCard ? (
          <div style={{ position:"absolute", inset:0, animation:"flip .4s ease-out" }} key={lastCard._key||0}>
            <RenderCard card={lastCard} deckId={deckId} size="normal" />
          </div>
        ) : (
          <div style={{
            width:"100%", height:"100%",
            border: `1px dashed ${THEME.line}`, borderRadius:7,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily: F.mono, fontSize:13, color: THEME.textMute,
            letterSpacing:"0.18em", textAlign:"center", padding:8,
          }}>LAST<br/>DRAW</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CASH OUT (Variation A)
// ============================================================
function CashOutA({ score, onCash, tension, disabled, label="CASH OUT" }){
  const tier = tensionFor(tension || 0);
  const pulseMs = Math.max(600, 1500 - (tension || 0) * 1800);
  return (
    <button onClick={onCash} disabled={disabled} style={{
      width:"100%", padding:"18px 18px",
      background: `linear-gradient(180deg, ${THEME.green}33 0%, ${THEME.greenDim}66 100%)`,
      color: THEME.green, border: `2px solid ${THEME.green}`,
      borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: F.display, fontSize: 20, fontWeight: 700,
      letterSpacing: "0.16em", textTransform: "uppercase",
      position: "relative", overflow: "hidden",
      animation: `cash-breathe ${pulseMs}ms ease-in-out infinite`,
      boxShadow: `0 0 24px ${THEME.green}55, inset 0 0 18px rgba(46,204,113,0.18)`,
      opacity: disabled ? 0.4 : 1,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
        <span>{label}</span>
        <span style={{ fontFamily: F.mono, fontSize: 20, color: "#aaffcc" }}>+{score.toLocaleString()}</span>
      </div>
      <div style={{ marginTop:4, fontFamily: F.mono, fontSize:12, color:"#7eddae", letterSpacing:"0.22em", opacity:0.85 }}>LOCK · {tier.label}</div>
    </button>
  );
}

// ============================================================
// SECTION LABEL
// ============================================================
function SectionLabel({ children, accent }){
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, margin:"22px 0 12px" }}>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg, transparent, ${THEME.line})` }} />
      <div style={{ fontFamily: F.mono, fontSize:12, letterSpacing:"0.3em", color: accent ?? THEME.textDim }}>{children}</div>
      <div style={{ flex:1, height:1, background:`linear-gradient(270deg, transparent, ${THEME.line})` }} />
    </div>
  );
}

function StatBar({ stats }){
  const cells = [
    { v: stats.wins, label:"WINS", color: THEME.green },
    { v: stats.losses, label:"LOSSES", color: THEME.red },
    { v: stats.streak, label:"STREAK", color: THEME.gold },
    { v: stats.winrate + "%", label:"WIN RATE", color: "#bcb6a3" },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:0,
      border:`1px solid ${THEME.line}`, borderRadius:10, overflow:"hidden",
      background:"rgba(20,20,28,0.5)" }}>
      {cells.map((c, i) => (
        <div key={i} style={{ padding:"14px 10px", textAlign:"center", borderRight: i<3 ? `1px solid ${THEME.line}` : "none" }}>
          <div style={{ fontFamily: F.display, fontSize:26, fontWeight:700, color: c.color, lineHeight:1 }}>{c.v}</div>
          <div style={{ fontFamily: F.mono, fontSize:11, letterSpacing:"0.22em", color: THEME.textMute, marginTop:6 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// DECK SELECT
// ============================================================
function DeckRowA({ deck, onPick, focused, best, isDaily }){
  return (
    <button onClick={() => onPick(deck.id)} style={{
      display:"flex", alignItems:"center", gap:14,
      width:"100%", padding:14, marginBottom:10,
      background:`linear-gradient(180deg, ${deck.bg} 0%, ${deck.bgInk} 100%)`,
      border:`1px solid ${focused ? deck.accent : THEME.line}`,
      borderRadius:12, color: THEME.text,
      cursor:"pointer", textAlign:"left",
      boxShadow: focused ? `0 0 0 2px ${deck.accent}33, inset 0 0 22px ${deck.accent}10` : "none",
      position:"relative", overflow:"hidden",
      transition:"border 200ms, box-shadow 200ms, transform 160ms",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.borderColor=`${deck.accent}88`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor= focused ? deck.accent : THEME.line;}}
    >
      <div style={{ flex:"none" }}>
        <CardBackA deck={deck} size="medium" showLabel={false} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily: F.display, fontSize:18, fontWeight:700, color:"#f4eedd", letterSpacing:"0.04em" }}>
          {deck.name}
        </div>
        <div style={{ fontFamily: F.display, fontSize:14, fontStyle:"italic", color: THEME.textDim, marginTop:2 }}>
          {deck.tag}
        </div>
        <div style={{ fontFamily: F.mono, fontSize:11, color: THEME.textMute, letterSpacing:"0.18em", marginTop:6 }}>
          {deck.cardCount} CARDS · {deck.feel.toUpperCase()}
        </div>
      </div>
      <div style={{ flex:"none", textAlign:"right" }}>
        <div style={{ fontFamily: F.display, fontSize:22, fontWeight:700, color: deck.accent, lineHeight:1 }}>
          {best > 0 ? best.toLocaleString() : "—"}
        </div>
        <div style={{ fontFamily: F.mono, fontSize:11, color: THEME.textMute, letterSpacing:"0.22em", marginTop:4 }}>BEST</div>
      </div>
      {isDaily ? (
        <div style={{ position:"absolute", top:0, right:0,
          background: deck.accent, color:"#0a0a0c",
          fontFamily: F.mono, fontSize:11, fontWeight:700,
          letterSpacing:"0.2em", padding:"3px 10px",
          borderBottomLeftRadius:6 }}>TODAY</div>
      ) : null}
    </button>
  );
}

function DeckSelect({ onSelect, highScores, winRecord, onHelp }){
  const wr = { wins:0, losses:0, streak:0, bestStreak:0, ...(winRecord||{}) };
  const totalStats = {
    wins: wr.wins,
    losses: wr.losses,
    streak: wr.streak,
    winrate: wr.wins + wr.losses > 0
      ? Math.round(wr.wins / (wr.wins + wr.losses) * 100) : 0,
  };
  const baseIds = DECK_ORDER.filter(id => DECK_VISUAL[id].tier === "base");
  const premiumIds = DECK_ORDER.filter(id => DECK_VISUAL[id].tier === "premium");
  const dailyId = getDailyDeck();

  return (
    <div style={{ minHeight:"100vh",
      background:"radial-gradient(ellipse at 50% 0%, #16162a 0%, #06060a 60%)",
      animation:"screenIn 0.3s ease-out",
    }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ padding:"18px 18px 32px", maxWidth:520, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginTop:4, marginBottom:22 }}>
          <div style={{ fontFamily: F.mono, fontSize:15, letterSpacing:"0.4em", color: THEME.gold, marginBottom:8 }}>×</div>
          <h1 style={{ fontFamily: F.display, fontSize:26, margin:0, letterSpacing:"0.06em", color:"#f4eedd", fontWeight:700 }}>CARD MULTIPLIER</h1>
          <div style={{ fontFamily: F.mono, fontSize:12, letterSpacing:"0.32em", color: THEME.textDim, marginTop:8 }}>CHOOSE YOUR DECK</div>
          <button onClick={onHelp} style={{
            marginTop:14, padding:"7px 16px",
            background:"rgba(212,175,55,0.08)", color: THEME.gold,
            border:`1px solid ${THEME.gold}55`, borderRadius:999, cursor:"pointer",
            fontFamily: F.mono, fontSize:11, fontWeight:700, letterSpacing:"0.2em",
          }}>? HOW TO PLAY</button>
        </div>

        <StatBar stats={totalStats} />

        <SectionLabel accent={THEME.gold}>BASE</SectionLabel>
        {baseIds.map(id => (
          <DeckRowA key={id} deck={DECK_VISUAL[id]} onPick={onSelect} best={highScores[id] || 0} isDaily={false} />
        ))}

        <SectionLabel accent={"#c08fda"}>PREMIUM</SectionLabel>
        {premiumIds.map(id => (
          <DeckRowA key={id} deck={DECK_VISUAL[id]} onPick={onSelect} best={highScores[id] || 0} isDaily={id === dailyId} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MODE SELECT
// ============================================================
function ModeRow({ label, sub, badgeText, badgeColor, onClick }){
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:14,
      width:"100%", padding:"14px 16px", marginBottom:8,
      background:"linear-gradient(180deg, #14141d 0%, #0a0a10 100%)",
      border:`1px solid ${THEME.line}`, borderRadius:12,
      color: THEME.text, cursor:"pointer", textAlign:"left",
      transition:"border 160ms, background 160ms, transform 120ms",
    }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor = badgeColor;e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor = THEME.line;e.currentTarget.style.transform="";}}
    >
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily: F.display, fontSize:18, fontWeight:700, color:"#f4eedd" }}>{label}</div>
        <div style={{ fontFamily: F.mono, fontSize:12, color: THEME.textDim, marginTop:4 }}>{sub}</div>
      </div>
      <div style={{ flex:"none", padding:"4px 10px", borderRadius:4,
        background:`${badgeColor}1f`, border:`1px solid ${badgeColor}`,
        color: badgeColor, fontFamily: F.mono, fontSize:11, fontWeight:700, letterSpacing:"0.14em" }}>{badgeText}</div>
    </button>
  );
}

function ModeSelect({ deckId, onMode, onBack }){
  const dv = DECK_VISUAL[deckId];
  return (
    <div style={{ minHeight:"100vh",
      background:`radial-gradient(ellipse at 50% 0%, ${dv.bg} 0%, ${dv.bgInk} 60%)`,
      animation:"screenIn 0.3s ease-out",
    }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ padding:"18px 18px 32px", maxWidth:520, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginTop:4, marginBottom:18 }}>
          <div style={{ display:"inline-block", marginBottom:14 }}>
            <CardBackA deck={dv} size="small" />
          </div>
          <h1 style={{ fontFamily: F.display, fontSize:30, margin:0, letterSpacing:"0.05em", color: dv.accent, fontWeight:700 }}>{dv.name}</h1>
          <div style={{ fontFamily: F.mono, fontSize:12, letterSpacing:"0.22em", color: THEME.textDim, marginTop:8 }}>{dv.cardCount} CARDS · BEST OF 3 ROUNDS</div>
        </div>

        {DECK_RULES[deckId] && (
          <div style={{
            padding:"14px 16px", marginBottom:4,
            background:`linear-gradient(180deg, ${dv.accentSoft} 0%, rgba(0,0,0,0.18) 100%)`,
            border:`1px solid ${dv.accent}44`, borderRadius:12,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontFamily: F.display, fontSize:18, color: dv.accent, lineHeight:1 }}>{dv.glyph}</span>
              <span style={{ fontFamily: F.mono, fontSize:11, fontWeight:700, letterSpacing:"0.24em", color: dv.accent }}>HOW THIS DECK PLAYS</span>
            </div>
            <div style={{ fontFamily: F.mono, fontSize:13, lineHeight:1.6, color: THEME.textDim }}>{DECK_RULES[deckId]}</div>
          </div>
        )}

        <SectionLabel accent={dv.accent}>PLAY MODES</SectionLabel>
        <ModeRow label="Local 1v1" sub="Pass and play on the same device" badgeText="2 PLAYERS" badgeColor={dv.accent} onClick={() => onMode("local")} />
        <ModeRow label="Solo" sub="Chase your personal high score" badgeText="1 PLAYER" badgeColor={dv.accent} onClick={() => onMode("solo")} />

        <SectionLabel accent={THEME.red}>VS BOT</SectionLabel>
        <ModeRow label="Timid Bot" sub="Cashes early. Easy to outplay." badgeText="EASY" badgeColor={THEME.green} onClick={() => onMode("timid")} />
        <ModeRow label="Calculator Bot" sub="Plays expected value. Tough." badgeText="HARD" badgeColor={THEME.red} onClick={() => onMode("calculator")} />
        <ModeRow label="Chaos Bot" sub="Wildly unpredictable." badgeText="WILD" badgeColor={THEME.gold} onClick={() => onMode("chaos")} />
        <ModeRow label="Mimic Bot" sub="Copies your risk tolerance." badgeText="ADAPTIVE" badgeColor={"#a96cc4"} onClick={() => onMode("mimic")} />

        <button onClick={onBack} style={{
          width:"100%", marginTop:18, padding:"14px",
          background:"transparent", color: THEME.textDim,
          border:`1px solid ${THEME.line}`, borderRadius:12,
          fontFamily: F.mono, fontSize:13, letterSpacing:"0.18em", cursor:"pointer",
        }}>← BACK TO DECKS</button>
      </div>
    </div>
  );
}

// ============================================================
// ROUND RESULT OVERLAY
// ============================================================
function RoundResultOverlay({ result, you, bot, onContinue, roundNum }){
  const won = result === "you";
  const lost = result === "bot";
  const tie = result === "tie";
  const headline = won ? "ROUND TAKEN" : lost ? "ROUND LOST" : "STALEMATE";
  const color = won ? THEME.gold : lost ? THEME.red : THEME.textDim;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:50,
      background: `radial-gradient(60% 50% at 50% 50%, ${color}25 0%, rgba(0,0,0,0.92) 70%)`,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      animation:"fade-in 220ms ease",
      padding:20,
    }}>
      <div style={{ fontFamily: F.mono, fontSize:13, letterSpacing:"0.4em", color: THEME.textDim, marginBottom:14 }}>
        ROUND {roundNum} · {tie ? "TIE" : won ? "WIN" : "LOSS"}
      </div>
      <h2 style={{
        fontFamily: F.display, fontSize:54, fontWeight:800,
        color, margin:0, letterSpacing:"0.04em",
        textShadow:`0 0 30px ${color}66`,
      }}>{headline}</h2>
      <div style={{ marginTop:26, display:"flex", gap:30, alignItems:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily: F.mono, fontSize:13, letterSpacing:"0.22em", color: THEME.textMute }}>YOU</div>
          <div style={{ fontFamily: F.display, fontSize:44, fontWeight:800, color: THEME.gold, lineHeight:1 }}>{you.toLocaleString()}</div>
        </div>
        <div style={{ fontFamily: F.mono, fontSize:13, color: THEME.textMute }}>VS</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily: F.mono, fontSize:13, letterSpacing:"0.22em", color: THEME.textMute }}>OPPONENT</div>
          <div style={{ fontFamily: F.display, fontSize:44, fontWeight:800, color: THEME.red, lineHeight:1 }}>{bot.toLocaleString()}</div>
        </div>
      </div>
      <button onClick={onContinue} style={{
        marginTop:32, padding:"14px 36px",
        background:`${color}22`, color, border:`1px solid ${color}`,
        borderRadius:12, cursor:"pointer",
        fontFamily: F.mono, fontSize:13, fontWeight:700, letterSpacing:"0.22em",
      }}>NEXT ROUND →</button>
    </div>
  );
}

// ============================================================
// MATCH END OVERLAY
// ============================================================
function MatchEndOverlay({ won, deck, history, totalYou, totalBot, onRematch, onDecks }){
  const headline = won ? "VICTORY" : "DEFEATED";
  const color = won ? THEME.gold : THEME.red;
  const subline = won ? "You read the deck. The deck read you back." : "The deck always wins. Eventually.";

  const particles = [];
  for (let i = 0; i < 28; i++) {
    const left = (i * 37) % 100;
    const delay = (i * 113) % 1800;
    const dur = 2200 + (i * 53) % 1500;
    particles.push(
      <div key={i} style={{
        position:"absolute", left:`${left}%`, top:"-20px",
        width:3, height:3, borderRadius:"50%",
        background: color,
        boxShadow:`0 0 6px ${color}`,
        animation:`fall ${dur}ms linear ${delay}ms infinite`,
        opacity:0.6,
      }} />
    );
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:60, overflow:"hidden",
      background: `radial-gradient(70% 60% at 50% 40%, ${color}20 0%, rgba(0,0,0,0.95) 70%), #04050a`,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      animation:"fade-in 320ms ease",
      padding:20,
    }}>
      {particles}

      <div style={{ fontFamily: F.mono, fontSize:13, letterSpacing:"0.4em", color: THEME.textDim, marginBottom:20 }}>
        {deck.name} · BEST OF 3
      </div>

      <h1 style={{
        fontFamily: F.display, fontSize:84, fontWeight:800,
        color, margin:0, letterSpacing:"0.04em",
        textShadow:`0 0 50px ${color}88`,
        lineHeight:1, animation:"pop 600ms cubic-bezier(0.2,1.4,0.4,1)",
      }}>{headline}</h1>
      <div style={{
        fontFamily: F.display, fontSize:14, color: THEME.textDim,
        marginTop:14, fontStyle:"italic", maxWidth:320, textAlign:"center",
      }}>{subline}</div>

      {history && history.length > 0 && (
        <div style={{ marginTop:36, display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
          {history.map((h, i) => (
            <div key={i} style={{
              padding:"10px 14px",
              border:`1px solid ${h.winner === "you" ? THEME.gold : h.winner === "bot" ? THEME.red : THEME.line}`,
              borderRadius:8,
              background:"rgba(0,0,0,0.4)",
              textAlign:"center", minWidth:78,
            }}>
              <div style={{ fontFamily: F.mono, fontSize:11, letterSpacing:"0.22em", color: THEME.textMute }}>R{i+1}</div>
              <div style={{ display:"flex", gap:6, marginTop:6, alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily: F.mono, fontSize:13, fontWeight:700, color: THEME.gold }}>{h.ys}</span>
                <span style={{ fontFamily: F.mono, fontSize:13, color: THEME.textMute }}>:</span>
                <span style={{ fontFamily: F.mono, fontSize:13, fontWeight:700, color: THEME.red }}>{h.bs}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop:26, display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily: F.mono, fontSize:13, letterSpacing:"0.22em", color: THEME.textMute }}>FINAL</div>
          <div style={{ fontFamily: F.mono, fontSize:26, fontWeight:700, color }}>{totalYou} : {totalBot}</div>
        </div>
      </div>

      <div style={{ marginTop:32, display:"flex", gap:10 }}>
        <button onClick={onRematch} style={{
          padding:"14px 28px",
          background:`${color}22`, color, border:`1px solid ${color}`,
          borderRadius:12, cursor:"pointer",
          fontFamily: F.mono, fontSize:13, fontWeight:700, letterSpacing:"0.22em",
        }}>REMATCH</button>
        <button onClick={onDecks} style={{
          padding:"14px 28px",
          background:"transparent", color: THEME.textDim, border:`1px solid ${THEME.line}`,
          borderRadius:12, cursor:"pointer",
          fontFamily: F.mono, fontSize:13, fontWeight:700, letterSpacing:"0.22em",
        }}>← DECKS</button>
      </div>
    </div>
  );
}

// ============================================================
// GLOBAL STYLES
// ============================================================
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
  @keyframes flip{0%{transform:rotateY(90deg) scale(.8);opacity:.3}50%{transform:rotateY(0) scale(1.08)}100%{transform:rotateY(0) scale(1)}}
  @keyframes pulse{0%,100%{box-shadow:0 3px 15px rgba(212,175,55,.3)}50%{box-shadow:0 3px 20px rgba(212,175,55,.5)}}
  @keyframes popIn{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes deathShake{0%,100%{transform:translate(0)}10%{transform:translate(-8px,-4px)}20%{transform:translate(8px,2px)}30%{transform:translate(-6px,4px)}40%{transform:translate(6px,-2px)}50%{transform:translate(-4px,2px)}60%{transform:translate(4px,-1px)}70%{transform:translate(-2px,1px)}80%{transform:translate(2px,0)}}
  @keyframes deathFlash{0%{opacity:0}15%{opacity:1}30%{opacity:0.2}50%{opacity:1}70%{opacity:0.3}100%{opacity:1}}
  @keyframes tensionPulse{0%,100%{transform:scaleX(1)}50%{transform:scaleX(1.015)}}
  @keyframes criticalShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
  @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1.1)}80%{opacity:0.8}100%{opacity:0;transform:translateY(-58px) scale(0.7)}}
  @keyframes screenIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes thinkDot{0%,100%{opacity:0.2;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
  @keyframes critGlow{0%,100%{box-shadow:inset 0 0 0 0 rgba(255,23,68,0),0 0 0 0 rgba(255,23,68,0)}50%{box-shadow:inset 0 0 60px 0 rgba(255,23,68,0.08),0 0 30px 0 rgba(255,23,68,0.15)}}
  @keyframes multPop{0%{opacity:0;transform:scale(0.4) translateY(8px) translateX(-50%)}30%{opacity:1;transform:scale(1.25) translateY(-4px) translateX(-50%)}100%{opacity:0;transform:scale(0.8) translateY(-56px) translateX(-50%)}}
  @keyframes scoreBarSlide{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
  @keyframes cash-breathe { 0%,100% { box-shadow: 0 0 18px rgba(46,204,113,0.3), inset 0 0 12px rgba(46,204,113,0.08); transform: scaleY(1); } 50% { box-shadow: 0 0 32px rgba(46,204,113,0.55), inset 0 0 20px rgba(46,204,113,0.18); transform: scaleY(1.015); } }
  @keyframes fall { 0% { transform: translateY(-20px); opacity: 0.6; } 100% { transform: translateY(110vh); opacity: 0; } }
  @keyframes pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes glitch-in { 0%,20%,40%,60%,80% { opacity: 0; transform: skewX(-6deg) translateX(-4px); } 10%,30%,50%,70% { opacity: 1; transform: skewX(3deg) translateX(2px); } 100% { opacity: 1; transform: none; } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  *{box-sizing:border-box;margin:0;padding:0}button{font-family:inherit}
  body{background:#06060a;color:#e8e6df}
  ::-webkit-scrollbar{height:4px;width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#262838;border-radius:2px}
`;

// ============================================================
// DUEL GAME — Variation A layout, original logic preserved
// ============================================================
function DuelGame({deckId,difficulty,onBack,highScores,setHighScores,onWin,onLoss,isLocal}){
  const config=DECKS[deckId];
  const dv=DECK_VISUAL[deckId];
  const p1Label=isLocal?"P1":"YOU";
  const p2Label=isLocal?"P2":(difficulty==="timid"?"TIMID BOT":difficulty==="calculator"?"CALCULATOR BOT":difficulty==="chaos"?"CHAOS BOT":difficulty==="mimic"?"MIMIC BOT":"BOT");

  // Round-level state
  const [deck,setDeck]=useState([]);
  const [you,setYou]=useState(newPlayerState());
  const [bot,setBot]=useState(newPlayerState());
  const [turn,setTurn]=useState("you");
  const [phase,setPhase]=useState("idle");
  const [poisonPhase,setPoisonPhase]=useState(null);
  const [msg,setMsg]=useState("");
  const [lastCard,setLastCard]=useState(null);
  const [flipping,setFlipping]=useState(false);
  const [deckPoisoned,setDeckPoisoned]=useState(false);
  const [youPoisoned,setYouPoisoned]=useState(false);
  const [botPoisoned,setBotPoisoned]=useState(false);

  // Power card state
  const [peekCards,setPeekCards]=useState([]);
  const [peekVisible,setPeekVisible]=useState(false);
  const [skipPending,setSkipPending]=useState(null);

  // Match-level state
  const [roundNum,setRoundNum]=useState(1);
  const [roundWins,setRoundWins]=useState({you:0,bot:0});
  const [matchOver,setMatchOver]=useState(false);
  const [showRoundResult,setShowRoundResult]=useState(false);
  const [roundResult,setRoundResult]=useState(null);
  const [bestScore,setBestScore]=useState(0);
  const [roundHistory,setRoundHistory]=useState([]);

  // Death animation
  const [deathAnim,setDeathAnim]=useState(null);

  // What-if
  const [whatIfData,setWhatIfData]=useState(null);

  // Multiplier pop
  const [multPop,setMultPop]=useState(null);

  // Round advance ref guard (prevents double-fire of round-result auto-advance)
  const advanceRoundRef=useRef(null);

  // ---- Round / Match management ----
  const startRound=useCallback((rn)=>{
    const d=buildDuelDeck(config,rn);
    setDeck(d);setYou(newPlayerState());setBot(newPlayerState());
    setTurn("you");setPhase("playing");
    setMsg(rn===1?"Round 1 — Draw or cash out!":rn===2?"Round 2 — Deck is tighter!":"Final round — Every card counts!");
    setLastCard(null);setPoisonPhase(null);
    setDeckPoisoned(false);setYouPoisoned(false);setBotPoisoned(false);
    setPeekCards([]);setPeekVisible(false);setSkipPending(null);
    setDeathAnim(null);setWhatIfData(null);
    setRoundNum(rn);
  },[config]);

  const startMatch=useCallback(()=>{
    setRoundWins({you:0,bot:0});setMatchOver(false);
    setShowRoundResult(false);setRoundResult(null);setBestScore(0);
    setRoundHistory([]);
    advanceRoundRef.current=null;
    startRound(1);
  },[startRound]);

  useEffect(()=>{startMatch();},[startMatch]);

  const endRound=useCallback((winner,youState,botState,deckState)=>{
    const newWins={...roundWins};
    if(winner==="you")newWins.you++;
    else if(winner==="bot")newWins.bot++;
    setRoundWins(newWins);

    const roundBest=Math.max(bestScore,youState.score);
    setBestScore(roundBest);

    setRoundHistory(prev=>[...prev,{winner,ys:youState.score,bs:botState.score}]);

    const wif=computeWhatIfData(youState,botState,deckState,config);
    setWhatIfData(wif);

    if(!youState.alive) setDeathAnim(youState.drawn.some(c=>c.dead&&c.isPoisoned)?"poison":"normal");
    else if(!botState.alive) setDeathAnim(botState.drawn.some(c=>c.dead&&c.isPoisoned)?"poison":"normal");

    if(newWins.you>=2||newWins.bot>=2){
      setMatchOver(true);setPhase("over");
      if(newWins.you>=2){
        if(!isLocal)onWin();
        setMsg(isLocal?"P1 wins the match!":"Match won!");
        if(roundBest>(highScores[deckId]||0))setHighScores(p=>({...p,[deckId]:roundBest}));
      } else {
        if(!isLocal)onLoss();
        setMsg(isLocal?"P2 wins the match!":"Match lost!");
      }
    } else {
      setPhase("over");
      setRoundResult({winner,youScore:youState.score,botScore:botState.score});
      setShowRoundResult(true);
      const nextRn=roundNum+1;
      advanceRoundRef.current=()=>{
        advanceRoundRef.current=null;
        setShowRoundResult(false);setRoundResult(null);setDeathAnim(null);
        startRound(nextRn);
      };
      setTimeout(()=>{ if(advanceRoundRef.current) advanceRoundRef.current(); },2500);
    }
  },[roundWins,bestScore,config,deckId,highScores,setHighScores,onWin,onLoss,startRound,roundNum,isLocal]);

  const checkWin=useCallback((y,b,d)=>{
    if(!y.alive&&!b.alive){
      const w=y.drawn.length>=b.drawn.length?"you":"bot";
      endRound(w,y,b,d);return true;
    }
    if(!y.alive){endRound("bot",y,b,d);return true;}
    if(!b.alive){
      if(!y.cashedOut){setMsg("Opponent down! Keep drawing or cash out.");return false;}
      endRound("you",y,b,d);return true;
    }
    if(y.cashedOut&&b.cashedOut){
      const w=y.score>b.score?"you":y.score<b.score?"bot":"tie";
      if(w==="tie"){
        setMsg("Tie! Replaying round...");
        setTimeout(()=>startRound(roundNum),1500);
        return true;
      }
      endRound(w,y,b,d);return true;
    }
    if(d.length===0){
      const fy=y.cashedOut?y:{...y,cashedOut:true};
      const fb=b.cashedOut?b:{...b,cashedOut:true};
      setYou(fy);setBot(fb);
      const w=fy.score>fb.score?"you":fy.score<fb.score?"bot":"tie";
      if(w==="tie"){setMsg("Tie! Replaying round...");setTimeout(()=>startRound(roundNum),1500);return true;}
      endRound(w,fy,fb,d);return true;
    }
    return false;
  },[endRound,startRound,roundNum]);

  const injectPoison=useCallback((card,currentDeck)=>{
    const poisonCard={...card,isPoisoned:true,dead:false};
    const newDeck=shuffle([...currentDeck,poisonCard]);
    setDeck(newDeck);setDeckPoisoned(true);
    return newDeck;
  },[]);

  const executeDrawForPlayer=useCallback((who,currentYou,currentBot,currentDeck,cb)=>{
    if(currentDeck.length===0){cb(currentYou,currentBot,currentDeck);return;}
    const card=currentDeck[0];const rest=currentDeck.slice(1);
    setLastCard({...card,_key:Date.now()+Math.random()});setFlipping(true);
    setTimeout(()=>{
      setFlipping(false);
      const isYou=who==="you";
      const drawer=isYou?currentYou:currentBot;
      const opponent=isYou?currentBot:currentYou;
      const result=processDraw(card,drawer,rest,config,opponent);
      const newDrawer=result.ps;const newDeck=result.deck;
      const newYou=isYou?newDrawer:currentYou;
      const newBot=isYou?currentBot:newDrawer;
      if(isYou)setYou(newDrawer);else setBot(newDrawer);
      setDeck(newDeck);setMsg((isYou?"":(isLocal?"P2: ":"Bot: "))+result.msg);
      if(isYou&&!result.died&&!card.isPower&&!card.isNull&&!card.isCrit){
        setMultPop({key:Date.now(),val:card.display});
      }
      if(result.effect==="peek"){setPeekCards(newDeck.slice(0,3));setPeekVisible(true);setTimeout(()=>setPeekVisible(false),2500);}
      if(result.effect==="skip"){setSkipPending(isYou?"bot":"you");}
      cb(newYou,newBot,newDeck,result.died);
    },400);
  },[config,isLocal]);

  const playerDraw=useCallback(()=>{
    if(phase!=="playing"||turn!=="you"||flipping||you.cashedOut||!you.alive||deck.length===0||poisonPhase||peekVisible)return;
    executeDrawForPlayer("you",you,bot,deck,(ny,nb,nd,died)=>{
      if(died){checkWin(ny,nb,nd);return;}
      if(!checkWin(ny,nb,nd)){
        if(nb.alive&&!nb.cashedOut)setTurn("bot");
        else setMsg(msg+(isLocal?" — P1's turn!":" — Your turn!"));
      }
    });
  },[phase,turn,flipping,you,bot,deck,poisonPhase,peekVisible,executeDrawForPlayer,checkWin,msg,isLocal]);

  const p2Draw=useCallback(()=>{
    if(!isLocal||phase!=="playing"||turn!=="bot"||flipping||bot.cashedOut||!bot.alive||deck.length===0||poisonPhase||peekVisible)return;
    executeDrawForPlayer("bot",you,bot,deck,(ny,nb,nd,died)=>{
      if(died){checkWin(ny,nb,nd);return;}
      if(!checkWin(ny,nb,nd)){
        if(ny.alive&&!ny.cashedOut)setTurn("you");
        else setMsg(msg+" — P2's turn!");
      }
    });
  },[isLocal,phase,turn,flipping,you,bot,deck,poisonPhase,peekVisible,executeDrawForPlayer,checkWin,msg]);

  const playerPickPoison=useCallback((cardIndex)=>{
    const card=you.drawn[cardIndex];
    if(!card||card.isPower||card.isNull||card.isCrit)return;
    const nd=injectPoison(card,deck);
    setYouPoisoned(true);
    const ny={...you,cashedOut:true};setYou(ny);
    setMsg(`${p1Label} cashed at ${you.score.toLocaleString()} — poisoned!`);
    setPoisonPhase(null);
    if(!checkWin(ny,bot,nd)){
      if(bot.alive&&!bot.cashedOut)setTurn("bot");
    }
  },[you,bot,deck,injectPoison,checkWin,p1Label]);

  const p2PickPoison=useCallback((cardIndex)=>{
    if(!isLocal)return;
    const card=bot.drawn[cardIndex];
    if(!card||card.isPower||card.isNull||card.isCrit)return;
    const nd=injectPoison(card,deck);
    setBotPoisoned(true);
    const nb={...bot,cashedOut:true};setBot(nb);
    setMsg(`P2 cashed at ${bot.score.toLocaleString()} — poisoned!`);
    setPoisonPhase(null);
    if(!checkWin(you,nb,nd)){
      if(you.alive&&!you.cashedOut)setTurn("you");
    }
  },[isLocal,you,bot,deck,injectPoison,checkWin]);

  const playerCash=useCallback(()=>{
    if(phase!=="playing"||you.cashedOut||!you.alive||poisonPhase||peekVisible)return;
    const valid=you.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
    if(valid.length===0)return;
    if(!bot.alive){
      const ny={...you,cashedOut:true};setYou(ny);
      setMsg(`${p1Label} cashed at ${you.score.toLocaleString()}!`);
      checkWin(ny,bot,deck);return;
    }
    setPoisonPhase("you");
    setMsg("Choose a card to poison the deck");
  },[phase,you,bot,poisonPhase,peekVisible,deck,checkWin,p1Label]);

  const p2Cash=useCallback(()=>{
    if(!isLocal||phase!=="playing"||bot.cashedOut||!bot.alive||poisonPhase||peekVisible)return;
    const valid=bot.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
    if(valid.length===0)return;
    if(!you.alive){
      const nb={...bot,cashedOut:true};setBot(nb);
      setMsg(`P2 cashed at ${bot.score.toLocaleString()}!`);
      checkWin(you,nb,deck);return;
    }
    setPoisonPhase("bot");
    setMsg("P2: Choose a card to poison the deck");
  },[isLocal,phase,you,bot,poisonPhase,peekVisible,deck,checkWin]);

  // Skip-forced draws (P1)
  useEffect(()=>{
    if(phase!=="playing"||flipping||peekVisible)return;
    if(skipPending==="you"&&turn==="you"&&you.alive&&!you.cashedOut){
      setSkipPending(null);
      setMsg("SKIP! Forced to draw 2!");
      let drawsLeft=2;
      const doForcedDraw=(cy,cb,cd)=>{
        if(drawsLeft<=0||!cy.alive||cd.length===0){
          if(!checkWin(cy,cb,cd)){
            if(cb.alive&&!cb.cashedOut){
              setTurn("bot");
            }
          }
          return;
        }
        drawsLeft--;
        executeDrawForPlayer("you",cy,cb,cd,(ny,nb,nd,died)=>{
          if(died){checkWin(ny,nb,nd);return;}
          if(drawsLeft>0&&ny.alive&&nd.length>0){
            setTimeout(()=>doForcedDraw(ny,nb,nd),600);
          } else {
            if(!checkWin(ny,nb,nd)){
              if(nb.alive&&!nb.cashedOut){
                setTurn("bot");
              }
            }
          }
        });
      };
      setTimeout(()=>doForcedDraw(you,bot,deck),300);
    }
  },[skipPending,turn,phase,flipping,peekVisible,you,bot,deck,executeDrawForPlayer,checkWin]);

  // Skip-forced draws (P2 local)
  useEffect(()=>{
    if(!isLocal||phase!=="playing"||flipping||peekVisible)return;
    if(skipPending==="bot"&&turn==="bot"&&bot.alive&&!bot.cashedOut){
      setSkipPending(null);
      setMsg("SKIP! P2 forced to draw 2!");
      let drawsLeft=2;
      const doP2Forced=(cy,cb,cd)=>{
        if(drawsLeft<=0||!cb.alive||cd.length===0){
          if(!checkWin(cy,cb,cd)){
            if(cy.alive&&!cy.cashedOut)setTurn("you");
          }
          return;
        }
        drawsLeft--;
        executeDrawForPlayer("bot",cy,cb,cd,(ny,nb,nd,died)=>{
          if(died){checkWin(ny,nb,nd);return;}
          if(drawsLeft>0&&nb.alive&&nd.length>0){
            setTimeout(()=>doP2Forced(ny,nb,nd),600);
          } else {
            if(!checkWin(ny,nb,nd)){
              if(ny.alive&&!ny.cashedOut)setTurn("you");
            }
          }
        });
      };
      setTimeout(()=>doP2Forced(you,bot,deck),300);
    }
  },[isLocal,skipPending,turn,phase,flipping,peekVisible,you,bot,deck,executeDrawForPlayer,checkWin]);

  // Bot turn (AI)
  useEffect(()=>{
    if(isLocal)return;
    if(phase!=="playing"||turn!=="bot"||!bot.alive||bot.cashedOut||poisonPhase||flipping||peekVisible)return;

    if(skipPending==="bot"){
      setSkipPending(null);
      let drawsLeft=2;
      const doBotForced=(cy,cb,cd)=>{
        if(drawsLeft<=0||!cb.alive||cd.length===0){
          if(!checkWin(cy,cb,cd)){
            if(cy.alive&&!cy.cashedOut)setTurn("you");
            else if(cb.alive&&!cb.cashedOut)setTimeout(()=>setTurn(t=>t==="bot"?"bot_again":"bot"),100);
          }
          return;
        }
        drawsLeft--;
        setTimeout(()=>{
          executeDrawForPlayer("bot",cy,cb,cd,(ny,nb,nd,died)=>{
            if(died){checkWin(ny,nb,nd);return;}
            if(drawsLeft>0&&nb.alive&&nd.length>0){
              setTimeout(()=>doBotForced(ny,nb,nd),600);
            } else {
              if(!checkWin(ny,nb,nd)){
                if(ny.alive&&!ny.cashedOut)setTurn("you");
                else if(nb.alive&&!nb.cashedOut)setTimeout(()=>setTurn(t=>t==="bot"?"bot_again":"bot"),100);
              }
            }
          });
        },600);
      };
      setTimeout(()=>doBotForced(you,bot,deck),400);
      return;
    }

    const timer=setTimeout(()=>{
      const decision=botDecision(bot,deck,config,you,difficulty,skipPending);
      if(decision==="cash"){
        const poisonCard=botPickPoison(bot,you,config,difficulty);
        const nb={...bot,cashedOut:true};setBot(nb);
        if(poisonCard){
          const nd=injectPoison(poisonCard,deck);
          setBotPoisoned(true);
          setMsg(`Bot cashed at ${bot.score.toLocaleString()} — poisoned!`);
          if(!checkWin(you,nb,nd)){if(you.alive&&!you.cashedOut)setTurn("you");}
        } else {
          setMsg(`Bot cashed at ${bot.score.toLocaleString()}!`);
          if(!checkWin(you,nb,deck)){if(you.alive&&!you.cashedOut)setTurn("you");}
        }
        return;
      }
      if(deck.length===0){checkWin(you,bot,deck);return;}
      executeDrawForPlayer("bot",you,bot,deck,(ny,nb,nd,died)=>{
        if(!checkWin(ny,nb,nd)){
          if(ny.alive&&!ny.cashedOut)setTurn("you");
          else if(nb.alive&&!nb.cashedOut)setTimeout(()=>setTurn(t=>t==="bot"?"bot_again":"bot"),100);
        }
      });
    },800);
    return()=>clearTimeout(timer);
  },[isLocal,phase,turn,bot,deck,config,you,difficulty,checkWin,poisonPhase,flipping,peekVisible,skipPending,injectPoison,executeDrawForPlayer]);

  useEffect(()=>{if(turn==="bot_again")setTurn("bot");},[turn]);

  // ---- Derived values ----
  const isYourTurn=turn==="you"&&phase==="playing"&&you.alive&&!you.cashedOut&&!poisonPhase&&!peekVisible&&skipPending!=="you";
  const isP2Turn=isLocal&&turn==="bot"&&phase==="playing"&&bot.alive&&!bot.cashedOut&&!poisonPhase&&!peekVisible&&skipPending!=="bot";
  const validDraws=you.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
  const validP2Draws=bot.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
  const activePlayer=turn==="you"?you:bot;
  const {danger:dangerCount,total:totalRemaining}=getDangerCount(deck,activePlayer,config);
  const risk=getRisk(deck,activePlayer,config);

  const turnLabel = phase==="over" ? "ROUND COMPLETE"
    : skipPending==="you" ? "FORCED DRAW"
    : isYourTurn ? (isLocal ? "P1 — DRAW OR CASH" : "YOUR TURN — DRAW OR CASH")
    : isP2Turn ? "P2 — DRAW OR CASH"
    : (isLocal ? "P2 TURN" : "OPPONENT THINKING");

  return(
    <div style={{
      minHeight:"100vh",
      background:`radial-gradient(ellipse at 50% 30%, ${dv.bg} 0%, ${dv.bgInk} 60%, #04050a 100%)`,
      color: THEME.text, fontFamily: F.display,
      padding:"12px 14px 24px",
      position:"relative",
      animation: deathAnim ? "deathShake .5s ease-out" : risk>=0.65 && phase==="playing" && !deathAnim ? "critGlow 1s ease-in-out infinite" : "screenIn 0.3s ease-out",
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* Death flash overlay */}
      {deathAnim && phase==="over" && !showRoundResult && !matchOver && (
        <div style={{ position:"fixed", top:"35%", left:0, right:0, textAlign:"center", zIndex:80, animation:"deathFlash .8s ease-out", pointerEvents:"none" }}>
          <div style={{ fontSize:42, fontWeight:900, fontFamily: F.display, color: deathAnim==="poison"?"#9b59b6":THEME.red, textShadow:`0 0 40px ${deathAnim==="poison"?"#9b59b6":THEME.red}`, letterSpacing:4 }}>
            {deathAnim==="poison" ? "☠ POISONED" : "DEAD"}
          </div>
        </div>
      )}

      {/* Peek overlay */}
      {peekVisible && peekCards.length>0 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:90, animation:"fadeUp .3s ease-out" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#00bcd4", fontFamily: F.mono, fontWeight:700, letterSpacing:2, marginBottom:14 }}>PEEK — NEXT {peekCards.length} CARDS</div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {peekCards.map((c, i) => <RenderCard key={i} card={c} deckId={deckId} size="normal" />)}
            </div>
          </div>
        </div>
      )}

      {/* Round result interstitial */}
      {showRoundResult && roundResult && (
        <RoundResultOverlay
          result={roundResult.winner}
          you={roundResult.youScore}
          bot={roundResult.botScore}
          roundNum={roundNum}
          onContinue={() => { if (advanceRoundRef.current) advanceRoundRef.current(); }}
        />
      )}

      {/* Match end overlay */}
      {matchOver && (
        <MatchEndOverlay
          won={roundWins.you >= 2}
          deck={dv}
          history={roundHistory}
          totalYou={roundWins.you}
          totalBot={roundWins.bot}
          onRematch={startMatch}
          onDecks={onBack}
        />
      )}

      {/* Layout container */}
      <div style={{ maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column", gap:10 }}>

        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack} style={{
            padding:"6px 10px", background:"transparent", color: THEME.textDim,
            border:`1px solid ${THEME.line}`, borderRadius:6,
            fontFamily: F.mono, fontSize:11, letterSpacing:"0.14em", cursor:"pointer",
          }}>← BACK</button>
          <div style={{ flex:1, textAlign:"center" }}>
            <span style={{ fontFamily: F.display, fontSize:16, fontWeight:700, color: dv.accent, letterSpacing:"0.06em" }}>{dv.name}</span>
            <span style={{ fontFamily: F.mono, fontSize:11, color: THEME.textMute, letterSpacing:"0.18em", marginLeft:8 }}>VS {p2Label}</span>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            {[1,2,3].map(n => {
              const youW = n <= roundWins.you;
              const botW = n <= roundWins.you + roundWins.bot && n > roundWins.you;
              const cur = !youW && !botW && n === roundNum && !matchOver;
              const c = youW ? THEME.gold : botW ? THEME.red : cur ? THEME.text : THEME.lineHi;
              return <div key={n} style={{ width:8, height:8, borderRadius:"50%", background: c, opacity: cur ? 1 : 0.85 }} />;
            })}
            <div style={{ marginLeft:6, fontFamily: F.mono, fontSize:11, color: THEME.textDim, letterSpacing:"0.1em" }}>{roundWins.you}-{roundWins.bot}</div>
          </div>
        </div>

        {/* Opponent territory */}
        <PlayerPanel name={p2Label} ps={bot} deckId={deckId} isActive={turn==="bot" && phase==="playing"} isYour={false} hasPoisoned={botPoisoned} config={config} />

        {/* Turn banner */}
        {phase==="playing" && !poisonPhase && (
          <TurnBanner yourTurn={isYourTurn || isP2Turn} label={turnLabel} isYour={isYourTurn} />
        )}

        {/* Score + tension */}
        {phase==="playing" && !poisonPhase && (you.score>0||bot.score>0||validDraws.length>0) && (
          <ScoreTensionPanel
            youName={isLocal ? "P1" : "YOU"}
            botName={isLocal ? "P2" : "OPPONENT"}
            you={you.score}
            bot={bot.score}
            ratio={risk}
            deadlyN={dangerCount}
            totalN={totalRemaining}
            multPop={multPop}
            onMultPopEnd={() => setMultPop(null)}
          />
        )}

        {/* Battlefield */}
        {!poisonPhase && (
          <Battlefield
            deckId={deckId}
            deckCount={deck.length}
            lastCard={lastCard}
            onDraw={isYourTurn ? playerDraw : isP2Turn ? p2Draw : undefined}
            disabled={!(isYourTurn || isP2Turn) || flipping}
            yourTurn={isYourTurn || isP2Turn}
            drawingPulse={flipping}
          />
        )}

        {/* Message */}
        {msg && !showRoundResult && !matchOver && (
          <div key={msg} style={{
            fontSize:12, fontFamily: F.mono, fontWeight:700, textAlign:"center",
            minHeight:16, lineHeight:1.4, letterSpacing:"0.08em",
            color: poisonPhase ? "#9b59b6" : phase==="over" ? (roundWins.you>roundWins.bot ? THEME.green : THEME.red) : turn==="bot" ? THEME.red : dv.accent,
            animation:"fadeUp .3s ease-out",
          }}>{msg}</div>
        )}

        {/* Poison pick (P1) */}
        {poisonPhase==="you" && (
          <div style={{ width:"100%" }}>
            <div style={{ fontSize:12, color:"#9b59b6", fontFamily: F.mono, textTransform:"uppercase", letterSpacing:"0.22em", marginBottom:8, textAlign:"center" }}>Tap a card to poison the deck</div>
            <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
              {you.drawn.map((c, i) => {
                const canPoison = !c.isPower && !c.isNull && !c.isCrit;
                return (
                  <div key={i} onClick={() => canPoison && playerPickPoison(i)} style={{ cursor: canPoison ? "pointer" : "default", filter: canPoison ? "drop-shadow(0 0 8px rgba(155,89,182,0.5))" : "none", opacity: canPoison ? 1 : 0.4 }}>
                    <RenderCard card={c} deckId={deckId} size="small" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Poison pick (P2 local) */}
        {poisonPhase==="bot" && isLocal && (
          <div style={{ width:"100%" }}>
            <div style={{ fontSize:12, color:"#9b59b6", fontFamily: F.mono, textTransform:"uppercase", letterSpacing:"0.22em", marginBottom:8, textAlign:"center" }}>P2: Tap a card to poison the deck</div>
            <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
              {bot.drawn.map((c, i) => {
                const canPoison = !c.isPower && !c.isNull && !c.isCrit;
                return (
                  <div key={i} onClick={() => canPoison && p2PickPoison(i)} style={{ cursor: canPoison ? "pointer" : "default", filter: canPoison ? "drop-shadow(0 0 8px rgba(155,89,182,0.5))" : "none", opacity: canPoison ? 1 : 0.4 }}>
                    <RenderCard card={c} deckId={deckId} size="small" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cash out (P1) */}
        {isYourTurn && validDraws.length>0 && !poisonPhase && (
          <CashOutA score={you.score} onCash={playerCash} tension={risk} />
        )}

        {/* Cash out (P2 local) */}
        {isP2Turn && validP2Draws.length>0 && !poisonPhase && (
          <CashOutA score={bot.score} onCash={p2Cash} tension={risk} label="P2 CASH OUT" />
        )}

        {/* What-If panel */}
        {phase==="over" && matchOver && whatIfData && (
          <div style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.03)", border:`1px solid ${THEME.line}`, borderRadius:12, animation:"fadeUp .4s ease-out" }}>
            <div style={{ fontSize:11, color: THEME.textMute, fontFamily: F.mono, letterSpacing:"0.22em", marginBottom:8 }}>WHAT IF...</div>
            {whatIfData.nextCard && (
              <div style={{ fontSize:12, fontFamily: F.mono, color: THEME.textDim, marginBottom:4 }}>
                Next card: <span style={{ color: whatIfData.nextCardSafe ? THEME.green : THEME.red, fontWeight:700 }}>{whatIfData.nextCard.display} {whatIfData.nextCard.suit}</span> — {whatIfData.nextCardSafe ? "was safe" : "would have killed"}
              </div>
            )}
            {whatIfData.safeCardsRemaining != null && (
              <div style={{ fontSize:12, fontFamily: F.mono, color: THEME.textDim, marginBottom:4 }}>{whatIfData.safeCardsRemaining} safe cards remained in deck</div>
            )}
            {whatIfData.poisonCard && (
              <div style={{ fontSize:12, fontFamily: F.mono, color:"#9b59b6", marginBottom:4 }}>Poison ({whatIfData.poisonCard.display}) — {whatIfData.poisonCard.hit ? "it hit!" : "still lurking in deck"}</div>
            )}
            {whatIfData.opponentDangerAtCash != null && (
              <div style={{ fontSize:12, fontFamily: F.mono, color: THEME.textDim }}>Opponent had {whatIfData.opponentDangerAtCash} danger cards when they cashed</div>
            )}
          </div>
        )}

        {/* Player territory */}
        {!poisonPhase && (
          <PlayerPanel name={p1Label} ps={you} deckId={deckId} isActive={isYourTurn} isYour={true} hasPoisoned={youPoisoned} config={config} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// SOLO GAME — Variation A redesign
// ============================================================
function SoloGame({deckId,onBack,highScores,setHighScores}){
  const config=DECKS[deckId];
  const dv=DECK_VISUAL[deckId];
  const [deck,setDeck]=useState([]);
  const [ps,setPs]=useState(newPlayerState());
  const [phase,setPhase]=useState("playing");
  const [msg,setMsg]=useState("Draw your first card!");
  const [lastCard,setLastCard]=useState(null);
  const [flipping,setFlipping]=useState(false);
  const [multPop,setMultPop]=useState(null);
  const historyRef=useRef(null);

  const startGame=useCallback(()=>{
    setDeck(config.build());
    setPs(newPlayerState());
    setPhase("playing");
    setMsg("Draw your first card!");
    setLastCard(null);
  },[config]);
  useEffect(()=>{startGame();},[startGame]);

  const draw=useCallback(()=>{
    if(phase!=="playing"||flipping||deck.length===0||!ps.alive)return;
    const card=deck[0];const rest=deck.slice(1);
    setFlipping(true);setLastCard({...card,_key:Date.now()+Math.random()});
    setTimeout(()=>{
      setFlipping(false);
      const r=processDraw(card,ps,rest,config);
      setPs(r.ps);setDeck(r.deck);setMsg(r.msg);
      if(!r.died&&!card.isPower&&!card.isNull&&!card.isCrit){setMultPop({key:Date.now(),val:card.display});}
      if(r.died){setPhase("dead");return;}
      if(r.deck.length===0){
        setPhase("won");
        if(r.ps.score>(highScores[deckId]||0))setHighScores(p=>({...p,[deckId]:r.ps.score}));
        setMsg(`PERFECT! ${r.ps.score.toLocaleString()}`);
      }
    },400);
  },[phase,flipping,deck,ps,config,deckId,highScores,setHighScores]);

  const cash=useCallback(()=>{
    const valid=ps.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
    if(valid.length===0||phase!=="playing")return;
    setPhase("cashed");
    if(ps.score>(highScores[deckId]||0))setHighScores(p=>({...p,[deckId]:ps.score}));
    setMsg(`Cashed: ${ps.score.toLocaleString()}`);
  },[ps,phase,deckId,highScores,setHighScores]);

  useEffect(()=>{if(historyRef.current)historyRef.current.scrollLeft=historyRef.current.scrollWidth;},[ps.drawn]);

  const valid=ps.drawn.filter(c=>!c.isPower&&!c.isNull&&!c.isCrit);
  const riskRatio=getRisk(deck,ps,config);
  const {danger:soloDanger,total:soloTotal}=getDangerCount(deck,ps,config);
  const tier=tensionFor(riskRatio);
  const best=highScores[deckId]||0;

  return(
    <div style={{
      minHeight:"100vh",
      background:`radial-gradient(ellipse at 50% 30%, ${dv.bg} 0%, ${dv.bgInk} 60%, #04050a 100%)`,
      color: THEME.text, fontFamily: F.display,
      padding:"12px 14px 24px",
      animation: phase==="dead" ? "deathShake .5s ease-out" : "screenIn 0.3s ease-out",
    }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column", gap:10 }}>
        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack} style={{
            padding:"6px 10px", background:"transparent", color: THEME.textDim,
            border:`1px solid ${THEME.line}`, borderRadius:6,
            fontFamily: F.mono, fontSize:11, letterSpacing:"0.14em", cursor:"pointer",
          }}>← BACK</button>
          <div style={{ flex:1, textAlign:"center" }}>
            <span style={{ fontFamily: F.display, fontSize:16, fontWeight:700, color: dv.accent, letterSpacing:"0.06em" }}>{dv.name}</span>
            <span style={{ fontFamily: F.mono, fontSize:11, color: THEME.textMute, letterSpacing:"0.18em", marginLeft:8 }}>SOLO</span>
          </div>
          <div style={{ width:60 }} />
        </div>

        {/* Score + Best panel */}
        <div style={{
          padding:"14px 16px",
          background:"linear-gradient(180deg, #0d0e16 0%, #07080c 100%)",
          border:`1px solid ${THEME.line}`, borderRadius:12,
          position:"relative",
        }}>
          {multPop && (
            <div key={multPop.key} onAnimationEnd={() => setMultPop(null)}
              style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)",
                fontSize:24, fontWeight:900, fontFamily: F.mono, color:"#f1c40f",
                textShadow:"0 0 16px rgba(241,196,15,0.7)",
                pointerEvents:"none", animation:"multPop 0.9s ease-out forwards",
                whiteSpace:"nowrap", zIndex:20 }}>
              ×{multPop.val}
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1px 1fr", gap:16, alignItems:"center" }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize:11, letterSpacing:"0.22em", color: THEME.textMute, marginBottom:4 }}>SCORE</div>
              <div key={ps.score} style={{ fontFamily: F.display, fontSize:38, fontWeight:800, color: phase==="dead" ? THEME.red : dv.accent, lineHeight:1, letterSpacing:"-0.02em", animation: ps.score>0 ? "popIn .3s ease-out" : phase==="dead" ? "shake .4s ease-out" : undefined }}>{ps.score.toLocaleString()}</div>
            </div>
            <div style={{ height:44, background:`${THEME.line}` }} />
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily: F.mono, fontSize:11, letterSpacing:"0.22em", color: THEME.textMute, marginBottom:4 }}>BEST</div>
              <div style={{ fontFamily: F.display, fontSize:24, fontWeight:700, color: best > 0 ? THEME.text : THEME.textMute, lineHeight:1 }}>{best.toLocaleString()}</div>
            </div>
          </div>

          {phase==="playing" && valid.length>0 && (
            <>
              <div style={{ marginTop:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontFamily: F.mono, fontSize:13, fontWeight:700, letterSpacing:"0.2em", color: tier.color }}>{tier.label}</div>
                <div style={{ fontFamily: F.mono, fontSize:12, color: THEME.textDim, letterSpacing:"0.18em" }}>{soloDanger}/{soloTotal} WILL FINISH YOU</div>
              </div>
              <div style={{ marginTop:6, height:6, borderRadius:3, background:"#1a1b25", overflow:"hidden" }}>
                <div style={{ width:`${Math.min(100, riskRatio*200)}%`, height:"100%",
                  background:`linear-gradient(90deg, ${THEME.green} 0%, ${THEME.gold} 50%, ${THEME.red} 100%)`,
                  transition:"width 300ms" }} />
              </div>
              <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily: F.mono, fontSize:11, color: THEME.textMute, letterSpacing:"0.18em" }}>{deck.length} CARDS LEFT</span>
                <span style={{ display:"flex", gap:8, fontFamily: F.mono, fontSize:11, letterSpacing:"0.18em" }}>
                  {config.special==="secondbite" && <span style={{ color: ps.secondBiteUsed ? THEME.red : THEME.green }}>{ps.secondBiteUsed ? "BITE USED" : "BITE READY"}</span>}
                  {config.special==="modifier" && ps.cursed && <span style={{ color: THEME.red }}>CURSED</span>}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Message */}
        {msg && (
          <div key={msg} style={{
            fontSize:12, fontFamily: F.mono, fontWeight:700, textAlign:"center",
            minHeight:16, lineHeight:1.4, letterSpacing:"0.08em",
            color: phase==="dead" ? THEME.red : phase==="cashed"||phase==="won" ? THEME.green : dv.accent,
            animation:"fadeUp .3s ease-out",
          }}>{msg}</div>
        )}

        {/* Battlefield */}
        <div style={{ padding:"16px 0", display:"flex", alignItems:"center", justifyContent:"center", gap:18, position:"relative" }}>
          <div style={{ width: SIZES.normal.w, height: SIZES.normal.h, opacity: 0 }} />
          {phase==="playing" ? (
            <button onClick={draw} disabled={flipping || deck.length===0} aria-label="Draw a card" style={{
              padding:0, background:"transparent", border:"none",
              cursor: flipping ? "default" : "pointer",
              filter: flipping ? "grayscale(0.4) brightness(0.7)" : "none",
            }}>
              <CardBackA deck={dv} size="normal" glow={!flipping} />
            </button>
          ) : (
            <div style={{ width: SIZES.normal.w, height: SIZES.normal.h, opacity: 0 }} />
          )}
          <div style={{ position:"absolute", left:"50%", bottom:-2, transform:"translateX(-110px)", fontFamily: F.mono, fontSize:13, color: THEME.textDim, letterSpacing:"0.2em" }}>{deck.length} LEFT</div>
          <div style={{ position:"relative", width: SIZES.normal.w, height: SIZES.normal.h }}>
            {lastCard ? (
              <div style={{ position:"absolute", inset:0, animation:"flip .4s ease-out" }} key={lastCard._key||0}>
                <RenderCard card={lastCard} deckId={deckId} dead={phase==="dead"} />
              </div>
            ) : (
              <div style={{ width:"100%", height:"100%", border:`1px dashed ${THEME.line}`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontFamily: F.mono, fontSize:13, color: THEME.textMute, letterSpacing:"0.18em", textAlign:"center" }}>LAST<br/>DRAW</div>
            )}
          </div>
        </div>

        {/* Cash out */}
        {phase==="playing" && valid.length>0 && (
          <CashOutA score={ps.score} onCash={cash} tension={riskRatio} />
        )}

        {/* End buttons */}
        {(phase==="dead"||phase==="cashed"||phase==="won") && (
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button onClick={startGame} style={{
              padding:"14px 28px",
              background: phase==="dead" ? `${THEME.red}22` : `${dv.accent}22`,
              color: phase==="dead" ? THEME.red : dv.accent,
              border:`1px solid ${phase==="dead" ? THEME.red : dv.accent}`,
              borderRadius:12, cursor:"pointer",
              fontFamily: F.mono, fontSize:13, fontWeight:700, letterSpacing:"0.22em",
            }}>{phase==="dead" ? "TRY AGAIN" : "PLAY AGAIN"}</button>
            <button onClick={onBack} style={{
              padding:"14px 28px",
              background:"transparent", color: THEME.textDim, border:`1px solid ${THEME.line}`,
              borderRadius:12, cursor:"pointer",
              fontFamily: F.mono, fontSize:13, fontWeight:700, letterSpacing:"0.22em",
            }}>← DECKS</button>
          </div>
        )}

        {/* Drawn cards history */}
        {ps.drawn.length>0 && (
          <div style={{ padding:"12px 14px", background:"linear-gradient(180deg, #0c0d14 0%, #07080c 100%)", border:`1px solid ${THEME.line}`, borderRadius:14 }}>
            <div style={{ fontFamily: F.mono, fontSize:11, color: THEME.textMute, letterSpacing:"0.22em", marginBottom:8 }}>DRAWN — {ps.drawn.length} CARDS</div>
            <div ref={historyRef} style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, scrollBehavior:"smooth", minHeight: SIZES.tiny.h, alignItems:"center" }}>
              {ps.drawn.map((c, i) => (
                <div key={i} style={{ flex:"none" }}>
                  <RenderCard card={c} deckId={deckId} size="tiny" dead={c.dead} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HOW TO PLAY (tutorial)
// ============================================================
const TUTORIAL_STEPS = [
  {
    icon: "×",
    title: "Multiply or bust",
    body: "Draw cards to build your score. Each card multiplies your running total by its value. The longer you push, the bigger it grows.",
  },
  {
    icon: "☠",
    title: "Don't repeat yourself",
    body: "Draw a value you've already drawn and you BUST — your score is wiped to zero. The risk meter shows how many cards left in the deck would finish you.",
  },
  {
    icon: "✓",
    title: "Cash out to bank it",
    body: "Hit CASH OUT any time to lock in your score. In a duel you then pick one of your cards to poison the deck — a hidden trap for your opponent's next draws.",
  },
  {
    icon: "♠",
    title: "Every deck plays differently",
    body: "Each deck has its own twist — free first matches, score-halving NULLs, disease outbreaks and more. Power cards (Peek, Mirror, Skip) shake things up. Tap a deck to read its rule.",
  },
];

function HowToPlay({ open, onClose }){
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open]);
  if (!open) return null;
  const last = step === TUTORIAL_STEPS.length - 1;
  const s = TUTORIAL_STEPS[step];
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:120,
      background:"radial-gradient(60% 50% at 50% 40%, rgba(212,175,55,0.10) 0%, rgba(0,0,0,0.9) 70%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, animation:"fade-in 220ms ease",
    }}>
      <style>{GLOBAL_CSS}</style>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth:420,
        background:"linear-gradient(180deg, #14141d 0%, #0a0a10 100%)",
        border:`1px solid ${THEME.lineHi}`, borderRadius:16,
        padding:"26px 22px 20px", position:"relative",
        boxShadow:"0 24px 60px -12px rgba(0,0,0,0.8)",
        animation:"screenIn 0.3s ease-out",
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position:"absolute", top:12, right:14, background:"transparent", border:"none",
          color: THEME.textMute, fontSize:22, lineHeight:1, cursor:"pointer", fontFamily: F.mono,
        }}>×</button>

        <div style={{ fontFamily: F.mono, fontSize:11, letterSpacing:"0.3em", color: THEME.textMute, textAlign:"center" }}>HOW TO PLAY</div>

        <div style={{ textAlign:"center", marginTop:20 }}>
          <div style={{ fontFamily: F.display, fontSize:46, color: THEME.gold, lineHeight:1, textShadow:`0 0 22px ${THEME.gold}55` }}>{s.icon}</div>
          <h2 style={{ fontFamily: F.display, fontSize:24, fontWeight:700, color:"#f4eedd", margin:"14px 0 0", letterSpacing:"0.03em" }}>{s.title}</h2>
          <p style={{ fontFamily: F.mono, fontSize:13.5, lineHeight:1.6, color: THEME.textDim, margin:"12px auto 0", maxWidth:330 }}>{s.body}</p>
        </div>

        <div style={{ display:"flex", gap:6, justifyContent:"center", margin:"22px 0 18px" }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} style={{ width: i===step?22:7, height:7, borderRadius:4, background: i===step?THEME.gold:THEME.lineHi, transition:"width 200ms, background 200ms" }} />
          ))}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          {step > 0 && (
            <button onClick={()=>setStep(step-1)} style={{
              flex:"none", padding:"13px 18px", background:"transparent", color: THEME.textDim,
              border:`1px solid ${THEME.line}`, borderRadius:10, cursor:"pointer",
              fontFamily: F.mono, fontSize:12, fontWeight:700, letterSpacing:"0.18em",
            }}>BACK</button>
          )}
          <button onClick={()=> last ? onClose() : setStep(step+1)} style={{
            flex:1, padding:"13px 18px",
            background:`linear-gradient(180deg, ${THEME.gold}33 0%, ${THEME.goldDim}66 100%)`,
            color: THEME.gold, border:`1px solid ${THEME.gold}`, borderRadius:10, cursor:"pointer",
            fontFamily: F.mono, fontSize:12, fontWeight:700, letterSpacing:"0.2em",
          }}>{last ? "GOT IT — PLAY" : "NEXT →"}</button>
        </div>

        {!last && (
          <button onClick={onClose} style={{
            width:"100%", marginTop:10, background:"transparent", border:"none",
            color: THEME.textMute, fontFamily: F.mono, fontSize:11, letterSpacing:"0.18em", cursor:"pointer",
          }}>SKIP</button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FEEDBACK BUTTON (mailto)
// ============================================================
const FEEDBACK_EMAIL = "themythicbestiary@gmail.com";
function FeedbackButton(){
  const href = `mailto:${FEEDBACK_EMAIL}`
    + `?subject=${encodeURIComponent("Card Multiplier — Feedback")}`
    + `&body=${encodeURIComponent("What did you think?\n\n• What was fun / what dragged?\n• Anything confusing?\n• Bugs or glitches?\n• Which deck + your best score?\n\n— Sent from Card Multiplier")}`;
  return (
    <a href={href} aria-label="Send feedback" style={{
      position:"fixed", right:14, bottom:14, zIndex:110,
      display:"inline-flex", alignItems:"center", gap:7,
      padding:"9px 14px", borderRadius:999,
      background:"rgba(20,20,28,0.82)", backdropFilter:"blur(6px)",
      border:`1px solid ${THEME.lineHi}`, color: THEME.textDim,
      fontFamily: F.mono, fontSize:11.5, fontWeight:700, letterSpacing:"0.14em",
      textDecoration:"none", boxShadow:"0 6px 18px -6px rgba(0,0,0,0.7)",
    }}>✉ FEEDBACK</a>
  );
}

// ============================================================
// APP
// ============================================================
function loadJSON(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback;}catch{return fallback;}}

export default function App(){
  const [screen,setScreen]=useState("home");
  const [selectedDeck,setSelectedDeck]=useState(null);
  const [mode,setMode]=useState(null);
  const [highScores,setHighScores]=useState(()=>loadJSON("cardmultiplier_highscores",{}));
  const [winRecord,setWinRecord]=useState(()=>loadJSON("cardmultiplier_winrecord",{wins:0,losses:0,streak:0,bestStreak:0}));
  const [showHelp,setShowHelp]=useState(()=>!loadJSON("cardmultiplier_seen_tutorial",false));

  useEffect(()=>{localStorage.setItem("cardmultiplier_highscores",JSON.stringify(highScores));},[highScores]);
  useEffect(()=>{localStorage.setItem("cardmultiplier_winrecord",JSON.stringify(winRecord));},[winRecord]);

  const onWin=useCallback(()=>{setWinRecord(r=>{const s=r.streak+1;return{wins:r.wins+1,losses:r.losses,streak:s,bestStreak:Math.max(r.bestStreak,s)};});},[]);
  const onLoss=useCallback(()=>{setWinRecord(r=>({wins:r.wins,losses:r.losses+1,streak:0,bestStreak:r.bestStreak}));},[]);

  const closeHelp=useCallback(()=>{setShowHelp(false);try{localStorage.setItem("cardmultiplier_seen_tutorial",JSON.stringify(true));}catch{/* ignore */}},[]);

  let content=null;
  if(screen==="home")content=<DeckSelect onSelect={id=>{setSelectedDeck(id);setScreen("mode");}} highScores={highScores} winRecord={winRecord} onHelp={()=>setShowHelp(true)}/>;
  else if(screen==="mode")content=<ModeSelect deckId={selectedDeck} onMode={m=>{setMode(m);setScreen("game");}} onBack={()=>setScreen("home")}/>;
  else if(screen==="game"&&mode==="solo")content=<SoloGame deckId={selectedDeck} onBack={()=>setScreen("mode")} highScores={highScores} setHighScores={setHighScores}/>;
  else if(screen==="game"&&mode==="local")content=<DuelGame deckId={selectedDeck} difficulty="local" onBack={()=>setScreen("mode")} highScores={highScores} setHighScores={setHighScores} onWin={onWin} onLoss={onLoss} isLocal/>;
  else if(screen==="game")content=<DuelGame deckId={selectedDeck} difficulty={mode} onBack={()=>setScreen("mode")} highScores={highScores} setHighScores={setHighScores} onWin={onWin} onLoss={onLoss}/>;

  return (
    <>
      {content}
      <FeedbackButton/>
      <HowToPlay open={showHelp} onClose={closeHelp}/>
    </>
  );
}
