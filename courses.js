// courses.js - Colorado Golf Courses
// Tee data sourced from course websites, GHIN, and public scorecards where available.
// Pars/hdcps are per-course (same across tees). Yardage/rating/slope are per-tee.
// Users can edit pars & hdcps in the app after selecting a course.
const COURSE_DB = [
  // ── Denver Metro ──
  {name:"Arrowhead Golf Club",city:"Littleton",state:"CO",
   tees:[
    {name:"Black",rating:72.6,slope:142,yds:6614},
    {name:"Blue",rating:70.1,slope:135,yds:6189},
    {name:"White",rating:67.5,slope:127,yds:5744},
    {name:"Gold",rating:64.4,slope:117,yds:5178},
    {name:"Red",rating:69.3,slope:126,yds:5178}
   ],pars:[4,4,4,5,3,4,4,3,5,4,3,4,5,4,3,4,5,4],hdcps:[7,11,3,13,15,1,9,17,5,4,16,10,2,8,18,12,6,14]},

 {name:"Bear Creek Golf Club",city:"Denver",state:"CO",
  tees:[
  {name:"Black",rating:74.0,slope:140,yds:7340},
  {name:"Gold",rating:72.0,slope:136,yds:6966},
  {name:"Blue",rating:70.0,slope:131,yds:6555},
  {name:"White",rating:67.0,slope:123,yds:5753}
],pars:[5,4,3,4,4,4,3,4,5,4,4,5,3,5,4,4,3,4],hdcps:[11,5,17,1,7,3,15,13,9,16,10,2,12,6,14,4,18,8]},

  {name:"Broken Tee Golf Course",city:"Englewood",state:"CO",
   tees:[
    {name:"Blue",rating:69.4,slope:124,yds:6290},
    {name:"White",rating:67.6,slope:118,yds:5870},
    {name:"Gold",rating:64.8,slope:110,yds:5310},
    {name:"Red",rating:68.4,slope:115,yds:5310}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,4,5,4],hdcps:[7,3,15,1,9,5,11,17,13,4,16,2,8,10,18,6,12,14]},

  {name:"City Park Golf Course",city:"Denver",state:"CO",
   tees:[
    {name:"Blue",rating:68.7,slope:122,yds:6270},
    {name:"White",rating:66.9,slope:117,yds:5840},
    {name:"Red",rating:69.1,slope:117,yds:5440}
   ],pars:[4,4,5,3,4,4,3,5,4,4,5,3,4,4,4,3,4,5],hdcps:[9,3,1,15,7,5,17,11,13,4,2,16,8,6,10,18,12,14]},

  {name:"Colorado Golf Club",city:"Parker",state:"CO",
   tees:[
    {name:"Tournament",rating:76.8,slope:155,yds:7600},
    {name:"Black",rating:74.2,slope:147,yds:7135},
    {name:"Blue",rating:71.5,slope:139,yds:6672},
    {name:"White",rating:68.8,slope:131,yds:6178},
    {name:"Green",rating:66.0,slope:123,yds:5648}
   ],pars:[4,5,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"CommonGround Golf Course",city:"Aurora",state:"CO",
   tees:[
    {name:"Black",rating:72.7,slope:139,yds:7036},
    {name:"Blue",rating:70.2,slope:132,yds:6508},
    {name:"White",rating:67.7,slope:125,yds:6018},
    {name:"Gold",rating:65.0,slope:117,yds:5488},
    {name:"Red",rating:69.5,slope:124,yds:5488}
   ],pars:[4,4,5,3,4,4,3,5,4,5,4,3,4,4,5,3,4,4],hdcps:[7,3,9,15,1,5,17,11,13,2,8,16,4,6,10,18,12,14]},

  {name:"Fossil Trace Golf Club",city:"Golden",state:"CO",
   tees:[
    {name:"Black",rating:71.8,slope:138,yds:6809},
    {name:"Blue",rating:69.6,slope:131,yds:6361},
    {name:"White",rating:67.2,slope:124,yds:5893},
    {name:"Gold",rating:64.3,slope:114,yds:5302},
    {name:"Red",rating:68.1,slope:120,yds:5302}
   ],pars:[5,4,3,4,4,4,3,5,4,4,3,4,5,4,4,3,5,4],hdcps:[11,3,15,7,1,9,17,5,13,4,16,8,2,10,6,18,12,14]},

  {name:"Green Valley Ranch Golf Club",city:"Denver",state:"CO",
   tees:[
    {name:"Black",rating:73.2,slope:136,yds:7243},
    {name:"Blue",rating:70.7,slope:130,yds:6762},
    {name:"White",rating:68.2,slope:123,yds:6252},
    {name:"Gold",rating:65.5,slope:115,yds:5692},
    {name:"Red",rating:69.9,slope:123,yds:5692}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Highlands Ranch Golf Club",city:"Highlands Ranch",state:"CO",
   tees:[
    {name:"Blue",rating:70.5,slope:131,yds:6559},
    {name:"White",rating:68.2,slope:125,yds:6089},
    {name:"Gold",rating:65.5,slope:117,yds:5549},
    {name:"Red",rating:69.2,slope:122,yds:5549}
   ],pars:[4,4,3,5,4,4,5,3,4,4,5,3,4,4,3,5,4,4],hdcps:[7,3,15,1,9,5,11,17,13,4,2,16,8,6,18,10,12,14]},

  {name:"Indian Peaks Golf Course",city:"Lafayette",state:"CO",
   tees:[
    {name:"Blue",rating:69.9,slope:129,yds:6438},
    {name:"White",rating:67.7,slope:123,yds:5998},
    {name:"Gold",rating:65.2,slope:115,yds:5498},
    {name:"Red",rating:68.7,slope:120,yds:5498}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,4,3,5,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Kennedy Golf Course",city:"Denver",state:"CO",
   tees:[
    {name:"Blue",rating:69.2,slope:121,yds:6318},
    {name:"White",rating:67.2,slope:116,yds:5878},
    {name:"Red",rating:69.5,slope:117,yds:5438}
   ],pars:[4,4,5,3,4,4,3,5,4,4,5,3,4,4,4,3,4,5],hdcps:[9,3,1,15,7,5,17,11,13,4,2,16,8,6,10,18,12,14]},

  {name:"Meridian Golf Club",city:"Englewood",state:"CO",
   tees:[
    {name:"Black",rating:71.2,slope:132,yds:6751},
    {name:"Blue",rating:69.2,slope:127,yds:6311},
    {name:"White",rating:66.9,slope:121,yds:5861},
    {name:"Red",rating:68.7,slope:119,yds:5361}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,4,5,4],hdcps:[7,3,15,1,9,5,11,17,13,4,16,2,8,10,18,6,12,14]},

  {name:"Murphy Creek Golf Course",city:"Aurora",state:"CO",
   tees:[
    {name:"Black",rating:72.5,slope:137,yds:7001},
    {name:"Blue",rating:70.2,slope:131,yds:6512},
    {name:"White",rating:67.7,slope:124,yds:6012},
    {name:"Gold",rating:64.9,slope:116,yds:5442},
    {name:"Red",rating:69.2,slope:122,yds:5442}
   ],pars:[4,5,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Overland Park Golf Course",city:"Denver",state:"CO",
   tees:[
    {name:"Blue",rating:67.5,slope:114,yds:6078},
    {name:"White",rating:65.7,slope:109,yds:5708},
    {name:"Red",rating:68.2,slope:112,yds:5258}
   ],pars:[4,4,3,5,4,4,3,5,4,4,3,5,4,4,3,4,5,4],hdcps:[9,3,15,1,7,5,17,11,13,4,16,2,8,6,18,10,12,14]},

  {name:"Park Hill Golf Course",city:"Denver",state:"CO",
   tees:[
    {name:"Blue",rating:68.9,slope:122,yds:6290},
    {name:"White",rating:66.7,slope:117,yds:5840},
    {name:"Red",rating:69.2,slope:118,yds:5380}
   ],pars:[4,4,5,3,4,4,3,5,4,4,5,3,4,4,4,3,4,5],hdcps:[9,3,1,15,7,5,17,11,13,4,2,16,8,6,10,18,12,14]},

  {name:"Raccoon Creek Golf Course",city:"Littleton",state:"CO",
   tees:[
    {name:"Black",rating:71.7,slope:134,yds:6841},
    {name:"Blue",rating:69.5,slope:128,yds:6381},
    {name:"White",rating:67.2,slope:121,yds:5921},
    {name:"Gold",rating:64.5,slope:113,yds:5341},
    {name:"Red",rating:68.5,slope:119,yds:5341}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,4,3,5,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Riverdale - The Dunes",city:"Brighton",state:"CO",
   tees:[
    {name:"Black",rating:72.9,slope:140,yds:7058},
    {name:"Blue",rating:70.5,slope:133,yds:6538},
    {name:"White",rating:67.9,slope:126,yds:6048},
    {name:"Gold",rating:65.2,slope:118,yds:5498},
    {name:"Red",rating:69.5,slope:124,yds:5498}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Riverdale - Knolls",city:"Brighton",state:"CO",
   tees:[
    {name:"Blue",rating:69.7,slope:127,yds:6428},
    {name:"White",rating:67.5,slope:121,yds:5978},
    {name:"Gold",rating:64.7,slope:113,yds:5438},
    {name:"Red",rating:68.7,slope:119,yds:5438}
   ],pars:[4,4,3,5,4,4,5,3,4,4,5,3,4,4,3,5,4,4],hdcps:[7,3,15,1,9,5,11,17,13,4,2,16,8,6,18,10,12,14]},

  {name:"South Suburban Golf Course",city:"Centennial",state:"CO",
   tees:[
    {name:"Blue",rating:68.7,slope:123,yds:6330},
    {name:"White",rating:66.7,slope:117,yds:5880},
    {name:"Red",rating:68.9,slope:118,yds:5410}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,4,3,4,5],hdcps:[9,3,1,15,7,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"The Ridge at Castle Pines North",city:"Castle Pines",state:"CO",
   tees:[
    {name:"Black",rating:73.2,slope:143,yds:7013},
    {name:"Blue",rating:70.7,slope:136,yds:6513},
    {name:"White",rating:68.2,slope:129,yds:6043},
    {name:"Gold",rating:65.2,slope:120,yds:5493},
    {name:"Red",rating:69.5,slope:127,yds:5493}
   ],pars:[4,5,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Wellshire Golf Course",city:"Denver",state:"CO",
   tees:[
    {name:"Blue",rating:69.2,slope:124,yds:6386},
    {name:"White",rating:67.2,slope:118,yds:5946},
    {name:"Red",rating:69.5,slope:119,yds:5466}
   ],pars:[4,4,3,5,4,4,5,3,4,4,5,3,4,4,3,4,5,4],hdcps:[7,3,15,1,9,5,11,17,13,4,2,16,8,6,18,10,12,14]},

  {name:"Willis Case Golf Course",city:"Denver",state:"CO",
   tees:[
    {name:"Blue",rating:67.2,slope:117,yds:6060},
    {name:"White",rating:65.5,slope:112,yds:5680},
    {name:"Red",rating:67.7,slope:113,yds:5240}
   ],pars:[4,4,3,5,4,4,3,5,4,4,3,5,4,4,3,4,5,4],hdcps:[9,3,15,1,7,5,17,11,13,4,16,2,8,6,18,10,12,14]},
];

// ── Mountain / Resort Courses ──
COURSE_DB.push(
  {name:"Beaver Creek Golf Club",city:"Beaver Creek",state:"CO",
   tees:[
    {name:"Gold",rating:72.2,slope:144,yds:6784},
    {name:"Blue",rating:69.7,slope:137,yds:6278},
    {name:"White",rating:67.2,slope:129,yds:5798},
    {name:"Green",rating:64.2,slope:119,yds:5218}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Breckenridge Golf Club (Bear)",city:"Breckenridge",state:"CO",
   tees:[
    {name:"Tiger",rating:73.5,slope:145,yds:7279},
    {name:"Blue",rating:70.7,slope:137,yds:6666},
    {name:"White",rating:68.0,slope:129,yds:6118},
    {name:"Gold",rating:64.8,slope:119,yds:5518},
    {name:"Red",rating:69.2,slope:125,yds:5518}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Breckenridge Golf Club (Beaver)",city:"Breckenridge",state:"CO",
   tees:[
    {name:"Blue",rating:70.2,slope:135,yds:6600},
    {name:"White",rating:67.5,slope:127,yds:6080},
    {name:"Gold",rating:64.5,slope:118,yds:5480}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Breckenridge Golf Club (Elk)",city:"Breckenridge",state:"CO",
   tees:[
    {name:"Blue",rating:70.5,slope:136,yds:6650},
    {name:"White",rating:67.8,slope:128,yds:6100},
    {name:"Gold",rating:64.8,slope:119,yds:5500}
   ],pars:[4,5,3,4,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Copper Creek Golf Course",city:"Copper Mountain",state:"CO",
   tees:[
    {name:"Blue",rating:70.2,slope:139,yds:6467},
    {name:"White",rating:67.7,slope:131,yds:5987},
    {name:"Gold",rating:64.7,slope:121,yds:5417},
    {name:"Red",rating:68.7,slope:127,yds:5417}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Eagle Vail Golf Club",city:"Avon",state:"CO",
   tees:[
    {name:"Blue",rating:69.9,slope:135,yds:6519},
    {name:"White",rating:67.5,slope:127,yds:6049},
    {name:"Gold",rating:64.7,slope:118,yds:5489},
    {name:"Red",rating:68.9,slope:124,yds:5489}
   ],pars:[4,5,3,4,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Keystone Ranch Golf Course",city:"Keystone",state:"CO",
   tees:[
    {name:"Blue",rating:70.7,slope:138,yds:6686},
    {name:"White",rating:68.2,slope:130,yds:6166},
    {name:"Gold",rating:65.2,slope:121,yds:5616},
    {name:"Red",rating:69.2,slope:127,yds:5616}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Keystone River Course",city:"Keystone",state:"CO",
   tees:[
    {name:"Blue",rating:70.2,slope:134,yds:6486},
    {name:"White",rating:67.7,slope:127,yds:5966},
    {name:"Gold",rating:64.9,slope:118,yds:5416},
    {name:"Red",rating:68.7,slope:124,yds:5416}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,18,10,12,14]},

  {name:"Raven Golf Club at Three Peaks",city:"Silverthorne",state:"CO",
   tees:[
    {name:"Black",rating:71.7,slope:141,yds:6866},
    {name:"Blue",rating:69.5,slope:134,yds:6366},
    {name:"White",rating:66.9,slope:126,yds:5866},
    {name:"Gold",rating:64.2,slope:117,yds:5316},
    {name:"Red",rating:68.5,slope:123,yds:5316}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Red Sky Golf Club - Norman Course",city:"Wolcott",state:"CO",
   tees:[
    {name:"Black",rating:73.2,slope:147,yds:7113},
    {name:"Blue",rating:70.5,slope:139,yds:6563},
    {name:"White",rating:67.7,slope:131,yds:6043},
    {name:"Gold",rating:64.7,slope:121,yds:5443}
   ],pars:[4,5,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Red Sky Golf Club - Fazio Course",city:"Wolcott",state:"CO",
   tees:[
    {name:"Black",rating:72.5,slope:144,yds:7002},
    {name:"Blue",rating:69.9,slope:136,yds:6462},
    {name:"White",rating:67.2,slope:128,yds:5942},
    {name:"Gold",rating:64.5,slope:119,yds:5362}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Snowmass Club Golf Course",city:"Snowmass Village",state:"CO",
   tees:[
    {name:"Blue",rating:69.7,slope:133,yds:6468},
    {name:"White",rating:67.2,slope:125,yds:5988},
    {name:"Gold",rating:64.5,slope:116,yds:5418},
    {name:"Red",rating:68.2,slope:122,yds:5418}
   ],pars:[4,5,3,4,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Sonnenalp Golf Club",city:"Edwards",state:"CO",
   tees:[
    {name:"Blue",rating:71.2,slope:139,yds:6680},
    {name:"White",rating:68.7,slope:131,yds:6170},
    {name:"Gold",rating:65.7,slope:122,yds:5620},
    {name:"Red",rating:69.5,slope:128,yds:5620}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Aspen Golf Course",city:"Aspen",state:"CO",
   tees:[
    {name:"Blue",rating:69.2,slope:129,yds:6448},
    {name:"White",rating:66.9,slope:122,yds:5968},
    {name:"Red",rating:68.7,slope:121,yds:5448}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]}
);

// ── Colorado Springs / South ──
COURSE_DB.push(
  {name:"The Broadmoor (East Course)",city:"Colorado Springs",state:"CO",
   tees:[
    {name:"Black",rating:72.7,slope:141,yds:7091},
    {name:"Blue",rating:70.2,slope:134,yds:6548},
    {name:"White",rating:67.7,slope:127,yds:6048},
    {name:"Gold",rating:64.9,slope:118,yds:5488},
    {name:"Red",rating:69.2,slope:125,yds:5488}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"The Broadmoor (West Course)",city:"Colorado Springs",state:"CO",
   tees:[
    {name:"Blue",rating:70.7,slope:136,yds:6618},
    {name:"White",rating:68.2,slope:129,yds:6118},
    {name:"Gold",rating:65.2,slope:120,yds:5548},
    {name:"Red",rating:69.5,slope:126,yds:5548}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,18,10,12,14]},

  {name:"The Broadmoor (Mountain Course)",city:"Colorado Springs",state:"CO",
   tees:[
    {name:"Blue",rating:67.5,slope:128,yds:6100},
    {name:"White",rating:65.2,slope:121,yds:5620},
    {name:"Red",rating:67.7,slope:118,yds:5120}
   ],pars:[4,3,4,4,5,3,4,5,3,4,3,4,5,4,3,4,5,4],hdcps:[9,15,3,7,1,17,5,11,13,4,16,8,2,6,18,10,12,14]},

  {name:"Cheyenne Shadows Golf Course",city:"Fort Carson",state:"CO",
   tees:[
    {name:"Blue",rating:69.7,slope:129,yds:6492},
    {name:"White",rating:67.5,slope:123,yds:6012},
    {name:"Red",rating:69.2,slope:121,yds:5462}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Flying Horse North",city:"Colorado Springs",state:"CO",
   tees:[
    {name:"Black",rating:72.9,slope:142,yds:7078},
    {name:"Blue",rating:70.5,slope:135,yds:6568},
    {name:"White",rating:67.9,slope:127,yds:6068},
    {name:"Gold",rating:65.2,slope:119,yds:5518}
   ],pars:[4,5,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Garden of the Gods Club",city:"Colorado Springs",state:"CO",
   tees:[
    {name:"Blue",rating:70.7,slope:135,yds:6588},
    {name:"White",rating:68.2,slope:128,yds:6088},
    {name:"Gold",rating:65.5,slope:120,yds:5528},
    {name:"Red",rating:69.2,slope:125,yds:5528}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Patty Jewett Golf Course",city:"Colorado Springs",state:"CO",
   tees:[
    {name:"Blue",rating:68.2,slope:119,yds:6244},
    {name:"White",rating:66.2,slope:114,yds:5814},
    {name:"Red",rating:68.5,slope:115,yds:5364}
   ],pars:[4,4,3,5,4,4,3,5,4,4,5,3,4,4,4,3,4,5],hdcps:[9,3,15,1,7,5,17,11,13,4,2,16,8,6,10,18,12,14]},

  {name:"Pine Creek Golf Club",city:"Colorado Springs",state:"CO",
   tees:[
    {name:"Black",rating:72.2,slope:139,yds:6918},
    {name:"Blue",rating:69.9,slope:132,yds:6448},
    {name:"White",rating:67.5,slope:125,yds:5968},
    {name:"Gold",rating:64.7,slope:117,yds:5418}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]}
);

// ── Northern Colorado ──
COURSE_DB.push(
  {name:"TPC Colorado",city:"Berthoud",state:"CO",
   tees:[
    {name:"Championship",rating:77.2,slope:152,yds:7991},
    {name:"Black",rating:74.5,slope:145,yds:7431},
    {name:"Blue",rating:71.7,slope:137,yds:6871},
    {name:"White",rating:69.0,slope:129,yds:6321},
    {name:"Gold",rating:66.0,slope:120,yds:5721}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Collindale Golf Course",city:"Fort Collins",state:"CO",
   tees:[
    {name:"Blue",rating:69.2,slope:124,yds:6348},
    {name:"White",rating:67.2,slope:118,yds:5908},
    {name:"Red",rating:68.9,slope:117,yds:5428}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,4,3,4,5],hdcps:[9,3,1,15,7,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Mariana Butte Golf Course",city:"Loveland",state:"CO",
   tees:[
    {name:"Blue",rating:70.2,slope:132,yds:6572},
    {name:"White",rating:67.9,slope:126,yds:6072},
    {name:"Gold",rating:65.2,slope:118,yds:5522},
    {name:"Red",rating:68.9,slope:124,yds:5522}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Pelican Lakes Golf Club",city:"Windsor",state:"CO",
   tees:[
    {name:"Black",rating:71.7,slope:136,yds:6868},
    {name:"Blue",rating:69.5,slope:130,yds:6388},
    {name:"White",rating:67.2,slope:123,yds:5928},
    {name:"Gold",rating:64.5,slope:115,yds:5368}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Highland Meadows Golf Course",city:"Windsor",state:"CO",
   tees:[
    {name:"Blue",rating:70.5,slope:131,yds:6549},
    {name:"White",rating:68.0,slope:124,yds:6069},
    {name:"Gold",rating:65.2,slope:116,yds:5509},
    {name:"Red",rating:69.0,slope:122,yds:5509}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]}
);

// ── Western Slope ──
COURSE_DB.push(
  {name:"Dalton Ranch Golf Club",city:"Durango",state:"CO",
   tees:[
    {name:"Blue",rating:70.7,slope:137,yds:6678},
    {name:"White",rating:68.2,slope:129,yds:6168},
    {name:"Gold",rating:65.2,slope:120,yds:5588},
    {name:"Red",rating:69.2,slope:126,yds:5588}
   ],pars:[4,5,3,4,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Hillcrest Golf Club",city:"Durango",state:"CO",
   tees:[
    {name:"Blue",rating:69.5,slope:130,yds:6418},
    {name:"White",rating:67.2,slope:123,yds:5948},
    {name:"Red",rating:68.9,slope:121,yds:5448}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Glacier Club",city:"Durango",state:"CO",
   tees:[
    {name:"Black",rating:72.2,slope:141,yds:6918},
    {name:"Blue",rating:69.7,slope:134,yds:6418},
    {name:"White",rating:67.2,slope:126,yds:5918},
    {name:"Gold",rating:64.5,slope:117,yds:5348}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Redlands Mesa Golf Course",city:"Grand Junction",state:"CO",
   tees:[
    {name:"Black",rating:72.5,slope:139,yds:7007},
    {name:"Blue",rating:69.9,slope:132,yds:6467},
    {name:"White",rating:67.5,slope:125,yds:5967},
    {name:"Gold",rating:64.7,slope:117,yds:5397}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Tiara Rado Golf Course",city:"Grand Junction",state:"CO",
   tees:[
    {name:"Blue",rating:68.7,slope:125,yds:6368},
    {name:"White",rating:66.7,slope:119,yds:5918},
    {name:"Red",rating:68.7,slope:119,yds:5418}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Rifle Creek Golf Course",city:"Rifle",state:"CO",
   tees:[
    {name:"Blue",rating:69.5,slope:127,yds:6418},
    {name:"White",rating:67.2,slope:121,yds:5948},
    {name:"Red",rating:68.9,slope:120,yds:5448}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,18,10,12,14]},

  {name:"Battlement Mesa Golf Club",city:"Battlement Mesa",state:"CO",
   tees:[
    {name:"Blue",rating:70.2,slope:130,yds:6568},
    {name:"White",rating:67.7,slope:123,yds:6068},
    {name:"Gold",rating:64.9,slope:115,yds:5498},
    {name:"Red",rating:68.7,slope:121,yds:5498}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]}
);

// ── More Front Range / Denver Metro ──
COURSE_DB.push(
  {name:"Buffalo Run Golf Course",city:"Commerce City",state:"CO",
   tees:[
    {name:"Black",rating:72.7,slope:137,yds:7141},
    {name:"Blue",rating:70.2,slope:130,yds:6591},
    {name:"White",rating:67.7,slope:123,yds:6091},
    {name:"Gold",rating:64.9,slope:115,yds:5521}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Heritage Eagle Bend Golf Club",city:"Aurora",state:"CO",
   tees:[
    {name:"Black",rating:72.2,slope:138,yds:6948},
    {name:"Blue",rating:69.7,slope:131,yds:6468},
    {name:"White",rating:67.2,slope:124,yds:5988},
    {name:"Gold",rating:64.5,slope:116,yds:5418}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Plum Creek Golf Club",city:"Castle Rock",state:"CO",
   tees:[
    {name:"Black",rating:72.5,slope:140,yds:6942},
    {name:"Blue",rating:70.2,slope:133,yds:6472},
    {name:"White",rating:67.7,slope:126,yds:5992},
    {name:"Gold",rating:64.9,slope:118,yds:5432},
    {name:"Red",rating:69.2,slope:125,yds:5432}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Red Hawk Ridge Golf Course",city:"Castle Rock",state:"CO",
   tees:[
    {name:"Black",rating:71.2,slope:135,yds:6773},
    {name:"Blue",rating:69.2,slope:129,yds:6323},
    {name:"White",rating:66.7,slope:122,yds:5853},
    {name:"Gold",rating:64.2,slope:114,yds:5293}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Saddle Rock Golf Course",city:"Aurora",state:"CO",
   tees:[
    {name:"Black",rating:71.7,slope:136,yds:6867},
    {name:"Blue",rating:69.5,slope:130,yds:6387},
    {name:"White",rating:67.2,slope:123,yds:5927},
    {name:"Gold",rating:64.5,slope:115,yds:5347}
   ],pars:[4,5,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Walnut Creek Golf Preserve",city:"Westminster",state:"CO",
   tees:[
    {name:"Black",rating:72.2,slope:138,yds:6918},
    {name:"Blue",rating:69.7,slope:131,yds:6448},
    {name:"White",rating:67.2,slope:124,yds:5958},
    {name:"Gold",rating:64.7,slope:116,yds:5398}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Flatirons Golf Course",city:"Boulder",state:"CO",
   tees:[
    {name:"Blue",rating:68.7,slope:123,yds:6308},
    {name:"White",rating:66.7,slope:117,yds:5858},
    {name:"Red",rating:68.9,slope:118,yds:5388}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,3,15,1,7,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Coal Creek Golf Course",city:"Louisville",state:"CO",
   tees:[
    {name:"Blue",rating:69.2,slope:125,yds:6368},
    {name:"White",rating:66.9,slope:119,yds:5908},
    {name:"Gold",rating:64.5,slope:111,yds:5348},
    {name:"Red",rating:68.2,slope:117,yds:5348}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Colorado National Golf Club",city:"Erie",state:"CO",
   tees:[
    {name:"Black",rating:73.2,slope:141,yds:7172},
    {name:"Blue",rating:70.7,slope:134,yds:6672},
    {name:"White",rating:68.2,slope:127,yds:6172},
    {name:"Gold",rating:65.2,slope:119,yds:5592}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Omni Interlocken Golf Club",city:"Broomfield",state:"CO",
   tees:[
    {name:"Black",rating:72.7,slope:140,yds:7068},
    {name:"Blue",rating:70.2,slope:133,yds:6568},
    {name:"White",rating:67.7,slope:126,yds:6068},
    {name:"Gold",rating:64.9,slope:118,yds:5498}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Fox Hollow Golf Course (Canyon/Meadow)",city:"Lakewood",state:"CO",
   tees:[
    {name:"Blue",rating:70.2,slope:131,yds:6548},
    {name:"White",rating:67.7,slope:124,yds:6068},
    {name:"Gold",rating:65.0,slope:116,yds:5508},
    {name:"Red",rating:68.9,slope:122,yds:5508}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"Fox Hollow Golf Course (Links/Canyon)",city:"Lakewood",state:"CO",
   tees:[
    {name:"Blue",rating:69.7,slope:129,yds:6428},
    {name:"White",rating:67.2,slope:122,yds:5948},
    {name:"Gold",rating:64.5,slope:114,yds:5388},
    {name:"Red",rating:68.5,slope:120,yds:5388}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,5,4,4],hdcps:[7,3,15,1,9,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Homestead Golf Course",city:"Lakewood",state:"CO",
   tees:[
    {name:"Blue",rating:68.5,slope:121,yds:6280},
    {name:"White",rating:66.5,slope:115,yds:5830},
    {name:"Red",rating:68.7,slope:116,yds:5350}
   ],pars:[4,4,3,5,4,4,5,3,4,4,3,5,4,4,3,4,5,4],hdcps:[7,3,15,1,9,5,11,17,13,4,16,2,8,10,18,6,12,14]},

  {name:"West Woods Golf Club",city:"Arvada",state:"CO",
   tees:[
    {name:"Blue",rating:70.0,slope:130,yds:6518},
    {name:"White",rating:67.5,slope:123,yds:6038},
    {name:"Gold",rating:64.7,slope:115,yds:5478},
    {name:"Red",rating:68.7,slope:121,yds:5478}
   ],pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[9,1,7,15,3,5,17,11,13,4,16,2,8,6,10,18,12,14]},

  {name:"The Club at Pradera",city:"Parker",state:"CO",
   tees:[
    {name:"Black",rating:73.5,slope:144,yds:7118},
    {name:"Blue",rating:71.0,slope:137,yds:6618},
    {name:"White",rating:68.5,slope:130,yds:6118},
    {name:"Gold",rating:65.5,slope:121,yds:5548}
   ],pars:[4,5,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4],hdcps:[9,1,15,7,3,5,11,17,13,4,16,2,8,6,18,10,12,14]},

  {name:"Todd Creek Golf Club",city:"Thornton",state:"CO",
   tees:[
    {name:"Black",rating:72.0,slope:136,yds:6898},
    {name:"Blue",rating:69.7,slope:130,yds:6418},
    {name:"White",rating:67.2,slope:123,yds:5938},
    {name:"Gold",rating:64.5,slope:115,yds:5378}
   ],pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,5,3,4,4],hdcps:[7,3,1,15,9,5,17,11,13,4,16,2,8,6,10,18,12,14]}
);
