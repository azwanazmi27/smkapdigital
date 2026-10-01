import re, sqlite3
from pathlib import Path
source=Path('app/api/relief-legacy/[...path]/route.ts').read_text()
sql=re.search(r'const saved=await env.DB.prepare\("([^"]+)"\)',source)[1]
db=sqlite3.connect(':memory:')
db.execute('CREATE TABLE absences(id TEXT PRIMARY KEY,teacher_id TEXT,teacher_name TEXT,category TEXT,absence_date TEXT,end_date TEXT,reason TEXT,duration TEXT,start_time TEXT,end_time TEXT,note TEXT,relief_status TEXT,created_at TEXT,updated_at TEXT)')
def insert(id,teacher,start,end=None):
 args=[id,teacher,teacher,'mainstream',start,end,'CRK','full',None,None,'','pending','now','now',teacher,teacher,end or start,start]
 return db.execute(sql,args).rowcount
assert insert('1','Azwan','2026-10-01')==1
assert insert('2','Azwan','2026-10-01')==0
assert insert('3','Azwan','2026-09-30','2026-10-02')==0
assert insert('4','Rahim','2026-10-01')==1
assert insert('5','Azwan','2026-10-02','2026-10-04')==1
assert insert('6','Azwan','2026-10-03')==0
update=re.search(r'const updated=await env.DB.prepare\("([^"]+)"\)',source)[1]
def edit(start):
 return db.execute(update,['Azwan','Azwan','mainstream',start,None,'CRK','full',None,None,'','now','1','1','Azwan','Azwan',start,start]).rowcount
assert edit('2026-10-01')==1
assert edit('2026-10-03')==0
assert edit('2026-10-05')==1
print('PASS: same day, overlapping ranges, other teacher, other date, self-edit and conflicting edit')
