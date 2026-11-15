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
