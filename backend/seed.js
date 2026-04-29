const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const statesData = [
  { name: 'Alabama', code: 'AL', cities: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa'] },
  { name: 'Alaska', code: 'AK', cities: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan'] },
  { name: 'Arizona', code: 'AZ', cities: ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale', 'Sedona', 'Flagstaff', 'Tempe', 'Chandler'] },
  { name: 'Arkansas', code: 'AR', cities: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'] },
  { name: 'California', code: 'CA', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose', 'Oakland', 'Santa Barbara', 'Napa', 'Palm Springs', 'Santa Monica', 'Monterey', 'Santa Cruz', 'Fresno', 'Long Beach'] },
  { name: 'Colorado', code: 'CO', cities: ['Denver', 'Colorado Springs', 'Boulder', 'Fort Collins', 'Aspen', 'Vail', 'Telluride', 'Breckenridge', 'Steamboat Springs', 'Durango'] },
  { name: 'Connecticut', code: 'CT', cities: ['Hartford', 'New Haven', 'Stamford', 'Bridgeport', 'Waterbury', 'Greenwich', 'Mystic'] },
  { name: 'Delaware', code: 'DE', cities: ['Wilmington', 'Dover', 'Newark', 'Rehoboth Beach', 'Lewes'] },
  { name: 'Florida', code: 'FL', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Miami Beach', 'Key West', 'Naples', 'Sarasota', 'Fort Lauderdale', 'St. Augustine', 'Clearwater', 'Fort Myers', 'Destin', 'Pensacola', 'Boca Raton'] },
  { name: 'Georgia', code: 'GA', cities: ['Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Macon', 'Athens', 'Valdosta'] },
  { name: 'Hawaii', code: 'HI', cities: ['Honolulu', 'Maui', 'Kauai', 'Hilo', 'Kailua-Kona', 'Lahaina', 'Lihue'] },
  { name: 'Idaho', code: 'ID', cities: ['Boise', 'Nampa', 'Meridian', 'Idaho Falls', "Coeur d'Alene", 'Sun Valley', 'Twin Falls'] },
  { name: 'Illinois', code: 'IL', cities: ['Chicago', 'Springfield', 'Rockford', 'Peoria', 'Champaign', 'Aurora', 'Naperville', 'Galena'] },
  { name: 'Indiana', code: 'IN', cities: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Bloomington', 'Carmel'] },
  { name: 'Iowa', code: 'IA', cities: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Dubuque'] },
  { name: 'Kansas', code: 'KS', cities: ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Lawrence', 'Olathe'] },
  { name: 'Kentucky', code: 'KY', cities: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Frankfort', 'Covington'] },
  { name: 'Louisiana', code: 'LA', cities: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Monroe'] },
  { name: 'Maine', code: 'ME', cities: ['Portland', 'Augusta', 'Bangor', 'Bar Harbor', 'Kennebunkport', 'Ogunquit', 'Camden'] },
  { name: 'Maryland', code: 'MD', cities: ['Baltimore', 'Annapolis', 'Rockville', 'Frederick', 'Ocean City', 'Bethesda'] },
  { name: 'Massachusetts', code: 'MA', cities: ['Boston', 'Cambridge', 'Worcester', 'Springfield', 'Plymouth', 'Cape Cod', 'Salem', 'Provincetown', 'Nantucket'] },
  { name: 'Michigan', code: 'MI', cities: ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Lansing', 'Traverse City', 'Mackinac Island', 'Kalamazoo', 'Marquette'] },
  { name: 'Minnesota', code: 'MN', cities: ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington', 'Plymouth', 'Brainerd'] },
  { name: 'Mississippi', code: 'MS', cities: ['Jackson', 'Gulfport', 'Biloxi', 'Hattiesburg', 'Oxford', 'Natchez'] },
  { name: 'Missouri', code: 'MO', cities: ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Branson', 'Jefferson City'] },
  { name: 'Montana', code: 'MT', cities: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Helena', 'Whitefish'] },
  { name: 'Nebraska', code: 'NE', cities: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'] },
  { name: 'Nevada', code: 'NV', cities: ['Las Vegas', 'Reno', 'Henderson', 'Carson City', 'Sparks', 'North Las Vegas'] },
  { name: 'New Hampshire', code: 'NH', cities: ['Manchester', 'Nashua', 'Concord', 'Portsmouth', 'Conway', 'North Conway', 'Hampton Beach'] },
  { name: 'New Jersey', code: 'NJ', cities: ['Newark', 'Jersey City', 'Atlantic City', 'Trenton', 'Princeton', 'Cape May', 'Hoboken'] },
  { name: 'New Mexico', code: 'NM', cities: ['Albuquerque', 'Santa Fe', 'Las Cruces', 'Rio Rancho', 'Taos', 'Roswell'] },
  { name: 'New York', code: 'NY', cities: ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse', 'Niagara Falls', 'Saratoga Springs', 'Lake Placid', 'Ithaca', 'The Hamptons'] },
  { name: 'North Carolina', code: 'NC', cities: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Asheville', 'Wilmington', 'Chapel Hill', 'Winston-Salem', 'Outer Banks'] },
  { name: 'North Dakota', code: 'ND', cities: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'Dickinson'] },
  { name: 'Ohio', code: 'OH', cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Canton'] },
  { name: 'Oklahoma', code: 'OK', cities: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton', 'Edmond'] },
  { name: 'Oregon', code: 'OR', cities: ['Portland', 'Eugene', 'Salem', 'Bend', 'Ashland', 'Cannon Beach', 'Astoria', 'Medford'] },
  { name: 'Pennsylvania', code: 'PA', cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Gettysburg', 'Lancaster', 'Hershey', 'Bethlehem', 'Scranton'] },
  { name: 'Rhode Island', code: 'RI', cities: ['Providence', 'Newport', 'Cranston', 'Warwick', 'Pawtucket', 'Block Island'] },
  { name: 'South Carolina', code: 'SC', cities: ['Charleston', 'Columbia', 'Greenville', 'Myrtle Beach', 'Hilton Head', 'Beaufort', 'Spartanburg'] },
  { name: 'South Dakota', code: 'SD', cities: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Pierre', 'Deadwood', 'Keystone', 'Custer'] },
  { name: 'Tennessee', code: 'TN', cities: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Franklin', 'Gatlinburg', 'Pigeon Forge', 'Murfreesboro'] },
  { name: 'Texas', code: 'TX', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Galveston', 'San Marcos', 'Corpus Christi', 'Lubbock', 'Amarillo', 'Arlington'] },
  { name: 'Utah', code: 'UT', cities: ['Salt Lake City', 'Provo', 'St. George', 'Ogden', 'Park City', 'Moab', 'Springdale'] },
  { name: 'Vermont', code: 'VT', cities: ['Burlington', 'Montpelier', 'Stowe', 'Brattleboro', 'Woodstock', 'Manchester', 'Killington'] },
  { name: 'Virginia', code: 'VA', cities: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Charlottesville', 'Alexandria', 'Arlington', 'Williamsburg', 'Roanoke'] },
  { name: 'Washington', code: 'WA', cities: ['Seattle', 'Spokane', 'Tacoma', 'Bellevue', 'Olympia', 'Port Angeles', 'Leavenworth', 'Bellingham'] },
  { name: 'West Virginia', code: 'WV', cities: ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', "Harper's Ferry"] },
  { name: 'Wisconsin', code: 'WI', cities: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Door County', 'Wisconsin Dells'] },
  { name: 'Wyoming', code: 'WY', cities: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Jackson Hole', 'Cody'] },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding admin user...');
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      ['Admin', 'admin@planwithus.com', hash, 'admin']
    );

    console.log('Seeding states and cities...');
    for (const state of statesData) {
      const stateResult = await client.query(
        `INSERT INTO states (name, code) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = $1
         RETURNING id`,
        [state.name, state.code]
      );
      const stateId = stateResult.rows[0].id;

      for (const cityName of state.cities) {
        await client.query(
          `INSERT INTO cities (state_id, name) VALUES ($1, $2)
           ON CONFLICT (state_id, name) DO NOTHING`,
          [stateId, cityName]
        );
      }
    }

    console.log('✅ Seed complete!');
    console.log('Admin login: admin@planwithus.com / admin123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
