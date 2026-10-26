export const MEDIA_TYPES={'video/mp4':'.mp4','video/webm':'.webm','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif'};
export function validMediaHeader(data,type){
 const ascii=(start,end)=>String.fromCharCode(...data.slice(start,end));
 if(type==='video/mp4')return ascii(4,8)==='ftyp';
 if(type==='video/webm')return [0x1a,0x45,0xdf,0xa3].every((v,i)=>data[i]===v);
 if(type==='image/jpeg')return data[0]===255&&data[1]===216;
 if(type==='image/png')return [137,80,78,71,13,10,26,10].every((v,i)=>data[i]===v);
 if(type==='image/gif')return /^GIF8[79]a$/.test(ascii(0,6));
 return type==='image/webp'&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
}
