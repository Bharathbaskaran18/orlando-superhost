// Seed all 50 US states and major cities
// Run: node seed_locations.js

require('dotenv').config();
const { Pool } = require('pg');
const db = new Pool({ connectionString: process.env.DATABASE_URL });

const STATES = [
  { name: 'Alabama',        code: 'AL' },
  { name: 'Alaska',         code: 'AK' },
  { name: 'Arizona',        code: 'AZ' },
  { name: 'Arkansas',       code: 'AR' },
  { name: 'California',     code: 'CA' },
  { name: 'Colorado',       code: 'CO' },
  { name: 'Connecticut',    code: 'CT' },
  { name: 'Delaware',       code: 'DE' },
  { name: 'Florida',        code: 'FL' },
  { name: 'Georgia',        code: 'GA' },
  { name: 'Hawaii',         code: 'HI' },
  { name: 'Idaho',          code: 'ID' },
  { name: 'Illinois',       code: 'IL' },
  { name: 'Indiana',        code: 'IN' },
  { name: 'Iowa',           code: 'IA' },
  { name: 'Kansas',         code: 'KS' },
  { name: 'Kentucky',       code: 'KY' },
  { name: 'Louisiana',      code: 'LA' },
  { name: 'Maine',          code: 'ME' },
  { name: 'Maryland',       code: 'MD' },
  { name: 'Massachusetts',  code: 'MA' },
  { name: 'Michigan',       code: 'MI' },
  { name: 'Minnesota',      code: 'MN' },
  { name: 'Mississippi',    code: 'MS' },
  { name: 'Missouri',       code: 'MO' },
  { name: 'Montana',        code: 'MT' },
  { name: 'Nebraska',       code: 'NE' },
  { name: 'Nevada',         code: 'NV' },
  { name: 'New Hampshire',  code: 'NH' },
  { name: 'New Jersey',     code: 'NJ' },
  { name: 'New Mexico',     code: 'NM' },
  { name: 'New York',       code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota',   code: 'ND' },
  { name: 'Ohio',           code: 'OH' },
  { name: 'Oklahoma',       code: 'OK' },
  { name: 'Oregon',         code: 'OR' },
  { name: 'Pennsylvania',   code: 'PA' },
  { name: 'Rhode Island',   code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota',   code: 'SD' },
  { name: 'Tennessee',      code: 'TN' },
  { name: 'Texas',          code: 'TX' },
  { name: 'Utah',           code: 'UT' },
  { name: 'Vermont',        code: 'VT' },
  { name: 'Virginia',       code: 'VA' },
  { name: 'Washington',     code: 'WA' },
  { name: 'West Virginia',  code: 'WV' },
  { name: 'Wisconsin',      code: 'WI' },
  { name: 'Wyoming',        code: 'WY' },
];

// Cities keyed by state code. Florida has all required cities.
const CITIES = {
  AL: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa', 'Auburn', 'Dothan', 'Decatur'],
  AK: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan', 'Wasilla', 'Kenai', 'Kodiak'],
  AZ: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Tempe', 'Peoria', 'Surprise', 'Flagstaff'],
  AR: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro', 'Rogers', 'Conway', 'Bentonville'],
  CA: ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim'],
  CO: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Westminster', 'Boulder', 'Pueblo'],
  CT: ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury', 'Norwalk', 'Danbury', 'New Britain', 'Greenwich'],
  DE: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna', 'Milford', 'Seaford', 'Georgetown'],
  FL: ['Orlando', 'Miami', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'Miami Beach', 'Fort Myers', 'Boca Raton', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Cape Coral', 'Gainesville', 'Kissimmee', 'Daytona Beach', 'Clearwater', 'West Palm Beach', 'Sarasota'],
  GA: ['Atlanta', 'Columbus', 'Augusta', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 'Roswell', 'Albany', 'Warner Robins'],
  HI: ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu', 'Kaneohe', 'Lahaina', 'Kihei', 'Wailuku'],
  ID: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello', 'Caldwell', 'Coeur d\'Alene', 'Twin Falls'],
  IL: ['Chicago', 'Aurora', 'Joliet', 'Naperville', 'Rockford', 'Springfield', 'Elgin', 'Peoria', 'Champaign', 'Waukegan'],
  IN: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington', 'Hammond', 'Gary', 'Muncie'],
  IA: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo', 'Council Bluffs', 'Ames', 'Dubuque'],
  KS: ['Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka', 'Lawrence', 'Shawnee', 'Manhattan', 'Salina'],
  KY: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Richmond', 'Georgetown', 'Florence', 'Elizabethtown'],
  LA: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Metairie', 'Lafayette', 'Lake Charles', 'Kenner', 'Bossier City', 'Monroe'],
  ME: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Biddeford', 'Sanford', 'Augusta', 'Scarborough'],
  MD: ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Hagerstown', 'Annapolis', 'College Park', 'Salisbury'],
  MA: ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton', 'New Bedford', 'Quincy', 'Lynn', 'Fall River'],
  MI: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing', 'Ann Arbor', 'Flint', 'Dearborn', 'Livonia', 'Westland'],
  MN: ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park', 'Plymouth', 'Saint Cloud', 'Woodbury'],
  MS: ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Meridian', 'Tupelo', 'Olive Branch', 'Greenville'],
  MO: ['Kansas City', 'Saint Louis', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit', 'O\'Fallon', 'St. Joseph', 'St. Charles'],
  MT: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Helena', 'Butte', 'Kalispell', 'Havre', 'Anaconda'],
  NE: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont', 'Hastings', 'North Platte', 'Norfolk'],
  NV: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City', 'Fernley', 'Elko', 'Mesquite'],
  NH: ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover', 'Rochester', 'Salem', 'Merrimack', 'Portsmouth'],
  NJ: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Lakewood', 'Edison', 'Woodbridge', 'Toms River', 'Trenton', 'Camden'],
  NM: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington', 'Clovis', 'Hobbs', 'Alamogordo'],
  NY: ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington', 'High Point', 'Concord'],
  ND: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Mandan', 'Dickinson', 'Williston', 'Jamestown'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown', 'Lorain'],
  OK: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton', 'Edmond', 'Moore', 'Midwest City', 'Stillwater'],
  OR: ['Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro', 'Bend', 'Beaverton', 'Medford', 'Springfield', 'Corvallis'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem', 'Lancaster', 'Harrisburg', 'York'],
  RI: ['Providence', 'Cranston', 'Woonsocket', 'Pawtucket', 'East Providence', 'Warwick', 'Coventry', 'Cumberland', 'North Providence'],
  SC: ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville', 'Summerville', 'Goose Creek', 'Hilton Head Island'],
  SD: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell', 'Yankton', 'Pierre', 'Huron'],
  TN: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Jackson', 'Johnson City'],
  TX: ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock'],
  UT: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy', 'Ogden', 'St. George', 'Layton', 'South Jordan'],
  VT: ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier', 'Winooski', 'St. Albans', 'Vergennes', 'Middlebury'],
  VA: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Hampton', 'Roanoke', 'Portsmouth', 'Suffolk'],
  WA: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton', 'Yakima', 'Kirkland'],
  WV: ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', 'Wheeling', 'Weirton', 'Fairmont', 'Martinsburg', 'Clarksburg'],
  WI: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Oshkosh', 'Eau Claire', 'Janesville'],
  WY: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs', 'Sheridan', 'Green River', 'Evanston', 'Riverton'],
};

async function seed() {
  try {
    console.log('Seeding states...');
    for (const s of STATES) {
      await db.query(
        'INSERT INTO states (name, code, enabled) VALUES ($1, $2, false) ON CONFLICT (code) DO NOTHING',
        [s.name, s.code]
      );
    }
    const stateRows = (await db.query('SELECT id, code FROM states ORDER BY name')).rows;
    const stateMap = {};
    for (const r of stateRows) stateMap[r.code] = r.id;
    console.log(`  ${stateRows.length} states ready`);

    console.log('Seeding cities...');
    let cityCount = 0;
    for (const [code, cities] of Object.entries(CITIES)) {
      const stateId = stateMap[code];
      if (!stateId) { console.warn(`  No state found for code ${code}`); continue; }
      for (const city of cities) {
        await db.query(
          'INSERT INTO cities (state_id, name, enabled) VALUES ($1, $2, false) ON CONFLICT DO NOTHING',
          [stateId, city]
        );
        cityCount++;
      }
    }
    console.log(`  ${cityCount} cities seeded`);

    const totals = await db.query('SELECT (SELECT COUNT(*) FROM states) as s, (SELECT COUNT(*) FROM cities) as c');
    console.log(`\nDone. DB now has ${totals.rows[0].s} states and ${totals.rows[0].c} cities.`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

seed();
