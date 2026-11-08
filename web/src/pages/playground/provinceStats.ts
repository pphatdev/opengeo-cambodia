export interface ProvinceMeta {
    code: string;
    id: number;
    districts: number;
    communes: number;
    villages: number;
    color: string;
    region: "capital" | "urban" | "coastal" | "highland" | "central";
    descriptionEn: string;
    descriptionKm: string;
}

export const PROVINCE_STATS: Record<string, ProvinceMeta> = {
    "01": { code: "01", id: 1, districts: 9, communes: 65, villages: 645, color: "#06b6d4", region: "central", descriptionEn: "Northwestern border province connecting to Thailand via Poipet", descriptionKm: "ខេត្តជាប់ព្រំដែនថៃភាគពាយ័ព្យ តាមច្រកទ្វារអន្តរជាតិប៉ោយប៉ែត" },
    "02": { code: "02", id: 2, districts: 14, communes: 103, villages: 808, color: "#3b82f6", region: "urban", descriptionEn: "Cambodia's agricultural rice bowl and historical cultural center", descriptionKm: "ជង្រុកស្រូវរបស់កម្ពុជា និងជាមជ្ឈមណ្ឌលវប្បធម៌ប្រវត្តិសាស្ត្រ" },
    "03": { code: "03", id: 3, districts: 10, communes: 109, villages: 917, color: "#10b981", region: "central", descriptionEn: "Fertile agricultural lowland along the Mekong River", descriptionKm: "តំបន់ទំនាបកសិកម្មដីមានជីជាតិ តាមដងទន្លេមេគង្គ" },
    "04": { code: "04", id: 4, districts: 8, communes: 71, villages: 569, color: "#f59e0b", region: "central", descriptionEn: "Renowned pottery craftsmanship center on the Tonle Sap", descriptionKm: "មជ្ឈមណ្ឌលសិប្បកម្មកុលាលភាជន៍ដ៏ល្បីល្បាញលើបឹងទន្លេសាប" },
    "05": { code: "05", id: 5, districts: 8, communes: 125, villages: 980, color: "#8b5cf6", region: "central", descriptionEn: "Vast central province along the Tonle Sap lake", descriptionKm: "ខេត្តកណ្តាលដ៏ធំល្វឹងល្វើយ ជាប់បឹងទន្លេសាប" },
    "06": { code: "06", id: 6, districts: 8, communes: 81, villages: 772, color: "#ec4899", region: "central", descriptionEn: "Ancient Angkorian ruins and crossroads of national highways", descriptionKm: "ប្រជុំប្រាសាទបុរាណសម័យអង្គរ និងជាផ្លូវប្រសព្វនៃផ្លូវជាតិ" },
    "07": { code: "07", id: 7, districts: 9, communes: 88, villages: 765, color: "#06b6d4", region: "coastal", descriptionEn: "Coastal province known for pepper, salt fields, and Bokor mountain", descriptionKm: "ខេត្តជាប់ឆ្នេរសមុទ្រ ល្បីល្បាញដោយសារម្រេច ស្រែអំបិល និងភ្នំបូកគោ" },
    "08": { code: "08", id: 8, districts: 13, communes: 127, villages: 1010, color: "#3b82f6", region: "urban", descriptionEn: "Economic belt completely surrounding Phnom Penh Capital", descriptionKm: "ខ្សែក្រវាត់សេដ្ឋកិច្ចដែលព័ទ្ធជុំវិញរាជធានីភ្នំពេញទាំងស្រុង" },
    "09": { code: "09", id: 9, districts: 5, communes: 55, villages: 379, color: "#10b981", region: "coastal", descriptionEn: "Lush Cardamom rainforests, mangroves, and Gulf of Thailand coastline", descriptionKm: "ព្រៃទឹកភ្លៀងជួរភ្នំក្រវាញ ព្រៃកោងកាង និងឆ្នេរសមុទ្រឈូងសមុទ្រថៃ" },
    "10": { code: "10", id: 10, districts: 6, communes: 37, villages: 250, color: "#f59e0b", region: "central", descriptionEn: "Peaceful riverine province famous for freshwater Irrawaddy dolphins", descriptionKm: "ខេត្តតាមដងទន្លេដ៏ស្ងប់ស្ងាត់ ល្បីល្បាញដោយសារសត្វផ្សោតក្បាលត្រឡោក" },
    "11": { code: "11", id: 11, districts: 5, communes: 43, villages: 260, color: "#8b5cf6", region: "highland", descriptionEn: "Rolling pine hills, cascading waterfalls, and indigenous highlands", descriptionKm: "តំបន់ខ្ពង់រាបភ្នំស្រល់ ទឹកធ្លាក់ហូររហឹម និងជនជាតិដើមភាគតិច" },
    "12": { code: "12", id: 12, districts: 14, communes: 105, villages: 953, color: "#f43f5e", region: "capital", descriptionEn: "The bustling capital city and economic, financial, and cultural heart", descriptionKm: "រាជធានីដ៏អ៊ូអរ និងជាបេះដូងសេដ្ឋកិច្ច ហិរញ្ញវត្ថុ និងវប្បធម៌ជាតិ" },
    "13": { code: "13", id: 13, districts: 5, communes: 50, villages: 232, color: "#06b6d4", region: "highland", descriptionEn: "Sacred UNESCO cliffside Preah Vihear Temple on Dângrêk mountains", descriptionKm: "ប្រាសាទព្រះវិហារបេតិកភណ្ឌពិភពលោក នៅលើជួរភ្នំដងរែក" },
    "14": { code: "14", id: 14, districts: 8, communes: 66, villages: 512, color: "#3b82f6", region: "central", descriptionEn: "Rich agricultural plain between the Tonle Sap lake and Cardamoms", descriptionKm: "តំបន់ទំនាបកសិកម្មចន្លោះបឹងទន្លេសាប និងជួរភ្នំក្រវាញ" },
    "15": { code: "15", id: 15, districts: 7, communes: 69, villages: 671, color: "#10b981", region: "central", descriptionEn: "Eastern delta province bounded by the Mekong River", descriptionKm: "ខេត្តវាលទំនាបភាគខាងកើត ជាប់ដងទន្លេមេគង្គ" },
    "16": { code: "16", id: 16, districts: 6, communes: 46, villages: 243, color: "#f59e0b", region: "highland", descriptionEn: "Dense volcanic red-earth plateaus, crater lake Yeak Laom, and gem mines", descriptionKm: "តំបន់ដីក្រហមភ្នំភ្លើង បឹងយក្សឡោម និងអណ្តូងរ៉ែត្បូងមានតម្លៃ" },
    "17": { code: "17", id: 17, districts: 12, communes: 100, villages: 921, color: "#f43f5e", region: "urban", descriptionEn: "Gateway to the world-renowned Angkor Wat Archaeological Park", descriptionKm: "ច្រកទ្វារទៅកាន់រមណីយដ្ឋានអង្គរវត្តដ៏ល្បីល្បាញទូទាំងសកលលោក" },
    "18": { code: "18", id: 18, districts: 5, communes: 29, villages: 111, color: "#06b6d4", region: "coastal", descriptionEn: "Cambodia's premier deep-sea international port and maritime hub", descriptionKm: "កំពង់ផែទឹកជ្រៅអន្តរជាតិ និងមជ្ឈមណ្ឌលសមុទ្រចម្បងរបស់កម្ពុជា" },
    "19": { code: "19", id: 19, districts: 5, communes: 49, villages: 212, color: "#ec4899", region: "highland", descriptionEn: "Upper Mekong river valley joining Cambodia to southern Laos", descriptionKm: "ជ្រលងទន្លេមេគង្គលើ តភ្ជាប់កម្ពុជាទៅកាន់ប្រទេសឡាវភាគខាងត្បូង" },
    "20": { code: "20", id: 20, districts: 9, communes: 75, villages: 690, color: "#06b6d4", region: "central", descriptionEn: "Southeastern border province with major international trade gates", descriptionKm: "ខេត្តព្រំដែនភាគអាគ្នេយ៍ ដែលមានច្រកទ្វារពាណិជ្ជកម្មអន្តរជាតិធំៗ" },
    "21": { code: "21", id: 21, districts: 10, communes: 116, villages: 1119, color: "#3b82f6", region: "central", descriptionEn: "Historic cradle of Cambodian civilization, Angkor Borei and Phnom Da", descriptionKm: "ជម្រកអារ្យធម៌ខ្មែរដំបូង អង្គរបុរី និងភ្នំដា" },
    "22": { code: "22", id: 22, districts: 5, communes: 36, villages: 251, color: "#10b981", region: "highland", descriptionEn: "Northern border frontier province along the Dangrek ridge", descriptionKm: "ខេត្តព្រំដែនភាគខាងជើង តាមបណ្តោយជួរភ្នំដងរែក" },
    "23": { code: "23", id: 23, districts: 4, communes: 18, villages: 105, color: "#f59e0b", region: "coastal", descriptionEn: "Charming coastal enclave famous for fresh blue crab and serene shores", descriptionKm: "ខេត្តឆ្នេរសមុទ្រដ៏ស្រស់ស្អាត ល្បីល្បាញដោយសារក្តាមសេះស្រស់" },
    "24": { code: "24", id: 24, districts: 7, communes: 65, villages: 438, color: "#8b5cf6", region: "highland", descriptionEn: "Historical ruby mining town surrounded by misty mountain peaks", descriptionKm: "ក្រុងរ៉ែត្បូងទទឹមប្រវត្តិសាស្ត្រ ព័ទ្ធជុំវិញដោយកំពូលភ្នំអ័ព្ទ" },
    "25": { code: "25", id: 25, districts: 8, communes: 84, villages: 757, color: "#ec4899", region: "central", descriptionEn: "Mekong river province created in 2013 with fertile rubber plantations", descriptionKm: "ខេត្តតាមដងទន្លេមេគង្គបង្កើតក្នុងឆ្នាំ ២០១៣ សម្បូរចំការកៅស៊ូមានជីជាតិ" },
};
