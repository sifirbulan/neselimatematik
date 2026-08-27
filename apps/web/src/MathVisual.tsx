import React, { type ReactNode } from "react";
import type { GeometryPoint, VisualizationSpec } from "./types";
import "./math-visual.css";

type FormulaGroup={content:string;end:number};
function readGroup(input:string,start:number):FormulaGroup|undefined{
  let i=start;while(i<input.length&&/\s/.test(input[i]))i++;
  if(input[i]!=="{")return undefined;
  let depth=0;for(let j=i;j<input.length;j++){if(input[j]==="{")depth++;else if(input[j]==="}"){depth--;if(depth===0)return{content:input.slice(i+1,j),end:j+1}}}
  return undefined;
}
function readAtom(input:string,start:number):FormulaGroup{
  let i=start;while(i<input.length&&/\s/.test(input[i]))i++;
  const group=readGroup(input,i);if(group)return group;
  return{content:input[i]??"",end:Math.min(input.length,i+1)};
}
const symbolMap:Record<string,string>={cdot:"·",times:"×",div:"÷",pm:"±",mp:"∓",pi:"π",theta:"θ",alpha:"α",beta:"β",gamma:"γ",delta:"δ",Delta:"Δ",lambda:"λ",mu:"μ",sigma:"σ",Sigma:"Σ",omega:"ω",Omega:"Ω",infty:"∞",to:"→",rightarrow:"→",leftarrow:"←",le:"≤",leq:"≤",ge:"≥",geq:"≥",neq:"≠",approx:"≈",equiv:"≡",perp:"⊥",parallel:"∥",angle:"∠",degree:"°",sin:"sin",cos:"cos",tan:"tan",cot:"cot",sec:"sec",csc:"csc",ln:"ln",log:"log",exp:"exp"};
function renderFormula(formula:string,keyPrefix="f"):ReactNode[]{
  const nodes:ReactNode[]=[];let buffer="";let key=0;
  const flush=()=>{if(buffer){nodes.push(<span key={`${keyPrefix}-t-${key++}`}>{buffer}</span>);buffer=""}};
  for(let i=0;i<formula.length;){const ch=formula[i];
    if(ch==="\\"){
      flush();let j=i+1;while(j<formula.length&&/[A-Za-z]/.test(formula[j]))j++;const command=formula.slice(i+1,j);
      if(command==="frac"){
        const top=readGroup(formula,j);const bottom=top?readGroup(formula,top.end):undefined;
        if(top&&bottom){nodes.push(<span className="mathFraction" key={`${keyPrefix}-frac-${key++}`}><span>{renderFormula(top.content,`${keyPrefix}-n`)}</span><span>{renderFormula(bottom.content,`${keyPrefix}-d`)}</span></span>);i=bottom.end;continue}
      }
      if(command==="sqrt"){
        const body=readGroup(formula,j);if(body){nodes.push(<span className="mathRoot" key={`${keyPrefix}-root-${key++}`}><span className="rootSymbol">√</span><span className="rootBody">{renderFormula(body.content,`${keyPrefix}-r`)}</span></span>);i=body.end;continue}
      }
      if(command==="text"||command==="operatorname"){
        const body=readGroup(formula,j);if(body){nodes.push(<span className="mathText" key={`${keyPrefix}-text-${key++}`}>{body.content}</span>);i=body.end;continue}
      }
      if(command==="int"||command==="sum"||command==="prod"||command==="lim"){
        const label=command==="int"?"∫":command==="sum"?"∑":command==="prod"?"∏":"lim";
        nodes.push(<span className="mathOperator" key={`${keyPrefix}-op-${key++}`}>{label}</span>);i=j;continue
      }
      if(command==="left"||command==="right"){i=j;continue}
      nodes.push(<span key={`${keyPrefix}-sym-${key++}`}>{symbolMap[command]??command}</span>);i=j;continue;
    }
    if(ch==="^"||ch==="_"){
      flush();const atom=readAtom(formula,i+1);const Tag=ch==="^"?"sup":"sub";nodes.push(<Tag key={`${keyPrefix}-${Tag}-${key++}`}>{renderFormula(atom.content,`${keyPrefix}-${Tag}`)}</Tag>);i=atom.end;continue
    }
    if(ch==="{"){
      flush();const group=readGroup(formula,i);if(group){nodes.push(<span key={`${keyPrefix}-g-${key++}`}>{renderFormula(group.content,`${keyPrefix}-g`)}</span>);i=group.end;continue}
    }
    if(ch==="}"){i++;continue}
    buffer+=ch;i++;
  }
  flush();return nodes;
}
function looksLikeFormula(text:string){const trimmed=text.trim();return trimmed.length>0&&trimmed.length<160&&(/\\(frac|sqrt|int|lim|sum|pi|theta)|[=^√∫]|\b(?:sin|cos|tan|log|ln)\b/.test(trimmed))}
export function MathRichText({text}:{text:string}){
  if(!text)return null;
  const pattern=/\\\[((?:.|\n)*?)\\\]|\\\(((?:.|\n)*?)\\\)|\$\$((?:.|\n)*?)\$\$|\$([^$\n]+?)\$/g;const parts:ReactNode[]=[];let last=0;let match:RegExpExecArray|null;let index=0;
  while((match=pattern.exec(text))){if(match.index>last)parts.push(<span key={`plain-${index++}`}>{text.slice(last,match.index)}</span>);const formula=match[1]??match[2]??match[3]??match[4]??"";const display=Boolean(match[1]!==undefined||match[3]!==undefined);parts.push(<span className={display?"mathDisplay":"mathInline"} key={`math-${index++}`}>{renderFormula(formula,`m-${index}`)}</span>);last=pattern.lastIndex}
  if(last<text.length)parts.push(<span key={`plain-${index++}`}>{text.slice(last)}</span>);
  if(parts.length===0&&looksLikeFormula(text))return <span className="mathDisplay">{renderFormula(text)}</span>;
  return <span className="mathRichText">{parts.length?parts:text}</span>;
}

type Token={type:"number"|"name"|"op"|"paren";value:string};
function tokenizeExpression(input:string):Token[]{
  const tokens:Token[]=[];const normalized=input.replace(/\s+/g,"");let i=0;
  while(i<normalized.length){const ch=normalized[i];if(/[0-9.]/.test(ch)){let j=i+1;while(j<normalized.length&&/[0-9.]/.test(normalized[j]))j++;const value=normalized.slice(i,j);if(!/^\d*\.?\d+$/.test(value))throw new Error("Sayı biçimi geçersiz");tokens.push({type:"number",value});i=j;continue}
    if(/[A-Za-z]/.test(ch)){let j=i+1;while(j<normalized.length&&/[A-Za-z]/.test(normalized[j]))j++;tokens.push({type:"name",value:normalized.slice(i,j).toLowerCase()});i=j;continue}
    if("+-*/^".includes(ch)){tokens.push({type:"op",value:ch});i++;continue}if(ch==="("||ch===")"){tokens.push({type:"paren",value:ch});i++;continue}throw new Error("Desteklenmeyen ifade")}
  return tokens;
}
type ExprNode={kind:"number";value:number}|{kind:"var"}|{kind:"unary";op:string;child:ExprNode}|{kind:"binary";op:string;left:ExprNode;right:ExprNode}|{kind:"call";name:string;arg:ExprNode};
function parseExpression(input:string):ExprNode{
  const tokens=tokenizeExpression(input);let pos=0;const peek=()=>tokens[pos];const take=()=>tokens[pos++];
  const parsePrimary=():ExprNode=>{const token=take();if(!token)throw new Error("Eksik ifade");if(token.type==="number")return{kind:"number",value:Number(token.value)};if(token.type==="name"){if(token.value==="x")return{kind:"var"};if(token.value==="pi")return{kind:"number",value:Math.PI};if(token.value==="e")return{kind:"number",value:Math.E};const allowed=new Set(["sin","cos","tan","sqrt","abs","exp","ln","log"]);if(!allowed.has(token.value))throw new Error("Desteklenmeyen fonksiyon");const open=take();if(!open||open.type!=="paren"||open.value!=="(")throw new Error("Fonksiyon parantezi eksik");const arg=parseAdd();const close=take();if(!close||close.type!=="paren"||close.value!==")")throw new Error("Parantez kapanmadı");return{kind:"call",name:token.value,arg}}if(token.type==="paren"&&token.value==="("){const node=parseAdd();const close=take();if(!close||close.type!=="paren"||close.value!==")")throw new Error("Parantez kapanmadı");return node}throw new Error("Geçersiz ifade")};
  const parseUnary=():ExprNode=>{const token=peek();if(token?.type==="op"&&(token.value==="+"||token.value==="-")){take();return{kind:"unary",op:token.value,child:parseUnary()}}return parsePrimary()};
  const parsePower=():ExprNode=>{let left=parseUnary();const token=peek();if(token?.type==="op"&&token.value==="^"){take();left={kind:"binary",op:"^",left,right:parsePower()}}return left};
  const parseMul=():ExprNode=>{let left=parsePower();while(peek()?.type==="op"&&(peek().value==="*"||peek().value==="/")){const op=take().value;left={kind:"binary",op,left,right:parsePower()}}return left};
  const parseAdd=():ExprNode=>{let left=parseMul();while(peek()?.type==="op"&&(peek().value==="+"||peek().value==="-")){const op=take().value;left={kind:"binary",op,left,right:parseMul()}}return left};
  const root=parseAdd();if(pos!==tokens.length)throw new Error("İfade tamamlanamadı");return root;
}
function evaluate(node:ExprNode,x:number):number{
  if(node.kind==="number")return node.value;if(node.kind==="var")return x;if(node.kind==="unary")return node.op==="-"?-evaluate(node.child,x):evaluate(node.child,x);if(node.kind==="binary"){const a=evaluate(node.left,x);const b=evaluate(node.right,x);if(node.op==="+")return a+b;if(node.op==="-")return a-b;if(node.op==="*")return a*b;if(node.op==="/")return a/b;return Math.pow(a,b)}const value=evaluate(node.arg,x);if(node.name==="sin")return Math.sin(value);if(node.name==="cos")return Math.cos(value);if(node.name==="tan")return Math.tan(value);if(node.name==="sqrt")return Math.sqrt(value);if(node.name==="abs")return Math.abs(value);if(node.name==="exp")return Math.exp(value);if(node.name==="ln")return Math.log(value);return Math.log10(value)}
function safeRange(value:number|undefined,fallback:number,min:number,max:number){return typeof value==="number"&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback}
function GraphVisual({spec}:{spec:Extract<VisualizationSpec,{type:"function"|"integral"}>}){
  let ast:ExprNode;try{ast=parseExpression(spec.expression)}catch{return <div className="mathVisualNotice">Grafik ifadesi güvenli biçimde çizilemedi; çözüm metni kullanılabilir.</div>}
  let xMin=safeRange(spec.xMin,-5,-100,100);let xMax=safeRange(spec.xMax,5,-100,100);if(xMax<=xMin)xMax=xMin+10;const width=560,height=280,pad=36,samples=180;const values:Array<{x:number;y:number}>=[];
  for(let i=0;i<=samples;i++){const x=xMin+(xMax-xMin)*i/samples;const y=evaluate(ast,x);if(Number.isFinite(y)&&Math.abs(y)<1e6)values.push({x,y})}
  if(values.length<2)return <div className="mathVisualNotice">Bu ifade için çizilebilir gerçek değer aralığı bulunamadı.</div>;
  let yMin=Math.min(...values.map(p=>p.y),0),yMax=Math.max(...values.map(p=>p.y),0);if(yMin===yMax){yMin-=1;yMax+=1}const yPad=(yMax-yMin)*.12;yMin-=yPad;yMax+=yPad;
  const sx=(x:number)=>pad+(x-xMin)/(xMax-xMin)*(width-2*pad);const sy=(y:number)=>height-pad-(y-yMin)/(yMax-yMin)*(height-2*pad);
  let path="";let previous:typeof values[number]|undefined;for(const point of values){const jump=previous&&Math.abs(point.y-previous.y)>(yMax-yMin)*.8;path+=`${!previous||jump?"M":"L"}${sx(point.x).toFixed(1)},${sy(point.y).toFixed(1)} `;previous=point}
  const xAxis=yMin<=0&&yMax>=0?sy(0):undefined;const yAxis=xMin<=0&&xMax>=0?sx(0):undefined;
  let areaPath="";if(spec.type==="integral"&&typeof spec.lower==="number"&&typeof spec.upper==="number"){const a=Math.max(xMin,Math.min(spec.lower,spec.upper));const b=Math.min(xMax,Math.max(spec.lower,spec.upper));const area=values.filter(p=>p.x>=a&&p.x<=b);if(area.length>1){areaPath=`M${sx(area[0].x)},${sy(0)} `+area.map(p=>`L${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ")+` L${sx(area[area.length-1].x)},${sy(0)} Z`}}
  return <div className="mathVisualPanel"><div className="mathVisualTitle">{spec.title??(spec.type==="integral"?"İntegral alanı":"Fonksiyon grafiği")}</div><svg className="mathGraph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${spec.expression} grafiği`}>
    <rect x="0" y="0" width={width} height={height} rx="18" className="graphSurface"/>{xAxis!==undefined&&<line x1={pad} y1={xAxis} x2={width-pad} y2={xAxis} className="graphAxis"/>}{yAxis!==undefined&&<line x1={yAxis} y1={pad} x2={yAxis} y2={height-pad} className="graphAxis"/>}{areaPath&&<path d={areaPath} className="graphArea"/>}<path d={path} className="graphCurve" fill="none"/><text x={pad} y={height-10} className="graphLabel">{Number(xMin.toFixed(2))}</text><text x={width-pad} y={height-10} textAnchor="end" className="graphLabel">{Number(xMax.toFixed(2))}</text><text x={12} y={pad+4} className="graphLabel">{Number(yMax.toFixed(2))}</text><text x={12} y={height-pad} className="graphLabel">{Number(yMin.toFixed(2))}</text></svg><div className="mathVisualExpression"><MathRichText text={`\\(${spec.expression.replace(/\*/g,"\\cdot ")}\\)`}/></div></div>
}
function GeometryVisual({spec}:{spec:Extract<VisualizationSpec,{type:"geometry"}>}){
  const width=560,height=320,pad=42;const map=new Map<string,GeometryPoint>();spec.points.forEach(point=>map.set(point.label,point));const sx=(x:number)=>pad+Math.max(0,Math.min(1,x))*(width-2*pad);const sy=(y:number)=>pad+Math.max(0,Math.min(1,y))*(height-2*pad);
  return <div className="mathVisualPanel"><div className="mathVisualTitle">{spec.title??"Geometri şekli"}</div><svg className="geometrySvg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sorunun geometri şeklinin yeniden çizimi"><rect x="0" y="0" width={width} height={height} rx="18" className="graphSurface"/>
    {spec.circles.map((circle,index)=>{const center=map.get(circle.center);if(!center)return null;const through=circle.through?map.get(circle.through):undefined;const radius=through?Math.hypot(sx(through.x)-sx(center.x),sy(through.y)-sy(center.y)):(circle.radius??.2)*(width-2*pad);return <g key={`circle-${index}`}><circle cx={sx(center.x)} cy={sy(center.y)} r={radius} className="geometryLine" fill="none"/>{circle.label&&<text x={sx(center.x)+radius+6} y={sy(center.y)} className="geometryLabel">{circle.label}</text>}</g>})}
    {spec.segments.map((segment,index)=>{const a=map.get(segment.from),b=map.get(segment.to);if(!a||!b)return null;const x1=sx(a.x),y1=sy(a.y),x2=sx(b.x),y2=sy(b.y);return <g key={`seg-${index}`}><line x1={x1} y1={y1} x2={x2} y2={y2} className="geometryLine"/>{segment.label&&<text x={(x1+x2)/2} y={(y1+y2)/2-8} textAnchor="middle" className="geometryMeasure">{segment.label}</text>}</g>})}
    {spec.angles.map((angle,index)=>{const point=map.get(angle.at);if(!point||!angle.label)return null;return <text key={`angle-${index}`} x={sx(point.x)+12} y={sy(point.y)-12} className="geometryAngle">{angle.label}</text>})}
    {spec.points.map((point,index)=><g key={`point-${index}`}><circle cx={sx(point.x)} cy={sy(point.y)} r="5" className="geometryPoint"/><text x={sx(point.x)+9} y={sy(point.y)-9} className="geometryLabel">{point.label}</text></g>)}</svg><div className="mathVisualNote">Şekil, sorudaki ilişkileri anlatmak için yeniden çizilmiştir; ölçek birebir olmayabilir.</div></div>
}
export function MathVisualization({spec}:{spec?:VisualizationSpec}){if(!spec)return null;return spec.type==="geometry"?<GeometryVisual spec={spec}/>:<GraphVisual spec={spec}/>}
