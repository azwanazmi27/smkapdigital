import {generateReportText} from "../../services/ai/report-text";

// OPR has no daily allowance; only the existing short-term anti-spam guard applies.
export const POST=(request:Request)=>generateReportText(request,false);
