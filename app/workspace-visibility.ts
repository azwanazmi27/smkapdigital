// Loading and failure must never be mistaken for an empty successful response.
export function showRoomWorkspace({loaded,error,supervised,isCoordinator,activeCount}:{loaded:boolean;error:string;supervised:boolean;isCoordinator:boolean;activeCount:number}){
 return !loaded||Boolean(error)||(supervised?isCoordinator:activeCount>0);
}
