const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../dokono_masu_kana.html'), 'utf8');
class Element {
  constructor() {
    this.children=[]; this.style={}; this.handlers={}; this.attrs={}; this.classes=new Set(); this.textContent='';
    this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,b)=>{b=b??!this.classes.has(x);b?this.classes.add(x):this.classes.delete(x)}};
  }
  set innerHTML(v){this.children=[]} set className(v){this.classes=new Set(v.split(' '))}
  setAttribute(k,v){this.attrs[k]=v} addEventListener(k,f){this.handlers[k]=f} appendChild(e){this.children.push(e)}
  focus(){}
  click(){if(!this.disabled)this.handlers.click?.()}
}
function app(level=2, size=3, storage) {
  const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
  els.level.value=String(level); els.size.value=String(size); els.hintMode.value='step';
  const saved={};
  const context={document:{getElementById:id=>els[id],createElement:()=>new Element()},window:{addEventListener(){}},
    localStorage:storage||{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v,removeItem:k=>delete saved[k]},performance,Date,Math,Blob,URL,setTimeout};
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  return {els,saved};
}
function coordinate(text,n){const [,dir,num]=text.match(/(うえ|した|ひだり|みぎ)から (\d+)ばんめ/);return dir==='うえ'||dir==='ひだり'?Number(num)-1:n-Number(num)}
test('Lv.1–3 direction mapping and staged selection, 240 questions',()=>{
 for(const level of [1,2,3]) for(const size of [3,4]) {
  const {els:e}=app(level,size);
  for(let k=0;k<40;k++) {
   const q=e.question.textContent;
   let index;
   if(level===1) index=coordinate(q,size);
   else if(level===2){
    const row=coordinate(q,size); const fruits=e.board.children.map(b=>b.children.map(x=>x.textContent)).flat();
    e.board.children[(row+1)%size].click(); e.checkBtn.click(); assert.match(e.status.textContent,/もういちど/);
    e.board.children[row].click(); e.checkBtn.click();
    assert.deepEqual(e.board.children.map(b=>b.textContent),fruits);
    assert.equal(e.board.children.filter(b=>!b.disabled).length,size);
    index=row*size+coordinate(e.question.textContent,size);
   } else {const [v,h]=q.split('、');index=coordinate(v,size)*size+coordinate(h,size)}
   e.board.children[index].click(); e.checkBtn.click(); assert.equal(e.stepLabel.textContent,'せいかい');
   assert.ok(e.resetBtn.disabled); assert.ok(e.board.children.every(b=>b.disabled));
   e.nextBtn.click(); assert.ok(e.checkBtn.disabled);
  }
 }
});
test('hints remain visible and reset with next problem; reveal cannot become a correct answer',()=>{
 const {els:e}=app(3);e.hintBtn.click();e.hintBtn.click();e.hintBtn.click();
 assert.equal(e.board.children.filter(b=>b.classes.has('target')).length,1);
 e.answerBtn.click();e.checkBtn.click();assert.equal(e.stepLabel.textContent,'こたえ');
 e.nextBtn.click();assert.equal(e.board.children.filter(b=>b.classes.has('target')).length,0);
});
test('history distinguishes stages, hints, reveal, and skips; selection alone is not an answer',()=>{
 const {els:e,saved}=app(2);const row=coordinate(e.question.textContent,3);
 e.board.children[row].click();e.resetBtn.click();assert.equal(Object.keys(saved).length,0);
 e.board.children[row].click();e.checkBtn.click();e.hintBtn.click();e.answerBtn.click();
 let records=JSON.parse(Object.values(saved)[0]);
 assert.equal(records[0].outcome,'revealed');assert.equal(records[0].events.filter(x=>x.type==='answer').length,1);
 assert.equal(records[0].events[0].phase,'row');assert.equal(records[0].events.find(x=>x.type==='hint').phase,'cell');
 e.nextBtn.click();e.nextBtn.click();records=JSON.parse(Object.values(saved)[0]);assert.equal(records.at(-1).outcome,'skipped');
});
test('unavailable or malformed storage does not prevent learning',()=>{
 for(const storage of [{getItem(){throw Error()},setItem(){throw Error()}},{getItem:()=>'{bad',setItem(){throw Error()}}]){
  const {els:e}=app(3,3,storage);e.answerBtn.click();assert.equal(e.stepLabel.textContent,'こたえ');assert.match(e.storageStatus.textContent,/保存を利用できません/);
 }
});
test('Lv.4 hides hints even when settings allow them; answer reveal is recorded separately',()=>{
 const {els:e,saved}=app(4);assert.ok(e.hintBtn.classes.has('hidden'));assert.ok(e.hintMode.disabled);
 e.hintBtn.click();assert.equal(e.board.children.filter(b=>b.classes.has('row-hint')).length,0);
 e.answerBtn.click();assert.equal(JSON.parse(Object.values(saved)[0])[0].outcome,'revealed');
});
test('history is capped at 200 questions',()=>{
 const {els:e,saved}=app(1);for(let i=0;i<205;i++)e.nextBtn.click();
 assert.equal(JSON.parse(Object.values(saved)[0]).length,200);
});
