import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesStandard, evidenceScope, filterEvidence, evidenceUnits, evidenceLink} from '../app/skas-evidence-model.ts';

const base={id:'a',schoolYear:2026,standardCode:'3.2',domain:'Kokurikulum',unitName:'KRS',evidenceType:'OPR',title:'Kem kepimpinan',status:'approved',sourceType:'link',sourceUrl:'https://drive.google.com/file/d/example/view',originalName:'',notes:'',submittedByName:'AZWAN',verifiedByName:'',verifiedAt:'',createdAt:'',sourceModule:'OPR'};
const rows=[base,{...base,id:'b',status:'pending'},{...base,id:'c',schoolYear:2027},{...base,id:'d',standardCode:'1.1',unitName:'Pengurusan',domain:'Pengurusan',evidenceType:'Carta organisasi'}];
test('year scope never mixes evidence between school years',()=>assert.deepEqual(evidenceScope(rows,2026,false).map(x=>x.id),['a','b','d']));
test('monitor displays only approved evidence for selected year',()=>assert.deepEqual(evidenceScope(rows,2026,true).map(x=>x.id),['a','d']));
test('standard includes descendants, never a similar prefix',()=>{assert.ok(matchesStandard('1.1','1'));assert.ok(matchesStandard('1','1'));assert.equal(matchesStandard('10','1'),false);assert.equal(matchesStandard('3.21','3.2'),false);});
test('unit, type, status and text search intersect',()=>assert.deepEqual(filterEvidence(rows,{standard:'3.2',unit:JSON.stringify(['Kokurikulum','KRS']),type:'OPR',status:'pending',query:'azwan'}).map(x=>x.id),['b']));
test('same unit names in different domains remain separate',()=>assert.equal(evidenceUnits([base,{...base,domain:'HEM'}]).length,2));
test('counts reflect actual records including empty lists',()=>{assert.equal(evidenceUnits(rows)[0].count+evidenceUnits(rows)[1].count,4);assert.deepEqual(evidenceUnits([]),[]);});
test('unsafe links are never offered as document actions',()=>{assert.equal(evidenceLink({...base,sourceUrl:'javascript:alert(1)'}),'');assert.equal(evidenceLink({...base,sourceUrl:'not a url'}),'');assert.equal(evidenceLink(base),base.sourceUrl);});
test('uploaded evidence uses its exact escaped record identifier',()=>assert.equal(evidenceLink({...base,sourceType:'upload',id:'a&b'}),'/api/skas?file=a%26b'));
