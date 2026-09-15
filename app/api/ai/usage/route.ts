import {portalActor} from '../../../server-auth';
import {getAIUsage} from '../../../services/ai/usage';
export async function GET(request:Request){
  try{const actor=await portalActor(request);if(!actor)return Response.json({error:'Sila log masuk.'},{status:401});return Response.json(await getAIUsage(actor),{headers:{'Cache-Control':'private, no-store'}});}
  catch{return Response.json({error:'Baki penggunaan AI belum dapat dibaca.'},{status:503});}
}
