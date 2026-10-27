/** Deterministic extension ZIP without third-party build dependencies. */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
const source = resolve('extension');
const manifest = JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
const target = resolve('dist');
mkdirSync(target, { recursive: true });
const fileName = `local-tool-bridge-v${manifest.version}.zip`;

let crcTable;
function crc32(buffer) {
  if (!crcTable) {
    crcTable = Array.from({length:256}, (_,k) => {
      let c = k; for (let j=0;j<8;j++) c = (c&1) ? (0xEDB88320^(c>>>1)) : (c>>>1);
      return c >>> 0;
    });
  }
  let c = 0xFFFFFFFF;
  for (const b of buffer) c = crcTable[(c^b)&255]^(c>>>8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function files(dir) {
  return readdirSync(dir).flatMap(item => {
    const path=join(dir,item);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
let offset=0;
const locals=[], central=[];
for(const full of files(source).sort()) {
  const name=relative(source,full).replaceAll('\\','/');
  const nameBytes=Buffer.from(name);
  const data=readFileSync(full);
  if(nameBytes.length>0xFFFF || data.length>0xFFFFFFFF) throw new Error('Too large');
  const crc=crc32(data);
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt16LE(33,12); // DOS date 1980-01-01 (fixed, reproducible)
  local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);
  local.writeUInt32LE(data.length,22);local.writeUInt16LE(nameBytes.length,26);
  locals.push(local,nameBytes,data);
  const meta=Buffer.alloc(46);
  meta.writeUInt32LE(0x02014b50,0);meta.writeUInt16LE(20,4);meta.writeUInt16LE(20,6);
  meta.writeUInt16LE(33,14); // DOS date 1980-01-01
  meta.writeUInt32LE(crc,16);meta.writeUInt32LE(data.length,20);meta.writeUInt32LE(data.length,24);
  meta.writeUInt16LE(nameBytes.length,28);meta.writeUInt32LE(offset,42);
  central.push(meta,nameBytes);
  offset+=local.length+nameBytes.length+data.length;
}
const directory=Buffer.concat(central);
const end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files(source).length,8);
end.writeUInt16LE(files(source).length,10);
end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
writeFileSync(join(target,fileName),Buffer.concat([...locals,directory,end]));
console.log(`Created dist/${fileName} (standalone extension runtime only)`);
