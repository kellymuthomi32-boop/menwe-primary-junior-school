import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
type ToolCall={id:string;function:{name:string;arguments:string}};
const tools=[
 {type:"function",function:{name:"get_my_children",description:"Return only the authenticated parent's linked learners.",parameters:{type:"object",properties:{},additionalProperties:false}}},
 {type:"function",function:{name:"get_child_fee_balance",description:"Return the fee balance and recent fee charges for one linked learner UPI.",parameters:{type:"object",properties:{upi:{type:"string"}},required:["upi"],additionalProperties:false}}},
 {type:"function",function:{name:"get_child_cbc_progress",description:"Return recent CBC assessment and cumulative portfolio evidence for one linked learner UPI.",parameters:{type:"object",properties:{upi:{type:"string"}},required:["upi"],additionalProperties:false}}},
 {type:"function",function:{name:"get_school_announcements",description:"Return published school announcements.",parameters:{type:"object",properties:{},additionalProperties:false}}}
];
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization"); if(!auth)return json({error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, openai=Deno.env.get("OPENAI_API_KEY")!;
  if(!service||!openai)return json({error:"Parent assistant is not configured yet."},503);
  const db=createClient(url,service);
  const token=auth.replace(/^Bearer\s+/i,""); const {data:{user},error:ue}=await db.auth.getUser(token); if(ue||!user)return json({error:"Invalid session"},401);
  const {data:profile}=await db.from("profiles").select("id,role,is_approved,is_disabled,student_ids").eq("id",user.id).maybeSingle();
  if(!profile||String(profile.role).toLowerCase()!=="parent"||profile.is_disabled||profile.is_approved===false)return json({error:"Parent account is not authorized."},403);
  const linkedIds=(profile.student_ids??[]) as string[];
  const {data:children}=await db.from("students").select("id,name,admission_number,upi_number,class_id").in("id",linkedIds);
  const allowed=new Map((children??[]).filter(c=>c.upi_number).map(c=>[String(c.upi_number),c]));
  const body=await req.json(); const messages=Array.isArray(body.messages)?body.messages:[];
  const system=`You are Menwe Primary & Junior School's parent support assistant. Answer only from tool results or general public CBC guidance. Never invent fees, learner results, dates, attendance, or school policy. Never reveal data about an unlinked learner. Keep answers concise and family-friendly. Do not make high-stakes educational or medical decisions.`;
  let current=[{role:"system",content:system},...messages.slice(-12)];
  for(let round=0;round<4;round++){
   const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("OPENAI_MODEL")||"gpt-4o-mini",messages:current,tools,tool_choice:"auto",temperature:0.2})});
   if(!r.ok)return json({error:"AI service temporarily unavailable."},502);
   const completion=await r.json(); const msg=completion.choices?.[0]?.message; if(!msg)return json({error:"No assistant response."},502);
   if(!msg.tool_calls?.length)return json({message:msg.content||"I could not find enough information to answer that."});
   current.push(msg);
   for(const call of msg.tool_calls as ToolCall[]){
    let args:Record<string,unknown>={};try{args=JSON.parse(call.function.arguments||"{}")}catch{}
    let result:unknown;
    if(call.function.name==="get_my_children") result=[...(children??[])].map(c=>({name:c.name,admission_number:c.admission_number,upi_number:c.upi_number}));
    else if(call.function.name==="get_school_announcements"){const {data}=await db.from("announcements").select("title,body,audience,published_at,expires_at,is_pinned").eq("status","published").order("is_pinned",{ascending:false}).order("published_at",{ascending:false}).limit(10);result=data??[];}
    else {const upi=String(args.upi||"").trim(); const child=allowed.get(upi); if(!child)result={error:"That learner is not linked to this parent account."};
      else if(call.function.name==="get_child_cbc_progress"){const [g,p]=await Promise.all([db.from("cbc_grades").select("learning_area,rubric_score,term,teacher_remarks,created_at").eq("learner_upi",upi).order("created_at",{ascending:false}).limit(30),db.from("cbc_portfolio_entries").select("term,grade_level,learning_area,strand,substrand,sba_title,achievement_code,teacher_remarks,competency_scores").eq("learner_upi",upi).order("created_at",{ascending:false}).limit(30)]);result={learner:child.name,assessments:g.data??[],portfolio:p.data??[]};}
      else {const {data:charges}=await db.from("charges").select("id,description,amount,due_date,status").eq("student_id",child.id).order("due_date",{ascending:false}).limit(50);let paid=0;const chargeIds=(charges??[]).map(c=>c.id);if(chargeIds.length){const {data:alloc}=await db.from("payment_allocations").select("charge_id,amount").in("charge_id",chargeIds);paid=(alloc??[]).reduce((s,x)=>s+Number(x.amount||0),0);}const billed=(charges??[]).reduce((s,x)=>s+Number(x.amount||0),0);result={learner:child.name,billed,allocatedPayments:paid,balance:Math.max(billed-paid,0),charges:charges??[]};}
    }
    current.push({role:"tool",tool_call_id:call.id,content:JSON.stringify(result)});
   }
  }
  return json({error:"The assistant reached its safe tool-call limit."},429);
 }catch(e){console.error(e);return json({error:"The parent assistant could not complete that request."},500)}
});
