import {createOfficeHandler} from './handler.mjs';
const names=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','FRANKENPACKT_INTAKE_ORIGIN','OPS_OFFICE_FILE_TOKEN'];
Deno.serve(createOfficeHandler(Object.fromEntries(names.map(name=>[name,Deno.env.get(name)]))));
