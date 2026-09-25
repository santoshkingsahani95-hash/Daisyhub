export interface DistrictDeliveryRate {
  district: string;
  province: string;
  deliveryFee: number;
  enabled: boolean;
  homeDeliveryFee?: number;
  branchDeliveryFee?: number;
  homeDeliveryEnabled?: boolean;
  branchDeliveryEnabled?: boolean;
}

export interface ProvinceData {
  name: string;
  districts: string[];
}

export const NEPAL_PROVINCES: ProvinceData[] = [
  {
    name: 'Bagmati Province',
    districts: [
      'Kathmandu',
      'Lalitpur',
      'Bhaktapur',
      'Chitwan',
      'Dhading',
      'Dolakha',
      'Kavrepalanchok',
      'Makwanpur',
      'Nuwakot',
      'Ramechhap',
      'Rasuwa',
      'Sindhuli',
      'Sindhulipalchok',
    ],
  },
  {
    name: 'Koshi Province',
    districts: [
      'Bhojpur',
      'Dhankuta',
      'Ilam',
      'Jhapa',
      'Khotang',
      'Morang',
      'Okhaldhunga',
      'Panchthar',
      'Sankhuwasabha',
      'Solukhumbu',
      'Sunsari',
      'Taplejung',
      'Terhathum',
      'Udayapur',
    ],
  },
  {
    name: 'Madhesh Province',
    districts: [
      'Bara',
      'Dhanusha',
      'Mahottari',
      'Parsa',
      'Rautahat',
      'Saptari',
      'Sarlahi',
      'Siraha',
    ],
  },
  {
    name: 'Gandaki Province',
    districts: [
      'Baglung',
      'Gorkha',
      'Kaski',
      'Lamjung',
      'Manang',
      'Mustang',
      'Myagdi',
      'Nawalpur',
      'Parbat',
      'Syangja',
      'Tanahun',
    ],
  },
  {
    name: 'Lumbini Province',
    districts: [
      'Arghakhanchi',
      'Banke',
      'Bardiya',
      'Dang',
      'Gulmi',
      'Kapilvastu',
      'Palpa',
      'Parasi',
      'Pyuthan',
      'Rolpa',
      'Rukum East',
      'Rupandehi',
    ],
  },
  {
    name: 'Karnali Province',
    districts: [
      'Dailekh',
      'Dolpa',
      'Humla',
      'Jajarkot',
      'Jumla',
      'Kalikot',
      'Mugu',
      'Rukum West',
      'Salyan',
      'Surkhet',
    ],
  },
  {
    name: 'Sudurpashchim Province',
    districts: [
      'Achham',
      'Baitadi',
      'Bajhang',
      'Bajura',
      'Dadeldhura',
      'Darchula',
      'Doti',
      'Kailali',
      'Kanchanpur',
    ],
  },
];

// Default initial rate generator for all 77 districts
export function generateDefaultDeliveryRates(): DistrictDeliveryRate[] {
  const rates: DistrictDeliveryRate[] = [];

  NEPAL_PROVINCES.forEach((province) => {
    province.districts.forEach((district) => {
      const isValley = ['Kathmandu', 'Lalitpur', 'Bhaktapur'].includes(district);
      rates.push({
        district,
        province: province.name,
        deliveryFee: isValley ? 100 : 180,
        enabled: true,
        homeDeliveryFee: isValley ? 100 : 180,
        branchDeliveryFee: isValley ? 50 : 120,
        homeDeliveryEnabled: true,
        branchDeliveryEnabled: true,
      });
    });
  });

  return rates;
}
