import JSZip from 'jszip';
import {parseMidiData,parseMusicXmlData} from './midiParser';

export async function parsePlaybackFile(file:File,names:Map<number,string>){
 const ext=file.name.split('.').pop()?.toLowerCase();
 if(ext==='mid'||ext==='midi'||file.type.includes('midi'))return parseMidiData(await file.arrayBuffer(),names);
 if(ext==='mxl'){
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  const container=zip.file('META-INF/container.xml')||
    Object.values(zip.files).find(f=>!f.dir&&f.name.toLowerCase().replace(/\\/g,'/')==='meta-inf/container.xml');
  let name:string|null=null;
  if(container){
    const doc=new DOMParser().parseFromString(await container.async('string'),'application/xml');
    name=doc.getElementsByTagName('rootfile')[0]?.getAttribute('full-path')||null;
  }
  const cleanName=name?.replace(/^\.\//,'').replace(/\\/g,'/');
  const entry=(cleanName?(zip.file(cleanName)||Object.values(zip.files).find(f=>f.name.replace(/\\/g,'/')===cleanName)):null)||
    Object.values(zip.files).find(f=>!f.dir&&!f.name.toLowerCase().replace(/\\/g,'/').startsWith('meta-inf/')&&/\.(xml|musicxml)$/i.test(f.name));
  if(!entry)throw new Error('The MXL archive does not contain a MusicXML score.');
  return parseMusicXmlData(await entry.async('string'),names);
 }
 if(ext==='xml'||ext==='musicxml'||file.type.includes('xml'))return parseMusicXmlData(await file.text(),names);
 throw new Error('Use a MIDI or MusicXML file.');
}
