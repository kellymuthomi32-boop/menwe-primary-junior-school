import { ArrowLeft, ArrowRight, Calculator, CheckCircle2, Cpu, FlaskConical, Globe2, Leaf, Music2, Sparkles } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const DATA: Record<string, {
  title:string; shortTitle:string; icon:any; levels:string; intro:string; parentIntro:string;
  why:string; whatLearnersDo:string[]; parentSees:string[]; homeSupport:string[];
  skills:string[]; progression:{stage:string;title:string;items:string[]}[];
}> = {
 "pre-technical-studies-ict":{
  title:"Pre-Technical Studies & ICT", shortTitle:"Pre-Technical & ICT", icon:Cpu, levels:"Grades 4–9",
  intro:"A practical learning area that helps learners understand technology, materials, design, tools and how ideas can become useful solutions.",
  parentIntro:"For a parent, this is more than computer time. Learners gradually build practical confidence: they learn to think through a problem, plan a solution, use tools safely and apply digital technology responsibly.",
  why:"The goal is to help learners become capable problem-solvers who can use practical and digital skills in school, at home and in future learning or work.",
  whatLearnersDo:["Explore tools, materials and their safe use","Plan, design, make and improve simple solutions","Develop digital literacy and responsible technology habits","Use practical projects to explain ideas and solve problems"],
  parentSees:["A learner explaining how something works","Greater confidence using technology for learning","Projects, drawings, designs or practical tasks","Improved care, safety and responsibility when using tools"],
  homeSupport:["Ask your child to explain how a device or household item works","Encourage safe, purposeful use of phones and computers for learning","Let learners plan small practical tasks instead of doing everything for them","Praise careful thinking, improvement and problem solving"],
  skills:["Digital literacy","Creativity","Critical thinking","Problem solving","Self-management"],
  progression:[
   {stage:"Grades 4–6",title:"Build practical foundations",items:["Technology and digital awareness","Design and making activities","Safe use of tools and materials","Simple problem-solving projects"]},
   {stage:"Grades 7–9",title:"Apply ideas with greater independence",items:["Design processes and practical projects","Digital and ICT skills","Entrepreneurial and problem-solving thinking","More independent project work"]}
  ]
 },
 "integrated-science-health":{
  title:"Integrated Science & Health Education", shortTitle:"Integrated Science", icon:FlaskConical, levels:"PP1–JSS 3",
  intro:"Science learning grows from curiosity and observation into investigation, explanation, practical work, health awareness and evidence-based thinking.",
  parentIntro:"Parents will see this area in everyday questions: Why does this happen? How do we stay healthy? What happens to plants, animals, water and materials? School turns that curiosity into observation, investigation and responsible action.",
  why:"Science helps learners make sense of the world and make informed choices about health, safety and the environment.",
  whatLearnersDo:["Observe, ask questions and investigate","Record and communicate what they discover","Explore living things, matter, energy and the environment","Connect scientific ideas with health, hygiene and daily life"],
  parentSees:["Curiosity and better questioning","Simple investigations and practical activities","Learners explaining observations using evidence","Greater awareness of hygiene, health and the environment"],
  homeSupport:["Ask 'what did you observe?' rather than only 'what is the answer?'","Use safe household or outdoor observations as learning opportunities","Discuss hygiene, nutrition, safety and environmental care","Encourage children to explain evidence for their ideas"],
  skills:["Inquiry","Critical thinking","Communication","Collaboration","Self-efficacy"],
  progression:[
   {stage:"Early Years & Primary",title:"Discover and explain",items:["Observation and guided discovery","Living things and the environment","Health, hygiene and safety","Simple practical investigations"]},
   {stage:"Junior Secondary",title:"Investigate and reason",items:["More structured investigations","Scientific concepts and evidence","Health and environmental applications","Communicating findings"]}
  ]
 },
 "agriculture-nutrition":{
  title:"Agriculture & Nutrition", shortTitle:"Agriculture & Nutrition", icon:Leaf, levels:"PP1–JSS 3",
  intro:"Agriculture connects learning with food, plants, animals, soil, environmental care and healthy choices through practical experiences.",
  parentIntro:"A parent can think of this learning area as the connection between the classroom, the food we eat and the environment around us. Learners discover where food comes from, how resources are cared for and why nutrition matters.",
  why:"Practical agriculture and nutrition build responsibility, food awareness, environmental stewardship and useful life skills.",
  whatLearnersDo:["Observe and care for plants and growing spaces","Learn about food production and responsible resource use","Explore nutrition and healthy choices","Connect agriculture with environmental conservation"],
  parentSees:["Interest in plants, food and the environment","Practical school-garden or project activities","Better understanding of healthy choices","Learners taking responsibility for simple tasks"],
  homeSupport:["Involve your child in safe gardening or food-preparation conversations","Discuss where common foods come from","Talk about balanced choices and hygiene","Encourage care for water, soil, plants and the environment"],
  skills:["Responsibility","Citizenship","Creativity","Collaboration","Practical problem solving"],
  progression:[
   {stage:"Early Years & Primary",title:"Experience and care",items:["Plants, food and the environment","Simple gardening experiences","Healthy living and nutrition awareness","Care and responsibility"]},
   {stage:"Junior Secondary",title:"Understand and apply",items:["More systematic agricultural practices","Nutrition and food choices","Resource conservation","Projects and practical application"]}
  ]
 },
 "languages":{
  title:"Languages", shortTitle:"English & Kiswahili", icon:Globe2, levels:"PP1–JSS 3",
  intro:"Language learning helps learners listen, speak, read, write and communicate ideas confidently while appreciating culture and different forms of expression.",
  parentIntro:"For a parent, Languages is not simply grammar or spelling. It is the foundation for understanding instructions, reading information, explaining ideas, answering questions, writing clearly and participating confidently in school and everyday life.",
  why:"Strong language skills support every other learning area. A learner who can read with understanding, listen carefully, speak clearly and write meaningfully is better equipped to learn across the curriculum.",
  whatLearnersDo:["Listen for meaning and respond appropriately","Build vocabulary and speak clearly in different situations","Read with increasing fluency, comprehension and interpretation","Write for different purposes and audiences","Use stories, poems, discussions and presentations to express ideas","Develop appreciation of language, culture and communication"],
  parentSees:["A child reading and explaining what they have understood","Improved vocabulary and confidence when speaking","Better organisation of written work","Ability to follow written and spoken instructions","Participation in storytelling, poetry, discussions or presentations"],
  homeSupport:["Give your child regular time to read and talk about what they read","Ask them to explain a story or idea in their own words","Encourage complete sentences and respectful conversation","Let children write shopping lists, short messages, stories or reflections","Value both English and Kiswahili as important communication skills"],
  skills:["Communication","Reading comprehension","Writing","Listening","Creativity","Cultural awareness"],
  progression:[
   {stage:"PP1–PP2",title:"Build the language foundation",items:["Listening and speaking through everyday interaction","Vocabulary and oral language","Early reading and writing readiness","Stories, songs, rhymes and expression"]},
   {stage:"Grades 1–3",title:"Become an independent reader and communicator",items:["Reading fluency and comprehension","Sentence construction and vocabulary","Guided writing and oral communication","Responding to stories and information"]},
   {stage:"Grades 4–6",title:"Read, write and communicate with purpose",items:["Comprehension and interpretation","Structured writing for different purposes","Oral presentations and discussion","Language use across learning areas"]},
   {stage:"Grades 7–9",title:"Communicate with depth and independence",items:["Critical reading and interpretation","More developed written communication","Oral presentation, discussion and argument","Using language to analyse, create and communicate ideas"]}
  ]
 },
 "mathematics-financial-literacy":{
  title:"Mathematics & Financial Literacy", shortTitle:"Mathematics", icon:Calculator, levels:"PP1–JSS 3",
  intro:"Mathematics develops number sense, reasoning, measurement, patterns, data and practical problem solving from early foundations to more abstract thinking.",
  parentIntro:"Mathematics is not only about getting an answer. Learners are expected to understand quantities, recognise patterns, explain their thinking, choose methods and apply mathematics to real situations such as time, money, measurement and data.",
  why:"Mathematical reasoning supports everyday decisions and provides a foundation for science, technology, business and many future pathways.",
  whatLearnersDo:["Develop number sense and accurate calculation","Explore measurement, shape, space, patterns and relationships","Read, organise and interpret data","Solve one-step and multi-step problems","Explain methods and check whether answers make sense","Apply money and financial ideas to appropriate real-life situations"],
  parentSees:["A child explaining how an answer was found","More confidence with numbers and measurements","Use of mathematics in shopping, time, distance or household tasks","Improved ability to interpret tables, charts and information"],
  homeSupport:["Ask your child to explain the method, not only give the answer","Use shopping, cooking, time and measurement as safe real-life examples","Encourage estimation before calculation","Let learners read simple tables, prices, schedules or charts","Praise correct reasoning even when a calculation needs correction"],
  skills:["Numeracy","Reasoning","Problem solving","Critical thinking","Accuracy","Communication"],
  progression:[
   {stage:"PP1–PP2",title:"Build number sense",items:["Counting and quantity","Patterns and comparison","Shape, space and measurement experiences","Mathematics through play and everyday routines"]},
   {stage:"Grades 1–3",title:"Build fluency and understanding",items:["Number and operations","Measurement and geometry foundations","Patterns and problem solving","Using mathematics in daily situations"]},
   {stage:"Grades 4–6",title:"Reason and apply",items:["Fractions, decimals and operations","Measurement, geometry and data","Multi-step problem solving","Practical money and financial ideas"]},
   {stage:"Grades 7–9",title:"Think mathematically",items:["Algebraic and numerical reasoning","Geometry, measurement and data","More complex problem solving","Financial and real-world applications"]}
  ]
 },
 "creative-arts-sports":{
  title:"Creative Arts & Sports", shortTitle:"Creative Arts & Sports", icon:Music2, levels:"PP1–JSS 3",
  intro:"Creative Arts and Sports give learners opportunities to create, perform, move, compete, cooperate and develop confidence, discipline and healthy habits.",
  parentIntro:"This area develops more than talent. Through art, music, movement and sport, learners practise expression, teamwork, discipline, persistence, coordination and confidence.",
  why:"Creative and physical activities help learners discover strengths, communicate ideas, build healthy habits and participate positively with others.",
  whatLearnersDo:["Create and respond through visual and performing arts","Explore rhythm, music, movement and performance","Develop physical fitness and movement skills","Practise teamwork, discipline, fair play and persistence"],
  parentSees:["Artwork, performances or creative projects","Improved coordination and participation","Teamwork and respect for rules","Confidence presenting or performing","Greater willingness to practise and improve"],
  homeSupport:["Give children time to draw, sing, make or perform","Encourage safe physical activity and play","Praise practice and persistence rather than only winning","Attend or support school performances and activities when possible"],
  skills:["Creativity","Collaboration","Self-efficacy","Discipline","Coordination","Expression"],
  progression:[
   {stage:"Early Years & Primary",title:"Explore and express",items:["Creative exploration and making","Music, rhythm and movement","Games and physical activity","Teamwork and expression"]},
   {stage:"Junior Secondary",title:"Develop and perform",items:["More intentional artistic expression","Performance and presentation","Physical fitness, games and sport","Discipline, teamwork and personal development"]}
  ]
 } 
};

export default function SubjectDetailPage(){
 const [,go]=useLocation();
 const [,params]=useRoute("/academics/:subjectSlug");
 const s=params?.subjectSlug?DATA[params.subjectSlug]:undefined;
 if(!s)return <PublicLayout><main className="mx-auto max-w-4xl px-5 py-24 text-center"><h1 className="font-serif text-4xl font-semibold text-[#061229]">Learning area not found</h1><button onClick={()=>go("/academics")} className="mt-7 rounded-xl bg-[#D89B28] px-5 py-3 font-bold text-[#061229]">Back to academics</button></main></PublicLayout>;
 const Icon=s.icon;
 return <PublicLayout>
  <section className="relative overflow-hidden bg-[#061229] text-white">
   <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#D89B28]/15 blur-3xl"/>
   <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
    <button onClick={()=>go("/academics")} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold hover:bg-white/10"><ArrowLeft size={15}/> All academic areas</button>
    <div className="mt-9 flex flex-wrap items-center gap-3">
     <span className="inline-flex items-center gap-2 rounded-full bg-[#D89B28]/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#D89B28]"><Icon size={14}/>{s.shortTitle}</span>
     <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60">{s.levels}</span>
    </div>
    <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-tight sm:text-6xl">{s.title}</h1>
    <p className="mt-6 max-w-3xl text-base leading-8 text-white/75 sm:text-lg">{s.intro}</p>
   </div>
  </section>

  <main className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-20">
   <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
     <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D89B28]">For families</p>
     <h2 className="mt-4 max-w-3xl font-serif text-3xl font-semibold leading-tight text-[#061229] sm:text-4xl">What does this learning area actually mean for my child?</h2>
     <p className="mt-5 text-base leading-8 text-slate-600">{s.parentIntro}</p>
    </div>
    <div className="rounded-3xl bg-slate-50 p-7 sm:p-9">
     <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D89B28]">Why it matters</p>
     <p className="mt-4 text-base leading-8 text-slate-600">{s.why}</p>
    </div>
   </section>

   <section className="mt-14">
    <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#D89B28]">The learner experience</p><h2 className="mt-3 font-serif text-3xl font-semibold text-[#061229] sm:text-4xl">What your child learns and does</h2><p className="mt-4 text-base leading-7 text-slate-600">The emphasis changes as learners grow, but the aim is always understanding, application and growing independence.</p></div>
    <div className="mt-7 grid gap-4 md:grid-cols-2">{s.whatLearnersDo.map(x=><div key={x} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#D89B28]/10 text-[#D89B28]"><CheckCircle2 size={17}/></span><p className="text-sm leading-6 text-slate-600">{x}</p></div>)}</div>
   </section>

   <section className="mt-14 grid gap-6 lg:grid-cols-2">
    <div className="rounded-3xl bg-[#061229] p-7 text-white sm:p-9"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#D89B28]">What parents may notice</p><h2 className="mt-3 font-serif text-3xl font-semibold">Evidence of learning beyond a test score.</h2><ul className="mt-6 space-y-4">{s.parentSees.map(x=><li key={x} className="flex gap-3 text-sm leading-6 text-white/70"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#D89B28]"/>{x}</li>)}</ul></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#D89B28]">At home</p><h2 className="mt-3 font-serif text-3xl font-semibold text-[#061229]">Simple ways families can help.</h2><ul className="mt-6 space-y-4">{s.homeSupport.map(x=><li key={x} className="flex gap-3 text-sm leading-6 text-slate-600"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#D89B28]/10 text-xs font-black text-[#D89B28]">✓</span>{x}</li>)}</ul></div>
   </section>

   <section className="mt-14" aria-labelledby="progression-title">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D89B28]">Progression</p>
    <h2 id="progression-title" className="mt-3 font-serif text-3xl font-semibold text-[#061229] sm:text-4xl">How learning develops as your child grows</h2>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">{s.progression.map(p=><article key={p.stage} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[#D89B28]/10 px-3 py-1.5 text-xs font-black text-[#061229]">{p.stage}</span><span className="text-xs font-bold text-slate-400">Learning focus</span></div><h3 className="mt-5 text-xl font-bold text-slate-900">{p.title}</h3><ul className="mt-5 space-y-3">{p.items.map(x=><li key={x} className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#D89B28]"/>{x}</li>)}</ul></article>)}</div>
   </section>

   <section className="mt-14 rounded-3xl border border-slate-200 bg-slate-50 p-7 sm:p-9">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D89B28]">Competencies developed</p>
    <div className="mt-5 flex flex-wrap gap-3">{s.skills.map(x=><span key={x} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm">{x}</span>)}</div>
   </section>

   <section className="mt-14 rounded-[2rem] bg-gradient-to-r from-[#061229] to-[#0b1d3a] p-7 text-white sm:p-10">
    <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
     <div><Sparkles className="text-[#D89B28]" size={24}/><h2 className="mt-4 font-serif text-3xl font-semibold">Want to understand your child's learning better?</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Explore the other learning areas or contact Menwe if you would like help understanding grade placement, learning expectations or the school experience.</p></div>
     <div className="flex flex-col gap-3 sm:flex-row"><button onClick={()=>go("/academics")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold hover:bg-white/10">Explore academics <ArrowRight size={16}/></button><button onClick={()=>go("/contact")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-5 py-3 text-sm font-extrabold text-[#061229]">Contact Menwe <ArrowRight size={16}/></button></div>
    </div>
   </section>
  </main>
 </PublicLayout>;
}