import type {jsPDF} from 'jspdf';
import {oprLetterheadLogo} from './opr-letterhead-logo';
// Retained from the portal OPR template. References remain document fields;
// the header never manufactures an official school reference or signature.
export function drawOprLetterhead(pdf:jsPDF,label='E-PANITIA'){
 const width=pdf.internal.pageSize.getWidth();
 pdf.setFillColor(201,230,247);pdf.rect(0,0,width,40,'F');
 pdf.setFillColor(231,245,253);pdf.circle(width-23,3,28,'F');pdf.circle(width-52,1,17,'F');
 pdf.setFillColor(218,238,250);pdf.roundedRect(3,3,width-6,33,7,7,'F');
 pdf.setFillColor(235,247,253);pdf.circle(width-12,31,26,'F');
 pdf.setDrawColor(153,199,225);pdf.roundedRect(3,3,width-6,33,7,7,'S');
 pdf.setFillColor(45,119,165);pdf.rect(0,38,width,1.4,'F');pdf.setFillColor(124,184,216);pdf.rect(0,39.4,width,.6,'F');
 pdf.addImage(oprLetterheadLogo,'PNG',8,8,63,17,undefined,'FAST');
 pdf.setTextColor(22,54,82);pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.text('SMK AGAMA PAHANG',76,14);
 pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text('MUADZAM SHAH, PAHANG',76,20);
 pdf.setTextColor(82,157,199);pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);pdf.text(label,76,28);
}
