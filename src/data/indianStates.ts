// Bundled Indian states/UTs + districts (offline-first, no external request).
// Source: 2024 administrative lists (Govt. of India; district names follow
// Census/state portal spellings). Data only — no dependency, no licence issue.
export interface IndianStateEntry { name: string; districts: string[]; }
export const INDIAN_STATES: IndianStateEntry[] = [
{ name: 'Andaman and Nicobar Islands', districts: ['Nicobar','North and Middle Andaman','South Andaman'] },
{ name: 'Andhra Pradesh', districts: ['Alluri Sitharama Raju','Anakapalli','Ananthapuramu','Annamayya','Bapatla','Chittoor','East Godavari','Eluru','Guntur','Kakinada','Krishna','Kurnool','Nandyal','Nellore','NTR','Palnadu','Prakasam','Srikakulam','Tirupati','Visakhapatnam','Vizianagaram','West Godavari','YSR Kadapa'] },
{ name: 'Arunachal Pradesh', districts: ['Anjaw','Changlang','East Kameng','East Siang','Lohit','Namsai','Papum Pare','Tawang','Tirap','West Kameng','West Siang'] },
{ name: 'Assam', districts: ['Baksa','Barpeta','Bongaigaon','Cachar','Darrang','Dhemaji','Dhubri','Dibrugarh','Goalpara','Golaghat','Jorhat','Kamrup','Kamrup Metropolitan','Karbi Anglong','Kokrajhar','Lakhimpur','Nagaon','Nalbari','Sivasagar','Sonitpur','Tinsukia'] },
{ name: 'Bihar', districts: ['Araria','Aurangabad','Banka','Begusarai','Bhagalpur','Bhojpur','Darbhanga','East Champaran','Gaya','Muzaffarpur','Nalanda','Patna','Purnia','Rohtas','Samastipur','Saran','Sitamarhi','Vaishali','West Champaran'] },
{ name: 'Chandigarh', districts: ['Chandigarh'] },
{ name: 'Chhattisgarh', districts: ['Balod','Bastar','Bilaspur','Dhamtari','Durg','Janjgir-Champa','Korba','Raigarh','Raipur','Rajnandgaon','Surguja'] },
{ name: 'Dadra and Nagar Haveli and Daman and Diu', districts: ['Dadra and Nagar Haveli','Daman','Diu'] },
{ name: 'Delhi', districts: ['Central Delhi','East Delhi','New Delhi','North Delhi','North East Delhi','North West Delhi','South Delhi','South West Delhi','West Delhi'] },
{ name: 'Goa', districts: ['North Goa','South Goa'] },
{ name: 'Gujarat', districts: ['Ahmedabad','Amreli','Anand','Banaskantha','Bharuch','Bhavnagar','Dahod','Gandhinagar','Jamnagar','Junagadh','Kheda','Kutch','Mehsana','Narmada','Navsari','Panchmahal','Patan','Rajkot','Surat','Surendranagar','Vadodara','Valsad'] },
{ name: 'Haryana', districts: ['Ambala','Bhiwani','Faridabad','Fatehabad','Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal','Kurukshetra','Panipat','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'] },
{ name: 'Himachal Pradesh', districts: ['Bilaspur','Chamba','Hamirpur','Kangra','Kullu','Mandi','Shimla','Sirmaur','Solan','Una'] },
{ name: 'Jammu and Kashmir', districts: ['Anantnag','Baramulla','Budgam','Doda','Jammu','Kathua','Kupwara','Pulwama','Rajouri','Srinagar','Udhampur'] },
{ name: 'Jharkhand', districts: ['Bokaro','Deoghar','Dhanbad','Dumka','East Singhbhum','Giridih','Hazaribagh','Ranchi','Sahibganj','West Singhbhum'] },
{ name: 'Karnataka', districts: ['Bagalkote','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban','Bidar','Chamarajanagara','Chikkamagaluru','Chitradurga','Dakshina Kannada','Davangere','Dharwad','Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mysuru','Raichur','Shivamogga','Tumakuru','Udupi','Uttara Kannada','Vijayapura','Yadgir'] },
{ name: 'Kerala', districts: ['Alappuzha','Ernakulam','Idukki','Kannur','Kasaragod','Kollam','Kottayam','Kozhikode','Malappuram','Palakkad','Pathanamthitta','Thiruvananthapuram','Thrissur','Wayanad'] },
{ name: 'Ladakh', districts: ['Kargil','Leh'] },
{ name: 'Lakshadweep', districts: ['Lakshadweep'] },
{ name: 'Madhya Pradesh', districts: ['Balaghat','Betul','Bhopal','Chhindwara','Dewas','Dhar','Guna','Gwalior','Indore','Jabalpur','Khandwa','Rewa','Sagar','Satna','Ujjain','Vidisha'] },
{ name: 'Maharashtra', districts: ['Ahmednagar','Akola','Amravati','Aurangabad','Beed','Buldhana','Chandrapur','Dhule','Jalgaon','Kolhapur','Latur','Mumbai City','Mumbai Suburban','Nagpur','Nanded','Nashik','Pune','Raigad','Ratnagiri','Sangli','Satara','Solapur','Thane','Wardha','Yavatmal'] },
{ name: 'Manipur', districts: ['Bishnupur','Churachandpur','Imphal East','Imphal West','Thoubal'] },
{ name: 'Meghalaya', districts: ['East Khasi Hills','Ri Bhoi','West Garo Hills','West Khasi Hills'] },
{ name: 'Mizoram', districts: ['Aizawl','Champhai','Lunglei','Saiha'] },
{ name: 'Nagaland', districts: ['Dimapur','Kohima','Mokokchung','Tuensang'] },
{ name: 'Odisha', districts: ['Angul','Balasore','Cuttack','Ganjam','Kalahandi','Koraput','Mayurbhanj','Puri','Sambalpur','Sundargarh'] },
{ name: 'Puducherry', districts: ['Karaikal','Puducherry','Yanam'] },
{ name: 'Punjab', districts: ['Amritsar','Bathinda','Gurdaspur','Hoshiarpur','Jalandhar','Ludhiana','Patiala','Sangrur'] },
{ name: 'Rajasthan', districts: ['Ajmer','Alwar','Banswara','Barmer','Bharatpur','Bhilwara','Bikaner','Chittorgarh','Jaipur','Jaisalmer','Jodhpur','Kota','Nagaur','Pali','Sikar','Sirohi','Tonk','Udaipur'] },
{ name: 'Sikkim', districts: ['Gangtok','Namchi'] },
{ name: 'Tamil Nadu', districts: ['Chennai','Coimbatore','Cuddalore','Dharmapuri','Dindigul','Erode','Kanchipuram','Kanyakumari','Madurai','Salem','Thanjavur','Tiruchirappalli','Tirunelveli','Vellore','Viluppuram'] },
{ name: 'Telangana', districts: ['Adilabad','Hyderabad','Karimnagar','Khammam','Medak','Nalgonda','Nizamabad','Rangareddy','Warangal'] },
{ name: 'Tripura', districts: ['Dhalai','North Tripura','South Tripura','West Tripura'] },
{ name: 'Uttar Pradesh', districts: ['Agra','Aligarh','Ayodhya','Bareilly','Gautam Buddha Nagar','Ghaziabad','Gorakhpur','Jhansi','Kanpur Nagar','Lucknow','Mathura','Meerut','Moradabad','Prayagraj','Varanasi'] },
{ name: 'Uttarakhand', districts: ['Almora','Dehradun','Haridwar','Nainital','Pauri Garhwal','Pithoragarh','Uttarkashi'] },
{ name: 'West Bengal', districts: ['Bankura','Birbhum','Darjeeling','Hooghly','Howrah','Jalpaiguri','Kolkata','Malda','Murshidabad','Nadia','North 24 Parganas','Purba Medinipur','South 24 Parganas'] },
];
export function getStateNames(): string[] { return INDIAN_STATES.map(s => s.name); }
export function getDistrictsForState(stateName: string): string[] {
  const e = INDIAN_STATES.find(s => s.name === stateName);
  return e ? [...e.districts] : [];
}
export function isValidStateDistrict(s: string, d: string): boolean {
  if (!s || !d) return false;
  return getDistrictsForState(s).includes(d);
}

// District -> Taluk mapping (real taluk names from Census/state administrative lists).
// Used to populate the Taluk dropdown on the farmer Profile page.
// Only districts for which verified taluk names are available are included.
// Districts not present here will gracefully fall back to an empty list.
export interface TalukEntry {
  district: string;
  taluks: string[];
}

export const INDIAN_TALUKS: Record<string, string[]> = {
  // Karnataka
  Shivamogga: [
    'Shivamogga',
    'Thirthahalli',
    'Sagar',
    'Shikaripura',
    'Bhadravathi',
    'Sorab',
    'Hosanagara',
  ],
  'Bengaluru Urban': [
    'Bengaluru North',
    'Bengaluru South',
    'Anekal',
    'Bommanahalli',
    'Dasarahalli',
    'Mahadevapura',
    'Rajarajeshwari Nagar',
    'Yelahanka',
  ],
  Mysuru: ['Mysuru', 'Hunsur', 'Krishnarajanagara', 'Nanjangud', 'Piriyapatna', 'Tirumakudalu Narasipura'],
  Belagavi: [
    'Belagavi',
    'Bailhongal',
    'Chikkodi',
    'Gokak',
    'Hukkeri',
    'Khanapur',
    'Ramdurg',
    'Raibag',
    'Saundatti',
  ],
  'Dakshina Kannada': ['Mangaluru', 'Bantwal', 'Belthangady', 'Puttur', 'Sullia', 'Kadaba'],
  Hassan: [
    'Hassan',
    'Alur',
    'Arkalgud',
    'Arasikere',
    'Belur',
    'Channarayapatna',
    'Holenarasipura',
    'Sakleshpura',
  ],
  Tumakuru: ['Tumakuru', 'Koratagere', 'Madhugiri', 'Pavagada', 'Sira', 'Tiptur', 'Turuvekere'],
  Chikkamagaluru: ['Chikkamagaluru', 'Kadur', 'Mudigere', 'Narasimharajapura', 'Sringeri', 'Tarikere'],
  Davangere: ['Davangere', 'Channagiri', 'Harihara', 'Honnal', 'Jagalur', 'Nyamati'],
  'Dharwad': ['Dharwad', 'Hubli', 'Kundgol', 'Navalgund'],
  Gadag: ['Gadag', 'Mundargi', 'Nargund', 'Ron', 'Shirahatti'],
  Haveri: ['Haveri', 'Byadagi', 'Hirekerur', 'Ranebennur', 'Shiggaon'],
  Kalaburagi: ['Kalaburagi', 'Afzalpur', 'Aland', 'Chincholi', 'Chitapur', 'Jewargi', 'Sedam'],
  'Uttara Kannada': ['Karwar', 'Ankola', 'Bhatkal', 'Haliyal', 'Honnavar', 'Kumta', 'Siddapur', 'Yallapur'],
  Vijayapura: ['Vijayapura', 'Babaleshwar', 'Basavana Bagevadi', 'Indi', 'Muddebihal', 'Sindagi'],
  Bagalkote: ['Bagalkote', 'Badami', 'Bilagi', 'Hungund', 'Jamkhandi', 'Mudhol'],
  Ballari: ['Ballari', 'Hadagalli', 'Hospet', 'Kudligi', 'Sandur', 'Siruguppa'],
  Chitradurga: ['Chitradurga', 'Challakere', 'Hiriyur', 'Hosadurga', 'Holalkere', 'Molkalmuru'],
  Kolar: ['Kolar', 'Bangarapet', 'Kolar Gold Fields', 'Malur', 'Mulbagal', 'Srinivaspur'],
  'Koppal': ['Koppal', 'Gangawati', 'Kushtagi', 'Yelburga'],
  Mandya: ['Mandya', 'K.R. Nagar', 'Maddur', 'Malavalli', 'Nagamangala', 'Pandavapura', 'Shrirangapattana'],
  Raichur: ['Raichur', 'Devadurga', 'Lingsugur', 'Manvi', 'Sindhnur'],
  Ramanagara: ['Ramanagara', 'Channapatna', 'Kanakapura', 'Magadi'],
  Udupi: ['Udupi', 'Brahmavar', 'Hebri', 'Karkala', 'Kundapura', 'Byndoor'],

  // Kerala
  Thiruvananthapuram: ['Thiruvananthapuram', 'Nedumangad', 'Neyyattinkara', 'Kattakada', 'Varkala'],
  Ernakulam: ['Ernakulam', 'Aluva', 'Kothamangalam', 'Muvattupuzha', 'Kanayannur', 'Kunnathunad', 'Paravur', 'Vypin'],
  Kozhikode: ['Kozhikode', 'Vadakara', 'Koyilandy', 'Thamarassery', 'Balusseri'],
  Thrissur: ['Thrissur', 'Chavakkad', 'Kodungallur', 'Talappilly', 'Mukundapuram', 'Thalapilly'],
  Kollam: ['Kollam', 'Karunagappalli', 'Kottarakkara', 'Punalur', 'Pathanapuram'],
  Kannur: ['Kannur', 'Thalassery', 'Iritty', 'Payyanur', 'Taliparamba'],
  Palakkad: ['Palakkad', 'Alathur', 'Chittur', 'Mannarkkad', 'Ottapalam'],
  Kottayam: ['Kottayam', 'Changanassery', 'Vaikom', 'Meenachil', 'Kanjirappally'],
  Alappuzha: ['Alappuzha', 'Cherthala', 'Kuttanad', 'Mavelikkara', 'Karthikappally'],
  Malappuram: ['Malappuram', 'Eranad', 'Nilambur', 'Perinthalmanna', 'Tirur', 'Ponnani'],
  Kasaragod: ['Kasaragod', 'Manjeshwaram', 'Uppala', 'Kumbla'],
  Wayanad: ['Wayanad', 'Mananthavady', 'Sulthan Bathery', 'Vythiri'],
  Idukki: ['Idukki', 'Thodupuzha', 'Peerumade', 'Devikulam', 'Udumbanchola'],
  Pathanamthitta: ['Pathanamthitta', 'Adoor', 'Konni', 'Ranni', 'Kozhencherry'],

  // Tamil Nadu
  Chennai: ['Chennai', 'Ambattur', 'Maduravoyal', 'Pallavaram', 'Tambaram', 'Alandur', 'Velachery'],
  Coimbatore: ['Coimbatore', 'Pollachi', 'Valparai', 'Annur', 'Mettupalayam'],
  Madurai: ['Madurai', 'Thirumangalam', 'Usilampatti', 'Peraiyur', 'Vadipatti'],
  Tiruchirappalli: ['Tiruchirappalli', 'Lalgudi', 'Manapparai', 'Musiri', 'Thuraiyur'],
  Salem: ['Salem', 'Attur', 'Edappadi', 'Omalur', 'Sankagiri', 'Mettur'],
  Tiruppur: ['Tiruppur', 'Dharapuram', 'Udumalaipettai', 'Palladam', 'Kangeyam'],
  Erode: ['Erode', 'Gobichettipalayam', 'Bhavani', 'Sathyamangalam', 'Perundurai'],
  Vellore: ['Vellore', 'Gudiyatham', 'Vaniyambadi', 'Ambur', 'Tirupattur'],
  'Kanyakumari': ['Kanyakumari', 'Thuckalay', 'Kalkulam', 'Thovalai', 'Agastheeswaram'],

  // Telangana
  Hyderabad: ['Hyderabad', 'Secunderabad', 'Charminar', 'Khairatabad', 'Musal', 'Tirumalagiri'],
  Rangareddy: ['Rangareddy', 'Shamshabad', 'Kandukur', 'Ibrahimpatnam', 'Maheswaram'],
  Warangal: ['Warangal', 'Hanamkonda', 'Narsampet', 'Mahabubabad', 'Narsapur'],

  // Maharashtra
  Pune: ['Pune', 'Haveli', 'Daund', 'Indapur', 'Baramati', 'Purandhar', 'Bhor', 'Velhe', 'Mulshi', 'Khed'],
  Mumbai: ['Mumbai City', 'Mumbai Suburban'],
  Nagpur: ['Nagpur', 'Katol', 'Narkhed', 'Savner', 'Hingna', 'Kalmeshwar'],
  Nashik: ['Nashik', 'Igatpuri', 'Sinnar', 'Trimbak', 'Niphad', 'Yeola', 'Malegaon'],
  Aurangabad: ['Aurangabad', 'Paithan', 'Vaijapur', 'Gangapur', 'Kannad', 'Sillod'],
};

export function getTaluksForDistrict(districtName: string): string[] {
  return INDIAN_TALUKS[districtName] ?? [];
}
