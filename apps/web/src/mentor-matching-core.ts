export type MentorSupportType = "Branş Öğretmeni" | "Akademik Koç" | "Mentor";
export type MentorMode = "Online" | "Yüz yüze";

export interface MentorProfileMatch {
  userId:string;
  displayName:string;
  supportTypes:string[];
  subjects:string[];
  levels:string[];
  modes:string[];
  city?:string;
  bio?:string;
  experienceYears?:number;
  active?:boolean;
}

export interface MentorNeed {
  supportType:MentorSupportType | string;
  subject:string;
  level:string;
  mode:MentorMode | string;
  city?:string;
}

export interface MentorMatch {
  mentor:MentorProfileMatch;
  score:number;
  reasons:string[];
}

function clean(value:unknown){return String(value??"").trim().toLocaleLowerCase("tr-TR")}
function listHas(values:unknown[],target:unknown){const t=clean(target);return values.some(value=>clean(value)===t)}
function hasAny(values:unknown[],targets:string[]){return targets.some(target=>listHas(values,target))}

export function scoreMentorMatch(mentor:MentorProfileMatch,need:MentorNeed):MentorMatch|null {
  if(mentor.active===false)return null;
  const supportTypes=Array.isArray(mentor.supportTypes)?mentor.supportTypes:[];
  const subjects=Array.isArray(mentor.subjects)?mentor.subjects:[];
  const levels=Array.isArray(mentor.levels)?mentor.levels:[];
  const modes=Array.isArray(mentor.modes)?mentor.modes:[];

  if(!listHas(supportTypes,need.supportType))return null;
  if(!listHas(modes,need.mode))return null;

  const isBranchTeacher=clean(need.supportType)===clean("Branş Öğretmeni");
  const subjectMatch=listHas(subjects,need.subject)||hasAny(subjects,["Genel","Tüm dersler","Tüm branşlar"]);
  if(isBranchTeacher&&!subjectMatch)return null;

  if(clean(need.mode)===clean("Yüz yüze")){
    if(!clean(need.city)||!clean(mentor.city)||clean(need.city)!==clean(mentor.city))return null;
  }

  const reasons:string[]=[];
  let score=35;
  reasons.push(`${need.supportType} desteği`);

  if(subjectMatch){score+=25;reasons.push(`${need.subject} uyumu`)}
  else if(!isBranchTeacher){score+=8;reasons.push("genel koçluk uyumu")}

  if(levels.length===0||hasAny(levels,["Tüm seviyeler","Tümü"])||listHas(levels,need.level)){
    score+=20;reasons.push(`${need.level} seviyesi`);
  }

  score+=10;
  reasons.push(need.mode);

  if(clean(need.mode)===clean("Yüz yüze")&&clean(mentor.city)===clean(need.city)){
    score+=10;reasons.push(`${need.city} konumu`);
  }else if(clean(need.mode)===clean("Online")){
    score+=10;reasons.push("konum bağımsız")
  }

  return{mentor,score:Math.min(100,score),reasons};
}

export function rankMentors(mentors:MentorProfileMatch[],need:MentorNeed,limit=5):MentorMatch[]{
  return mentors
    .map(mentor=>scoreMentorMatch(mentor,need))
    .filter((item):item is MentorMatch=>Boolean(item))
    .sort((a,b)=>b.score-a.score||(Number(b.mentor.experienceYears)||0)-(Number(a.mentor.experienceYears)||0)||a.mentor.displayName.localeCompare(b.mentor.displayName,"tr"))
    .slice(0,Math.max(1,limit));
}
