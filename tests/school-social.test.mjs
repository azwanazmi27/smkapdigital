import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync('app/school-social-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};new Function('exports',code)(exports);const {validSchoolSocialUrl:valid}=exports;
test('school social links accept official platform URLs and empty values for hiding',()=>{for(const [key,url] of [['school_facebook_url','https://www.facebook.com/school'],['school_tiktok_url','https://www.tiktok.com/@school'],['school_youtube_url','https://www.youtube.com/@school'],['school_youtube_url','https://youtu.be/example']]){assert.equal(valid(key,url),true);assert.equal(valid(key,''),true);}});
test('school social links reject executable schemes, spoof domains, credentials and wrong platforms',()=>{for(const url of ['javascript:alert(1)','http://facebook.com/school','https://facebook.com.evil.example/school','https://evilfacebook.com/school','https://user:pass@facebook.com/school','https://tiktok.com/@school'])assert.equal(valid('school_facebook_url',url),false);assert.equal(valid('unknown','https://facebook.com/school'),false);});
