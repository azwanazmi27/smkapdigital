import {generateReportText} from "../../../services/ai/report-text";
export const POST=(request:Request)=>generateReportText(request,true);
