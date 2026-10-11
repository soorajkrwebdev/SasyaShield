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
