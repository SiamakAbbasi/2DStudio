import type { BodyProfile, CharacterAsset } from "./types";

const KEY="flip-studio-character-library-v1";
const now="2026-01-01T00:00:00.000Z";
const starter=(id:string,name:string,bodyProfile:BodyProfile,primaryColor:string,accentColor:string,head:CharacterAsset["appearance"]["head"]="none",face:CharacterAsset["appearance"]["face"]="none",body:CharacterAsset["appearance"]["body"]="none",equipment:CharacterAsset["equipment"]="none"):CharacterAsset=>({id,name,bodyProfile,appearance:{primaryColor,accentColor,head,face,body},equipment,previewSettings:{action:"idle"},createdAt:now,updatedAt:now});

export const starterCharacters:CharacterAsset[]=[
  starter("starter_azure","Azure","standard","#45a3ff","#a9dcff"),
  starter("starter_crimson","Crimson","male","#ef4b5f","#ffbd55","headband"),
  starter("starter_shadow","Shadow","small","#242938","#8c78ff","none","ninja-mask","scarf"),
  starter("starter_jade","Jade","female","#42c986","#b6f36b","hood"),
  starter("starter_titan","Titan","large","#586070","#ff9f43","none","mask","none","staff"),
  starter("starter_ivory","Ivory","standard","#e7ebf2","#e6b75c","none","none","scarf"),
];

const valid=(x:any):x is CharacterAsset=>x&&typeof x.id==="string"&&typeof x.name==="string"&&x.appearance&&typeof x.appearance.primaryColor==="string";
export function loadCharacterLibrary(){
  try{const saved=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(saved)?[...starterCharacters,...saved.filter(valid)]:starterCharacters;}
  catch{return starterCharacters;}
}
export function saveCharacterLibrary(items:CharacterAsset[]){
  const custom=items.filter(item=>!item.id.startsWith("starter_"));
  localStorage.setItem(KEY,JSON.stringify(custom));
}
export function createCharacterAsset(partial?:Partial<CharacterAsset>):CharacterAsset{
  const stamp=new Date().toISOString();
  return {id:`character_${crypto.randomUUID()}`,name:"New Character",bodyProfile:"standard",appearance:{primaryColor:"#9b6cff",accentColor:"#ffd166",head:"none",face:"none",body:"none"},equipment:"none",previewSettings:{action:"idle"},createdAt:stamp,updatedAt:stamp,...partial};
}
export function duplicateCharacterAsset(source:CharacterAsset){
  const copy=structuredClone(source),stamp=new Date().toISOString();
  return {...copy,id:`character_${crypto.randomUUID()}`,name:`${source.name} Copy`,createdAt:stamp,updatedAt:stamp};
}
