import {createCloudIntake} from './intake.mjs';
const handler=createCloudIntake(Deno.env.toObject());
Deno.serve((req: Request)=>handler(req));
