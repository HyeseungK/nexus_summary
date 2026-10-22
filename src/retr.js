var STOP={};'a an the and or of to in on for with is are was were be been being by as at from that this these those it its which who whom whose what when where why how not no but if then than so such into about over under between through during before after can could would should may might will shall do does did have has had he she they them their his her we us our you your i me my also just more most other some any all each very there here one two'.split(' ').forEach(function(w){STOP[w]=1});
function stem(w){w=w.replace(/['’]s$/,'');if(w.length>5&&/ies$/.test(w))return w.slice(0,-3)+'y';if(w.length>5&&/(ing|ed)$/.test(w))return w.replace(/(ing|ed)$/,'');if(w.length>4&&/s$/.test(w)&&!/ss$/.test(w))return w.slice(0,-1);return w}
function tok(s){return (s.toLowerCase().match(/[a-z][a-z'’-]*[a-z]|[a-z]/g)||[]).map(stem).filter(function(w){return w.length>1&&!STOP[w]})}
function buildIndex(book){
 var N=book.length,df={},post={},len=[],tot=0;
 book.forEach(function(c,i){var t=tok(c.t),tf={};t.forEach(function(w){tf[w]=(tf[w]||0)+1});len.push(t.length);tot+=t.length;
  for(var w in tf){df[w]=(df[w]||0)+1;(post[w]||(post[w]=[])).push([i,tf[w]])}});
 return{N:N,df:df,post:post,len:len,avg:tot/N,low:book.map(function(c){return c.t.toLowerCase()})}}
function bm25(ix,q){
 var terms=tok(q),sc={},k1=1.3,b=.72;
 terms.forEach(function(w){var p=ix.post[w];if(!p)return;var idf=Math.log(1+(ix.N-ix.df[w]+.5)/(ix.df[w]+.5));
  p.forEach(function(x){var tf=x[1],d=x[0];sc[d]=(sc[d]||0)+idf*tf*(k1+1)/(tf+k1*(1-b+b*ix.len[d]/ix.avg))})});
 var ph=q.toLowerCase().replace(/\s+/g,' ').trim();
 if(ph.indexOf(' ')>0)for(var d in sc){if(ix.low[d].indexOf(ph)>=0)sc[d]+=4}
 return Object.keys(sc).map(function(d){return[+d,sc[d]]}).sort(function(a,b){return b[1]-a[1]}).slice(0,15)}
function search(ix,book,queries,topN){
 var rrf={};queries.forEach(function(q){bm25(ix,q).forEach(function(r,rank){rrf[r[0]]=(rrf[r[0]]||0)+1/(60+rank)})});
 var ids=Object.keys(rrf).map(Number).sort(function(a,b){return rrf[b]-rrf[a]}),out=[],per={};
 for(var i=0;i<ids.length&&out.length<topN;i++){var c=book[ids[i]].c;if((per[c]||0)>=4)continue;per[c]=(per[c]||0)+1;out.push(ids[i])}
 return out}

