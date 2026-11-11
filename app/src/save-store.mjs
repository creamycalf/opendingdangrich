// Native disk storage is authoritative once migrated; web storage is a cache.
export function createSaveStore(web,key,native=null){
  let tail=Promise.resolve(),available=false,committed;
  const mirror=value=>value===null?web.removeItem(key):web.setItem(key,value);
  function save(value){
    if(value!==null&&typeof value!=='string')return Promise.reject(Error('无效存档内容'));
    if(!native){try{mirror(value);available=value!==null;}catch(error){return Promise.reject(error);}}
    const write=tail.then(async()=>{
      if(!native||committed===value)return;
      await native.write({value});
      committed=value;available=value!==null;
      try{mirror(value);}catch{/* The acknowledged disk save remains available. */}
    });
    tail=write.catch(()=>{});
    return write;
  }
  async function load(){
    await tail;
    if(!native){const value=web.getItem(key);available=value!==null;return value;}
    const stored=await native.read();
    if(stored.initialized){
      if(stored.value!==null&&typeof stored.value!=='string')throw Error('安卓存档格式无效');
      committed=stored.value;available=stored.value!==null;try{mirror(stored.value);}catch{/* Web cache may be full. */}return stored.value;
    }
    const legacy=web.getItem(key);await save(legacy);return legacy;
  }
  return {save,load,hasSave:()=>available};
}
