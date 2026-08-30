import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization");if(!auth)return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const {data:{user}}=await db.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return new Response(JSON.stringify({error:"Invalid session"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const {data:p}=await db.from("profiles").select("role,is_disabled,is_approved").eq("id",user.id).maybeSingle();if(!p||p.is_disabled||p.is_approved===false||!['admin','teacher','staff','headteacher'].includes(String(p.role).toLowerCase()))return new Response(JSON.stringify({error:"Staff authorization required"}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
  const body=await req.json();const items=Array.isArray(body.recipients)?body.recipients:[];if(items.length>500)return new Response(JSON.stringify({error:"Maximum 500 recipients per batch"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const message=String(body.message||"").trim();const channel=body.channel==="whatsapp"?"whatsapp":"sms";if(!message||message.length>1000)return new Response(JSON.stringify({error:"Message is required and must be 1000 characters or fewer"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const rows=items.map((r:{profile_id?:string;destination?:string})=>({recipient_profile_id:r.profile_id||null,destination:String(r.destination||"").trim(),channel,message,event_type:String(body.event_type||"manual_bulk"),status:"queued",provider:body.provider?String(body.provider):"placeholder"})).filter(r=>r.destination);
  const {data,error}=await db.from("communication_outbox").insert(rows).select("id,destination,channel,status");if(error)throw error;
  return new Response(JSON.stringify({queued:data?.length||0,provider:"placeholder",note:"Gateway delivery is intentionally disabled until a Kenyan SMS/WhatsApp provider is configured."}),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){console.error(e);return new Response(JSON.stringify({error:"Could not queue communication batch"}),{status:500,headers:{...cors,"Content-Type":"application/json"}})}
});
