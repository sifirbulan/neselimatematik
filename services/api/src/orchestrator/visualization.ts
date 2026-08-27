import type { GeometryAngle, GeometryCircle, GeometryPoint, GeometrySegment, VisualizationSpec } from "./types.js";

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
const finiteNumber=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:undefined;
const cleanLabel=(value:unknown)=>typeof value==="string"?value.trim().slice(0,40):undefined;
const cleanExpression=(value:unknown)=>typeof value==="string"?value.trim().slice(0,140):undefined;

function parsePoint(value:unknown):GeometryPoint|undefined{
  if(!value||typeof value!=="object")return undefined;
  const item=value as Record<string,unknown>;
  const label=cleanLabel(item.label);const x=finiteNumber(item.x);const y=finiteNumber(item.y);
  if(!label||x===undefined||y===undefined)return undefined;
  return{label,x:clamp01(x),y:clamp01(y)};
}
function parseSegment(value:unknown):GeometrySegment|undefined{
  if(!value||typeof value!=="object")return undefined;
  const item=value as Record<string,unknown>;const from=cleanLabel(item.from);const to=cleanLabel(item.to);
  if(!from||!to)return undefined;const label=cleanLabel(item.label);return{from,to,...(label?{label}:{})};
}
function parseAngle(value:unknown):GeometryAngle|undefined{
  if(!value||typeof value!=="object")return undefined;
  const item=value as Record<string,unknown>;const at=cleanLabel(item.at);if(!at)return undefined;const label=cleanLabel(item.label);return{at,...(label?{label}:{})};
}
function parseCircle(value:unknown):GeometryCircle|undefined{
  if(!value||typeof value!=="object")return undefined;
  const item=value as Record<string,unknown>;const center=cleanLabel(item.center);if(!center)return undefined;
  const through=cleanLabel(item.through);const radius=finiteNumber(item.radius);const label=cleanLabel(item.label);
  return{center,...(through?{through}:{}),...(radius!==undefined?{radius:clamp01(Math.abs(radius))}:{}),...(label?{label}:{})};
}
function parseArray<T>(value:unknown,parser:(item:unknown)=>T|undefined,max:number):T[]{if(!Array.isArray(value))return[];return value.slice(0,max).map(parser).filter((item):item is T=>Boolean(item))}

export function parseVisualization(value:unknown):VisualizationSpec|undefined{
  if(typeof value!=="string"||!value.trim())return undefined;
  let parsed:unknown;try{parsed=JSON.parse(value)}catch{return undefined}
  if(!parsed||typeof parsed!=="object")return undefined;
  const data=parsed as Record<string,unknown>;const type=data.type;
  if(type==="function"||type==="integral"){
    const expression=cleanExpression(data.expression);if(!expression)return undefined;
    const xMin=finiteNumber(data.xMin);const xMax=finiteNumber(data.xMax);const lower=finiteNumber(data.lower);const upper=finiteNumber(data.upper);const title=cleanLabel(data.title);
    return{type,expression,...(title?{title}:{}),...(xMin!==undefined?{xMin}:{}),...(xMax!==undefined?{xMax}:{}),...(lower!==undefined?{lower}:{}),...(upper!==undefined?{upper}:{})};
  }
  if(type==="geometry"){
    const points=parseArray(data.points,parsePoint,20);if(points.length<2)return undefined;
    const pointNames=new Set(points.map(point=>point.label));
    const segments=parseArray(data.segments,parseSegment,30).filter(segment=>pointNames.has(segment.from)&&pointNames.has(segment.to));
    const angles=parseArray(data.angles,parseAngle,12).filter(angle=>pointNames.has(angle.at));
    const circles=parseArray(data.circles,parseCircle,8).filter(circle=>pointNames.has(circle.center)&&(!circle.through||pointNames.has(circle.through)));
    const title=cleanLabel(data.title);
    return{type,points,segments,angles,circles,...(title?{title}:{})};
  }
  return undefined;
}

export const visualizationGuidance=[
  "Matematiksel ifadeleri answer, explanation ve steps alanlarında LaTeX ile yaz. Satır içi formülü \\( ... \\), ayrı satır formülünü \\[ ... \\] ile çevrele.",
  "visualization alanı her zaman STRING olmalı. Görsel gerekmiyorsa boş string döndür.",
  "Fonksiyon grafiği gerekiyorsa visualization içine JSON string olarak şu yapıyı koy: {\"type\":\"function\",\"expression\":\"x^2-4\",\"xMin\":-5,\"xMax\":5}. expression yalnızca x, sayılar, + - * / ^, parantez ve sin cos tan sqrt abs exp ln log pi e fonksiyon/sabitlerini kullansın.",
  "Limit sorusunda grafiğe bakmak yaklaşımı anlamayı belirgin biçimde kolaylaştırıyorsa type=function kullan ve limit alınan noktanın çevresini xMin/xMax ile görünür yap.",
  "Belirli integralin alanı anlamayı kolaylaştıracaksa type=integral kullan ve expression, lower, upper, xMin, xMax ver.",
  "Geometri sorusunda şekil çözüm için önemliyse type=geometry kullan. points koordinatları 0 ile 1 arasında yaklaşık yerleşimdir; segments kenarları, angles açı etiketlerini, circles çemberleri tanımlar. Görselde olmayan bilgi uydurma.",
  "Geometri örneği: {\"type\":\"geometry\",\"points\":[{\"label\":\"A\",\"x\":0.15,\"y\":0.8},{\"label\":\"B\",\"x\":0.85,\"y\":0.8},{\"label\":\"C\",\"x\":0.35,\"y\":0.2}],\"segments\":[{\"from\":\"A\",\"to\":\"B\",\"label\":\"6\"},{\"from\":\"A\",\"to\":\"C\",\"label\":\"8\"}],\"angles\":[{\"at\":\"A\",\"label\":\"90°\"}]}"
].join("\n");
