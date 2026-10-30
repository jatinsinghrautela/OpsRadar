// Dependency-free visual navigation map for review or manual SVG import into Figma.
const fs=require('fs');const path=require('path');
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const text=(x,y,s,size=16,color='#716780',bold=false)=>`<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${bold?700:400}" fill="${color}">${esc(s)}</text>`;
const lanes=[
 ['Sign in and read',['Sign in','Verify identity','Alert inbox','Alert details'],['Tap Sign in','Tap Verify and continue','Tap alert card']],
 ['Request access',['My access','Find resources','Request access','Request pending'],['Tap Request access','Tap Infrastructure','Tap Send access request']],
 ['Activity and approval',['Alert inbox','Activity','My access','Alert inbox'],['Tap Activity','Tap access-approved update','Tap Alerts in navigation']],
 ['Appearance',['Light settings','Dark settings','System settings','Other-theme preview'],['Tap Dark','Tap System','Tap sun / moon']]
];
let content=`<svg xmlns="http://www.w3.org/2000/svg" width="1740" height="1160" viewBox="0 0 1740 1160"><title>OpsRadar Prism primary navigation map</title><desc>Labeled arrows show which action opens each screen. Native Figma prototype connections implement the main routes.</desc><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M1 1 8 5 1 9" fill="none" stroke="#8A77C6" stroke-width="1.5"/></marker></defs><rect width="1740" height="1160" rx="28" fill="#F4F2FB"/>`;
content+=text(40,55,'OPSRADAR / PRISM',15,'#6250B8',true)+text(40,111,'Every tap has a destination.',38,'#2D2846',true)+text(40,150,'Main prototype routes · Light and Dark screen sets · Sample states only',17);
lanes.forEach(([title,nodes,actions],row)=>{const y=210+row*180;content+=text(40,y,title.toUpperCase(),13,'#6250B8',true);nodes.forEach((name,i)=>{const x=40+i*430;content+=`<rect x="${x}" y="${y+20}" width="280" height="104" rx="20" fill="#FFFFFF" stroke="#DDD6EA"/>`+text(x+20,y+64,name,20,'#2D2846',true)+text(x+20,y+94,'Screen / '+name,13);if(i<3){content+=text(x+294,y+47,actions[i],11,'#6250B8',true)+`<path d="M${x+294} ${y+76}h116" fill="none" stroke="#8A77C6" stroke-width="2" marker-end="url(#arrow)"/>`;}});});
content+=text(40,974,'Other connected branches',15,'#6250B8',true)+text(40,1007,'Temporary password → Change password → Verify identity → Inbox. Reset request → Sign in. Sign out → Sign in.',17,'#2D2846')+text(40,1054,'System follows device appearance in the future app; the prototype shows a selected-state preview.',15)+text(40,1084,'Click through in Figma Present. Inspect native button connections in the Prototype tab.',15)+text(40,1114,'Standalone SVG fallback: the extra Figma flow-map page could not be populated because the free-plan tool limit was reached.',14);
fs.writeFileSync(path.join(__dirname,'prism-flow-map.svg'),content+'</svg>');console.log('Generated prism-flow-map.svg');
