import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDutyScheduleText} from '../app/staff-work-pdf.ts';

test('jadual bertugas mengambil nama dan tarikh tanpa memasukkan cuti atau nama sementara',()=>{
  const rows=parseDutyScheduleText([`01\n12.01.2026\nhingga\n16.01.2026\nALI BIN ABU\nSITI BINTI AMIN\nCUTI TAMBAHAN\n02\n19.01.2026\nhingga\n23.01.2026\nCIKGU X\nNUR BINTI RAHMAN`]);
  assert.deepEqual(rows.map(row=>[row.name,row.startDate,row.endDate]),[
    ['ALI BIN ABU','2026-01-12','2026-01-16'],
    ['SITI BINTI AMIN','2026-01-12','2026-01-16'],
    ['NUR BINTI RAHMAN','2026-01-19','2026-01-23'],
  ]);
});
